# AI Implementation Documentation
## Suara.id AI/ML Processing Architecture

### Overview

The AI package provides intelligent processing capabilities for Suara.id, including conversational AI for chat interactions, content classification, multi-language understanding, and issue clustering. The system is designed to handle Indonesian languages and cultural contexts while maintaining high accuracy and performance.

### Architecture Decisions

#### 1. **Multi-Provider AI Strategy**
- **Primary**: OpenAI GPT-4 for robust Indonesian language support
- **Secondary**: Anthropic Claude as fallback and specialized tasks
- **Fallback**: Rule-based systems for offline/budget scenarios
- **Benefits**: Redundancy, cost optimization, feature specialization

#### 2. **Conversation-First Design**
- **Pattern**: Natural language interaction over form filling
- **Context**: Multi-turn conversation state management
- **Adaptability**: Dynamic conversation flow based on user responses
- **Cultural Sensitivity**: Indonesian communication patterns

#### 3. **Real-Time + Batch Processing**
- **Real-Time**: Chat responses, immediate classification
- **Batch**: Issue clustering, trend analysis, model training
- **Hybrid**: Quality scoring with real-time feedback

### Conversation Management System

#### Core Conversation Engine

```typescript
export interface ConversationState {
  id: string;
  userId: string;
  stage: ConversationStage;
  language: LanguageCode;
  extractedData: Partial<SubmissionData>;
  context: ConversationContext;
  history: ConversationMessage[];
  completeness: number; // 0-1 scale
  missingFields: string[];
  lastInteraction: Date;
}

export type ConversationStage = 
  | 'greeting'
  | 'problem_description'
  | 'location_gathering'
  | 'media_request'
  | 'clarification'
  | 'confirmation'
  | 'complete';

export interface ConversationContext {
  userPreferences: {
    language: LanguageCode;
    communicationStyle: 'formal' | 'informal';
    previousSubmissions: number;
  };
  detectedInfo: {
    problemType?: IssueCategory;
    urgencyLevel?: 'low' | 'medium' | 'high' | 'emergency';
    locationHints?: string[];
    timeReferences?: string[];
  };
  sessionData: {
    startTime: Date;
    messageCount: number;
    mediaUploaded: boolean;
    locationShared: boolean;
  };
}
```

#### Conversation Flow Controller

