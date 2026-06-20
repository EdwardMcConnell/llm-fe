import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import path from 'path';

let browser;
let serverProcess;

beforeAll(async () => {
  // Start the sync server
  serverProcess = spawn('node', ['server/hot-path.js'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'ignore'
  });

  // Give server time to start
  await new Promise(r => setTimeout(r, 2000));

  browser = await puppeteer.launch({ headless: true });
});

afterAll(async () => {
  await browser.close();
  if (serverProcess) {
    serverProcess.kill();
  }
});

describe('Network Sync Layer', () => {
  it('should sync changes between two clients', async () => {
    const page1 = await browser.newPage();
    const page2 = await browser.newPage();

    await page1.goto('http://localhost:3001');
    await page2.goto('http://localhost:3001');

    // Give SSE time to connect and mount initial UI
    await new Promise(r => setTimeout(r, 1000));

    // Client 1 changes the title of card 1 to "Synced Title"
    await page1.evaluate(() => {
      const card = window.__SHARED_MAP__.get('kanban:item:1');
      window.__SHARED_MAP__.set('kanban:item:1', { ...card, title: 'Synced Title' });
    });

    // Wait for network to sync
    await new Promise(r => setTimeout(r, 500));

    // Client 2 should see the updated title
    const titleText = await page2.evaluate(() => {
      // Find the card with data-id "1" and get its titleNode
      const card = document.querySelector('fe-card[data-id="1"]');
      return card.querySelector('.card-title').textContent;
    });

    expect(titleText).toBe('Synced Title');
  });
});
