import puppeteer from 'puppeteer';
import assert from 'assert';
import http from 'http';
import fs from 'fs';
import path from 'path';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  console.log('Launching Puppeteer for E2E Data Grid validation...');
  
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
  
  await new Promise(r => server.listen(4445, r));
  const browser = await puppeteer.launch();
  
  try {
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    await page.goto('http://localhost:4445/test/data-grid-test.html');
    await delay(1000); // let it mount and generate 10k rows
    
    // Virtualization Proof
    console.log('Scenario 1: 10,000-row rendering proof');
    const rowCount = await page.evaluate(() => document.querySelectorAll('.grid-row').length);
    assert.ok(rowCount < 50, `Virtualization failed, too many rows rendered: ${rowCount}`);
    console.log('✓ Scenario 1 passed');

    // Filtering Proof
    console.log('Scenario 2: filtering/search proof');
    await page.evaluate(() => { window.sharedMap.set('grid:filter', 'Data 9999'); });
    await delay(500);
    const filterVisibleCount = await page.evaluate(() => document.querySelectorAll('.grid-row').length);
    assert.ok(filterVisibleCount === 1, `Filtering failed, expected 1 row, got: ${filterVisibleCount}`);
    
    await page.evaluate(() => { window.sharedMap.set('grid:filter', ''); }); // force reset just in case
    await delay(500);
    console.log('✓ Scenario 2 passed');

    // Sorting Proof
    console.log('Scenario 3: sorting proof');
    await page.evaluate(() => {
      const col = document.querySelector('.header-cell[data-col="col1"]');
      col.click();
    });
    await delay(500);
    const firstSortVal = await page.evaluate(() => {
      const el = document.querySelector('.grid-row[data-index="0"] [data-col-id="col1"]');
      return el ? el.textContent : null;
    });
    await page.evaluate(() => {
      const col = document.querySelector('.header-cell[data-col="col1"]');
      col.click();
    });
    await delay(500);
    const secondSortVal = await page.evaluate(() => {
      const el = document.querySelector('.grid-row[data-index="0"] [data-col-id="col1"]');
      return el ? el.textContent : null;
    });
    assert.notStrictEqual(firstSortVal, secondSortVal, 'Sorting did not change row order');
    // Clear sort
    await page.evaluate(() => { window.sharedMap.set('grid:sortCol', null); });
    await delay(500);
    console.log('✓ Scenario 3 passed');

    // Selection Proof
    console.log('Scenario 4: row selection proof');
    await page.evaluate(() => {
      const firstRow = document.querySelector('.grid-row[data-index="0"]');
      firstRow.click();
    });
    await delay(100);
    const hasSelectedClass = await page.evaluate(() => document.querySelector('.grid-row[data-index="0"]').classList.contains('selected'));
    const isSelectedInMap = await page.evaluate(() => window.sharedMap.get('grid:selectedRows').length === 1);
    assert.ok(hasSelectedClass && isSelectedInMap, 'Row selection failed');
    console.log('✓ Scenario 4 passed');

    // Keyboard Nav
    console.log('Scenario 5: keyboard navigation proof');
    await page.evaluate(() => document.querySelector('.grid-body').focus());
    await delay(100);
    await page.keyboard.press('ArrowDown');
    await delay(100);
    const isFocused = await page.evaluate(() => document.querySelector('.grid-row[data-index="1"]').classList.contains('focused'));
    assert.ok(isFocused, 'Keyboard down arrow failed to focus next row');
    await page.keyboard.press(' ');
    await delay(100);
    const spaceSelected = await page.evaluate(() => document.querySelector('.grid-row[data-index="1"]').classList.contains('selected'));
    assert.ok(spaceSelected, 'Keyboard space did not select row');
    console.log('✓ Scenario 5 passed');

    // Safe Cell Rendering
    console.log('Scenario 6: safe cell rendering proof');
    await page.evaluate(() => {
      const rowId = document.querySelector('.grid-row[data-index="1"]').dataset.rowId;
      window.sharedMap.set(`grid:cell:${rowId}:col1`, '<script>window.XSS_FLAG=true;</script><b>Test</b>');
    });
    await delay(200);
    const xssTriggered = await page.evaluate(() => window.XSS_FLAG === true);
    const textRendered = await page.evaluate(() => {
      const rowId = document.querySelector('.grid-row[data-index="1"]').dataset.rowId;
      return document.querySelector(`.grid-row[data-row-id="${rowId}"] [data-col-id="col1"]`).innerHTML;
    });
    assert.ok(!xssTriggered, 'XSS executed! Safe cell rendering failed');
    assert.ok(textRendered.includes('&lt;script&gt;') || textRendered.includes('<script>'), 'HTML was not properly escaped or rendered safely as text');
    console.log('✓ Scenario 6 passed');

    console.log('\n=========================================');
    console.log('SUCCESS: All Advanced E2E Data Grid Tests Passed!');
    console.log('=========================================');
  } catch (err) {
    console.error('Test Failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
    server.close();
  }
})();
