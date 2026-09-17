/**
 * build-shadow.mjs — 產生「哪些條目可以淨化」的名單
 *
 * 輸出 `js/shadowdata.js`，網站執行時不會抓任何東西。
 *
 * ── 為什麼要這一份 ──
 * 淨化在 GO 裡是個體身上的一個狀態，不是外觀，所以它在這個站跟
 * 異色／XXL／XXS／背卡／極巨化一樣是勾選條件，不是新的圖鑑條目。
 * 勾選框只該出現在真的能淨化的條目上。
 *
 * **只做淨化不做暗影**：暗影寶可夢在 GO 裡根本不能交換，
 * 淨化之後才能。所以對一份交換清單來說，「暗影」這個選項沒有意義。
 * 名單本身是「有沒有暗影版」——能變成暗影的，淨化之後就是淨化版。
 *
 * ── 來源與分工 ──
 * 1. Dittobase /pokemon-go/pokedex   主來源。暗影是獨立條目，
 *                                    slug 一律是「英文名[-型態]-shadow」，
 *                                    帶 isShadow 與 isReleased 兩個旗標
 * 2. PokeMiners game_master          交叉比對。pokemonSettings.shadow
 *                                    帶淨化要的星塵與糖果數
 *
 * ── 為什麼 game master 只當佐證 ──
 * 它的 `pokemonSettings.shadow` 有 1015 筆，**明顯過度包含**：
 * 連「2019 秋季妙蛙種子」這種裝扮都有一整組淨化費用，
 * 而遊戲裡從來沒有出現過暗影裝扮。那是預先塞好的設定，
 * 跟 breadTierGroup 一樣，有設定不等於實裝。
 * 所以名單以 Dittobase 為準，**不取聯集**——這跟 build-max 的
 * BREAD_MODE 不同，那一份不完整但裡面的是真的，這一份反過來。
 * 差異一律寫進報告，下次多出新的回頭確認一次。
 *
 * ── 粒度 ──
 * Dittobase 的暗影條目 519 筆，**裝扮 0 筆、超級進化 0 筆**，
 * 57 筆帶型態（阿羅拉喵喵、伽勒爾三神鳥、洗翠鬃岩狼人那些）。
 * 對照表用「編號-英文名」查，自然只會對到本體與型態，
 * 裝扮拿不到勾選框——這跟遊戲一致，火箭隊給的不會是裝扮版。
 *
 * ── 執行 ──
 *   node tools/build-shadow.mjs          用快取，沒快取才下載
 *   node tools/build-shadow.mjs --force  忽略快取重新下載
 *
 * 快取跟 build-max.mjs 共用 tools/.cache/max/（同一個頁面同一份檔），
 * game master 共用 tools/.cache/（三個腳本同一份）。都不進 git。
 */

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { GODEX } from "../js/godex.js";
import { extraEntries } from "../js/extra.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "tools", ".cache");
const MAXCACHE = join(CACHE, "max");
const FORCE = process.argv.includes("--force");

const DB_DEX = "https://www.dittobase.com/pokemon-go/pokedex";
const GM_URL =
  "https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/latest.json";

/* ─────────── 快取 ─────────── */

async function cached(name, url, parse = JSON.parse) {
  const path = join(MAXCACHE, name);
  if (!FORCE) {
    try {
      await stat(path);
      return parse(await readFile(path, "utf8"));
    } catch {
      /* 沒快取就往下走 */
    }
  }
  process.stdout.write(`  下載 ${name} … `);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (poke-change/build-shadow)" },
  });
  if (!res.ok) throw new Error(`${name} HTTP ${res.status}`);
  const text = await res.text();
  await mkdir(MAXCACHE, { recursive: true });
  await writeFile(path, text);
  console.log(`${(text.length / 1048576).toFixed(1)} MB`);
  return parse(text);
}

