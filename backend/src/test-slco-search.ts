import puppeteer from 'puppeteer';
import * as fs from 'fs';

async function testSLCOSearch() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    const SLCO_URL = 'https://catalog.slcolibrary.org/polaris';

    console.log('1. Navigating to SLCO catalog...');
    await page.goto(SLCO_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('   Current URL:', page.url());

    // Save screenshot of homepage
    await page.screenshot({ path: 'slco-step1-homepage.png' });

    // Check for search box
    const hasSearchBox = await page.evaluate(() => {
      return !!document.querySelector('#textboxTerm');
    });
    console.log('   Has #textboxTerm:', hasSearchBox);

    if (!hasSearchBox) {
      // Check what inputs DO exist
      const inputs = await page.evaluate(() => {
        const all = document.querySelectorAll('input[type="text"], input[type="search"]');
        return Array.from(all).map(el => ({
          id: el.id,
          name: (el as HTMLInputElement).name,
          placeholder: (el as HTMLInputElement).placeholder
        }));
      });
      console.log('   Available text inputs:', JSON.stringify(inputs, null, 2));

      console.log('\nERROR: No search box found. Stopping test.');
      await new Promise(() => {}); // Keep browser open
      return;
    }

    console.log('\n2. Typing search term...');
    await page.type('#textboxTerm', 'Atomic Habits');

    // Wait a moment for autocomplete to appear
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n3. Pressing Enter to submit...');

    // Set up navigation listener BEFORE pressing Enter
    const navigationPromise = page.waitForNavigation({
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Press Enter to submit
    await page.keyboard.press('Enter');

    console.log('   Waiting for navigation...');
    await navigationPromise;

    console.log('   Navigation complete!');
    console.log('   New URL:', page.url());

    // Wait for results
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Save screenshot of results
    await page.screenshot({ path: 'slco-step2-results.png', fullPage: true });

    // Check for results
    const titleLinks = await page.evaluate(() => {
      return document.querySelectorAll('a[href*="/search/title.aspx"]').length;
    });
    console.log('\n4. Found', titleLinks, 'title links');

    console.log('\n✓ Test complete! Press Ctrl+C to close browser.');
    await new Promise(() => {});

  } catch (error) {
    console.error('\n✗ Error:', error);
    await page.screenshot({ path: 'slco-error.png' });
    console.log('\nScreenshot saved. Press Ctrl+C to close browser.');
    await new Promise(() => {});
  }
}

testSLCOSearch().catch(console.error);
