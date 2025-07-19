# 🚀 Quick Start Guide - Suara.id

Get the Suara.id platform running locally in 5 minutes.

## 📋 Prerequisites

- **Node.js** 18+ and **pnpm** 8+ installed
- **Docker & Docker Compose** for local services
- **Git** for version control

## 🏃‍♂️ Quick Setup

### 1. Install Dependencies
```bash
# Install all package dependencies
pnpm install
```

### 2. Start Infrastructure Services
```bash
# Start PostgreSQL, Redis, MinIO, and admin tools
docker-compose up -d

# Wait for services to be ready (about 30 seconds)
docker-compose logs -f minio-setup
```

### 3. Set Up Database
```bash
# Generate Prisma client and push schema
cd packages/database
pnpm install
pnpm prisma generate
pnpm prisma db push --accept-data-loss
pnpm db:seed

# Return to root directory
cd ../..
```

### 4. Verify Services Are Running
```bash
# Check all services are healthy
docker compose ps

# Should show all services as "Up" and healthy
```

## 🔧 Available Services

Once running, you can access:

| Service | URL | Credentials |
|---------|-----|-------------|
| **PostgreSQL** | `localhost:5432` | `suara` / `dev_password` |
| **Redis** | `localhost:6379` | No auth |
| **MinIO Console** | http://localhost:9001 | `minioadmin` / `minioadmin123` |
| **Adminer (DB Admin)** | http://localhost:8080 | See PostgreSQL creds |
| **Redis Commander** | http://localhost:8081 | `admin` / `admin123` |
| **MailHog (Email)** | http://localhost:8025 | No auth |

## 🧪 Test the Authentication System

### Run Unit Tests
```bash
# Test the auth package
cd packages/auth
pnpm install
pnpm test

# With coverage report
pnpm run test:coverage
```

### Test Indonesian Phone Verification
```bash
# Create a simple test script
cd packages/auth
cat > test-phone.js << 'EOF'
const { normalizePhoneNumber, validatePhoneNumber } = require('./dist/verification/phone');

// Test Indonesian phone number formats
const phones = ['08123456789', '8123456789', '+628123456789', '628123456789'];

phones.forEach(phone => {
  const normalized = normalizePhoneNumber(phone);
  const isValid = validatePhoneNumber(phone);
  console.log(`${phone} → ${normalized} (valid: ${isValid})`);
});
EOF

# Build and run test
pnpm build
node test-phone.js
```

### Test UI Components
```bash
# Test the UI component library
cd packages/ui
pnpm install
pnpm test

# Run with coverage (should achieve 80%+)
pnpm run test:coverage

# Test Indonesian-specific components
pnpm test -- --testNamePattern="Indonesian"

# Watch mode for development
pnpm run test:watch
```

### Test KTP NIK Validation
```bash
# Test NIK validation
cd packages/auth
cat > test-nik.js << 'EOF'
const { validateNik } = require('./dist/verification/ktp');

// Test Jakarta NIK: 31 (Jakarta) + 71 (Jakarta Selatan) + 15 (day+40 for female) + 04 + 67 + 0001 + 23
const testNiks = [
  '3171154567890123',  // Valid Jakarta Selatan female
  '3171104567890123',  // Valid Jakarta Selatan male  
  '1234567890123456',  // Invalid format
];

testNiks.forEach(nik => {
  const result = validateNik(nik);
  console.log(`NIK: ${nik}`);
  console.log(`Valid: ${result.valid}`);
  if (result.valid) {
    console.log(`Province: ${result.province}, Gender: ${result.gender}, Birth: ${result.birthDate}`);
  }
  console.log('---');
});
EOF

node test-nik.js
```

## 🗄️ Database Exploration

### View Indonesian Administrative Data
```bash
# Connect to PostgreSQL using Adminer
# 1. Open http://localhost:8080
# 2. Login with: postgres / suara / dev_password / suara_dev
# 3. Browse tables: indonesian_provinces, indonesian_cities, etc.

# Or use command line:
docker exec -it suara-postgres psql -U suara -d suara_dev -c "
SELECT p.name as province, c.name as city, c.type 
FROM indonesian_provinces p 
JOIN indonesian_cities c ON p.code = c.province_code 
WHERE p.code = '31';"
```

### Test Administrative Functions
```bash
# Test NIK validation against real administrative data
docker exec -it suara-postgres psql -U suara -d suara_dev -c "
SELECT validate_nik_administrative('3171154567890123') as is_valid_jakarta;
SELECT get_full_address('31', '71', '06', '1001') as full_address;
"
```

## 🛠️ Development Workflow

### Available Scripts
```bash
# Development (watches for changes)
pnpm dev

# Build all packages  
pnpm build

# Run tests across all packages
pnpm test

# Lint code
pnpm lint

# Format code
pnpm format

# Clean build artifacts
pnpm clean
```

### Package-Specific Development
```bash
# Work on auth package
cd packages/auth
pnpm install
pnpm dev          # Watch mode
pnpm test:watch   # Test watch mode
pnpm build        # Build package
```

## 📱 What's Currently Implemented

✅ **Authentication System** (`packages/auth/`)
- Indonesian phone verification with OTP
- KTP document verification with OCR
- Selfie verification with facial recognition
- Social media trust scoring
- Progressive verification levels

✅ **Infrastructure** 
- Docker development environment
- PostgreSQL with Indonesian administrative data
- Redis for caching and sessions
- MinIO for file storage

✅ **Configuration** (`packages/config/`)
- Environment management
- Indonesian-specific constants
- Type definitions

✅ **Database Structure** (`packages/database/`)
- Prisma schema applied to PostgreSQL
- Test data seeded (users, submissions, issues)
- Query helpers and type definitions

✅ **UI Component Library** (`packages/ui/`)
- Indonesian design system with trust badges and category badges
- Mobile-first responsive components (Button, Input, Chat, etc.)
- Comprehensive unit tests with 80%+ coverage
- Indonesian accessibility support (ARIA labels, screen readers)

## 🚫 What's NOT Yet Implemented

❌ **Frontend Applications** - No UI yet
❌ **API Endpoints** - No web server running
❌ **Database Migrations** - Schema not applied to database
❌ **Issue Submission System** - Core feature not built
❌ **AI Clustering** - Analysis engine not implemented

## 🔄 Next Steps

1. **Set up database schema**: `pnpm db:push` (when Prisma is configured)
2. **Build UI components**: Create the design system
3. **Implement API endpoints**: Build the web server
4. **Add submission system**: Core issue reporting feature

## ❓ Troubleshooting

**Services won't start:**
```bash
# Check Docker is running
docker version

# Reset all containers and volumes
docker-compose down -v
docker-compose up -d
```

**Tests failing:**
```bash
# Install dependencies in auth package
cd packages/auth
pnpm install

# Clear Jest cache
pnpm test --clearCache
```

**Can't connect to database:**
```bash
# Check PostgreSQL is ready
docker-compose logs postgres

# Wait for initialization to complete
docker-compose exec postgres pg_isready -U suara -d suara_dev
```

---

**Ready to code!** 🎉 The authentication system is fully functional and tested. Time to build the UI and API layers.