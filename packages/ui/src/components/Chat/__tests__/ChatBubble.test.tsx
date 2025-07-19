import React from 'react';
import { render, screen } from '../../../utils/test-utils';
import { ChatBubble } from '../ChatBubble';
import { mockChatMessages, formatIndonesianDate } from '../../../utils/test-utils';

describe('ChatBubble Component', () => {
  describe('Basic Rendering', () => {
    it('renders text message correctly', () => {
      const message = mockChatMessages[0]; // Bot message
      render(<ChatBubble message={message} />);
      
      expect(screen.getByText(message.content)).toBeInTheDocument();
    });

    it('renders with different message types', () => {
      const messages = [
        {
          id: '1',
          content: 'Text message',
          timestamp: new Date(),
          sender: 'user' as const,
          messageType: 'text' as const,
        },
        {
          id: '2',
          content: 'https://example.com/image.jpg',
          timestamp: new Date(),
          sender: 'user' as const,
          messageType: 'image' as const,
        },
        {
          id: '3',
          content: 'Jl. Sudirman No. 123, Jakarta',
          timestamp: new Date(),
          sender: 'user' as const,
          messageType: 'location' as const,
        },
        {
          id: '4',
          content: 'document.pdf',
          timestamp: new Date(),
          sender: 'user' as const,
          messageType: 'file' as const,
        },
      ];

      messages.forEach((message) => {
        const { unmount } = render(<ChatBubble message={message} />);
        
        if (message.messageType === 'text') {
          expect(screen.getByText(message.content)).toBeInTheDocument();
        } else if (message.messageType === 'image') {
          expect(screen.getByAltText('Gambar dari pengguna')).toBeInTheDocument();
        } else if (message.messageType === 'location') {
          expect(screen.getByText('📍 Lokasi:')).toBeInTheDocument();
          expect(screen.getByText(message.content)).toBeInTheDocument();
        } else if (message.messageType === 'file') {
          expect(screen.getByText('📎')).toBeInTheDocument();
          expect(screen.getByText(message.content)).toBeInTheDocument();
        }
        
        unmount();
      });
    });

    it('applies correct styling based on sender', () => {
      const userMessage = { ...mockChatMessages[1], sender: 'user' as const };
      const botMessage = { ...mockChatMessages[0], sender: 'bot' as const };
      const systemMessage = { ...mockChatMessages[0], sender: 'system' as const };

      const { rerender } = render(<ChatBubble message={userMessage} />);
      let bubble = screen.getByText(userMessage.content).closest('.chat-bubble');
      expect(bubble).toHaveClass('chat-bubble--user');

      rerender(<ChatBubble message={botMessage} />);
      bubble = screen.getByText(botMessage.content).closest('.chat-bubble');
      expect(bubble).toHaveClass('chat-bubble--bot');

      rerender(<ChatBubble message={systemMessage} />);
      bubble = screen.getByText(systemMessage.content).closest('.chat-bubble');
      expect(bubble).toHaveClass('chat-bubble--system');
    });
  });

  describe('Avatar and Layout', () => {
    it('shows avatar for bot messages', () => {
      const botMessage = { ...mockChatMessages[0], sender: 'bot' as const };
      render(<ChatBubble message={botMessage} />);
      
      // Default avatar should show 'S' for Suara
      expect(screen.getByText('S')).toBeInTheDocument();
    });

    it('does not show avatar for user messages', () => {
      const userMessage = { ...mockChatMessages[1], sender: 'user' as const };
      render(<ChatBubble message={userMessage} />);
      
      // Should not have default avatar
      expect(screen.queryByText('S')).not.toBeInTheDocument();
    });

    it('renders custom avatar when provided', () => {
      const botMessage = { ...mockChatMessages[0], sender: 'bot' as const };
      const customAvatar = <div data-testid="custom-avatar">🤖</div>;
      
      render(<ChatBubble message={botMessage} avatar={customAvatar} />);
      
      expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
      expect(screen.getByText('🤖')).toBeInTheDocument();
    });

    it('applies correct flex direction for different senders', () => {
      const userMessage = { ...mockChatMessages[1], sender: 'user' as const };
      const botMessage = { ...mockChatMessages[0], sender: 'bot' as const };

      const { container, rerender } = render(<ChatBubble message={userMessage} />);
      let messageContainer = container.querySelector('.flex');
      expect(messageContainer).toHaveClass('flex-row-reverse');

      rerender(<ChatBubble message={botMessage} />);
      messageContainer = container.querySelector('.flex');
      expect(messageContainer).not.toHaveClass('flex-row-reverse');
    });
  });

  describe('Timestamp Display', () => {
    it('shows timestamp when requested', () => {
      const message = mockChatMessages[0];
      render(<ChatBubble message={message} showTimestamp />);
      
      const formattedTime = formatIndonesianDate(message.timestamp);
      expect(screen.getByText(formattedTime)).toBeInTheDocument();
    });

    it('hides timestamp by default', () => {
      const message = mockChatMessages[0];
      render(<ChatBubble message={message} />);
      
      const formattedTime = formatIndonesianDate(message.timestamp);
      expect(screen.queryByText(formattedTime)).not.toBeInTheDocument();
    });

    it('formats Indonesian timestamp correctly', () => {
      const testDate = new Date('2024-01-15T14:30:00Z');
      const message = {
        id: '1',
        content: 'Test message',
        timestamp: testDate,
        sender: 'bot' as const,
      };
      
      render(<ChatBubble message={message} showTimestamp />);
      
      // Should format in Indonesian locale
      const expectedFormat = new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        day: 'numeric',
        month: 'short',
      }).format(testDate);
      
      expect(screen.getByText(expectedFormat)).toBeInTheDocument();
    });

    it('positions timestamp correctly for different senders', () => {
      const userMessage = { ...mockChatMessages[1], sender: 'user' as const };
      const botMessage = { ...mockChatMessages[0], sender: 'bot' as const };

      const { rerender } = render(<ChatBubble message={userMessage} showTimestamp />);
      let timestamp = screen.getByText(formatIndonesianDate(userMessage.timestamp));
      expect(timestamp).toHaveClass('text-right');

      rerender(<ChatBubble message={botMessage} showTimestamp />);
      timestamp = screen.getByText(formatIndonesianDate(botMessage.timestamp));
      expect(timestamp).toHaveClass('text-left');
    });
  });

  describe('Message Content Types', () => {
    it('handles multiline text messages', () => {
      const multilineMessage = {
        id: '1',
        content: 'Baris pertama\nBaris kedua\nBaris ketiga',
        timestamp: new Date(),
        sender: 'user' as const,
      };
      
      render(<ChatBubble message={multilineMessage} />);
      
      const messageElement = screen.getByText(/Baris pertama/);
      expect(messageElement).toHaveClass('whitespace-pre-wrap');
      expect(messageElement.textContent).toContain('Baris pertama\nBaris kedua\nBaris ketiga');
    });

    it('handles long text messages with word breaks', () => {
      const longMessage = {
        id: '1',
        content: 'Ini adalah pesan yang sangat panjang sekali yang seharusnya dibungkus dengan baik dalam bubble chat dan tidak merusak layout halaman web',
        timestamp: new Date(),
        sender: 'bot' as const,
      };
      
      render(<ChatBubble message={longMessage} />);
      
      const messageElement = screen.getByText(longMessage.content);
      expect(messageElement).toHaveClass('break-words');
    });

    it('renders image messages with proper alt text', () => {
      const imageMessage = {
        id: '1',
        content: 'https://example.com/jalan-rusak.jpg',
        timestamp: new Date(),
        sender: 'user' as const,
        messageType: 'image' as const,
      };
      
      render(<ChatBubble message={imageMessage} />);
      
      const image = screen.getByAltText('Gambar dari pengguna');
      expect(image).toHaveAttribute('src', imageMessage.content);
      expect(image).toHaveClass('rounded-lg', 'max-w-xs');
      expect(image).toHaveAttribute('loading', 'lazy');
    });

    it('renders location messages with Indonesian formatting', () => {
      const locationMessage = {
        id: '1',
        content: 'Jl. Sudirman No. 123, Jakarta Pusat',
        timestamp: new Date(),
        sender: 'user' as const,
        messageType: 'location' as const,
      };
      
      render(<ChatBubble message={locationMessage} />);
      
      expect(screen.getByText('📍 Lokasi:')).toBeInTheDocument();
      expect(screen.getByText(locationMessage.content)).toBeInTheDocument();
    });

    it('renders file messages with attachment icon', () => {
      const fileMessage = {
        id: '1',
        content: 'foto-jalan-rusak.jpg',
        timestamp: new Date(),
        sender: 'user' as const,
        messageType: 'file' as const,
      };
      
      render(<ChatBubble message={fileMessage} />);
      
      expect(screen.getByText('📎')).toBeInTheDocument();
      expect(screen.getByText(fileMessage.content)).toBeInTheDocument();
    });
  });

  describe('Indonesian Context', () => {
    it('handles Indonesian text content correctly', () => {
      const indonesianMessage = {
        id: '1',
        content: 'Halo! Ada masalah infrastruktur yang perlu dilaporkan di kawasan Menteng, Jakarta Pusat. Kondisinya cukup parah dan mengganggu aktivitas warga.',
        timestamp: new Date(),
        sender: 'bot' as const,
      };
      
      render(<ChatBubble message={indonesianMessage} />);
      
      expect(screen.getByText(indonesianMessage.content)).toBeInTheDocument();
    });

    it('works with Indonesian place names in location messages', () => {
      const locationMessage = {
        id: '1',
        content: 'Jl. Prof. Dr. Satrio, Kuningan, Jakarta Selatan, DKI Jakarta',
        timestamp: new Date(),
        sender: 'user' as const,
        messageType: 'location' as const,
      };
      
      render(<ChatBubble message={locationMessage} />);
      
      expect(screen.getByText(locationMessage.content)).toBeInTheDocument();
      expect(screen.getByText('📍 Lokasi:')).toBeInTheDocument();
    });

    it('handles Indonesian file names', () => {
      const fileMessage = {
        id: '1',
        content: 'foto-jalan-berlubang-menteng.jpg',
        timestamp: new Date(),
        sender: 'user' as const,
        messageType: 'file' as const,
      };
      
      render(<ChatBubble message={fileMessage} />);
      
      expect(screen.getByText(fileMessage.content)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('maintains proper semantic structure', () => {
      const message = mockChatMessages[0];
      render(<ChatBubble message={message} />);
      
      const messageText = screen.getByText(message.content);
      expect(messageText.closest('.chat-bubble')).toBeInTheDocument();
    });

    it('provides proper alt text for images', () => {
      const imageMessage = {
        id: '1',
        content: 'https://example.com/test.jpg',
        timestamp: new Date(),
        sender: 'user' as const,
        messageType: 'image' as const,
      };
      
      render(<ChatBubble message={imageMessage} />);
      
      const image = screen.getByAltText('Gambar dari pengguna');
      expect(image).toBeInTheDocument();
    });

    it('maintains readable text contrast', () => {
      const userMessage = { ...mockChatMessages[1], sender: 'user' as const };
      const botMessage = { ...mockChatMessages[0], sender: 'bot' as const };

      const { rerender } = render(<ChatBubble message={userMessage} />);
      let bubble = screen.getByText(userMessage.content).closest('.chat-bubble');
      expect(bubble).toHaveClass('chat-bubble--user');

      rerender(<ChatBubble message={botMessage} />);
      bubble = screen.getByText(botMessage.content).closest('.chat-bubble');
      expect(bubble).toHaveClass('chat-bubble--bot');
    });
  });

  describe('Props and Styling', () => {
    it('applies isLast styling correctly', () => {
      const message = mockChatMessages[0];
      const { container, rerender } = render(<ChatBubble message={message} />);
      
      let messageContainer = container.querySelector('.mb-4');
      expect(messageContainer).toBeInTheDocument();

      rerender(<ChatBubble message={message} isLast />);
      messageContainer = container.querySelector('.mb-6');
      expect(messageContainer).toBeInTheDocument();
    });

    it('accepts custom className', () => {
      const message = mockChatMessages[0];
      render(<ChatBubble message={message} className="custom-chat-bubble" />);
      
      const container = screen.getByText(message.content).closest('.custom-chat-bubble');
      expect(container).toBeInTheDocument();
    });

    it('handles empty or undefined content gracefully', () => {
      const emptyMessage = {
        id: '1',
        content: '',
        timestamp: new Date(),
        sender: 'bot' as const,
      };
      
      render(<ChatBubble message={emptyMessage} />);
      
      // Should still render the bubble structure
      const bubble = screen.getByText('').closest('.chat-bubble');
      expect(bubble).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles very long URLs in image messages', () => {
      const longUrlMessage = {
        id: '1',
        content: 'https://very-long-domain-name-that-might-break-layout.example.com/path/to/very/long/image/filename/that/could/cause/issues.jpg',
        timestamp: new Date(),
        sender: 'user' as const,
        messageType: 'image' as const,
      };
      
      render(<ChatBubble message={longUrlMessage} />);
      
      const image = screen.getByAltText('Gambar dari pengguna');
      expect(image).toHaveAttribute('src', longUrlMessage.content);
    });

    it('handles special characters in content', () => {
      const specialCharsMessage = {
        id: '1',
        content: 'Pesan dengan karakter khusus: @#$%^&*()_+{}[]|\\:";\'<>?,./',
        timestamp: new Date(),
        sender: 'user' as const,
      };
      
      render(<ChatBubble message={specialCharsMessage} />);
      
      expect(screen.getByText(specialCharsMessage.content)).toBeInTheDocument();
    });

    it('handles very old timestamps', () => {
      const oldMessage = {
        id: '1',
        content: 'Old message',
        timestamp: new Date('2020-01-01T00:00:00Z'),
        sender: 'bot' as const,
      };
      
      render(<ChatBubble message={oldMessage} showTimestamp />);
      
      const formattedTime = formatIndonesianDate(oldMessage.timestamp);
      expect(screen.getByText(formattedTime)).toBeInTheDocument();
    });
  });
});