/**
 * build-bg.mjs — 產生背卡骨架資料
 *
 * 離線解析三個來源，輸出 `js/bgdata.js`。網站執行時不會抓這些檔案。
 *
 * ── 來源與分工 ──
 * 1. PokeMiners game_masters   正式代號（LC_ 樣板）
 * 2. PokeMiners pogo_assets    圖檔清單，決定「哪些背卡真的存在」
 * 3. Serebii                   活動日期與英文名稱
 *
 * 寶可夢清單不在這一步。上游沒有這份資料，Serebii 只到物種層級，
 * 型態要另外一輪從 Dittobase 補，所以骨架的 pokemon 一律是空陣列，
 * 由 js/bgevents.js 的手工資料覆蓋。
 *
 * ── 為什麼以圖檔清單為準 ──
 * 跟 build-dex.mjs 同一個道理。game master 裡有樣板但沒有圖的背卡畫不出來，
 * 所以清單以圖檔為準，再回頭去 game master 補正式代號。
 *
 * ── 大小寫 ──
 * game master 寫 lc_citysafari2025_amsterdam，檔案叫 lc_CitySafari2025_amsterdam。
 * 上游這兩邊的大小寫不一致，一律轉小寫再比對。
 *
 * ── 執行 ──
 *   node tools/build-bg.mjs          用快取，沒快取才下載
 *   node tools/build-bg.mjs --force  忽略快取重新下載
 *
 * 快取在 tools/.cache/bg/（不進 git）。
 */

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SERIES, seriesInfo } from "../js/bgseries.js";
import { HAND_EVENTS } from "../js/bgevents.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "tools", ".cache");
const BGCACHE = join(CACHE, "bg");
const FORCE = process.argv.includes("--force");

const GM_URL =
  "https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/latest.json";
const TREE_URL =
  "https://api.github.com/repos/PokeMiners/pogo_assets/git/trees/master";
const SEREBII_URL = "https://www.serebii.net/pokemongo/backgrounds.shtml";

/**
 * 收納夾的判定規則，由上往下第一個對到的勝出。
 * 名稱在 js/bgseries.js，這裡只管哪個檔名算哪一類。
 */
const SERIES_RULES = [
  [/^(lc|sb)_GoFest/i, "gofest"],
  [/^(lc|sb)_GoTour/i, "gotour"],
  [/^sb_Season\d/i, "season"],
  [/^(lc|sb)_GOWA/i, "gowa"],
  [/^lc_Wcs\d/i, "wcs"],
  [/^lc_CitySafari/i, "citysafari"],
  [/^lc_roadtrip/i, "roadtrip"],
  [/^lc_(AirAdv|JejuAirAdv)/i, "airadv"],
  [/^lc_tpc30th/i, "tpc30th"],
  [/^lc_pokecenter/i, "pokecenter"],
  [/^lc_pokelid/i, "pokelid"],
  [/^lc_nationalTrust/i, "nationaltrust"],
  [/^lc_\d{4}_NPB/i, "npb"],
  [/^lc_MLB/i, "mlb"],
  [/^lc_LotteGiants/i, "kbo"],
  [/^lc_NFL/i, "nfl"],
  [/^lc_TokMun/i, "tokmun"],
  [/^lc_OsakaEvent2025/i, "osaka2025"],
  [/^lc_Paris2025/i, "paris2025"],
  [/^lc_carnivalFlamigo/i, "carnival"],
  [/^sb_TeamLeader/i, "teamleader"],
  [/^sb_/, "sbmisc"],
  [/^lc_/, "lcmisc"],
];

/* ─────────── 下載與快取 ─────────── */

async function cached(name, url, parse = JSON.parse) {
  const path = join(BGCACHE, name);
  if (!FORCE) {
    try {
      await stat(path);
      return parse(await readFile(path, "utf8"));
    } catch {
      /* 沒快取就往下走 */
    }
  }
  process.stdout.write(`  下載 ${name} … `);
  const res = await fetch(url, { headers: { "User-Agent": "poke-change/build-bg" } });
  if (!res.ok) throw new Error(`${name} HTTP ${res.status}`);
  const text = await res.text();
  await mkdir(BGCACHE, { recursive: true });
  await writeFile(path, text);
  console.log(`${(text.length / 1048576).toFixed(1)} MB`);
  return parse(text);
}

