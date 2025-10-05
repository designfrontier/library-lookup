import puppeteer, { Browser } from 'puppeteer';
import type { Book, LibrarySearchResult } from '../types';

const SLC_CATALOG_BASE = 'https://catalog.slcpl.org';

// Reuse browser instance for better performance
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browserInstance;
}

export async function searchSaltLakeCityLibrary(book: Book): Promise<LibrarySearchResult[]> {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();

    // Navigate to homepage first
    await page.goto(SLC_CATALOG_BASE, { waitUntil: 'networkidle2', timeout: 15000 });

    // Use the search form on the homepage
    const searchQuery = book.title;

    // Find and fill the search input (Polaris uses #textboxTerm)
    await page.waitForSelector('#textboxTerm', { timeout: 5000 });
    await page.type('#textboxTerm', searchQuery);

    // Wait briefly for autocomplete to appear
    await new Promise(resolve => setTimeout(resolve, 500));

    // Press Enter to submit (more reliable than form.submit() with autocomplete)
    const navigationPromise = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.keyboard.press('Enter');

    // Wait for navigation - with timeout handling
    try {
      await navigationPromise;
    } catch (error) {
      // Navigation might have already completed or timed out
      // Check if we're on a search results page
      const url = page.url();
      if (!url.includes('searchresults.aspx') && !url.includes('search')) {
        throw error; // Re-throw if we're not on results page
      }
    }

    // Wait a bit for dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extract results from Polaris search results
    const results: LibrarySearchResult[] = await page.evaluate((bookTitle, bookAuthor) => {
      const items: LibrarySearchResult[] = [];

      // Polaris uses links to /search/title.aspx for book titles
      const titleLinks = document.querySelectorAll('a[href*="/search/title.aspx"]');

      titleLinks.forEach((linkEl) => {
        const title = linkEl.textContent?.trim() || '';

        // Skip if title doesn't match (basic relevance filter)
        if (!title.toLowerCase().includes(bookTitle.toLowerCase().substring(0, 20))) {
          return;
        }

        // Find the parent container for this result
        let container: Element | null = linkEl.parentElement;
        let depth = 0;
        while (container && depth < 15) {
          // Look for a container that has availability info
          if (container.textContent && container.textContent.length > title.length + 50) {
            break;
          }
          container = container.parentElement;
          depth++;
        }

        if (!container) return;

        const containerText = container.textContent?.toLowerCase() || '';

        // Check for availability
        const available = (containerText.includes('available') ||
                          containerText.includes('on shelf') ||
                          containerText.includes('check shelf')) &&
                         !containerText.includes('unavailable') &&
                         !containerText.includes('not available') &&
                         !containerText.includes('checked out') &&
                         !containerText.includes('on order');

        if (available) {
          // Try to extract author
          const authorMatch = containerText.match(/by ([^,\n]+)/i);
          const author = authorMatch ? authorMatch[1].trim() : '';

          // Try to determine format
          let format = 'Book';
          if (containerText.includes('ebook') || containerText.includes('e-book')) format = 'eBook';
          else if (containerText.includes('audiobook') || containerText.includes('audio book')) format = 'Audiobook';
          else if (containerText.includes('dvd')) format = 'DVD';
          else if (containerText.includes('cd')) format = 'CD';

          items.push({
            title,
            author: author || bookAuthor,
            available: true,
            format,
            branch: undefined // Branch info would require clicking into the detail page
          });
        }
      });

      return items;
    }, book.title, book.author);

    await page.close();
    return results;

  } catch (error) {
    console.error(`Error searching SLC Library for ${book.title}:`, error);
    return [];
  }
}