```typescript
export class ConversationManager {
  private llmProvider: LLMProvider;
  private languageDetector: LanguageDetector;
  private contextExtractor: ContextExtractor;
  
  constructor(
    private config: AiConfig,
    private conversationStore: ConversationStore
  ) {
    this.llmProvider = new LLMProvider(config);
    this.languageDetector = new LanguageDetector();
    this.contextExtractor = new ContextExtractor();
  }
  
  async processMessage(
    conversationId: string,
    userMessage: string,
    messageType: MessageType = 'text'
  ): Promise<ConversationResponse> {
    
    // Load conversation state
    const conversation = await this.conversationStore.get(conversationId);
    
    // Detect language and update if needed
    const detectedLanguage = this.languageDetector.detect(userMessage);
    if (detectedLanguage !== conversation.language) {
      conversation.language = detectedLanguage;
    }
    
    // Extract context from message
    const extractedContext = await this.contextExtractor.extract(
      userMessage,
      conversation.context
    );
    
    // Update conversation context
    conversation.context = this.mergeContext(
      conversation.context,
      extractedContext
    );
    
    // Determine next stage based on current state and input
    const nextStage = await this.determineNextStage(conversation, userMessage);
    
    // Generate appropriate response
    const response = await this.generateResponse(
      conversation,
      userMessage,
      nextStage
    );
    
    // Update conversation state
    conversation.stage = nextStage;
    conversation.history.push(
      { role: 'user', content: userMessage, timestamp: new Date() },
      { role: 'bot', content: response.content, timestamp: new Date() }
    );
    conversation.completeness = this.calculateCompleteness(conversation);
    conversation.lastInteraction = new Date();
    
    // Save updated state
    await this.conversationStore.save(conversation);
    
    return response;
  }
  
  private async determineNextStage(
    conversation: ConversationState,
    userMessage: string
  ): Promise<ConversationStage> {
    const { stage, extractedData, context } = conversation;
    
    // Stage transition logic
    switch (stage) {
      case 'greeting':
        // Move to problem description if user mentions an issue
        if (this.containsProblemReference(userMessage)) {
          return 'problem_description';
        }
        return 'greeting';
        
      case 'problem_description':
        // Check if we have enough problem details
        if (extractedData.description && extractedData.description.length > 20) {
          // If location hints detected, go to location gathering
          if (context.detectedInfo.locationHints?.length > 0) {
            return 'location_gathering';
          }
          // Otherwise, request location
          return 'location_gathering';
        }
        return 'problem_description';
        
      case 'location_gathering':
        // Check if location is provided
        if (extractedData.location || this.containsLocationInfo(userMessage)) {
          return 'media_request';
        }
        return 'location_gathering';
        
      case 'media_request':
        // If media uploaded or declined, move to confirmation
        if (context.sessionData.mediaUploaded || 
            this.containsMediaDecline(userMessage)) {
          return 'confirmation';
        }
        return 'media_request';
        
      case 'clarification':
        // Return to appropriate stage based on what was clarified
        return this.determineClarificationTarget(conversation, userMessage);
        
      case 'confirmation':
        // Check if user confirms or requests changes
        if (this.isConfirmation(userMessage)) {
          return 'complete';
        } else if (this.isRejection(userMessage)) {
          return 'clarification';
        }
        return 'confirmation';
        
      default:
        return stage;
    }
  }
  
  private async generateResponse(
    conversation: ConversationState,
    userMessage: string,
    nextStage: ConversationStage
  ): Promise<ConversationResponse> {
    
    const prompt = this.buildPrompt(conversation, userMessage, nextStage);
    
    try {
      const llmResponse = await this.llmProvider.complete({
        prompt,
        language: conversation.language,
        maxTokens: 150,
        temperature: 0.7,
      });
      
      const response = this.parseResponse(llmResponse, nextStage);
      
      return {
        content: response.message,
        stage: nextStage,
        followUpQuestions: response.followUpQuestions,
        suggestedActions: this.getSuggestedActions(nextStage),
        conversationState: {
          stage: nextStage,
          completeness: this.calculateCompleteness(conversation),
          missingFields: this.getMissingFields(conversation),
        },
      };
      
    } catch (error) {
      // Fallback to rule-based response
      return this.generateFallbackResponse(conversation, nextStage);
    }
  }
}
```

### Indonesian Language Processing

#### Multi-Language Detection and Processing

