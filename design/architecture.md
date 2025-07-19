# System Architecture - Suara.id
## Indonesian Citizen Issue Reporting Platform

## Table of Contents
1. [Overview](#overview)
2. [Monorepo Structure](#monorepo-structure)
3. [System Architecture](#system-architecture)
4. [Component Responsibilities](#component-responsibilities)
5. [Data Flow](#data-flow)
6. [Technology Stack](#technology-stack)
7. [Infrastructure](#infrastructure)
8. [Security Architecture](#security-architecture)
9. [Scalability Considerations](#scalability-considerations)
10. [Development Workflow](#development-workflow)

---

## Overview

Suara.id is built as a microservices-oriented monorepo that supports real-time citizen issue reporting through chat interfaces, AI-powered content processing, and transparent public data visualization. The architecture prioritizes accessibility, scalability, and data integrity.

### Core Principles
- **Mobile-First**: Optimized for Indonesian mobile users with varying connectivity
- **AI-Driven**: Automated content processing and quality assessment
- **Real-Time**: Instant feedback and communication
- **Secure**: Privacy-preserving with robust verification systems
- **Scalable**: Designed to handle millions of submissions across Indonesia

---

## Monorepo Structure

```
suara.id/
├── apps/
│   ├── web/                    # Main user-facing application
│   │   ├── src/
│   │   │   ├── app/           # Next.js 14 app router
│   │   │   ├── components/    # React components
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   └── utils/         # Frontend utilities
│   │   ├── public/            # Static assets
│   │   └── package.json
│   │
│   ├── api/                    # Backend API server
│   │   ├── src/
│   │   │   ├── routes/        # API endpoints
│   │   │   ├── services/      # Business logic
│   │   │   ├── middleware/    # Express middleware
│   │   │   ├── websocket/     # WebSocket handlers
│   │   │   └── jobs/          # Background jobs
│   │   └── package.json
│   │
│   └── admin/                  # Government admin panel
│       ├── src/
│       │   ├── app/           # Admin interface
│       │   ├── components/    # Admin-specific components
│       │   └── dashboard/     # Analytics dashboard
│       └── package.json
│
├── packages/
│   ├── database/              # Database schema and utilities
│   │   ├── prisma/
│   │   │   ├── schema.prisma  # Database schema
│   │   │   ├── migrations/    # Database migrations
│   │   │   └── seed.ts        # Test data
│   │   ├── src/
│   │   │   ├── client.ts      # Prisma client setup
│   │   │   └── queries/       # Reusable queries
│   │   └── package.json
│   │
│   ├── ui/                    # Shared UI components
│   │   ├── src/
│   │   │   ├── components/    # Reusable components
│   │   │   ├── styles/        # Shared styles
│   │   │   └── icons/         # Icon components
│   │   └── package.json
│   │
│   ├── auth/                  # Authentication utilities
│   │   ├── src/
│   │   │   ├── providers/     # Auth providers
│   │   │   ├── verification/  # KTP/phone verification
│   │   │   ├── tokens/        # JWT utilities
│   │   │   └── social/        # Social media integration
│   │   └── package.json
│   │
│   ├── ai/                    # AI/ML processing
│   │   ├── src/
│   │   │   ├── llm/           # LLM integrations
│   │   │   ├── vision/        # Image analysis
│   │   │   ├── clustering/    # Issue clustering
│   │   │   ├── language/      # Multi-language support
│   │   │   └── prompts/       # AI prompt templates
│   │   └── package.json
│   │
│   ├── scoring/               # Trust and quality scoring
│   │   ├── src/
│   │   │   ├── trust/         # User trust scoring
│   │   │   ├── quality/       # Submission quality
│   │   │   ├── abuse/         # Anti-abuse detection
│   │   │   └── algorithms/    # Scoring algorithms
│   │   └── package.json
│   │
│   └── config/                # Shared configurations
│       ├── src/
│       │   ├── env/           # Environment configs
│       │   ├── constants/     # Shared constants
│       │   └── types/         # TypeScript types
│       └── package.json
│
├── design/
│   ├── PRD.md                 # Product Requirements
│   ├── architecture.md       # This document
│   └── api-spec.md           # API specifications
│
├── docs/                      # Documentation
│   ├── deployment.md         # Deployment guide
│   ├── development.md        # Development setup
│   └── contributing.md       # Contribution guidelines
│
├── tools/                     # Development tools
│   ├── scripts/              # Utility scripts
│   └── generators/           # Code generators
│
├── package.json              # Root package.json
├── turbo.json               # Turborepo configuration
└── docker-compose.yml       # Local development setup
```

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile PWA    │    │  Admin Panel    │    │ Public Dashboard│
│                 │    │                 │    │                 │
│ • Chat UI       │    │ • Issue Review  │    │ • Map View      │
│ • Camera        │    │ • Analytics     │    │ • Statistics    │
│ • GPS           │    │ • User Mgmt     │    │ • Trends        │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │              ┌───────▼──────────────────────▼───────┐
          │              │              API Gateway             │
          │              │                                      │
          │              │ • Rate Limiting                      │
          │              │ • Authentication                     │
          │              │ • Load Balancing                     │
          │              └───────┬──────────────────────────────┘
          │                      │
    ┌─────▼──────────────────────▼─────┐
    │           Backend API            │
    │                                  │
    │ ┌─────────────┐ ┌─────────────┐  │
    │ │  WebSocket  │ │ REST APIs   │  │
    │ │   Server    │ │             │  │
    │ └─────────────┘ └─────────────┘  │
    │                                  │
    │ ┌─────────────┐ ┌─────────────┐  │
    │ │AI Processing│ │ Scoring     │  │
    │ │   Engine    │ │  System     │  │
    │ └─────────────┘ └─────────────┘  │
    │                                  │
    │ ┌─────────────┐ ┌─────────────┐  │
    │ │ File Upload │ │ Background  │  │
    │ │   Handler   │ │    Jobs     │  │
    │ └─────────────┘ └─────────────┘  │
    └──────────────┬───────────────────┘
                   │
    ┌──────────────▼───────────────────┐
    │        Data Layer               │
    │                                 │
    │ ┌─────────┐ ┌─────────┐ ┌──────┐│
    │ │PostgreSQL│ │ Redis   │ │ S3   ││
    │ │Database │ │ Cache   │ │Files ││
    │ └─────────┘ └─────────┘ └──────┘│
    └─────────────────────────────────┘
```

### External Services Integration

```
┌─────────────────────────────────────────┐
│              External APIs               │
├─────────────────────────────────────────┤
│ • OpenAI/Claude (LLM Processing)        │
│ • Twilio (SMS Verification)             │
│ • Google Maps (Location Services)       │
│ • Facebook/Instagram APIs (Social Auth) │
│ • AWS S3 (File Storage)                 │
│ • Indonesian Gov APIs (Address Valid.)  │
└─────────────────────────────────────────┘
```

---

## Component Responsibilities

### Frontend Applications

#### Web App (apps/web)
**Primary Responsibilities:**
- Chat-based issue submission interface
- Real-time conversation with AI bot
- Photo/video capture and upload
- GPS location detection and confirmation
- User profile and verification flow
- Public dashboard for community insights

**Key Features:**
- Progressive Web App (PWA) capabilities
- Offline functionality for draft submissions
- Multi-language support (Indonesian + regional)
- Responsive design optimized for mobile
- Real-time updates via WebSocket

**Technology Stack:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- PWA capabilities
- WebSocket client

#### Admin Panel (apps/admin)
**Primary Responsibilities:**
- Government dashboard with prioritized issues
- Content moderation interface
- Trust score management
- Analytics and reporting
- User management and verification review

**Key Features:**
- Role-based access control
- Real-time issue monitoring
- Bulk operations for issue management
- Advanced filtering and search
- Data export capabilities

### Backend Services

#### API Server (apps/api)
**Primary Responsibilities:**
- RESTful API endpoints
- WebSocket chat server
- Authentication and authorization
- File upload handling
- Background job coordination
- External API integration

**Core Services:**
- **Chat Service**: Real-time conversation management
- **Submission Service**: Issue processing and validation
- **User Service**: Profile and verification management
- **Notification Service**: SMS and push notifications
- **Analytics Service**: Data aggregation and insights

### Shared Packages

#### Database Package (packages/database)
**Responsibilities:**
- Prisma schema definition
- Database migration management
- Seed data and fixtures
- Query utilities and helpers
- Connection management

**Key Tables:**
- `users` - User profiles and authentication
- `user_trust_scores` - Trust level tracking
- `submissions` - Issue reports and conversations
- `submission_quality_scores` - Quality assessments
- `issues` - Processed and categorized issues
- `clusters` - Issue groupings and aggregations
- `verifications` - KTP and document verification

#### AI Package (packages/ai)
**Responsibilities:**
- LLM conversation management
- Content classification and analysis
- Multi-language processing
- Image analysis and validation
- Clustering algorithms

**Core Modules:**
- **Conversation Engine**: Chat flow management
- **Classifier**: Issue categorization
- **Language Processor**: Multi-dialect support
- **Vision Analyzer**: Image content analysis
- **Clustering Engine**: Issue grouping algorithms

#### Scoring Package (packages/scoring)
**Responsibilities:**
- User trust score calculation
- Submission quality assessment
- Anti-abuse detection
- Weight calculation for clustering

**Scoring Components:**
- **Trust Calculator**: Multi-factor trust scoring
- **Quality Assessor**: Content quality evaluation
- **Abuse Detector**: Spam and fake content detection
- **Weight Engine**: Clustering weight calculation

#### Auth Package (packages/auth)
**Responsibilities:**
- JWT token management
- Phone number verification
- KTP document verification
- Social media integration
- Session management

**Authentication Flow:**
1. Phone number registration
2. OTP verification
3. Profile creation
4. Optional KTP verification
5. Social media linking

---

## Data Flow

### Issue Submission Flow

```
User Input → Chat Interface → WebSocket → Conversation Engine
    ↓
AI Processing → Language Detection → Intent Recognition
    ↓
Quality Scoring → Trust Score Check → Content Validation
    ↓
Database Storage → Clustering Engine → Public Aggregation
    ↓
Dashboard Update → Government Notification → User Confirmation
```

### Detailed Flow Breakdown

#### 1. User Interaction
```
Mobile User → PWA Chat Interface → Real-time Input Capture
   ↓
Voice/Text/Image → Local Processing → WebSocket Transmission
```

#### 2. Backend Processing
```
WebSocket Server → Message Validation → AI Processing Queue
   ↓
LLM Analysis → Content Classification → Quality Assessment
   ↓
Trust Score Application → Database Transaction → Response Generation
```

#### 3. Data Aggregation
```
Individual Submission → Clustering Algorithm → Issue Grouping
   ↓
Geographic Clustering → Category Analysis → Priority Scoring
   ↓
Public Data Preparation → Dashboard Update → Government Alert
```

#### 4. Verification Flow
```
User Registration → Phone Verification → Basic Trust Level
   ↓
KTP Upload → OCR Processing → Facial Recognition → Verified Level
   ↓
Social Linking → Account Validation → Community Endorsement → Premium Level
```

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Real-time**: Socket.IO client
- **PWA**: next-pwa
- **Maps**: Google Maps JavaScript API
- **Camera**: Web APIs (getUserMedia)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **WebSocket**: Socket.IO
- **ORM**: Prisma
- **Queue**: Bull (Redis-based)
- **File Upload**: Multer + AWS SDK
- **Authentication**: JWT + bcrypt

### Database & Storage
- **Primary Database**: PostgreSQL
- **Cache**: Redis
- **File Storage**: AWS S3
- **Search**: PostgreSQL Full-text Search
- **CDN**: CloudFront

### AI & External Services
- **LLM**: OpenAI GPT-4 / Anthropic Claude
- **Computer Vision**: OpenAI Vision API
- **SMS**: Twilio
- **Maps**: Google Maps API
- **Social Auth**: OAuth 2.0
- **Document OCR**: AWS Textract / Google Vision

### Development & Deployment
- **Monorepo**: Turborepo
- **Package Manager**: pnpm
- **CI/CD**: GitHub Actions
- **Containers**: Docker
- **Orchestration**: Kubernetes
- **Monitoring**: DataDog / New Relic
- **Error Tracking**: Sentry

---

## Infrastructure

### Development Environment
```
Local Development:
├── Docker Compose
│   ├── PostgreSQL container
│   ├── Redis container
│   └── MinIO (S3-compatible)
├── Next.js dev server
├── API server (nodemon)
└── Background job processor
```

### Production Architecture
```
Load Balancer (CloudFlare)
├── CDN (Static Assets)
├── App Instances (Kubernetes)
│   ├── Web App Pods
│   ├── API Pods
│   └── Admin Pods
├── Background Workers
│   ├── AI Processing
│   ├── Image Processing
│   └── Notification Queue
└── Data Layer
    ├── PostgreSQL (Primary + Read Replicas)
    ├── Redis Cluster
    └── S3 Buckets
```

### Scaling Strategy
- **Horizontal Scaling**: Multiple app instances behind load balancer
- **Database Scaling**: Read replicas for dashboard queries
- **Background Processing**: Separate worker nodes for AI tasks
- **CDN**: Static asset delivery and image optimization
- **Caching**: Redis for session, rate limiting, and frequently accessed data

---

## Security Architecture

### Authentication & Authorization
```
Multi-Layer Security:
├── API Gateway (Rate Limiting, DDoS Protection)
├── JWT Authentication (Stateless)
├── Role-Based Access Control (RBAC)
├── Trust Score Validation
└── Content Security Policy (CSP)
```

### Data Protection
- **Encryption at Rest**: Database and file storage encryption
- **Encryption in Transit**: HTTPS/WSS for all communications
- **Personal Data**: Anonymization before public display
- **Document Storage**: Encrypted KTP and verification documents
- **Audit Logging**: All admin actions and data access

### Input Validation & Sanitization
- **File Upload**: Virus scanning, type validation, size limits
- **Text Input**: XSS prevention, SQL injection protection
- **Image Processing**: Metadata stripping, format validation
- **Rate Limiting**: Per-user and per-IP request limits

---

## Scalability Considerations

### Performance Optimizations
- **Database Indexing**: Optimized queries for geographic and temporal data
- **Connection Pooling**: Efficient database connection management
- **Image Optimization**: WebP conversion, multiple sizes
- **Lazy Loading**: Progressive data loading in dashboard
- **Pagination**: Efficient large dataset handling

### Monitoring & Observability
- **Application Metrics**: Response times, error rates, throughput
- **Infrastructure Metrics**: CPU, memory, disk usage
- **Business Metrics**: Submissions per day, user engagement
- **Error Tracking**: Real-time error monitoring and alerting
- **Performance Monitoring**: Core Web Vitals, mobile performance

### Disaster Recovery
- **Database Backups**: Automated daily backups with point-in-time recovery
- **File Storage**: Cross-region replication
- **Application Deployment**: Blue-green deployment strategy
- **Monitoring**: Health checks and automatic failover

---

## Development Workflow

### Code Organization
- **Monorepo Benefits**: Shared code, unified versioning, coordinated deploys
- **Package Dependencies**: Clear dependency graph between packages
- **Type Safety**: End-to-end TypeScript coverage
- **Code Sharing**: Reusable components and utilities

### Development Process
1. **Feature Branches**: Branch per feature with PR reviews
2. **Automated Testing**: Unit, integration, and E2E tests
3. **CI/CD Pipeline**: Automated builds, tests, and deployments
4. **Code Quality**: ESLint, Prettier, and automated code review
5. **Documentation**: Inline code docs and architecture updates

### Build & Deployment
```
Development Workflow:
├── Local Development (Docker Compose)
├── Feature Branch (GitHub)
├── Pull Request (Automated Tests)
├── Staging Deployment (Integration Testing)
├── Production Deployment (Blue-Green)
└── Monitoring (Real-time Alerts)
```

This architecture provides a robust, scalable foundation for Suara.id while maintaining simplicity for Indonesian users and ensuring data integrity through comprehensive scoring systems.