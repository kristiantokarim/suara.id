/**
 * Data Enricher
 * 
 * Enriches submission data with additional context, AI analysis,
 * and external data sources for better processing and clustering.
 */

import type { SubmissionWithDetails } from '@suara/database';
import type { IssueCategory } from '../types';

/**
 * AI analysis result interface
 */
export interface AIAnalysisResult {
  sentiment: number; // -1 to 1 (negative to positive)
  urgency: number; // 0 to 1 (low to high urgency)
  extractedEntities: string[];
  suggestedCategory: IssueCategory;
  categoryConfidence: number; // 0 to 1
}

/**
 * Enriched submission data
 */
export interface EnrichedSubmissionData {
  aiAnalysis: AIAnalysisResult;
  administrativeData?: {
    kelurahanCode?: string;
    kecamatanCode?: string;
    kabupatenCode?: string;
    provinsiCode?: string;
  };
  externalReferences?: {
    weatherCondition?: string;
    nearbyPOIs?: string[];
    demographicContext?: Record<string, any>;
  };
}

/**
 * Enrich submission data with AI analysis and external context
 * 
 * @param submission - Raw submission data
 * @returns Enriched submission data
 */
export async function enrichSubmissionData(
  submission: SubmissionWithDetails
): Promise<EnrichedSubmissionData> {
  try {
    // Run AI analysis on content
    const aiAnalysis = await analyzeSubmissionContent(submission.description);
    
    // Enrich with administrative data
    const administrativeData = await enrichAdministrativeData(
      submission.location as any
    );
    
    // Get external context (weather, POIs, etc.)
    const externalReferences = await getExternalContext(
      submission.location as any,
      submission.createdAt
    );

    return {
      aiAnalysis,
      administrativeData,
      externalReferences
    };

  } catch (error) {
    console.error('Failed to enrich submission data:', error);
    
    // Return minimal enrichment on error
    return {
      aiAnalysis: {
        sentiment: 0,
        urgency: 0.5,
        extractedEntities: [],
        suggestedCategory: 'OTHER',
        categoryConfidence: 0.5
      }
    };
  }
}

/**
 * Analyze submission content using AI/NLP techniques
 */
async function analyzeSubmissionContent(content: string): Promise<AIAnalysisResult> {
  // Mock implementation - in production, integrate with AI services
  // like Google Cloud Natural Language API, Azure Text Analytics, etc.
  
  const lowerContent = content.toLowerCase();
  
  // Sentiment analysis (simple keyword-based)
  const sentimentScore = calculateSentiment(lowerContent);
  
  // Urgency detection
  const urgencyScore = calculateUrgency(lowerContent);
  
  // Entity extraction (simple keyword matching)
  const extractedEntities = extractEntities(lowerContent);
  
  // Category suggestion
  const categoryAnalysis = suggestCategory(lowerContent);
  
  return {
    sentiment: sentimentScore,
    urgency: urgencyScore,
    extractedEntities,
    suggestedCategory: categoryAnalysis.category,
    categoryConfidence: categoryAnalysis.confidence
  };
}

/**
 * Calculate sentiment score from text content
 */
function calculateSentiment(content: string): number {
  const positiveWords = [
    'baik', 'bagus', 'senang', 'puas', 'terima kasih', 'sukses', 'berhasil',
    'hebat', 'mantap', 'oke', 'sip', 'keren'
  ];
  
  const negativeWords = [
    'buruk', 'jelek', 'rusak', 'hancur', 'parah', 'bahaya', 'kacau',
    'marah', 'kesal', 'sedih', 'kecewa', 'gagal', 'error', 'masalah',
    'trouble', 'susah', 'sulit', 'ribet'
  ];
  
  let score = 0;
  
  positiveWords.forEach(word => {
    if (content.includes(word)) score += 1;
  });
  
  negativeWords.forEach(word => {
    if (content.includes(word)) score -= 1;
  });
  
  // Normalize to -1 to 1 range
  return Math.max(-1, Math.min(1, score / 10));
}

/**
 * Calculate urgency score from text content
 */
function calculateUrgency(content: string): number {
  const urgentKeywords = [
    'urgent', 'segera', 'cepat', 'darurat', 'emergency', 'bahaya',
    'kritis', 'parah', 'mendesak', 'butuh bantuan', 'tolong',
    'sangat', 'sekali', 'banget', 'fatal', 'gawat'
  ];
  
  const timeKeywords = [
    'sekarang', 'hari ini', 'besok', 'minggu ini', 'bulan ini'
  ];
  
  let urgencyScore = 0.3; // Base urgency
  
  urgentKeywords.forEach(keyword => {
    if (content.includes(keyword)) {
      urgencyScore += 0.2;
    }
  });
  
  timeKeywords.forEach(keyword => {
    if (content.includes(keyword)) {
      urgencyScore += 0.1;
    }
  });
  
  // Check for exclamation marks and caps
  const exclamationCount = (content.match(/!/g) || []).length;
  urgencyScore += exclamationCount * 0.05;
  
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.3) urgencyScore += 0.1;
  
  return Math.min(1, urgencyScore);
}

/**
 * Extract entities from text content
 */
