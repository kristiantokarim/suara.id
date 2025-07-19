export interface SocialProfile {
  id: string;
  username?: string;
  name: string;
  email?: string;
  profilePicture?: string;
  verified: boolean;
  followerCount?: number;
  friendCount?: number;
  accountAge: Date;
  lastActivity?: Date;
  location?: string;
  platform: string;
}

export interface SocialAccountTrustScore {
  platform: string;
  score: number;        // 0-1 trust score
  factors: {
    accountAge: number;     // Years since account creation
    activityLevel: number;  // Regular posting/activity
    connections: number;    // Friend/follower count (normalized)
    verification: number;   // Platform verification status
    consistency: number;    // Profile consistency with user data
    engagement: number;     // Engagement quality
  };
  issues: string[];
  verifiedAt: Date;
}

export interface SocialVerificationResult {
  success: boolean;
  valid: boolean;
  profile?: SocialProfile;
  trustScore?: SocialAccountTrustScore;
  error?: string;
  issues?: string[];
}

export interface SocialAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
}

export abstract class SocialProvider {
  protected config: SocialAuthConfig;
  protected platform: string;

  constructor(platform: string, config: SocialAuthConfig) {
    this.platform = platform;
    this.config = config;
  }

  abstract verifyAccount(token: string, userId: string): Promise<SocialVerificationResult>;
  abstract getProfile(token: string): Promise<SocialProfile>;
  abstract calculateTrustScore(token: string): Promise<SocialAccountTrustScore>;
  abstract getAuthUrl(state?: string): string;
  abstract exchangeCodeForToken(code: string): Promise<{ accessToken: string; refreshToken?: string }>;

  /**
   * Normalize follower/friend count for scoring
   * Uses logarithmic scale to prevent gaming with fake followers
   */
  protected normalizeConnectionCount(count: number): number {
    if (count <= 0) return 0;
    if (count <= 50) return count / 50 * 0.3;           // 0-50: 0-30%
    if (count <= 500) return 0.3 + (count - 50) / 450 * 0.4;  // 51-500: 30-70%
    if (count <= 2000) return 0.7 + (count - 500) / 1500 * 0.2; // 501-2000: 70-90%
    return Math.min(1.0, 0.9 + Math.log10(count / 2000) * 0.1); // 2000+: 90-100%
  }

