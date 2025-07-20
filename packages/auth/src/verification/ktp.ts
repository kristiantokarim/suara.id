import { promises as fs } from 'fs';
import crypto from 'crypto';
import { LIMITS, type Result, success, failure } from '@suara/config';

export interface KtpData {
  nik: string;           // Nomor Induk Kependudukan (16 digits)
  name: string;          // Full name
  placeOfBirth: string;  // Tempat lahir
  dateOfBirth: Date;     // Tanggal lahir
  gender: 'M' | 'F';     // Jenis kelamin
  bloodType?: string;    // Golongan darah
  address: string;       // Alamat
  rt: string;            // RT
  rw: string;            // RW
  kelurahan: string;     // Kelurahan/Desa
  kecamatan: string;     // Kecamatan
  kabupaten: string;     // Kabupaten/Kota
  provinsi: string;      // Provinsi
  religion: string;      // Agama
  maritalStatus: string; // Status perkawinan
  occupation: string;    // Pekerjaan
  nationality: string;   // Kewarganegaraan
  validUntil?: Date;     // Berlaku hingga
  photo?: string;        // Base64 encoded photo
}

export interface KtpVerificationData {
  confidence: number;    // 0-1 confidence score
  extractedData: KtpData;
  validationDetails: {
    nikValid: boolean;
    photoQuality: number;
    documentAuthenticity: number;
  };
}

export interface NikValidationData {
  gender: 'M' | 'F';
  birthDate: {
    day: number;
    month: number;
    year: number;
  };
  administrativeArea: {
    provinsiCode: string;
    kabupatenCode: string;
    kecamatanCode: string;
  };
}

/**
 * Validates Indonesian NIK (Nomor Induk Kependudukan) format and extracts demographic information
 * 
 * NIK Format: PPDDMMYYKKKKSSS (16 digits)
 * - PP: Provinsi code (01-94)
 * - DD: Kabupaten/Kota code (01-99)  
 * - MM: Kecamatan code (01-99)
 * - YY: Birth year (last 2 digits)
 * - KKKK: Sequential number
 * - SSS: Check digits
 * 
 * @param nik - The 16-digit Indonesian NIK to validate
 * @returns Result containing validation success and extracted demographic data
 * 
 * @example
 * ```typescript
 * const result = validateNik('3171234567890123');
 * if (result.success) {
 *   console.log(`Gender: ${result.data.gender}`); // 'M' or 'F'
 *   console.log(`Birth Year: ${result.data.birthDate.year}`);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 * 
 * @remarks
 * For women, the day component (DD) is offset by +40 to indicate gender.
 * Example: Born on 15th = NIK day 15 (male) or 55 (female).
 */
export function validateNik(nik: string): Result<NikValidationData> {
  // Input validation
  if (!nik || typeof nik !== 'string') {
    return failure('NIK is required and must be a string');
  }

  // Remove any spaces or dashes
  const cleanNik = nik.replace(/[\s-]/g, '');
  
  // Check length
  if (cleanNik.length !== 16) {
    return failure('NIK harus 16 digit', ['NIK format invalid']);
  }
  
  // Check if all digits
  if (!/^\d{16}$/.test(cleanNik)) {
    return failure('NIK harus berisi angka saja', ['NIK contains non-numeric characters']);
  }
  
  // Extract components
  const provinsiCode = cleanNik.substring(0, 2);
  const kabupatenCode = cleanNik.substring(2, 4);
  const kecamatanCode = cleanNik.substring(4, 6);
  const birthDateStr = cleanNik.substring(6, 12);
  const sequential = cleanNik.substring(12, 16);
  
  // Validate provinsi code (01-94, but some are reserved)
  const provinsiNum = parseInt(provinsiCode);
  if (provinsiNum < 1 || provinsiNum > 94) {
    return failure('Kode provinsi tidak valid dalam NIK', ['Invalid provinsi code']);
  }
  
  // Parse birth date (DDMMYY format)
  const day = parseInt(birthDateStr.substring(0, 2));
  const month = parseInt(birthDateStr.substring(2, 4));
  const year = parseInt(birthDateStr.substring(4, 6));
  
  // For women, day is added by 40
  const actualDay = day > 40 ? day - 40 : day;
  const gender: 'M' | 'F' = day > 40 ? 'F' : 'M';
  
  // Validate date components
  if (actualDay < 1 || actualDay > 31) {
    return failure('Tanggal lahir tidak valid dalam NIK', ['Invalid day in birth date']);
  }
  
  if (month < 1 || month > 12) {
    return failure('Bulan lahir tidak valid dalam NIK', ['Invalid month in birth date']);
  }
  
  // Determine full year (assuming people are born between 1920-2020)
  const currentYear = new Date().getFullYear();
  const fullYear = year + (year > 50 ? 1900 : 2000);
  
  if (fullYear > currentYear || fullYear < 1920) {
    return failure('Tahun lahir tidak valid dalam NIK', ['Invalid birth year']);
  }
  
  return success({
    gender,
    birthDate: {
      day: actualDay,
      month,
      year: fullYear,
    },
    administrativeArea: {
      provinsiCode,
      kabupatenCode,
      kecamatanCode,
    },
  });
}

