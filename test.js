const puppeteer = require('puppeteer');

(async () => {
  // Lance Chrome/Chromium
  const browser = await puppeteer.launch({ headless: false }); // false = voir le navigateur
  const page = await browser.newPage();
  
  // Va sur une page
  await page.goto('https://example.com');
  
  // Prends une capture d'écran
  await page.screenshot({ path: 'example.png' });
  
  console.log("Capture d'écran terminée !");
  
  await browser.close();
})();
