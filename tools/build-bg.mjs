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
import { GODEX } from "../js/godex.js";
import { extraEntries } from "../js/extra.js";

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
const yearOf = (s) => (String(s || "").match(/20\d\d/) || [""])[0];

/**
 * 把上游檔名對到外部來源的一筆。Serebii 與 Dittobase 共用。
 * 先試完全相同，再試互相包含（Serebii 的 bostonredsox 對上游的 mlbbostonredsox）。
 * 剩兩筆以上就用年份拆，拆不開一律當作沒對到，
 * 寧可缺資料也不要把別張卡的清單掛上去。
 */
function matchByKey(file, list) {
  const key = norm(file);
  if (!key) return null;
  let hit = list.filter((s) => s.key === key);
  if (!hit.length) hit = list.filter((s) => s.key.includes(key) || key.includes(s.key));
  if (hit.length > 1) {
    const y = yearOf(file);
    const same = hit.filter((s) => yearOf(s.date || s.slug) === y);
    hit = same.length === 1 ? same : hit;
  }
  return hit.length === 1 ? hit[0] : null;
}

/**
 * 上游檔名 → Dittobase 代號的人工對照。
 *
 * 兩邊對同一張卡的叫法不同時，字串比對救不了。上游寫球場
 * （lc_2026_NPB_kyocera），Dittobase 寫球隊（lc-nbp-orix-buffaloes）；
 * 上游叫都內（lc_TokMun_koto），Dittobase 叫蓋章拉力賽
 * （lc-stamp-rally-2026-tokyo-koto）。想靠規則通用化只會製造誤配。
 *
 * 每一筆都是把兩邊的卡面縮成 32×32 逐像素比對確認過，雙向都指向對方，
 * 而且次近的差距在一個數量級以上，不是看名字推的。巴黎那兩張的編號
 * 是交叉的，靠猜必錯。
 *
 * null 表示確認 Dittobase 沒有這張，不要讓自動比對硬湊。
 */
const DB_MANUAL = new Map([
  // 日職：上游用球場名，Dittobase 用球隊名
  ["lc_2026_NPB_belluna", "lc-nbp-saitama-seibu-lions"],
  ["lc_2026_NPB_chunichiDragons", "lc-nbp-chunichi-dragons"],
  ["lc_2026_NPB_hokkaidoFighters", "lc-nbp-hokkaido-nippon-ham-fighters"],
  ["lc_2026_NPB_koshienHanshinTigers", "lc-npb-hanshin-tigers-2026"],
  ["lc_2026_NPB_kyocera", "lc-nbp-orix-buffaloes"],
  ["lc_2026_NPB_softbankHawks", "lc-nbp-softbank-hawks"],
  ["lc_2026_NPB_yokohamaStadium", "lc-nbp-yokohama-dena-baystars"],
  ["lc_2026_NPB_zozoMarine", "lc-nbp-chiba-lotte-marines"],

  // 蓋章拉力賽：上游用地點，Dittobase 用活動
  ["lc_OsakaEvent2025_01", "lc-stamp-rally-2025-expo-1"],
  ["lc_OsakaEvent2025_02", "lc-stamp-rally-2025-expo-2"],
  ["lc_OsakaEvent2025_03", "lc-stamp-rally-2025-suita"],
  ["lc_Paris2025_01", "lc-stamp-rally-paris-2025-2"],
  ["lc_Paris2025_02", "lc-stamp-rally-paris-2025"],
  ["lc_TokMun_koto", "lc-stamp-rally-2026-tokyo-koto"],
  ["lc_TokMun_minato", "lc-stamp-rally-2026-tokyo-minato"],
  ["lc_TokMun_shinagawa", "lc-stamp-rally-2026-tokyo-shinagawa"],
  ["lc_carnivalFlamigo_cologne_2026", "lc-stamp-rally-2026-cologne"],
  ["lc_carnivalFlamigo_rio_2026", "lc-stamp-rally-2026-rio-de-janeiro"],
  ["lc_taipeiAmusementPark_2025", "lc-stamp-rally-2025-taipei"],

  // 叫法差太多，或上游拼字有誤（whimpole 多一個 h）
  ["lc_2026_jp_red", "lc-2026-jp-jetred"],
  ["lc_2026_ppk_001", "lc-pokemon-park"],
  ["lc_CR_2026_001", "lc-times-square-2026"],
  ["lc_ID_CarFreeDay", "lc-car-free-day-2026-indonesia"],
  ["lc_NFL_cardinals", "lc-nfl-arizona-cardinals"],
  ["lc_nationalTrust_beltonHouse", "lc-nationaltrust-beltonestate"],
  ["lc_nationalTrust_whimpole", "lc-nationaltrust-wimpoleestate"],

  /*
   * 以下是防搶。自動比對會把清單掛到錯的那張卡上，
   * 兩邊都指名才鎖得住，只寫一邊沒有用。
   */
  ["lc_GOWA_fukuoka", "lc-gowildarea-2024-fukuoka"],
  ["sb_GOWA_fukuoka", "sb-gowildarea-2024-global"],
  ["sb_GoFest2025", "sb-go-fest-2025"],
  ["sb_GoFest2025_Eternatus", "sb-go-fest-2025-dark-skies"],
  ["lc_MLB_tampaBayRays", "lc-mlb-tampa-bay-rays"],
  ["lc_MLB_tampaBayRays2", null],
]);

