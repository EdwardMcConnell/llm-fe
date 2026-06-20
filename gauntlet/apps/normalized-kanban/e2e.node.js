import puppeteer from 'puppeteer';
import assert from 'assert';
import { spawn } from 'child_process';
import path from 'path';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function login(page, username, password) {
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
  await page.evaluate((u, p) => {
    const loginNode = document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-login');
    const shadowRoot = loginNode.shadowRoot;
    const userEl = shadowRoot.querySelector('#username');
    const passEl = shadowRoot.querySelector('#password');
    const submitBtn = shadowRoot.querySelector('fe-button[type="submit"]');
    
    userEl.value = u;
    userEl.dispatchEvent(new Event('input', { bubbles: true }));
    
    passEl.value = p;
    passEl.dispatchEvent(new Event('input', { bubbles: true }));
    
    submitBtn.click();
  }, username, password);
  await delay(1000);
}

async function getBoardElement(page) {
  return page.evaluateHandle(() => {
    return document.querySelector('fe-router').shadowRoot
      .querySelector('sample-layout').querySelector('sample-board').shadowRoot;
  });
}

(async () => {
  console.log('Starting demo server for E2E validation...');
  const serverProcess = spawn('node', ['sample/server.js'], { detached: true, stdio: 'ignore' });
  await delay(2000); // Wait for server to start
  
  console.log('Launching Puppeteer for E2E validation...');
  const browser = await puppeteer.launch();
  
  try {
    const page1 = await browser.newPage();
    page1.on('console', msg => console.log('PAGE 1 CONSOLE:', msg.text()));
    page1.on('pageerror', err => console.log('PAGE 1 ERROR:', err.toString()));
    const page2 = await browser.newPage();
    
    // Use evaluate directly against the globalSharedMap in page1 to set up test state instantly
    await login(page1, 'client_A', 'pass');
    await login(page2, 'client_B', 'pass');

    // Setup pristine board
    await page1.evaluate(() => {
      window.globalSharedMap.set('kanban:column:todo:index', ['item-1', 'item-2', 'item-3']);
      window.globalSharedMap.set('kanban:column:in-progress:index', []);
      window.globalSharedMap.set('kanban:column:done:index', []);
      window.globalSharedMap.set('kanban:item:item-1', { id: 'item-1', title: 'Task 1', status: 'todo' });
      window.globalSharedMap.set('kanban:item:item-2', { id: 'item-2', title: 'Task 2', status: 'todo' });
      window.globalSharedMap.set('kanban:item:item-3', { id: 'item-3', title: 'Task 3', status: 'todo' });
    });
    
    await delay(1000); // let network sync to page2

    console.log('Scenario 1: Two clients edit different cards concurrently (both survive)');
    await page1.evaluate(() => {
      const item1 = window.globalSharedMap.get('kanban:item:item-1');
      window.globalSharedMap.set('kanban:item:item-1', { ...item1, title: 'Task 1 (A)' });
    });
    await page2.evaluate(() => {
      const item2 = window.globalSharedMap.get('kanban:item:item-2');
      window.globalSharedMap.set('kanban:item:item-2', { ...item2, title: 'Task 2 (B)' });
    });
    
    await delay(1000);
    
    let p1_titles = await page1.evaluate(() => {
      return Array.from(document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-board').shadowRoot.querySelectorAll('.card-title')).map(n => n.textContent);
    });
    assert.ok(p1_titles.includes('Task 1 (A)') && p1_titles.includes('Task 2 (B)'), 'Both independent edits survived');
    console.log('✓ Scenario 1 passed');

    console.log('Scenario 2: Client A edits card title while Client B moves a different card');
    await page1.evaluate(() => {
      const item3 = window.globalSharedMap.get('kanban:item:item-3');
      window.globalSharedMap.set('kanban:item:item-3', { ...item3, title: 'Task 3 (Edited)' });
    });
    await page2.evaluate(() => {
      // Move item 1 to in-progress
      const todoIdx = window.globalSharedMap.get('kanban:column:todo:index');
      window.globalSharedMap.set('kanban:column:todo:index', todoIdx.filter(id => id !== 'item-1'));
      window.globalSharedMap.set('kanban:column:in-progress:index', ['item-1']);
      const item1 = window.globalSharedMap.get('kanban:item:item-1');
      window.globalSharedMap.set('kanban:item:item-1', { ...item1, status: 'in-progress' });
    });

    await delay(1000);

    let p2_in_prog = await page2.evaluate(() => {
      return document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-board').shadowRoot.querySelector('#list-in-progress').innerText;
    });
    let p2_titles = await page2.evaluate(() => {
      return Array.from(document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-board').shadowRoot.querySelectorAll('.card-title')).map(n => n.textContent);
    });

    assert.ok(p2_in_prog.includes('Task 1 (A)'), 'Item 1 was moved successfully');
    assert.ok(p2_titles.includes('Task 3 (Edited)'), 'Item 3 title was edited successfully');
    console.log('✓ Scenario 2 passed');

    console.log('Scenario 3: Client A deletes one card while Client B edits another card');
    await page1.evaluate(() => {
      // Delete item 1
      window.globalSharedMap.delete('kanban:item:item-1');
      const inProgIdx = window.globalSharedMap.get('kanban:column:in-progress:index');
      window.globalSharedMap.set('kanban:column:in-progress:index', inProgIdx.filter(id => id !== 'item-1'));
    });
    await page2.evaluate(() => {
      // Edit item 2
      const item2 = window.globalSharedMap.get('kanban:item:item-2');
      window.globalSharedMap.set('kanban:item:item-2', { ...item2, title: 'Task 2 (B Edit 2)' });
    });

    await delay(1000);

    let p1_html = await page1.evaluate(() => {
      return document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-board').shadowRoot.innerHTML;
    });
    
    assert.ok(!p1_html.includes('Task 1 (A)'), 'Item 1 was deleted');
    assert.ok(p1_html.includes('Task 2 (B Edit 2)'), 'Item 2 edit survived deletion event');
    console.log('✓ Scenario 3 passed');

    console.log('Scenario 4: Same-card concurrent edit (LWW Determinism)');
    await page1.evaluate(() => {
      const item = window.globalSharedMap.get('kanban:item:item-2');
      // A sets it to X
      window.globalSharedMap.set('kanban:item:item-2', { ...item, title: 'Winner A' });
    });
    await page2.evaluate(() => {
      const item = window.globalSharedMap.get('kanban:item:item-2');
      // B sets it to Y concurrently. Since B runs slightly after, LWW usually picks B if clocks are synced, 
      // but the key behavior is that BOTH clients settle on the EXACT SAME state.
      window.globalSharedMap.set('kanban:item:item-2', { ...item, title: 'Winner B' });
    });

    await delay(1000);

    let t1 = await page1.evaluate(() => document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-board').shadowRoot.querySelector('#list-todo .card-title').textContent);
    let t2 = await page2.evaluate(() => document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-board').shadowRoot.querySelector('#list-todo .card-title').textContent);

    assert.strictEqual(t1, t2, 'Both clients must settle on the same deterministic state due to LWW');
    console.log('✓ Scenario 4 passed (Settled on: ' + t1 + ')');

    console.log('Scenario 5: Same-column concurrent reorder (LWW Determinism limitation)');
    await page1.evaluate(() => {
      // Client A reorders Todo list to: [item-3, item-2]
      window.globalSharedMap.set('kanban:column:todo:index', ['item-3', 'item-2']);
    });
    await page2.evaluate(() => {
      // Client B concurrently sets Todo list to: [item-2, item-3]
      window.globalSharedMap.set('kanban:column:todo:index', ['item-2', 'item-3']);
    });

    await delay(1000);

    let ord1 = await page1.evaluate(() => Array.from(document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-board').shadowRoot.querySelectorAll('#list-todo .card')).map(el => el.dataset.id));
    let ord2 = await page2.evaluate(() => Array.from(document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-board').shadowRoot.querySelectorAll('#list-todo .card')).map(el => el.dataset.id));

    assert.deepStrictEqual(ord1, ord2, 'Both clients must settle on the exact same array order');
    console.log('✓ Scenario 5 passed (Order: ' + ord1.join(', ') + ')');

    console.log('\n=========================================');
    console.log('SUCCESS: All Advanced E2E Kanban Tests Passed!');
    console.log('=========================================');
    
  } catch (err) {
    console.error('E2E Test Failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
    try {
      process.kill(-serverProcess.pid); // Kill process group
    } catch (e) {
      serverProcess.kill();
    }
  }
})();