```typescript
export class LanguageDetector {
  private patterns: Map<LanguageCode, RegExp[]>;
  private commonPhrases: Map<LanguageCode, string[]>;
  
  constructor() {
    this.initializePatterns();
  }
  
  detect(text: string): LanguageCode {
    const normalizedText = text.toLowerCase();
    const scores = new Map<LanguageCode, number>();
    
    // Pattern-based detection
    for (const [langCode, patterns] of this.patterns.entries()) {
      const matches = patterns.filter(pattern => pattern.test(normalizedText));
      scores.set(langCode, matches.length);
    }
    
    // Phrase-based detection
    for (const [langCode, phrases] of this.commonPhrases.entries()) {
      const phraseMatches = phrases.filter(phrase => 
        normalizedText.includes(phrase.toLowerCase())
      );
      const currentScore = scores.get(langCode) || 0;
      scores.set(langCode, currentScore + phraseMatches.length * 0.5);
    }
    
    // Find highest scoring language (minimum threshold: 1.0)
    const sortedScores = [...scores.entries()]
      .sort(([,a], [,b]) => b - a);
      
    const [topLanguage, topScore] = sortedScores[0] || ['id', 0];
    
    return topScore >= 1.0 ? topLanguage : 'id'; // Default to Indonesian
  }
  
  private initializePatterns(): void {
    this.patterns = new Map([
      ['id', [
        /\b(saya|aku|gue|gw|ane)\b/i, // pronouns
        /\b(ini|itu|yang|dengan|untuk)\b/i, // common words
        /\b(tidak|nggak|enggak|gak|ga)\b/i, // negation
        /\b(sudah|udah|belum|akan)\b/i, // temporal markers
        /\b(di|ke|dari|sama|sama)\b/i, // prepositions
      ]],
      
      ['jv', [
        /\b(aku|kowe|awakmu|kowé)\b/i, // Javanese pronouns
        /\b(ning|karo|lan|kaliyan)\b/i, // conjunctions
        /\b(ora|gak|mboten|boten)\b/i, // negation
        /\b(wis|durung|lagi|nembe)\b/i, // temporal
        /\b(monggo|nuwun|matur|sugeng)\b/i, // politeness
      ]],
      
      ['su', [
        /\b(abdi|aing|maneh|anjeun)\b/i, // Sundanese pronouns
        /\b(jeung|sareng|kalawan|kaliyan)\b/i, // conjunctions
        /\b(henteu|teu|moal|can)\b/i, // negation
        /\b(parantos|can|keur|badé)\b/i, // temporal
        /\b(punten|hatur|nuhun|wilujeng)\b/i, // politeness
      ]],
    ]);
    
    this.commonPhrases = new Map([
      ['id', [
        'terima kasih', 'selamat pagi', 'selamat siang', 'selamat sore',
        'maaf', 'permisi', 'bagaimana', 'dimana', 'kapan', 'kenapa',
        'jalan rusak', 'sampah berserakan', 'lampu mati'
      ]],
      
      ['jv', [
        'matur nuwun', 'sugeng enjing', 'sugeng siang', 'sugeng sonten',
        'nyuwun pangapunten', 'pripun', 'pundi', 'kapan', 'kenging menapa',
        'dalan rusak', 'sampah buyar', 'lampu mati'
      ]],
      
      ['su', [
        'hatur nuhun', 'wilujeng enjing', 'wilujeng siang', 'wilujeng sonten',
        'hapunten', 'kumaha', 'dimana', 'iraha', 'naon sebabna',
        'jalan rusak', 'sampah kasebar', 'lampu pareum'
      ]],
    ]);
  }
}
```

#### Context Extraction Engine

