import puppeteer from 'puppeteer';
import * as fs from 'fs';

async function testSLCOHomepage() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Navigating to SLCO homepage...');
  await page.goto('https://catalog.slcolibrary.org', { waitUntil: 'networkidle2', timeout: 30000 });

  // Check what inputs exist
  const inputs = await page.evaluate(() => {
    const allInputs = document.querySelectorAll('input');
    return Array.from(allInputs).map(input => ({
      type: input.type,
      name: input.name,
      id: input.id,
      placeholder: input.placeholder
    }));
  });

  console.log('\n=== Available Inputs ===');
  console.log(JSON.stringify(inputs, null, 2));

  // Check for forms
  const forms = await page.evaluate(() => {
    const allForms = document.querySelectorAll('form');
    return Array.from(allForms).map(form => ({
      id: form.id,
      name: form.name,
      action: form.action,
      method: form.method
    }));
  });

  console.log('\n=== Forms ===');
  console.log(JSON.stringify(forms, null, 2));

  // Save screenshot
  await page.screenshot({ path: 'slco-homepage.png', fullPage: true });
  console.log('\nScreenshot saved to slco-homepage.png');

  const html = await page.content();
  fs.writeFileSync('slco-homepage.html', html);
  console.log('HTML saved to slco-homepage.html');

  console.log('\nPress Ctrl+C to close...');
  await new Promise(() => {});
}

testSLCOHomepage().catch(console.error);
