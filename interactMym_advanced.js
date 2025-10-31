const puppeteer = require('puppeteer'); 
const fs = require('fs');

const queries = [
  `"créatrices MyM" OR "recommandation MyM" OR "MyM à suivre" OR "top MyM" lang:fr -filter:replies min_faves:5`,
  `"quelle créatrice MyM" OR "vos créatrices MyM préférées" OR "MyM que vous suivez" lang:fr min_replies:3`,
  `"MyM France" OR "créatrices françaises MyM" OR "classement MyM" lang:fr filter:images min_faves:8`,
  `"nouvelle sur MyM" OR "je débute sur MyM" OR "mon MyM est" OR "mon lien MyM" lang:fr filter:links -filter:replies`,
  `from:myofficialmym OR from:mym_officiel OR @mym_officiel "créatrices" lang:fr min_retweets:5`,
  `"promo MyM" OR "réduction MyM" OR "nouveau contenu MyM" lang:fr filter:media min_faves:3`,
  `"mon MyM" OR "abonne toi à mon MyM" OR "découvre mon MyM" lang:fr filter:links min_faves:2 -filter:replies`,
  `"créatrice de contenu" OR "créateur MyM" OR "fan MyM" lang:fr -filter:replies min_faves:2`,
  `"meilleure créatrice" OR "vos créatrices préférées" OR "contenu exclusif" OR "abonnement MyM" lang:fr -filter:replies min_faves:3`,
  `"site MyM" OR "alternative à OnlyFans" OR "contenu premium" lang:fr min_faves:5`
];

const MAX_LIKES = 3;
const MAX_TWEETS_TO_SCAN = 10;
const WAIT_BETWEEN_ACTIONS = [3000, 7000];

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

(async () => {
  console.log("🚀 Lancement Puppeteer (profil Chrome existant)...");

  // ---------- Connexion inchangée ----------
  const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'; 
  const userDataDir = 'C:\\Users\\gamer\\AppData\\Local\\Google\\Chrome\\User Data\\Default';

  const browser = await puppeteer.launch({
    headless: false,
    executablePath,
    userDataDir,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    await page.goto('https://x.com/home', { waitUntil: 'networkidle2' });
    try {
      await page.waitForSelector('nav[role="navigation"]', { timeout: 10000 });
      console.log('🔐 Session active — connecté à X via ton profil Chrome.');
    } catch {
      console.log('⚠️ Impossible de détecter une session active.');
    }

    // ---------- Choix aléatoire d’une query avancée ----------
    const query = queries[Math.floor(Math.random() * queries.length)];
    console.log(`🔍 Recherche: ${query}`);
    const searchUrl = `https://x.com/search?q=${encodeURIComponent(query)}&f=live`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });
    await wait(5000);

    // Scroll pour charger du contenu
    await autoScroll(page);

    const tweets = await page.$$('div[data-testid="tweet"]');
    console.log(`📄 ${tweets.length} tweets détectés (scan max ${MAX_TWEETS_TO_SCAN})`);

    let likes = 0;
    let scanned = 0;

    for (let i = 0; i < tweets.length && scanned < MAX_TWEETS_TO_SCAN && likes < MAX_LIKES; i++) {
      scanned++;
      const tweet = tweets[i];

      try {
        const textHandle = await tweet.$('div[lang]');
        const txt = textHandle ? await page.evaluate(el => el.innerText, textHandle) : '';

        // ✅ Filtrage rapide : uniquement tweets pertinents MYM
        if (!txt.match(/MyM|créatrice|fans?|contenu|OnlyFans/i)) continue;

        const likeBtn = await tweet.$('div[data-testid="like"]');
        if (likeBtn) {
          await likeBtn.click();
          likes++;
          console.log(`💖 Like #${likes} sur tweet index ${i+1}. Extrait: "${txt.slice(0,80)}"`);
          await wait(randomBetween(...WAIT_BETWEEN_ACTIONS));
        }

      } catch (err) {
        console.log(`⛔ Erreur tweet index ${i+1}: ${err.message}`);
      }
    }

    console.log(`✅ Cycle terminé — ${likes} like(s) sur ${scanned} tweets analysés.`);
    await wait(2000 + Math.random()*2000);

  } catch (errMain) {
    console.error('Erreur globale du script :', errMain);
  } finally {
    try { await browser.close(); } catch (e) {}
    console.log('🔚 Navigateur fermé — script terminé.');
  }
})();

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 800);
    });
  });
}
