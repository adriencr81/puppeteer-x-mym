import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

// --- CONFIG GÉNÉRALE ---
const USER_DATA_DIR = "C:/Users/gamer/AppData/Local/Google/Chrome/User Data";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SITE_URL = "https://observatoirecreateurs.fr/?utm_source=X&utm_medium=reply&utm_campaign=automation";

// --- QUERIES ---
const QUERIES = [
  `"recommandation MyM" OR "meilleure créatrice MyM" lang:fr min_faves:5`,
  `"MyM qui suivre" OR "créatrices MyM à découvrir" lang:fr filter:replies -filter:media`,
  `"MyM France" OR "créatrices françaises MyM" lang:fr filter:has_engagement -spam min_replies:3`,
  `"top MyM" OR "classement créatrices MyM" lang:fr since:2025-10-01 filter:images min_faves:10`
];

// --- RÉPONSES ROTATIVES ---
const REPLIES = [
  `🔥 Super discussion ! On a justement fait un classement actualisé des top créatrices MyM 🇫🇷 : ${SITE_URL}`,
  `👋 Intéressant ! Si tu veux voir les top créatrices MyM mises à jour chaque semaine : ${SITE_URL}`,
  `💫 Merci pour le partage ! Voici une sélection des meilleures créatrices MyM en France : ${SITE_URL}`,
  `🌟 Pour ceux qui cherchent les top créatrices MyM, le classement complet est ici 👉 ${SITE_URL}`,
  `📊 On a analysé les tendances MyM : top créatrices françaises à découvrir → ${SITE_URL}`
];

// --- PARAMÈTRES ---
const MAX_INTERACTIONS_PER_QUERY = 5;
const DELAY_BETWEEN_ACTIONS_MS = [8000, 15000]; // entre 8 et 15 sec
const RANDOM = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const LOG_PATH = path.resolve("./logs/interactions.json");

// --- CHARGER / SAUVER LES LOGS ---
function loadLogs() {
  try {
    return JSON.parse(fs.readFileSync(LOG_PATH, "utf8"));
  } catch {
    return [];
  }
}
function saveLogs(logs) {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, JSON.stringify(logs, null, 2));
}

// --- MAIN ---
async function run() {
  console.log("🚀 Lancement Puppeteer (profil Chrome existant)...");
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: CHROME_PATH,
    userDataDir: USER_DATA_DIR,
    defaultViewport: null,
    args: ["--start-maximized"]
  });

  const page = await browser.newPage();
  const logs = loadLogs();

  for (const query of QUERIES) {
    console.log(`\n🔍 Recherche : ${query}`);
    const encoded = encodeURIComponent(query);
    const searchUrl = `https://x.com/search?q=${encoded}&f=live`;

    await page.goto(searchUrl, { waitUntil: "networkidle2" });
    await page.waitForTimeout(5000);

    const tweets = await page.$$('[data-testid="tweet"]');
    console.log(`🧩 ${tweets.length} tweets trouvés pour cette recherche.`);

    let count = 0;
    for (const tweet of tweets) {
      if (count >= MAX_INTERACTIONS_PER_QUERY) break;

      const tweetId = await page.evaluate(el => el.getAttribute("data-tweet-id"), tweet).catch(() => null);
      if (!tweetId || logs.includes(tweetId)) continue; // déjà traité

      try {
        // Vérifie la présence d’un texte (filtrage simple)
        const textContent = await tweet.evaluate(el => el.innerText);
        if (!textContent || textContent.length < 40) continue; // évite le bruit

        // LIKE
        const likeButton = await tweet.$('[data-testid="like"]');
        if (likeButton) {
          await likeButton.click();
          console.log("❤️ Tweet liké");
        }

        // RÉPONSE
        const replyButton = await tweet.$('[data-testid="reply"]');
        if (replyButton) {
          await replyButton.click();
          await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 5000 });
          const textarea = await page.$('[data-testid="tweetTextarea_0"]');
          const replyText = REPLIES[Math.floor(Math.random() * REPLIES.length)];
          await textarea.type(replyText, { delay: 25 });
          await page.click('[data-testid="tweetButton"]');
          console.log("💬 Réponse publiée !");
          await page.waitForTimeout(RANDOM(4000, 7000));
        }

        logs.push(tweetId);
        saveLogs(logs);

        count++;
        console.log(`✅ Interaction ${count}/${MAX_INTERACTIONS_PER_QUERY}`);
        await page.waitForTimeout(RANDOM(...DELAY_BETWEEN_ACTIONS_MS));
      } catch (err) {
        console.warn("⚠️ Erreur sur un tweet :", err.message);
      }
    }
  }

  console.log("\n🎯 Automatisation terminée !");
  await browser.close();
}

run().catch(err => console.error("💥 Erreur globale :", err));
