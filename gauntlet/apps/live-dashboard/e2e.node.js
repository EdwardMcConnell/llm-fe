import puppeteer from 'puppeteer';
import assert from 'assert';
import { spawn } from 'child_process';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log('Starting demo server for Live Dashboard E2E validation...');
  const serverProcess = spawn('node', ['sample/server.js'], { detached: true, stdio: 'ignore' });
  await delay(2000); // Wait for server to start

  console.log('Launching Puppeteer for Live Dashboard E2E validation...');
  const browser = await puppeteer.launch();
  
  try {
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    // Inject mock token so router lets us into /dashboard
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      localStorage.setItem('fe_sample_token', 'eyJhbGciOiJub25lIn0=.eyJleHAiOjk5OTk5OTk5OTl9.');
    });

    // Mount app
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
    
    // Check form rendering
    const rendered = await page.evaluate(() => {
      const dashboardNode = document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-dashboard');
      return !!dashboardNode;
    });
    
    if (!rendered) throw new Error("Dashboard component failed to render.");

    // Inject mock CRDT data to simulate real-time metrics
    await page.evaluate(() => {
      window.globalSharedMap.set('dashboard:cpu', 42.0);
      window.globalSharedMap.set('dashboard:memory', 88.0);
      window.globalSharedMap.set('dashboard:users', 1500);
    });
    
    await delay(100); // Wait for reactivity
    
    // Verify DOM patched
    const values = await page.evaluate(() => {
      const shadowRoot = document.querySelector('fe-router').shadowRoot.querySelector('sample-layout').querySelector('sample-dashboard').shadowRoot;
      return {
        cpu: shadowRoot.querySelector('#cpuValue').textContent,
        memory: shadowRoot.querySelector('#memoryValue').textContent,
        users: shadowRoot.querySelector('#usersValue').textContent,
        memoryClass: shadowRoot.querySelector('#memoryBar').className
      };
    });
    
    assert.strictEqual(values.cpu, '42.0%', 'CPU did not patch correctly');
    assert.strictEqual(values.memory, '88.0%', 'Memory did not patch correctly');
    assert.strictEqual(values.users, '1500', 'Users did not patch correctly');
    assert.ok(values.memoryClass.includes('danger'), 'Danger class not applied for memory > 85');
    
    console.log('Live Dashboard E2E Test Passed.');
  } catch (err) {
    console.error('Live Dashboard E2E Test Failed:', err);
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
