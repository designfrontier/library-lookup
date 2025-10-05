import puppeteer from 'puppeteer';
import type { Book } from '../types';

export async function getWishlistBooks(wishlistUrl: string): Promise<Book[]> {
  let browser;

  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ]
    });

    const page = await browser.newPage();

    // Set a realistic viewport and user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('Navigating to wishlist...');
    await page.goto(wishlistUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('Starting infinite scroll to load all items...');

    let previousHeight = 0;
    let noChangeCount = 0;
    const maxNoChange = 3; // Stop if height doesn't change 3 times in a row

    // Scroll to bottom repeatedly until no more content loads
    while (noChangeCount < maxNoChange) {
      // Get current scroll height
      const currentHeight = await page.evaluate(() => {
        return document.body.scrollHeight;
      });

      // If height hasn't changed, increment counter
      if (currentHeight === previousHeight) {
        noChangeCount++;
        console.log(`Height unchanged (${noChangeCount}/${maxNoChange}), waiting...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        noChangeCount = 0; // Reset counter if we see new content
        previousHeight = currentHeight;
      }

      // Scroll to bottom
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Wait for potential new content to load
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Log progress
      const itemCount = await page.evaluate(() => {
        return document.querySelectorAll('li[data-itemid]').length;
      });
      console.log(`Current items loaded: ${itemCount}`);
    }

    console.log('Finished scrolling. Extracting book data...');

    // Extract all book data from the fully loaded page
    const books: Book[] = await page.evaluate(() => {
      const items = document.querySelectorAll('li[data-itemid]');
      const results: Array<{ title: string; author: string; asin?: string }> = [];

      items.forEach((item: Element) => {
        // Get title
        const titleElement = item.querySelector('h2 a') || item.querySelector('a[id^="itemName"]');
        const title = titleElement?.textContent?.trim() || '';

        // Get author
        const authorElement = item.querySelector('span[id^="item-byline"]');
        let author = authorElement?.textContent?.trim() || '';
        author = author.replace(/^by\s+/i, '').split('(')[0].trim();

        // Get ASIN from URL
        const titleAnchor = titleElement as HTMLAnchorElement | null;
        const href = titleAnchor?.href || '';
        const asinMatch = href.match(/\/dp\/([A-Z0-9]{10})/);
        const asin = asinMatch ? asinMatch[1] : undefined;

        if (title) {
          results.push({
            title,
            author: author || 'Unknown Author',
            asin
          });
        }
      });

      return results;
    });

    console.log(`Successfully extracted ${books.length} books from wishlist`);

    await browser.close();
    return books;

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error('Error fetching Amazon wishlist:', error);
    throw new Error('Failed to fetch Amazon wishlist. Make sure the wishlist is public.');
  }
}