/**
 * 上游檔名 → Serebii 代號的人工對照。用途跟 DB_MANUAL 一樣，
 * 但 Serebii 只給日期與英文名，接上不會多出寶可夢。
 *
 * 30 週年這四張上游叫 tpc30th，Serebii 叫 PokéXciting，
 * norm 會把數字去掉變成 tpcth，兩邊永遠對不上。
 * 前三張比對過縮圖，菲律賓那張 Serebii 還沒放圖，
 * 靠名稱與日期對（2027-01-23～24 的馬尼拉場，跟官方公告一致）。
 */
const SEREBII_MANUAL = new Map([
  ["lc_tpc30th_malaysia", "pokexcitingmalaysia"],
  ["lc_tpc30th_taiwan", "pokexcitingtaiwan"],
  ["lc_tpc30th_singapore", "pokexcitingsingapore"],
  ["lc_tpc30th_philippines", "pokexcitingphippines"],
]);

/**
 * 決定每張卡要用外部來源的哪一筆。Serebii 與 Dittobase 共用。
 *
 * 人工對照優先，其餘走自動比對。自動比對搶不到人工已經指名的代號，
 * 兩張卡對到同一筆時兩張一起退回沒有資料——寧可缺，
 * 也不要把別張卡的清單掛上去。
 *
 * matchByKey 只防「一張卡對到多筆」，不防「多張卡對到同一筆」。
 * norm 會去掉數字也去掉 lc_/sb_ 前綴，所以 lc_MLB_tampaBayRays 與
 * …Rays2、lc_GOWA_fukuoka 與 sb_GOWA_fukuoka 都會撞在一起，
 * 後面那張就默默拿到前面那張的清單。
 */
function resolveMatches(files, list, manual = new Map()) {
  const bySlug = new Map();
  for (const item of list) if (!bySlug.has(item.slug)) bySlug.set(item.slug, item);
  const picked = new Map();
  const reserved = new Set();
  const conflicts = [];
  const staleManual = [];

  for (const file of files) {
    if (!manual.has(file)) continue;
    const slug = manual.get(file);
    if (slug === null) {
      picked.set(file, null);
      continue;
    }
    const hit = bySlug.get(slug);
    if (!hit) {
      staleManual.push(`${file} → ${slug}`);
      picked.set(file, null);
      continue;
    }
    picked.set(file, hit);
    reserved.add(slug);
  }

  const wanted = new Map();
  for (const file of files) {
    if (picked.has(file)) continue;
    const hit = matchByKey(file, list);
    if (!hit || reserved.has(hit.slug)) {
      picked.set(file, null);
      continue;
    }
    if (!wanted.has(hit.slug)) wanted.set(hit.slug, []);
    wanted.get(hit.slug).push(file);
  }
  for (const [slug, group] of wanted) {
    if (group.length === 1) {
      picked.set(group[0], bySlug.get(slug));
      continue;
    }
    conflicts.push(`${slug}：${group.join("、")}`);
    for (const file of group) picked.set(file, null);
  }

  return { picked, conflicts, staleManual };
}

