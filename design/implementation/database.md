# Database Implementation Documentation
## Suara.id Database Architecture

### Overview

The Suara.id database is built on PostgreSQL using Prisma ORM, designed to handle citizen issue reporting with sophisticated trust scoring, quality assessment, and geographic clustering capabilities. The schema is optimized for Indonesian administrative structures and multi-language support.

### Architecture Decisions

#### 1. **Prisma ORM Choice**
- **Why**: Type-safe database access, excellent TypeScript integration, migration management
- **Benefits**: Auto-generated types, query optimization, development productivity
- **Trade-offs**: Additional abstraction layer, vendor lock-in to Prisma patterns

#### 2. **PostgreSQL Selection**
- **Why**: ACID compliance, JSON support, geographic extensions (PostGIS ready), robust performance
- **Benefits**: Complex queries, full-text search, geographic operations, reliability
- **Indonesian Context**: Handles Unicode properly for local languages

#### 3. **Trust Scoring Integration**
- **Why**: Prevent abuse while maintaining accessibility
- **Design**: Separate `user_trust_scores` table for performance and flexibility
- **Real-time Updates**: Triggers and background jobs for score recalculation

### Schema Design Details

#### Core User Management

```prisma
model User {
  id                String              @id @default(cuid())
  phone             String              @unique
  phoneVerified     Boolean             @default(false)
  phoneVerifiedAt   DateTime?
  name              String?
  language          String              @default("id")
  preferredLanguage String?             // Regional dialect
  // Relations omitted for brevity
}
```

**Design Rationale:**
- **Phone as Primary ID**: Indonesian context where phone numbers are primary identifiers
- **Language Fields**: Support both national (Indonesian) and regional languages
- **Verification Tracking**: Timestamped verification for audit trails
- **Optional Name**: Privacy-first approach, name not required for basic functionality

#### Trust Scoring System

```prisma
model UserTrustScore {
  trustScore       Float     @default(1.0) // 1.0-5.0
  trustLevel       TrustLevel @default(BASIC)
  phoneVerified    Boolean   @default(false)
  ktpVerified      Boolean   @default(false)
  selfieVerified   Boolean   @default(false)
  socialVerified   Boolean   @default(false)
  submissionCount  Int       @default(0)
  accuracyScore    Float     @default(0.0) // 0.0-1.0
  communityScore   Float     @default(0.0) // From endorsements
}
```

**Mathematical Model:**
```
Base Score = 1.0
+ Phone Verification: +0.5
+ KTP Verification: +1.5  
+ Selfie Match: +0.5
+ Social Media: +1.0
+ Community Score: 0.0-0.5 (from endorsements)
+ Historical Accuracy: 0.0-0.5 (based on past submissions)
+ Submission History: 0.0-0.3 (experience bonus)

Final Score = min(5.0, sum of above)

Trust Levels:
- BASIC: 1.0-2.0
- VERIFIED: 2.1-4.0  
- PREMIUM: 4.1-5.0
```

#### Indonesian Administrative Structure

```prisma
// Administrative hierarchy fields in Issue and Cluster models
kelurahan       String?       // Village/Urban village (lowest level)
kecamatan       String?       // Sub-district
kabupaten       String?       // Regency/City
provinsi        String?       // Province
```

**Geographic Hierarchy:**
```
Indonesia
├── Provinsi (Province) - 34 provinces
    ├── Kabupaten/Kota (Regency/City) - ~500 total
        ├── Kecamatan (Sub-district) - ~7,000 total
            └── Kelurahan/Desa (Village) - ~80,000 total
```

**Indexing Strategy:**
```sql
-- Geographic lookups
CREATE INDEX idx_issues_location ON issues USING GIST (coordinates);
CREATE INDEX idx_issues_admin_area ON issues (provinsi, kabupaten, kecamatan, kelurahan);

-- Performance indexes
CREATE INDEX idx_submissions_user_created ON submissions (user_id, created_at DESC);
CREATE INDEX idx_issues_category_status ON issues (category, status);
CREATE INDEX idx_clusters_priority ON issue_clusters (priority DESC, status);
```

#### Quality Scoring Schema

```prisma
model SubmissionQualityScore {
  textScore       Float      @default(0) // 0-3
  mediaScore      Float      @default(0) // 0-4
  locationScore   Float      @default(0) // 0-2
  aiValidationScore Float    @default(0) // 0-3
  totalScore      Float      @default(0) // Sum of above (0-12)
  finalWeight     Float      @default(0) // trustScore * qualityScore / 12
}
```

