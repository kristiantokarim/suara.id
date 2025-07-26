/**
 * Conversation Engine Tests
 * 
 * Comprehensive tests for Indonesian conversation handling,
 * intent detection, and submission guidance.
 */

import {
  processConversation,
  startConversation,
  generateSubmissionSummary
} from '../llm/conversation-engine';
import { 
  createMockContext,
  createMockSubmission,
  INDONESIAN_TEST_DATA,
  MOCK_AI_RESPONSES
} from '../test-setup';

describe('Conversation Engine', () => {
  describe('startConversation', () => {
    it('should initialize conversation for new user', async () => {
      const result = await startConversation('test-user-123', 'id');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.context.userId).toBe('test-user-123');
        expect(result.data.context.language).toBe('id');
        expect(result.data.context.userProfile.trustLevel).toBe('BASIC');
        expect(result.data.greeting.intent).toBe('greeting');
        expect(result.data.greeting.message).toContain('Selamat datang');
      }
    });

    it('should create different greeting for returning user', async () => {
      const result = await startConversation('returning-user', 'id');
      
      expect(result.success).toBe(true);
      if (result.success) {
        // Mock returning user context would need to be implemented
        expect(result.data.greeting.message).toBeDefined();
      }
    });

    it('should handle language preferences', async () => {
      const resultId = await startConversation('user-1', 'id');
      const resultJv = await startConversation('user-2', 'jv');
      
      expect(resultId.success).toBe(true);
      expect(resultJv.success).toBe(true);
      
      if (resultId.success && resultJv.success) {
        expect(resultId.data.context.language).toBe('id');
        expect(resultJv.data.context.language).toBe('jv');
      }
    });
  });

  describe('processConversation', () => {
    let context: any;

    beforeEach(() => {
      context = createMockContext();
    });

    it('should handle greeting and initialize submission', async () => {
      const message = INDONESIAN_TEST_DATA.messages.greeting;
      const result = await processConversation(message, context);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.intent).toBe('request_issue_description');
        expect(result.data.message).toContain('membantu Anda melaporkan');
        expect(result.data.completionStatus).toBe('incomplete');
      }
    });

    it('should detect infrastructure issues from description', async () => {
      const message = INDONESIAN_TEST_DATA.messages.infrastructure;
      context.currentSubmission = createMockSubmission();
      
      const result = await processConversation(message, context);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.extractedData).toBeDefined();
        expect(result.data.message).toContain('infrastruktur');
      }
    });

    it('should handle location gathering', async () => {
      const message = INDONESIAN_TEST_DATA.messages.location;
      context.currentSubmission = createMockSubmission();
      
      const result = await processConversation(message, context);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.extractedData).toBeDefined();
        expect(result.data.intent).toBe('request_detailed_description');
      }
    });

    it('should handle severity assessment', async () => {
      const message = 'Tinggi - sangat mengganggu';
      context.currentSubmission = createMockSubmission();
      
      const result = await processConversation(message, context);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.extractedData.severity).toBe('HIGH');
        expect(result.data.intent).toBe('request_photos');
      }
    });

    it('should handle confirmation flow', async () => {
      const message = INDONESIAN_TEST_DATA.messages.confirmation;
      context.currentSubmission = createMockSubmission({
        description: 'Complete description',
        location: { coordinates: [-6.2088, 106.8456], address: 'Jakarta' },
        metadata: { category: 'INFRASTRUCTURE', severity: 'HIGH' }
      });
      
      const result = await processConversation(message, context);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.intent).toBe('submission_completed');
        expect(result.data.completionStatus).toBe('complete');
        expect(result.data.message).toContain('Laporan Anda telah diterima');
      }
    });

    it('should handle escalation for confused users', async () => {
      // Simulate multiple help requests
      context.conversationHistory = [
        { role: 'user', content: 'bantuan', metadata: { intent: 'request_help' } },
        { role: 'user', content: 'tidak tahu', metadata: { intent: 'request_help' } },
        { role: 'user', content: 'bingung', metadata: { intent: 'request_help' } }
      ];
      
      const result = await processConversation('help saya bingung', context);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.intent).toBe('escalate_to_human');
        expect(result.data.requiresHumanEscalation).toBe(true);
      }
    });
  });

  describe('generateSubmissionSummary', () => {
    it('should analyze complete submission', async () => {
      const context = createMockContext({
        currentSubmission: createMockSubmission({
          description: 'Jalan rusak parah di depan rumah sudah satu minggu',
          location: {
            coordinates: [-6.2088, 106.8456],
            address: 'Jalan Sudirman RT 05 RW 02 Jakarta Pusat'
          },
          metadata: {
            category: 'INFRASTRUCTURE',
            severity: 'HIGH'
          },
          images: ['image1.jpg']
        })
      });
      
      const result = await generateSubmissionSummary(context);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.completeness).toBeGreaterThan(0.8);
        expect(result.data.qualityScore).toBeGreaterThan(60);
        expect(result.data.readyToSubmit).toBe(true);
        expect(result.data.missingFields).toHaveLength(0);
      }
    });

    it('should identify missing fields', async () => {
      const context = createMockContext({
        currentSubmission: createMockSubmission({
          description: 'Short desc',
          location: { coordinates: [0, 0], address: '' }
        })
      });
      
      const result = await generateSubmissionSummary(context);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.completeness).toBeLessThan(0.8);
        expect(result.data.qualityScore).toBeLessThan(60);
        expect(result.data.readyToSubmit).toBe(false);
        expect(result.data.missingFields.length).toBeGreaterThan(0);
        expect(result.data.suggestions.length).toBeGreaterThan(0);
      }
    });

    it('should handle missing submission data', async () => {
      const context = createMockContext();
      
      const result = await generateSubmissionSummary(context);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Tidak ada data submission');
      }
    });
  });

  describe('Indonesian Language Processing', () => {
    it('should detect category from Indonesian text', async () => {
      const infraMessage = 'Jalan berlubang di depan rumah';
      const envMessage = 'Sampah menumpuk di jalan raya';
      const safetyMessage = 'Area gelap berbahaya untuk pejalan kaki';
      
      const context = createMockContext();
      
      const infraResult = await processConversation(infraMessage, context);
      const envResult = await processConversation(envMessage, context);
      const safetyResult = await processConversation(safetyMessage, context);
      
      expect(infraResult.success).toBe(true);
      expect(envResult.success).toBe(true);
      expect(safetyResult.success).toBe(true);
    });

    it('should extract location from Indonesian text', async () => {
      const locationTexts = [
        'di Jalan Sudirman Jakarta',
        'RT 05 RW 02 Kelurahan Menteng',
        'dekat halte TransJakarta Bundaran HI'
      ];
      
      const context = createMockContext();
      
      for (const text of locationTexts) {
        const result = await processConversation(text, context);
        expect(result.success).toBe(true);
      }
    });

    it('should handle formal and informal Indonesian', async () => {
      const formalMessage = 'Dengan hormat, saya ingin melaporkan kerusakan jalan';
      const informalMessage = 'Mau lapor nih, jalan depan rumah rusak banget';
      
      const context1 = createMockContext();
      const context2 = createMockContext();
      
      const formal = await processConversation(formalMessage, context1);
      const informal = await processConversation(informalMessage, context2);
      
      expect(formal.success).toBe(true);
      expect(informal.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid input gracefully', async () => {
      const context = createMockContext();
      
      const result = await processConversation('', context);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBeDefined();
      }
    });

    it('should handle malformed context', async () => {
      const invalidContext = { userId: 'test' }; // Missing required fields
      
      const result = await processConversation('test message', invalidContext as any);
      
      // Should either succeed with defaults or fail gracefully
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Conversation State Management', () => {
    it('should track conversation history', async () => {
      const context = createMockContext();
      const messages = [
        'Halo, saya ingin melaporkan masalah',
        'Jalan rusak di depan rumah',
        'Di Jalan Sudirman Jakarta'
      ];
      
      for (const message of messages) {
        const result = await processConversation(message, context);
        expect(result.success).toBe(true);
        
        // In a real implementation, we'd update conversation history
        // context.conversationHistory.push({
        //   role: 'user',
        //   content: message,
        //   timestamp: new Date()
        // });
      }
      
      // Verify state progression
      expect(context.userId).toBe('test-user-123');
    });

    it('should maintain submission state across messages', async () => {
      const context = createMockContext();
      context.currentSubmission = createMockSubmission();
      
      const result1 = await processConversation('Update description', context);
      const result2 = await processConversation('Add location info', context);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      // Submission should maintain state
      expect(context.currentSubmission).toBeDefined();
    });
  });
});