/**
 * 條目 id。發布後就是使用者紀錄的鍵，不能再改。
 *
 * 規則：去掉前綴，駝峰轉連字號，年份前面也斷開，底線轉連字號，全部小寫。
 *   lc_CitySafari2024_tainan  →  city-safari-2024-tainan
 *
 * 年份要斷開是因為上游把它黏在活動名後面，不斷開會變成 citysafari2024
 * 那種讀不出來的東西。少數檔名年份寫了兩次（CitySafari2023_barcelona_2023），
 * 重複的那個去掉。
 *
 * 兩個不同前綴的檔名可能撞名（GOWA_fukuoka 有 lc 與 sb 兩份），撞到就保留前綴。
 */
function makeId(file) {
  const body = file
    .replace(/^(lc|sb)_/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Za-z])(\d{4})/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
  return body.replace(/-(\d{4})-(.*)-\1$/, "-$1-$2");
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

/* ─────────── Dittobase：寶可夢清單 ─────────── */

const DB_INDEX = "https://www.dittobase.com/pokemon-go/backgrounds";
const DB_CARD = "https://www.dittobase.com/pokemon-go/backgrounds/";
const UA = "Mozilla/5.0 (compatible; poke-change/build-bg)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 頁面裡嵌了一份結構化 JSON，比解 DOM 穩。
 * 每一筆帶物種編號、型態代號，以及異色、進化取得、暗影、
 * 超級進化、極巨化的旗標。
 */
