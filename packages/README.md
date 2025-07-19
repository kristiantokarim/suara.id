# Shared Packages

This directory contains shared packages used across applications in the Suara.id platform.

## Packages

- **database/**: Database schema, migrations, and utilities
  - Prisma schema definitions
  - Database migrations
  - Shared queries and utilities

- **ui/**: Shared UI components
  - Reusable React components
  - Design system components
  - Shared styles and themes

- **auth/**: Authentication utilities
  - JWT token management
  - Phone/KTP verification logic
  - Social media integration
  - Session management

- **ai/**: AI/ML processing
  - LLM conversation management
  - Content classification
  - Multi-language processing
  - Image analysis

- **scoring/**: Trust and quality scoring
  - User trust score calculation
  - Submission quality assessment
  - Anti-abuse detection
  - Clustering weight algorithms

- **config/**: Shared configurations
  - Environment configurations
  - Shared constants and types
  - Utility functions

## Usage

Import packages in your applications:

```typescript
import { Button } from '@suara/ui';
import { verifyPhone } from '@suara/auth';
import { calculateTrustScore } from '@suara/scoring';
```