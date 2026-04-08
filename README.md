# AppTrace

Student App Governance platform for K-12 districts. Discover, classify, and govern the applications students use across your network.

## Quick Start

```bash
# Start the database
docker compose up -d

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Run database migrations
npx prisma migrate dev

# Seed the database with sample data
npm run seed

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture

- **Next.js 14 App Router** — React server components, file-based routing
- **Prisma ORM** — Type-safe database access with migrations
- **PostgreSQL 16** — Primary data store (via Docker Compose)
- **Tailwind CSS + shadcn/ui** — Utility-first styling with accessible components
- **Zod** — Runtime schema validation

## Project Structure

```
src/
  app/              # Next.js App Router pages and API routes
  components/       # React components (ui, layout, feature-specific)
  lib/              # Shared utilities (Prisma client, cn helper)
  services/         # Business logic (classification, ingestion, normalization)
prisma/             # Database schema and seed data
```
