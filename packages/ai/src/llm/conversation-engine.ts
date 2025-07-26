/**
 * Conversation Engine
 * 
 * AI-powered conversation system for guiding citizens through the issue
 * reporting process. Provides intelligent assistance, data collection,
 * and quality improvement suggestions.
 */

import { success, failure, type Result, type IssueCategory, type IssueSeverity } from '@suara/config';
import type { 
  ProcessedSubmission,
  ConversationContext, 
  ConversationMessage, 
  ConversationResponse,
  ConversationResult,
  LLMConfig
} from '../types';

/**
 * Conversation states for managing the reporting flow
 */
type ConversationState = 
  | 'greeting'
  | 'category_detection'
  | 'location_gathering'
  | 'description_refinement'
  | 'severity_assessment'
  | 'image_guidance'
  | 'confirmation'
  | 'completion'
  | 'escalation';

/**
 * Conversation engine configuration
 */
interface ConversationConfig {
  maxTurns: number;
  qualityThreshold: number;
  escalationThreshold: number;
  supportedLanguages: string[];
  enableMultimodal: boolean;
}

/**
 * Default conversation configuration
 */
const DEFAULT_CONFIG: ConversationConfig = {
  maxTurns: 20,
  qualityThreshold: 60,
  escalationThreshold: 3, // Number of unclear responses before escalation
  supportedLanguages: ['id', 'jv', 'su', 'bt', 'min'],
  enableMultimodal: true
};

/**
 * Main conversation processing function
 * 
 * @param message - User's message
 * @param context - Conversation context
 * @param config - Configuration settings
 * @returns AI response with extracted data and guidance
 */
export async function processConversation(
  message: string,
  context: ConversationContext,
  config: ConversationConfig = DEFAULT_CONFIG
): Promise<ConversationResult> {
  try {
    // Detect user intent and extract entities
    const intentAnalysis = await analyzeUserIntent(message, context);
    
    // Determine current conversation state
    const currentState = determineConversationState(context, intentAnalysis);
    
    // Process based on state
    const response = await processStateTransition(
      message,
      context,
      currentState,
      intentAnalysis,
      config
    );
    
    return success(response);
    
  } catch (error) {
    console.error('Failed to process conversation:', error);
    return failure(
      'Gagal memproses percakapan',
      [error instanceof Error ? error.message : 'Conversation processing error']
    );
  }
}

/**
 * Initialize conversation with greeting
 * 
 * @param userId - User identifier
 * @param language - User's preferred language
 * @returns Initial conversation context and greeting
 */
export async function startConversation(
  userId: string,
  language: string = 'id'
): Promise<Result<{
  context: ConversationContext;
  greeting: ConversationResponse;
}>> {
  try {
    // Create initial context
    const context: ConversationContext = {
      userId,
      sessionId: `session_${Date.now()}_${userId}`,
      language,
      userProfile: {
        trustLevel: 'BASIC', // TODO: Get from user service
        previousSubmissions: 0,
        preferredCategories: []
      },
      conversationHistory: []
    };
    
    // Generate greeting based on user's history
    const greeting = await generateGreeting(context);
    
    return success({ context, greeting });
    
  } catch (error) {
    console.error('Failed to start conversation:', error);
    return failure(
      'Gagal memulai percakapan',
      [error instanceof Error ? error.message : 'Conversation initialization error']
    );
  }
}

/**
 * Generate summary of collected submission data
 * 
 * @param context - Current conversation context
 * @returns Summary of submission data quality and completeness
 */
export async function generateSubmissionSummary(
  context: ConversationContext
): Promise<Result<{
  completeness: number; // 0-1 score
  qualityScore: number; // 0-100 score
  missingFields: string[];
  suggestions: string[];
  readyToSubmit: boolean;
}>> {
  try {
    const submission = context.currentSubmission;
    if (!submission) {
      return failure('Tidak ada data submission untuk dianalisis', []);
    }
    
    // Analyze completeness
    const completenessAnalysis = analyzeCompleteness(submission);
    
    // Calculate quality score
    const qualityScore = await calculateQualityScore(submission, context);
    
    // Generate suggestions
    const suggestions = generateImprovementSuggestions(submission, completenessAnalysis);
    
    const readyToSubmit = completenessAnalysis.completeness >= 0.8 && qualityScore >= 60;
    
    return success({
      completeness: completenessAnalysis.completeness,
      qualityScore,
      missingFields: completenessAnalysis.missingFields,
      suggestions,
      readyToSubmit
    });
    
  } catch (error) {
    console.error('Failed to generate submission summary:', error);
    return failure(
      'Gagal membuat ringkasan laporan',
      [error instanceof Error ? error.message : 'Summary generation error']
    );
  }
}

