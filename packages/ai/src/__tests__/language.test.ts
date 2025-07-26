/**
 * Indonesian Language Processing Tests
 * 
 * Tests for language detection, text normalization, entity extraction,
 * and quality analysis for Indonesian and regional languages.
 */

import {
  detectLanguage,
  normalizeIndonesianText,
  extractEntities,
  processIndonesianText,
  calculateTextSimilarity,
  hasAdministrativeReference,
  analyzeTextQuality
} from '../language';
import { INDONESIAN_TEST_DATA, createIndonesianTextSample } from '../test-setup';

describe('Indonesian Language Processing', () => {
  describe('detectLanguage', () => {
    it('should detect Indonesian language', () => {
      const text = 'Saya ingin melaporkan masalah jalan yang rusak di Jakarta';
      const result = detectLanguage(text);
      
      expect(result.language).toBe('id');
      expect(result.isIndonesian).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect Javanese language', () => {
      const text = 'Kulo badhe nglaporaken wonten masalah dalan sing rusak';
      const result = detectLanguage(text);
      
      expect(result.language).toBe('jv');
      expect(result.isIndonesian).toBe(true);
      expect(result.dialect).toBe('javanese');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should detect Sundanese language', () => {
      const text = 'Abdi hoyong ngalaporkeun masalah jalan nu rusak jeung eta';
      const result = detectLanguage(text);
      
      expect(result.language).toBe('su');
      expect(result.isIndonesian).toBe(true);
      expect(result.dialect).toBe('sundanese');
    });

    it('should default to Indonesian for ambiguous text', () => {
      const text = 'Hello world test 123';
      const result = detectLanguage(text);
      
      expect(result.language).toBe('id');
      expect(result.confidence).toBeLessThan(0.8);
    });

    it('should handle empty text', () => {
      const result = detectLanguage('');
      
      expect(result.language).toBe('id');
      expect(result.isIndonesian).toBe(true);
    });
  });

  describe('normalizeIndonesianText', () => {
    it('should normalize whitespace', () => {
      const text = '  Jalan   rusak    di  Jakarta   ';
      const result = normalizeIndonesianText(text);
      
      expect(result).toBe('Jalan rusak di Jakarta');
    });

    it('should normalize common abbreviations', () => {
      const text = 'Jl. Sudirman RT.05 RW.02';
      const result = normalizeIndonesianText(text);
      
      expect(result).toContain('jalan Sudirman');
      expect(result).toContain('RT 05');
      expect(result).toContain('RW 02');
    });

    it('should handle location prepositions', () => {
      const text = 'di depan rumah';
      const result = normalizeIndonesianText(text);
      
      expect(result).toContain('di ');
    });

    it('should remove special characters', () => {
      const text = 'Jalan rusak!!! Sangat berbahaya...';
      const result = normalizeIndonesianText(text);
      
      expect(result).not.toMatch(/[!.]/);
      expect(result).toBe('Jalan rusak Sangat berbahaya');
    });
  });

  describe('extractEntities', () => {
    it('should extract location entities', () => {
      const text = 'Jalan Sudirman RT 05 RW 02 dekat halte bus';
      const result = extractEntities(text);
      
      expect(result.locations.length).toBeGreaterThan(0);
      expect(result.locations.some(loc => loc.includes('Sudirman'))).toBe(true);
      expect(result.locations.some(loc => loc.includes('RT'))).toBe(true);
    });

    it('should extract time references', () => {
      const text = 'Kemarin pagi saya melihat masalah ini jam 8';
      const result = extractEntities(text);
      
      expect(result.timeReferences.length).toBeGreaterThan(0);
      expect(result.timeReferences).toContain('Kemarin');
      expect(result.timeReferences).toContain('pagi');
    });

    it('should extract category keywords', () => {
      const infraText = 'Jalan rusak dan jembatan berbahaya';
      const envText = 'Sampah menumpuk dan polusi udara';
      const safetyText = 'Area tidak aman, banyak pencurian';
      
      const infraResult = extractEntities(infraText);
      const envResult = extractEntities(envText);
      const safetyResult = extractEntities(safetyText);
      
      expect(infraResult.categories).toContain('infrastructure');
      expect(envResult.categories).toContain('environment');
      expect(safetyResult.categories).toContain('safety');
    });

    it('should handle multiple entity types', () => {
      const text = 'Kemarin di Jalan Sudirman RT 05 ada jalan rusak';
      const result = extractEntities(text);
      
      expect(result.locations.length).toBeGreaterThan(0);
      expect(result.timeReferences.length).toBeGreaterThan(0);
      expect(result.categories.length).toBeGreaterThan(0);
    });

    it('should deduplicate entities', () => {
      const text = 'Jalan rusak jalan rusak di jalan utama';
      const result = extractEntities(text);
      
      // Should not have duplicate entries
      const uniqueCategories = new Set(result.categories);
      expect(result.categories.length).toBe(uniqueCategories.size);
    });
  });

  describe('processIndonesianText', () => {
    it('should process complete Indonesian text', async () => {
      const text = 'Kemarin pagi di Jalan Sudirman Jakarta ada jalan rusak parah';
      const result = await processIndonesianText(text);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.original).toBe(text);
        expect(result.data.normalized).toBeDefined();
        expect(result.data.language).toBe('id');
        expect(result.data.tokens.length).toBeGreaterThan(0);
        expect(result.data.entities.locations.length).toBeGreaterThan(0);
        expect(result.data.entities.timeReferences.length).toBeGreaterThan(0);
        expect(result.data.entities.categories.length).toBeGreaterThan(0);
      }
    });

    it('should tokenize text properly', async () => {
      const text = 'Jalan rusak di Jakarta';
      const result = await processIndonesianText(text);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tokens).toContain('jalan');
        expect(result.data.tokens).toContain('rusak');
        expect(result.data.tokens).toContain('jakarta');
        expect(result.data.tokens).not.toContain('di'); // Stopword filtered
      }
    });

    it('should handle different text samples', async () => {
      const formal = createIndonesianTextSample('formal');
      const informal = createIndonesianTextSample('informal');
      const mixed = createIndonesianTextSample('mixed');
      
      const results = await Promise.all([
        processIndonesianText(formal),
        processIndonesianText(informal),
        processIndonesianText(mixed)
      ]);
      
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        if (result.success) {
          // Language detection might vary for different styles, just ensure it's Indonesian family
          expect(result.data.language).toMatch(/^(id|jv|su)$/);
          expect(result.data.tokens.length).toBeGreaterThan(0);
        }
      });
    });

    it('should handle processing errors gracefully', async () => {
      // Test with potentially problematic input
      const result = await processIndonesianText('');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.original).toBe('');
        expect(result.data.tokens).toEqual([]);
      }
    });
  });

  describe('calculateTextSimilarity', () => {
    it('should calculate similarity between identical texts', () => {
      const text1 = 'Jalan rusak di Jakarta';
      const text2 = 'Jalan rusak di Jakarta';
      const similarity = calculateTextSimilarity(text1, text2);
      
      expect(similarity).toBe(1);
    });

    it('should calculate similarity between similar texts', () => {
      const text1 = 'Jalan rusak parah di Jakarta Pusat';
      const text2 = 'Jalan rusak di Jakarta';
      const similarity = calculateTextSimilarity(text1, text2);
      
      expect(similarity).toBeGreaterThan(0.5);
      expect(similarity).toBeLessThan(1);
    });

    it('should calculate low similarity for different texts', () => {
      const text1 = 'Jalan rusak di Jakarta';
      const text2 = 'Sampah menumpuk di Bandung';
      const similarity = calculateTextSimilarity(text1, text2);
      
      expect(similarity).toBeLessThan(0.5);
    });

    it('should handle empty texts', () => {
      const similarity1 = calculateTextSimilarity('', '');
      const similarity2 = calculateTextSimilarity('test', '');
      
      // Empty texts should return 0 after proper normalization
      expect(similarity1).toBe(0); // Both empty
      expect(similarity2).toBe(0); // One empty
    });

    it('should normalize before comparison', () => {
      const text1 = 'Jl. Sudirman RT.05';
      const text2 = 'jalan Sudirman RT 05';
      const similarity = calculateTextSimilarity(text1, text2);
      
      expect(similarity).toBeGreaterThan(0.8);
    });
  });

  describe('hasAdministrativeReference', () => {
    it('should detect RT/RW references', () => {
      expect(hasAdministrativeReference('RT 05 RW 02')).toBe(true);
      expect(hasAdministrativeReference('RT.05')).toBe(true);
      expect(hasAdministrativeReference('RW 10')).toBe(true);
    });

    it('should detect administrative levels', () => {
      expect(hasAdministrativeReference('Kelurahan Menteng')).toBe(true);
      expect(hasAdministrativeReference('Kecamatan Tanah Abang')).toBe(true);
      expect(hasAdministrativeReference('Kabupaten Bogor')).toBe(true);
      expect(hasAdministrativeReference('Provinsi DKI Jakarta')).toBe(true);
    });

    it('should return false for non-administrative text', () => {
      expect(hasAdministrativeReference('Jalan rusak parah')).toBe(false);
      expect(hasAdministrativeReference('Sampah menumpuk')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(hasAdministrativeReference('rt 05')).toBe(true);
      expect(hasAdministrativeReference('KELURAHAN MENTENG')).toBe(true);
    });
  });

  describe('analyzeTextQuality', () => {
    it('should score high-quality text highly', () => {
      const text = 'Kemarin pagi di Jalan Sudirman RT 05 RW 02 Jakarta Pusat, saya melihat jalan rusak parah dengan lubang besar yang sangat berbahaya untuk kendaraan. Masalah ini sudah berlangsung satu minggu dan mengganggu lalu lintas.';
      const analysis = analyzeTextQuality(text);
      
      expect(analysis.score).toBeGreaterThan(80);
      expect(analysis.hasLocation).toBe(true);
      expect(analysis.hasTime).toBe(true);
      expect(analysis.hasDetail).toBe(true);
      expect(analysis.length).toBeGreaterThan(50);
    });

    it('should score short text lower', () => {
      const text = 'Ada masalah';
      const analysis = analyzeTextQuality(text);
      
      expect(analysis.score).toBeLessThan(50);
      expect(analysis.hasLocation).toBe(false);
      expect(analysis.hasTime).toBe(false);
      expect(analysis.hasDetail).toBe(false);
      expect(analysis.length).toBeLessThan(20);
    });

    it('should recognize location indicators', () => {
      const textWithLocation = 'Jalan rusak di RT 05';
      const textWithoutLocation = 'Ada masalah rusak';
      
      const withLoc = analyzeTextQuality(textWithLocation);
      const withoutLoc = analyzeTextQuality(textWithoutLocation);
      
      expect(withLoc.hasLocation).toBe(true);
      expect(withLoc.score).toBeGreaterThan(withoutLoc.score);
      expect(withoutLoc.hasLocation).toBe(false);
    });

    it('should recognize time references', () => {
      const textWithTime = 'Kemarin ada jalan rusak';
      const textWithoutTime = 'Ada jalan rusak';
      
      const withTime = analyzeTextQuality(textWithTime);
      const withoutTime = analyzeTextQuality(textWithoutTime);
      
      expect(withTime.hasTime).toBe(true);
      expect(withTime.score).toBeGreaterThan(withoutTime.score);
      expect(withoutTime.hasTime).toBe(false);
    });

    it('should recognize detailed descriptions', () => {
      const detailed = 'Jalan rusak parah dengan lubang besar yang sangat berbahaya untuk kendaraan bermotor';
      const simple = 'Jalan ada masalah';
      
      const detailedAnalysis = analyzeTextQuality(detailed);
      const simpleAnalysis = analyzeTextQuality(simple);
      
      expect(detailedAnalysis.hasDetail).toBe(true);
      expect(detailedAnalysis.score).toBeGreaterThan(simpleAnalysis.score);
      expect(simpleAnalysis.hasDetail).toBe(false);
    });

    it('should handle empty text', () => {
      const analysis = analyzeTextQuality('');
      
      expect(analysis.score).toBe(0);
      expect(analysis.hasLocation).toBe(false);
      expect(analysis.hasTime).toBe(false);
      expect(analysis.hasDetail).toBe(false);
      expect(analysis.length).toBe(0);
    });
  });

  describe('Real Indonesian Text Samples', () => {
    it('should process formal Indonesian correctly', () => {
      const formalText = 'Dengan hormat, saya ingin melaporkan adanya kerusakan infrastruktur jalan di wilayah RT 05 RW 02 Kelurahan Menteng, Kecamatan Menteng, Jakarta Pusat. Kerusakan tersebut berupa lubang-lubang besar yang telah mengganggu aktivitas lalu lintas sejak seminggu yang lalu.';
      
      const entities = extractEntities(formalText);
      const quality = analyzeTextQuality(formalText);
      
      expect(entities.categories).toContain('infrastructure');
      expect(entities.locations.length).toBeGreaterThan(0);
      expect(entities.timeReferences.length).toBeGreaterThan(0);
      expect(quality.score).toBeGreaterThanOrEqual(90);
    });

    it('should process informal Indonesian correctly', () => {
      const informalText = 'Mau lapor nih, jalan depan rumah rusak banget udah seminggu. Ada lubang gede berbahaya buat motor. Lokasinya di Jl Sudirman dekat minimarket.';
      
      const entities = extractEntities(informalText);
      const quality = analyzeTextQuality(informalText);
      
      expect(entities.categories).toContain('infrastructure');
      expect(entities.locations.length).toBeGreaterThan(0);
      expect(entities.timeReferences.length).toBeGreaterThan(0);
      expect(quality.hasDetail).toBe(true);
    });

    it('should handle mixed formal/informal style', () => {
      const mixedText = 'Selamat pagi, mau nglaporin ada sampah numpuk di Jalan Raya RT 03. Udah bau banget nih dari kemarin, ganggu banget aktivitas warga.';
      
      const result = detectLanguage(mixedText);
      const entities = extractEntities(mixedText);
      const quality = analyzeTextQuality(mixedText);
      
      // Language detection might vary but should be Indonesian regional
      expect(result.isIndonesian).toBe(true);
      expect(entities.categories).toContain('environment');
      expect(quality.hasTime).toBe(true);
      expect(quality.hasLocation).toBe(true);
    });
  });
});