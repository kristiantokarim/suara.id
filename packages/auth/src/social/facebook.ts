import { SocialProvider, SocialProfile, SocialAccountTrustScore, SocialVerificationResult, SocialAuthConfig } from './types';

interface FacebookProfile {
  id: string;
  name: string;
  email?: string;
  picture?: {
    data: {
      url: string;
    };
  };
  verified?: boolean;
  location?: {
    name: string;
  };
  friends?: {
    summary: {
      total_count: number;
    };
  };
  posts?: {
    data: any[];
    paging?: any;
  };
  created_time?: string;
  updated_time?: string;
}

interface FacebookMetrics {
  postCount: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  timeSpan: number;
}

export class FacebookProvider extends SocialProvider {
  constructor(config?: SocialAuthConfig) {
    const defaultConfig: SocialAuthConfig = {
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
      redirectUri: process.env.FACEBOOK_REDIRECT_URI || '',
      scope: ['public_profile', 'email', 'user_friends', 'user_posts', 'user_location']
    };
    
    super('facebook', config || defaultConfig);
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
        throw new Error(`Facebook OAuth error: ${data.error.message}`);
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
      // Get basic profile information
      const profileResponse = await fetch(
        `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture.type(large),verified,location,friends.summary(),created_time,updated_time&access_token=${token}`
      );

      const profileData: FacebookProfile = await profileResponse.json();

      if (profileData.error) {
        throw new Error(`Facebook API error: ${profileData.error}`);
      }

      // Parse account creation date
      let accountAge = new Date();
      if (profileData.created_time) {
        accountAge = new Date(profileData.created_time);
      } else {
        // Fallback: estimate based on Facebook's launch and user ID
        // Facebook launched in 2004, user IDs are roughly sequential
        const userId = parseInt(profileData.id);
        if (userId < 100000) {
          accountAge = new Date('2004-02-01'); // Very early user
        } else if (userId < 1000000) {
          accountAge = new Date('2005-01-01'); // Early user
        } else {
          // For newer users, we can't accurately estimate without created_time
          accountAge = new Date('2010-01-01'); // Conservative estimate
        }
      }

      return {
        id: profileData.id,
        username: undefined, // Facebook doesn't always provide username
        name: profileData.name,
        email: profileData.email,
        profilePicture: profileData.picture?.data?.url,
        verified: profileData.verified || false,
        friendCount: profileData.friends?.summary?.total_count,
        accountAge,
        lastActivity: profileData.updated_time ? new Date(profileData.updated_time) : undefined,
        location: profileData.location?.name,
        platform: 'facebook'
      };
    } catch (error) {
      throw new Error(`Failed to get Facebook profile: ${error}`);
    }
  }

  async verifyAccount(token: string, userId: string): Promise<SocialVerificationResult> {
    try {
      const profile = await this.getProfile(token);
      const trustScore = await this.calculateTrustScore(token);

      // Additional verification checks
      const issues: string[] = [];
      
      // Check if account has email verification
      if (!profile.email) {
        issues.push('No verified email associated with account');
      }

      // Check account age
      const accountAgeMonths = (Date.now() - profile.accountAge.getTime()) / (30 * 24 * 60 * 60 * 1000);
      if (accountAgeMonths < 6) {
        issues.push('Account is less than 6 months old');
      }

      // Check for minimum friends
      if (!profile.friendCount || profile.friendCount < 10) {
        issues.push('Account has very few friends');
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
        error: `Facebook verification failed: ${error}`
      };
    }
  }

  async calculateTrustScore(token: string): Promise<SocialAccountTrustScore> {
    try {
      const profile = await this.getProfile(token);
      const metrics = await this.getEngagementMetrics(token);

      const factors = {
        accountAge: this.calculateAccountAgeScore(profile.accountAge),
        activityLevel: this.calculateActivityScore(metrics),
        connections: this.normalizeConnectionCount(profile.friendCount || 0),
        verification: profile.verified ? 1.0 : 0.3,
        consistency: this.checkProfileConsistency(profile, {}), // Would pass user data in real implementation
        engagement: this.calculateEngagementScore(metrics)
      };

      // Detect issues
      const issues: string[] = [];
      const botIssues = this.detectBotPatterns(profile);
      issues.push(...botIssues);

      // Check for suspicious patterns specific to Facebook
      if (profile.friendCount && profile.friendCount > 5000) {
        issues.push('Friend count at maximum limit (potential for fake friends)');
      }

      if (factors.engagement < 0.3) {
        issues.push('Very low engagement on posts');
      }

      if (factors.activityLevel < 0.2) {
        issues.push('Very low posting activity');
      }

      // Calculate weighted score
      const weights = {
        accountAge: 0.25,
        activityLevel: 0.15,
        connections: 0.15,
        verification: 0.2,
        consistency: 0.15,
        engagement: 0.1
      };

      const score = Object.entries(factors).reduce((sum, [key, value]) => {
        return sum + (value * weights[key as keyof typeof weights]);
      }, 0);

      // Apply penalties for issues
      const penalizedScore = Math.max(0, score - (issues.length * 0.1));

      return {
        platform: 'facebook',
        score: penalizedScore,
        factors,
        issues,
        verifiedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to calculate Facebook trust score: ${error}`);
    }
  }

  private async getEngagementMetrics(token: string): Promise<FacebookMetrics> {
    try {
      // Get recent posts
      const postsResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/posts?fields=id,created_time,likes.summary(),comments.summary(),shares&limit=50&access_token=${token}`
      );

      const postsData = await postsResponse.json();

      if (postsData.error) {
        // If we can't access posts, return default metrics
        return {
          postCount: 0,
          avgLikes: 0,
          avgComments: 0,
          avgShares: 0,
          timeSpan: 365
        };
      }

      const posts = postsData.data || [];
      
      if (posts.length === 0) {
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
      let totalShares = 0;

      const oldestPost = posts[posts.length - 1];
      const newestPost = posts[0];
      
      const timeSpanMs = new Date(newestPost.created_time).getTime() - new Date(oldestPost.created_time).getTime();
      const timeSpanDays = Math.max(1, timeSpanMs / (24 * 60 * 60 * 1000));

      posts.forEach((post: any) => {
        totalLikes += post.likes?.summary?.total_count || 0;
        totalComments += post.comments?.summary?.total_count || 0;
        totalShares += post.shares?.count || 0;
      });

      return {
        postCount: posts.length,
        avgLikes: totalLikes / posts.length,
        avgComments: totalComments / posts.length,
        avgShares: totalShares / posts.length,
        timeSpan: timeSpanDays
      };
    } catch (error) {
      // Return minimal metrics if API calls fail
      return {
        postCount: 0,
        avgLikes: 0,
        avgComments: 0,
        avgShares: 0,
        timeSpan: 365
      };
    }
  }

  private calculateActivityScore(metrics: FacebookMetrics): number {
    if (metrics.postCount === 0) return 0.1;

    const postsPerMonth = (metrics.postCount / metrics.timeSpan) * 30;
    
    if (postsPerMonth < 1) return 0.3;
    if (postsPerMonth < 3) return 0.6;
    if (postsPerMonth < 10) return 0.9;
    if (postsPerMonth < 20) return 1.0;
    return 0.7; // Too many posts might be spam
  }
}