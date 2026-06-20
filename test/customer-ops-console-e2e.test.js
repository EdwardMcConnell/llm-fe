import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

let browser;
let server;
let page;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let filePath = path.join(process.cwd(), req.url);
    if (filePath.includes('?')) filePath = filePath.split('?')[0];
    try {
      const ext = path.extname(filePath);
      let contentType = 'text/html';
      if (ext === '.js') contentType = 'application/javascript';
      if (ext === '.json') contentType = 'application/json';
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    } catch(e) {
      console.error('404 Not Found:', filePath);
      res.writeHead(404);
      res.end('Not found');
    }
  });
  server.listen(4005);

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { margin: 0; }
      .ops-console-root { display: flex; height: 100vh; font-family: system-ui; }
      .sidebar { width: 200px; background: #2c3e50; padding: 20px; display: flex; flex-direction: column; gap: 10px; }
      .sidebar button { background: none; border: none; color: #ecf0f1; padding: 10px; text-align: left; cursor: pointer; font-size: 16px; border-radius: 4px; }
      .sidebar button.active { background: #34495e; }
      .content-area { flex: 1; overflow: auto; padding: 20px; background: #ecf0f1; }
      .tab-dashboard, .tab-customers, .tab-tickets, .tab-settings { height: 100%; display: flex; flex-direction: column; }
      .grid-container, .kanban-container, .form-container, .dashboard-container { flex: 1; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; position: relative; }
      
      /* Essential primitive styles to pass UI assertions */
      .grid-body { height: 100%; overflow: auto; position: relative; }
      .grid-row { display: flex; align-items: center; border-bottom: 1px solid #ccc; height: 32px; }
      .grid-row.selected { background: #d0e8ff; }
      .form-container { padding: 20px; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
      import { createCustomerOpsConsole } from '/generated-examples/customer-ops-console/customer-ops-console.generated.js';
      import { SharedMap } from '/src/crdt.js';
      
      window.sharedMap = new SharedMap('client-1');
      console.log('SharedMap methods:', JSON.stringify(Object.getOwnPropertyNames(Object.getPrototypeOf(window.sharedMap))));
      
      // Pre-seed some customers into the grid
      window.sharedMap.set('grid:columns', ['ID', 'Name', 'Email']);
      window.sharedMap.set('grid:rows', ['c1', 'c2']);
      window.sharedMap.set('grid:cell:c1:ID', 'C-101');
      window.sharedMap.set('grid:cell:c1:Name', 'Alice');
      window.sharedMap.set('grid:cell:c1:Email', 'alice@test.com');
      
      window.sharedMap.set('grid:cell:c2:ID', 'C-102');
      window.sharedMap.set('grid:cell:c2:Name', 'Bob');
      window.sharedMap.set('grid:cell:c2:Email', 'bob@test.com');
      
      // Pre-seed a kanban board
      window.sharedMap.set('kanban:item:c1', { id: 'c1', title: 'Support: Alice', status: 'todo' });
      window.sharedMap.set('kanban:column:todo:index', { itemIds: ['c1'] });

      window.app = createCustomerOpsConsole(document.getElementById('root'), window.sharedMap);
    </script>
  </body>
</html>
  `;
  fs.writeFileSync(path.join(process.cwd(), 'test/ops-console.html'), html);

  browser = await puppeteer.launch({ headless: true });
  page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('requestfailed', request => console.log('REQ FAILED:', request.url(), request.failure().errorText));
  await page.goto('http://localhost:4005/test/ops-console.html');
  await delay(500); // Allow render
});

afterAll(async () => {
  if (browser) await browser.close();
  if (server) server.close();
  if (fs.existsSync('test/ops-console.html')) {
    fs.unlinkSync('test/ops-console.html');
  }
});

describe('Customer Ops Console Composition Tests', () => {
  it('renders all four sub-components in tabs', async () => {
    // Check Dashboard
    const dashVisible = await page.evaluate(() => document.querySelector('.tab-dashboard').style.display !== 'none');
    expect(dashVisible).toBe(true);

    // Click Customers tab
    await page.evaluate(() => document.querySelector('.nav-customers').click());
    await delay(100);
    const gridVisible = await page.evaluate(() => document.querySelector('.tab-customers').style.display !== 'none');
    expect(gridVisible).toBe(true);

    // Verify grid has the seeded data
    const rowCount = await page.evaluate(() => document.querySelectorAll('.grid-row:not(.header-row)').length);
    expect(rowCount).toBeGreaterThanOrEqual(2);
  });

  it('cross-component reactivity: selects a customer in the grid and syncs to settings form', async () => {
    // Make sure we are on customers tab
    await page.evaluate(() => document.querySelector('.nav-customers').click());
    await delay(100);

    // Select Alice (c1) by triggering focus/select or directly changing sharedMap like a user click
    await page.evaluate(() => {
      window.sharedMap.set('grid:selectedRows', ['c1']);
    });
    await delay(100);

    // The grid should highlight Alice
    const selectedText = await page.evaluate(() => {
      const el = document.querySelector('.grid-row[data-row-id="c1"]');
      return el ? el.classList.contains('selected') : false;
    });
    expect(selectedText).toBe(true);

    // Switch to Settings tab
    await page.evaluate(() => document.querySelector('.nav-settings').click());
    await delay(100);

    // The form should be populated with Alice's details
    const usernameVal = await page.evaluate(() => document.querySelector('input[name="username"]').value);
    const emailVal = await page.evaluate(() => document.querySelector('input[name="email"]').value);
    
    expect(usernameVal).toBe('Alice');
    expect(emailVal).toBe('alice@test.com');
  });

  it('cross-component reactivity: edits customer in form and syncs back to grid and kanban', async () => {
    // Go to settings tab
    await page.evaluate(() => document.querySelector('.nav-settings').click());
    await delay(100);

    // Update username input
    await page.evaluate(() => {
      const input = document.querySelector('input[name="username"]');
      input.value = 'Alice Cooper';
      input.dispatchEvent(new Event('input'));
    });
    
    // Submit form
    await page.evaluate(() => {
      const form = document.querySelector('fe-form');
      if (form) form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    });
    await delay(100);

    // Go to customers tab, check grid
    await page.evaluate(() => document.querySelector('.nav-customers').click());
    await delay(100);

    const gridCellText = await page.evaluate(() => {
      const row = document.querySelector('.grid-row[data-row-id="c1"]');
      return row && row.children.length > 1 ? row.children[1].textContent : null;
    });
    expect(gridCellText).toBe('Alice Cooper');

    // Go to tickets tab, check kanban
    await page.evaluate(() => document.querySelector('.nav-tickets').click());
    await delay(100);

    const kanbanTitle = await page.evaluate(() => {
      // The kanban card generator assigns IDs or classes based on the card id.
      // Easiest is to check the sharedMap directly or the raw textContent of the board.
      return document.querySelector('.kanban-container').textContent;
    });
    
    expect(kanbanTitle).toContain('Alice Cooper');
  });
});
