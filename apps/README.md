# Applications

This directory contains the main applications of the Suara.id platform.

## Structure

- **web/**: Main user-facing Progressive Web App
  - Chat-based issue submission interface
  - Public dashboard for community insights
  - User profile and verification flow
  - Built with Next.js 14

- **api/**: Backend API server
  - RESTful API endpoints
  - WebSocket chat server
  - Authentication and authorization
  - AI processing coordination
  - Built with Node.js/Express

- **admin/**: Government admin panel
  - Issue moderation interface
  - Analytics and reporting dashboard
  - User management system
  - Built with Next.js 14

## Development

Each application is independently deployable but shares common packages from the `packages/` directory.

```bash
# Run all apps in development
pnpm dev

# Run specific app
pnpm --filter web dev
pnpm --filter api dev
pnpm --filter admin dev
```