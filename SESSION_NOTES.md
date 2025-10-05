# Library Lookup - Development Session Notes

## Current Status: ✅ WORKING

The application successfully:
- Fetches all books from Amazon wishlists (tested with 362 books)
- Searches Salt Lake City Public Library catalog
- Searches Salt Lake County Library catalog
- Returns available books with format information
- Runs in parallel for better performance

## Key Implementation Details

### 1. Amazon Wishlist Scraping
**File**: `backend/src/services/amazon.ts`

- Uses Puppeteer with infinite scroll to load all wishlist items
- Scrolls until no new items appear (checks 3 times with no change)
- Successfully tested with 362-book wishlist (~60 seconds to fetch)
- Extracts: title, author, ASIN

**Known Optimization**: Can improve scroll detection - if item count is not divisible by 10, that's the end. Or if one scroll attempt doesn't add items, stop (no need for 3 retries).

### 2. Library Catalog Searches
**Files**:
- `backend/src/services/slc-library.ts` (Salt Lake City)
- `backend/src/services/slc-county-library.ts` (Salt Lake County)

Both libraries use Polaris ILS system with similar structure:

**Critical Implementation Details**:
1. **URLs**:
   - SLC: `https://catalog.slcpl.org`
   - SLC County: `https://catalog.slcolibrary.org/polaris` (note: includes `/polaris` path!)

2. **Search Method** (IMPORTANT):
   - Navigate to catalog homepage
   - Type search query into `#textboxTerm`
   - Wait 500ms for autocomplete to appear
   - **Press Enter key** (NOT form.submit()!)
   - Why: Autocomplete dropdown interferes with programmatic form submission

3. **Selectors**:
   - Title links: `a[href*="/search/title.aspx"]` (NOT `/bib/` like many catalogs)
   - Extract from parent container text for availability

4. **Availability Detection**:
   - Look for: "available", "on shelf", "check shelf"
   - Exclude: "unavailable", "not available", "checked out", "on order"

5. **Rate Limiting**:
   - 500ms delay between books
   - Searches both libraries in parallel (using Promise.all)

### 3. Performance Optimizations

**Parallel Searches**:
- Both libraries searched simultaneously per book using `Promise.all()`
- Cuts search time roughly in half
- File: `backend/src/services/availability.ts:21-24`

**Deduplication**:
- Removes duplicate entries (same title + library + format)
- Different formats shown separately (Book, eBook, Audiobook, etc.)
- File: `backend/src/services/availability.ts:60-71`

**Browser Reuse**:
- Each library service maintains a single browser instance
- Reduces overhead of launching browsers repeatedly

### 4. Known Issues & Edge Cases

**Issue**: SLC County autocomplete dropdown
- **Problem**: Autocomplete interferes with form.submit()
- **Solution**: Use keyboard.press('Enter') instead
- **Location**: Both library search services

**Issue**: Navigation timeouts
- **Problem**: networkidle2 sometimes doesn't fire
- **Solution**: Use domcontentloaded, catch timeout, check URL
- **Location**: Both library search services:48-67

## Testing

### Test Scripts Created
All in `backend/src/`:
1. `test-single-book.ts` - Test SLC library with one book
2. `test-slco-book.ts` - Test SLC County library with one book
3. `test-slco-search.ts` - Interactive test with browser visible
4. `test-form-search.ts` - Debug form submission (SLC)
5. `debug-real-search.ts` - Analyze HTML structure

### Running Tests
```bash
cd backend
npm run build
node dist/test-single-book.js    # Test SLC
node dist/test-slco-book.js      # Test SLC County
```

### Test Results
- Amazon wishlist: ✅ 362 books fetched successfully
- SLC Library: ✅ Finding available books
- SLC County Library: ✅ Finding available books
- Parallel searches: ✅ Working
- Deduplication: ✅ Working

## Architecture

