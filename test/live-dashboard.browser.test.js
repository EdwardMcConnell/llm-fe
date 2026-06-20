import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

describe('Live Dashboard Real-Browser Integration Proof', () => {
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
                import { createDashboard } from './generated-examples/live-dashboard/live-dashboard-app-wireup.generated.js';
                import { SharedMap } from './src/crdt.js';
                
                window.appMap = new SharedMap('dashboard');
                window.appMap.set('dashboard:index', { itemIds: ['w1'] });
                window.appMap.set('dashboard:widget:w1', { id: 'w1', title: 'Network', currentValue: 100, history: [100, 200, 150], status: 'normal' });
                
                window.dashboardApp = createDashboard(window.appMap);
                document.body.appendChild(window.dashboardApp.root);
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

  test('runs generated Live Dashboard app in a real Chrome/V8 instance', async () => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.toString()));

    await page.goto(url, { waitUntil: 'networkidle0' });
    
    await page.waitForFunction('window.appLoaded === true');

    const widgetTitle = await page.$eval('.widget-title', el => el.textContent);
    expect(widgetTitle).toBe('Network');

    const svgPath = await page.$eval('.sparkline-path', el => el.getAttribute('d'));
    expect(svgPath).toContain('M0,30'); // SVG generated

    if (errors.length > 0) console.error("BROWSER ERRORS:", errors);
    expect(errors).toHaveLength(0);
  });
});
