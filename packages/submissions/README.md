# @suara/submissions

Submission management system for Suara.id - handles citizen issue reporting, validation, processing, and status management.

## Features

- **Issue Submission**: Create and validate citizen issue reports
- **Validation**: Comprehensive input validation using Zod schemas
- **Geographic Processing**: Location-based issue grouping and analysis
- **Status Management**: Track submission processing lifecycle
- **Search & Filtering**: Query submissions by various criteria
- **Quality Scoring**: Assess submission quality and completeness

## Usage

```typescript
import { createSubmission, getSubmissions, searchSubmissions } from '@suara/submissions';

// Create new submission
const result = await createSubmission(userId, {
  content: 'Jalan rusak di depan sekolah',
  category: 'INFRASTRUCTURE',
  location: {
    coordinates: [-6.2088, 106.8456],
    address: 'Jl. Sudirman No. 1, Jakarta',
    accuracy: 10
  },
  images: ['base64...'],
  severity: 'MEDIUM'
});

// Search submissions
const submissions = await searchSubmissions({
  query: 'jalan rusak',
  category: 'INFRASTRUCTURE',
  location: {
    center: [-6.2088, 106.8456],
    radius: 5
  }
});
```

## Architecture

This package provides business logic layer on top of `@suara/database` operations:

- **Services**: High-level business logic and validation
- **Processors**: Handle submission processing pipeline
- **Utils**: Geographic calculations and text processing
- **Types**: Submission-specific types and interfaces

## Dependencies

- `@suara/config`: Shared configuration and validation schemas
- `@suara/database`: Database operations and types