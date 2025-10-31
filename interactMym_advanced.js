const puppeteer = require('puppeteer');
const fs = require('fs');

// 🔍 Requêtes avancées pour trouver les bons profils
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

const MAX_LIKES = 5;
const MAX_TWEETS_TO_SCAN = 15;
const WAIT_BETWEEN_ACTIONS = [3000, 7000];

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

(async () => {
  console.log("🚀 Lancement Puppeteer (profil Chrome existant)...");

  // ---------- Connexion (ne pas modifier) ----------
  const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'; 
  const userDataDir = 'C:\\Users\\gamer\\AppData\\Local\\Google\\Chrome\\User Data\\Default';

  const browser = await puppeteer.launch({
    headless: false,
    executablePath,
    userDataDir,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
  });

  let totalLikes = 0;

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

    // ✅ Vérifie et désactive le filtrage de contenu sensible
    await ensureSensitiveContentDisabled(page);

    // ---------- Boucle sur les requêtes ----------
    for (const query of queries) {
      if (totalLikes >= MAX_LIKES) break;

      console.log(`\n🔍 Recherche: ${query}`);
      const searchUrl = `https://x.com/search?q=${encodeURIComponent(query)}&f=live`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });
      await wait(4000);

      // ✅ Vérifie s’il y a un message “No results”
      const noResults = await page.evaluate(() => {
        const textContent = document.body.innerText.toLowerCase();
        return textContent.includes('no results') || textContent.includes('aucun résultat');
      });

      if (noResults) {
        console.log('❌ Aucun résultat pour cette requête, on passe à la suivante.');
        continue;
      }

      // Scroll profond pour charger les tweets
      await deepScroll(page, 3);
      const tweets = await page.$$('div[data-testid="tweet"]');
      console.log(`📄 ${tweets.length} tweets détectés.`);

      let scanned = 0;
      for (const tweet of tweets) {
        if (scanned >= MAX_TWEETS_TO_SCAN || totalLikes >= MAX_LIKES) break;
        scanned++;

        try {
          const textHandle = await tweet.$('div[lang]');
          const txt = textHandle ? await page.evaluate(el => el.innerText, textHandle) : '';

          // 🎯 Filtrage thématique
          if (!txt.match(/MyM|créatrice|OnlyFans|fans?|contenu/i)) continue;

          const likeBtn = await tweet.$('div[data-testid="like"]');
          if (likeBtn) {
            await likeBtn.click();
            totalLikes++;
            console.log(`💖 Like #${totalLikes} — extrait: "${txt.slice(0, 80)}..."`);
            await wait(randomBetween(...WAIT_BETWEEN_ACTIONS));
          }
        } catch (err) {
          console.log(`⛔ Erreur tweet: ${err.message}`);
        }
      }
    }

    console.log(`\n✅ Script terminé — ${totalLikes} like(s) effectués.`);
    await wait(2000 + Math.random() * 2000);

  } catch (errMain) {
    console.error('💥 Erreur globale du script :', errMain);
  } finally {
    try { await browser.close(); } catch (e) {}
    console.log('🔚 Navigateur fermé — script terminé.');
  }
})();


// ----------- Fonctions utilitaires -----------

async function deepScroll(page, passes = 3) {
  for (let i = 0; i < passes; i++) {
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 2);
    });
    await wait(2000 + Math.random() * 1500);
  }
}

async function ensureSensitiveContentDisabled(page) {
  console.log('⚙️ Vérification du filtrage de contenu sensible...');
  await page.goto('https://x.com/settings/privacy_and_safety', { waitUntil: 'networkidle2' });
  await wait(4000);

  const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
  if (bodyText.includes('afficher le contenu pouvant contenir du matériel sensible') ||
      bodyText.includes('display media that may contain sensitive content')) {

    // Essaie de cliquer sur la bascule si présente
    const toggle = await page.$('input[type="checkbox"], div[role="switch"]');
    if (toggle) {
      await toggle.click().catch(() => {});
      console.log('🔓 Option de contenu sensible activée.');
      await wait(2000);
    } else {
      console.log('ℹ️ Option introuvable, vérifie manuellement dans les paramètres si nécessaire.');
    }
  } else {
    console.log('✅ Contenu sensible déjà autorisé.');
  }
}
