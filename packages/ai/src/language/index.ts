/**
 * Indonesian Language Processing
 * 
 * Language detection, processing, and normalization for Indonesian
 * and regional languages used in the Suara.id platform.
 */

import type { Result } from '@suara/config';

/**
 * Supported languages with confidence scoring
 */
export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  isIndonesian: boolean;
  dialect?: string;
}

/**
 * Text preprocessing result
 */
export interface ProcessedText {
  original: string;
  normalized: string;
  language: string;
  tokens: string[];
  entities: {
    locations: string[];
    timeReferences: string[];
    categories: string[];
  };
}

/**
 * Detect language from Indonesian text
 * 
 * @param text - Input text to analyze
 * @returns Language detection result with confidence
 */
export function detectLanguage(text: string): LanguageDetectionResult {
  const normalizedText = text.toLowerCase();
  
  // Indonesian indicators
  const indonesianWords = ['dan', 'atau', 'yang', 'ini', 'itu', 'ada', 'tidak', 'dengan', 'untuk', 'dari'];
  const javaneseWords = ['lan', 'karo', 'sing', 'iki', 'iku', 'ana', 'ora', 'karo', 'kanggo', 'saka'];
  const sundaneseWords = ['jeung', 'atawa', 'nu', 'ieu', 'eta', 'aya', 'henteu', 'sareng', 'pikeun', 'ti'];
  
  let indonesianScore = 0;
  let javaneseScore = 0;
  let sundaneseScore = 0;
  
  // Count occurrences
  indonesianWords.forEach(word => {
    if (normalizedText.includes(word)) indonesianScore += 1;
  });
  
  javaneseWords.forEach(word => {
    if (normalizedText.includes(word)) javaneseScore += 1;
  });
  
  sundaneseWords.forEach(word => {
    if (normalizedText.includes(word)) sundaneseScore += 1;
  });
  
  // Determine primary language
  let language = 'id'; // Default to Indonesian
  let confidence = 0.7; // Default confidence
  let dialect: string | undefined;
  
  if (javaneseScore > indonesianScore && javaneseScore > sundaneseScore) {
    language = 'jv';
    confidence = Math.min(0.95, 0.6 + (javaneseScore / 10));
    dialect = 'javanese';
  } else if (sundaneseScore > indonesianScore && sundaneseScore > javaneseScore) {
    language = 'su';
    confidence = Math.min(0.95, 0.6 + (sundaneseScore / 10));
    dialect = 'sundanese';
  } else {
    confidence = Math.min(0.95, 0.7 + (indonesianScore / 10));
  }
  
  return {
    language,
    confidence,
    isIndonesian: ['id', 'jv', 'su'].includes(language),
    dialect
  };
}

/**
 * Normalize Indonesian text for processing
 * 
 * @param text - Input text to normalize
 * @returns Normalized text
 */
