# Database Package

Database schema, migrations, and utilities for the Suara.id platform.

## Structure

```
packages/database/
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── migrations/        # Database migrations
│   └── seed.ts           # Test data seeding
├── src/
│   ├── client.ts         # Prisma client setup
│   ├── queries/          # Reusable queries
│   └── types.ts          # Database types
└── package.json
```

## Key Tables

- **users**: User profiles and authentication
- **user_trust_scores**: Trust level tracking
- **submissions**: Issue reports and conversations
- **submission_quality_scores**: Quality assessments
- **issues**: Processed and categorized issues
- **clusters**: Issue groupings and aggregations
- **verifications**: KTP and document verification

## Usage

```typescript
import { prisma } from '@suara/database';
import { getUserTrustScore } from '@suara/database/queries';

// Direct Prisma usage
const user = await prisma.user.findUnique({ where: { id } });

// Using helper queries
const trustScore = await getUserTrustScore(userId);
```

## Scripts

```bash
# Generate Prisma client
pnpm db:generate

# Push schema changes to database
pnpm db:push

# Open Prisma Studio
pnpm db:studio

# Reset database
pnpm db:reset
```