// ================================
// Core Processing Functions
// ================================

/**
 * Analyze user intent from message
 */
async function analyzeUserIntent(
  message: string,
  _context: ConversationContext
): Promise<{
  intent: string;
  confidence: number;
  entities: Record<string, any>;
  sentiment: number;
}> {
  // Simple intent detection - in production, use NLU services
  const lowerMessage = message.toLowerCase();
  
  // Define intent patterns
  const intentPatterns = {
    'start_report': ['lapor', 'laporkan', 'melaporkan', 'ada masalah', 'complaint'],
    'provide_location': ['di', 'lokasi', 'tempat', 'alamat', 'jalan', 'rt', 'rw'],
    'describe_issue': ['rusak', 'kotor', 'bahaya', 'masalah', 'gangguan'],
    'confirm': ['ya', 'benar', 'iya', 'betul', 'setuju', 'ok'],
    'deny': ['tidak', 'bukan', 'salah', 'enggak', 'nggak'],
    'request_help': ['bantuan', 'help', 'bingung', 'tidak tahu', 'gimana'],
    'provide_category': ['infrastruktur', 'lingkungan', 'keamanan', 'kesehatan', 'pendidikan', 'sosial'],
    'end_conversation': ['selesai', 'cukup', 'sudah', 'terima kasih', 'bye']
  };
  
  let detectedIntent = 'unknown';
  let maxMatches = 0;
  
  for (const [intent, patterns] of Object.entries(intentPatterns)) {
    const matches = patterns.filter(pattern => lowerMessage.includes(pattern)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedIntent = intent;
    }
  }
  
  // Extract entities
  const entities = extractEntities(message);
  
  // Simple sentiment analysis
  const sentiment = calculateSentiment(message);
  
  const confidence = maxMatches > 0 ? Math.min(0.9, maxMatches / 3) : 0.3;
  
  return {
    intent: detectedIntent,
    confidence,
    entities,
    sentiment
  };
}

/**
 * Determine current conversation state
 */
function determineConversationState(
  context: ConversationContext,
  intentAnalysis: any
): ConversationState {
  const submission = context.currentSubmission;
  const historyLength = context.conversationHistory.length;
  
  // Initial state
  if (historyLength === 0) return 'greeting';
  
  // Check if user wants to end
  if (intentAnalysis.intent === 'end_conversation') return 'completion';
  
  // Check if escalation is needed
  const recentConfusion = context.conversationHistory
    .slice(-3)
    .filter(msg => msg.role === 'user')
    .every(msg => msg.metadata?.intent === 'request_help');
  
  if (recentConfusion) return 'escalation';
  
  // Determine state based on data completeness
  if (!submission?.description || submission.description.length < 10) {
    return 'description_refinement';
  }
  
  if (!submission.location?.coordinates) {
    return 'location_gathering';
  }
  
  if (!(submission.metadata as any)?.category) {
    return 'category_detection';
  }
  
  if (!(submission.metadata as any)?.severity) {
    return 'severity_assessment';
  }
  
  if (!submission.images || submission.images.length === 0) {
    return 'image_guidance';
  }
  
  return 'confirmation';
}

/**
 * Process state transition and generate response
 */
async function processStateTransition(
  message: string,
  context: ConversationContext,
  currentState: ConversationState,
  intentAnalysis: any,
  config: ConversationConfig
): Promise<ConversationResponse> {
  const stateHandlers = {
    'greeting': handleGreeting,
    'category_detection': handleCategoryDetection,
    'location_gathering': handleLocationGathering,
    'description_refinement': handleDescriptionRefinement,
    'severity_assessment': handleSeverityAssessment,
    'image_guidance': handleImageGuidance,
    'confirmation': handleConfirmation,
    'completion': handleCompletion,
    'escalation': handleEscalation
  };
  
  const handler = stateHandlers[currentState];
  return handler(message, context, intentAnalysis, config);
}

// ================================
// State Handlers
// ================================

