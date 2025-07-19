import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

/**
 * Test utilities for Suara.id UI components
 * 
 * Provides Indonesian context and helper functions for testing
 */

// Mock Indonesian user data for testing
export const mockIndonesianUsers = {
  basic: {
    id: '1',
    name: 'Budi Santoso',
    phone: '+628123456789',
    trustLevel: 'BASIC' as const,
    trustScore: 1.5,
  },
  verified: {
    id: '2',
    name: 'Sari Wulandari',
    phone: '+628987654321',
    trustLevel: 'VERIFIED' as const,
    trustScore: 3.2,
  },
  premium: {
    id: '3',
    name: 'Ahmad Rahman',
    phone: '+628555666777',
    trustLevel: 'PREMIUM' as const,
    trustScore: 4.8,
  },
};

// Mock chat messages in Indonesian
export const mockChatMessages = [
  {
    id: '1',
    content: 'Halo! Selamat datang di Suara.id. Ada masalah apa yang ingin Anda laporkan?',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    sender: 'bot' as const,
    messageType: 'text' as const,
  },
  {
    id: '2',
    content: 'Ada jalan yang rusak parah di depan rumah saya',
    timestamp: new Date('2024-01-15T10:01:00Z'),
    sender: 'user' as const,
    messageType: 'text' as const,
  },
  {
    id: '3',
    content: 'Baik, saya akan bantu Anda melaporkan masalah jalan rusak. Bisa tolong berikan lokasi yang lebih spesifik?',
    timestamp: new Date('2024-01-15T10:02:00Z'),
    sender: 'bot' as const,
    messageType: 'text' as const,
  },
];

// Mock Indonesian form data
export const mockFormData = {
  validPhone: '+628123456789',
  invalidPhone: '123456789',
  validEmail: 'test@example.com',
  invalidEmail: 'not-an-email',
  sampleDescription: 'Jalan berlubang sangat besar di Jl. Sudirman No. 123, Jakarta Pusat. Sudah berlangsung selama 2 minggu dan membahayakan pengendara motor.',
  longDescription: 'Lorem ipsum dolor sit amet '.repeat(50), // > 500 chars for testing limits
};

// Mock Indonesian location data
export const mockLocations = {
  jakarta: {
    coordinates: [-6.2088, 106.8456] as [number, number],
    address: 'Jl. Sudirman No. 123, Menteng, Jakarta Pusat',
    kelurahan: 'Menteng',
    kecamatan: 'Menteng',
    kabupaten: 'Jakarta Pusat',
    provinsi: 'DKI Jakarta',
  },
  surabaya: {
    coordinates: [-7.2575, 112.7521] as [number, number],
    address: 'Jl. Pemuda No. 45, Embong Kaliasin, Surabaya',
    kelurahan: 'Embong Kaliasin',
    kecamatan: 'Genteng',
    kabupaten: 'Surabaya',
    provinsi: 'Jawa Timur',
  },
};

/**
 * Custom render function with Indonesian locale context
 */
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div lang="id" dir="ltr">
      {children}
    </div>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

/**
 * Helper function to simulate user typing in Indonesian
 */
export const typeIndonesianText = async (user: any, element: Element, text: string) => {
  await user.clear(element);
  await user.type(element, text);
};

/**
 * Helper function to format Indonesian timestamps for testing
 */
export const formatIndonesianDate = (date: Date): string => {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  }).format(date);
};

/**
 * Helper function to test accessibility in Indonesian context
 */
export const getByLabelTextIndonesian = (container: HTMLElement, text: string) => {
  // Common Indonesian form labels for testing
  const indonesianLabels: Record<string, string[]> = {
    phone: ['Nomor Telepon', 'No. HP', 'Telepon'],
    email: ['Email', 'Alamat Email', 'Surel'],
    name: ['Nama', 'Nama Lengkap'],
    description: ['Deskripsi', 'Keterangan', 'Penjelasan'],
    location: ['Lokasi', 'Alamat', 'Tempat'],
  };

  const labels = indonesianLabels[text] || [text];
  
  for (const label of labels) {
    try {
      const element = container.querySelector(`[aria-label="${label}"], label[for]:contains("${label}")`);
      if (element) return element;
    } catch {
      // Continue to next label
    }
  }
  
  throw new Error(`Unable to find element with Indonesian label: ${text}`);
};

/**
 * Mock Indonesian phone number inputs for testing
 */
export const indonesianPhoneInputs = [
  { input: '08123456789', expected: '+628123456789', valid: true },
  { input: '8123456789', expected: '+628123456789', valid: true },
  { input: '+628123456789', expected: '+628123456789', valid: true },
  { input: '628123456789', expected: '+628123456789', valid: true },
  { input: '123456789', expected: '', valid: false },
  { input: '08123', expected: '', valid: false },
];

/**
 * Mock trust level test data
 */
export const trustLevelTestData = [
  { level: 'BASIC' as const, score: 1.5, expectedLabel: 'Dasar', expectedIcon: '👤' },
  { level: 'VERIFIED' as const, score: 3.2, expectedLabel: 'Terverifikasi', expectedIcon: '✅' },
  { level: 'PREMIUM' as const, score: 4.8, expectedLabel: 'Premium', expectedIcon: '⭐' },
];

/**
 * Mock category test data
 */
export const categoryTestData = [
  { category: 'INFRASTRUCTURE' as const, expectedLabel: 'Infrastruktur', expectedIcon: '🏗️' },
  { category: 'CLEANLINESS' as const, expectedLabel: 'Kebersihan', expectedIcon: '🧹' },
  { category: 'LIGHTING' as const, expectedLabel: 'Penerangan', expectedIcon: '💡' },
  { category: 'WATER_DRAINAGE' as const, expectedLabel: 'Air & Drainase', expectedIcon: '💧' },
  { category: 'ENVIRONMENT' as const, expectedLabel: 'Lingkungan', expectedIcon: '🌱' },
  { category: 'SAFETY' as const, expectedLabel: 'Keamanan', expectedIcon: '🛡️' },
];