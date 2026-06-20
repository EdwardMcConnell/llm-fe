import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import path from 'path';

import http from 'http';
import fs from 'fs';

let browser;
let server;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, '..', req.url);
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
  
  await new Promise(r => server.listen(4444, r));
  browser = await puppeteer.launch({ headless: true });
});

afterAll(async () => {
  await browser.close();
  server.close();
});

describe('Data Grid Virtualization', () => {
  it('should only render visible rows out of 10,000', async () => {
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    await page.goto('http://localhost:4444/test/data-grid-test.html');
    await new Promise(r => setTimeout(r, 1000)); // wait for mount

    const rowCount = await page.evaluate(() => {
      return document.querySelectorAll('.grid-row').length;
    });

    expect(rowCount).toBeLessThan(30);
    expect(rowCount).toBeGreaterThan(10);

    const firstRowText = await page.evaluate(() => {
      const row = document.querySelector('.grid-row[data-index="0"]');
      return row ? row.textContent : null;
    });
    expect(firstRowText).toBe('Data 0');

    await page.evaluate(() => {
      const body = document.querySelector('.grid-body');
      body.scrollTop = 160000;
      body.dispatchEvent(new Event('scroll'));
    });

    await new Promise(r => setTimeout(r, 100)); // wait for render

    const row5000Text = await page.evaluate(() => {
      const row = document.querySelector('.grid-row[data-index="5000"]');
      return row ? row.textContent : null;
    });
    expect(row5000Text).toBe('Data 5000');

    const row0Gone = await page.evaluate(() => {
      return document.querySelector('.grid-row[data-index="0"]') === null;
    });
    expect(row0Gone).toBe(true);
  });
});
