import puppeteer, { Browser } from 'puppeteer';
import type { Book, LibrarySearchResult } from '../types';

const SLCO_CATALOG_BASE = 'https://catalog.slcolibrary.org/polaris';

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

export async function searchSaltLakeCountyLibrary(book: Book): Promise<LibrarySearchResult[]> {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();

    // Navigate to homepage first
    console.log(`  [SLCO] Navigating to homepage...`);
    await page.goto(SLCO_CATALOG_BASE, { waitUntil: 'networkidle2', timeout: 20000 });
    console.log(`  [SLCO] Loaded: ${page.url()}`);

    // Check if search box exists
    const hasSearchBox = await page.evaluate(() => {
      const box = document.querySelector('#textboxTerm');
      return !!box;
    });
    console.log(`  [SLCO] Has search box: ${hasSearchBox}`);

    if (!hasSearchBox) {
      console.log(`  [SLCO] No search box found, skipping this search`);
      await page.close();
      return [];
    }

    // Use the search form on the homepage
    const searchQuery = book.title;

    // Find and fill the search input (Polaris uses #textboxTerm)
    console.log(`  [SLCO] Typing search query...`);
    await page.waitForSelector('#textboxTerm', { timeout: 5000 });
    await page.type('#textboxTerm', searchQuery);

    // Wait briefly for autocomplete to appear
    await new Promise(resolve => setTimeout(resolve, 500));

    // Press Enter to submit (autocomplete interferes with form.submit())
    console.log(`  [SLCO] Pressing Enter to submit...`);
    const navigationPromise = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.keyboard.press('Enter');

    console.log(`  [SLCO] Waiting for navigation...`);
    try {
      await navigationPromise;
      console.log(`  [SLCO] Navigation completed to: ${page.url()}`);
    } catch (error) {
      const url = page.url();
      console.log(`  [SLCO] Navigation timeout, current URL: ${url}`);
      if (!url.includes('searchresults.aspx') && !url.includes('search')) {
        throw error; // Re-throw if we're not on results page
      }
    }

    // Wait a bit for dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extract results from Polaris search results (same as SLC since both use Polaris)
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
    console.error(`Error searching SLC County Library for ${book.title}:`, error);
    return [];
  }
}
