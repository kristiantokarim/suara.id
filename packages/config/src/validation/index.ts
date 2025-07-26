import { z } from 'zod';
import { LIMITS } from '../constants/limits';

/**
 * Indonesian-specific validation schemas using Zod
 * 
 * These schemas provide comprehensive validation for Indonesian context,
 * including phone numbers, NIK, administrative areas, and user inputs.
 */

// ================================
// Phone Number Validation
// ================================

/**
 * Indonesian phone number validation schema
 * Supports various Indonesian mobile number formats
 */
export const indonesianPhoneSchema = z.string()
  .min(10, 'Nomor telepon terlalu pendek')
  .max(15, 'Nomor telepon terlalu panjang')
  .regex(
    /^(\+62|62|0)8[1-9][0-9]{6,11}$/,
    'Format nomor telepon tidak valid. Gunakan format: 08xxxxxxxxx, 628xxxxxxxxx, atau +628xxxxxxxxx'
  )
  .transform((phone) => {
    // Normalize to +628xxxxxxxxx format
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('0')) {
      return '+62' + digits.substring(1);
    } else if (digits.startsWith('62')) {
      return '+' + digits;
    } else if (digits.startsWith('8')) {
      return '+62' + digits;
    }
    return phone;
  });

// ================================
// NIK (Indonesian ID) Validation
// ================================

/**
 * Indonesian NIK (Nomor Induk Kependudukan) validation schema
 * Validates the 16-digit format and basic structure
 */
export const nikSchema = z.string()
  .length(16, 'NIK harus 16 digit')
  .regex(/^\d{16}$/, 'NIK harus berisi angka saja')
  .refine((nik) => {
    // Validate provinsi code (01-94)
    const provinsiCode = parseInt(nik.substring(0, 2));
    return provinsiCode >= 1 && provinsiCode <= 94;
  }, 'Kode provinsi dalam NIK tidak valid')
  .refine((nik) => {
    // Validate birth date component
    const day = parseInt(nik.substring(6, 8));
    const month = parseInt(nik.substring(8, 10));
    const year = parseInt(nik.substring(10, 12));
    
    // For women, day is offset by +40
    const actualDay = day > 40 ? day - 40 : day;
    
    // Basic date validation
    return actualDay >= 1 && actualDay <= 31 && 
           month >= 1 && month <= 12 &&
           year >= 0 && year <= 99;
  }, 'Tanggal lahir dalam NIK tidak valid');

// ================================
// User Registration Validation
// ================================

/**
 * User registration input validation schema
 */
export const userRegistrationSchema = z.object({
  phone: indonesianPhoneSchema,
  name: z.string()
    .min(2, 'Nama terlalu pendek (minimal 2 karakter)')
    .max(100, 'Nama terlalu panjang (maksimal 100 karakter)')
    .regex(
      /^[a-zA-Z\s\u00C0-\u017F\u1E00-\u1EFF]+$/,
      'Nama hanya boleh berisi huruf dan spasi'
    )
    .transform((name) => name.trim().toUpperCase()),
  language: z.enum(['id', 'jv', 'su', 'bt', 'min', 'bug', 'ban'])
    .default('id'),
});

/**
 * OTP verification input validation schema
 */
export const otpVerificationSchema = z.object({
  phone: indonesianPhoneSchema,
  code: z.string()
    .length(6, 'Kode OTP harus 6 digit')
    .regex(/^\d{6}$/, 'Kode OTP harus berisi angka saja'),
});

// ================================
// KTP Verification Validation
// ================================

/**
 * KTP verification input validation schema
 */
export const ktpVerificationSchema = z.object({
  documentImage: z.string()
    .min(1, 'Gambar KTP diperlukan')
    .refine((data) => {
      // Check if it's a valid base64 image
      const base64Regex = /^data:image\/(jpeg|jpg|png|webp);base64,/;
      return base64Regex.test(data);
    }, 'Format gambar tidak valid. Gunakan JPEG, PNG, atau WebP'),
  selfieImage: z.string()
    .min(1, 'Foto selfie diperlukan')
    .refine((data) => {
      const base64Regex = /^data:image\/(jpeg|jpg|png|webp);base64,/;
      return base64Regex.test(data);
    }, 'Format foto selfie tidak valid. Gunakan JPEG, PNG, atau WebP'),
  userProvidedData: z.object({
    name: z.string().optional(),
    nik: nikSchema.optional(),
  }).optional(),
});

