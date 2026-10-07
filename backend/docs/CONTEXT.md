# Backlyst Backend Context

## Project Snapshot

- Name: `backlyst` (NestJS backend)
- Language: TypeScript
- Runtime: Node.js
- API style: REST + WebSocket gateway
- Database: PostgreSQL with Prisma
- Queue/Cache: Redis + BullMQ

## Core Stack

- Framework: `@nestjs/*` v11
- ORM: `@prisma/client` + `prisma`
- Auth: JWT + Passport
- Docs: Swagger (`@nestjs/swagger`)
- File storage: Cloudinary + AWS S3 client utilities
- Mail: Nodemailer + Handlebars templates

## Main App Structure

- Entry point: `src/main.ts`
- Root module: `src/app.module.ts`
- Shared building blocks:
  - `src/common` (guards, decorators, filters, upload helpers)
  - `src/config` (Swagger setup)
  - `src/utils`, `src/types`

## Feature Modules

- `src/modules/auth` - authentication flows, guards, JWT strategy
- `src/modules/user` - user management + admin-user submodule
- `src/modules/website` - website/business-domain endpoints
- `src/modules/messaging` - messaging APIs and WebSocket gateway
- Infra modules:
  - `src/prisma` - Prisma service/module
  - `src/redis` - Redis module/service
  - `src/cache` - cache helpers around Redis

## Database Layout

- Prisma schema root: `prisma/schema/schema.prisma`
- Split schemas:
  - `prisma/schema/auth.prisma`
  - `prisma/schema/user.prisma`
  - `prisma/schema/website.prisma`
  - `prisma/schema/message.prisma`
  - `prisma/schema/placement.prisma`
  - `prisma/schema/enums.prisma`
- Migrations: `prisma/migrations/*`
- Seed script: `prisma/seed.ts`

## Important Commands

- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Unit tests: `npm test`
- E2E tests: `npm run test:e2e`
- Generate swagger file: `npm run swagger:gen`
- Seed database: `npm run seed`

## Existing Documentation

- `docs/Authentication-guide.md`
- `docs/file-upload-guide.md`
- `docs/redis-bullmq-guide.md`
- `docs/swagger-implementation-guide.md`

## Notes For Contributors

- Global validation pipe and exception filter are configured in `src/main.ts`.
- CORS currently allows local ports and wildcard (`*`), so review before production hardening.
- Environment values are required for DB, auth, mail, storage, and redis integrations.