```typescript
export class ContextExtractor {
  private categoryKeywords: Map<IssueCategory, string[]>;
  private urgencyIndicators: Map<string, 'low' | 'medium' | 'high' | 'emergency'>;
  private locationPatterns: RegExp[];
  private timePatterns: RegExp[];
  
  constructor() {
    this.initializeExtractionRules();
  }
  
  async extract(
    message: string,
    existingContext: ConversationContext
  ): Promise<Partial<ConversationContext>> {
    
    const updates: Partial<ConversationContext> = {
      detectedInfo: { ...existingContext.detectedInfo },
    };
    
    // Extract problem category
    const detectedCategory = this.extractCategory(message);
    if (detectedCategory) {
      updates.detectedInfo!.problemType = detectedCategory;
    }
    
    // Extract urgency level
    const urgencyLevel = this.extractUrgency(message);
    if (urgencyLevel) {
      updates.detectedInfo!.urgencyLevel = urgencyLevel;
    }
    
    // Extract location hints
    const locationHints = this.extractLocationHints(message);
    if (locationHints.length > 0) {
      updates.detectedInfo!.locationHints = [
        ...(existingContext.detectedInfo.locationHints || []),
        ...locationHints,
      ];
    }
    
    // Extract time references
    const timeReferences = this.extractTimeReferences(message);
    if (timeReferences.length > 0) {
      updates.detectedInfo!.timeReferences = [
        ...(existingContext.detectedInfo.timeReferences || []),
        ...timeReferences,
      ];
    }
    
    return updates;
  }
  
  private extractCategory(message: string): IssueCategory | undefined {
    const normalizedMessage = message.toLowerCase();
    
    for (const [category, keywords] of this.categoryKeywords.entries()) {
      const matchCount = keywords.filter(keyword => 
        normalizedMessage.includes(keyword.toLowerCase())
      ).length;
      
      if (matchCount >= 2) { // Require multiple keyword matches
        return category;
      }
    }
    
    return undefined;
  }
  
  private extractLocationHints(message: string): string[] {
    const hints: string[] = [];
    
    // Indonesian location patterns
    const locationPatterns = [
      /(?:di|dekat|sekitar|daerah)\s+([^,.!?]+)/gi, // "di/dekat/sekitar X"
      /([^,.!?]+)\s+(?:kelurahan|kecamatan|kabupaten)/gi, // "X kelurahan"
      /(jalan|jl\.?)\s+([^,.!?]+)/gi, // "Jalan X"
      /(gang|gg\.?)\s+([^,.!?]+)/gi, // "Gang X"
      /(?:warung|toko|pasar|sekolah|masjid|gereja)\s+([^,.!?]+)/gi, // landmarks
    ];
    
    for (const pattern of locationPatterns) {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        const location = match[1] || match[2];
        if (location && location.trim().length > 2) {
          hints.push(location.trim());
        }
      }
    }
    
    return [...new Set(hints)]; // Remove duplicates
  }
  
  private extractTimeReferences(message: string): string[] {
    const timeRefs: string[] = [];
    
    const timePatterns = [
      /(?:kemarin|tadi|sejak|sudah)\s+([^,.!?]+)/gi,
      /(\d+)\s*(?:hari|minggu|bulan|tahun)\s*(?:yang\s+)?(?:lalu|lalu)/gi,
      /(?:pagi|siang|sore|malam)\s*(?:ini|kemarin|tadi)/gi,
      /(?:jam|pukul)\s*(\d{1,2}(?::\d{2})?)/gi,
    ];
    
    for (const pattern of timePatterns) {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        timeRefs.push(match[0]);
      }
    }
    
    return timeRefs;
  }
  
  private initializeExtractionRules(): void {
    this.categoryKeywords = new Map([
      ['INFRASTRUCTURE', [
        'jalan', 'rusak', 'lubang', 'berlubang', 'trotoar', 'jembatan',
        'aspal', 'paving', 'halte', 'bus', 'terminal', 'stasiun'
      ]],
      
      ['CLEANLINESS', [
        'sampah', 'kotor', 'bau', 'tumpah', 'berserakan', 'tempat sampah',
        'TPS', 'selokan', 'comberan', 'got', 'banjir', 'genangan'
      ]],
      
      ['LIGHTING', [
        'lampu', 'gelap', 'mati', 'putus', 'penerangan', 'listrik',
        'PJU', 'lampu jalan', 'terang', 'redup'
      ]],
      
      ['WATER_DRAINAGE', [
        'air', 'banjir', 'genangan', 'saluran', 'drainase', 'selokan',
        'PAM', 'PDAM', 'kran', 'pipa', 'bocor', 'tersumbat'
      ]],
      
      ['ENVIRONMENT', [
        'pohon', 'tumbang', 'ranting', 'daun', 'taman', 'hijau',
        'polusi', 'asap', 'debu', 'bising', 'kebisingan'
      ]],
      
      ['SAFETY', [
        'bahaya', 'rawan', 'keamanan', 'rambu', 'traffic light',
        'lampu merah', 'pagar', 'lubang', 'dalam', 'mencurigakan'
      ]],
    ]);
    
    this.urgencyIndicators = new Map([
      ['darurat', 'emergency'],
      ['urgent', 'emergency'], 
      ['bahaya', 'high'],
      ['segera', 'high'],
      ['penting', 'high'],
      ['mendesak', 'high'],
      ['parah', 'medium'],
      ['mengganggu', 'medium'],
      ['biasa', 'low'],
      ['tidak mendesak', 'low'],
    ]);
  }
}
```

### Content Classification System

#### AI-Powered Issue Classification