async function handleGreeting(
  _message: string,
  context: ConversationContext,
  intentAnalysis: any,
  _config: ConversationConfig
): Promise<ConversationResponse> {
  // Initialize submission if user is starting to report
  if (intentAnalysis.intent === 'start_report' || intentAnalysis.entities.category) {
    context.currentSubmission = {
      description: '',
      location: {} as any,
      images: [],
      metadata: {}
    } as any;
  }
  
  return {
    message: "Halo! Saya akan membantu Anda melaporkan masalah yang ada di lingkungan Anda. " +
             "Ceritakan masalah apa yang ingin Anda laporkan?",
    intent: 'request_issue_description',
    confidence: 1.0,
    extractedData: intentAnalysis.entities,
    suggestedActions: ['Mulai dengan menjelaskan masalah yang Anda temui'],
    followUpQuestions: [
      "Apa masalah yang ingin Anda laporkan?",
      "Di mana lokasi masalah tersebut?",
      "Kapan Anda pertama kali melihat masalah ini?"
    ],
    requiresHumanEscalation: false,
    completionStatus: 'incomplete'
  };
}

async function handleCategoryDetection(
  message: string,
  context: ConversationContext,
  _intentAnalysis: any,
  _config: ConversationConfig
): Promise<ConversationResponse> {
  // Try to detect category from message
  const detectedCategory = detectCategoryFromText(message);
  
  if (detectedCategory && context.currentSubmission) {
    (context.currentSubmission.metadata as any).category = detectedCategory;
    
    return {
      message: `Saya memahami ini sebagai masalah ${getCategoryDisplayName(detectedCategory)}. ` +
               "Bisakah Anda memberikan detail lokasi di mana masalah ini terjadi?",
      intent: 'request_location',
      confidence: 0.8,
      extractedData: { category: detectedCategory },
      suggestedActions: ['Berikan alamat atau lokasi yang spesifik'],
      followUpQuestions: [
        "Di jalan atau area mana masalah ini terjadi?",
        "Apakah ada patokan terdekat yang bisa dijadikan referensi?"
      ],
      requiresHumanEscalation: false,
      completionStatus: 'incomplete'
    };
  }
  
  return {
    message: "Untuk membantu saya memahami masalah Anda, bisakah Anda pilih kategori yang paling sesuai:\n" +
             "1. Infrastruktur (jalan, jembatan, lampu jalan)\n" +
             "2. Lingkungan (sampah, banjir, polusi)\n" +
             "3. Keamanan (pencurian, area gelap)\n" +
             "4. Kesehatan (fasilitas kesehatan)\n" +
             "5. Pendidikan (sekolah, fasilitas belajar)\n" +
             "6. Pelayanan Publik (administrasi, dokumen)\n" +
             "7. Sosial (konflik, masalah komunitas)",
    intent: 'request_category',
    confidence: 0.9,
    extractedData: {},
    suggestedActions: ['Pilih nomor atau sebutkan kategori yang sesuai'],
    followUpQuestions: [],
    requiresHumanEscalation: false,
    completionStatus: 'requires_clarification'
  };
}

async function handleLocationGathering(
  message: string,
  context: ConversationContext,
  _intentAnalysis: any,
  _config: ConversationConfig
): Promise<ConversationResponse> {
  const locationData = extractLocationFromText(message);
  
  if (locationData.hasLocation && context.currentSubmission) {
    context.currentSubmission.location = {
      coordinates: locationData.coordinates || [0, 0],
      address: locationData.address || message,
      accuracy: 100, // Default GPS accuracy
      ...locationData.administrative
    } as any;
    
    return {
      message: `Lokasi tercatat: ${locationData.address || message}. ` +
               "Sekarang, bisakah Anda jelaskan secara detail masalah yang Anda lihat di lokasi tersebut?",
      intent: 'request_detailed_description',
      confidence: 0.8,
      extractedData: locationData,
      suggestedActions: ['Berikan deskripsi detail dan spesifik tentang masalah'],
      followUpQuestions: [
        "Bagaimana kondisi kerusakan atau masalahnya?",
        "Sudah berapa lama masalah ini terjadi?",
        "Apakah ada dampak yang sudah dirasakan?"
      ],
      requiresHumanEscalation: false,
      completionStatus: 'incomplete'
    };
  }
  
  return {
    message: "Mohon berikan informasi lokasi yang lebih spesifik. Contoh:\n" +
             "- Jalan Sudirman depan Gedung A\n" +
             "- RT 05 RW 02 Kelurahan Senen\n" +
             "- Dekat halte TransJakarta Bundaran HI\n" +
             "\nAtau Anda bisa berbagi lokasi GPS jika memungkinkan.",
    intent: 'request_specific_location',
    confidence: 0.9,
    extractedData: {},
    suggestedActions: ['Berikan alamat yang spesifik dengan patokan jelas'],
    followUpQuestions: [],
    requiresHumanEscalation: false,
    completionStatus: 'requires_clarification'
  };
}