/** game master 用的是 build-dex 那份快取，兩個腳本共用不重抓 */
async function gameMaster() {
  const shared = join(CACHE, "game_master.json");
  if (!FORCE) {
    try {
      await stat(shared);
      return JSON.parse(await readFile(shared, "utf8"));
    } catch {
      /* 沒有就自己抓一份 */
    }
  }
  return cached("game_master.json", GM_URL);
}

/** LocationCards 目錄下的圖檔名，GitHub 的 tree API 一次只回一層 */
async function assetList() {
  const path = join(BGCACHE, "locationcards.json");
  if (!FORCE) {
    try {
      await stat(path);
      return JSON.parse(await readFile(path, "utf8"));
    } catch {
      /* 沒快取就往下走 */
    }
  }
  process.stdout.write("  下載 locationcards.json … ");
  const step = async (sha, name) => {
    const url = sha ? `${TREE_URL.replace(/master$/, sha)}` : TREE_URL;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`tree HTTP ${res.status}`);
    const { tree } = await res.json();
    const hit = tree.find((t) => t.path === name);
    if (!hit) throw new Error(`找不到 ${name}`);
    return hit.sha;
  };
  const imagesSha = await step(null, "Images");
  const cardsSha = await step(imagesSha, "LocationCards");
  const res = await fetch(`${TREE_URL.replace(/master$/, cardsSha)}`);
  const { tree } = await res.json();
  const files = tree
    .filter((t) => t.path.endsWith(".png"))
    .map((t) => t.path.slice(0, -4))
    .sort();
  await mkdir(BGCACHE, { recursive: true });
  await writeFile(path, JSON.stringify(files, null, 0));
  console.log(`${files.length} 張`);
  return files;
}

/* ─────────── Serebii ─────────── */

/**
 * Serebii 的表格是三列一組：圖片列、日期列、可取得寶可夢列，
 * 每一列三格。平面攤開對會錯位，一定要照列分組。
 */