```typescript
export class IssueClassifier {
  private llmProvider: LLMProvider;
  private fallbackClassifier: RuleBasedClassifier;
  
  constructor(private config: AiConfig) {
    this.llmProvider = new LLMProvider(config);
    this.fallbackClassifier = new RuleBasedClassifier();
  }
  
  async classifyIssue(
    description: string,
    images?: string[],
    location?: LocationData,
    language: LanguageCode = 'id'
  ): Promise<ClassificationResult> {
    
    try {
      // Multi-modal classification with LLM
      const llmResult = await this.classifyWithLLM(
        description,
        images,
        location,
        language
      );
      
      // Validate with rule-based system
      const ruleResult = this.fallbackClassifier.classify(description, language);
      
      // Combine results for higher accuracy
      return this.combineClassificationResults(llmResult, ruleResult);
      
    } catch (error) {
      console.warn('LLM classification failed, using fallback:', error);
      return this.fallbackClassifier.classify(description, language);
    }
  }
  
  private async classifyWithLLM(
    description: string,
    images?: string[],
    location?: LocationData,
    language: LanguageCode = 'id'
  ): Promise<ClassificationResult> {
    
    const prompt = this.buildClassificationPrompt(
      description,
      images,
      location,
      language
    );
    
    const response = await this.llmProvider.complete({
      prompt,
      language,
      maxTokens: 200,
      temperature: 0.3, // Lower temperature for more consistent classification
      responseFormat: 'json',
    });
    
    return this.parseClassificationResponse(response);
  }
  
  private buildClassificationPrompt(
    description: string,
    images?: string[],
    location?: LocationData,
    language: LanguageCode = 'id'
  ): string {
    
    const categories = Object.entries(CATEGORY_METADATA)
      .map(([key, meta]) => `${key}: ${meta.label} - ${meta.description}`)
      .join('\n');
    
    const basePrompt = language === 'id' ? `
Kamu adalah sistem klasifikasi masalah infrastruktur untuk Indonesia. 
Analisis deskripsi masalah berikut dan tentukan kategori yang paling sesuai.

Kategori yang tersedia:
${categories}

Deskripsi masalah: "${description}"
${location ? `Lokasi: ${location.address}` : ''}
${images ? `Jumlah gambar: ${images.length}` : ''}

Berikan respons dalam format JSON dengan struktur:
{
  "category": "KATEGORI_YANG_DIPILIH",
  "confidence": 0.95,
  "reasoning": "alasan pemilihan kategori",
  "severity": "low|medium|high|critical",
  "keywords": ["kata", "kunci", "yang", "relevan"],
  "alternatives": [
    {"category": "ALTERNATIF_1", "confidence": 0.75},
    {"category": "ALTERNATIF_2", "confidence": 0.60}
  ]
}
` : `
You are an infrastructure issue classification system for Indonesia.
Analyze the following issue description and determine the most appropriate category.

Available categories:
${categories}

Issue description: "${description}"
${location ? `Location: ${location.address}` : ''}
${images ? `Number of images: ${images.length}` : ''}

Provide response in JSON format with structure:
{
  "category": "SELECTED_CATEGORY",
  "confidence": 0.95,
  "reasoning": "reason for category selection",
  "severity": "low|medium|high|critical",
  "keywords": ["relevant", "keywords"],
  "alternatives": [
    {"category": "ALTERNATIVE_1", "confidence": 0.75},
    {"category": "ALTERNATIVE_2", "confidence": 0.60}
  ]
}
`;

    return basePrompt;
  }
  
  private parseClassificationResponse(response: string): ClassificationResult {
    try {
      const parsed = JSON.parse(response);
      
      return {
        category: parsed.category as IssueCategory,
        confidence: Math.min(Math.max(parsed.confidence || 0, 0), 1),
        severity: parsed.severity as IssueSeverity,
        reasoning: parsed.reasoning || '',
        keywords: parsed.keywords || [],
        alternatives: parsed.alternatives || [],
        source: 'llm',
      };
    } catch (error) {
      throw new Error('Failed to parse LLM classification response');
    }
  }
  
  private combineClassificationResults(
    llmResult: ClassificationResult,
    ruleResult: ClassificationResult
  ): ClassificationResult {
    
    // If both agree and LLM confidence is high, use LLM result
    if (llmResult.category === ruleResult.category && llmResult.confidence > 0.8) {
      return { ...llmResult, confidence: Math.min(llmResult.confidence + 0.1, 1.0) };
    }
    
    // If LLM confidence is low, prefer rule-based result
    if (llmResult.confidence < 0.6) {
      return ruleResult;
    }
    
    // Otherwise, return LLM result with adjusted confidence
    return {
      ...llmResult,
      confidence: llmResult.confidence * 0.9, // Slight penalty for disagreement
      alternatives: [
        { category: ruleResult.category, confidence: ruleResult.confidence },
        ...llmResult.alternatives,
      ],
    };
  }
}
```

