import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', err => console.log('ERR:', err.toString()));
  await page.evaluateOnNewDocument(() => {
    window.addEventListener('error', e => console.error('WINDOW ERR:', e.message, e.filename, e.lineno));
  });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  console.log('Final URL:', page.url());
  await browser.close();
})();
