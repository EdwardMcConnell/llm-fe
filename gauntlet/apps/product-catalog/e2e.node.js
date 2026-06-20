import puppeteer from 'puppeteer-core';
import { exec } from 'child_process';

const delay = ms => new Promise(r => setTimeout(r, ms));

async function runE2E() {
  console.log('Launching Puppeteer for Product Catalog E2E validation...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    // Inject mock token so router lets us in (if catalog route is protected)
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      localStorage.setItem('fe_sample_token', 'eyJhbGciOiJub25lIn0=.eyJleHAiOjk5OTk5OTk5OTl9.');
    });

    // Mount app
    await page.goto('http://localhost:3000/catalog', { waitUntil: 'networkidle0' });
    
    // Wait for the async data to load
    await delay(200); // Because demandData has a 50ms mock delay

    const rendered = await page.evaluate(() => {
      const catalogNode = document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-catalog');
      if (!catalogNode) return false;
      const cards = catalogNode.shadowRoot.querySelectorAll('.product-card');
      return cards.length === 4;
    });
    
    if (!rendered) throw new Error("Catalog component failed to render products.");

    // Test adding to cart
    await page.evaluate(() => {
      const catalogNode = document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-catalog');
      const firstBtn = catalogNode.shadowRoot.querySelector('.add-to-cart');
      firstBtn.click();
    });

    await delay(100);

    const cartUpdated = await page.evaluate(() => {
      const catalogNode = document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-catalog');
      const cartCount = catalogNode.shadowRoot.querySelector('#cartCount').textContent;
      return cartCount === '1';
    });

    if (!cartUpdated) throw new Error("Cart count did not update reactively.");

    console.log('Product Catalog E2E Test Passed.');
  } catch (err) {
    console.error('Product Catalog E2E Test Failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runE2E();
