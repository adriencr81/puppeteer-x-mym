const puppeteer = require("puppeteer");

const queries = [
  `"mon MyM" OR "abonne toi à mon MyM" OR "découvre mon MyM" lang:fr`,
  `"créatrice MyM" OR "créatrices MyM" OR "fans MyM" lang:fr`,
  `"nouvelle sur MyM" OR "je débute sur MyM" OR "contenu MyM" lang:fr`,
  `"promo MyM" OR "réduction MyM" OR "nouveau contenu MyM" lang:fr`,
];

const MAX_LIKES = 6;
const WAIT_BETWEEN_ACTIONS = [3000, 6500];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const randomBetween = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

(async () => {
  console.log("🚀 Lancement Puppeteer (profil Chrome existant)...");
  const executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const userDataDir = "C:\\Users\\gamer\\AppData\\Local\\Google\\Chrome\\User Data\\Default";

  const browser = await puppeteer.launch({
    headless: false,
    executablePath,
    userDataDir,
    defaultViewport: null,
    args: ["--start-maximized", "--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => Object.defineProperty(navigator, "webdriver", { get: () => false }));
    await page.goto("https://x.com/home", { waitUntil: "networkidle2" });
    await page.waitForSelector('nav[role="navigation"]', { timeout: 10000 });
    console.log("🔐 Session active — connecté à X via ton profil Chrome.");

    for (const query of queries) {
      console.log(`\n🔍 Recherche: ${query}`);
      const searchUrl = `https://x.com/search?q=${encodeURIComponent(query)}&f=live`;
      await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
      await wait(5000);

      await autoScroll(page, 4);
      const tweets = await getTweets(page);
      console.log(`📄 ${tweets.length} tweets détectés (tous sélecteurs confondus).`);

      for (const tweet of tweets.slice(0, 10)) {
        const text = await tweet.$eval("div[lang]", (el) => el.innerText).catch(() => "");
        if (text && /MyM|créatrice|fans?|OnlyFans|premium/i.test(text)) {
          console.log(`🧾 "${text.slice(0, 80)}..."`);
          const likeBtn = await tweet.$('button[data-testid="like"]');
          if (likeBtn) {
            await likeBtn.click();
            console.log("💖 Like effectué !");
            await wait(randomBetween(...WAIT_BETWEEN_ACTIONS));
          }
        }
      }
    }

    console.log("\n✅ Script terminé.");
  } catch (err) {
    console.error("💥 Erreur globale :", err);
  } finally {
    await browser.close();
    console.log("🔚 Navigateur fermé — script terminé.");
  }
})();

async function getTweets(page) {
  const selectors = [
    'article[data-testid="tweet"]',
    'div[data-testid="cellInnerDiv"] article',
    'div[data-testid="tweet"]',
    'div[role="article"]',
    'article[role="article"]',
  ];
  let tweets = [];
  for (const sel of selectors) {
    const found = await page.$$(sel);
    if (found.length) {
      console.log(`✅ ${found.length} trouvés via ${sel}`);
      tweets = tweets.concat(found);
    }
  }
  return [...new Set(tweets)];
}

async function autoScroll(page, passes = 3) {
  for (let i = 0; i < passes; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.5));
    await wait(3000);
  }
}