**Scoring Algorithm:**
```typescript
// Text Analysis (0-3 points)
const textScore = 
  (length > 50 ? 0.5 : 0) +
  (length > 200 ? 0.5 : 0) +
  (hasLocationRef ? 1 : 0) +
  (hasTimeRef ? 0.5 : 0) +
  (clarityScore ? 0.5 : 0);

// Media Evidence (0-4 points)  
const mediaScore =
  Math.min(imageCount, 2) + // 1 point per image, max 2
  (hasVideo ? 2 : 0) +      // Video worth more than images
  (qualityGood ? 1 : 0) +   // Clear, relevant media
  (hasMetadata ? 1 : 0);    // GPS/timestamp present

// Final Weight Calculation
const finalWeight = (trustScore * totalQualityScore) / 12;
```

### Query Patterns and Performance

#### 1. **User Trust Score Queries**

```typescript
// Efficient trust score lookup with caching
export async function getUserTrustScore(userId: string) {
  return prisma.userTrustScore.findUnique({
    where: { userId },
    // Cache for 1 hour since trust scores change infrequently
  });
}

// Bulk trust score updates (background job)
export async function recalculateTrustScores(userIds: string[]) {
  return prisma.$transaction(async (tx) => {
    // Batch processing to avoid memory issues
    for (const batch of chunks(userIds, 100)) {
      await Promise.all(
        batch.map(userId => calculateAndUpdateTrustScore(userId, tx))
      );
    }
  });
}
```

#### 2. **Geographic Clustering Queries**

```typescript
// Find nearby submissions for clustering
export async function findNearbySubmissions(
  center: [number, number],
  radiusKm: number,
  category: IssueCategory
) {
  // Using raw SQL for PostGIS ST_DWithin when available
  // Fallback to application-level distance calculation
  return prisma.$queryRaw`
    SELECT s.*, ST_Distance(
      ST_Point(${center[1]}, ${center[0]})::geography,
      ST_Point((s.location->>'coordinates')::json->>1)::float,
               (s.location->>'coordinates')::json->>0)::float)::geography
    ) as distance_meters
    FROM submissions s
    WHERE s.category = ${category}
      AND s.processed = true
      AND ST_DWithin(
        ST_Point(${center[1]}, ${center[0]})::geography,
        ST_Point((s.location->>'coordinates')::json->>1)::float,
                 (s.location->>'coordinates')::json->>0)::float)::geography,
        ${radiusKm * 1000}
      )
    ORDER BY distance_meters;
  `;
}
```

#### 3. **Dashboard Aggregation Queries**

```typescript
// Optimized dashboard statistics
export async function getDashboardStats(timeframe?: TimeRange) {
  const [submissions, issues, users] = await Promise.all([
    // Submissions by category and status
    prisma.submission.groupBy({
      by: ['category', 'status'],
      where: timeframe ? { createdAt: { gte: timeframe.start, lte: timeframe.end } } : {},
      _count: { id: true },
      _avg: { trustWeight: true },
    }),
    
    // Issues by severity and location
    prisma.issue.groupBy({
      by: ['severity', 'provinsi'],
      where: timeframe ? { createdAt: { gte: timeframe.start, lte: timeframe.end } } : {},
      _count: { id: true },
    }),
    
    // User trust level distribution
    prisma.userTrustScore.groupBy({
      by: ['trustLevel'],
      _count: { userId: true },
      _avg: { trustScore: true },
    }),
  ]);
  
  return { submissions, issues, users };
}
```

### Data Flow Architecture

#### 1. **Submission Processing Pipeline**

```
User Input → Chat Conversation → Submission Creation
     ↓
Quality Score Calculation → Trust Weight Application
     ↓
AI Categorization → Issue Creation → Clustering Analysis
     ↓
Public Data Preparation → Dashboard Update
```

#### 2. **Trust Score Update Flow**

```
Verification Event → Trust Factor Update → Score Recalculation
     ↓
Database Transaction → Cache Invalidation → Analytics Event
     ↓
Rate Limit Updates → Privilege Level Changes
```

#### 3. **Clustering Pipeline**

```
New Issue → Geographic Analysis → Category Matching
     ↓
Similarity Calculation → Cluster Assignment/Creation
     ↓
Priority Scoring → Government Notification → Public Display
```

### Security Considerations

#### 1. **Data Protection**
- **PII Encryption**: Sensitive verification documents encrypted at application level
- **Phone Number Hashing**: For rate limiting and duplicate detection
- **Admin Audit Logs**: All administrative actions tracked in `analytics_events`

