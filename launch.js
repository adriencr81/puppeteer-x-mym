const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
   });
  const page = await browser.newPage();
  await page.goto('https://x.com/login');
})();