/** game master 用 build-dex 那份快取，三個腳本共用不重抓 */
async function gameMaster() {
  const shared = join(CACHE, "game_master.json");
  if (!FORCE) {
    try {
      await stat(shared);
      return JSON.parse(await readFile(shared, "utf8"));
    } catch {
      /* 沒有就自己抓一份到共用位置 */
    }
  }
  process.stdout.write("  下載 game_master.json … ");
  const res = await fetch(GM_URL);
  if (!res.ok) throw new Error(`game_master HTTP ${res.status}`);
  const text = await res.text();
  await mkdir(CACHE, { recursive: true });
  await writeFile(shared, text);
  console.log(`${(text.length / 1048576).toFixed(1)} MB`);
  return JSON.parse(text);
}

/* ─────────── 條目 id 對照 ─────────── */

/** 跟 build-bg.mjs、build-max.mjs 同一套：重音去掉，非英數換連字號 */
const slugify = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * 「編號-英文名[-型態]」→ 條目 id。跟 build-max.mjs 同一份，
 * 裝扮一樣不收（Dittobase 的暗影條目沒有裝扮，遊戲裡也沒有）。
 */
function entryKeyMap() {
  const map = new Map();
  const put = (k, id) => {
    if (!map.has(k)) map.set(k, id);
  };
  for (const e of [...GODEX, ...extraEntries()]) {
    if (e.kind === "costume") continue;
    const code = e.form || "";
    const base = `${e.dex}-${slugify(e.en)}`;
    put(base + (code ? "-" + slugify(code) : ""), e.id);
    // 只有型態沒有本體的（酋雷姆、代歐奇希斯），NORMAL 當本體
    if (code === "NORMAL") put(base, e.id);
  }
  return map;
}

/** 「英文名[-型態]」→ 條目 id。game master 只給 pokemonId，沒有編號 */
function nameKeyMap() {
  const map = new Map();
  const put = (k, id) => {
    if (!map.has(k)) map.set(k, id);
  };
  for (const e of [...GODEX, ...extraEntries()]) {
    if (e.kind === "costume") continue;
    const code = e.form || "";
    const base = slugify(e.en);
    put(base + (code ? "-" + slugify(code) : ""), e.id);
    if (code === "NORMAL") put(base, e.id);
  }
  return map;
}

/**
 * Dittobase 與我們對同一個型態的叫法不同時，在這裡一筆一筆指名。
 * 對不上的會列進報告，補進來就好。
 */
const FORM_ALIAS = new Map([
  /*
   * 尼多蘭兩筆：牠們的英文名帶性別符號（Nidoran♀），slugify 會把符號
   * 整個去掉變成 `nidoran`，而 Dittobase 寫成 `nidoran-f` / `nidoran-m`。
   * 兩邊都沒錯，只是符號的處理方式不同，指名比改 slugify 安全——
   * 改 slugify 會牽動 build-bg 與 build-max 那兩份同源的複本。
   */
  ["29-nidoran-f", "d29"],
  ["32-nidoran-m", "d32"],
]);

/* ─────────── Dittobase ─────────── */

/**
 * 跟 build-max.mjs 同一段解析（同一個頁面、同一份快取）。
 * 頁面是 Next.js 的 streaming payload，寶可夢陣列以轉義 JSON
 * 嵌在 <script> 裡，解 DOM 沒有意義。
 *
 * 欄位順序是上游決定的，改了這裡就抓不到——所以抓到 0 筆要當錯誤處理，
 * 不能安靜地產出一份空名單。
 */
