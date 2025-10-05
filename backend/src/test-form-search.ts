import puppeteer from 'puppeteer';
import * as fs from 'fs';

async function testFormSearch() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Navigating to homepage...');
  await page.goto('https://catalog.slcpl.org', { waitUntil: 'networkidle2', timeout: 30000 });

  console.log('Finding search input...');

  // Debug: check what inputs exist
  const inputs = await page.evaluate(() => {
    const allInputs = document.querySelectorAll('input');
    return Array.from(allInputs).map(input => ({
      type: input.type,
      name: input.name,
      id: input.id,
      placeholder: input.placeholder
    }));
  });

  console.log('Available inputs:', JSON.stringify(inputs, null, 2));

  // Try to find the search input
  const searchTerm = 'James';

  try {
    await page.waitForSelector('#textboxTerm', { timeout: 5000 });
    await page.type('#textboxTerm', searchTerm);

    console.log('Typed search term, submitting...');

    // Use evaluate to click the button
    await page.evaluate(() => {
      const button = document.querySelector('#buttonDoSearch') as HTMLElement;
      if (button) button.click();
    });

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

    console.log('Navigation complete');
    console.log('Current URL:', page.url());

    // Wait for results to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Save screenshot and HTML
    await page.screenshot({ path: 'form-search-results.png', fullPage: true });
    const html = await page.content();
    fs.writeFileSync('form-search-results.html', html);

    console.log('Saved screenshot and HTML');

    // Analyze results
    const analysis = await page.evaluate(() => {
      const info: any = {};

      // Try to find result items in #searchResults container
      const searchResults = document.querySelector('#searchResults');
      if (searchResults) {
        // Look for individual result items
        const items = searchResults.querySelectorAll('div[class*="item"], div[id*="result_"], li');
        info.itemsInSearchResults = items.length;

        // Look for title links
        const titleLinks = searchResults.querySelectorAll('a[href*="/bib/"]');
        info.titleLinks = titleLinks.length;

        // Get first result's structure
        if (titleLinks.length > 0) {
          const firstLink = titleLinks[0] as HTMLAnchorElement;
          info.firstTitle = firstLink.textContent?.trim();
          info.firstHref = firstLink.href;

          // Find parent container
          let parent = firstLink.parentElement;
          let depth = 0;
          while (parent && depth < 10) {
            if (parent.id || parent.className) {
              info.titleParent = {
                tag: parent.tagName,
                id: parent.id,
                class: parent.className
              };
              break;
            }
            parent = parent.parentElement;
            depth++;
          }
        }

        // Look for availability info
        const availText = searchResults.textContent?.toLowerCase() || '';
        info.hasAvailableText = availText.includes('available');
      }

      return info;
    });

    console.log('\n=== Analysis ===');
    console.log(JSON.stringify(analysis, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }

  console.log('\nPress Ctrl+C to close browser...');
  await new Promise(() => {}); // Keep browser open
}

testFormSearch().catch(console.error);
