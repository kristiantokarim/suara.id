# Scoring Implementation Documentation
## Suara.id Trust & Quality Scoring System

### Overview

The scoring system is the core anti-abuse mechanism for Suara.id, implementing sophisticated algorithms to assess user trustworthiness and submission quality. This dual-scoring approach ensures data integrity while maintaining accessibility for legitimate users across all trust levels.

### Architecture Decisions

#### 1. **Dual Scoring Strategy**
- **User Trust Score**: Long-term reputation based on verification and behavior
- **Submission Quality Score**: Per-submission content assessment
- **Combined Weight**: Trust × Quality for clustering influence
- **Real-time Feedback**: Immediate scoring during chat interactions

#### 2. **Progressive Trust Model**
- **Accessibility First**: Basic functionality available to all users
- **Earned Privileges**: Enhanced features through verification
- **Community Validation**: Peer endorsement system
- **Behavioral Learning**: Historical accuracy influences future scoring

#### 3. **Multi-Factor Scoring**
```
Trust Score = Base (1.0) + Verification Bonuses + Historical Performance + Community Standing
Quality Score = Content Analysis + Media Evidence + Location Accuracy + AI Validation
Final Weight = (Trust Score × Quality Score) / 12
```

### Trust Scoring Implementation

#### Core Trust Score Calculator

