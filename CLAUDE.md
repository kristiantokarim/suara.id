# Suara.id Development Guide
## Claude Code Context & Implementation Standards

### 🎯 **Project Overview**

**Suara.id** is an Indonesian citizen issue reporting platform that empowers communities to report local problems through an intuitive chat interface. The platform uses AI-powered processing, sophisticated trust scoring, and provides transparent public insights while maintaining citizen privacy.

**Key Differentiators:**
- **Mobile-First**: WhatsApp-inspired interface for Indonesian users
- **AI-Driven**: Automatic categorization, clustering, and quality assessment
- **Trust-Based**: Progressive verification system preventing abuse
- **Indonesian Context**: Built for local administrative structure and languages

---

### 📋 **Current Implementation Status**

#### ✅ **Completed Components (Production Ready)**

1. **Database Schema** (`packages/database/`)
   - PostgreSQL with Prisma ORM
   - Trust scoring tables with Indonesian administrative structure
   - Geographic indexing and query optimization
   - **Testing**: ✅ Complete with comprehensive queries

2. **Configuration System** (`packages/config/`)
   - Environment-aware config with Zod validation
   - Multi-language support (Indonesian + 6 regional languages)
   - Trust scoring limits and system constants
   - **Testing**: ✅ Complete with validation tests

3. **Authentication System** (`packages/auth/`)
   - Complete verification flow: Phone → KTP → Selfie → Social
   - Progressive trust scoring (Basic 1.0-2.0, Verified 2.1-4.0, Premium 4.1-5.0)
   - Anti-abuse detection with Indonesian-specific patterns
   - Social media integration (Facebook, Instagram, WhatsApp Business)
   - **Testing**: ✅ Complete with comprehensive unit tests

4. **UI Component Library** (`packages/ui/`)
   - WhatsApp-inspired design system with Indonesian context
   - Mobile-first responsive components
   - Chat interface components (ChatBubble, ChatInput)
   - Form components with Indonesian validation
   - **Testing**: ✅ Complete with component tests

#### 🔄 **Next Implementation Priority**

1. **AI Conversation Engine** (`packages/ai/`) - **IMMEDIATE NEXT**
2. **Submission Management System** (Core chat-to-database flow)
3. **Web Application** (`apps/web/`)
4. **API Server** (`apps/api/`)

---

### 🏗️ **Development Standards & Best Practices**

#### **Code Quality Requirements**

```typescript
// TypeScript Configuration
{
  "compilerOptions": {
    "strict": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**Required Standards:**
- **TypeScript Strict Mode**: All code must pass strict type checking
- **ESLint + Prettier**: Automated code formatting and linting
- **JSDoc Documentation**: All public functions must have comprehensive JSDoc
- **Error Handling**: Proper error types, logging, and user-friendly messages
- **Security**: Input validation, rate limiting, data encryption

#### **Testing Requirements**

**Unit Testing (Jest + @testing-library)**
```bash
# Required for each component
npm run test:unit          # All unit tests
npm run test:unit:watch    # Watch mode during development
npm run test:coverage      # Minimum 80% coverage required
```

**Integration Testing**
```bash
npm run test:integration   # Database operations, API endpoints
npm run test:e2e          # Full user flows with Playwright
```

**Indonesian-Specific Test Cases:**
- KTP NIK validation with real format patterns
- Phone number normalization (+62 formats)
- Regional language detection and processing
- Administrative hierarchy validation

#### **Documentation Standards**

**Required Documentation:**
1. **README.md** in each package with setup and usage
2. **JSDoc** for all public functions and classes
3. **API Documentation** with OpenAPI specs
4. **Architecture Decision Records** for major design choices

**Example JSDoc Standard:**
```typescript
/**
 * Validates Indonesian KTP (ID card) format and extracts data
 * 
 * @param ktpImage - Buffer containing KTP image
 * @param userProvidedData - Optional user-provided data for cross-validation
 * @returns Promise containing verification result with confidence score
 * 
 * @example
 * ```typescript
 * const result = await verifyKtp(imageBuffer, { name: "Budi Santoso" });
 * if (result.valid) {
 *   console.log(`Verified: ${result.extractedData.name}`);
 * }
 * ```
 */
```

---

### 🐳 **Local Development Setup**

#### **Docker Compose Environment**

```yaml
# docker-compose.yml - Complete local development stack
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: suara_dev
      POSTGRES_USER: suara
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./packages/database/seed:/docker-entrypoint-initdb.d
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
```

#### **Development Commands**

```bash
# Environment Setup
docker-compose up -d                    # Start all services
npm install                            # Install dependencies
npm run db:migrate                     # Run database migrations
npm run db:seed                        # Seed with Indonesian test data

# Development
npm run dev                            # Start all apps in development mode
npm run dev:web                        # Start only web app
npm run dev:api                        # Start only API server

# Testing
npm run test                           # Run all tests
npm run test:watch                     # Watch mode for active development
npm run test:coverage                  # Generate coverage report

