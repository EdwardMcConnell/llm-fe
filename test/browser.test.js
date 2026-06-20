import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

describe('Real-Browser Integration Proof', () => {
  let browser;
  let page;
  let server;
  let url;

  beforeAll(async () => {
    // Start a simple static server
    server = http.createServer((req, res) => {
      if (req.url === '/favicon.ico') {
        res.writeHead(204);
        res.end();
        return;
      }
      
      let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url);
      
      // Serve a dynamic index.html if requested
      if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
            <body>
              <script type="module">
                import { createKanbanApp } from './generated-examples/normalized-kanban/kanban-app.generated.js';
                import { SharedMap } from './src/crdt.js';
                
                window.SharedMap = SharedMap;
                window.createKanbanApp = createKanbanApp;
                window.appMap = new SharedMap('test');
                window.appMap.set('kanban:column:todo:index', { itemIds: ['c1'] });
                window.appMap.set('kanban:item:c1', { id: 'c1', title: 'Test Card in V8', status: 'todo' });
                
                window.kanbanApp = createKanbanApp(window.appMap);
                document.body.appendChild(window.kanbanApp.root);
                window.appLoaded = true;
              </script>
            </body>
          </html>
        `);
        return;
      }

      // Serve static files
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath);
        const mime = ext === '.js' ? 'application/javascript' : 'text/plain';
        res.writeHead(200, { 'Content-Type': mime });
        res.end(fs.readFileSync(filePath));
      } else {
        console.error("404:", req.url);
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise(resolve => {
      server.listen(0, () => {
        url = `http://localhost:${server.address().port}`;
        resolve();
      });
    });

    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser?.close();
    server?.close();
  });

  test('runs generated Kanban app in a real Chrome/V8 instance without errors', async () => {
    // Track browser console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.toString()));

    await page.goto(url, { waitUntil: 'networkidle0' });
    
    // Wait for the app script to complete
    await page.waitForFunction('window.appLoaded === true');

    // Assert that the DOM is actually constructed and rendered by V8
    const columns = await page.$$('.column-root');
    expect(columns.length).toBe(3);

    const firstCardTitle = await page.$eval('.card-title', el => el.textContent);
    expect(firstCardTitle).toBe('Test Card in V8');

    // Assert there are no uncaught errors from the generated JS
    if (errors.length > 0) console.error("BROWSER ERRORS:", errors);
    expect(errors).toHaveLength(0);
  });
});