```typescript
export interface TrustFactors {
  phoneVerification: number;
  ktpVerification: number;
  selfieVerification: number;
  socialVerification: number;
  communityEndorsements: number;
  historicalAccuracy: number;
  submissionHistory: number;
}

export interface TrustScoreBreakdown {
  currentScore: number;
  level: TrustLevel;
  factors: TrustFactors;
  nextLevelRequirements?: {
    level: TrustLevel;
    missing: string[];
    requiredScore: number;
  };
  lastCalculated: Date;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export class TrustScoreCalculator {
  
  async calculateTrustScore(userId: string): Promise<TrustScoreBreakdown> {
    // Fetch user data with all verification and activity history
    const userData = await this.getUserData(userId);
    
    let score = LIMITS.TRUST_SCORE.MIN; // Base score: 1.0
    const factors: TrustFactors = {
      phoneVerification: 0,
      ktpVerification: 0,
      selfieVerification: 0,
      socialVerification: 0,
      communityEndorsements: 0,
      historicalAccuracy: 0,
      submissionHistory: 0,
    };
    
    // 1. Verification Bonuses (Static)
    factors.phoneVerification = userData.phoneVerified ? 
      LIMITS.TRUST_SCORE.PHONE_VERIFICATION_BONUS : 0;
    
    factors.ktpVerification = userData.ktpVerified ? 
      LIMITS.TRUST_SCORE.KTP_VERIFICATION_BONUS : 0;
    
    factors.selfieVerification = userData.selfieVerified ? 
      LIMITS.TRUST_SCORE.SELFIE_VERIFICATION_BONUS : 0;
    
    factors.socialVerification = userData.socialVerified ? 
      LIMITS.TRUST_SCORE.SOCIAL_VERIFICATION_BONUS : 0;
    
    // 2. Community Endorsements (Capped)
    const endorsementCount = userData.endorsements.length;
    factors.communityEndorsements = Math.min(
      endorsementCount * LIMITS.TRUST_SCORE.COMMUNITY_ENDORSEMENT_BONUS,
      0.5 // Maximum 0.5 points from endorsements
    );
    
    // 3. Historical Accuracy (Performance-based)
    if (userData.submissionCount > 0) {
      const accuracyMetrics = await this.calculateAccuracyMetrics(userData);
      factors.historicalAccuracy = this.computeAccuracyScore(accuracyMetrics);
    }
    
    // 4. Submission History (Experience bonus)
    factors.submissionHistory = this.computeExperienceBonus(userData.submissionCount);
    
    // Sum all factors
    const totalScore = Object.values(factors).reduce((sum, factor) => sum + factor, score);
    const finalScore = Math.min(totalScore, LIMITS.TRUST_SCORE.MAX);
    
    // Determine trust level
    const level = this.determineTrustLevel(finalScore);
    
    // Calculate trend
    const trend = await this.calculateTrustTrend(userId, finalScore);
    
    return {
      currentScore: finalScore,
      level,
      factors,
      nextLevelRequirements: this.getNextLevelRequirements(level, factors),
      lastCalculated: new Date(),
      trend,
    };
  }
  
  private async calculateAccuracyMetrics(userData: UserData): Promise<AccuracyMetrics> {
    const submissions = userData.submissions;
    
    // Get resolved submissions with government responses
    const resolvedSubmissions = submissions.filter(s => 
      s.issue?.status === 'RESOLVED' || s.issue?.responses?.length > 0
    );
    
    if (resolvedSubmissions.length === 0) {
      return { accuracyRatio: 0.5, responseQuality: 0.5 }; // Neutral score
    }
    
    // Calculate accuracy based on government responses
    let accuracySum = 0;
    let responseQualitySum = 0;
    
    for (const submission of resolvedSubmissions) {
      // Accuracy: Did the issue get acknowledged/resolved?
      const wasAcknowledged = submission.issue?.status !== 'REJECTED';
      accuracySum += wasAcknowledged ? 1 : 0;
      
      // Response quality: Government response time and thoroughness
      const responseTime = this.calculateResponseTime(submission);
      const responseQuality = this.assessResponseQuality(submission.issue?.responses || []);
      responseQualitySum += (responseTime + responseQuality) / 2;
    }
    
    return {
      accuracyRatio: accuracySum / resolvedSubmissions.length,
      responseQuality: responseQualitySum / resolvedSubmissions.length,
      sampleSize: resolvedSubmissions.length,
    };
  }
  
  private computeAccuracyScore(metrics: AccuracyMetrics): number {
    // Weight accuracy more heavily than response quality
    const weightedScore = (metrics.accuracyRatio * 0.7) + (metrics.responseQuality * 0.3);
    
    // Apply confidence based on sample size
    const confidenceMultiplier = Math.min(metrics.sampleSize / 5, 1.0); // Full confidence at 5+ samples
    
    return weightedScore * confidenceMultiplier * LIMITS.TRUST_SCORE.ACCURACY_BONUS_MAX;
  }
  
  private computeExperienceBonus(submissionCount: number): number {
    if (submissionCount <= 5) return 0;
    
    // Logarithmic scaling: 0.05 points per submission, max 0.3
    const bonus = Math.log(submissionCount / 5) * 0.1;
    return Math.min(bonus, LIMITS.TRUST_SCORE.SUBMISSION_HISTORY_MAX);
  }
  
  private determineTrustLevel(score: number): TrustLevel {
    if (score >= LIMITS.TRUST_SCORE.PREMIUM_THRESHOLD) return 'PREMIUM';
    if (score >= LIMITS.TRUST_SCORE.VERIFIED_THRESHOLD) return 'VERIFIED';
    return 'BASIC';
  }
  
  private async calculateTrustTrend(
    userId: string, 
    currentScore: number
  ): Promise<'increasing' | 'stable' | 'decreasing'> {
    
    const historicalScores = await this.getHistoricalTrustScores(userId, 30); // Last 30 days
    
    if (historicalScores.length < 2) return 'stable';
    
    const oldestScore = historicalScores[0].score;
    const recentAvg = historicalScores.slice(-7).reduce((sum, s) => sum + s.score, 0) / 7;
    
    const change = recentAvg - oldestScore;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }
  
  private getNextLevelRequirements(
    currentLevel: TrustLevel,
    factors: TrustFactors
  ): { level: TrustLevel; missing: string[]; requiredScore: number } | undefined {
    
    const missing: string[] = [];
    
    if (currentLevel === 'BASIC') {
      if (!factors.ktpVerification) missing.push('KTP verification');
      if (!factors.selfieVerification) missing.push('Selfie verification');
      
      return {
        level: 'VERIFIED',
        missing,
        requiredScore: LIMITS.TRUST_SCORE.VERIFIED_THRESHOLD,
      };
    }
    
    if (currentLevel === 'VERIFIED') {
      if (!factors.socialVerification) missing.push('Social media verification');
      if (factors.communityEndorsements < 0.3) missing.push('Community endorsements');
      if (factors.historicalAccuracy < 0.2) missing.push('Submission accuracy improvement');
      
      return {
        level: 'PREMIUM',
        missing,
        requiredScore: LIMITS.TRUST_SCORE.PREMIUM_THRESHOLD,
      };
    }
    
    return undefined; // Already at maximum level
  }
}
```

