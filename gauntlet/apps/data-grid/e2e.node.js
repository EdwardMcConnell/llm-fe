import puppeteer from 'puppeteer';
import assert from 'assert';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  console.log('Launching Puppeteer for E2E validation...');
  const browser = await puppeteer.launch();
  
  try {
    // -------------------------------------------------------------
    // Client 1: Login and interact
    // -------------------------------------------------------------
    console.log('Opening Client 1...');
    const page1 = await browser.newPage();
    
    // Log errors and console
    page1.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page1.on('pageerror', err => console.log('Client 1 Error:', err.stack || err.toString()));
    
    await page1.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await delay(1000); // Give view transition time to finish redirect
    
    // 1. Verify redirect to login
    let url = page1.url();
    console.log('Current URL before login check:', url);
    assert.ok(url.includes('/login'), 'Should redirect to /login');
    console.log('✓ Redirect to /login validated');

    // 2. Perform Login (pierce Shadow DOM)
    console.log('Performing login...');
    await page1.evaluate(() => {
      const loginNode = document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-login');
      const shadowRoot = loginNode.shadowRoot;
      const user = shadowRoot.querySelector('#username');
      const pass = shadowRoot.querySelector('#password');
      const submit = shadowRoot.querySelector('fe-button[type="submit"]');
      
      user.value = 'test_user';
      user.dispatchEvent(new Event('input', { bubbles: true }));
      
      pass.value = 'password123';
      pass.dispatchEvent(new Event('input', { bubbles: true }));
      
      submit.click();
    });

    await delay(1000); // wait for navigation
    
    // 3. Verify Dashboard
    url = page1.url();
    assert.ok(url.endsWith('http://localhost:3000/'), 'Should redirect to / after login');
    console.log('✓ Dashboard navigation validated');

    // Navigate directly to Grid View
    console.log('Navigating to Massive Data Grid...');
    await page1.evaluate(() => {
      const layout = document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').shadowRoot;
      const link = layout.querySelector('fe-link[href="/grid"]');
      link.click();
    });
    
    await delay(1000); // Wait for transition and render

    // 12. Verify Grid rendered 100k items properly using virtualizer
    console.log('Verifying grid virtualization...');
    const gridStats = await page1.evaluate(() => {
      const gridNode = document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-grid');
      const innerGrid = gridNode.shadowRoot.querySelector('fe-grid');
      
      if (innerGrid._renderWindow) {
        console.log('Forcing innerGrid._renderWindow()...');
        innerGrid._renderWindow();
      } else {
        console.log('innerGrid._renderWindow is missing!');
      }

      const ghost = innerGrid.shadowRoot.querySelector('#ghost');
      const viewport = innerGrid.shadowRoot.querySelector('#viewport');
      return {
        hostHeight: innerGrid.clientHeight,
        parentHeight: gridNode.clientHeight,
        ghostHeight: ghost.style.height,
        renderedNodes: viewport.children.length
      };
    });
    console.log('GRID STATS:', gridStats);
    
    const parsedHeight = parseFloat(gridStats.ghostHeight);
    assert.ok(parsedHeight === 4800, 'Ghost element should reflect 100 items (default pagination) * 48px height');
    assert.ok(gridStats.renderedNodes > 0 && gridStats.renderedNodes < 100, 'Virtual DOM pool should only render a minimal number of nodes');
    console.log('✓ Massive Data Grid virtualization (Paginated) verified successfully!');

    // Test Advanced Features
    console.log('Testing Grid Advanced Features...');

    // 1. Test Select All
    await page1.evaluate(() => {
      const gridNode = document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-grid');
      const selectAll = gridNode.shadowRoot.querySelector('#select-all');
      selectAll.click();
    });
    await delay(500);
    const selectedCount = await page1.evaluate(() => {
      const gridNode = document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-grid');
      const innerGrid = gridNode.shadowRoot.querySelector('fe-grid');
      return innerGrid.shadowRoot.querySelectorAll('.row.selected').length;
    });
    // The DOM only contains the rendered nodes, not all 100, so we check if visible nodes are selected
    assert.ok(selectedCount > 0, 'Rows should be selected when Select All is clicked');
    console.log('✓ Row Selection verified');

    // 2. Test Pagination (Change to 'all')
    await page1.evaluate(() => {
      const gridNode = document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-grid');
      const pageSize = gridNode.shadowRoot.querySelector('#page-size');
      pageSize.value = 'all';
      pageSize.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await delay(1000);
    const allGridStats = await page1.evaluate(() => {
      const gridNode = document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-grid');
      const innerGrid = gridNode.shadowRoot.querySelector('fe-grid');
      if (innerGrid._renderWindow) innerGrid._renderWindow();
      const ghost = innerGrid.shadowRoot.querySelector('#ghost');
      return { ghostHeight: ghost.style.height };
    });
    const parsedAllHeight = parseFloat(allGridStats.ghostHeight);
    assert.ok(parsedAllHeight === 4800000 || allGridStats.ghostHeight === '4.8e+06px', 'Ghost element should reflect 100,000 items when pagination is set to All');
    console.log('✓ Page Size Change (All records) verified');

    // 3. Test Global Search
    await page1.evaluate(() => {
      const gridNode = document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-grid');
      const search = gridNode.shadowRoot.querySelector('#quick-search');
      search.value = 'Employee User 999';
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await delay(1000);
    const searchGridStats = await page1.evaluate(() => {
      const gridNode = document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-grid');
      const innerGrid = gridNode.shadowRoot.querySelector('fe-grid');
      if (innerGrid._renderWindow) innerGrid._renderWindow();
      const ghost = innerGrid.shadowRoot.querySelector('#ghost');
      return { ghostHeight: ghost.style.height };
    });
    // Search for "999" will match 999, 1999, 2999, 9990, 9991, etc.
    // 100000 items -> "999" matches around 100+ items. Height should drop drastically from 4.8 million.
    const searchHeight = parseFloat(searchGridStats.ghostHeight);
    assert.ok(searchHeight < 4800000 && searchHeight > 0, 'Grid should drastically filter items based on search query');
    console.log('✓ Global Quick Search verified');

    console.log('\\n=========================================');
    console.log('SUCCESS: All E2E Tests Passed!');
    console.log('=========================================');
    
  } catch (err) {
    console.error('E2E Test Failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
