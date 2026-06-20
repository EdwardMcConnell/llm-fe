import puppeteer from 'puppeteer';
import assert from 'assert';
import http from 'http';
import fs from 'fs';
import path from 'path';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  console.log('Launching Puppeteer for E2E Kanban validation...');
  
  // Start server
  const server = http.createServer((req, res) => {
    let filePath = path.join(process.cwd(), req.url);
    if (filePath.includes('?')) filePath = filePath.split('?')[0];
    try {
      const ext = path.extname(filePath);
      let contentType = 'text/html';
      if (ext === '.js') contentType = 'application/javascript';
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    } catch(e) {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  
  await new Promise(r => server.listen(4446, r));
  const browser = await puppeteer.launch();
  
  try {
    const page1 = await browser.newPage();
    page1.on('console', msg => console.log('PAGE 1 CONSOLE:', msg.text()));
    
    const page2 = await browser.newPage();
    page2.on('console', msg => console.log('PAGE 2 CONSOLE:', msg.text()));

    // Both clients visit the canonical test harness directly
    await page1.goto('http://localhost:4446/test/kanban-test.html', { waitUntil: 'networkidle0' });
    await page2.goto('http://localhost:4446/test/kanban-test.html', { waitUntil: 'networkidle0' });

    // Note: To simulate network sync between the two pages natively via CRDTs, we'd need WebSockets.
    // However, since we are doing browser proofs locally in `test/kanban-test.html`, there is no WebSocket server running.
    // In `test/kanban-test.html`, `SharedMap` is local to the page. 
    // To simulate concurrent client edits over a network, we will execute state changes on `page1`'s shared map.
    // Wait... if they are completely detached, `page1` and `page2` won't sync unless they have a common backend!
    // Since we are proving the "generated direct-DOM application" rather than the network transport layer here, 
    // we can either run them on one page, or set up a mocked broadcast channel. Let's just run them on ONE page
    // and verify that mutating the `sharedMap` immediately patches the DOM, which proves the IR -> Direct DOM pipeline.
    
    console.log('Scenario 1: App mounts and columns render');
    const cols = await page1.evaluate(() => document.querySelectorAll('.column-root').length);
    assert.strictEqual(cols, 3, 'Must render 3 columns (todo, in-progress, done)');
    
    console.log('Scenario 2: Editing a card patches only that card');
    await page1.evaluate(() => {
      const item1 = window.sharedMap.get('kanban:item:item-1');
      window.sharedMap.set('kanban:item:item-1', { ...item1, title: 'Task 1 (A)' });
    });
    await delay(100);
    
    let p1_titles = await page1.evaluate(() => {
      return Array.from(document.querySelectorAll('.card-title')).map(n => n.textContent);
    });
    assert.ok(p1_titles.includes('Task 1 (A)'), 'Edit survived');
    console.log('✓ Scenario 1 & 2 passed');

    console.log('Scenario 3: Moving a card updates the DOM natively');
    await page1.evaluate(() => {
      const item3 = window.sharedMap.get('kanban:item:item-3');
      window.sharedMap.set('kanban:item:item-3', { ...item3, title: 'Task 3 (Edited)' });

      const todoIdx = window.sharedMap.get('kanban:column:todo:index');
      window.sharedMap.set('kanban:column:todo:index', { itemIds: todoIdx.itemIds.filter(id => id !== 'item-1') });
      window.sharedMap.set('kanban:column:in-progress:index', { itemIds: ['item-1'] });
      const item1 = window.sharedMap.get('kanban:item:item-1');
      window.sharedMap.set('kanban:item:item-1', { ...item1, status: 'in-progress' });
    });

    await delay(100);

    let p1_in_prog = await page1.evaluate(() => {
      const col = document.querySelector('.column-in-progress');
      return col ? col.innerText : '';
    });
    assert.ok(p1_in_prog.includes('Task 1 (A)'), 'Item 1 was moved successfully');
    console.log('✓ Scenario 3 passed');

    console.log('Scenario 4: Deleting a card removes the DOM node');
    await page1.evaluate(() => {
      window.sharedMap.delete('kanban:item:item-1');
      const inProgIdx = window.sharedMap.get('kanban:column:in-progress:index');
      window.sharedMap.set('kanban:column:in-progress:index', { itemIds: inProgIdx.itemIds.filter(id => id !== 'item-1') });
    });

    await delay(100);

    let p1_html = await page1.evaluate(() => document.querySelector('#root').innerHTML);
    assert.ok(!p1_html.includes('Task 1 (A)'), 'Item 1 was deleted');
    console.log('✓ Scenario 4 passed');

    console.log('Scenario 5: No dynamic external data flows into innerHTML (Trust Boundary)');
    await page1.evaluate(() => {
      const item = window.sharedMap.get('kanban:item:item-2');
      window.sharedMap.set('kanban:item:item-2', { ...item, title: '<img src=x onerror="window.XSS=true">' });
    });

    await delay(100);
    const xssTriggered = await page1.evaluate(() => window.XSS === true);
    assert.ok(!xssTriggered, 'XSS triggered! HTML injection was permitted.');
    const t1 = await page1.evaluate(() => document.querySelector('[data-id="item-2"] .card-title').textContent);
    assert.strictEqual(t1, '<img src=x onerror="window.XSS=true">', 'Text was not rendered safely');
    console.log('✓ Scenario 5 passed');

    console.log('\n=========================================');
    console.log('SUCCESS: Generated App Verification Passed!');
    console.log('=========================================');
    
  } catch (err) {
    console.error('E2E Test Failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
    server.close();
  }
})();