### Quality Scoring Implementation

#### Content Quality Assessment

```typescript
export interface QualityScoreBreakdown {
  textScore: number;
  mediaScore: number;
  locationScore: number;
  aiValidationScore: number;
  totalScore: number;
  grade: 'LOW' | 'MEDIUM' | 'HIGH';
  details: QualityAnalysisDetails;
}

export interface QualityAnalysisDetails {
  textAnalysis: {
    length: number;
    hasLocationReference: boolean;
    hasTimeReference: boolean;
    clarityScore: number;
    languageQuality: number;
  };
  mediaAnalysis: {
    imageCount: number;
    videoCount: number;
    qualityScore: number;
    hasGpsMetadata: boolean;
    relevanceScore: number;
  };
  locationAnalysis: {
    hasGpsCoordinates: boolean;
    addressSpecificity: number;
    accuracy: number;
    indonesianBounds: boolean;
  };
  aiValidation: {
    textImageConsistency: number;
    plausibilityScore: number;
    duplicateProbability: number;
    categoryConfidence: number;
  };
}

export class QualityScoreCalculator {
  private textAnalyzer: TextAnalyzer;
  private mediaAnalyzer: MediaAnalyzer;
  private locationAnalyzer: LocationAnalyzer;
  private aiValidator: AIValidator;
  
  constructor(private config: ScoringConfig) {
    this.textAnalyzer = new TextAnalyzer(config);
    this.mediaAnalyzer = new MediaAnalyzer(config);
    this.locationAnalyzer = new LocationAnalyzer(config);
    this.aiValidator = new AIValidator(config);
  }
  
  async calculateQualityScore(
    submission: SubmissionData,
    conversationHistory?: ConversationMessage[]
  ): Promise<QualityScoreBreakdown> {
    
    // Run all analyses in parallel for performance
    const [textAnalysis, mediaAnalysis, locationAnalysis, aiValidation] = await Promise.all([
      this.textAnalyzer.analyze(submission.description, submission.metadata?.language),
      this.mediaAnalyzer.analyze(submission.images || []),
      this.locationAnalyzer.analyze(submission.location),
      this.aiValidator.validate(submission, conversationHistory),
    ]);
    
    // Calculate component scores
    const textScore = this.calculateTextScore(textAnalysis);
    const mediaScore = this.calculateMediaScore(mediaAnalysis);
    const locationScore = this.calculateLocationScore(locationAnalysis);
    const aiValidationScore = this.calculateAIValidationScore(aiValidation);
    
    const totalScore = textScore + mediaScore + locationScore + aiValidationScore;
    const grade = this.determineGrade(totalScore);
    
    return {
      textScore,
      mediaScore,
      locationScore,
      aiValidationScore,
      totalScore,
      grade,
      details: {
        textAnalysis,
        mediaAnalysis,
        locationAnalysis,
        aiValidation,
      },
    };
  }
  
  private calculateTextScore(analysis: TextAnalysisResult): number {
    let score = 0;
    
    // Length scoring (0-1 points)
    if (analysis.length >= 50) score += 0.5;
    if (analysis.length >= 200) score += 0.5;
    
    // Location reference (0-1 points)
    if (analysis.hasLocationReference) score += 1;
    
    // Time reference (0-0.5 points)
    if (analysis.hasTimeReference) score += 0.5;
    
    // Clarity and language quality (0-1 points)
    const clarityBonus = (analysis.clarityScore + analysis.languageQuality) / 2;
    score += clarityBonus;
    
    return Math.min(score, LIMITS.QUALITY_SCORE.TEXT_SCORE_MAX);
  }
  
  private calculateMediaScore(analysis: MediaAnalysisResult): number {
    let score = 0;
    
    // Image count (0-2 points)
    score += Math.min(analysis.imageCount, 2);
    
    // Video bonus (0-2 points, videos are more valuable)
    if (analysis.videoCount > 0) score += 2;
    
    // Quality assessment (0-1 points)
    score += analysis.qualityScore;
    
    // GPS metadata (0-1 points)
    if (analysis.hasGpsMetadata) score += 1;
    
    // Relevance to description (0-1 points)
    score += analysis.relevanceScore;
    
    return Math.min(score, LIMITS.QUALITY_SCORE.MEDIA_SCORE_MAX);
  }
  
  private calculateLocationScore(analysis: LocationAnalysisResult): number {
    let score = 0;
    
    // GPS coordinates (0-1 points)
    if (analysis.hasGpsCoordinates) score += 1;
    
    // Address specificity (0-1 points)
    score += analysis.addressSpecificity;
    
    // Accuracy bonus/penalty (can be negative for very poor accuracy)
    const accuracyScore = this.mapAccuracyToScore(analysis.accuracy);
    score += accuracyScore;
    
    // Indonesian bounds validation
    if (!analysis.indonesianBounds) score *= 0.5; // Penalty for out-of-bounds
    
    return Math.max(0, Math.min(score, LIMITS.QUALITY_SCORE.LOCATION_SCORE_MAX));
  }
  
  private calculateAIValidationScore(validation: AIValidationResult): number {
    let score = 0;
    
    // Text-image consistency (0-2 points)
    score += validation.textImageConsistency * 2;
    
    // Plausibility (0-1 points)
    score += validation.plausibilityScore;
    
    // Duplicate penalty (negative points)
    score -= validation.duplicateProbability;
    
    // Category confidence bonus (0-1 points)
    score += validation.categoryConfidence;
    
    return Math.max(0, Math.min(score, LIMITS.QUALITY_SCORE.AI_VALIDATION_MAX));
  }
  
  private determineGrade(totalScore: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (totalScore >= LIMITS.QUALITY_SCORE.HIGH_QUALITY_THRESHOLD) return 'HIGH';
    if (totalScore >= LIMITS.QUALITY_SCORE.MEDIUM_QUALITY_THRESHOLD) return 'MEDIUM';
    return 'LOW';
  }
}
```