### Image Analysis Integration

#### Computer Vision for Issue Detection

```typescript
export class ImageAnalyzer {
  private visionProvider: VisionProvider;
  
  constructor(private config: AiConfig) {
    this.visionProvider = new VisionProvider(config);
  }
  
  async analyzeIssueImage(
    imageUrl: string,
    description?: string,
    expectedCategory?: IssueCategory
  ): Promise<ImageAnalysisResult> {
    
    try {
      const analysis = await this.visionProvider.analyzeImage({
        imageUrl,
        prompts: this.buildImageAnalysisPrompts(description, expectedCategory),
        features: ['objects', 'text', 'quality', 'location_context'],
      });
      
      return this.processImageAnalysis(analysis, expectedCategory);
      
    } catch (error) {
      console.error('Image analysis failed:', error);
      return this.generateFallbackAnalysis();
    }
  }
  
  private buildImageAnalysisPrompts(
    description?: string,
    expectedCategory?: IssueCategory
  ): string[] {
    
    const basePrompts = [
      "Identify infrastructure problems visible in this image (roads, buildings, utilities)",
      "Detect any safety hazards or dangerous conditions",
      "Describe the condition of public facilities shown",
      "Identify any waste, pollution, or cleanliness issues",
    ];
    
    if (description) {
      basePrompts.push(
        `Verify if the image matches this description: "${description}"`
      );
    }
    
    if (expectedCategory) {
      const categoryMeta = CATEGORY_METADATA[expectedCategory];
      basePrompts.push(
        `Look specifically for ${categoryMeta.label.toLowerCase()} issues like: ${categoryMeta.examples.join(', ')}`
      );
    }
    
    return basePrompts;
  }
  
  private processImageAnalysis(
    analysis: VisionAnalysisResult,
    expectedCategory?: IssueCategory
  ): ImageAnalysisResult {
    
    // Extract detected objects relevant to infrastructure issues
    const relevantObjects = this.filterRelevantObjects(analysis.objects);
    
    // Analyze image quality and suitability
    const qualityScore = this.calculateImageQuality(analysis);
    
    // Match detected issues with categories
    const detectedIssues = this.mapObjectsToCategories(relevantObjects);
    
    // Calculate consistency score with text description
    const consistencyScore = expectedCategory ? 
      this.calculateConsistency(detectedIssues, expectedCategory) : 1.0;
    
    return {
      detectedObjects: relevantObjects,
      qualityScore,
      detectedIssues,
      consistencyScore,
      recommendations: this.generateRecommendations(qualityScore, detectedIssues),
      metadata: {
        analysisTime: new Date(),
        confidence: analysis.confidence,
        provider: 'openai-vision',
      },
    };
  }
  
  private filterRelevantObjects(objects: DetectedObject[]): DetectedObject[] {
    const relevantKeywords = [
      // Infrastructure
      'road', 'street', 'pothole', 'crack', 'asphalt', 'concrete',
      'sidewalk', 'bridge', 'building', 'wall', 'fence',
      
      // Utilities
      'streetlight', 'lamp', 'pole', 'wire', 'cable', 'pipe',
      'drain', 'sewer', 'water', 'flooding',
      
      // Waste and cleanliness
      'trash', 'garbage', 'waste', 'litter', 'dirt', 'mud',
      'pollution', 'smoke', 'debris',
      
      // Safety hazards
      'danger', 'hazard', 'broken', 'damaged', 'collapse',
      'hole', 'gap', 'barrier', 'warning',
    ];
    
    return objects.filter(obj => 
      relevantKeywords.some(keyword => 
        obj.label.toLowerCase().includes(keyword) ||
        obj.description?.toLowerCase().includes(keyword)
      )
    );
  }
  
  private mapObjectsToCategories(objects: DetectedObject[]): CategoryMatch[] {
    const categoryMatches: CategoryMatch[] = [];
    
    for (const [category, metadata] of Object.entries(CATEGORY_METADATA)) {
      const relevantObjects = objects.filter(obj => 
        this.isObjectRelevantToCategory(obj, category as IssueCategory)
      );
      
      if (relevantObjects.length > 0) {
        const confidence = this.calculateCategoryConfidence(
          relevantObjects,
          category as IssueCategory
        );
        
        categoryMatches.push({
          category: category as IssueCategory,
          confidence,
          supportingObjects: relevantObjects,
          reasoning: `Detected ${relevantObjects.length} relevant objects`,
        });
      }
    }
    
    return categoryMatches.sort((a, b) => b.confidence - a.confidence);
  }
}
```