async function handleDescriptionRefinement(
  message: string,
  context: ConversationContext,
  _intentAnalysis: any,
  config: ConversationConfig
): Promise<ConversationResponse> {
  if (context.currentSubmission) {
    // Append to existing description or replace if empty
    if (context.currentSubmission.description) {
      context.currentSubmission.description += ' ' + message;
    } else {
      context.currentSubmission.description = message;
    }
  }
  
  const currentDescription = context.currentSubmission?.description || '';
  const qualityScore = assessDescriptionQuality(currentDescription);
  
  if (qualityScore >= config.qualityThreshold) {
    return {
      message: "Terima kasih atas deskripsi yang detail. " +
               "Seberapa mendesak menurut Anda masalah ini perlu ditangani?\n" +
               "1. Rendah - tidak mengganggu aktivitas\n" +
               "2. Sedang - sedikit mengganggu\n" +
               "3. Tinggi - sangat mengganggu\n" +
               "4. Kritis - berbahaya dan butuh penanganan segera",
      intent: 'request_severity',
      confidence: 0.9,
      extractedData: { description: currentDescription },
      suggestedActions: ['Pilih tingkat urgensi yang sesuai'],
      followUpQuestions: [],
      requiresHumanEscalation: false,
      completionStatus: 'incomplete'
    };
  }
  
  const suggestions = generateDescriptionSuggestions(currentDescription, qualityScore);
  
  return {
    message: "Deskripsi Anda sudah baik, namun bisa diperbaiki untuk hasil yang lebih optimal. " +
             `${suggestions.join(' ')} Bisakah Anda tambahkan detail tersebut?`,
    intent: 'request_description_improvement',
    confidence: 0.8,
    extractedData: { description: currentDescription, qualityScore },
    suggestedActions: suggestions,
    followUpQuestions: [
      "Kapan masalah ini pertama kali Anda lihat?",
      "Bagaimana dampaknya terhadap aktivitas sehari-hari?",
      "Apakah ada hal khusus yang membuat masalah ini urgent?"
    ],
    requiresHumanEscalation: false,
    completionStatus: 'requires_clarification'
  };
}

async function handleSeverityAssessment(
  message: string,
  context: ConversationContext,
  _intentAnalysis: any,
  _config: ConversationConfig
): Promise<ConversationResponse> {
  const severity = detectSeverityFromText(message);
  
  if (severity && context.currentSubmission) {
    (context.currentSubmission.metadata as any).severity = severity;
    
    return {
      message: `Tingkat urgensi tercatat sebagai ${getSeverityDisplayName(severity)}. ` +
               "Untuk memperkuat laporan Anda, apakah Anda bisa mengambil foto masalah tersebut? " +
               "Foto yang jelas akan membantu petugas memahami kondisi sebenarnya.",
      intent: 'request_photos',
      confidence: 0.9,
      extractedData: { severity },
      suggestedActions: ['Ambil foto yang jelas dari berbagai sudut'],
      followUpQuestions: [
        "Apakah Anda bisa mengambil foto sekarang?",
        "Jika tidak bisa foto, apakah ada detail visual lain yang bisa dijelaskan?"
      ],
      requiresHumanEscalation: false,
      completionStatus: 'incomplete'
    };
  }
  
  return {
    message: "Mohon pilih tingkat urgensi dengan menyebutkan nomor atau kata kunci:\n" +
             "1. Rendah - tidak urgent\n" +
             "2. Sedang - perlu perhatian\n" +
             "3. Tinggi - cukup urgent\n" +
             "4. Kritis - sangat urgent",
    intent: 'request_severity_selection',
    confidence: 0.9,
    extractedData: {},
    suggestedActions: ['Pilih nomor 1-4 atau sebutkan tingkat urgensi'],
    followUpQuestions: [],
    requiresHumanEscalation: false,
    completionStatus: 'requires_clarification'
  };
}

