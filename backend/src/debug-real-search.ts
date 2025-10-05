import puppeteer from 'puppeteer';
import * as fs from 'fs';

async function debugRealSearch() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Search for a popular book that should have results
  const searchTerm = 'James';
  const searchUrl = `https://catalog.slcpl.org/polaris/search/searchresults.aspx?ctx=1.1033.0.0.7&type=Keyword&term=${encodeURIComponent(searchTerm)}&by=KW&sort=RELEVANCE&limit=TOM=BKS`;

  console.log('Navigating to:', searchUrl);
  await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

  console.log('\nWaiting 3 seconds for page to fully load...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Save screenshot
  await page.screenshot({ path: 'library-real-search.png', fullPage: true });
  console.log('Screenshot saved to library-real-search.png');

  // Save HTML
  const html = await page.content();
  fs.writeFileSync('library-real-search.html', html);
  console.log('HTML saved to library-real-search.html');

  // Try to find ANY elements that might be results
  const analysis = await page.evaluate(() => {
    const info: any = {};

    // Check for common result container patterns
    info.divs = document.querySelectorAll('div').length;
    info.lis = document.querySelectorAll('li').length;
    info.articles = document.querySelectorAll('article').length;

    // Look for specific Polaris classes
    const polarisClasses = [
      'results',
      'result-item',
      'search-result',
      'title-cell',
      'bib-info',
      'detail'
    ];

    info.classes = {};
    polarisClasses.forEach(className => {
      const els = document.querySelectorAll(`.${className}, [class*="${className}"]`);
      if (els.length > 0) {
        info.classes[className] = els.length;
      }
    });

    // Look for links to bibliographic records
    const bibLinks = document.querySelectorAll('a[href*="/bib/"]');
    info.bibLinks = bibLinks.length;

    if (bibLinks.length > 0) {
      info.firstThreeBibLinks = Array.from(bibLinks).slice(0, 3).map(link => ({
        text: link.textContent?.trim().substring(0, 80),
        href: (link as HTMLAnchorElement).href
      }));
    }

    // Get page title
    info.pageTitle = document.title;

    // Check for "no results" message
    const bodyText = document.body.textContent || '';
    info.hasNoResults = bodyText.toLowerCase().includes('no results') ||
                        bodyText.toLowerCase().includes('0 results') ||
                        bodyText.toLowerCase().includes('no items found');

    return info;
  });

  console.log('\n=== Page Analysis ===');
  console.log(JSON.stringify(analysis, null, 2));

  console.log('\nClosing browser...');
  await browser.close();
}

debugRealSearch().catch(console.error);