### Issue Clustering Algorithms

#### Geographic and Semantic Clustering

```typescript
export class IssueClustering {
  private semanticAnalyzer: SemanticAnalyzer;
  private geographicClustering: GeographicClustering;
  
  constructor(private config: AiConfig) {
    this.semanticAnalyzer = new SemanticAnalyzer(config);
    this.geographicClustering = new GeographicClustering();
  }
  
  async clusterIssues(
    issues: Issue[],
    options: ClusteringOptions = {}
  ): Promise<ClusteringResult> {
    
    const {
      maxRadius = 1000, // meters
      minSimilarity = 0.7,
      minClusterSize = 2,
      maxClusterSize = 50,
    } = options;
    
    // Step 1: Geographic pre-clustering
    const geoClusters = await this.geographicClustering.cluster(
      issues,
      { maxRadius, minClusterSize }
    );
    
    // Step 2: Semantic clustering within geographic clusters
    const finalClusters: IssueCluster[] = [];
    
    for (const geoCluster of geoClusters) {
      const semanticClusters = await this.semanticAnalyzer.cluster(
        geoCluster.issues,
        { minSimilarity, maxClusterSize }
      );
      
      finalClusters.push(...semanticClusters);
    }
    
    // Step 3: Calculate cluster priorities
    const prioritizedClusters = finalClusters.map(cluster => ({
      ...cluster,
      priority: this.calculateClusterPriority(cluster),
    }));
    
    return {
      clusters: prioritizedClusters,
      statistics: this.generateClusteringStatistics(issues, prioritizedClusters),
      recommendations: this.generateClusteringRecommendations(prioritizedClusters),
    };
  }
  
  private calculateClusterPriority(cluster: IssueCluster): number {
    const factors = {
      // Issue count influence (0-30 points)
      issueCount: Math.min(cluster.issueCount * 2, 30),
      
      // Total trust weight (0-25 points)
      trustWeight: Math.min(cluster.totalWeight * 5, 25),
      
      // Average quality score (0-20 points)
      qualityScore: (cluster.avgQuality / 12) * 20,
      
      // Geographic density (0-15 points)
      density: this.calculateDensityScore(cluster),
      
      // Time urgency (0-10 points)
      urgency: this.calculateUrgencyScore(cluster),
    };
    
    return Math.round(
      factors.issueCount +
      factors.trustWeight +
      factors.qualityScore +
      factors.density +
      factors.urgency
    );
  }
  
  private calculateDensityScore(cluster: IssueCluster): number {
    // Higher density = more issues in smaller area = higher priority
    const issuesPerSqKm = cluster.issueCount / (Math.PI * Math.pow(cluster.radiusMeters / 1000, 2));
    return Math.min(issuesPerSqKm * 2, 15);
  }
  
  private calculateUrgencyScore(cluster: IssueCluster): number {
    // Recent issues get higher urgency
    const avgAge = cluster.issues.reduce((sum, issue) => {
      const ageHours = (Date.now() - issue.createdAt.getTime()) / (1000 * 60 * 60);
      return sum + ageHours;
    }, 0) / cluster.issues.length;
    
    // Newer issues (< 24 hours) get full points
    if (avgAge < 24) return 10;
    if (avgAge < 72) return 7; // < 3 days
    if (avgAge < 168) return 4; // < 1 week
    return 1; // older issues
  }
}

export class SemanticAnalyzer {
  private llmProvider: LLMProvider;
  
  constructor(private config: AiConfig) {
    this.llmProvider = new LLMProvider(config);
  }
  
  async calculateSimilarity(
    issue1: Issue,
    issue2: Issue
  ): Promise<number> {
    
    // Quick category check
    if (issue1.category !== issue2.category) {
      return 0; // Different categories are not similar
    }
    
    try {
      // Use LLM for semantic similarity
      const similarity = await this.llmProvider.calculateSimilarity({
        text1: issue1.description,
        text2: issue2.description,
        context: `Indonesian infrastructure issues in category: ${issue1.category}`,
      });
      
      return similarity;
      
    } catch (error) {
      // Fallback to keyword-based similarity
      return this.calculateKeywordSimilarity(
        issue1.description,
        issue2.description
      );
    }
  }
  
  private calculateKeywordSimilarity(text1: string, text2: string): number {
    const keywords1 = this.extractKeywords(text1);
    const keywords2 = this.extractKeywords(text2);
    
    if (keywords1.length === 0 || keywords2.length === 0) {
      return 0;
    }
    
    const intersection = keywords1.filter(k => keywords2.includes(k));
    const union = [...new Set([...keywords1, ...keywords2])];
    
    return intersection.length / union.length; // Jaccard similarity
  }
  
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'di', 'ke', 'dari', 'untuk', 'dengan', 'pada', 'dalam', 'oleh',
      'yang', 'ini', 'itu', 'adalah', 'akan', 'sudah', 'telah',
      'dan', 'atau', 'tapi', 'tetapi', 'juga', 'serta', 'kemudian',
    ]);
    
    return text.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Limit to top 10 keywords
  }
}
```

