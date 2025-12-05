# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NestJS backend for KIA Miami - an AI-powered advertising campaign analytics platform. Ingests campaign data from Google Ads, Meta Ads, and TikTok Ads Excel/CSV files, stores in PostgreSQL via Prisma, and provides AI analysis using OpenAI.

## Commands

```bash
# Development
npm run start:dev          # Start with hot reload

# Build
npm run build              # Compile TypeScript

# Database
npm run prisma:generate    # Generate Prisma client after schema changes
npm run prisma:migrate     # Run database migrations
npm run prisma:studio      # Open Prisma Studio GUI

# Data Ingestion (from data/raw/ folder)
npm run ingest:all         # Ingest all platform files
npm run ingest:google      # Ingest Google Ads only
npm run ingest:meta        # Ingest Meta Ads only
npm run ingest:tiktok      # Ingest TikTok Ads only

# Testing
npm run test:query         # Test LLM query functionality
npm run test:report        # Test report generation
```

## Architecture

### Module Structure
- **PrismaModule** - Database access layer (PostgreSQL)
- **AuthModule** - JWT authentication with passport
- **UsersModule** - User management
- **IngestModule** - Excel/CSV parsing for campaign data ingestion
- **LlmModule** - OpenAI integration with knowledge-based prompts
- **ReportsModule** - Scheduled report generation

### Data Flow
1. Excel/CSV files placed in `data/raw/` with platform prefix (Google_, Meta_, Tiktok_)
2. `IngestService` parses files using platform-specific column mappings
3. Data stored in `Campaign` and `CampaignMetric` tables (multi-tenant via `tenantId`)
4. `LlmService` + `KnowledgeService` answer queries using campaign data + predefined formulas

### Key Files
- `src/ingest/ingest.service.ts` - Platform-specific parsing logic, handles UTF-16 encoding for Google Ads CSV
- `src/llm/knowledge.service.ts` - Loads formulas and prompt templates from JSON files
- `src/llm/knowledge/formulas.json` - Marketing KPI calculation formulas
- `src/llm/knowledge/prompts.json` - System prompts and templates for AI analysis
- `prisma/schema.prisma` - Database schema with Campaign, CampaignMetric, Report models

### Multi-Platform Column Mapping
Each platform has specific column name mappings in `IngestService`:
- **TikTok**: `campaignname`, `cost`, `impressions`, `clicksdestination`, etc.
- **Meta**: `nombredelacampana`, `importegastadousd`, `impresiones`, etc.
- **Google**: `campana`, `costo`, `clics`, `impr`, etc.

Column names are normalized (lowercase, no accents, no spaces) before matching.

### Campaign Uniqueness
Campaigns are identified by `externalId` (generated from name + metrics + row index) combined with `platform`. This allows campaigns with identical names but different data to coexist.

## Environment Variables

Required in `.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key (optional, runs in mock mode without it)
- `OPENAI_MODEL` - Model to use (defaults to gpt-4o-mini)
- `JWT_SECRET` - For authentication

## API

All routes prefixed with `/api`. Default port: 4006.
- `POST /api/llm/query` - Natural language queries about campaigns
- `POST /api/llm/analyze` - AI analysis of campaign performance
- `POST /api/ingest/all` - Trigger data ingestion
- `GET /api/llm/knowledge-stats` - View loaded formulas/prompts
