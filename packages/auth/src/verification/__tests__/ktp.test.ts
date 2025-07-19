import { validateNik, parseKtpText, validateKtpData, verifyKtp, extractKtpText } from '../ktp';
import { KtpData } from '../ktp';

/**
 * Unit tests for Indonesian KTP (ID card) verification functions
 * 
 * These tests cover:
 * - NIK format validation with Indonesian demographic encoding
 * - OCR text extraction (mocked for testing)
 * - KTP data parsing and validation
 * - Complete verification workflow
 */

describe('KTP Verification System', () => {
  describe('validateNik', () => {
    describe('Valid NIK formats', () => {
      it('should validate correct male NIK format', () => {
        // NIK: 3171154567890123
        // 31 = DKI Jakarta, 71 = Jakarta Selatan, 15 = day (male), 45 = April 1967
        const result = validateNik('3171154567890123');
        
        expect(result.valid).toBe(true);
        expect(result.details.gender).toBe('M');
        expect(result.details.birthDate.day).toBe(15);
        expect(result.details.birthDate.month).toBe(4);
        expect(result.details.birthDate.year).toBe(1967);
        expect(result.details.provinsi).toBe(31);
      });

      it('should validate correct female NIK format with day offset', () => {
        // NIK: 3171554567890123  
        // Day 55 = 15 + 40 (female offset)
        const result = validateNik('3171554567890123');
        
        expect(result.valid).toBe(true);
        expect(result.details.gender).toBe('F');
        expect(result.details.birthDate.day).toBe(15);
        expect(result.details.birthDate.month).toBe(4);
        expect(result.details.birthDate.year).toBe(1967);
      });

      it('should handle various year formats correctly', () => {
        // Test year 1990 (YY = 90)
        const result1990 = validateNik('3171159012345678');
        expect(result1990.valid).toBe(true);
        expect(result1990.details.birthDate.year).toBe(1990);

        // Test year 2000 (YY = 00)  
        const result2000 = validateNik('3171150012345678');
        expect(result2000.valid).toBe(true);
        expect(result2000.details.birthDate.year).toBe(2000);

        // Test year 2010 (YY = 10)
        const result2010 = validateNik('3171151012345678');
        expect(result2010.valid).toBe(true);
        expect(result2010.details.birthDate.year).toBe(2010);
      });

      it('should handle NIK with spaces and dashes', () => {
        const result = validateNik('31 71 15 45 67 890123');
        expect(result.valid).toBe(true);
        
        const resultDashes = validateNik('3171-1545-6789-0123');
        expect(resultDashes.valid).toBe(true);
      });
    });

    describe('Invalid NIK formats', () => {
      it('should reject NIK with incorrect length', () => {
        const resultShort = validateNik('123456789');
        expect(resultShort.valid).toBe(false);
        expect(resultShort.details.error).toContain('16 digits');

        const resultLong = validateNik('31711545678901234');
        expect(resultLong.valid).toBe(false);
        expect(resultLong.details.error).toContain('16 digits');
      });

      it('should reject NIK with non-numeric characters', () => {
        const result = validateNik('317115A567890123');
        expect(result.valid).toBe(false);
        expect(result.details.error).toContain('only digits');
      });

      it('should reject NIK with invalid provinsi code', () => {
        const result = validateNik('9971154567890123'); // Provinsi 99 doesn't exist
        expect(result.valid).toBe(false);
        expect(result.details.error).toContain('Invalid provinsi code');
      });

      it('should reject NIK with invalid date components', () => {
        // Invalid day (32)
        const resultDay = validateNik('3171324567890123');
        expect(resultDay.valid).toBe(false);
        expect(resultDay.details.error).toContain('Invalid day');

        // Invalid month (13)  
        const resultMonth = validateNik('3171151367890123');
        expect(resultMonth.valid).toBe(false);
        expect(resultMonth.details.error).toContain('Invalid month');
      });

      it('should reject NIK with unrealistic birth year', () => {
        const result = validateNik('3171152567890123'); // Year 2025 (future)
        expect(result.valid).toBe(false);
        expect(result.details.error).toContain('Invalid birth year');
      });
    });

    describe('Edge cases', () => {
      it('should handle boundary dates correctly', () => {
        // Test January 1st
        const jan1 = validateNik('3171010190123456');
        expect(jan1.valid).toBe(true);
        expect(jan1.details.birthDate.day).toBe(1);
        expect(jan1.details.birthDate.month).toBe(1);

        // Test December 31st
        const dec31 = validateNik('3171313190123456');
        expect(dec31.valid).toBe(true);
        expect(dec31.details.birthDate.day).toBe(31);
        expect(dec31.details.birthDate.month).toBe(12);
      });

      it('should handle female edge cases with day offset', () => {
        // Female born on January 31st (31 + 40 = 71)
        const result = validateNik('3171710190123456');
        expect(result.valid).toBe(true);
        expect(result.details.gender).toBe('F');
        expect(result.details.birthDate.day).toBe(31);
        expect(result.details.birthDate.month).toBe(1);
      });
    });
  });

  describe('parseKtpText', () => {
    it('should parse complete KTP text successfully', () => {
      const mockKtpText = `
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
      `;

      const result = parseKtpText(mockKtpText);
      
      expect(result).not.toBeNull();
      expect(result!.nik).toBe('3171154567890123');
      expect(result!.name).toBe('BUDI SANTOSO');
      expect(result!.placeOfBirth).toBe('JAKARTA');
      expect(result!.dateOfBirth).toEqual(new Date(1967, 3, 15)); // Month is 0-indexed
      expect(result!.gender).toBe('M');
      expect(result!.address).toBe('JL. SUDIRMAN NO. 123');
      expect(result!.rt).toBe('001');
      expect(result!.rw).toBe('002');
      expect(result!.kelurahan).toBe('SENAYAN');
      expect(result!.kecamatan).toBe('KEBAYORAN BARU');
      expect(result!.religion).toBe('ISLAM');
      expect(result!.maritalStatus).toBe('BELUM KAWIN');
      expect(result!.occupation).toBe('KARYAWAN SWASTA');
      expect(result!.nationality).toBe('WNI');
    });

    it('should handle variations in KTP text format', () => {
      const mockKtpText = `
        NIK : 3171554567890123
        Nama : SITI AMINAH  
        Tempat / Tgl Lahir : BANDUNG , 15 - 04 - 1967
        Jenis Kelamin : PEREMPUAN
        Alamat : JL MERDEKA NO 456
      `;

      const result = parseKtpText(mockKtpText);
      
      expect(result).not.toBeNull();
      expect(result!.nik).toBe('3171554567890123');
      expect(result!.name).toBe('SITI AMINAH');
      expect(result!.placeOfBirth).toBe('BANDUNG');
      expect(result!.gender).toBe('F');
    });

    it('should return null for insufficient data', () => {
      const incompleteText = `
        REPUBLIK INDONESIA
        Nama: JOHN DOE
      `;

      const result = parseKtpText(incompleteText);
      expect(result).toBeNull();
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalText = `
        NIK: 3171154567890123
        Nama: BUDI SANTOSO
        Tempat/Tgl Lahir: JAKARTA, 15-04-1967
        Jenis Kelamin: LAKI-LAKI
        Alamat: JL. SUDIRMAN NO. 123
      `;

      const result = parseKtpText(minimalText);
      
      expect(result).not.toBeNull();
      expect(result!.nik).toBe('3171154567890123');
      expect(result!.name).toBe('BUDI SANTOSO');
      expect(result!.religion).toBeUndefined();
      expect(result!.occupation).toBeUndefined();
    });
  });

  describe('validateKtpData', () => {
    const validKtpData: KtpData = {
      nik: '3171154567890123',
      name: 'BUDI SANTOSO',
      placeOfBirth: 'JAKARTA', 
      dateOfBirth: new Date(1967, 3, 15),
      gender: 'M',
      address: 'JL. SUDIRMAN NO. 123',
      rt: '001',
      rw: '002',
      kelurahan: 'SENAYAN',
      kecamatan: 'KEBAYORAN BARU',
      kabupaten: 'JAKARTA SELATAN',
      provinsi: 'DKI JAKARTA',
      religion: 'ISLAM',
      maritalStatus: 'BELUM KAWIN',
      occupation: 'KARYAWAN SWASTA',
      nationality: 'WNI'
    };

    it('should validate complete, correct KTP data', () => {
      const result = validateKtpData(validKtpData);
      
      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThan(0.9);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect NIK-gender mismatch', () => {
      const invalidData = {
        ...validKtpData,
        gender: 'F' as const // NIK indicates male (day 15), but gender is female
      };

      const result = validateKtpData(invalidData);
      
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Gender does not match NIK');
    });

    it('should detect NIK-birthdate mismatch', () => {
      const invalidData = {
        ...validKtpData,
        dateOfBirth: new Date(1968, 3, 15) // Different year than NIK
      };

      const result = validateKtpData(invalidData);
      
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Birth date does not match NIK');
    });

    it('should penalize missing required fields', () => {
      const incompleteData = {
        ...validKtpData,
        name: '', // Missing name
        placeOfBirth: '' // Missing place of birth
      };

      const result = validateKtpData(incompleteData);
      
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Name is missing or too short');
      expect(result.issues).toContain('Place of birth is missing');
    });

    it('should validate age constraints', () => {
      const underageData = {
        ...validKtpData,
        dateOfBirth: new Date(2010, 3, 15) // 13 years old
      };

      const result = validateKtpData(underageData);
      
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Invalid age (must be 18-100 years old)');
    });

    it('should handle invalid name formats', () => {
      const invalidNameData = {
        ...validKtpData,
        name: 'budi123' // Contains numbers
      };

      const result = validateKtpData(invalidNameData);
      
      expect(result.issues).toContain('Name contains invalid characters');
    });
  });

  describe('extractKtpText (mocked)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should return mock OCR data in development mode', async () => {
      const mockImageBuffer = Buffer.from('mock image data');
      const result = await extractKtpText(mockImageBuffer);

      expect(result.success).toBe(true);
      expect(result.extractedText).toContain('NIK:');
      expect(result.extractedText).toContain('Nama:');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should simulate OCR processing delay', async () => {
      const startTime = Date.now();
      const mockImageBuffer = Buffer.from('mock image data');
      
      await extractKtpText(mockImageBuffer);
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeGreaterThan(1500); // Should take ~2 seconds
    });
  });

  describe('verifyKtp integration', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should perform complete verification workflow', async () => {
      const mockImageBuffer = Buffer.from('mock ktp image');
      const userProvidedData = {
        name: 'BUDI SANTOSO',
        nik: '3171234567890123'
      };

      const result = await verifyKtp(mockImageBuffer, userProvidedData);

      expect(result.success).toBe(true);
      expect(result.extractedData).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect cross-validation issues', async () => {
      const mockImageBuffer = Buffer.from('mock ktp image');
      const wrongUserData = {
        name: 'WRONG NAME', // Different from mock data
        nik: '9999999999999999' // Different from mock data
      };

      const result = await verifyKtp(mockImageBuffer, wrongUserData);

      expect(result.success).toBe(true);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Name does not match provided information');
      expect(result.issues).toContain('NIK does not match provided information');
    });

    it('should handle verification failure gracefully', async () => {
      // Mock a scenario where OCR fails
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production'; // This will cause OCR to throw error

      const mockImageBuffer = Buffer.from('invalid image');
      const result = await verifyKtp(mockImageBuffer);

      expect(result.success).toBe(false);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });
  });
});