#### Text Analysis Engine

```typescript
export class TextAnalyzer {
  private languageDetector: LanguageDetector;
  private locationExtractor: LocationExtractor;
  private timeExtractor: TimeExtractor;
  
  constructor(private config: ScoringConfig) {
    this.languageDetector = new LanguageDetector();
    this.locationExtractor = new LocationExtractor();
    this.timeExtractor = new TimeExtractor();
  }
  
  async analyze(text: string, language?: LanguageCode): Promise<TextAnalysisResult> {
    const detectedLanguage = language || this.languageDetector.detect(text);
    
    // Basic metrics
    const length = text.trim().length;
    const wordCount = text.trim().split(/\s+/).length;
    const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    
    // Content analysis
    const hasLocationReference = this.locationExtractor.hasLocationReference(text, detectedLanguage);
    const hasTimeReference = this.timeExtractor.hasTimeReference(text, detectedLanguage);
    
    // Quality assessments
    const clarityScore = await this.assessClarity(text, detectedLanguage);
    const languageQuality = this.assessLanguageQuality(text, detectedLanguage);
    
    return {
      length,
      wordCount,
      sentenceCount,
      hasLocationReference,
      hasTimeReference,
      clarityScore,
      languageQuality,
      detectedLanguage,
    };
  }
  
  private async assessClarity(text: string, language: LanguageCode): Promise<number> {
    // Rule-based clarity assessment for Indonesian text
    let score = 0.5; // Base score
    
    // Sentence structure
    const avgWordsPerSentence = text.split(/[.!?]+/).reduce((acc, sentence) => {
      const words = sentence.trim().split(/\s+/).length;
      return acc + words;
    }, 0) / Math.max(1, text.split(/[.!?]+/).length);
    
    // Optimal sentence length: 8-20 words
    if (avgWordsPerSentence >= 8 && avgWordsPerSentence <= 20) {
      score += 0.3;
    }
    
    // Specific problem description keywords
    const problemKeywords = this.getProblemKeywords(language);
    const keywordMatches = problemKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    
    if (keywordMatches >= 2) score += 0.2;
    
    // Avoid excessive repetition
    const uniqueWords = new Set(text.toLowerCase().split(/\s+/));
    const repetitionRatio = uniqueWords.size / text.split(/\s+/).length;
    if (repetitionRatio > 0.7) score += 0.2;
    
    return Math.min(score, 1.0);
  }
  
  private assessLanguageQuality(text: string, language: LanguageCode): number {
    let score = 0.5; // Base score
    
    // Check for common Indonesian language patterns
    if (language === 'id') {
      // Proper Indonesian grammar indicators
      const grammarPatterns = [
        /\b(yang|ini|itu|tersebut)\b/i, // Demonstratives
        /\b(dengan|untuk|dari|ke|pada)\b/i, // Prepositions
        /\b(sudah|sedang|akan|telah)\b/i, // Aspect markers
      ];
      
      const patternMatches = grammarPatterns.filter(pattern => 
        pattern.test(text)
      ).length;
      
      score += Math.min(patternMatches * 0.15, 0.45);
    }
    
    // Penalize excessive informal language (but don't eliminate it)
    const informalPatterns = /\b(gue|gw|lu|lo|banget|dong|sih)\b/gi;
    const informalMatches = (text.match(informalPatterns) || []).length;
    const informalRatio = informalMatches / text.split(/\s+/).length;
    
    if (informalRatio > 0.3) score -= 0.2; // Heavy informal usage penalty
    
    return Math.max(0.1, Math.min(score, 1.0));
  }
  
  private getProblemKeywords(language: LanguageCode): string[] {
    const keywords = {
      id: [
        'rusak', 'bocor', 'bermasalah', 'tidak berfungsi', 'mati',
        'kotor', 'bau', 'tersumbat', 'tumpah', 'pecah',
        'bahaya', 'berbahaya', 'rawan', 'licin', 'gelap'
      ],
      jv: [
        'rusak', 'bocor', 'ora iso', 'mati', 'angel',
        'kotor', 'mambu', 'buntu', 'tumpah', 'pecah'
      ],
      su: [
        'rusak', 'bocor', 'teu tiasa', 'paeh', 'angel',
        'kotor', 'bau', 'buntu', 'tumpah', 'pecah'
      ],
    };
    
    return keywords[language] || keywords.id;
  }
}
```