async function handleImageGuidance(
  message: string,
  context: ConversationContext,
  _intentAnalysis: any,
  _config: ConversationConfig
): Promise<ConversationResponse> {
  const hasImageIntent = message.toLowerCase().includes('foto') || 
                        message.toLowerCase().includes('gambar') ||
                        _intentAnalysis.intent === 'confirm';
  
  if (hasImageIntent) {
    return {
      message: "Bagus! Untuk foto yang efektif:\n" +
               "• Ambil dari jarak yang cukup untuk menunjukkan konteks\n" +
               "• Pastikan masalah utama terlihat jelas\n" +
               "• Ambil dari 2-3 sudut berbeda jika memungkinkan\n" +
               "• Pastikan pencahayaan cukup\n\n" +
               "Setelah foto siap, silakan upload. Atau ketik 'lanjut' jika ingin melanjutkan tanpa foto.",
      intent: 'await_photo_upload',
      confidence: 0.9,
      extractedData: {},
      suggestedActions: ['Upload foto atau ketik lanjut untuk melanjutkan'],
      followUpQuestions: [],
      requiresHumanEscalation: false,
      completionStatus: 'incomplete'
    };
  }
  
  if (message.toLowerCase().includes('tidak') || message.toLowerCase().includes('lanjut')) {
    return {
      message: "Baik, kita lanjut tanpa foto. Mari saya ringkas laporan Anda:\n\n" +
               await generateSubmissionPreview(context) +
               "\n\nApakah informasi di atas sudah benar? Ketik 'ya' untuk mengirim laporan atau 'edit' untuk mengubah.",
      intent: 'request_confirmation',
      confidence: 0.9,
      extractedData: {},
      suggestedActions: ['Konfirmasi dengan ya/tidak atau minta edit'],
      followUpQuestions: [],
      requiresHumanEscalation: false,
      completionStatus: 'requires_clarification'
    };
  }
  
  return {
    message: "Apakah Anda ingin menambahkan foto untuk memperkuat laporan? " +
             "Foto sangat membantu petugas memahami kondisi masalah dengan lebih baik. " +
             "Ketik 'ya' untuk panduan foto atau 'tidak' untuk lanjut tanpa foto.",
    intent: 'request_photo_decision',
    confidence: 0.8,
    extractedData: {},
    suggestedActions: ['Jawab ya atau tidak untuk foto'],
    followUpQuestions: [],
    requiresHumanEscalation: false,
    completionStatus: 'requires_clarification'
  };
}

async function handleConfirmation(
  message: string,
  _context: ConversationContext,
  intentAnalysis: any,
  _config: ConversationConfig
): Promise<ConversationResponse> {
  if (intentAnalysis.intent === 'confirm' || message.toLowerCase().includes('ya')) {
    return {
      message: "Laporan Anda telah diterima dan akan diproses oleh tim terkait. " +
               "Anda akan mendapat notifikasi update melalui aplikasi. " +
               "Nomor laporan: #" + generateReportNumber() + "\n\n" +
               "Terima kasih telah berpartisipasi membangun lingkungan yang lebih baik!",
      intent: 'submission_completed',
      confidence: 1.0,
      extractedData: { confirmed: true },
      suggestedActions: [],
      followUpQuestions: [],
      requiresHumanEscalation: false,
      completionStatus: 'complete'
    };
  }
  
  if (message.toLowerCase().includes('edit') || message.toLowerCase().includes('ubah')) {
    return {
      message: "Baik, bagian mana yang ingin Anda ubah?\n" +
               "1. Deskripsi masalah\n" +
               "2. Lokasi\n" +
               "3. Kategori\n" +
               "4. Tingkat urgensi\n" +
               "5. Foto\n\n" +
               "Sebutkan nomor atau nama bagian yang ingin diubah.",
      intent: 'request_edit_selection',
      confidence: 0.9,
      extractedData: {},
      suggestedActions: ['Pilih bagian yang ingin diubah'],
      followUpQuestions: [],
      requiresHumanEscalation: false,
      completionStatus: 'requires_clarification'
    };
  }
  
  return {
    message: "Mohon konfirmasi dengan mengetik 'ya' untuk mengirim laporan atau 'edit' untuk mengubah informasi.",
    intent: 'request_final_confirmation',
    confidence: 0.9,
    extractedData: {},
    suggestedActions: ['Ketik ya untuk kirim atau edit untuk ubah'],
    followUpQuestions: [],
    requiresHumanEscalation: false,
    completionStatus: 'requires_clarification'
  };
}

