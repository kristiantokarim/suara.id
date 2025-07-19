import { SocialProvider, SocialProfile, SocialAccountTrustScore, SocialVerificationResult, SocialAuthConfig } from './types';

interface InstagramProfile {
  id: string;
  username: string;
  account_type: 'PERSONAL' | 'BUSINESS';
  media_count: number;
  followers_count?: number;
  follows_count?: number;
}

interface InstagramMedia {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  timestamp: string;
  caption?: string;
  like_count?: number;
  comments_count?: number;
}

export class InstagramProvider extends SocialProvider {
  constructor(config?: SocialAuthConfig) {
    const defaultConfig: SocialAuthConfig = {
      clientId: process.env.INSTAGRAM_CLIENT_ID || '',
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
      redirectUri: process.env.INSTAGRAM_REDIRECT_URI || '',
      scope: ['user_profile', 'user_media']
    };
    
    super('instagram', config || defaultConfig);
  }

  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scope.join(','),
      response_type: 'code',
      state: state || ''
    });

    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<{ accessToken: string; refreshToken?: string }> {
    try {
      const formData = new FormData();
      formData.append('client_id', this.config.clientId);
      formData.append('client_secret', this.config.clientSecret);
      formData.append('grant_type', 'authorization_code');
      formData.append('redirect_uri', this.config.redirectUri);
      formData.append('code', code);

      const response = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(`Instagram OAuth error: ${data.error.message || data.error}`);
      }

      // Exchange short-lived token for long-lived token
      const longLivedResponse = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${this.config.clientSecret}&access_token=${data.access_token}`
      );

      const longLivedData = await longLivedResponse.json();

      return {
        accessToken: longLivedData.access_token || data.access_token
      };
    } catch (error) {
      throw new Error(`Failed to exchange code for token: ${error}`);
    }
  }

  async getProfile(token: string): Promise<SocialProfile> {
    try {
      // Get basic profile information
      const profileResponse = await fetch(
        `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${token}`
      );

      const profileData: InstagramProfile = await profileResponse.json();

      if (profileData.error) {
        throw new Error(`Instagram API error: ${profileData.error}`);
      }

      // For business accounts, we can get follower counts
      let followerCount: number | undefined;
      let followingCount: number | undefined;

      if (profileData.account_type === 'BUSINESS') {
        try {
          const insightsResponse = await fetch(
            `https://graph.instagram.com/${profileData.id}?fields=followers_count,follows_count&access_token=${token}`
          );
          const insightsData = await insightsResponse.json();
          
          if (!insightsData.error) {
            followerCount = insightsData.followers_count;
            followingCount = insightsData.follows_count;
          }
        } catch (error) {
          // Insights might not be available for all business accounts
          console.warn('Could not fetch Instagram insights:', error);
        }
      }

      // Estimate account age based on earliest media
      let accountAge = new Date();
      try {
        const mediaResponse = await fetch(
          `https://graph.instagram.com/me/media?fields=timestamp&limit=1&access_token=${token}`
        );
        const mediaData = await mediaResponse.json();
        
        if (mediaData.data && mediaData.data.length > 0) {
          // This gives us the oldest media, not account creation, but it's a reasonable estimate
          accountAge = new Date(mediaData.data[0].timestamp);
        }
      } catch (error) {
        // If we can't get media, use a conservative estimate
        accountAge = new Date('2015-01-01'); // Instagram business API became widely available
      }

      return {
        id: profileData.id,
        username: profileData.username,
        name: profileData.username, // Instagram Basic Display API doesn't provide display name
        verified: false, // Basic Display API doesn't provide verification status
        followerCount,
        friendCount: followingCount, // Using follows_count as friendCount
        accountAge,
        platform: 'instagram'
      };
    } catch (error) {
      throw new Error(`Failed to get Instagram profile: ${error}`);
    }
  }

  async verifyAccount(token: string, userId: string): Promise<SocialVerificationResult> {
    try {
      const profile = await this.getProfile(token);
      const trustScore = await this.calculateTrustScore(token);

      // Additional verification checks
      const issues: string[] = [];
      
      // Check username patterns
      if (this.isSuspiciousUsername(profile.username || '')) {
        issues.push('Username follows suspicious pattern');
      }

      // Check account age
      const accountAgeMonths = (Date.now() - profile.accountAge.getTime()) / (30 * 24 * 60 * 60 * 1000);
      if (accountAgeMonths < 3) {
        issues.push('Account is less than 3 months old');
      }

      // Check for minimum activity
      const mediaCount = await this.getMediaCount(token);
      if (mediaCount < 5) {
        issues.push('Account has very few posts');
      }

      // Detect bot patterns
      const botIssues = this.detectBotPatterns(profile);
      issues.push(...botIssues);

      const isValid = trustScore.score >= 0.6 && issues.length === 0;

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
        error: `Instagram verification failed: ${error}`
      };
    }
  }

  async calculateTrustScore(token: string): Promise<SocialAccountTrustScore> {
    try {
      const profile = await this.getProfile(token);
      const engagementData = await this.getEngagementMetrics(token);

      const factors = {
        accountAge: this.calculateAccountAgeScore(profile.accountAge),
        activityLevel: this.calculateActivityLevel(engagementData),
        connections: this.normalizeConnectionCount(profile.followerCount || 0),
        verification: 0.3, // Basic Display API doesn't provide verification status
        consistency: this.checkProfileConsistency(profile, {}), // Would pass user data in real implementation
        engagement: this.calculateEngagementScore(engagementData)
      };

      // Detect issues
      const issues: string[] = [];
      const botIssues = this.detectBotPatterns(profile);
      issues.push(...botIssues);

      // Instagram-specific checks
      if (profile.followerCount && profile.friendCount) {
        const followerToFollowingRatio = profile.followerCount / Math.max(profile.friendCount, 1);
        
        // Suspicious ratios
        if (followerToFollowingRatio > 100) {
          issues.push('Unusually high follower to following ratio');
        }
        
        if (profile.friendCount > 2000 && followerToFollowingRatio < 0.1) {
          issues.push('Following many accounts with few followers');
        }
      }

      // Check username patterns
      if (profile.username && this.isSuspiciousUsername(profile.username)) {
        issues.push('Username follows bot-like pattern');
      }

      // Calculate weighted score
      const weights = {
        accountAge: 0.2,
        activityLevel: 0.25,
        connections: 0.2,
        verification: 0.1,
        consistency: 0.15,
        engagement: 0.1
      };

      const score = Object.entries(factors).reduce((sum, [key, value]) => {
        return sum + (value * weights[key as keyof typeof weights]);
      }, 0);

      // Apply penalties for issues
      const penalizedScore = Math.max(0, score - (issues.length * 0.15));

      return {
        platform: 'instagram',
        score: penalizedScore,
        factors,
        issues,
        verifiedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to calculate Instagram trust score: ${error}`);
    }
  }

  private async getMediaCount(token: string): Promise<number> {
    try {
      const response = await fetch(
        `https://graph.instagram.com/me?fields=media_count&access_token=${token}`
      );
      const data = await response.json();
      return data.media_count || 0;
    } catch (error) {
      return 0;
    }
  }

  private async getEngagementMetrics(token: string): Promise<any> {
    try {
      // Get recent media
      const mediaResponse = await fetch(
        `https://graph.instagram.com/me/media?fields=id,media_type,timestamp,like_count,comments_count&limit=25&access_token=${token}`
      );

      const mediaData = await mediaResponse.json();

      if (mediaData.error || !mediaData.data) {
        return {
          postCount: 0,
          avgLikes: 0,
          avgComments: 0,
          avgShares: 0,
          timeSpan: 365
        };
      }

      const media = mediaData.data as InstagramMedia[];
      
      if (media.length === 0) {
        return {
          postCount: 0,
          avgLikes: 0,
          avgComments: 0,
          avgShares: 0,
          timeSpan: 365
        };
      }

      // Calculate metrics
      let totalLikes = 0;
      let totalComments = 0;
      let validPosts = 0;

      const oldestPost = media[media.length - 1];
      const newestPost = media[0];
      
      const timeSpanMs = new Date(newestPost.timestamp).getTime() - new Date(oldestPost.timestamp).getTime();
      const timeSpanDays = Math.max(1, timeSpanMs / (24 * 60 * 60 * 1000));

      media.forEach((post) => {
        if (post.like_count !== undefined) {
          totalLikes += post.like_count;
          validPosts++;
        }
        if (post.comments_count !== undefined) {
          totalComments += post.comments_count;
        }
      });

      return {
        postCount: validPosts,
        avgLikes: validPosts > 0 ? totalLikes / validPosts : 0,
        avgComments: validPosts > 0 ? totalComments / validPosts : 0,
        avgShares: 0, // Instagram doesn't provide share counts via Basic Display API
        timeSpan: timeSpanDays
      };
    } catch (error) {
      return {
        postCount: 0,
        avgLikes: 0,
        avgComments: 0,
        avgShares: 0,
        timeSpan: 365
      };
    }
  }

  private calculateActivityLevel(metrics: any): number {
    if (metrics.postCount === 0) return 0.1;

    const postsPerMonth = (metrics.postCount / metrics.timeSpan) * 30;
    
    // Instagram optimal posting frequency
    if (postsPerMonth < 3) return 0.3;       // Less than 3 per month
    if (postsPerMonth < 10) return 0.7;      // 3-10 per month
    if (postsPerMonth < 30) return 1.0;      // 10-30 per month (ideal)
    if (postsPerMonth < 60) return 0.8;      // 30-60 per month (very active)
    return 0.5; // More than 60 per month (potentially spam)
  }

  private isSuspiciousUsername(username: string): boolean {
    const suspiciousPatterns = [
      /^[a-z]+\d{4,}$/,           // letters followed by many numbers
      /^user\d+$/i,               // "user" + numbers
      /^[a-z]{1,3}\d{6,}$/,       // few letters + many numbers
      /^real[a-z]+\d+$/i,         // starts with "real"
      /^official[a-z]+\d+$/i,     // starts with "official"
      /_+\d{4,}$/,                // ends with underscores and numbers
      /^[a-z]+_[a-z]+_\d+$/       // word_word_numbers pattern
    ];

    return suspiciousPatterns.some(pattern => pattern.test(username));
  }
}