/**
 * Test utilities for KTP testing
 */
export const ktpTestUtils = {
  /**
   * Generate a valid NIK for testing purposes
   */
  generateValidNik: (options: {
    provinsi?: number;
    kabupaten?: number;
    kecamatan?: number;
    day?: number;
    month?: number;
    year?: number;
    gender?: 'M' | 'F';
    sequential?: number;
  } = {}): string => {
    const {
      provinsi = 31,
      kabupaten = 71,
      kecamatan = 15,
      day = 15,
      month = 4,
      year = 1990,
      gender = 'M',
      sequential = 1234
    } = options;

    const actualDay = gender === 'F' ? day + 40 : day;
    const yearStr = year.toString().slice(-2).padStart(2, '0');
    const monthStr = month.toString().padStart(2, '0');
    const dayStr = actualDay.toString().padStart(2, '0');

    const nik = [
      provinsi.toString().padStart(2, '0'),
      kabupaten.toString().padStart(2, '0'),
      kecamatan.toString().padStart(2, '0'),
      dayStr,
      monthStr,
      yearStr,
      sequential.toString().padStart(4, '0')
    ].join('');

    // Add simple checksum (in real implementation, this would be more complex)
    const checksum = '123';
    
    return nik + checksum;
  },

  /**
   * Generate mock KTP text for testing
   */
  generateMockKtpText: (data: Partial<KtpData>): string => {
    const defaultData = {
      nik: '3171154567890123',
      name: 'BUDI SANTOSO',
      placeOfBirth: 'JAKARTA',
      dateOfBirth: new Date(1967, 3, 15),
      gender: 'M',
      address: 'JL. SUDIRMAN NO. 123',
      rt: '001',
      rw: '002',
      kelurahan: 'SENAYAN',
      kecamatan: 'KEBAYORAN BARU',
      religion: 'ISLAM',
      maritalStatus: 'BELUM KAWIN',
      occupation: 'KARYAWAN SWASTA',
      nationality: 'WNI'
    };

    const merged = { ...defaultData, ...data };
    const dateStr = `${merged.dateOfBirth.getDate()}-${merged.dateOfBirth.getMonth() + 1}-${merged.dateOfBirth.getFullYear()}`;
    const genderStr = merged.gender === 'M' ? 'LAKI-LAKI' : 'PEREMPUAN';

    return `
      REPUBLIK INDONESIA
      PROVINSI DKI JAKARTA
      KOTA JAKARTA SELATAN
      NIK: ${merged.nik}
      Nama: ${merged.name}
      Tempat/Tgl Lahir: ${merged.placeOfBirth}, ${dateStr}
      Jenis Kelamin: ${genderStr}
      Alamat: ${merged.address}
      RT/RW: ${merged.rt}/${merged.rw}
      Kel/Desa: ${merged.kelurahan}
      Kecamatan: ${merged.kecamatan}
      Agama: ${merged.religion}
      Status Perkawinan: ${merged.maritalStatus}
      Pekerjaan: ${merged.occupation}
      Kewarganegaraan: ${merged.nationality}
      Berlaku Hingga: SEUMUR HIDUP
    `;
  }
};