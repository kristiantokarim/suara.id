/**
 * Quality Validator
 * 
 * Validates and scores submission quality based on multiple criteria
 * including content analysis, location accuracy, and image quality.
 */

import { LIMITS, success, failure, type Result } from '@suara/config';
import type { 
  CreateSubmissionInput, 
  SubmissionValidationResult,
  IssueCategory 
} from '../types';

/**
 * Validate submission quality and generate quality score
 * 
 * @param input - Submission input data
 * @returns Result containing validation results and quality score
 */
export async function validateSubmissionQuality(
  input: CreateSubmissionInput
): Promise<Result<SubmissionValidationResult>> {
  try {
    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Analyze content quality
    const contentAnalysis = analyzeContentQuality(input.content);
    if (contentAnalysis.score < 30) {
      issues.push('Deskripsi terlalu pendek atau tidak jelas');
    } else if (contentAnalysis.score < 60) {
      warnings.push('Deskripsi bisa diperjelas untuk hasil yang lebih baik');
    }

    // Analyze location quality
    const locationAnalysis = analyzeLocationQuality(input.location);
    if (!locationAnalysis.withinIndonesia) {
      issues.push('Lokasi harus berada dalam wilayah Indonesia');
    }
    if (locationAnalysis.accuracy > LIMITS.LOCATION.GPS_ACCURACY_REJECT) {
      issues.push(`Akurasi GPS terlalu rendah (${locationAnalysis.accuracy}m)`);
    } else if (locationAnalysis.accuracy > LIMITS.LOCATION.GPS_ACCURACY_WARNING) {
      warnings.push('Akurasi GPS kurang optimal, coba dekatkan dengan area terbuka');
    }

    // Analyze images if provided
    let imageAnalysis;
    if (input.images && input.images.length > 0) {
      imageAnalysis = await analyzeImageQuality(input.images);
      if (imageAnalysis.containsSensitiveContent) {
        issues.push('Gambar mengandung konten sensitif yang tidak sesuai');
      }
      if (imageAnalysis.quality.some(q => q < 30)) {
        warnings.push('Beberapa gambar memiliki kualitas rendah');
      }
    } else {
      recommendations.push('Tambahkan foto untuk memperkuat laporan Anda');
    }

    // Calculate overall quality score
    let qualityScore = 0;
    let weightSum = 0;

    // Content quality (40% weight)
    qualityScore += contentAnalysis.score * 0.4;
    weightSum += 0.4;

    // Location quality (30% weight)
    const locationScore = calculateLocationScore(locationAnalysis);
    qualityScore += locationScore * 0.3;
    weightSum += 0.3;

    // Image quality (20% weight if images provided)
    if (imageAnalysis) {
      const imageScore = calculateImageScore(imageAnalysis);
      qualityScore += imageScore * 0.2;
      weightSum += 0.2;
    }

    // Category relevance (10% weight)
    const categoryScore = analyzeCategoryRelevance(input.content, input.category);
    qualityScore += categoryScore * 0.1;
    weightSum += 0.1;

    // Normalize score
    qualityScore = Math.round(qualityScore / weightSum);

    // Add recommendations based on analysis
    if (qualityScore < 70) {
      recommendations.push('Pertimbangkan untuk menambah detail deskripsi');
    }
    if (!input.location.kelurahan) {
      recommendations.push('Lengkapi data kelurahan untuk akurasi yang lebih baik');
    }
    if (input.severity === 'CRITICAL' && qualityScore < 80) {
      warnings.push('Laporan dengan tingkat kritis memerlukan detail yang lebih lengkap');
    }

    const validationResult: SubmissionValidationResult = {
      isValid: issues.length === 0,
      qualityScore,
      issues,
      warnings,
      recommendations,
      contentAnalysis: {
        length: input.content.length,
        clarity: contentAnalysis.clarity,
        relevance: contentAnalysis.relevance,
        language: contentAnalysis.language
      },
      locationAnalysis,
      imageAnalysis
    };

    return success(validationResult);

  } catch (error) {
    console.error('Failed to validate submission quality:', error);
    return failure(
      'Gagal memvalidasi kualitas laporan',
      [error instanceof Error ? error.message : 'Quality validation error']
    );
  }
}

/**
 * Analyze content quality
 */
function analyzeContentQuality(content: string): {
  score: number;
  clarity: number;
  relevance: number;
  language: string;
} {
  const length = content.length;
  const words = content.trim().split(/\s+/);
  const wordCount = words.length;

  // Length score (0-40 points)
  let lengthScore = 0;
  if (length >= LIMITS.SUBMISSION.MIN_TEXT_LENGTH) {
    lengthScore = Math.min(40, (length / 200) * 40);
  }

  // Word count score (0-30 points)
  let wordScore = 0;
  if (wordCount >= 5) {
    wordScore = Math.min(30, (wordCount / 20) * 30);
  }

  // Clarity indicators (0-30 points)
  let clarityScore = 15; // Base score
  
  // Check for question words (what, where, when, why, how)
  const questionWords = ['apa', 'dimana', 'kapan', 'mengapa', 'bagaimana', 'kenapa'];
  const hasQuestionWords = questionWords.some(word => 
    content.toLowerCase().includes(word)
  );
  if (hasQuestionWords) clarityScore += 5;

  // Check for specific details (numbers, locations, times)
  const hasNumbers = /\d+/.test(content);
  if (hasNumbers) clarityScore += 5;

  const hasSpecificLocation = /jalan|jl\.|rt|rw|no\.|nomor/i.test(content);
  if (hasSpecificLocation) clarityScore += 5;

  // Language detection (simple heuristic)
  const indonesianWords = ['dan', 'yang', 'di', 'ke', 'dari', 'untuk', 'dengan', 'ini', 'itu', 'ada'];
  const indonesianWordCount = indonesianWords.filter(word => 
    content.toLowerCase().includes(word)
  ).length;
  const language = indonesianWordCount >= 2 ? 'id' : 'unknown';

  const totalScore = lengthScore + wordScore + clarityScore;

  return {
    score: Math.round(totalScore),
    clarity: clarityScore / 30,
    relevance: 0.8, // Default relevance - could be improved with ML
    language
  };
}