async function handleCompletion(
  _message: string,
  _context: ConversationContext,
  _intentAnalysis: any,
  _config: ConversationConfig
): Promise<ConversationResponse> {
  return {
    message: "Terima kasih! Apakah ada masalah lain yang ingin Anda laporkan? " +
             "Ketik 'lapor baru' untuk memulai laporan baru atau 'selesai' untuk mengakhiri percakapan.",
    intent: 'conversation_end',
    confidence: 1.0,
    extractedData: {},
    suggestedActions: [],
    followUpQuestions: [],
    requiresHumanEscalation: false,
    completionStatus: 'complete'
  };
}

async function handleEscalation(
  _message: string,
  _context: ConversationContext,
  _intentAnalysis: any,
  _config: ConversationConfig
): Promise<ConversationResponse> {
  return {
    message: "Saya melihat Anda memerlukan bantuan lebih lanjut. " +
             "Saya akan menghubungkan Anda dengan operator manusia yang dapat membantu menyelesaikan laporan. " +
             "Mohon tunggu sebentar...",
    intent: 'escalate_to_human',
    confidence: 1.0,
    extractedData: { escalationReason: 'user_confusion' },
    suggestedActions: [],
    followUpQuestions: [],
    requiresHumanEscalation: true,
    completionStatus: 'requires_clarification'
  };
}

// ================================
// Helper Functions
// ================================

async function generateGreeting(context: ConversationContext): Promise<ConversationResponse> {
  const isReturningUser = context.userProfile.previousSubmissions > 0;
  
  const message = isReturningUser ?
    `Selamat datang kembali! Saya siap membantu Anda melaporkan masalah baru. Apa yang ingin Anda laporkan hari ini?` :
    `Selamat datang di Suara.id! Saya adalah asisten AI yang akan membantu Anda melaporkan masalah di lingkungan sekitar. Mari kita mulai - ceritakan masalah apa yang ingin Anda laporkan?`;
  
  return {
    message,
    intent: 'greeting',
    confidence: 1.0,
    extractedData: {},
    suggestedActions: ['Ceritakan masalah yang ingin dilaporkan'],
    followUpQuestions: [
      "Apa jenis masalah yang Anda temui?",
      "Di mana lokasi masalah tersebut?"
    ],
    requiresHumanEscalation: false,
    completionStatus: 'incomplete'
  };
}

function extractEntities(message: string): Record<string, any> {
  const entities: Record<string, any> = {};
  
  // Extract locations
  const locationMatches = message.match(/jalan?\s+[\w\s]+|jl\.?\s*[\w\s]+/gi);
  if (locationMatches) {
    entities.locations = locationMatches;
  }
  
  // Extract RT/RW
  const rtRwMatches = message.match(/rt\s*\d+|rw\s*\d+/gi);
  if (rtRwMatches) {
    entities.administrative = rtRwMatches;
  }
  
  // Extract numbers
  const numbers = message.match(/\d+/g);
  if (numbers) {
    entities.numbers = numbers;
  }
  
  // Extract time references
  const timeRefs = message.match(/kemarin|hari ini|minggu lalu|bulan lalu|pagi|siang|sore|malam/gi);
  if (timeRefs) {
    entities.timeReferences = timeRefs;
  }
  
  return entities;
}

function calculateSentiment(message: string): number {
  const positiveWords = ['baik', 'bagus', 'senang', 'terima kasih', 'hebat'];
  const negativeWords = ['buruk', 'jelek', 'rusak', 'bahaya', 'parah', 'marah', 'kesal'];
  
  const lowerMessage = message.toLowerCase();
  let score = 0;
  
  positiveWords.forEach(word => {
    if (lowerMessage.includes(word)) score += 1;
  });
  
  negativeWords.forEach(word => {
    if (lowerMessage.includes(word)) score -= 1;
  });
  
  return Math.max(-1, Math.min(1, score / 5));
}