// ================================
// Submission Validation
// ================================

/**
 * Issue submission input validation schema
 */
export const submissionSchema = z.object({
  content: z.string()
    .min(LIMITS.SUBMISSION.MIN_TEXT_LENGTH, `Laporan terlalu pendek (minimal ${LIMITS.SUBMISSION.MIN_TEXT_LENGTH} karakter)`)
    .max(LIMITS.SUBMISSION.MAX_TEXT_LENGTH, `Laporan terlalu panjang (maksimal ${LIMITS.SUBMISSION.MAX_TEXT_LENGTH} karakter)`)
    .trim(),
  
  category: z.enum([
    'INFRASTRUCTURE',
    'ENVIRONMENT', 
    'SAFETY',
    'HEALTH',
    'EDUCATION',
    'GOVERNANCE',
    'SOCIAL',
    'OTHER'
  ]),
  
  location: z.object({
    coordinates: z.tuple([
      z.number().min(-11.0).max(6.0), // Indonesia latitude bounds
      z.number().min(95.0).max(141.0) // Indonesia longitude bounds
    ]).refine(([lat, lng]) => {
      // Ensure coordinates are within Indonesia
      return lat >= LIMITS.LOCATION.MIN_LATITUDE && 
             lat <= LIMITS.LOCATION.MAX_LATITUDE &&
             lng >= LIMITS.LOCATION.MIN_LONGITUDE && 
             lng <= LIMITS.LOCATION.MAX_LONGITUDE;
    }, 'Lokasi harus berada dalam wilayah Indonesia'),
    
    address: z.string()
      .min(10, 'Alamat terlalu pendek (minimal 10 karakter)')
      .max(500, 'Alamat terlalu panjang (maksimal 500 karakter)'),
    
    accuracy: z.number()
      .min(0)
      .max(LIMITS.LOCATION.GPS_ACCURACY_REJECT, 
           `Akurasi GPS terlalu rendah (maksimal ${LIMITS.LOCATION.GPS_ACCURACY_REJECT}m)`),
    
    kelurahan: z.string().min(2, 'Kelurahan diperlukan').optional(),
    kecamatan: z.string().min(2, 'Kecamatan diperlukan').optional(),
    kabupaten: z.string().min(2, 'Kabupaten diperlukan').optional(),
    provinsi: z.string().min(2, 'Provinsi diperlukan').optional(),
  }),
  
  images: z.array(z.string())
    .max(LIMITS.SUBMISSION.MAX_IMAGES, `Maksimal ${LIMITS.SUBMISSION.MAX_IMAGES} gambar`)
    .refine((images) => {
      return images.every(img => {
        const base64Regex = /^data:image\/(jpeg|jpg|png|webp);base64,/;
        return base64Regex.test(img);
      });
    }, 'Format gambar tidak valid')
    .optional()
    .default([]),
  
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .default('MEDIUM'),
  
  isAnonymous: z.boolean().default(false),
  
  metadata: z.record(z.any()).optional(),
});

// ================================
// Pagination & Filtering Validation
// ================================

/**
 * Pagination parameters validation schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number()
    .int('Nomor halaman harus bilangan bulat')
    .min(1, 'Nomor halaman minimal 1')
    .default(1),
  
  limit: z.coerce.number()
    .int('Jumlah item per halaman harus bilangan bulat')
    .min(LIMITS.PAGINATION.MIN_PAGE_SIZE, `Minimal ${LIMITS.PAGINATION.MIN_PAGE_SIZE} item per halaman`)
    .max(LIMITS.PAGINATION.MAX_PAGE_SIZE, `Maksimal ${LIMITS.PAGINATION.MAX_PAGE_SIZE} item per halaman`)
    .default(LIMITS.PAGINATION.DEFAULT_PAGE_SIZE),
});

/**
 * Search and filtering validation schema
 */
