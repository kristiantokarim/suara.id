# Scoring Package

Trust and quality scoring system for the Suara.id platform.

## Structure

```
packages/scoring/
├── src/
│   ├── trust/            # User trust scoring
│   │   ├── calculator.ts
│   │   ├── verification.ts
│   │   └── history.ts
│   ├── quality/          # Submission quality
│   │   ├── content.ts
│   │   ├── media.ts
│   │   └── location.ts
│   ├── abuse/            # Anti-abuse detection
│   │   ├── spam.ts
│   │   ├── duplicate.ts
│   │   └── fraud.ts
│   ├── algorithms/       # Scoring algorithms
│   │   ├── weights.ts
│   │   └── clustering.ts
│   └── types.ts
└── package.json
```

## Trust Scoring System

### User Trust Levels
- **Basic (1.0-2.0)**: Phone verified only
- **Verified (2.1-4.0)**: KTP + selfie verified
- **Premium (4.1-5.0)**: Social + community verified

### Trust Factors
- Phone verification status
- KTP document verification
- Facial recognition matching
- Social media account linking
- Community endorsements
- Historical accuracy

## Quality Scoring System

### Content Quality (0-12 points)
- **Text Analysis (0-3)**: Length, specificity, clarity
- **Media Evidence (0-4)**: Photos, videos, metadata
- **Location Accuracy (0-2)**: GPS precision, address details
- **AI Validation (0-3)**: Consistency, plausibility

### Weight Calculation
```
Final Weight = (Trust Score × Quality Score) / 12
Range: 0.08 (minimum) to 5.0 (maximum)
```

## Anti-Abuse Detection

### Spam Detection
- Content similarity analysis
- Submission frequency patterns
- User behavior analysis
- Known spam patterns

### Duplicate Detection
- Text similarity within geographic radius
- Image similarity using perceptual hashing
- Temporal clustering analysis
- Cross-user duplicate detection

## Usage

```typescript
import { 
  calculateTrustScore,
  assessSubmissionQuality,
  detectSpam,
  findDuplicates 
} from '@suara/scoring';

// Calculate user trust score
const trustScore = await calculateTrustScore(userId);

// Assess submission quality
const quality = await assessSubmissionQuality({
  text: description,
  images: imageUrls,
  location: coordinates,
  timestamp: new Date()
});

// Check for spam
const isSpam = await detectSpam(submission, userHistory);

// Find potential duplicates
const duplicates = await findDuplicates(submission, radius);
```

## Configuration

Scoring thresholds and weights are configurable:

```typescript
// Configuration example
export const scoringConfig = {
  trust: {
    phoneVerified: 1.0,
    ktpVerified: 2.0,
    socialLinked: 1.0,
    communityEndorsed: 1.0
  },
  quality: {
    minTextLength: 50,
    maxImageSize: 10485760, // 10MB
    requiredFields: ['location', 'description']
  },
  clustering: {
    minWeight: 1.0,
    highWeightThreshold: 3.0
  }
};
```