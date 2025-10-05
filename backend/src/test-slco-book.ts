import { searchSaltLakeCountyLibrary } from './services/slc-county-library';
import type { Book } from './types';

async function testSLCOBook() {
  const book: Book = {
    title: 'Atomic Habits',
    author: 'James Clear'
  };

  console.log(`Searching SLC County Library for: ${book.title} by ${book.author}`);

  const results = await searchSaltLakeCountyLibrary(book);

  console.log(`\nFound ${results.length} available copies:`);
  results.forEach((result, i) => {
    console.log(`${i + 1}. ${result.title}`);
    console.log(`   Author: ${result.author}`);
    console.log(`   Format: ${result.format}`);
    console.log(`   Available: ${result.available}`);
    if (result.branch) console.log(`   Branch: ${result.branch}`);
  });

  process.exit(0);
}

testSLCOBook().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