### Anti-Abuse Detection System

#### Spam and Fraud Detection

```typescript
export class AbuseDetector {
  private duplicateDetector: DuplicateDetector;
  private behaviorAnalyzer: BehaviorAnalyzer;
  private contentAnalyzer: ContentAnalyzer;
  
  constructor(private config: ScoringConfig) {
    this.duplicateDetector = new DuplicateDetector(config);
    this.behaviorAnalyzer = new BehaviorAnalyzer(config);
    this.contentAnalyzer = new ContentAnalyzer(config);
  }
  
  async detectAbuse(
    submission: SubmissionData,
    userHistory: UserHistory,
    context: SubmissionContext
  ): Promise<AbuseDetectionResult> {
    
    // Run multiple detection algorithms
    const [duplicateResult, behaviorResult, contentResult] = await Promise.all([
      this.duplicateDetector.check(submission, context.nearbySubmissions),
      this.behaviorAnalyzer.analyze(userHistory, context.timeWindow),
      this.contentAnalyzer.analyze(submission.description, submission.images),
    ]);
    
    // Calculate composite abuse score
    const abuseScore = this.calculateAbuseScore(
      duplicateResult,
      behaviorResult,
      contentResult
    );
    
    // Determine action based on score and trust level
    const action = this.determineAction(abuseScore, context.userTrustLevel);
    
    return {
      abuseScore,
      action,
      reasons: this.collectReasons(duplicateResult, behaviorResult, contentResult),
      details: {
        duplicateAnalysis: duplicateResult,
        behaviorAnalysis: behaviorResult,
        contentAnalysis: contentResult,
      },
      confidence: this.calculateConfidence(duplicateResult, behaviorResult, contentResult),
    };
  }
  
  private calculateAbuseScore(
    duplicateResult: DuplicateDetectionResult,
    behaviorResult: BehaviorAnalysisResult,
    contentResult: ContentAnalysisResult
  ): number {
    
    const weights = {
      duplicate: 0.4,
      behavior: 0.35,
      content: 0.25,
    };
    
    return (
      duplicateResult.similarity * weights.duplicate +
      behaviorResult.suspicionLevel * weights.behavior +
      contentResult.spamProbability * weights.content
    );
  }
  
  private determineAction(
    abuseScore: number,
    userTrustLevel: TrustLevel
  ): 'allow' | 'flag' | 'require_review' | 'reject' {
    
    // Trust level adjusts thresholds
    const thresholds = {
      BASIC: { flag: 0.3, review: 0.6, reject: 0.8 },
      VERIFIED: { flag: 0.4, review: 0.7, reject: 0.9 },
      PREMIUM: { flag: 0.5, review: 0.8, reject: 0.95 },
    };
    
    const threshold = thresholds[userTrustLevel];
    
    if (abuseScore >= threshold.reject) return 'reject';
    if (abuseScore >= threshold.review) return 'require_review';
    if (abuseScore >= threshold.flag) return 'flag';
    return 'allow';
  }
}

export class DuplicateDetector {
  
  async check(
    submission: SubmissionData,
    nearbySubmissions: SubmissionData[]
  ): Promise<DuplicateDetectionResult> {
    
    let maxSimilarity = 0;
    let mostSimilarSubmission: SubmissionData | null = null;
    
    for (const nearby of nearbySubmissions) {
      // Skip if different categories
      if (nearby.category !== submission.category) continue;
      
      // Calculate text similarity
      const textSimilarity = await this.calculateTextSimilarity(
        submission.description,
        nearby.description
      );
      
      // Calculate location proximity
      const locationSimilarity = this.calculateLocationSimilarity(
        submission.location,
        nearby.location
      );
      
      // Calculate time proximity
      const timeSimilarity = this.calculateTimeSimilarity(
        submission.timestamp,
        nearby.timestamp
      );
      
      // Combined similarity with weights
      const combinedSimilarity = (
        textSimilarity * 0.5 +
        locationSimilarity * 0.3 +
        timeSimilarity * 0.2
      );
      
      if (combinedSimilarity > maxSimilarity) {
        maxSimilarity = combinedSimilarity;
        mostSimilarSubmission = nearby;
      }
    }
    
    return {
      similarity: maxSimilarity,
      isDuplicate: maxSimilarity > 0.8,
      mostSimilarSubmission,
      confidence: this.calculateDuplicateConfidence(maxSimilarity),
    };
  }
  
  private async calculateTextSimilarity(text1: string, text2: string): Promise<number> {
    // Use TF-IDF cosine similarity for Indonesian text
    const tokens1 = this.tokenize(text1);
    const tokens2 = this.tokenize(text2);
    
    if (tokens1.length === 0 || tokens2.length === 0) return 0;
    
    // Calculate TF-IDF vectors
    const allTokens = [...new Set([...tokens1, ...tokens2])];
    const vector1 = this.calculateTfIdf(tokens1, allTokens);
    const vector2 = this.calculateTfIdf(tokens2, allTokens);
    
    // Cosine similarity
    return this.cosineSimilarity(vector1, vector2);
  }
  
  private tokenize(text: string): string[] {
    // Indonesian-aware tokenization
    const stopWords = new Set([
      'yang', 'ini', 'itu', 'di', 'ke', 'dari', 'untuk', 'dengan',
      'pada', 'dalam', 'oleh', 'adalah', 'akan', 'sudah', 'telah',
      'dan', 'atau', 'tapi', 'tetapi', 'juga', 'serta'
    ]);
    
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(token => token.length > 2 && !stopWords.has(token));
  }
  
  private calculateLocationSimilarity(
    loc1: LocationData,
    loc2: LocationData
  ): number {
    if (!loc1.coordinates || !loc2.coordinates) return 0;
    
    const distance = this.calculateDistance(
      loc1.coordinates[0], loc1.coordinates[1],
      loc2.coordinates[0], loc2.coordinates[1]
    );
    
    // Similarity decreases with distance (within 100m = 1.0, beyond 1km = 0.0)
    return Math.max(0, 1 - (distance / 1000));
  }
  
  private calculateTimeSimilarity(time1: Date, time2: Date): number {
    const timeDiff = Math.abs(time1.getTime() - time2.getTime());
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    // Similarity decreases with time (within 1 hour = 1.0, beyond 24 hours = 0.0)
    return Math.max(0, 1 - (hoursDiff / 24));
  }
}
```

