# Suara.id

> Indonesian Citizen Issue Reporting Platform

Suara.id empowers Indonesian communities to report local issues through an intuitive chat interface, while providing government officials and the public with actionable insights through AI-powered data aggregation.

## 🌟 Features

- **Chat-Based Reporting**: WhatsApp-style interface for easy issue submission
- **Multi-Language Support**: Indonesian + regional languages (Javanese, Sundanese, etc.)
- **AI-Powered Processing**: Automatic categorization and quality assessment
- **Trust Scoring System**: User verification with KTP and social media integration
- **Real-Time Dashboard**: Public insights and government analytics
- **Mobile-First Design**: Progressive Web App optimized for all devices

## 🏗️ Architecture

This is a monorepo containing all components of the Suara.id platform:

### Applications (`apps/`)
- **web**: Main user-facing Progressive Web App (Next.js)
- **api**: Backend API server (Node.js/Express)
- **admin**: Government admin panel (Next.js)

### Shared Packages (`packages/`)
- **database**: Prisma schema and database utilities
- **ui**: Shared React components and design system
- **auth**: Authentication and verification utilities
- **ai**: AI/ML processing and language support
- **scoring**: Trust and quality scoring algorithms
- **config**: Shared configurations and types

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm 8+
- PostgreSQL
- Redis

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/suara.id.git
cd suara.id

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Set up database
pnpm db:push
pnpm db:seed

# Start development servers
pnpm dev
```

This will start:
- Web app: http://localhost:3000
- API server: http://localhost:3001
- Admin panel: http://localhost:3002

## 🛠️ Development

### Package Scripts

```bash
# Development
pnpm dev              # Start all apps in development
pnpm dev --filter web # Start specific app

# Building
pnpm build            # Build all packages and apps
pnpm build --filter api # Build specific app

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database
pnpm db:studio        # Open Prisma Studio

# Code Quality
pnpm lint             # Lint all packages
pnpm test             # Run all tests
pnpm format           # Format code with Prettier
```

### Adding New Packages

```bash
# Create new package
mkdir packages/my-package
cd packages/my-package
pnpm init

# Add to workspace dependencies in package.json:
{
  "dependencies": {
    "@suara/my-package": "workspace:*"
  }
}
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/suara_id"
REDIS_URL="redis://localhost:6379"

# AI Services
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-..."

# Authentication
JWT_SECRET="your-secret-key"
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."

# File Storage
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
S3_BUCKET="suara-id-files"

# Maps
GOOGLE_MAPS_API_KEY="..."
```

### Database Setup

1. Create PostgreSQL database
2. Run migrations: `pnpm db:push`
3. Seed test data: `pnpm db:seed`

## 📊 System Overview

### User Journey
1. **Registration**: Phone number verification
2. **Verification**: Optional KTP + selfie for higher trust
3. **Reporting**: Chat-based issue submission
4. **Processing**: AI categorization and quality scoring
5. **Insights**: Public dashboard with anonymous data

### Trust Scoring
- **Basic (1.0-2.0)**: Phone verified only
- **Verified (2.1-4.0)**: KTP + selfie verified  
- **Premium (4.1-5.0)**: Social media + community verified

### Data Flow
```
User Input → Chat AI → Quality Scoring → Trust Weighting → Clustering → Public Dashboard
```

## 🌍 Language Support

| Language | Region | Support Level |
|----------|---------|---------------|
| Bahasa Indonesia | National | Full |
| Javanese | Central/East Java | Full |
| Sundanese | West Java | Full |
| Batak | North Sumatra | Basic |
| Others | Various | Limited |

## 📋 Project Status

- [x] Product Requirements Document
- [x] System Architecture Design
- [x] Monorepo Structure Setup
- [ ] Database Schema Implementation
- [ ] Authentication System
- [ ] Chat Interface Development
- [ ] AI Processing Pipeline
- [ ] Trust Scoring System
- [ ] Public Dashboard
- [ ] Admin Panel
- [ ] Testing & QA
- [ ] Production Deployment

## 📖 Documentation

- [Product Requirements](./design/PRD.md)
- [System Architecture](./design/architecture.md)
- [Development Guide](./docs/development.md)
- [Deployment Guide](./docs/deployment.md)
- [API Documentation](./design/api-spec.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Add tests if applicable
5. Run `pnpm lint` and `pnpm test`
6. Commit using conventional commits
7. Push and create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Indonesian Ministry of Communication and Informatics
- Local government partners
- Open source community
- Beta testing communities across Indonesia

---

**Suara.id** - Empowering Indonesian voices through technology