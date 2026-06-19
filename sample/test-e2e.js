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

    // 4. Add a Task to To Do
    console.log('Adding a task...');
    await page1.evaluate(() => {
      const board = document.querySelector('fe-router').shadowRoot
        .querySelector('sample-layout').querySelector('sample-board').shadowRoot;
      const input = board.querySelector('input[name="title"]');
      const submit = board.querySelector('fe-button[type="submit"]');
      
      input.value = 'Build the native WebSockets backend';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      submit.click();
    });
    
    await delay(500);

    // 5. Verify Task Appears in To Do
    let todoText = await page1.evaluate(() => {
      const board = document.querySelector('fe-router').shadowRoot
        .querySelector('sample-layout').querySelector('sample-board').shadowRoot;
      return board.querySelector('#list-todo').innerText;
    });
    assert.ok(todoText.includes('Build the native WebSockets backend'), 'Task should appear in To Do');
    console.log('✓ Task creation validated in To Do column');

    // 6. Move Task to In Progress via HTML5 Drag and Drop
    console.log('Moving task to In Progress via HTML5 Drag & Drop...');
    await page1.evaluate(() => {
      const board = document.querySelector('fe-router').shadowRoot
        .querySelector('sample-layout').querySelector('sample-board').shadowRoot;
      const card = board.querySelector('#list-todo .card');
      const targetCol = board.querySelector('.col-in-progress');

      const dataTransfer = new DataTransfer();

      card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer }));
      targetCol.dispatchEvent(new DragEvent('dragenter', { bubbles: true, dataTransfer }));
      targetCol.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
      targetCol.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
      card.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer }));
    });

    await delay(500);

    // -------------------------------------------------------------
    // Client 2: Verify Real-time CRDT Sync
    // -------------------------------------------------------------
    console.log('Opening Client 2 to verify real-time sync...');
    const page2 = await browser.newPage();
    await page2.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    await page2.evaluate(() => {
      const loginNode = document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-login');
      const shadowRoot = loginNode.shadowRoot;
      shadowRoot.querySelector('#username').value = 'user2';
      shadowRoot.querySelector('#username').dispatchEvent(new Event('input', { bubbles: true }));
      shadowRoot.querySelector('#password').value = 'pass2';
      shadowRoot.querySelector('#password').dispatchEvent(new Event('input', { bubbles: true }));
      shadowRoot.querySelector('fe-button[type="submit"]').click();
    });
    await delay(1000);

    // 7. Verify Task exists and is in "In Progress" on Client 2
    let p2InProgressText = await page2.evaluate(() => {
      const board = document.querySelector('fe-router').shadowRoot
        .querySelector('sample-layout').querySelector('sample-board').shadowRoot;
      return board.querySelector('#list-in-progress').innerText;
    });
    assert.ok(p2InProgressText.includes('Build the native WebSockets backend'), 'Client 2 should see synced task in In Progress column');
    console.log('✓ Real-time CRDT Synchronization validated (Moved item)');

    // 8. Test Live Task Editing (CRDT Text Sync)
    console.log('Testing live task editing...');
    await page1.evaluate(() => {
      const board = document.querySelector('fe-router').shadowRoot
        .querySelector('sample-layout').querySelector('sample-board').shadowRoot;
      const titleEl = board.querySelector('.card .card-title');
      
      // Simulate click/focus to set activeEditId
      titleEl.dispatchEvent(new Event('focus', { bubbles: true }));
      
      // Simulate typing
      titleEl.textContent = 'Build the native WebSockets backend - LIVE EDITED';
      titleEl.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await delay(1000); // Wait for sync

    // 9. Verify Live Edit on Client 2
    let p2EditedText = await page2.evaluate(() => {
      const board = document.querySelector('fe-router').shadowRoot
        .querySelector('sample-layout').querySelector('sample-board').shadowRoot;
      return board.querySelector('.card .card-title').textContent;
    });
    assert.strictEqual(p2EditedText, 'Build the native WebSockets backend - LIVE EDITED', 'Client 2 should see the live edited title');
    console.log('✓ Live Task Editing (CRDT) validated');

    // 10. Delete Task from Client 1
    console.log('Deleting task from Client 1...');
    await page1.evaluate(() => {
      const board = document.querySelector('fe-router').shadowRoot
        .querySelector('sample-layout').querySelector('sample-board').shadowRoot;
      board.querySelector('#list-in-progress .delete-btn').click();
    });
    await delay(500);

    // 9. Verify Deletion on Client 2
    let p2Text = await page2.evaluate(() => {
      const board = document.querySelector('fe-router').shadowRoot
        .querySelector('sample-layout').querySelector('sample-board').shadowRoot;
      return board.querySelector('#list-in-progress').innerText;
    });
    assert.ok(!p2Text.includes('Build the native WebSockets backend'), 'Client 2 should see task deleted');
    console.log('✓ Real-time Deletion validated across network');

    console.log('\\n=========================================');
    console.log('SUCCESS: All E2E Kanban functionality validated!');
    console.log('=========================================');
    
  } catch (err) {
    console.error('E2E Test Failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