/**
 * Analyze location quality
 */
function analyzeLocationQuality(location: CreateSubmissionInput['location']): {
  accuracy: number;
  withinIndonesia: boolean;
  administrativeDataComplete: boolean;
} {
  const [lat, lng] = location.coordinates;

  // Check if within Indonesia bounds
  const withinIndonesia = (
    lat >= LIMITS.LOCATION.MIN_LATITUDE &&
    lat <= LIMITS.LOCATION.MAX_LATITUDE &&
    lng >= LIMITS.LOCATION.MIN_LONGITUDE &&
    lng <= LIMITS.LOCATION.MAX_LONGITUDE
  );

  // Check administrative data completeness
  const administrativeDataComplete = !!(
    location.kelurahan &&
    location.kecamatan &&
    location.kabupaten &&
    location.provinsi
  );

  return {
    accuracy: location.accuracy,
    withinIndonesia,
    administrativeDataComplete
  };
}

/**
 * Analyze image quality (mock implementation)
 */
async function analyzeImageQuality(images: string[]): Promise<{
  count: number;
  quality: number[];
  relevance: number[];
  containsSensitiveContent: boolean;
}> {
  // Mock implementation - in production, use image analysis services
  const count = images.length;
  const quality = images.map(() => Math.random() * 40 + 60); // Random quality 60-100
  const relevance = images.map(() => Math.random() * 30 + 70); // Random relevance 70-100
  const containsSensitiveContent = false; // Would use content moderation API

  return {
    count,
    quality,
    relevance,
    containsSensitiveContent
  };
}

/**
 * Calculate location score
 */
function calculateLocationScore(analysis: {
  accuracy: number;
  withinIndonesia: boolean;
  administrativeDataComplete: boolean;
}): number {
  if (!analysis.withinIndonesia) return 0;

  let score = 50; // Base score for valid Indonesia location

  // Accuracy bonus
  if (analysis.accuracy <= 10) score += 30;
  else if (analysis.accuracy <= 50) score += 20;
  else if (analysis.accuracy <= 100) score += 10;

  // Administrative data bonus
  if (analysis.administrativeDataComplete) score += 20;

  return Math.min(100, score);
}

/**
 * Calculate image score
 */
function calculateImageScore(analysis: {
  count: number;
  quality: number[];
  relevance: number[];
  containsSensitiveContent: boolean;
}): number {
  if (analysis.containsSensitiveContent) return 0;

  const avgQuality = analysis.quality.reduce((a, b) => a + b, 0) / analysis.quality.length;
  const avgRelevance = analysis.relevance.reduce((a, b) => a + b, 0) / analysis.relevance.length;

  let score = (avgQuality + avgRelevance) / 2;

  // Count bonus
  if (analysis.count >= 2) score += 10;
  if (analysis.count >= 3) score += 5;

  return Math.min(100, score);
}

/**
 * Analyze category relevance (mock implementation)
 */
function analyzeCategoryRelevance(content: string, category: IssueCategory): number {
  const lowerContent = content.toLowerCase();

  const categoryKeywords: Record<IssueCategory, string[]> = {
    INFRASTRUCTURE: ['jalan', 'jembatan', 'drainase', 'lampu', 'trotoar', 'got', 'saluran'],
    ENVIRONMENT: ['sampah', 'banjir', 'polusi', 'limbah', 'hijau', 'pohon', 'udara'],
    SAFETY: ['keamanan', 'pencurian', 'kejahatan', 'bahaya', 'kecelakaan', 'rawan'],
    HEALTH: ['kesehatan', 'rumah sakit', 'puskesmas', 'obat', 'dokter', 'sakit'],
    EDUCATION: ['sekolah', 'pendidikan', 'guru', 'murid', 'belajar', 'kelas'],
    GOVERNANCE: ['pelayanan', 'administrasi', 'surat', 'ktp', 'izin', 'kantor'],
    SOCIAL: ['sosial', 'masyarakat', 'warga', 'tetangga', 'komunitas', 'budaya'],
    OTHER: []
  };

  const keywords = categoryKeywords[category] || [];
  const matchCount = keywords.filter(keyword => lowerContent.includes(keyword)).length;

  if (keywords.length === 0) return 70; // Default for OTHER category
  
  const relevanceRatio = matchCount / keywords.length;
  return Math.round(50 + (relevanceRatio * 50)); // Score between 50-100
}