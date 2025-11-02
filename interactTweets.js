/**
 * interactTweets.js
 * 
 * Exécute des interactions (like/comment) sur une liste de tweets,
 * tout en utilisant ton profil Chrome existant (non-headless).
 * 
 * Usage :
 * node interactTweets.js --tweets '[{"url":"https://x.com/...", "comment":"Super contenu sur Observatoire Créateurs !"}]'
 */

const puppeteer = require("puppeteer");

const WAIT_BETWEEN_ACTIONS = [2500, 6000];
const MAX_ACTIONS_PER_RUN = 10;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const randomBetween = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

// ---- Lecture des paramètres CLI ----
const args = process.argv.slice(2);
const tweetsIndex = args.indexOf("--tweets");

let tweetList = [];

if (tweetsIndex !== -1) {
  try {
    tweetList = JSON.parse(args[tweetsIndex + 1] || "[]");
  } catch (e) {
    console.error("⚠️ JSON invalide pour --tweets :", e.message);
    process.exit(1);
  }
}

if (tweetList.length === 0) {
  console.log("❌ Aucun tweet fourni. Exemple :");
  console.log(
    `node interactTweets.js --tweets '[{"url":"https://x.com/...", "comment":"Super article !"}]'`
  );
  process.exit(0);
}

// ---- Lancement du navigateur ----
(async () => {
  console.log("🚀 Lancement Puppeteer (profil Chrome existant)...");
  const executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const userDataDir = "C:\\Users\\gamer\\AppData\\Local\\Google\\Chrome\\User Data";

  const browser = await puppeteer.launch({
    headless: false,
    executablePath,
    userDataDir,
    defaultViewport: null,
    args: [
      "--start-maximized",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() =>
    Object.defineProperty(navigator, "webdriver", { get: () => false })
  );

  await page.goto("https://x.com/home", { waitUntil: "networkidle2" });
  await page.waitForSelector('nav[role="navigation"]', { timeout: 15000 });
  console.log("🔐 Session active — connecté à X via ton profil Chrome.\n");

  let actions = 0;

  for (const t of tweetList.slice(0, MAX_ACTIONS_PER_RUN)) {
    const { url, comment } = t;

    try {
      console.log(`➡️  Ouverture du tweet : ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForSelector('article[data-testid="tweet"]', { timeout: 10000 });

      // ---- LIKE ----
      const likeBtn = await page.$('button[data-testid="like"]');
      const unlikeBtn = await page.$('button[data-testid="unlike"]');

      if (likeBtn) {
        await likeBtn.click();
        console.log("💖 Like effectué !");
      } else if (unlikeBtn) {
        console.log("👍 Déjà liké — on passe.");
      } else {
        console.log("❌ Bouton Like introuvable.");
      }

      // ---- COMMENTAIRE ----
      if (comment && comment.trim() !== "") {
        const replyBtn = await page.$('button[data-testid="reply"]');
        if (replyBtn) {
          await replyBtn.click();
          await page.waitForSelector('div[role="dialog"] div[contenteditable="true"]', {
            timeout: 8000,
          });

          await page.type('div[role="dialog"] div[contenteditable="true"]', comment, {
            delay: 20,
          });

          const sendBtn = await page.$('div[role="dialog"] div[data-testid="tweetButtonInline"]');
          if (sendBtn) {
            await sendBtn.click();
            console.log(`💬 Commentaire posté : "${comment}"`);
          } else {
            console.log("⚠️ Bouton d’envoi introuvable.");
          }

          // fermer la fenêtre si nécessaire
          await wait(2000);
          await page.keyboard.press("Escape");
        } else {
          console.log("❌ Bouton Répondre introuvable.");
        }
      }

      actions++;
      if (actions < tweetList.length) {
        const pause = randomBetween(...WAIT_BETWEEN_ACTIONS);
        console.log(`⏸️ Pause ${pause}ms avant le prochain tweet...\n`);
        await wait(pause);
      }
    } catch (err) {
      console.error(`💥 Erreur sur ${url} :`, err.message);
    }
  }

  console.log(`\n✅ ${actions} interactions effectuées.`);
  await browser.close();
  console.log("🔚 Navigateur fermé — script terminé.");
})();
