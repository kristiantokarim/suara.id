import { SocialProvider, SocialProfile, SocialAccountTrustScore, SocialVerificationResult, SocialAuthConfig } from './types';

interface WhatsAppBusinessProfile {
  id: string;
  name: string;
  phone_number: string;
  verified_name?: string;
  is_official_business_account?: boolean;
  profile_picture_url?: string;
  website?: string;
  description?: string;
  category?: string;
  address?: string;
}

export class WhatsAppProvider extends SocialProvider {
  constructor(config?: SocialAuthConfig) {
    const defaultConfig: SocialAuthConfig = {
      clientId: process.env.WHATSAPP_CLIENT_ID || '',
      clientSecret: process.env.WHATSAPP_CLIENT_SECRET || '',
      redirectUri: process.env.WHATSAPP_REDIRECT_URI || '',
      scope: ['whatsapp_business_management', 'whatsapp_business_messaging']
    };
    
    super('whatsapp', config || defaultConfig);
  }

  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scope.join(','),
      response_type: 'code',
      state: state || ''
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<{ accessToken: string; refreshToken?: string }> {
    try {
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        code: code
      });

      const response = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`, {
        method: 'GET'
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(`WhatsApp OAuth error: ${data.error.message}`);
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token
      };
    } catch (error) {
      throw new Error(`Failed to exchange code for token: ${error}`);
    }
  }

  async getProfile(token: string): Promise<SocialProfile> {
    try {
      // First, get the WhatsApp Business Account ID
      const businessAccountsResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/businesses?fields=whatsapp_business_accounts&access_token=${token}`
      );

      const businessData = await businessAccountsResponse.json();

      if (businessData.error) {
        throw new Error(`WhatsApp Business API error: ${businessData.error.message}`);
      }

      // Get the first WhatsApp business account
      const whatsappBusinessAccounts = businessData.data?.[0]?.whatsapp_business_accounts?.data;
      
      if (!whatsappBusinessAccounts || whatsappBusinessAccounts.length === 0) {
        throw new Error('No WhatsApp Business accounts found');
      }

      const businessAccountId = whatsappBusinessAccounts[0].id;

      // Get business profile information
      const profileResponse = await fetch(
        `https://graph.facebook.com/v18.0/${businessAccountId}?fields=id,name,phone_numbers,profile,verification_status&access_token=${token}`
      );

      const profileData = await profileResponse.json();

      if (profileData.error) {
        throw new Error(`WhatsApp Profile API error: ${profileData.error.message}`);
      }

      // Extract phone number
      const phoneNumber = profileData.phone_numbers?.[0]?.phone_number || '';

      // WhatsApp Business accounts don't have traditional creation dates
      // We'll use a conservative estimate based on WhatsApp Business API availability
      const accountAge = new Date('2018-08-01'); // WhatsApp Business API general availability

      return {
        id: profileData.id,
        username: phoneNumber,
        name: profileData.name || profileData.profile?.name || phoneNumber,
        verified: profileData.verification_status === 'verified',
        accountAge,
        platform: 'whatsapp',
        // WhatsApp Business doesn't have followers/friends concept
        followerCount: undefined,
        friendCount: undefined,
        // Location from business profile
        location: profileData.profile?.address
      };
    } catch (error) {
      throw new Error(`Failed to get WhatsApp profile: ${error}`);
    }
  }

  async verifyAccount(token: string, userId: string): Promise<SocialVerificationResult> {
    try {
      const profile = await this.getProfile(token);
      const trustScore = await this.calculateTrustScore(token);

      // Additional verification checks
      const issues: string[] = [];
      
      // Check if it's a verified business account
      if (!profile.verified) {
        issues.push('WhatsApp Business account is not verified');
      }

      // Check if phone number is provided
      if (!profile.username) {
        issues.push('No phone number associated with business account');
      }

      // WhatsApp Business verification is quite strict, so if we get this far,
      // it's likely a legitimate business
      const isValid = trustScore.score >= 0.7 && issues.length === 0;

      return {
        success: true,
        valid: isValid,
        profile,
        trustScore,
        issues: issues.length > 0 ? issues : undefined
      };
    } catch (error) {
      return {
        success: false,
        valid: false,
        error: `WhatsApp verification failed: ${error}`
      };
    }
  }

  async calculateTrustScore(token: string): Promise<SocialAccountTrustScore> {
    try {
      const profile = await this.getProfile(token);
      const businessMetrics = await this.getBusinessMetrics(token);

      const factors = {
        accountAge: this.calculateAccountAgeScore(profile.accountAge),
        activityLevel: businessMetrics.activityScore,
        connections: 0.8, // WhatsApp Business accounts don't have followers, but being approved is significant
        verification: profile.verified ? 1.0 : 0.3,
        consistency: this.checkProfileConsistency(profile, {}), // Would pass user data in real implementation
        engagement: businessMetrics.engagementScore
      };

      // Detect issues
      const issues: string[] = [];

      // WhatsApp Business specific checks
      if (!businessMetrics.hasProfileInfo) {
        issues.push('Incomplete business profile information');
      }

      if (!businessMetrics.hasBusinessHours) {
        issues.push('No business hours specified');
      }

      // Calculate weighted score
      // WhatsApp Business accounts are generally more trustworthy due to verification process
      const weights = {
        accountAge: 0.15,
        activityLevel: 0.2,
        connections: 0.1,
        verification: 0.35, // Higher weight for WhatsApp verification
        consistency: 0.15,
        engagement: 0.05
      };

      let score = Object.entries(factors).reduce((sum, [key, value]) => {
        return sum + (value * weights[key as keyof typeof weights]);
      }, 0);

      // Bonus for WhatsApp Business (inherently more trustworthy)
      score += 0.2;

      // Apply penalties for issues (lighter penalties for WhatsApp Business)
      const penalizedScore = Math.max(0, Math.min(1, score - (issues.length * 0.05)));

      return {
        platform: 'whatsapp',
        score: penalizedScore,
        factors,
        issues,
        verifiedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to calculate WhatsApp trust score: ${error}`);
    }
  }

  private async getBusinessMetrics(token: string): Promise<{
    activityScore: number;
    engagementScore: number;
    hasProfileInfo: boolean;
    hasBusinessHours: boolean;
  }> {
    try {
      // Get business profile details
      const businessAccountsResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/businesses?fields=whatsapp_business_accounts&access_token=${token}`
      );

      const businessData = await businessAccountsResponse.json();
      const whatsappBusinessAccounts = businessData.data?.[0]?.whatsapp_business_accounts?.data;
      
      if (!whatsappBusinessAccounts || whatsappBusinessAccounts.length === 0) {
        return {
          activityScore: 0.3,
          engagementScore: 0.3,
          hasProfileInfo: false,
          hasBusinessHours: false
        };
      }

      const businessAccountId = whatsappBusinessAccounts[0].id;

      // Get detailed profile
      const profileResponse = await fetch(
        `https://graph.facebook.com/v18.0/${businessAccountId}?fields=profile&access_token=${token}`
      );

      const profileData = await profileResponse.json();
      const profile = profileData.profile || {};

      // Check profile completeness
      const hasProfileInfo = !!(
        profile.description && 
        profile.email && 
        profile.address
      );

      // Check if business hours are set
      const hasBusinessHours = !!(profile.business_hours);

      // For WhatsApp Business, we can't easily get message volume or engagement
      // so we base activity on profile completeness and setup
      let activityScore = 0.5; // Base score

      if (hasProfileInfo) activityScore += 0.3;
      if (hasBusinessHours) activityScore += 0.2;
      if (profile.website) activityScore += 0.1;
      if (profile.category) activityScore += 0.1;

      // Engagement score is harder to determine for WhatsApp Business
      // We base it on profile quality and setup completeness
      let engagementScore = 0.5;
      
      if (profile.description && profile.description.length > 50) {
        engagementScore += 0.2;
      }
      
      if (profile.website) {
        engagementScore += 0.2;
      }

      if (hasBusinessHours) {
        engagementScore += 0.1;
      }

      return {
        activityScore: Math.min(activityScore, 1.0),
        engagementScore: Math.min(engagementScore, 1.0),
        hasProfileInfo,
        hasBusinessHours
      };
    } catch (error) {
      return {
        activityScore: 0.3,
        engagementScore: 0.3,
        hasProfileInfo: false,
        hasBusinessHours: false
      };
    }
  }
}