  /**
   * Calculate account age score
   */
  protected calculateAccountAgeScore(createdAt: Date): number {
    const ageInYears = (Date.now() - createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    
    if (ageInYears < 0.5) return 0.1;    // Less than 6 months: very suspicious
    if (ageInYears < 1) return 0.3;      // 6-12 months: suspicious
    if (ageInYears < 2) return 0.6;      // 1-2 years: okay
    if (ageInYears < 5) return 0.8;      // 2-5 years: good
    return 1.0;                          // 5+ years: excellent
  }

  /**
   * Check profile consistency with user data
   */
  protected checkProfileConsistency(
    profile: SocialProfile,
    userData: { name?: string; location?: string }
  ): number {
    let score = 0.5; // Base score
    let checks = 0;

    // Name consistency
    if (userData.name && profile.name) {
      const similarity = this.calculateNameSimilarity(userData.name, profile.name);
      score += similarity * 0.3;
      checks++;
    }

    // Location consistency
    if (userData.location && profile.location) {
      const similarity = this.calculateLocationSimilarity(userData.location, profile.location);
      score += similarity * 0.2;
      checks++;
    }

    // If no checks could be performed, return neutral score
    return checks > 0 ? Math.min(score, 1.0) : 0.5;
  }

  /**
   * Calculate name similarity (simple string matching)
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const n1 = normalize(name1);
    const n2 = normalize(name2);

    if (n1 === n2) return 1.0;
    
    // Check if one name contains the other
    if (n1.includes(n2) || n2.includes(n1)) return 0.8;
    
    // Check word overlap
    const words1 = n1.split(/\s+/);
    const words2 = n2.split(/\s+/);
    const overlap = words1.filter(word => words2.includes(word)).length;
    const totalWords = Math.max(words1.length, words2.length);
    
    return overlap / totalWords;
  }

  /**
   * Calculate location similarity
   */
  private calculateLocationSimilarity(loc1: string, loc2: string): number {
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const l1 = normalize(loc1);
    const l2 = normalize(loc2);

    if (l1 === l2) return 1.0;
    if (l1.includes(l2) || l2.includes(l1)) return 0.7;
    
    // Check for common Indonesian location patterns
    const indonesianCities = ['jakarta', 'surabaya', 'bandung', 'medan', 'bekasi', 'tangerang', 'depok', 'semarang', 'palembang', 'makassar'];
    const city1 = indonesianCities.find(city => l1.includes(city));
    const city2 = indonesianCities.find(city => l2.includes(city));
    
    if (city1 && city2 && city1 === city2) return 0.8;
    
    return 0.3; // Different locations
  }

  /**
   * Detect potential bot/fake account patterns
   */
  protected detectBotPatterns(profile: SocialProfile): string[] {
    const issues: string[] = [];

    // Username patterns suspicious for bots
    if (profile.username) {
      const username = profile.username.toLowerCase();
      
      // Random number sequences
      if (/\d{4,}/.test(username)) {
        issues.push('Username contains long number sequence');
      }
      
      // Generic patterns
      if (/^(user|account|profile)\d+/.test(username)) {
        issues.push('Username follows generic pattern');
      }
    }

    // Name patterns
    const name = profile.name.toLowerCase();
    
    // Very short names
    if (name.length < 3) {
      issues.push('Name is unusually short');
    }
    
    // All caps or unusual capitalization
    if (profile.name === profile.name.toUpperCase() && profile.name.length > 5) {
      issues.push('Name is in all caps');
    }

    // Follower/following ratio analysis
    if (profile.followerCount !== undefined && profile.friendCount !== undefined) {
      const ratio = profile.followerCount / Math.max(profile.friendCount, 1);
      
      // Extremely high following count with low followers (potential spam)
      if (profile.friendCount > 2000 && ratio < 0.1) {
        issues.push('Suspicious follower/following ratio');
      }
      
      // Extremely high followers with very low following (potential bought followers)
      if (profile.followerCount > 1000 && profile.friendCount < 50) {
        issues.push('Unusual follower pattern');
      }
    }

    // Recent account with high activity
    const accountAgeMonths = (Date.now() - profile.accountAge.getTime()) / (30 * 24 * 60 * 60 * 1000);
    if (accountAgeMonths < 6 && profile.followerCount && profile.followerCount > 500) {
      issues.push('High activity for new account');
    }

    return issues;
  }

  /**
   * Calculate overall engagement quality score
   */
  protected calculateEngagementScore(metrics: {
    postCount?: number;
    avgLikes?: number;
    avgComments?: number;
    avgShares?: number;
    timeSpan?: number; // Days
  }): number {
    if (!metrics.postCount || metrics.postCount === 0) return 0.3; // No posts is suspicious

    const { postCount, avgLikes = 0, avgComments = 0, avgShares = 0, timeSpan = 365 } = metrics;
    
    // Calculate posting frequency (posts per month)
    const monthlyPosts = (postCount / timeSpan) * 30;
    let frequencyScore = 0;
    
    if (monthlyPosts < 1) frequencyScore = 0.3;      // Less than 1 post per month
    else if (monthlyPosts < 5) frequencyScore = 0.6; // 1-5 posts per month
    else if (monthlyPosts < 15) frequencyScore = 0.9; // 5-15 posts per month (good)
    else if (monthlyPosts < 30) frequencyScore = 1.0; // 15-30 posts per month (very active)
    else frequencyScore = 0.7; // More than 30 posts per month (potentially spam)

    // Calculate engagement rate
    const totalEngagement = avgLikes + avgComments * 2 + avgShares * 3; // Weight comments and shares more
    const engagementRate = totalEngagement / Math.max(postCount, 1);
    
    let engagementScore = 0;
    if (engagementRate < 1) engagementScore = 0.3;
    else if (engagementRate < 5) engagementScore = 0.6;
    else if (engagementRate < 20) engagementScore = 0.8;
    else if (engagementRate < 50) engagementScore = 1.0;
    else engagementScore = 0.7; // Suspiciously high engagement

    // Combine scores
    return (frequencyScore * 0.6 + engagementScore * 0.4);
  }
}