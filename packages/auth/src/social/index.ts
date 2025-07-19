export * from './facebook';
export * from './instagram';
export * from './whatsapp';
export * from './types';

import { SocialProvider } from './types';
import { FacebookProvider } from './facebook';
import { InstagramProvider } from './instagram';
import { WhatsAppProvider } from './whatsapp';

export class SocialMediaManager {
  private providers: Map<string, SocialProvider> = new Map();

  constructor() {
    // Initialize supported providers
    this.providers.set('facebook', new FacebookProvider());
    this.providers.set('instagram', new InstagramProvider());
    this.providers.set('whatsapp', new WhatsAppProvider());
  }

  getProvider(platform: string): SocialProvider | undefined {
    return this.providers.get(platform.toLowerCase());
  }

  getSupportedPlatforms(): string[] {
    return Array.from(this.providers.keys());
  }

  async verifyAccount(platform: string, token: string, userId: string): Promise<any> {
    const provider = this.getProvider(platform);
    if (!provider) {
      throw new Error(`Unsupported social platform: ${platform}`);
    }

    return provider.verifyAccount(token, userId);
  }

  async getProfile(platform: string, token: string): Promise<any> {
    const provider = this.getProvider(platform);
    if (!provider) {
      throw new Error(`Unsupported social platform: ${platform}`);
    }

    return provider.getProfile(token);
  }

  async calculateTrustScore(platform: string, token: string): Promise<any> {
    const provider = this.getProvider(platform);
    if (!provider) {
      throw new Error(`Unsupported social platform: ${platform}`);
    }

    return provider.calculateTrustScore(token);
  }
}