### Real-Time Scoring Pipeline

#### Live Quality Feedback

```typescript
export class RealTimeScorer {
  private qualityCalculator: QualityScoreCalculator;
  private abuseDetector: AbuseDetector;
  private feedbackGenerator: FeedbackGenerator;
  
  constructor(config: ScoringConfig) {
    this.qualityCalculator = new QualityScoreCalculator(config);
    this.abuseDetector = new AbuseDetector(config);
    this.feedbackGenerator = new FeedbackGenerator(config);
  }
  
  async scoreInProgress(
    partialSubmission: Partial<SubmissionData>,
    conversationHistory: ConversationMessage[],
    userContext: UserContext
  ): Promise<RealTimeScoreResult> {
    
    // Calculate current quality score
    const qualityScore = await this.qualityCalculator.calculatePartialScore(
      partialSubmission,
      conversationHistory
    );
    
    // Check for potential abuse signals
    const abuseSignals = await this.abuseDetector.checkEarlyWarnings(
      partialSubmission,
      userContext
    );
    
    // Generate actionable feedback
    const feedback = this.feedbackGenerator.generateProgressFeedback(
      qualityScore,
      abuseSignals,
      userContext.language
    );
    
    return {
      currentQualityScore: qualityScore.totalScore,
      completeness: this.calculateCompleteness(partialSubmission),
      feedback,
      warnings: abuseSignals.warnings,
      suggestions: this.generateImprovementSuggestions(qualityScore, userContext.language),
    };
  }
  
  private generateImprovementSuggestions(
    qualityScore: Partial<QualityScoreBreakdown>,
    language: LanguageCode
  ): string[] {
    
    const suggestions: string[] = [];
    
    // Text improvement suggestions
    if (qualityScore.textScore && qualityScore.textScore < 2) {
      if (qualityScore.details?.textAnalysis.length < 50) {
        suggestions.push(getText('suggestion_more_detail', language));
      }
      if (!qualityScore.details?.textAnalysis.hasLocationReference) {
        suggestions.push(getText('suggestion_add_location', language));
      }
    }
    
    // Media suggestions
    if (!qualityScore.mediaScore || qualityScore.mediaScore < 2) {
      suggestions.push(getText('suggestion_add_photo', language));
    }
    
    // Location suggestions
    if (!qualityScore.locationScore || qualityScore.locationScore < 1) {
      suggestions.push(getText('suggestion_enable_gps', language));
    }
    
    return suggestions;
  }
}
```

