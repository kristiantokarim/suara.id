import React, { useState } from 'react';
import { Button } from './components/Button';
import { Input, Textarea } from './components/Form';
import { ChatBubble, ChatInput, ChatMessage } from './components/Chat';
import { Badge, TrustBadge, CategoryBadge } from './components/Badge';
import { Card } from './components/Card';

/**
 * Example usage of Suara.id UI components
 * 
 * This demonstrates the Indonesian design system in action:
 * - Trust badges for user verification levels
 * - Category badges for civic issue types
 * - Chat interface for issue reporting
 * - Form components optimized for mobile
 */
export const UIExample: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: 'Halo! Selamat datang di Suara.id. Saya akan membantu Anda melaporkan masalah di lingkungan sekitar. Ada masalah apa yang ingin Anda laporkan hari ini?',
      timestamp: new Date(Date.now() - 60000),
      sender: 'bot',
    },
    {
      id: '2',
      content: 'Ada jalan yang rusak parah di depan rumah saya',
      timestamp: new Date(Date.now() - 30000),
      sender: 'user',
    },
    {
      id: '3',
      content: 'Baik, saya akan bantu Anda melaporkan masalah jalan rusak. Bisa tolong berikan lokasi yang lebih spesifik dan foto jika memungkinkan?',
      timestamp: new Date(),
      sender: 'bot',
    },
  ]);

  const handleSendMessage = (content: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      timestamp: new Date(),
      sender: 'user',
    };
    setMessages([...messages, newMessage]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="indonesia-flag mx-auto mb-2" />
        <h1 className="text-3xl font-bold text-gray-900">Suara.id UI Components</h1>
        <p className="text-gray-600">Sistem desain untuk platform pelaporan warga Indonesia</p>
      </div>

      {/* Trust Badges Demo */}
      <Card>
        <Card.Header>
          <h2 className="text-xl font-semibold">Trust Level Badges</h2>
        </Card.Header>
        <Card.Body>
          <div className="flex flex-wrap gap-3">
            <TrustBadge level="BASIC" score={1.5} />
            <TrustBadge level="VERIFIED" score={3.2} />
            <TrustBadge level="PREMIUM" score={4.8} />
          </div>
        </Card.Body>
      </Card>

      {/* Category Badges Demo */}
      <Card>
        <Card.Header>
          <h2 className="text-xl font-semibold">Category Badges</h2>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-2 gap-3">
            <CategoryBadge category="INFRASTRUCTURE" />
            <CategoryBadge category="CLEANLINESS" />
            <CategoryBadge category="LIGHTING" />
            <CategoryBadge category="WATER_DRAINAGE" />
            <CategoryBadge category="ENVIRONMENT" />
            <CategoryBadge category="SAFETY" />
          </div>
        </Card.Body>
      </Card>

      {/* Form Components Demo */}
      <Card>
        <Card.Header>
          <h2 className="text-xl font-semibold">Form Components</h2>
        </Card.Header>
        <Card.Body>
          <div className="space-y-4">
            <Input
              label="Nomor Telepon"
              placeholder="08123456789"
              type="tel"
              helpText="Format: 08xxxxxxxxx"
            />
            <Input
              label="Email (opsional)"
              placeholder="nama@email.com"
              type="email"
            />
            <Textarea
              label="Deskripsi Masalah"
              placeholder="Jelaskan masalah yang Anda temukan dengan detail..."
              required
              showCount
              maxLength={500}
            />
          </div>
        </Card.Body>
        <Card.Footer>
          <div className="flex gap-3">
            <Button variant="primary" fullWidth>
              Kirim Laporan
            </Button>
            <Button variant="secondary">
              Batal
            </Button>
          </div>
        </Card.Footer>
      </Card>

      {/* Chat Interface Demo */}
      <Card padding="none">
        <Card.Header className="p-4">
          <h2 className="text-xl font-semibold">Chat Interface</h2>
          <p className="text-sm text-gray-600">Antarmuka percakapan untuk pelaporan</p>
        </Card.Header>
        <Card.Body>
          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <ChatBubble
                key={message.id}
                message={message}
                showTimestamp={index % 2 === 0}
                isLast={index === messages.length - 1}
              />
            ))}
          </div>
          <ChatInput
            onSend={handleSendMessage}
            placeholder="Ketik pesan Anda..."
            maxLength={500}
          />
        </Card.Body>
      </Card>

      {/* Button Variants Demo */}
      <Card>
        <Card.Header>
          <h2 className="text-xl font-semibold">Button Variants</h2>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="primary" size="sm">Primary Small</Button>
            <Button variant="secondary" size="sm">Secondary Small</Button>
            <Button variant="primary" size="md">Primary Medium</Button>
            <Button variant="secondary" size="md">Secondary Medium</Button>
            <Button variant="primary" size="lg">Primary Large</Button>
            <Button variant="danger" size="lg">Danger Large</Button>
          </div>
        </Card.Body>
      </Card>

      {/* Generic Badges Demo */}
      <Card>
        <Card.Header>
          <h2 className="text-xl font-semibold">Generic Badges</h2>
        </Card.Header>
        <Card.Body>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">Default</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};