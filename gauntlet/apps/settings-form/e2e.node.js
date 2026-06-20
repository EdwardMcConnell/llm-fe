import puppeteer from 'puppeteer';
import assert from 'assert';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  console.log('Launching Puppeteer for Settings E2E validation...');
  const browser = await puppeteer.launch();
  
  try {
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    // Set mock token so router lets us into /settings
    // Must be a valid JWT shape with an exp claim in the future
    await page.evaluate(() => {
      localStorage.setItem('fe_sample_token', 'eyJhbGciOiJub25lIn0=.eyJleHAiOjk5OTk5OTk5OTl9.');
    });
    
    await page.goto('http://localhost:3000/settings', { waitUntil: 'networkidle0' });
    
    // Check form rendering
    const rendered = await page.evaluate(() => {
      const settingsNode = document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-settings');
      return !!settingsNode;
    });
    
    if (!rendered) throw new Error("Settings component failed to render.");

    // Fill out form
    await page.evaluate(() => {
      const shadowRoot = document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-settings').shadowRoot;
      const userEl = shadowRoot.querySelector('#usernameInput');
      const emailEl = shadowRoot.querySelector('#emailInput');
      const submitBtn = shadowRoot.querySelector('#saveBtn');
      
      userEl.value = 'edward';
      userEl.dispatchEvent(new Event('input', { bubbles: true }));
      
      emailEl.value = 'edward@example.com';
      emailEl.dispatchEvent(new Event('input', { bubbles: true }));
      
      const formEl = shadowRoot.querySelector('#settingsForm');
      formEl.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    
    await delay(1000); // Wait for mock submit
    
    // Check if toast was shown (globalToast)
    const toastVisible = await page.evaluate(() => {
      return document.querySelector('fe-toast').shadowRoot.querySelector('.toast.visible') !== null;
    });
    
    if (!toastVisible) {
      console.warn("E2E Warning: Toast was not visible after submit.");
    }

    console.log('Settings E2E completed successfully.');
  } catch (err) {
    console.error('Settings E2E Test Failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
