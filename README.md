# Library Lookup

Check which books from your Amazon wishlist are available at Salt Lake City and Salt Lake County libraries.

## Quick Start

```bash
# Install dependencies
npm install

# Run frontend and backend locally
npm run frontend  # Open http://localhost:3000
npm run backend   # API runs on http://localhost:3001
```

## How It Works

1. Paste your public Amazon wishlist URL
2. App uses Puppeteer to scroll through and fetch **ALL books** from your wishlist (~60 seconds for 350+ books)
3. ~~Searches both SLC and SLC County library catalogs~~ (Library search temporarily disabled)
4. Shows complete list of books from your wishlist

## Current Status

✅ **Working**: Amazon wishlist scraping with full pagination support (tested with 363 books)
⚠️ **In Progress**: Library catalog integration (Polaris redirect issues need fixing)

## Requirements

- Node.js 20+
- Public Amazon wishlist (private wishlists won't work)
- Chrome/Chromium (installed automatically by Puppeteer)
- AWS account (for deployment)

## Performance

- Fetches ~360 books in ~55 seconds
- Uses headless Chrome for infinite scroll simulation
- Progress logged to console during fetch

## Deployment

```bash
cd infrastructure
cdk bootstrap  # First time only
cdk deploy
```

**Note**: AWS Lambda deployment will require chrome-aws-lambda layer for Puppeteer.

See [CLAUDE.md](./CLAUDE.md) for detailed documentation.