# Code Quality
npm run lint                           # ESLint check
npm run lint:fix                       # Auto-fix linting issues
npm run type-check                     # TypeScript validation
npm run format                         # Prettier formatting
```

---

### 🧪 **Testing Strategy**

#### **Unit Testing Framework**

**Required Test Coverage:**
- **Authentication Functions**: All verification methods (KTP, selfie, social)
- **Trust Scoring**: All calculation algorithms
- **Indonesian Utilities**: Phone normalization, NIK validation, language detection
- **UI Components**: All interactive components with user events

**Example Test Structure:**
```typescript
// packages/auth/src/verification/__tests__/ktp.test.ts
describe('KTP Verification', () => {
  describe('validateNik', () => {
    it('should validate correct Indonesian NIK format', () => {
      const result = validateNik('3171234567890123');
      expect(result.valid).toBe(true);
      expect(result.details.gender).toBe('M');
    });

    it('should detect female NIK with day offset', () => {
      const result = validateNik('3171454567890123'); // Day 14 + 40 = 54
      expect(result.valid).toBe(true);
      expect(result.details.gender).toBe('F');
    });

    it('should reject invalid NIK length', () => {
      const result = validateNik('123456789');
      expect(result.valid).toBe(false);
      expect(result.details.error).toContain('16 digits');
    });
  });
});
```

#### **Integration Testing**

**Database Operations:**
```typescript
// Test database operations with real Prisma client
describe('User Registration Flow', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany(); // Clean test database
  });

  it('should create user with phone verification', async () => {
    const phone = '+628123456789';
    const user = await createUser({ phone });
    
    expect(user.phoneVerified).toBe(false);
    expect(user.trustLevel).toBe('BASIC');
  });
});
```

#### **Mock Services for Development**

**OCR and AI Services:**
```typescript
// Mock implementations for development/testing
export const mockOcrService = {
  extractKtpText: jest.fn().mockResolvedValue({
    success: true,
    extractedText: 'MOCK KTP TEXT...',
    confidence: 0.95
  })
};

// Use in tests and development mode
if (process.env.NODE_ENV === 'development') {
  jest.mock('./services/ocr', () => mockOcrService);
}
```

---

### 📚 **Architecture Decisions & Context**

#### **Key Design Decisions**

1. **Monorepo Structure (Turborepo)**
   - **Why**: Shared code, unified versioning, coordinated deployments
   - **Trade-off**: More complex setup vs better code sharing

2. **Progressive Trust System**
   - **Why**: Prevent abuse while maintaining accessibility
   - **Implementation**: Dual scoring (user trust + submission quality)

3. **Indonesian-First Design**
   - **Language Tiers**: Full support for 3 languages, basic for 4 more
   - **Administrative Integration**: Built-in understanding of Indonesian geography
   - **Cultural Patterns**: UI/UX familiar to Indonesian users

4. **Anti-Abuse by Design**
   - **Multiple Verification Layers**: Phone → KTP → Selfie → Social
   - **Real-time Quality Scoring**: Immediate feedback during submission
   - **Behavioral Analysis**: Pattern detection for suspicious accounts

#### **Indonesian Context Requirements**

**Phone Numbers:**
```typescript
// Support all Indonesian mobile formats
normalizePhoneNumber('08123456789')  // → '+628123456789'
normalizePhoneNumber('8123456789')   // → '+628123456789'
normalizePhoneNumber('+628123456789') // → '+628123456789'
```

**Administrative Hierarchy:**
```
Indonesia
├── Provinsi (Province) - 34 provinces
    ├── Kabupaten/Kota (Regency/City) - ~500 total
        ├── Kecamatan (Sub-district) - ~7,000 total
            └── Kelurahan/Desa (Village) - ~80,000 total