```
library-lookup/
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── amazon.ts           # Wishlist scraping
│   │   │   ├── slc-library.ts      # SLC Public Library
│   │   │   ├── slc-county-library.ts  # SLC County Library
│   │   │   └── availability.ts     # Orchestrates searches
│   │   ├── types.ts                # TypeScript types
│   │   └── index.ts                # Express API server
│   └── package.json
├── frontend/
│   ├── src/
│   │   └── App.tsx                 # React UI
│   └── package.json
└── infrastructure/                  # AWS CDK (not yet implemented)
```

## API Endpoints

### POST /api/check-availability
**Body**:
```json
{
  "wishlistUrl": "https://www.amazon.com/hz/wishlist/ls/..."
}
```

**Response**:
```json
{
  "books": [
    {
      "title": "Book Title",
      "author": "Author Name",
      "library": "Salt Lake City Public Library",
      "available": true,
      "format": "eBook",
      "branch": null
    }
  ]
}
```

## Development Commands

```bash
# Backend
cd backend
npm install
npm run build
npm run dev          # Start dev server on port 3001

# Frontend
cd frontend
npm install
npm run dev          # Start dev server on port 5173

# Both together
npm run dev          # From root (if configured)
```

## Next Steps / TODO

1. **Optimize Amazon scroll logic** (pending):
   - Change from 3 retries to smart detection
   - Stop if count not divisible by 10 OR one scroll adds nothing

2. **AWS Deployment**:
   - Configure Lambda with chrome-aws-lambda layer for Puppeteer
   - Set up API Gateway
   - Deploy frontend to S3/CloudFront
   - Update CORS settings

3. **Enhancements**:
   - Add caching (DynamoDB?) to avoid re-searching same books
   - Add more libraries (if requested)
   - Better error handling/retry logic
   - Add loading progress updates to frontend
   - Branch information extraction (currently undefined)

## Debugging Tips

1. **Search not finding results?**
   - Check URL is correct (SLC County needs `/polaris` path)
   - Verify selectors match: `a[href*="/search/title.aspx"]`
   - Check autocomplete isn't blocking: use Enter key, not form.submit()

2. **Navigation timeouts?**
   - Use `domcontentloaded` not `networkidle2`
   - Always check URL after timeout to see if navigation succeeded
   - Add logging to see where it's getting stuck

3. **Duplicates appearing?**
   - Check deduplication logic in availability.ts
   - Verify it's checking title + library + format

4. **Browser issues?**
   - Check if browser instances are being reused (getBrowser pattern)
   - Make sure pages are closed after use
   - Add delays if getting rate limited

## Important Code Patterns

### Library Search Pattern
```typescript
// 1. Navigate to homepage
await page.goto(CATALOG_BASE, { waitUntil: 'networkidle2' });

// 2. Type search query
await page.type('#textboxTerm', searchQuery);
await new Promise(resolve => setTimeout(resolve, 500)); // Wait for autocomplete

// 3. Press Enter (NOT form.submit!)
const navPromise = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
await page.keyboard.press('Enter');
await navPromise;

// 4. Extract results
const titleLinks = await page.evaluate(() => {
  return document.querySelectorAll('a[href*="/search/title.aspx"]');
});
```

### Parallel Library Searches
```typescript
const [slcResults, slcoResults] = await Promise.all([
  searchSaltLakeCityLibrary(book),
  searchSaltLakeCountyLibrary(book)
]);
```

## Performance Metrics

- **Amazon wishlist fetch**: ~60 seconds for 362 books
- **Per-book search**: ~4-6 seconds per book (both libraries in parallel)
- **Total for 362 books**: ~40-60 minutes estimated
- **With optimizations**: Could be faster with better caching/parallelization

## Environment Variables (if needed later)
None currently, but may want to add:
- `PUPPETEER_HEADLESS=true` (for production)
- `PORT=3001` (backend port)
- `VITE_API_URL=http://localhost:3001` (frontend API URL)