### Performance Optimization and Caching

#### AI Response Caching Strategy

```typescript
export class AICache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 60 * 60 * 1000; // 1 hour
  
  async getCachedResponse<T>(
    key: string,
    factory: () => Promise<T>
  ): Promise<T> {
    
    const cached = this.cache.get(key);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.value as T;
    }
    
    // Generate new response
    const value = await factory();
    
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.TTL,
      createdAt: new Date(),
    });
    
    return value;
  }
  
  generateCacheKey(
    operation: string,
    inputs: Record<string, any>
  ): string {
    const sortedInputs = Object.keys(inputs)
      .sort()
      .reduce((obj, key) => {
        obj[key] = inputs[key];
        return obj;
      }, {} as Record<string, any>);
    
    return `${operation}:${JSON.stringify(sortedInputs)}`;
  }
  
  // Clear cache periodically
  startCleanupJob(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiry <= now) {
          this.cache.delete(key);
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }
}
```

### Future Considerations

#### 1. **Advanced Language Models**
- **Indonesian Fine-tuning**: Custom models trained on Indonesian infrastructure data
- **Multimodal Integration**: Text + image + audio processing
- **Real-time Learning**: Model adaptation based on user feedback

#### 2. **Enhanced Clustering**
- **Temporal Clustering**: Time-based issue pattern recognition
- **Cross-Category Analysis**: Related issues across different categories
- **Predictive Clustering**: Forecast potential issue hotspots

#### 3. **Government Integration**
- **Decision Support**: AI recommendations for resource allocation
- **Impact Prediction**: Estimate issue resolution impact
- **Policy Insights**: Data-driven policy recommendations

This AI architecture provides sophisticated yet practical intelligence capabilities while maintaining performance and accuracy for Indonesian users and infrastructure contexts.