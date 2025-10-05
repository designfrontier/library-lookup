# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Library Lookup connects to Amazon wishlists and checks book availability across local library systems. Users select a wishlist, and the app searches Salt Lake City and Salt Lake County libraries to show which books are currently available for checkout, including format (physical/digital) and branch location.

## Tech Stack

- **Frontend**: React + TypeScript
- **Backend**: Node.js + TypeScript
- **Infrastructure**: AWS CDK
- **Libraries**: Salt Lake City Public Library & Salt Lake County Library (hardcoded)

Note: No database for v1 - all operations are stateless queries.

## Architecture

### Frontend (React)
- Amazon wishlist selection interface
- Book availability results display
- Shows: book title, availability status, format, and branch location

### Backend (Node.js)
- Amazon wishlist API integration
- Library catalog search integration (Salt Lake City & Salt Lake County)
- Book availability checking logic
- REST API endpoints

### Infrastructure (CDK)
- Lambda functions for backend logic
- API Gateway for REST endpoints
- S3 + CloudFront for frontend hosting (if needed)

### Data Flow
1. User authenticates with Amazon and selects wishlist
2. Backend fetches wishlist books from Amazon
3. For each book, query both library systems
4. Filter for "available now" status
5. Return consolidated results with format and location

## Development Commands

### Local Development

```bash
# Install all dependencies
npm install

# Run frontend (localhost:3000)
npm run frontend

# Run backend (localhost:3001)
npm run backend

# Build backend for Lambda deployment
npm run backend:build
```

### Individual Workspace Commands

```bash
# Frontend
cd frontend
npm run dev      # Start dev server
npm run build    # Build for production

# Backend
cd backend
npm run dev      # Start dev server with hot reload
npm run build    # Compile TypeScript to JavaScript
npm run start    # Run compiled code

# Infrastructure
cd infrastructure
npm run build    # Compile CDK TypeScript
npm run cdk      # Run CDK CLI commands
npm run deploy   # Build and deploy to AWS
```

### AWS Deployment

```bash
# From root directory
npm run deploy

# Or from infrastructure directory
cd infrastructure
cdk bootstrap    # First time only - prepare AWS account
cdk deploy       # Deploy stack to AWS
cdk diff         # Preview changes
cdk destroy      # Remove stack from AWS
```

## Project Structure

```
library-lookup/
├── frontend/          # React app (Vite + TypeScript)
│   ├── src/
│   │   ├── App.tsx           # Main component with wishlist form
│   │   ├── main.tsx          # Entry point
│   │   └── index.css         # Styles
│   └── package.json
├── backend/           # Node.js Express API
│   ├── src/
│   │   ├── index.ts          # Express server for local dev
│   │   ├── lambda.ts         # Lambda handler wrapper
│   │   ├── types.ts          # TypeScript interfaces
│   │   └── services/
│   │       ├── availability.ts       # Main orchestration logic
│   │       ├── amazon.ts             # Amazon wishlist scraper
│   │       ├── slc-library.ts        # SLC library search
│   │       └── slc-county-library.ts # SLC County library search
│   └── package.json
└── infrastructure/    # AWS CDK
    ├── bin/
    │   └── library-lookup.ts  # CDK app entry
    └── lib/
        └── library-lookup-stack.ts  # Stack definition
```

## Implementation Notes

### Amazon Wishlist Integration
- No official Amazon API - uses **Puppeteer** for browser automation
- Wishlists must be **public** to be accessible
- **Handles infinite scroll automatically** - fetches ALL books from wishlist
  - Uses headless Chrome to simulate scrolling
  - Typical performance: ~60 seconds for 350+ books
  - Stops when no new items load after 3 scroll attempts
- Selectors: `li[data-itemid]` for items, `h2 a` for titles, `span[id^="item-byline"]` for authors
- May need adjustment if Amazon changes their HTML structure
- **Note**: Puppeteer adds ~100MB to deployment size and requires Chrome binary

### Library Catalog Integration
- Both libraries use **Polaris ILS** system
- Web scraping approach using Cheerio
- Searches by title + author combination
- Filters results to only show "available now" items
- Extracts format (physical/ebook/audiobook) and branch location

### API Endpoints

**POST /api/check-availability**
- Body: `{ "wishlistUrl": "https://www.amazon.com/hz/wishlist/ls/..." }`
- Response: `{ "books": [{ title, author, library, available, format, branch }] }`

### Common Issues

1. **Amazon scraping fails**: Amazon may have changed their HTML structure - check selectors in `backend/src/services/amazon.ts`
   - Current working selectors: `li[data-itemid]` for items, `h2 a` for titles, `span[id^="item-byline"]` for authors
2. **Library searches return no results**: Polaris HTML may have changed - check selectors in library service files
   - Library scraping needs testing with real catalog searches
   - Selectors may need adjustment based on actual Polaris HTML structure
3. **CORS errors**: Ensure backend CORS is properly configured for your frontend URL

### Testing Notes

- Amazon wishlist scraping with Puppeteer tested successfully with 363-item wishlist
- Fetches all books via infinite scroll simulation (~54 seconds for 362 books)
- Library catalog scraping has redirect issues and is currently disabled
- Library search needs debugging - Polaris catalog URLs cause infinite redirect loops