function detectCategoryFromText(message: string): IssueCategory | null {
  const lowerMessage = message.toLowerCase();
  
  const categoryKeywords = {
    'INFRASTRUCTURE': ['jalan', 'jembatan', 'trotoar', 'lampu jalan', 'drainase', 'infrastruktur'],
    'ENVIRONMENT': ['sampah', 'banjir', 'polusi', 'limbah', 'lingkungan'],
    'SAFETY': ['pencurian', 'maling', 'bahaya', 'keamanan', 'gelap'],
    'HEALTH': ['rumah sakit', 'puskesmas', 'kesehatan', 'dokter', 'obat'],
    'EDUCATION': ['sekolah', 'pendidikan', 'guru', 'murid', 'belajar'],
    'GOVERNANCE': ['pelayanan', 'administrasi', 'ktp', 'surat', 'kantor'],
    'SOCIAL': ['tetangga', 'warga', 'komunitas', 'sosial', 'konflik']
  };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      return category as IssueCategory;
    }
  }
  
  return null;
}

function extractLocationFromText(message: string): {
  hasLocation: boolean;
  address?: string;
  coordinates?: [number, number];
  administrative?: Record<string, string>;
} {
  const lowerMessage = message.toLowerCase();
  
  // Check for street names
  const streetMatch = message.match(/jalan?\s+([\w\s]+)|jl\.?\s*([\w\s]+)/i);
  
  // Check for RT/RW
  const rtMatch = message.match(/rt\s*(\d+)/i);
  const rwMatch = message.match(/rw\s*(\d+)/i);
  
  // Check for administrative areas
  const kelurahanMatch = message.match(/kelurahan\s+([\w\s]+)/i);
  const kecamatanMatch = message.match(/kecamatan\s+([\w\s]+)/i);
  
  const hasLocation = !!(streetMatch || rtMatch || rwMatch || kelurahanMatch || kecamatanMatch);
  
  if (!hasLocation) {
    return { hasLocation: false };
  }
  
  const administrative: Record<string, string> = {};
  if (rtMatch) administrative.rt = rtMatch[1];
  if (rwMatch) administrative.rw = rwMatch[1];
  if (kelurahanMatch) administrative.kelurahan = kelurahanMatch[1].trim();
  if (kecamatanMatch) administrative.kecamatan = kecamatanMatch[1].trim();
  
  return {
    hasLocation: true,
    address: message.trim(),
    administrative
  };
}

function detectSeverityFromText(message: string): IssueSeverity | null {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('1') || lowerMessage.includes('rendah') || lowerMessage.includes('tidak urgent')) {
    return 'LOW';
  }
  if (lowerMessage.includes('2') || lowerMessage.includes('sedang') || lowerMessage.includes('biasa')) {
    return 'MEDIUM';
  }
  if (lowerMessage.includes('3') || lowerMessage.includes('tinggi') || lowerMessage.includes('urgent')) {
    return 'HIGH';
  }
  if (lowerMessage.includes('4') || lowerMessage.includes('kritis') || lowerMessage.includes('darurat') || lowerMessage.includes('bahaya')) {
    return 'CRITICAL';
  }
  
  return null;
}

function assessDescriptionQuality(description: string): number {
  let score = 0;
  
  // Length score (0-30 points)
  if (description.length >= 50) score += 30;
  else if (description.length >= 20) score += 20;
  else if (description.length >= 10) score += 10;
  
  // Detail score (0-30 points)
  const hasLocation = /jalan|jl\.|rt|rw|dekat|depan|samping/i.test(description);
  const hasTimeRef = /kemarin|hari ini|minggu|bulan|pagi|siang|sore|malam/i.test(description);
  const hasImpact = /bahaya|mengganggu|rusak|kotor|macet/i.test(description);
  
  if (hasLocation) score += 10;
  if (hasTimeRef) score += 10;
  if (hasImpact) score += 10;
  
  // Clarity score (0-40 points)
  const sentences = description.split(/[.!?]+/).filter(s => s.trim());
  if (sentences.length >= 2) score += 20;
  
  const hasSpecifics = /\d+/.test(description); // Numbers for specificity
  if (hasSpecifics) score += 20;
  
  return Math.min(100, score);
}

function generateDescriptionSuggestions(description: string, _qualityScore: number): string[] {
  const suggestions: string[] = [];
  
  if (description.length < 30) {
    suggestions.push('Tambahkan detail lebih spesifik tentang kondisi masalah.');
  }
  
  if (!/jalan|jl\.|rt|rw|dekat|depan|samping/i.test(description)) {
    suggestions.push('Sebutkan patokan atau referensi lokasi yang jelas.');
  }
  
  if (!/kemarin|hari ini|minggu|bulan|pagi|siang|sore|malam/i.test(description)) {
    suggestions.push('Jelaskan kapan masalah ini pertama kali terjadi.');
  }
  
  if (!/bahaya|mengganggu|rusak|kotor|macet|dampak/i.test(description)) {
    suggestions.push('Ceritakan dampak yang dirasakan dari masalah ini.');
  }
  
  return suggestions;
}