function extractEntities(content: string): string[] {
  const entities: string[] = [];
  
  // Extract location entities
  const locationPatterns = [
    /jalan\s+[\w\s]+/gi,
    /jl\.?\s*[\w\s]+/gi,
    /rt\s*\d+/gi,
    /rw\s*\d+/gi,
    /kelurahan\s+[\w\s]+/gi,
    /kecamatan\s+[\w\s]+/gi
  ];
  
  locationPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      entities.push(...matches.map(match => match.trim()));
    }
  });
  
  // Extract time entities
  const timePatterns = [
    /\d{1,2}:\d{2}/g, // Time format
    /pagi|siang|sore|malam/gi,
    /senin|selasa|rabu|kamis|jumat|sabtu|minggu/gi
  ];
  
  timePatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      entities.push(...matches.map(match => match.trim()));
    }
  });
  
  // Extract infrastructure entities
  const infrastructureTerms = [
    'jalan', 'jembatan', 'trotoar', 'lampu jalan', 'drainase',
    'got', 'selokan', 'pipa', 'kabel', 'tiang listrik'
  ];
  
  infrastructureTerms.forEach(term => {
    if (content.includes(term)) {
      entities.push(term);
    }
  });
  
  return [...new Set(entities)]; // Remove duplicates
}

/**
 * Suggest category based on content analysis
 */
function suggestCategory(content: string): { category: IssueCategory; confidence: number } {
  const categoryScores: Record<IssueCategory, number> = {
    INFRASTRUCTURE: 0,
    ENVIRONMENT: 0,
    SAFETY: 0,
    HEALTH: 0,
    EDUCATION: 0,
    GOVERNANCE: 0,
    SOCIAL: 0,
    OTHER: 0.1 // Base score for OTHER
  };
  
  // Infrastructure keywords
  const infraKeywords = [
    'jalan', 'jembatan', 'trotoar', 'lampu jalan', 'drainase', 'got',
    'selokan', 'pipa', 'kabel', 'tiang', 'aspal', 'beton', 'rusak jalan'
  ];
  infraKeywords.forEach(keyword => {
    if (content.includes(keyword)) categoryScores.INFRASTRUCTURE += 0.3;
  });
  
  // Environment keywords
  const envKeywords = [
    'sampah', 'banjir', 'polusi', 'limbah', 'kotor', 'bau',
    'udara', 'air', 'lingkungan', 'pohon', 'taman', 'hijau'
  ];
  envKeywords.forEach(keyword => {
    if (content.includes(keyword)) categoryScores.ENVIRONMENT += 0.3;
  });
  
  // Safety keywords
  const safetyKeywords = [
    'pencurian', 'maling', 'rampok', 'keamanan', 'bahaya',
    'kecelakaan', 'crime', 'kriminal', 'rawan', 'gelap'
  ];
  safetyKeywords.forEach(keyword => {
    if (content.includes(keyword)) categoryScores.SAFETY += 0.3;
  });
  
  // Health keywords
  const healthKeywords = [
    'rumah sakit', 'puskesmas', 'dokter', 'obat', 'sakit',
    'kesehatan', 'medis', 'ambulan', 'darurat medis'
  ];
  healthKeywords.forEach(keyword => {
    if (content.includes(keyword)) categoryScores.HEALTH += 0.3;
  });
  
  // Education keywords
  const eduKeywords = [
    'sekolah', 'guru', 'murid', 'siswa', 'pendidikan',
    'belajar', 'kelas', 'ujian', 'les', 'kuliah'
  ];
  eduKeywords.forEach(keyword => {
    if (content.includes(keyword)) categoryScores.EDUCATION += 0.3;
  });
  
  // Governance keywords
  const govKeywords = [
    'pelayanan', 'administrasi', 'ktp', 'surat', 'izin',
    'kantor', 'camat', 'lurah', 'rt', 'rw', 'pemerintah'
  ];
  govKeywords.forEach(keyword => {
    if (content.includes(keyword)) categoryScores.GOVERNANCE += 0.3;
  });
  
  // Social keywords
  const socialKeywords = [
    'tetangga', 'warga', 'masyarakat', 'komunitas', 'gotong royong',
    'sosial', 'budaya', 'adat', 'tradisi', 'konflik'
  ];
  socialKeywords.forEach(keyword => {
    if (content.includes(keyword)) categoryScores.SOCIAL += 0.3;
  });
  
  // Find category with highest score
  const sortedCategories = Object.entries(categoryScores)
    .sort(([,a], [,b]) => b - a);
  
  const [topCategory, topScore] = sortedCategories[0];
  const [secondCategory, secondScore] = sortedCategories[1];
  
  // Calculate confidence based on score difference
  const confidence = Math.min(1, topScore / (topScore + secondScore));
  
  return {
    category: topCategory as IssueCategory,
    confidence
  };
}

/**
 * Enrich with administrative data (mock implementation)
 */
async function enrichAdministrativeData(location: any): Promise<{
  kelurahanCode?: string;
  kecamatanCode?: string;
  kabupatenCode?: string;
  provinsiCode?: string;
}> {
  // Mock implementation - in production, use geocoding service
  // or administrative boundary APIs
  
  return {
    kelurahanCode: '3171010001',
    kecamatanCode: '317101',
    kabupatenCode: '3171',
    provinsiCode: '31'
  };
}

/**
 * Get external context data (mock implementation)
 */
async function getExternalContext(
  location: any,
  timestamp: Date
): Promise<{
  weatherCondition?: string;
  nearbyPOIs?: string[];
  demographicContext?: Record<string, any>;
}> {
  // Mock implementation - in production, integrate with:
  // - Weather APIs (OpenWeatherMap, etc.)
  // - POI services (Google Places, etc.)
  // - Demographic data sources
  
  return {
    weatherCondition: 'partly_cloudy',
    nearbyPOIs: ['Sekolah Dasar', 'Puskesmas', 'Pasar Tradisional'],
    demographicContext: {
      populationDensity: 'high',
      economicLevel: 'middle',
      urbanizationLevel: 'urban'
    }
  };
}