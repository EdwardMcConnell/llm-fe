import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  console.log('Starting demo server for Customer Ops Console E2E validation...');
  
  const server = http.createServer((req, res) => {
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
  
  const testDir = path.join(process.cwd(), 'gauntlet/apps/customer-ops-console');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
  const testHtmlPath = path.join(testDir, 'temp-e2e.html');
  fs.writeFileSync(testHtmlPath, html);

  console.log('Launching Puppeteer for Customer Ops Console E2E validation...');
  const browser = await puppeteer.launch();
  
  try {
    const page = await browser.newPage();
    page.on('console', msg => {
      if (msg.text().includes('Failed to load resource')) return;
      // console.log('PAGE LOG:', msg.text());
    });
    
    await page.goto('http://localhost:4005/gauntlet/apps/customer-ops-console/temp-e2e.html');
    await delay(500);

    // Scenario 1: Tab Navigation & Rendering
    const dashVisible = await page.evaluate(() => document.querySelector('.tab-dashboard').style.display !== 'none');
    if (!dashVisible) throw new Error("Dashboard tab is not visible by default.");
    
    await page.evaluate(() => document.querySelector('.nav-customers').click());
    await delay(100);
    const gridVisible = await page.evaluate(() => document.querySelector('.tab-customers').style.display !== 'none');
    if (!gridVisible) throw new Error("Customers tab did not become visible.");
    
    const rowCount = await page.evaluate(() => document.querySelectorAll('.grid-row:not(.header-row)').length);
    if (rowCount < 2) throw new Error("Grid did not render seeded rows.");
    
    console.log('✓ Scenario 1 passed');

    // Scenario 2: Cross-Component Reactivity - Grid to Settings Form
    await page.evaluate(() => {
      window.sharedMap.set('grid:selectedRows', ['c1']);
    });
    await delay(100);

    const selectedText = await page.evaluate(() => {
      const el = document.querySelector('.grid-row[data-row-id="c1"]');
      return el ? el.classList.contains('selected') : false;
    });
    if (!selectedText) throw new Error("Grid row did not visually select.");

    await page.evaluate(() => document.querySelector('.nav-settings').click());
    await delay(100);

    const usernameVal = await page.evaluate(() => document.querySelector('input[name="username"]').value);
    const emailVal = await page.evaluate(() => document.querySelector('input[name="email"]').value);
    if (usernameVal !== 'Alice' || emailVal !== 'alice@test.com') {
      throw new Error(`Settings form did not sync selected customer. Got username: ${usernameVal}`);
    }
    
    console.log('✓ Scenario 2 passed');

    // Scenario 3: Cross-Component Reactivity - Form edit to Grid & Kanban
    await page.evaluate(() => {
      const input = document.querySelector('input[name="username"]');
      input.value = 'Alice Cooper';
      input.dispatchEvent(new Event('input'));
    });
    
    await page.evaluate(() => {
      const form = document.querySelector('fe-form');
      if (form) form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    });
    await delay(100);

    await page.evaluate(() => document.querySelector('.nav-customers').click());
    await delay(100);

    const gridCellText = await page.evaluate(() => {
      const row = document.querySelector('.grid-row[data-row-id="c1"]');
      return row && row.children.length > 1 ? row.children[1].textContent : null;
    });
    if (gridCellText !== 'Alice Cooper') {
      throw new Error(`Grid did not update with form submission. Got: ${gridCellText}`);
    }

    await page.evaluate(() => document.querySelector('.nav-tickets').click());
    await delay(100);

    const kanbanTitle = await page.evaluate(() => document.querySelector('.kanban-container').textContent);
    if (!kanbanTitle.includes('Alice Cooper')) {
      throw new Error("Kanban board did not update with form submission.");
    }
    
    console.log('✓ Scenario 3 passed');

    console.log('\\n=========================================');
    console.log('SUCCESS: All Customer Ops Console E2E Tests Passed!');
    console.log('=========================================');
    
  } catch (err) {
    console.error('Customer Ops Console E2E Test Failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
    server.close();
    if (fs.existsSync(testHtmlPath)) fs.unlinkSync(testHtmlPath);
  }
})();
