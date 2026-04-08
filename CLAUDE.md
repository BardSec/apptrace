# AppTrace

Student app governance platform for K-12 districts. Discover, classify, and govern
applications students use across the network.

## Stack

- Next.js 14 (App Router, React 18 server components)
- TypeScript 5.7
- Prisma ORM 5.22 + PostgreSQL 16
- Tailwind CSS 3.4 + shadcn/ui
- Zod for runtime validation
- Docker Compose (PostgreSQL)

## Project Layout

```
src/
  app/           # Next.js App Router (pages + API routes)
  components/    # React components (ui/, layout/, feature-specific)
  lib/           # Utilities (Prisma client, cn helper)
  services/      # Business logic (classification, ingestion, normalization)
prisma/
  schema.prisma  # Database schema
  migrations/    # Prisma migrations
  seed.ts        # Seed data
```

## Dev Setup

```bash
docker compose up -d              # start PostgreSQL
npm install                       # install deps
npx prisma migrate dev            # run migrations
npm run seed                      # seed sample data
npm run dev                       # dev server → http://localhost:3000
```

## Key Patterns

- Server components by default (App Router)
- Service layer in `src/services/` for domain logic
- Prisma for all DB access — no raw SQL
- Zod schemas for API request/response validation
- shadcn/ui for accessible UI components

## Deploy

Multi-stage Docker build with Next.js standalone output mode.
Prisma migrations run on container start.

## Useful Commands

```bash
npx prisma studio                 # interactive DB browser
npx prisma db push                # push schema without migration
npm run lint                      # Next.js lint
npm run build                     # production build
```
