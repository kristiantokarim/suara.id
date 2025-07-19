# AI Package

AI/ML processing utilities for the Suara.id platform.

## Structure

```
packages/ai/
├── src/
│   ├── llm/              # LLM integrations
│   │   ├── openai.ts
│   │   ├── claude.ts
│   │   └── conversation.ts
│   ├── vision/           # Image analysis
│   │   ├── classification.ts
│   │   └── validation.ts
│   ├── clustering/       # Issue clustering
│   │   ├── similarity.ts
│   │   └── geographic.ts
│   ├── language/         # Multi-language support
│   │   ├── detection.ts
│   │   ├── translation.ts
│   │   └── dialects.ts
│   ├── prompts/          # AI prompt templates
│   │   ├── conversation/
│   │   ├── classification/
│   │   └── validation/
│   └── types.ts
└── package.json
```

## Core Features

### Conversation Management
- Natural language understanding
- Multi-turn conversation context
- Follow-up question generation
- Intent recognition and response

### Content Classification
- Issue category prediction (6 main categories)
- Severity assessment
- Urgency detection
- Content quality evaluation

### Language Processing
- Indonesian + regional language support
- Dialect detection and translation
- Cultural context understanding
- Informal speech processing

### Image Analysis
- Infrastructure problem detection
- Photo quality assessment
- Metadata validation
- Content appropriateness checking

### Clustering Algorithms
- Geographic proximity grouping
- Semantic similarity matching
- Temporal pattern recognition
- Duplicate detection

## Usage

```typescript
import { 
  processConversation,
  classifyIssue,
  analyzeImage,
  clusterIssues 
} from '@suara/ai';

// Process user message
const response = await processConversation(
  userMessage, 
  conversationHistory,
  userLanguage
);

// Classify issue
const category = await classifyIssue(description, imageUrls);

// Analyze uploaded image
const analysis = await analyzeImage(imageBuffer);

// Cluster similar issues
const clusters = await clusterIssues(issues, location);
```

## Configuration

AI models and prompts are configurable per environment:

```typescript
// Configuration in @suara/config
export const aiConfig = {
  llm: {
    provider: 'openai', // or 'claude'
    model: 'gpt-4',
    temperature: 0.7
  },
  vision: {
    provider: 'openai',
    model: 'gpt-4-vision-preview'
  }
};
```