/**
 * Performs comprehensive verification of Indonesian KTP (ID card) using OCR and validation
 * 
 * This is the main entry point for KTP verification. It orchestrates OCR extraction,
 * data parsing, validation, and cross-verification with user-provided data.
 * 
 * @param imageBuffer - Buffer containing the KTP image to verify
 * @param userProvidedData - Optional user-provided data for cross-validation
 * @returns Promise resolving to comprehensive verification result
 * 
 * @example
 * ```typescript
 * const imageBuffer = await fs.readFile('ktp.jpg');
 * const result = await verifyKtp(imageBuffer, { name: "Budi Santoso" });
 * 
 * if (result.success) {
 *   console.log(`Verified: ${result.data.extractedData.name}`);
 *   console.log(`Confidence: ${result.data.confidence}`);
 * } else {
 *   console.error(`Verification failed: ${result.error}`);
 * }
 * ```
 */
export async function verifyKtp(
  imageBuffer: Buffer,
  userProvidedData?: { name?: string; nik?: string }
): Promise<Result<KtpVerificationData>> {
  try {
    // Input validation
    if (!imageBuffer || imageBuffer.length === 0) {
      return failure('Gambar KTP diperlukan', ['Image buffer is empty']);
    }

    if (imageBuffer.length > LIMITS.FILE_PROCESSING.MAX_IMAGE_DIMENSIONS * 1024) {
      return failure('Ukuran gambar terlalu besar', ['Image size exceeds limit']);
    }

    // Step 1: Extract text using OCR
    const ocrResult = await extractKtpText(imageBuffer);
    if (!ocrResult.success) {
      return failure(ocrResult.error, ocrResult.issues);
    }

    // Step 2: Parse extracted data
    const parseResult = parseKtpData(ocrResult.data.extractedText);
    if (!parseResult.success) {
      return failure(parseResult.error, parseResult.issues);
    }

    // Step 3: Validate NIK
    const nikValidation = validateNik(parseResult.data.nik);
    if (!nikValidation.success) {
      return failure(`NIK tidak valid: ${nikValidation.error}`, nikValidation.issues);
    }

    // Step 4: Cross-validate with user provided data
    if (userProvidedData) {
      const crossValidation = validateUserData(parseResult.data, userProvidedData);
      if (!crossValidation.success) {
        return failure(crossValidation.error, crossValidation.issues);
      }
    }

    // Step 5: Calculate confidence score
    const confidence = calculateVerificationConfidence(
      ocrResult.data.confidence,
      parseResult.data.completeness,
      nikValidation.success ? 1.0 : 0.0
    );

    if (confidence < LIMITS.VERIFICATION.MIN_KTP_CONFIDENCE) {
      return failure(
        'Kualitas dokumen tidak memenuhi standar minimum', 
        [`Confidence: ${confidence}, required: ${LIMITS.VERIFICATION.MIN_KTP_CONFIDENCE}`]
      );
    }

    return success({
      confidence,
      extractedData: parseResult.data,
      validationDetails: {
        nikValid: true,
        photoQuality: ocrResult.data.confidence,
        documentAuthenticity: confidence,
      },
    });

  } catch (error) {
    return failure(
      'Terjadi kesalahan saat memverifikasi KTP', 
      [error instanceof Error ? error.message : 'Unknown error']
    );
  }
}

// Helper functions for KTP verification

/**
 * Extracts text from KTP image using OCR
 */
async function extractKtpText(imageBuffer: Buffer): Promise<Result<{ extractedText: string; confidence: number }>> {
  // TODO: Implement actual OCR integration
  // This is a mock implementation for now
  return success({
    extractedText: "Mock OCR result - implement with actual OCR service",
    confidence: 0.9
  });
}

/**
 * Parses extracted OCR text into structured KTP data
 */
function parseKtpData(ocrText: string): Result<KtpData & { completeness: number }> {
  // TODO: Implement actual KTP data parsing
  // This is a mock implementation for now
  const mockData: KtpData = {
    nik: "3171234567890123",
    name: "Mock Name",
    placeOfBirth: "Jakarta",
    dateOfBirth: new Date("1990-01-01"),
    gender: "M",
    address: "Mock Address",
    rt: "001",
    rw: "002", 
    kelurahan: "Mock Kelurahan",
    kecamatan: "Mock Kecamatan",
    kabupaten: "Mock Kabupaten",
    provinsi: "Mock Provinsi",
    religion: "Mock Religion",
    maritalStatus: "Single",
    occupation: "Mock Occupation",
    nationality: "Indonesia"
  };

  return success({
    ...mockData,
    completeness: 0.8
  });
}

/**
 * Validates user-provided data against extracted KTP data
 */
function validateUserData(
  ktpData: KtpData, 
  userData: { name?: string; nik?: string }
): Result<void> {
  const issues: string[] = [];

  if (userData.name && userData.name.toLowerCase() !== ktpData.name.toLowerCase()) {
    issues.push('Name mismatch between user input and KTP');
  }

  if (userData.nik && userData.nik !== ktpData.nik) {
    issues.push('NIK mismatch between user input and KTP');
  }

  if (issues.length > 0) {
    return failure('Data pengguna tidak cocok dengan KTP', issues);
  }

  return success(undefined);
}

/**
 * Calculates overall verification confidence score
 */
function calculateVerificationConfidence(
  ocrConfidence: number,
  completeness: number,
  nikValidityScore: number
): number {
  // Weighted average of different factors
  const weights = {
    ocr: 0.4,
    completeness: 0.3,
    nikValidity: 0.3
  };

  return (
    ocrConfidence * weights.ocr +
    completeness * weights.completeness +
    nikValidityScore * weights.nikValidity
  );
}

// Export types for external use
export type { KtpData, KtpVerificationData, NikValidationData };