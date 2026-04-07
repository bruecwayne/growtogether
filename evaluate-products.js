const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: "new" });
    const page = await browser.newPage();
    
    await page.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle0' });
    
    const data = await page.evaluate(() => {
      let firstProduct = document.querySelector('.product-card');
      if (!firstProduct) return "no products";
      let imgBg = firstProduct.querySelector('.img-bg');
      if (!imgBg) return "no img-bg";
      let animInner = firstProduct.querySelector('.reactive-anim-inner');
      if (!animInner) return "no reactive-anim-inner";
      
      let style = window.getComputedStyle(imgBg);
      let innerStyle = window.getComputedStyle(animInner);
      
      return {
        imgBgBounds: imgBg.getBoundingClientRect(),
        imgBgHasWrapperClass: imgBg.classList.contains('reactive-anim-wrapper'),
        animInnerBounds: animInner.getBoundingClientRect(),
        animInnerBg: innerStyle.getPropertyValue('background'),
        animInnerOpacity: innerStyle.getPropertyValue('opacity'),
        c1: innerStyle.getPropertyValue('--c1'),
        classListInner: Array.from(imgBg.children).map(c => c.className)
      };
    });
    
    console.log(JSON.stringify(data, null, 2));
    await browser.close();
  } catch (err) {
    console.log("ERROR", err);
  }
})();