function parseDitto(html) {
  const h = html.replace(/\\"/g, '"');
  const re =
    /\{"slug":"([a-z0-9-]+)","order":(\d+),"speciesSlug":"([a-z0-9-]+)","isReleased":(true|false),"isShinyReleased":(true|false),"isCostume":(true|false),"isMega":(true|false),"isShadow":(true|false),"isDynamax":(true|false),"isGigantamax":(true|false)/g;
  const rows = [];
  let m;
  while ((m = re.exec(h))) {
    rows.push({
      slug: m[1],
      dex: Number(m[2]),
      species: m[3],
      released: m[4] === "true",
      costume: m[6] === "true",
      mega: m[7] === "true",
      shadow: m[8] === "true",
    });
  }
  if (!rows.length) throw new Error("Dittobase 一筆都沒解析到，欄位順序可能改了");
  return rows;
}

/* ─────────── game master：交叉比對用 ─────────── */

/**
 * 帶 `shadow` 設定的型態。form 帶物種前綴（BULBASAUR_FALL_2019），
 * 去掉之後 NORMAL 與 FORM_UNSET 當本體，其餘才是真的型態。
 * 跟 build-dex、build-max 解型態是同一套。
 */
function shadowFromGM(gm) {
  const arr = Array.isArray(gm) ? gm : gm.itemTemplates || [];
  const species = new Set();
  const forms = [];
  for (const t of arr) {
    const p = (t.data || t).pokemonSettings;
    if (!p || !p.shadow) continue;
    const id = String(p.pokemonId || "");
    if (!id) continue;
    species.add(id.toLowerCase());
    const raw = String(p.form || "").replace(`${id}_`, "");
    forms.push({
      species: id.toLowerCase(),
      form: !raw || raw === "NORMAL" || raw === "FORM_UNSET" ? "" : raw,
    });
  }
  return { species, forms };
}

/* ─────────── 合成 ─────────── */

console.log("build-shadow");
const dittoRows = parseDitto(await cached("dittobase-dex.html", DB_DEX, (x) => x));
const gm = shadowFromGM(await gameMaster());
const keys = entryKeyMap();

const unmatched = [];
const ids = new Set();
const hitRows = [];

for (const r of dittoRows) {
  if (!r.shadow) continue;
  if (!r.released) continue; // 上游有資料不等於 GO 實裝了，這個站一貫只收實裝的
  // 去掉旗標後綴，剩下的就是「英文名[-型態]」
  const rest = r.slug.replace(/-shadow$/, "");
  const key = `${r.dex}-${rest}`;
  const id = FORM_ALIAS.get(key) || keys.get(key);
  if (!id) {
    unmatched.push(key);
    continue;
  }
  ids.add(id);
  hitRows.push({ ...r, key, id });
}

const byDex = (a, b) => {
  const na = Number(a.slice(1).split(".")[0]);
  const nb = Number(b.slice(1).split(".")[0]);
  return na - nb || a.localeCompare(b);
};
const idList = [...ids].sort(byDex);

/* ─────────── 交叉比對 ─────────── */

const names = nameKeyMap();

/*
 * 兩邊的物種代號寫法不同：game master 用底線（`ho_oh`、`nidoran_female`、
 * `mr_mime`），Dittobase 用連字號（`ho-oh`、`nidoran-f`、`mr-mime`）。
 * 不先正規化的話報告會列出一整排**假差異**，下次的人得白查一輪
 * 才發現兩邊講的是同一隻。所以一律 slugify 再比，剩下的才是真的。
 */
const sp = (s) => slugify(s).replace(/-female$/, "-f").replace(/-male$/, "-m");
const dittoSpecies = new Set(hitRows.map((r) => sp(r.species)));
const gmSpecies = new Set([...gm.species].map(sp));
const onlyGM = [...gmSpecies].filter((s) => !dittoSpecies.has(s));
const onlyDitto = [...dittoSpecies].filter((s) => !gmSpecies.has(s));

/**
 * game master 有 shadow 設定、對得到條目、但不在名單裡的。
 * **只寫進報告，不收**——那多半是預先塞好的設定（裝扮尤其明顯）。
 */
const gmExtra = [];
for (const { species, form } of gm.forms) {
  const key = species + (form ? "-" + slugify(form) : "");
  const id = names.get(key);
  if (id && !ids.has(id)) gmExtra.push(id);
}
const gmExtraUniq = [...new Set(gmExtra)].sort(byDex);

/* ─────────── 輸出 ─────────── */

const today = new Date();
const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
  today.getDate()
).padStart(2, "0")}`;

await writeFile(
  join(ROOT, "js", "shadowdata.js"),
  `/**
 * shadowdata.js — 可淨化的條目名單（自動產生，不要手改）
 *
 * 由 tools/build-shadow.mjs 產生，下次重跑會整份蓋掉。
 * 主來源 Dittobase，交叉比對 game master 的 shadow 設定，
 * 比對結果在 tools/shadow-report.md。
 *
 * 這一份決定「哪些條目的詳情面板會出現淨化勾選框」。
 * **它不影響已經存在的紀錄**：使用者勾過的 purified 會留著，
 * 名單縮水也不會把它洗掉，跟極巨化那一份同一個道理。
 *
 * 只有本體與型態變化，沒有裝扮——火箭隊給的不會是裝扮版。
 *
 * 產生時間：${stamp}
 * 筆數：${idList.length}
 */

