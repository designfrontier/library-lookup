# Library Lookup - Quick Start Guide

## What This Does
Checks which books from your Amazon wishlist are available at Salt Lake City and Salt Lake County libraries.

## Current Status: ✅ FULLY WORKING

Successfully tested with 362-book wishlist. Finds available books in both library systems.

## Quick Start

### 1. Install Dependencies
```bash
# From project root
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server starts on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# UI opens on http://localhost:5173
```

### 3. Use the App
1. Go to http://localhost:5173
2. Enter your Amazon wishlist URL (must be public)
3. Click "Check Availability"
4. Wait (can take several minutes for large wishlists)
5. View results showing which books are available

## Expected Performance
- **Wishlist fetch**: ~60 seconds for 350+ books
- **Library search**: ~4-6 seconds per book
- **Total for 100 books**: ~5-10 minutes
- **Total for 362 books**: ~40-60 minutes

## Testing Individual Components

### Test Amazon Wishlist Scraping
```bash
cd backend
npm run build

# Edit src/index.ts and add your wishlist URL
node dist/index.js
```

### Test Library Searches
```bash
cd backend
npm run build

# Test Salt Lake City Library
node dist/test-single-book.js

# Test Salt Lake County Library
node dist/test-slco-book.js
```

## Common Issues

### "No books found in wishlist"
- Make sure wishlist is set to **Public** in Amazon settings
- Check URL format: `https://www.amazon.com/hz/wishlist/ls/XXXXXXXXX`

### Library searches timing out
- This is normal - just retries and continues
- Check SESSION_NOTES.md for details

### Duplicates in results
- Fixed! Deduplication is enabled
- Different formats shown separately (Book, eBook, Audiobook)

## What's Next

See SESSION_NOTES.md for:
- Detailed technical implementation
- Known optimizations
- Debugging tips
- AWS deployment plans

## Key Files to Know

- `backend/src/services/amazon.ts` - Fetches wishlist
- `backend/src/services/slc-library.ts` - SLC Public Library
- `backend/src/services/slc-county-library.ts` - SLC County Library
- `backend/src/services/availability.ts` - Main orchestration
- `frontend/src/App.tsx` - User interface

## Need Help?

Check SESSION_NOTES.md for detailed debugging information and technical details.