function parseSerebii(html) {
  const rows = [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
  const cells = (row) => [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
  const out = [];

  for (let i = 0; i < rows.length; i++) {
    if (!rows[i].includes("locationcard/th/")) continue;
    const imgs = cells(rows[i]);
    const dates = cells(rows[i + 1] || "");
    const eligs = cells(rows[i + 2] || "");

    imgs.forEach((cell, j) => {
      const m = cell.match(/locationcard\/th\/([A-Za-z0-9_\-]+)\.jpg/);
      if (!m) return;
      const alt = cell.match(/alt="([^"]*)"/);
      const dex = [...(eligs[j] || "").matchAll(/\/pokemongo\/pokemon\/(\d+)\.shtml/g)].map(
        (x) => Number(x[1])
      );
      out.push({
        slug: m[1],
        en: decode(alt ? alt[1] : ""),
        date: decode(strip(dates[j] || "")).trim(),
        dex,
      });
    });
    i += 2;
  }
  return out;
}

const strip = (s) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
const decode = (s) =>
  s
    .replace(/&eacute;/g, "é")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");

/* ─────────── 對應與命名 ─────────── */

/**
 * 同一張卡兩邊叫法不同，先統一過再比。
 * 例如上游寫 pokecenter，Serebii 寫 pokemoncenter。
 */
const ALIAS = [
  ["pokemoncenter", "pokecenter"],
  ["gowildarea", "gowa"],
  ["pokemonworldchampionships", "wcs"],
  ["worldchampionships", "wcs"],
  ["safarizone", "citysafari"],
  ["airadventures", "airadv"],
];

/** 比對用：去掉 lc_/sb_ 前綴、數字與所有符號，套別名後全部轉小寫 */
function norm(s) {
  let out = s.replace(/^(lc|sb)[_-]/i, "").toLowerCase().replace(/[^a-z]/g, "");
  for (const [a, b] of ALIAS) out = out.replaceAll(a, b);
  return out;
}

/** 檔名或日期字串裡的西元年，用來拆同名不同年的活動 */
const yearOf = (s) => (s.match(/20\d\d/) || [""])[0];

/**
 * 把上游檔名對到 Serebii 的一筆。
 * 先試完全相同，再試互相包含（Serebii 的 bostonredsox 對上游的 mlbbostonredsox）。
 * 剩兩筆以上就用年份拆，拆不開一律當作沒對到，寧可缺日期也不要給錯的。
 */
function matchSerebii(file, list) {
  const key = norm(file);
  if (!key) return null;
  let hit = list.filter((s) => s.key === key);
  if (!hit.length) hit = list.filter((s) => s.key.includes(key) || key.includes(s.key));
  if (hit.length > 1) {
    const y = yearOf(file);
    const same = hit.filter((s) => yearOf(s.date) === y);
    hit = same.length === 1 ? same : hit;
  }
  return hit.length === 1 ? hit[0] : null;
}

/**
 * 條目 id。發布後就是使用者紀錄的鍵，不能再改。
 * 規則：去掉前綴，駝峰與底線轉連字號，全部小寫。
 * 兩個不同前綴的檔名可能撞名（GOWA_fukuoka 有 lc 與 sb 兩份），撞到就保留前綴。
 */
function makeId(file) {
  const body = file.replace(/^(lc|sb)_/, "");
  return body
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}

/** 檔名推出來的暫用名稱，Serebii 對不到時才用 */
function fallbackName(file) {
  return makeId(file)
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function seriesOf(file) {
  for (const [re, id] of SERIES_RULES) if (re.test(file)) return id;
  return "lcmisc";
}

/* ─────────── 主流程 ─────────── */

console.log("讀取來源");
const gm = await gameMaster();
const files = await assetList();
const serebii = parseSerebii(await cached("serebii.html", SEREBII_URL, (s) => s));
console.log(`  game master ${gm.length} 筆樣板`);
console.log(`  圖檔 ${files.length} 張`);
console.log(`  Serebii ${serebii.length} 筆`);

// 正式代號：imageUrl（轉小寫）→ templateId
const codeByImage = new Map();
const vfxImages = new Set();
for (const t of gm) {
  const s = t?.data?.locationCardSettings;
  if (!s?.imageUrl) continue;
  codeByImage.set(s.imageUrl.toLowerCase(), t.templateId);
  // 有特效層的卡，上游那張圖只是底層，不是玩家看到的卡面
  if (s.vfxAddress) vfxImages.add(s.imageUrl.toLowerCase());
}

// Serebii：先算好比對用的鍵，之後逐張找
const serebiiKeyed = serebii.map((s) => ({ ...s, key: norm(s.slug) }));

// 手工資料已經認領的圖檔，骨架不重複產生
const handAssets = new Set();
for (const ev of HAND_EVENTS) for (const c of ev.cards) if (c.asset) handAssets.add(c.asset);

const idSeen = new Map();
const cards = [];
const noSerebii = [];

for (const file of files) {
  let id = makeId(file);
  if (idSeen.has(id)) {
    // 撞名：兩邊都改回帶前綴的形式，不能只改後來的那個
    const prev = idSeen.get(id);
    prev.id = `${prev.asset.slice(0, 2)}-${id}`;
    id = `${file.slice(0, 2)}-${id}`;
  }

  const hit = matchSerebii(file, serebiiKeyed);
  if (!hit) noSerebii.push(file);

  const card = {
    id,
    asset: file,
    code: codeByImage.get(file.toLowerCase()) || "",
    series: seriesOf(file),
    scope: file.startsWith("sb_") ? "global" : "regional",
    en: hit?.en || fallbackName(file),
    date: hit?.date || "",
    vfx: vfxImages.has(file.toLowerCase()),
  };
  idSeen.set(makeId(file), card);
  cards.push(card);
}

/* ─────────── 輸出 ─────────── */

/*
 * 骨架涵蓋全部，包含手工已認領的那幾張。
 * 排除掉的話，手工那層就拿不到 vfx、code 這些只有上游知道的欄位，
 * 而且合併是以 asset 對應、手工逐欄覆蓋，重複不會變成兩張卡。
 */
const auto = cards;

const body = auto
  .map(
    (c) =>
      `  { id: ${JSON.stringify(c.id)}, asset: ${JSON.stringify(c.asset)}, ` +
      `series: ${JSON.stringify(c.series)}, scope: ${JSON.stringify(c.scope)}, ` +
      `en: ${JSON.stringify(c.en)}, date: ${JSON.stringify(c.date)}, ` +
      `code: ${JSON.stringify(c.code)}, vfx: ${c.vfx}, pokemon: [] },`
  )
  .join("\n");

await writeFile(
  join(ROOT, "js", "bgdata.js"),
  `/**
 * bgdata.js — 背卡骨架資料
 *
 * 由 tools/build-bg.mjs 產生，不要手改，下次重跑會整份蓋掉。
 * 要改名稱或補寶可夢清單，改 js/bgevents.js，那一份會逐欄覆蓋這裡。
 *
 * 欄位：
 *   id       使用者紀錄的鍵，發布後不可更改
 *   asset    上游檔名，圖片網址由 js/backgrounds.js 的 bgUrl() 組出來
 *   series   收納夾，名稱在 js/bgseries.js
 *   scope    global 全球 / regional 地區限定
 *   en       英文名稱，來自 Serebii，對不到時用檔名推
 *   date     活動期間，來自 Serebii
 *   code     game master 的正式代號，用來對上游，畫面上不顯示
 *   vfx      上游那張圖只是底層，玩家看到的卡面還疊了一層特效。
 *            true 的話畫面上會看到跟遊戲裡不一樣的圖，只能將就
 *   pokemon  可能帶有這張背卡的條目，骨架一律留空
 */

export const BG_CARDS = [
${body}
];

export const BG_CARD_COUNT = ${auto.length};
`
);

/* ─────────── 報告 ─────────── */

const noCode = cards.filter((c) => !c.code);
const noDate = cards.filter((c) => !c.date);
const byCount = new Map();
for (const c of cards) byCount.set(c.series, (byCount.get(c.series) || 0) + 1);
const unnamed = [...byCount.keys()].filter((s) => !seriesInfo(s));

const report = [
  "# bg-report — 背卡抽取報告",
  "",
  `圖檔 ${files.length} 張，骨架輸出 ${auto.length} 張，其中 ${handAssets.size} 張有手工資料會覆蓋。`,
  "",
  "## 收納夾",
  "",
  "| 系列 | 張數 | 名稱 |",
  "| --- | --- | --- |",
  ...SERIES.map((s) => `| ${s.id} | ${byCount.get(s.id) || 0} | ${s.zh} |`),
  "",
  `## 上游只有底層 ${cards.filter((c) => c.vfx).length} 張`,
  "",
  "game master 標了 vfxAddress，玩家看到的卡面是這張圖再疊一層特效。",
  "有本地備援圖的會優先用本地那張，其餘只能顯示底層。",
  "",
  ...cards.filter((c) => c.vfx).map((c) => `- ${c.asset}${c.local ? "（有本地圖）" : ""}`),
  "",
  `## 缺正式代號 ${noCode.length} 張`,
  "",
  "game master 沒有對應樣板，可能是還沒上線或已經下架。",
  "",
  ...noCode.map((c) => `- ${c.asset}`),
  "",
  `## Serebii 對不到 ${noSerebii.length} 張`,
  "",
  "這些沒有日期與英文名稱，用檔名推的暫名頂著。",
  "",
  ...noSerebii.map((f) => `- ${f}`),
  "",
  `## 缺日期 ${noDate.length} 張`,
  "",
  ...noDate.map((c) => `- ${c.asset}`),
  "",
  "## Serebii 的寶可夢清單（下一輪比對用）",
  "",
  "只到物種層級，沒有型態。型態要從 Dittobase 補。",
  "",
  ...serebii.map((s) => `- ${s.slug} — ${s.dex.join(", ") || "（無）"}`),
  "",
].join("\n");

await writeFile(join(ROOT, "tools", "bg-report.md"), report);

console.log("\n產生完成 js/bgdata.js");
console.log(`  骨架張數        ${auto.length}`);
console.log(`  其中手工覆蓋    ${handAssets.size}`);
console.log(`  收納夾          ${byCount.size}`);
const vfxCount = cards.filter((c) => c.vfx).length;
if (vfxCount) console.log(`  ! 上游只有底層 ${vfxCount} 張（有特效層）`);
if (noCode.length) console.log(`  ! 缺正式代號 ${noCode.length} 張`);
if (noSerebii.length) console.log(`  ! Serebii 對不到 ${noSerebii.length} 張`);
if (unnamed.length) console.log(`  ! 系列缺名稱 ${unnamed.join(", ")}，補進 js/bgseries.js`);
console.log("  詳情見 tools/bg-report.md");
