import { getWishlistBooks } from './amazon';
import { searchSaltLakeCityLibrary } from './slc-library';
import { searchSaltLakeCountyLibrary } from './slc-county-library';
import type { Book, BookAvailability } from '../types';

export async function checkAvailability(wishlistUrl: string): Promise<BookAvailability[]> {
  // Get books from Amazon wishlist
  const books = await getWishlistBooks(wishlistUrl);

  console.log(`\nChecking availability for ${books.length} books across 2 library systems...`);

  const results: BookAvailability[] = [];

  // Check each book against both library systems
  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    console.log(`[${i + 1}/${books.length}] Checking: ${book.title.substring(0, 50)}...`);

    try {
      // Search both libraries in parallel for better performance
      const [slcResults, slcoResults] = await Promise.all([
        searchSaltLakeCityLibrary(book),
        searchSaltLakeCountyLibrary(book)
      ]);

      if (slcResults.length > 0) {
        console.log(`  ✓ Found ${slcResults.length} copies at SLC Library`);
      }
      results.push(...slcResults.map(r => ({
        ...r,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        library: 'Salt Lake City Public Library'
      })));

      if (slcoResults.length > 0) {
        console.log(`  ✓ Found ${slcoResults.length} copies at SLC County Library`);
      }
      results.push(...slcoResults.map(r => ({
        ...r,
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        library: 'Salt Lake County Library'
      })));

      // Add a small delay between books to avoid overwhelming servers
      if (i < books.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`  ✗ Error checking ${book.title}:`, error);
    }
  }

  // Filter to only available books
  const availableBooks = results.filter(r => r.available);

  // Deduplicate - keep unique combinations of title + library + format
  const uniqueBooks = availableBooks.filter((book, index, self) => {
    return index === self.findIndex(b =>
      b.title === book.title &&
      b.library === book.library &&
      b.format === book.format
    );
  });

  console.log(`\n✓ Complete! Found ${uniqueBooks.length} unique available books (${availableBooks.length} total copies) out of ${books.length} searched`);

  return uniqueBooks;
}