export const SHADOW_IDS = [
${idList.map((id) => `  "${id}",`).join("\n")}
];

export const SHADOW_COUNT = SHADOW_IDS.length;
`
);

const report = [
  "# shadow-report.md — 可淨化名單的比對報告",
  "",
  `> 由 \`tools/build-shadow.mjs\` 產生，${stamp}。`,
  "> 這一份是給人看的，程式只讀 `js/shadowdata.js`。",
  "",
  "## 結果",
  "",
  `- Dittobase 解析到條目 **${dittoRows.length}** 筆`,
  `- 其中標了暗影的 **${dittoRows.filter((r) => r.shadow).length}** 筆，已實裝的 **${
    dittoRows.filter((r) => r.shadow && r.released).length
  }** 筆`,
  `- 對到本站條目 **${idList.length}** 個 id`,
  `- 對不上的 **${unmatched.length}** 筆${
    unmatched.length ? "（下面列出，補進 `FORM_ALIAS` 就好）" : ""
  }`,
  "",
  unmatched.length ? "```\n" + unmatched.join("\n") + "\n```\n" : "",
  "## 交叉比對：game master",
  "",
  `\`pokemonSettings.shadow\` 有 **${gm.forms.length}** 筆設定、**${gmSpecies.size}** 個物種。`,
  "",
  "**這一份只當佐證，不併進名單。** 它明顯過度包含：連 2019 秋季妙蛙種子",
  "這種裝扮都有一整組淨化費用，而遊戲裡從來沒有出現過暗影裝扮。",
  "跟 `breadTierGroup` 一樣是預先塞好的設定，有設定不等於實裝。",
  "",
  onlyGM.length
    ? `只有 game master 有、Dittobase 沒標的 **${onlyGM.length}** 個物種：\`${onlyGM
        .slice(0, 60)
        .join("`, `")}\`${onlyGM.length > 60 ? " …" : ""}\n`
    : "兩邊物種一致。\n",
  onlyDitto.length
    ? `只有 Dittobase 標了、game master 沒有 shadow 設定的 **${onlyDitto.length}** 個物種：\`${onlyDitto.join(
        "`, `"
      )}\`\n\n這幾筆**照樣收**：Dittobase 是主來源，而 game master 那份連裝扮都塞，\n少掉幾筆比多出一堆更可能是它自己的問題。下次變多要回頭確認一次。\n`
    : "",
  gmExtraUniq.length
    ? `game master 有設定、對得到條目、但不在名單裡的 **${gmExtraUniq.length}** 個：\n\n\`${gmExtraUniq
        .slice(0, 80)
        .join("`, `")}\`${gmExtraUniq.length > 80 ? " …" : ""}\n`
    : "",
  "",
  "## 名單",
  "",
  "```",
  idList.join("\n"),
  "```",
  "",
].join("\n");

await writeFile(join(ROOT, "tools", "shadow-report.md"), report);

console.log("\n產生完成 js/shadowdata.js");
console.log(`  Dittobase 條目        ${dittoRows.length}`);
console.log(`  標了暗影              ${dittoRows.filter((r) => r.shadow).length}`);
console.log(`  已實裝                ${dittoRows.filter((r) => r.shadow && r.released).length}`);
console.log(`  對到條目 id           ${idList.length}`);
console.log(`  對不上                ${unmatched.length}${unmatched.length ? "（" + unmatched.join("、") + "）" : ""}`);
console.log(`  交叉比對 game master  ${gmSpecies.size} 個物種，只有它有的 ${onlyGM.length}，只有 Dittobase 有的 ${onlyDitto.length}`);
console.log("\n報告 tools/shadow-report.md");