export function normalizeIndonesianText(text: string): string {
  return text
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim()
    // Normalize common abbreviations
    .replace(/\bdi\s+(?=\w)/gi, 'di ')
    .replace(/\bjl\.?\s*/gi, 'jalan ')
    .replace(/\brt\.?\s*(\d+)/gi, 'RT $1')
    .replace(/\brw\.?\s*(\d+)/gi, 'RW $1')
    // Normalize punctuation
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract entities from Indonesian text
 * 
 * @param text - Input text to analyze
 * @returns Extracted entities
 */
export function extractEntities(text: string): {
  locations: string[];
  timeReferences: string[];
  categories: string[];
} {
  const normalizedText = text.toLowerCase();
  
  // Location patterns
  const locationPatterns = [
    /jalan?\s+[\w\s]+/gi,
    /jl\.?\s*[\w\s]+/gi,
    /rt\s*\d+/gi,
    /rw\s*\d+/gi,
    /kelurahan\s+[\w\s]+/gi,
    /kecamatan\s+[\w\s]+/gi,
    /(?:di|dekat|samping|depan)\s+[\w\s]+/gi
  ];
  
  // Time reference patterns
  const timePatterns = [
    /kemarin/gi,
    /hari\s+ini/gi,
    /minggu\s+lalu/gi,
    /bulan\s+lalu/gi,
    /pagi|siang|sore|malam/gi,
    /jam\s+\d+/gi
  ];
  
  // Category keywords
  const categoryKeywords = {
    infrastructure: ['jalan', 'jembatan', 'trotoar', 'infrastruktur'],
    environment: ['sampah', 'banjir', 'polusi', 'lingkungan'],
    safety: ['bahaya', 'keamanan', 'pencurian'],
    health: ['kesehatan', 'rumah sakit', 'puskesmas'],
    education: ['sekolah', 'pendidikan'],
    governance: ['pelayanan', 'administrasi'],
    social: ['sosial', 'komunitas', 'warga']
  };
  
  const locations: string[] = [];
  const timeReferences: string[] = [];
  const categories: string[] = [];
  
  // Extract locations
  locationPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      locations.push(...matches.map(m => m.trim()));
    }
  });
  
  // Extract time references
  timePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      timeReferences.push(...matches.map(m => m.trim()));
    }
  });
  
  // Extract categories
  Object.entries(categoryKeywords).forEach(([category, keywords]) => {
    if (keywords.some(keyword => normalizedText.includes(keyword))) {
      categories.push(category);
    }
  });
  
  return {
    locations: [...new Set(locations)], // Remove duplicates
    timeReferences: [...new Set(timeReferences)],
    categories: [...new Set(categories)]
  };
}

/**
 * Process and analyze Indonesian text
 * 
 * @param text - Input text to process
 * @returns Comprehensive text processing result
 */
export async function processIndonesianText(text: string): Promise<Result<ProcessedText>> {
  try {
    const languageResult = detectLanguage(text);
    const normalized = normalizeIndonesianText(text);
    const entities = extractEntities(text);
    
    // Simple tokenization
    const tokens = normalized
      .toLowerCase()
      .split(/\s+/)
      .filter(token => token.length > 1);
    
    const result: ProcessedText = {
      original: text,
      normalized,
      language: languageResult.language,
      tokens,
      entities
    };
    
    return { success: true, data: result };
    
  } catch (error) {
    return {
      success: false,
      error: 'Failed to process Indonesian text',
      issues: [error instanceof Error ? error.message : 'Unknown processing error']
    };
  }
}

/**
 * Calculate similarity between two Indonesian texts
 * 
 * @param text1 - First text
 * @param text2 - Second text
 * @returns Similarity score between 0 and 1
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  const normalized1 = normalizeIndonesianText(text1);
  const normalized2 = normalizeIndonesianText(text2);
  
  const tokens1 = new Set(normalized1.toLowerCase().split(/\s+/));
  const tokens2 = new Set(normalized2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Check if text contains Indonesian administrative patterns
 * 
 * @param text - Text to check
 * @returns True if contains administrative references
 */
export function hasAdministrativeReference(text: string): boolean {
  const adminPatterns = [
    /rt\s*\d+/i,
    /rw\s*\d+/i,
    /kelurahan/i,
    /kecamatan/i,
    /kabupaten/i,
    /provinsi/i
  ];
  
  return adminPatterns.some(pattern => pattern.test(text));
}

/**
 * Extract quality indicators from Indonesian text
 * 
 * @param text - Text to analyze
 * @returns Quality score and indicators
 */
export function analyzeTextQuality(text: string): {
  score: number;
  hasLocation: boolean;
  hasTime: boolean;
  hasDetail: boolean;
  length: number;
} {
  const entities = extractEntities(text);
  const hasLocation = entities.locations.length > 0 || hasAdministrativeReference(text);
  const hasTime = entities.timeReferences.length > 0;
  const hasDetail = text.length >= 50 && /\b(?:rusak|kotor|bahaya|parah|berat)\b/i.test(text);
  
  let score = 0;
  if (text.length >= 20) score += 25;
  if (text.length >= 50) score += 25;
  if (hasLocation) score += 25;
  if (hasTime) score += 15;
  if (hasDetail) score += 10;
  
  return {
    score: Math.min(100, score),
    hasLocation,
    hasTime,
    hasDetail,
    length: text.length
  };
}