export const searchSchema = z.object({
  query: z.string()
    .min(LIMITS.SEARCH.MIN_QUERY_LENGTH, `Kata kunci minimal ${LIMITS.SEARCH.MIN_QUERY_LENGTH} karakter`)
    .max(LIMITS.SEARCH.MAX_QUERY_LENGTH, `Kata kunci maksimal ${LIMITS.SEARCH.MAX_QUERY_LENGTH} karakter`)
    .optional(),
  
  category: z.enum([
    'INFRASTRUCTURE',
    'ENVIRONMENT', 
    'SAFETY',
    'HEALTH',
    'EDUCATION',
    'GOVERNANCE',
    'SOCIAL',
    'OTHER',
    'ALL'
  ]).optional(),
  
  location: z.object({
    center: z.tuple([z.number(), z.number()]),
    radius: z.number()
      .min(0.1, 'Radius minimal 100 meter')
      .max(LIMITS.SEARCH.SEARCH_RADIUS_KM_MAX, `Radius maksimal ${LIMITS.SEARCH.SEARCH_RADIUS_KM_MAX} km`)
      .default(LIMITS.SEARCH.SEARCH_RADIUS_KM_DEFAULT),
  }).optional(),
  
  dateRange: z.object({
    start: z.coerce.date(),
    end: z.coerce.date(),
  }).optional(),
  
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED']).optional(),
});

// ================================
// Trust Score & Verification Validation
// ================================

/**
 * Trust level validation schema
 */
export const trustLevelSchema = z.enum(['BASIC', 'VERIFIED', 'PREMIUM']);

/**
 * Social media verification input validation schema
 */
export const socialVerificationSchema = z.object({
  platform: z.enum(['facebook', 'instagram', 'whatsapp']),
  accessToken: z.string().min(1, 'Access token diperlukan'),
  profileUrl: z.string().url('URL profil tidak valid').optional(),
});

// ================================
// Admin & Moderation Validation
// ================================

/**
 * Issue response validation schema (for government officials)
 */
export const issueResponseSchema = z.object({
  issueId: z.string().uuid('ID laporan tidak valid'),
  
  responseType: z.enum(['UPDATE', 'RESOLUTION', 'REQUEST_INFO', 'ESCALATION']),
  
  message: z.string()
    .min(10, 'Pesan tanggapan minimal 10 karakter')
    .max(1000, 'Pesan tanggapan maksimal 1000 karakter'),
  
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'])
    .optional(),
  
  estimatedResolution: z.coerce.date().optional(),
  
  tags: z.array(z.string()).max(10, 'Maksimal 10 tag').optional(),
  
  attachments: z.array(z.string()).max(5, 'Maksimal 5 lampiran').optional(),
});

// ================================
// Helper Functions
// ================================

/**
 * Creates a validation function that returns Result<T>
 */
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): { success: true; data: T } | { success: false; error: string; issues: string[] } => {
    try {
      const result = schema.parse(data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: 'Data validation failed',
          issues: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        };
      }
      return {
        success: false,
        error: 'Validation error',
        issues: [error instanceof Error ? error.message : 'Unknown validation error']
      };
    }
  };
}

/**
 * Validates Indonesian phone number format
 */
export const validateIndonesianPhone = createValidator(indonesianPhoneSchema);

/**
 * Validates Indonesian NIK format
 */
export const validateNik = createValidator(nikSchema);

/**
 * Validates user registration data
 */
export const validateUserRegistration = createValidator(userRegistrationSchema);

/**
 * Validates OTP verification data
 */
export const validateOtpVerification = createValidator(otpVerificationSchema);

/**
 * Validates KTP verification data
 */
export const validateKtpVerification = createValidator(ktpVerificationSchema);

/**
 * Validates submission data
 */
export const validateSubmission = createValidator(submissionSchema);

/**
 * Validates pagination parameters
 */
export const validatePagination = createValidator(paginationSchema);

/**
 * Validates search parameters
 */
export const validateSearch = createValidator(searchSchema);

/**
 * Validates social verification data
 */
export const validateSocialVerification = createValidator(socialVerificationSchema);

/**
 * Validates issue response data
 */
export const validateIssueResponse = createValidator(issueResponseSchema);

// Schemas are already exported above, no need to re-export