### Performance Optimization

#### Scoring Cache and Batch Processing

```typescript
export class ScoringCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 30 * 60 * 1000; // 30 minutes
  
  async getCachedScore<T>(
    key: string,
    calculator: () => Promise<T>
  ): Promise<T> {
    
    const cached = this.cache.get(key);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.value as T;
    }
    
    const value = await calculator();
    
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.TTL,
      hits: 1,
    });
    
    return value;
  }
  
  generateScoreKey(type: string, inputs: any): string {
    return `${type}:${JSON.stringify(inputs)}`;
  }
}

export class BatchScoreProcessor {
  private queue: ScoringJob[] = [];
  private processing = false;
  
  async queueScoring(job: ScoringJob): Promise<void> {
    this.queue.push(job);
    
    if (!this.processing) {
      this.processBatch();
    }
  }
  
  private async processBatch(): Promise<void> {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, 50); // Process 50 at a time
      
      await Promise.all(
        batch.map(job => this.processJob(job).catch(console.error))
      );
    }
    
    this.processing = false;
  }
  
  private async processJob(job: ScoringJob): Promise<void> {
    switch (job.type) {
      case 'trust_recalculation':
        await this.recalculateTrustScore(job.userId);
        break;
      case 'quality_scoring':
        await this.scoreSubmissionQuality(job.submissionId);
        break;
      case 'abuse_detection':
        await this.runAbuseDetection(job.submissionId);
        break;
    }
  }
}
```

### Future Considerations

#### 1. **Machine Learning Integration**
- **Adaptive Thresholds**: ML-based threshold optimization
- **Behavioral Models**: User behavior prediction models
- **Fraud Detection**: Advanced ML fraud detection algorithms

#### 2. **Community-Driven Scoring**
- **Peer Review**: Community validation of submissions
- **Crowdsourced Quality**: User-driven quality assessment
- **Reputation Networks**: Social trust networks

#### 3. **Government Integration**
- **Official Feedback**: Government response quality scoring
- **Resolution Tracking**: Outcome-based trust adjustment
- **Policy Impact**: Scoring system policy recommendations

This scoring architecture provides robust protection against abuse while maintaining fairness and encouraging legitimate user participation across all trust levels.