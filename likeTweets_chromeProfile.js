/**
 * likeTweets_chromeProfile.js
 * Utilise ton profil Chrome existant (userDataDir) pour éviter les blocages de login.
 *
 * Remplace `executablePath` et `userDataDir` par les chemins adaptés à ton système.
 */

const puppeteer = require('puppeteer'); // si tu veux éviter le téléchargement Chromium, utilises puppeteer-core
const fs = require('fs');

const keywords = [
  "MYM créatrice",
  "créatrice MYM",
  "fans MYM",
  "contenu premium MYM",
  "créatrice OnlyFans",
  "fans créateurs"
];

const MAX_LIKES = 3;
const MAX_TWEETS_TO_SCAN = 10;

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("🚀 Lancement Puppeteer (profil Chrome existant)...");

  // ----------  ADAPTE ICI AVANT LANCEMENT  ----------
  const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'; 
  // macOS example: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  // linux example: '/usr/bin/google-chrome'
  const userDataDir = 'C:\\Users\\gamer\\AppData\\Local\\Google\\Chrome\\User Data\\Default';
  // Remplace TON_USER et éventuellement Profile 5 par ton profil dédié
  // ---------------------------------------------------

  // Lancer Chrome en utilisant ton profil (FERME Chrome avant d'exécuter)
  const browser = await puppeteer.launch({
    headless: false,
    executablePath,
    userDataDir,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // optionnel : masque l'indicateur webdriver (peut aider)
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    // Vérifie que la session est active en voyant la nav principale
    await page.goto('https://x.com/home', { waitUntil: 'networkidle2' });
    try {
      await page.waitForSelector('nav[role="navigation"]', { timeout: 10000 });
      console.log('🔐 Session active — connecté à X via ton profil Chrome.');
    } catch (err) {
      console.log('⚠️ Impossible de détecter une session active. Vérifie que tu es connecté dans le profil Chrome spécifié.');
      // On laisse tout de même tenter la recherche (parfois la nav diffère)
    }

    // Choix aléatoire du mot-clé
    const keyword = keywords[Math.floor(Math.random() * keywords.length)];
    console.log(`🔍 Recherche: "${keyword}"`);
    const searchUrl = `https://x.com/search?q=${encodeURIComponent(keyword)}&f=live`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });

    // Attendre les tweets, tenter scroll si nécessaire
    try {
      await page.waitForSelector('div[data-testid="tweet"]', { timeout: 30000 });
    } catch (err) {
      console.log('⚠️ Sélecteur tweet non trouvé rapidement — scroll pour forcer le chargement...');
      await autoScroll(page);
    }

    // Scroll supplémentaire pour charger du contenu
    await autoScroll(page);

    // Récupérer une liste de tweets (limité)
    const tweets = await page.$$('div[data-testid="tweet"]');
    console.log(`📄 ${tweets.length} tweets détectés (scan max ${MAX_TWEETS_TO_SCAN})`);

    let likes = 0;
    let scanned = 0;

    for (let i = 0; i < tweets.length && scanned < MAX_TWEETS_TO_SCAN && likes < MAX_LIKES; i++) {
      scanned++;
      const tweet = tweets[i];

      try {
        // Optionnel : récupérer texte pour logs/filtrage
        const textHandle = await tweet.$('div[lang]');
        let txt = '';
        if (textHandle) {
          txt = await page.evaluate(el => el.innerText, textHandle);
        }

        // Ici tu peux appeler OpenAI pour scorer le tweet avant d'agir (hors script actuel)
        // Exemple: si score >= threshold => like

        const likeBtn = await tweet.$('div[data-testid="like"]');
        if (likeBtn) {
          await likeBtn.click();
          likes++;
          console.log(`💖 Like #${likes} sur tweet index ${i + 1}. Extrait: "${txt.slice(0,80)}"`);
          // Attendre un peu de manière aléatoire pour simuler humain
          await wait(3000 + Math.random() * 4000);
        } else {
          console.log(`— Pas de bouton Like détecté pour le tweet index ${i + 1}`);
        }

      } catch (err) {
        console.log(`⛔ Erreur pendant le scan du tweet index ${i + 1}:`, err.message);
      }
    }

    console.log(`✅ Cycle terminé — ${likes} like(s) effectués sur ${scanned} tweets analysés.`);

    // Fin : petit délai puis fermeture
    await wait(2000 + Math.random() * 2000);

  } catch (errMain) {
    console.error('Erreur globale du script :', errMain);
  } finally {
    try { await browser.close(); } catch (e) {}
    console.log('🔚 Navigateur fermé — script terminé.');
  }
})();

// --------------- Helpers ---------------
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        // si on approche du bas, on arrête après un court délai
        if (totalHeight >= document.body.scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 800);
    });
  });
}
