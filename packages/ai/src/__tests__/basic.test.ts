/**
 * Basic AI Package Tests
 * 
 * Simple tests to verify core functionality is working
 */

import { detectLanguage, normalizeIndonesianText } from '../language';
import { createMockSubmission, createMockContext } from '../test-setup';

describe('Basic AI Functionality', () => {
  describe('Language Processing', () => {
    it('should detect Indonesian language', () => {
      const result = detectLanguage('Saya ingin melaporkan masalah');
      expect(result.language).toBe('id');
      expect(result.isIndonesian).toBe(true);
    });

    it('should normalize text', () => {
      const result = normalizeIndonesianText('  Jl.   Sudirman  RT.05  ');
      expect(result).toContain('jalan');
      expect(result).toContain('RT 05');
    });
  });

  describe('Test Utilities', () => {
    it('should create mock submission', () => {
      const submission = createMockSubmission();
      expect(submission.id).toBeDefined();
      expect(submission.description).toBeDefined();
      expect(submission.location).toBeDefined();
    });

    it('should create mock context', () => {
      const context = createMockContext();
      expect(context.userId).toBe('test-user-123');
      expect(context.language).toBe('id');
    });
  });

  describe('Configuration', () => {
    it('should have proper environment setup', () => {
      expect(process.env.NODE_ENV).toBe('test');
    });
  });
});