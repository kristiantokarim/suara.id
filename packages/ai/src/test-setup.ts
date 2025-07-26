/**
 * Test setup for AI package
 * 
 * Configures testing environment for Indonesian language processing,
 * conversation flows, and clustering algorithms.
 */

// Global test timeout for AI operations
jest.setTimeout(30000);

// Mock external AI services for testing
(global as any).mockOpenAI = jest.fn();
(global as any).mockClaude = jest.fn();

// Mock configuration for testing
process.env.NODE_ENV = 'test';
process.env.AI_PROVIDER = 'mock';
process.env.ENABLE_AI_LOGGING = 'false';

// Indonesian test data constants
export const INDONESIAN_TEST_DATA = {
  // Sample messages in Indonesian
  messages: {
    greeting: 'Halo, saya ingin melaporkan masalah',
    infrastructure: 'Jalan rusak di depan rumah saya',
    environment: 'Ada sampah menumpuk di jalan raya',
    location: 'Di Jalan Sudirman RT 05 RW 02 Jakarta Pusat',
    severity_high: 'Ini sangat mengganggu dan berbahaya',
    confirmation: 'Ya, informasi sudah benar'
  },
  
  // Indonesian administrative data
  locations: {
    jakarta: {
      province: 'DKI Jakarta',
      city: 'Jakarta Pusat', 
      district: 'Menteng',
      village: 'Gondangdia'
    },
    bandung: {
      province: 'Jawa Barat',
      city: 'Bandung',
      district: 'Cidadap', 
      village: 'Hegarmanah'
    }
  },
  
  // Phone number formats
  phoneNumbers: [
    '08123456789',
    '8123456789', 
    '+628123456789',
    '628123456789'
  ],
  
  // NIK examples (anonymized)
  nikExamples: [
    '3171234567890123', // Jakarta male
    '3171454567890123', // Jakarta female (day + 40)
    '3273234567890123'  // Bandung male
  ]
};

// Mock conversation context for testing
export const createMockContext = (overrides = {}): any => ({
  userId: 'test-user-123',
  sessionId: 'test-session-456',
  language: 'id',
  userProfile: {
    trustLevel: 'BASIC',
    previousSubmissions: 0,
    preferredCategories: []
  },
  conversationHistory: [],
  currentSubmission: undefined,
  ...overrides
});

// Mock submission data
export const createMockSubmission = (overrides = {}): any => ({
  description: 'Jalan rusak parah di depan rumah',
  location: {
    coordinates: [-6.2088, 106.8456], // Jakarta coordinates
    address: 'Jalan Sudirman No. 1 Jakarta Pusat',
    accuracy: 100
  },
  images: [],
  metadata: {
    category: 'INFRASTRUCTURE',
    severity: 'HIGH'
  },
  ...overrides
});

// Helper functions for tests
export const createIndonesianTextSample = (type: string): string => {
  const samples = {
    formal: 'Dengan hormat, saya ingin melaporkan adanya kerusakan infrastruktur',
    informal: 'Mau lapor nih, jalan depan rumah rusak banget',
    javanese: 'Kulo badhe nglaporaken wonten masalah infrastruktur',
    mixed: 'Halo, ada jalan yang rusak di daerah saya nih'
  };
  
  return samples[type as keyof typeof samples] || samples.formal;
};

// Mock AI responses for consistent testing
export const MOCK_AI_RESPONSES = {
  intent_detection: {
    intent: 'start_report',
    confidence: 0.85,
    entities: { category: 'INFRASTRUCTURE' },
    sentiment: -0.3
  },
  
  conversation_response: {
    message: 'Saya memahami Anda ingin melaporkan masalah infrastruktur',
    intent: 'request_details',
    confidence: 0.9,
    extractedData: {},
    suggestedActions: ['Berikan detail lokasi yang spesifik'],
    followUpQuestions: ['Di mana tepatnya lokasi masalah?'],
    requiresHumanEscalation: false,
    completionStatus: 'incomplete' as const
  }
};

// Clean up function for tests
afterEach(() => {
  jest.clearAllMocks();
});