const DB_ROW =
  /"goPokemonSlug":"([^"]+)","canBeShiny":(true|false),"manuallyEvolved":(true|false),"goPokemon":\{"slug":"[^"]*","speciesId":(\d+),"isShadow":(true|false),"isMega":(true|false),"isDynamax":(true|false),"isGigantamax":(true|false)/g;

function parseCardPage(html) {
  const text = html.replaceAll('\\"', '"');
  const out = [];
  const seen = new Set();
  for (const m of text.matchAll(DB_ROW)) {
    const [, slug, shiny, evolve, dex, shadow, mega, , gmax] = m;
    // 超級進化與極巨化不是可交換條目，整批排除
    if (mega === "true" || gmax === "true") continue;
    // 暗影是狀態不是條目，併回本體
    const base = shadow === "true" ? slug.replace(/-shadow$/, "") : slug;
    const key = `${dex}-${base}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, shiny: shiny === "true", evolve: evolve === "true" });
  }
  return out;
}

/**
 * 抓 Dittobase 每張背卡的寶可夢清單。
 *
 * 兩百多頁，每頁約 700 KB，所以只存抽出來的結果不存原始 HTML，
 * 而且一秒一次。已經抓過的不重抓，除非 --force。
 */
async function dittobase() {
  const path = join(BGCACHE, "dittobase.json");
  let store = {};
  if (!FORCE) {
    try {
      store = JSON.parse(await readFile(path, "utf8"));
    } catch {
      /* 沒快取就從頭抓 */
    }
  }

  const indexHtml = await cached("dittobase-index.html", DB_INDEX, (x) => x);
  const slugs = [
    ...new Set(
      [...indexHtml.matchAll(/href="\/pokemon-go\/backgrounds\/([a-z0-9-]+)"/g)].map(
        (m) => m[1]
      )
    ),
  ].sort();

  const todo = slugs.filter((s) => !store[s]);
  if (todo.length) {
    console.log(`  Dittobase 要抓 ${todo.length} 頁，一秒一頁`);
    let n = 0;
    for (const slug of todo) {
      const res = await fetch(DB_CARD + slug, { headers: { "User-Agent": UA } });
      if (res.ok) store[slug] = parseCardPage(await res.text());
      else store[slug] = [];
      if (++n % 25 === 0) process.stdout.write(`    ${n}/${todo.length}\n`);
      await sleep(1000);
    }
    await mkdir(BGCACHE, { recursive: true });
    await writeFile(path, JSON.stringify(store));
  }
  return { slugs, store };
}

/* ─────────── 條目 id 對照 ─────────── */

/**
 * Dittobase 的代號組成是「編號-英文名-型態代號」，
 * 我們的 id 是「d編號.f型態代號」，兩邊都轉成同一個形狀再對。
 */
const slugify = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Flabébé 這種帶重音的字，去掉重音再比
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Dittobase 與我們對同一個裝扮的叫法不同，只能人工對。
 * 對不上的會列在報告裡，補進來就好。
 */
const POKEMON_ALIAS = new Map([
  ["54-psyduck-swim-ring", "d54.fSWIM_2025"],
]);

/**
 * 條目 id 的查表。同一個條目登記多個鍵，因為上游的叫法不只一種：
 *   d1.cJAN_2020_NOEVOLVE  也要能用 1-bulbasaur-jan-2020 找到
 *   d646.fNORMAL           也要能用 646-kyurem 找到
 */
function entryKeyMap() {
  const map = new Map();
  const put = (k, id) => {
    if (!map.has(k)) map.set(k, id);
  };
  for (const e of [...GODEX, ...extraEntries()]) {
    const code = e.id.includes(".") ? e.id.split(".")[1].slice(1) : "";
    const base = `${e.dex}-${slugify(e.en)}`;
    put(base + (code ? "-" + slugify(code) : ""), e.id);
    // 「穿了不能進化」是遊戲機制不是外觀，上游的清單不帶這個後綴
    if (/_NOEVOLVE$/.test(code)) put(`${base}-${slugify(code.replace(/_NOEVOLVE$/, ""))}`, e.id);
    // 只有型態沒有本體的（酋雷姆、代歐奇希斯），NORMAL 當本體
    if (code === "NORMAL") put(base, e.id);
  }
  for (const [k, id] of POKEMON_ALIAS) map.set(k, id);
  return map;
}

/* ─────────── Bulbapedia：交叉比對用 ─────────── */

const BULBA_URL =
  "https://bulbapedia.bulbagarden.net/w/api.php?action=parse&page=Background_(GO)" +
  "&prop=wikitext&format=json&formatversion=2";

/**
 * Bulbapedia 只收了八十幾張，涵蓋不到人孔蓋那些，所以不當資料來源，
 * 只拿來對 Dittobase 的清單。
 *
 * 原始碼是 wikitext，每一隻寫成 {{MSP/GO|編號+型態|名稱|旗標}}，
 * 比 HTML 好解析。rowspan 的續列沒有自己的圖，直接跳過。
 */
function parseBulba(json) {
  const w = JSON.parse(json)?.parse?.wikitext || "";
  const out = [];
  for (const chunk of w.split("\n|-")) {
    if (!/\[\[File:[^\]]*background\.png/i.test(chunk)) continue;
    const cells = chunk.split(/\n\|/).map((c) => c.replace(/^\s*rowspan=\d+\s*\|/, "").trim());
    const name = cells.find(
      (c) => c && !c.startsWith("[[File:") && !c.startsWith("{{MSP") && !c.startsWith("!")
    );
    const dex = [...chunk.matchAll(/\{\{MSP\/GO\|(\d{4})([A-Za-z0-9]*)\|/g)].map((m) => ({
      dex: Number(m[1]),
      form: m[2],
    }));
    const year = (chunk.match(/20\d\d/g) || []).slice(-1)[0] || "";
    if (name && dex.length) out.push({ name, dex, year });
  }
  return out;
}

/** 圖鑑編號 → 英文物種名，Serebii 只給編號時要用 */
const SPECIES_EN = new Map();
for (const e of GODEX) if (!SPECIES_EN.has(e.dex)) SPECIES_EN.set(e.dex, e.en);
const speciesEn = (dex) => SPECIES_EN.get(dex) || "";
const dexExists = (dex) => SPECIES_EN.has(dex);

/** 條目 id 的圖鑑編號。d128.fPALDEA_COMBAT → 128 */
const dexOfId = (id) => Number(String(id).slice(1).split(".")[0]);

/**
 * 把一張卡對到 Bulbapedia 的一列。
 * 它寫的是地點或活動名稱（Las Vegas, Nevada, USA），
 * 我們的是卡片名稱（GO Tour Las Vegas），取地點的第一段去比包含關係。
 * 年份兩邊都有的話要一致，拆不開就當作沒對到。
 */
function matchBulba(cardName, file, list) {
  const key = norm(String(cardName).split(",")[0]);
  if (key.length < 4) return null;
  let hit = list.filter((b) => {
    const bk = norm(String(b.name).split(",")[0]);
    return bk.length >= 4 && (bk.includes(key) || key.includes(bk));
  });
  if (hit.length > 1) {
    const y = yearOf(file);
    const same = hit.filter((b) => b.year === y);
    hit = same.length === 1 ? same : hit;
  }
  return hit.length === 1 ? hit[0] : null;
}

/* ─────────── 主流程 ─────────── */

console.log("讀取來源");
const gm = await gameMaster();
const files = await assetList();
const serebii = parseSerebii(await cached("serebii.html", SEREBII_URL, (s) => s));
const db = await dittobase();
const bulba = parseBulba(await cached("bulbapedia.json", BULBA_URL, (x) => x));
console.log(`  game master ${gm.length} 筆樣板`);
console.log(`  圖檔 ${files.length} 張`);
console.log(`  Serebii ${serebii.length} 筆`);
console.log(`  Dittobase ${db.slugs.length} 張`);
console.log(`  Bulbapedia ${bulba.length} 張（只用來交叉比對）`);

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

// Dittobase 同樣的做法。它的代號跟上游檔名幾乎一致，只差斷字與字序
const dbKeyed = db.slugs.map((slug) => ({ slug, key: norm(slug), rows: db.store[slug] || [] }));

// 條目 id 對照表，用來把 Dittobase 的寶可夢代號換成我們的 id
// 人工對照優先，再自動比對，同一筆代號不讓兩張卡搶
const { picked: dbPick, conflicts: dbConflicts, staleManual } = resolveMatches(
  files,
  dbKeyed,
  DB_MANUAL
);
// Serebii 也會被兩張卡搶，同樣退回。它只給日期與名稱，退回就用檔名推的暫名
const { picked: serebiiPick, conflicts: serebiiConflicts, staleManual: staleSerebii } =
  resolveMatches(files, serebiiKeyed, SEREBII_MANUAL);

const ENTRY_KEYS = entryKeyMap();
const unknownPokemon = new Map();

// 手工資料已經認領的圖檔，骨架不重複產生
const handAssets = new Set();
for (const ev of HAND_EVENTS) for (const c of ev.cards) if (c.asset) handAssets.add(c.asset);

const idSeen = new Map();
const cards = [];
const noSerebii = [];
const noDitto = [];

for (const file of files) {
  let id = makeId(file);
  if (idSeen.has(id)) {
    // 撞名：兩邊都改回帶前綴的形式，不能只改後來的那個
    const prev = idSeen.get(id);
    prev.id = `${prev.asset.slice(0, 2)}-${id}`;
    id = `${file.slice(0, 2)}-${id}`;
  }

  const hit = serebiiPick.get(file) || null;
  if (!hit) noSerebii.push(file);

  // Dittobase 的清單，哪一筆已經由 resolveDitto 決定好
  const dbHit = dbPick.get(file) || null;
  const pokemon = [];
  for (const row of dbHit?.rows || []) {
    const id = ENTRY_KEYS.get(row.key);
    if (id) pokemon.push(id);
    else {
      if (!unknownPokemon.has(row.key)) unknownPokemon.set(row.key, []);
      unknownPokemon.get(row.key).push(file);
    }
  }
  if (!dbHit) noDitto.push(file);

  /*
   * Dittobase 完全沒有這張的資料時才退回 Serebii。
   * Serebii 只到物種層級，而且會漏掉進化取得的，所以只當墊底，
   * 不跟 Dittobase 的清單混在一起——混了會冒出型態不明的重複條目。
   */
  let src = pokemon.length ? "ditto" : "";
  if (!pokemon.length && hit?.dex?.length) {
    for (const d of hit.dex) {
      const id = ENTRY_KEYS.get(`${d}-${slugify(speciesEn(d))}`) || (dexExists(d) ? `d${d}` : null);
      if (id && !pokemon.includes(id)) pokemon.push(id);
    }
    if (pokemon.length) src = "serebii";
  }

  // 交叉比對用：三邊各自的物種集合，只比物種不比型態
  const bulbaHit = matchBulba(hit?.en || fallbackName(file), file, bulba);
  const cross = {
    ditto: new Set(pokemon.map(dexOfId)),
    serebii: hit ? new Set(hit.dex) : null,
    bulba: bulbaHit ? new Set(bulbaHit.dex.map((d) => d.dex)) : null,
  };

  const card = {
    id,
    asset: file,
    code: codeByImage.get(file.toLowerCase()) || "",
    series: seriesOf(file),
    scope: file.startsWith("sb_") ? "global" : "regional",
    en: hit?.en || fallbackName(file),
    date: hit?.date || "",
    vfx: vfxImages.has(file.toLowerCase()),
    pokemon,
    src,
    cross,
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
      `code: ${JSON.stringify(c.code)}, vfx: ${c.vfx}, ` +
      `src: ${JSON.stringify(c.src)}, ` +
      `pokemon: [${c.pokemon.map((x) => JSON.stringify(x)).join(", ")}] },`
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
 *   src      清單的來源。ditto 是 Dittobase（有型態），
 *            serebii 是退而求其次的物種層級，空字串是沒有清單
 *   pokemon  可能帶有這張背卡的條目。
 *            暗影併回本體，超級進化與極巨化整批排除
 */

export const BG_CARDS = [
${body}
];

export const BG_CARD_COUNT = ${auto.length};
`
);

/* ─────────── 報告 ─────────── */

const withList = cards.filter((c) => c.pokemon.length);
const slotCount = cards.reduce((n, c) => n + c.pokemon.length, 0);

/*
 * 交叉比對。三邊都只比物種編號，Serebii 沒有型態沒得比。
 * 只列出有出入的，全部一致的列出來只是洗版。
 */
const crossStats = { serebii: 0, serebiiDiff: 0, bulba: 0, bulbaDiff: 0 };
const crossRows = [];
for (const c of cards) {
  const d = c.cross.ditto;
  const cmp = (other) => {
    const missing = [...other].filter((x) => !d.has(x));
    const extra = [...d].filter((x) => !other.has(x));
    return { missing, extra, same: !missing.length && !extra.length };
  };
  const se = c.cross.serebii ? cmp(c.cross.serebii) : null;
  const bu = c.cross.bulba ? cmp(c.cross.bulba) : null;
  if (se) crossStats.serebii++;
  if (bu) crossStats.bulba++;
  if (se && !se.same) crossStats.serebiiDiff++;
  if (bu && !bu.same) crossStats.bulbaDiff++;
  if ((!se || se.same) && (!bu || bu.same)) continue;

  const note = [];
  if (se && !se.same) {
    if (se.missing.length) note.push(`Serebii 多 ${se.missing.join("/")}`);
    if (se.extra.length) note.push(`Serebii 少 ${se.extra.join("/")}`);
  }
  if (bu && !bu.same) {
    if (bu.missing.length) note.push(`Bulbapedia 多 ${bu.missing.join("/")}`);
    if (bu.extra.length) note.push(`Bulbapedia 少 ${bu.extra.join("/")}`);
  }
  crossRows.push(
    `| ${c.asset} | ${d.size} | ${c.cross.serebii ? c.cross.serebii.size : "—"} | ` +
      `${c.cross.bulba ? c.cross.bulba.size : "—"} | ${note.join("；")} |`
  );
}

/*
 * 手工那批跟 Dittobase 的差異。合併時手工優先，所以這裡不動資料，
 * 只列出來讓人自己決定。
 */
const autoByAsset = new Map(cards.map((c) => [c.asset, c]));
const handDiff = [];
for (const ev of HAND_EVENTS) {
  for (const card of ev.cards) {
    const auto = autoByAsset.get(card.asset);
    if (!auto || !auto.pokemon.length) continue;
    const handIds = new Set(
      (card.pokemon || []).map((x) => (typeof x === "string" ? x : x.id))
    );
    const extra = auto.pokemon.filter((id) => !handIds.has(id));
    const missing = [...handIds].filter((id) => !auto.pokemon.includes(id));
    if (!extra.length && !missing.length) continue;
    handDiff.push(
      `- **${card.id}**${extra.length ? ` Dittobase 多：${extra.join(", ")}` : ""}` +
        `${missing.length ? ` ／ 手工多：${missing.join(", ")}` : ""}`
    );
  }
}

const noCode = cards.filter((c) => !c.code);
const noDate = cards.filter((c) => !c.date);
const byCount = new Map();
for (const c of cards) byCount.set(c.series, (byCount.get(c.series) || 0) + 1);
const unnamed = [...byCount.keys()].filter((s) => !seriesInfo(s));
const manualLinked = [...DB_MANUAL].filter(([file, slug]) => slug && dbPick.get(file));

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
  `## 寶可夢清單`,
  "",
  `${withList.length} 張有清單，共 ${slotCount} 個收集格，來自 Dittobase。`,
  `其中 ${manualLinked.length} 張靠人工對照才接得上，見下一節。`,
  `${noDitto.length} 張對不到 Dittobase。這些不一定是空的，Serebii 對得到的會墊底。`,
  "",
  ...noDitto.map((f) => `- ${f}`),
  "",
  `### 人工對照 ${DB_MANUAL.size} 筆`,
  "",
  "兩邊叫同一張卡的叫法不同，字串比對接不上，逐張比對卡面圖確認後指名。",
  "球場對球隊、地點對活動名、上游拼字有誤都算這一類。",
  "",
  ...[...DB_MANUAL].map(([file, slug]) => `- ${file} → ${slug || "（確認沒有對應）"}`),
  "",
  `### Serebii 人工對照 ${SEREBII_MANUAL.size} 筆`,
  "",
  "只影響日期與英文名，不影響寶可夢清單。",
  "",
  ...[...SEREBII_MANUAL].map(([file, slug]) => `- ${file} → ${slug}`),
  "",
  ...(staleSerebii.length
    ? [`Serebii 這邊失效 ${staleSerebii.length} 筆：`, "", ...staleSerebii.map((x) => `- ${x}`), ""]
    : []),
  ...(dbConflicts.length
    ? [
        `### 代號衝突 ${dbConflicts.length} 筆`,
        "",
        "兩張卡對到同一筆，兩張都退回沒有清單，要人工指名哪一張才對。",
        "",
        ...dbConflicts.map((x) => `- ${x}`),
        "",
      ]
    : []),
  ...(serebiiConflicts.length
    ? [
        `### Serebii 代號衝突 ${serebiiConflicts.length} 筆`,
        "",
        "兩張卡對到 Serebii 同一筆，兩張都退回用檔名推的暫名。",
        "Serebii 只給日期與英文名，這裡缺的是那兩樣，不是寶可夢清單。",
        "",
        ...serebiiConflicts.map((x) => `- ${x}`),
        "",
      ]
    : []),
  ...(staleManual.length
    ? [
        `### 人工對照失效 ${staleManual.length} 筆`,
        "",
        "Dittobase 那邊的代號改了或整筆不見了，要重新比對卡面圖確認。",
        "",
        ...staleManual.map((x) => `- ${x}`),
        "",
      ]
    : []),
  `### 對不回條目 id 的寶可夢 ${unknownPokemon.size} 種`,
  "",
  "多半是超級進化、極巨化，或是圖鑑還沒收的裝扮。",
  "",
  ...[...unknownPokemon.entries()].map(
    ([k, files]) => `- ${k}（${files.length} 張，例如 ${files[0]}）`
  ),
  "",
  "## 手工那批與 Dittobase 的差異",
  "",
  "手工資料優先，這裡只是列出來讓人決定要不要跟進。",
  "Dittobase 會收進化取得的，手工那批多半沒收。",
  "",
  ...handDiff,
  "",
  "## 交叉比對",
  "",
  "只比物種不比型態，因為 Serebii 沒有型態。",
  "三邊都對得上的不列，以下是有出入的。",
  "",
  `| 背卡 | Dittobase | Serebii | Bulbapedia | 差異 |`,
  `| --- | --- | --- | --- | --- |`,
  ...crossRows,
  "",
  `對過 Serebii 的 ${crossStats.serebii} 張，其中 ${crossStats.serebiiDiff} 張有出入。`,
  `對過 Bulbapedia 的 ${crossStats.bulba} 張，其中 ${crossStats.bulbaDiff} 張有出入。`,
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
console.log(`  有寶可夢清單    ${withList.length} 張，共 ${slotCount} 個收集格`);
console.log(`  交叉比對        Serebii ${crossStats.serebii} 張比對 ${crossStats.serebiiDiff} 張有出入`);
console.log(`                  Bulbapedia ${crossStats.bulba} 張比對 ${crossStats.bulbaDiff} 張有出入`);
const vfxCount = cards.filter((c) => c.vfx).length;
if (vfxCount) console.log(`  ! 上游只有底層 ${vfxCount} 張（有特效層）`);
if (noCode.length) console.log(`  ! 缺正式代號 ${noCode.length} 張`);
if (noSerebii.length) console.log(`  ! Serebii 對不到 ${noSerebii.length} 張`);
if (noDitto.length) console.log(`  ! Dittobase 對不到 ${noDitto.length} 張，這些沒有清單`);
if (unknownPokemon.size) console.log(`  ! 有 ${unknownPokemon.size} 種寶可夢對不回條目 id`);
if (unnamed.length) console.log(`  ! 系列缺名稱 ${unnamed.join(", ")}，補進 js/bgseries.js`);
console.log("  詳情見 tools/bg-report.md");