async function generateSubmissionPreview(context: ConversationContext): Promise<string> {
  const submission = context.currentSubmission;
  if (!submission) return 'Data tidak tersedia';
  
  const category = getCategoryDisplayName((submission.metadata as any)?.category || 'OTHER');
  const severity = getSeverityDisplayName((submission.metadata as any)?.severity || 'MEDIUM');
  const location = (submission.location as any)?.address || 'Lokasi tidak spesifik';
  
  return `📋 **Ringkasan Laporan**
📍 Lokasi: ${location}
🏷️ Kategori: ${category}
🚨 Urgensi: ${severity}
📝 Deskripsi: ${submission.description}
📸 Foto: ${submission.images?.length || 0} gambar`;
}

function generateReportNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const time = now.getTime().toString().slice(-4);
  
  return `${year}${month}${day}${time}`;
}

function getCategoryDisplayName(category: IssueCategory): string {
  const names: Record<IssueCategory, string> = {
    'INFRASTRUCTURE': 'Infrastruktur',
    'ENVIRONMENT': 'Lingkungan',
    'SAFETY': 'Keamanan',
    'HEALTH': 'Kesehatan',
    'EDUCATION': 'Pendidikan',
    'GOVERNANCE': 'Pelayanan Publik',
    'SOCIAL': 'Sosial',
    'OTHER': 'Lainnya'
  };
  
  return names[category] || 'Lainnya';
}

function getSeverityDisplayName(severity: IssueSeverity): string {
  const names: Record<IssueSeverity, string> = {
    'LOW': 'Rendah',
    'MEDIUM': 'Sedang',
    'HIGH': 'Tinggi',
    'CRITICAL': 'Kritis'
  };
  
  return names[severity] || 'Sedang';
}

function analyzeCompleteness(submission: any): { completeness: number; missingFields: string[] } {
  const requiredFields = ['description', 'location', 'category'];
  // const optionalFields = ['severity', 'images']; // For future use
  
  let score = 0;
  const missingFields: string[] = [];
  
  // Check required fields
  requiredFields.forEach(field => {
    if (field === 'location' && submission.location?.coordinates) {
      score += 0.4; // 40% for location
    } else if (field === 'description' && submission.description?.length >= 20) {
      score += 0.4; // 40% for description
    } else if (field === 'category' && submission.metadata?.category) {
      score += 0.2; // 20% for category
    } else {
      missingFields.push(field);
    }
  });
  
  return { completeness: score, missingFields };
}

async function calculateQualityScore(submission: any, _context: ConversationContext): Promise<number> {
  let score = 0;
  
  // Description quality (50%)
  if (submission.description) {
    score += assessDescriptionQuality(submission.description) * 0.5;
  }
  
  // Location completeness (30%)
  if (submission.location?.coordinates) score += 30;
  if (submission.location?.address) score += 10;
  if (submission.location?.kelurahan) score += 5;
  if (submission.location?.kecamatan) score += 5;
  
  // Other factors (20%)
  if (submission.metadata?.severity) score += 10;
  if (submission.images?.length > 0) score += 10;
  
  return Math.min(100, score);
}

function generateImprovementSuggestions(submission: any, completenessAnalysis: any): string[] {
  const suggestions: string[] = [];
  
  if (completenessAnalysis.missingFields.includes('description')) {
    suggestions.push('Lengkapi deskripsi masalah');
  }
  
  if (completenessAnalysis.missingFields.includes('location')) {
    suggestions.push('Tambahkan informasi lokasi yang spesifik');
  }
  
  if (completenessAnalysis.missingFields.includes('category')) {
    suggestions.push('Pilih kategori masalah yang sesuai');
  }
  
  if (!submission.metadata?.severity) {
    suggestions.push('Tentukan tingkat urgensi masalah');
  }
  
  if (!submission.images || submission.images.length === 0) {
    suggestions.push('Tambahkan foto untuk memperkuat laporan');
  }
  
  return suggestions;
}