```

**Language Support Tiers:**
- **Tier 1** (Full Support): Indonesian, Javanese, Sundanese
- **Tier 2** (Basic Support): Batak, Minangkabau, Bugis, Banjar

---

### 🚀 **Implementation Workflow**

#### **For Each New Component:**

1. **Planning Phase**
   ```bash
   # 1. Create component structure
   mkdir -p packages/[component-name]/src
   
   # 2. Set up package.json with dependencies
   # 3. Create README.md with component overview
   # 4. Set up TypeScript configuration
   ```

2. **Implementation Phase**
   ```bash
   # 1. Write core functionality with TypeScript strict mode
   # 2. Add comprehensive JSDoc documentation
   # 3. Implement error handling and logging
   # 4. Add Indonesian-specific features where needed
   ```

3. **Testing Phase**
   ```bash
   # 1. Write unit tests for all functions
   npm run test:unit packages/[component-name]
   
   # 2. Write integration tests for external dependencies
   npm run test:integration packages/[component-name]
   
   # 3. Verify test coverage meets 80% minimum
   npm run test:coverage packages/[component-name]
   ```

4. **Quality Assurance**
   ```bash
   # 1. Run all quality checks
   npm run lint packages/[component-name]
   npm run type-check packages/[component-name]
   npm run test packages/[component-name]
   
   # 2. Update documentation
   npm run docs:generate packages/[component-name]
   
   # 3. Test Docker local development
   docker-compose up --build
   ```

5. **Integration & Documentation**
   ```bash
   # 1. Update main package exports
   # 2. Add component to monorepo build pipeline
   # 3. Update architecture documentation
   # 4. Create usage examples
   ```

#### **Quality Assurance Checklist**

**Before Marking Component Complete:**
- [ ] **Unit Tests**: 80%+ coverage, all critical paths tested
- [ ] **Integration Tests**: External dependencies mocked or tested
- [ ] **Documentation**: README, JSDoc, usage examples complete
- [ ] **Docker Setup**: Component works in local Docker environment
- [ ] **TypeScript**: Strict mode passes, no `any` types
- [ ] **Indonesian Context**: Local requirements implemented and tested
- [ ] **Security Review**: Input validation, rate limiting, data protection
- [ ] **Performance**: Database queries optimized, caching implemented

---

### 🔧 **Development Context**

#### **Current Codebase State**

**What's Working:**
- Complete trust scoring system with Indonesian KTP verification
- Social media integration with Facebook, Instagram, WhatsApp Business
- Anti-abuse detection with sophisticated pattern recognition
- Database schema supporting all platform features

**Key Files to Understand:**
- `packages/auth/src/verification/index.ts` - Main verification orchestrator
- `packages/auth/src/verification/ktp.ts` - Indonesian KTP processing
- `packages/database/prisma/schema.prisma` - Complete database schema
- `packages/config/src/constants.ts` - System limits and configurations

#### **Next Component: UI Library**

**Implementation Requirements:**
1. **WhatsApp-Inspired Design**: Familiar chat interface patterns
2. **Mobile-First**: Touch targets, responsive design, performance
3. **Accessibility**: WCAG AA compliance, screen reader support
4. **Indonesian Localization**: RTL text support, local date/time formats
5. **Progressive Enhancement**: Works without JavaScript for basic functionality

**Component Priority Order:**
1. **ChatContainer** - Main chat interface wrapper
2. **MessageBubble** - Individual message display
3. **ChatInput** - Text, voice, image input handling
4. **VerificationFlow** - Step-by-step verification UI
5. **TrustLevelBadge** - Visual trust level indicators

---

### 🎯 **Quick Start for Continuation**

#### **Getting Back Into Development:**

1. **Review Current State**
   ```bash
   # Check what's been implemented
   find packages -name "*.ts" -not -path "*/node_modules/*" | head -20
   
   # Review test coverage
   npm run test:coverage
   
   # Check TypeScript compilation
   npm run type-check
   ```

2. **Understand Trust Scoring**
   ```bash
   # Key trust scoring constants
   grep -r "TRUST_SCORE" packages/config/
   
   # See verification flow
   cat packages/auth/src/verification/index.ts
   ```

3. **Review Indonesian Context**
   ```bash
   # Phone number handling
   grep -r "normalizePhoneNumber" packages/auth/
   
   # KTP validation
   grep -r "validateNik" packages/auth/
   ```

4. **Start Next Component**
   ```bash
   # Set up UI component library
   mkdir -p packages/ui/src/components
   cd packages/ui
   npm init # Follow Indonesian context patterns
   ```

#### **Key Implementation Patterns**

**Error Handling:**
```typescript
// Always return structured error objects
interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
  issues?: string[];
}
```

**Indonesian Data Validation:**
```typescript
// Use established patterns for Indonesian data
const phone = normalizePhoneNumber(input.phone);
if (!validatePhoneNumber(phone)) {
  return { success: false, error: 'Invalid Indonesian phone number' };
}
```

**Trust Score Integration:**
```typescript
// Always consider trust level in business logic
if (!hasRequiredTrustLevel(user.trustLevel, 'VERIFIED')) {
  return { error: 'Verification required for this action' };
}
```

---

### 📞 **Support & Resources**

**Indonesian Development Context:**
- **KTP Format**: 16-digit NIK with encoded birth date and location
- **Phone Formats**: +62 country code, mobile numbers start with 8
- **Administrative Codes**: Hierarchical structure for geographic data
- **Language Patterns**: Formal vs informal Indonesian, regional dialect support

**Testing with Indonesian Data:**
- Use real (anonymized) KTP formats for testing
- Test with various phone number input formats
- Include regional language samples in text processing tests
- Validate administrative hierarchy data

**Security Considerations:**
- PII encryption for KTP and verification data
- Rate limiting based on trust levels
- Input sanitization for Indonesian text patterns
- Audit logging for all verification attempts

This guide ensures consistent, high-quality implementation that maintains the established patterns and Indonesian context throughout the development process.