#### 2. **Access Patterns**
```typescript
// Row-level security for submissions
WHERE user_id = current_user_id() 
   OR user_role() IN ('ADMIN', 'MODERATOR')

// Geographic data anonymization
SELECT 
  -- Round coordinates to ~100m precision for public API
  ROUND(latitude, 3) as latitude,
  ROUND(longitude, 3) as longitude,
  -- Strip exact address, show only kelurahan level
  kelurahan, kecamatan, kabupaten, provinsi
FROM issues_public_view;
```

#### 3. **Rate Limiting Storage**
```typescript
// Using separate Redis for rate limiting to avoid database load
interface RateLimitRecord {
  key: string;           // user_id:action_type
  count: number;
  resetTime: number;
  violations: number;    // Track persistent abusers
}
```

### Performance Optimization

#### 1. **Connection Pooling**
```typescript
// Prisma connection pool configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Production optimizations
  log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
  errorFormat: 'minimal',
});
```

#### 2. **Query Optimization Patterns**

```typescript
// Efficient pagination with cursor-based pagination
export async function getSubmissionsPaginated(
  cursor?: string,
  limit: number = 20
) {
  return prisma.submission.findMany({
    take: limit,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, trustScore: true } },
      qualityScore: true,
    },
  });
}

// Batch loading for N+1 prevention
export async function getSubmissionsWithUserData(submissionIds: string[]) {
  const submissions = await prisma.submission.findMany({
    where: { id: { in: submissionIds } },
    include: { user: { include: { trustScore: true } } },
  });
  
  // Return as Map for O(1) lookup
  return new Map(submissions.map(s => [s.id, s]));
}
```

### Migration Strategy

#### 1. **Schema Evolution Patterns**
```typescript
// Safe column additions
ALTER TABLE submissions ADD COLUMN new_field TEXT DEFAULT NULL;

// Backfill in batches to avoid locks
UPDATE submissions 
SET new_field = calculate_new_value(old_field)
WHERE id IN (
  SELECT id FROM submissions 
  WHERE new_field IS NULL 
  LIMIT 1000
);

// Make NOT NULL after backfill complete
ALTER TABLE submissions ALTER COLUMN new_field SET NOT NULL;
```

#### 2. **Data Migration Scripts**
```typescript
// Migration helper for complex data transformations
export async function migrateConversationFormat() {
  const batchSize = 1000;
  let offset = 0;
  
  while (true) {
    const submissions = await prisma.submission.findMany({
      where: { conversationLogMigrated: false },
      take: batchSize,
      skip: offset,
    });
    
    if (submissions.length === 0) break;
    
    await Promise.all(
      submissions.map(async (submission) => {
        const newFormat = transformConversationLog(submission.conversationLog);
        await prisma.submission.update({
          where: { id: submission.id },
          data: { 
            conversationLog: newFormat,
            conversationLogMigrated: true 
          },
        });
      })
    );
    
    offset += batchSize;
  }
}
```

### Monitoring and Observability

#### 1. **Performance Metrics**
```typescript
// Query performance monitoring
const queryMetrics = new Map<string, { count: number; totalTime: number }>();

// Slow query detection
prisma.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const end = Date.now();
  
  const queryTime = end - start;
  const queryKey = `${params.model}.${params.action}`;
  
  // Log slow queries (>1000ms)
  if (queryTime > 1000) {
    console.warn(`Slow query detected: ${queryKey} took ${queryTime}ms`);
  }
  
  // Update metrics
  const metric = queryMetrics.get(queryKey) || { count: 0, totalTime: 0 };
  metric.count++;
  metric.totalTime += queryTime;
  queryMetrics.set(queryKey, metric);
  
  return result;
});
```

#### 2. **Health Checks**
```typescript
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  connections: number;
}> {
  const start = Date.now();
  
  try {
    // Simple connectivity test
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    
    // Check connection pool
    const connections = await prisma.$queryRaw`
      SELECT count(*) as active_connections 
      FROM pg_stat_activity 
      WHERE state = 'active'
    `;
    
    return {
      status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'unhealthy',
      latency,
      connections: connections[0].active_connections,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      connections: 0,
    };
  }
}
```

### Future Considerations

#### 1. **Scaling Patterns**
- **Read Replicas**: Implement read/write splitting for dashboard queries
- **Sharding Strategy**: Geographic sharding by provinsi for very large scale
- **Archive Strategy**: Move old submissions to archive tables after 2+ years

#### 2. **Enhanced Features**
- **PostGIS Integration**: Full geographic search capabilities
- **Full-Text Search**: PostgreSQL FTS for submission content search
- **Time-Series Data**: Separate tables for analytics and trend data
- **Event Sourcing**: Consider event sourcing for audit trails and replay capability

This database architecture provides a robust foundation for the Suara.id platform while remaining flexible for future enhancements and Indonesian-specific requirements.