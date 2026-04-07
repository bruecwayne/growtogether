const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle0' });
  
  const content = await page.evaluate(() => {
    return document.getElementById('products-grid').innerHTML;
  });
  console.log("PRODUCTS GRID HTML:", content);
  
  await browser.close();
})();
