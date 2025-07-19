/**
 * Jest setup file for authentication package tests
 * 
 * This file is run before each test file and sets up:
 * - Global test environment configuration
 * - Mock implementations for external services
 * - Indonesian-specific test data and utilities
 */

import { jest } from '@jest/globals';

// Enable fake timers for testing time-dependent functionality
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.clearAllMocks();
});

// Global test environment setup
process.env.NODE_ENV = 'test';

// Mock external services globally
jest.mock('@suara/config', () => ({
  authConfig: {
    jwtSecret: 'test-jwt-secret',
    jwtExpiresIn: '7d',
    bcryptRounds: 10
  },
  smsConfig: {
    enabled: true,
    accountSid: 'test-account-sid',
    authToken: 'test-auth-token',
    phoneNumber: '+62123456789'
  },
  ktp: {
    ocrEnabled: true,
    confidenceThreshold: 0.8
  },
  facial: {
    similarityThreshold: 0.8,
    livenessEnabled: true
  },
  LIMITS: {
    TRUST_SCORE: {
      MIN: 1.0,
      MAX: 5.0,
      PHONE_VERIFICATION_BONUS: 0.5,
      KTP_VERIFICATION_BONUS: 1.5,
      SELFIE_VERIFICATION_BONUS: 0.5,
      SOCIAL_VERIFICATION_BONUS: 1.0,
      COMMUNITY_ENDORSEMENT_BONUS: 0.1,
      ACCURACY_BONUS_MAX: 0.5,
      SUBMISSION_HISTORY_MAX: 0.3,
      VERIFIED_THRESHOLD: 2.1,
      PREMIUM_THRESHOLD: 4.1
    },
    QUALITY_SCORE: {
      TEXT_SCORE_MAX: 3,
      MEDIA_SCORE_MAX: 4,
      LOCATION_SCORE_MAX: 2,
      AI_VALIDATION_MAX: 3,
      HIGH_QUALITY_THRESHOLD: 9,
      MEDIUM_QUALITY_THRESHOLD: 6
    }
  }
}));

// Mock Prisma database client
jest.mock('@suara/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn()
    },
    userTrustScore: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn()
    },
    verification: {
      create: jest.fn(),
      findMany: jest.fn()
    },
    socialAccount: {
      create: jest.fn(),
      findMany: jest.fn()
    },
    userProfile: {
      upsert: jest.fn()
    },
    $transaction: jest.fn()
  }
}));

// Mock Twilio SMS service
jest.mock('twilio', () => {
  return jest.fn(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        sid: 'mock-message-sid',
        status: 'sent'
      })
    }
  }));
});

// Global test utilities for Indonesian context
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidIndonesianPhone(): R;
      toBeValidNIK(): R;
    }
  }
}

// Custom Jest matchers for Indonesian data validation
expect.extend({
  toBeValidIndonesianPhone(received: string) {
    const indonesianPhoneRegex = /^\+628\d{8,11}$/;
    const pass = indonesianPhoneRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Indonesian phone number`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Indonesian phone number (+628xxxxxxxx)`,
        pass: false,
      };
    }
  },

  toBeValidNIK(received: string) {
    const nikRegex = /^\d{16}$/;
    const pass = nikRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid NIK format`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid 16-digit NIK`,
        pass: false,
      };
    }
  }
});

// Indonesian test data constants
export const INDONESIAN_TEST_DATA = {
  VALID_PHONES: [
    '+628123456789',  // Telkomsel
    '+628111234567',  // Telkomsel
    '+628151234567',  // Indosat
    '+628171234567',  // XL
    '+628961234567'   // Tri
  ],
  
  INVALID_PHONES: [
    '+6271234567',    // Landline (too short)
    '+1234567890',    // Wrong country code
    'not-a-number',   // Invalid format
    '+628123'         // Too short
  ],
  
  VALID_NIKS: {
    MALE_JAKARTA: '3171154567890123',     // Jakarta, Male, born 15/04/1967
    FEMALE_JAKARTA: '3171554567890123',   // Jakarta, Female, born 15/04/1967 (15+40=55)
    MALE_BANDUNG: '3273105890123456',     // Bandung, Male, born 10/05/1990
    FEMALE_SURABAYA: '3578456790123456'   // Surabaya, Female, born 05/06/1990 (05+40=45)
  },
  
  INVALID_NIKS: [
    '123456789',          // Too short
    '31711545678901234',  // Too long
    '317115A567890123',   // Contains letter
    '9971154567890123'    // Invalid province code
  ],
  
  MOCK_KTP_TEXT: `
    REPUBLIK INDONESIA
    PROVINSI DKI JAKARTA
    KOTA JAKARTA SELATAN
    NIK: 3171154567890123
    Nama: BUDI SANTOSO
    Tempat/Tgl Lahir: JAKARTA, 15-04-1967
    Jenis Kelamin: LAKI-LAKI
    Alamat: JL. SUDIRMAN NO. 123
    RT/RW: 001/002
    Kel/Desa: SENAYAN
    Kecamatan: KEBAYORAN BARU
    Agama: ISLAM
    Status Perkawinan: BELUM KAWIN
    Pekerjaan: KARYAWAN SWASTA
    Kewarganegaraan: WNI
    Berlaku Hingga: SEUMUR HIDUP
  `,
  
  ADMINISTRATIVE_AREAS: {
    PROVINCES: ['DKI JAKARTA', 'JAWA BARAT', 'JAWA TENGAH', 'JAWA TIMUR'],
    CITIES: ['JAKARTA SELATAN', 'BANDUNG', 'SURABAYA', 'YOGYAKARTA'],
    DISTRICTS: ['KEBAYORAN BARU', 'BANDUNG WETAN', 'GUBENG', 'GONDOKUSUMAN'],
    VILLAGES: ['SENAYAN', 'TAMANSARI', 'AIRLANGGA', 'BACIRO']
  }
};

// Helper function to create mock dates for Indonesian context
export const createIndonesianDate = (day: number, month: number, year: number): Date => {
  return new Date(year, month - 1, day); // Month is 0-indexed in JavaScript
};

// Helper function to wait for async operations in tests
export const waitFor = async (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Console logging for test debugging (only in verbose mode)
const originalLog = console.log;
console.log = (...args: any[]) => {
  if (process.env.JEST_VERBOSE === 'true') {
    originalLog(...args);
  }
};

// Suppress expected warning messages in tests
const originalWarn = console.warn;
console.warn = (message: string, ...args: any[]) => {
  // Suppress known warnings from dependencies
  if (
    message.includes('Deprecated') ||
    message.includes('Warning:') ||
    message.includes('Optional auth failed')
  ) {
    return;
  }
  originalWarn(message, ...args);
};