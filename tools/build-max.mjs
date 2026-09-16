/**
 * build-max.mjs — 產生「哪些條目可以極巨化」的名單
 *
 * 輸出 `js/maxdata.js`，網站執行時不會抓任何東西。
 *
 * ── 為什麼要這一份 ──
 * 極巨化在 GO 裡不是外觀，是個體身上的一個能力，所以它在這個站是
 * 第五個勾選條件（異色／XXL／XXS／背卡之外），不是新的圖鑑條目。
 * 勾選框只該出現在真的能極巨化的條目上，而「哪些能」沒有任何一個
 * 來源講得完整，只能自己合出來再交叉比對。
 *
 * 唯一的例外是超極巨化：那 13 隻有自己的圖，外觀真的不一樣，
 * 所以它們是條目（`d6.fGIGANTAMAX`），由 build-dex.mjs 產生，不在這裡。
 * 它們本身已經是極巨化了，不會出現在這份名單裡，見下面的 SKIP_GMAX。
 *
 * ── 來源與分工 ──
 * 1. Dittobase /pokemon-go/pokedex   主來源。每筆條目帶 isDynamax
 *                                    與 isGigantamax 兩個旗標
 * 2. PokeMiners game_master          交叉比對。Max Battle 在遊戲資料裡
 *                                    的代號是 BREAD（極巨化）與
 *                                    SOURDOUGH／BREAD_DOUGH_MODE（超極巨化）
 *
 * ── 為什麼主來源不是 game master ──
 * 一手資料照理說比較可信，但它給不出完整名單：
 *   BREAD_POKEMON_SCALING_SETTINGS 只有 58 個 BREAD_MODE 的物種，
 *   那是「視覺縮放要特別調」的清單，不是「可以極巨化」的清單。
 *   pokemonSettings 的 breadTierGroup 更不能用，2467 筆幾乎全都有，
 *   那是預先排好的強度分級表，跟實裝與否無關。
 * 超極巨化那一半倒是齊的（allowedSourdoughPokemon），所以拿來對。
 *
 * ── 但它是名單的第二個來源（2026-09-16 改的）──
 * 第一版只拿 BREAD_MODE 當佐證，報告列出「只有 game master 有的」三隻：
 * 幾何雪花、投擲猴、毒電嬰，當時判定是還沒實裝所以不收。
 * 後來發現前兩隻出現在 GO Fest 2025 那張 Max Battle 背卡的清單裡，
 * 使用者也確認三隻都真的能極巨化，所以改成**兩邊取聯集**。
 * 這份清單不完整（只有需要特調縮放的才在），但裡面的是真的。
 *
 * ── 粒度 ──
 * Dittobase 的極巨化條目是物種層級（bulbasaur-dynamax），
 * 142 筆裡只有 5 筆帶型態（達摩狒狒、顫弦蠑螈兩型、武道熊師兩型），
 * **一個裝扮都沒有**。所以對照表用「編號-英文名」查，
 * 自然只會對到本體與指名的型態，裝扮不會拿到勾選框——這跟遊戲一致，
 * Max Battle 抓到的不會是裝扮版。
 *
 * ── 執行 ──
 *   node tools/build-max.mjs          用快取，沒快取才下載
 *   node tools/build-max.mjs --force  忽略快取重新下載
 *
 * 快取在 tools/.cache/max/（不進 git）。
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
    headers: { "User-Agent": "Mozilla/5.0 (poke-change/build-max)" },
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

/** 跟 build-bg.mjs 同一套：重音去掉，非英數換連字號 */
const slugify = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * 「編號-英文名[-型態]」→ 條目 id。
 *
 * 只收本體與型態變化，**裝扮一律不收**：Dittobase 的極巨化條目沒有裝扮，
 * 而遊戲裡 Max Battle 抓到的也不會是裝扮版。收了反而會讓
 * 「2020 新年妙蛙種子」長出一個它不該有的勾選框。
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

/**
 * 「英文名[-型態]」→ 條目 id。
 *
 * game master 只給 pokemonId（英文名大寫），沒有圖鑑編號，
 * 所以不能共用上面那張帶編號的表。同名不同編號的情況不存在，
 * 拿英文名當鍵是安全的。裝扮一樣不收。
 */
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
 *
 * 顫弦蠑螈沒有本體條目，圖鑑裡只有高調與低調兩個型態，
 * 而 Dittobase 的超極巨化那一筆是掛在物種上的（849-toxtricity）。
 * 指到高調——遊戲裡的超極巨化顫弦蠑螈就是高調形態。
 * 兩個型態本來就各自從極巨化那一欄進了名單，所以這筆指名不改變結果，
 * 只是不讓它掉進報告的「對不上」裡變成一個沒人會去查的雜訊。
 */
const FORM_ALIAS = new Map([["849-toxtricity", "d849.fAMPED"]]);

/* ─────────── Dittobase ─────────── */

/**
 * 頁面是 Next.js 的 streaming payload，寶可夢陣列以轉義 JSON 嵌在
 * <script> 裡。解 DOM 沒有意義，直接把轉義還原再抓欄位順序固定的那一段。
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
      dyn: m[9] === "true",
      gmax: m[10] === "true",
    });
  }
  if (!rows.length) throw new Error("Dittobase 一筆都沒解析到，欄位順序可能改了");
  return rows;
}

/* ─────────── game master：交叉比對用 ─────────── */

/**
 * 遊戲資料裡 Max Battle 叫 bread，超極巨化叫 sourdough（酸麵團）。
 * 兩個都抽出來：前者只當佐證（不完整，見檔頭），後者拿來對超極巨化。
 */
function breadFromGM(gm) {
  const arr = Array.isArray(gm) ? gm : gm.itemTemplates || [];
  const pick = (id) => arr.find((x) => x.templateId === id)?.data;

  const scaling =
    pick("BREAD_POKEMON_SCALING_SETTINGS")?.breadPokemonScalingSettings
      ?.visualSettings || [];
  const bread = new Set();
  const breadForms = [];
  for (const p of scaling) {
    for (const f of p.pokemonFormData || []) {
      for (const v of f.visualData || []) {
        if (v.breadMode !== "BREAD_MODE") continue;
        bread.add(p.pokemonId.toLowerCase());
        /*
         * 型態代碼帶物種前綴（BULBASAUR_NORMAL），去掉之後 NORMAL
         * 與 FORM_UNSET 都當本體，其餘才是真的型態。
         * 這跟 build-dex 解 game master 的型態是同一套。
         */
        const raw = String(f.pokemonForm || "").replace(`${p.pokemonId}_`, "");
        const form = !raw || raw === "NORMAL" || raw === "FORM_UNSET" ? "" : raw;
        breadForms.push({ species: p.pokemonId.toLowerCase(), form });
      }
    }
  }

  const sour = pick("BREAD_SHARED_SETTINGS")?.breadSettings?.allowedSourdoughPokemon || [];
  const gmax = new Set(sour.map((x) => x.pokemonId.toLowerCase()));

  /*
   * 超極巨化的型態。form 是陣列，顫弦蠑螈高調與低調各一筆，
   * 沒有型態的寫 FORM_UNSET。跟上面 BREAD_MODE 同一套處理。
   */
  const sourForms = [];
  for (const x of sour) {
    const species = x.pokemonId.toLowerCase();
    const forms = x.form && x.form.length ? x.form : [""];
    for (const f of forms) {
      const raw = String(f || "").replace(`${x.pokemonId}_`, "");
      sourForms.push({
        species,
        form: !raw || raw === "NORMAL" || raw === "FORM_UNSET" ? "" : raw,
      });
    }
  }

  return { bread, breadForms, gmax, sourForms };
}

/* ─────────── 合成 ─────────── */

console.log("build-max");
const dittoRows = parseDitto(await cached("dittobase-dex.html", DB_DEX, (x) => x));
const gm = breadFromGM(await gameMaster());
const keys = entryKeyMap();

/**
 * 那 13 隻超極巨化本身是獨立條目（build-dex.mjs 產生），
 * 它已經是極巨化了，再給一個「極巨化」勾選框是重複的。
 * 這裡靠 id 的型態代碼擋掉，不必另外維護名單。
 */
const SKIP_GMAX = (id) => /\.fGIGANTAMAX$/.test(id);

const unmatched = [];
const ids = new Set();
const hitRows = [];

for (const r of dittoRows) {
  if (!r.dyn && !r.gmax) continue;
  if (!r.released) continue; // 上游有資料不等於 GO 實裝了，這個站一貫只收實裝的
  // 去掉旗標後綴，剩下的就是「英文名[-型態]」
  const rest = r.slug.replace(/-(dynamax|gigantamax)/, "");
  const key = `${r.dex}-${rest}`;
  const id = FORM_ALIAS.get(key) || keys.get(key);
  if (!id) {
    unmatched.push(key);
    continue;
  }
  if (SKIP_GMAX(id)) continue;
  ids.add(id);
  hitRows.push({ ...r, key, id });
}

/*
 * game master 的 BREAD_MODE 併進來。Dittobase 漏了幾隻
 * （2026-09-16 確認的幾何雪花、投擲猴、毒電嬰），這份補得回來。
 * 它只有「需要特調縮放」的那些，不完整，但裡面的是真的。
 */
const names = nameKeyMap();
const gmUnmatched = [];
const fromGM = [];
for (const { species, form } of gm.breadForms) {
  const key = species + (form ? "-" + slugify(form) : "");
  const id = names.get(key);
  if (!id) {
    gmUnmatched.push(key);
    continue;
  }
  if (SKIP_GMAX(id)) continue;
  if (!ids.has(id)) fromGM.push(id);
  ids.add(id);
}

// 兩個來源都併完了才排序，順序照圖鑑編號
const byDex = (a, b) => {
  const na = Number(a.slice(1).split(".")[0]);
  const nb = Number(b.slice(1).split(".")[0]);
  return na - nb || a.localeCompare(b);
};
const idList = [...ids].sort((a, b) => {
  const na = Number(a.slice(1).split(".")[0]);
  const nb = Number(b.slice(1).split(".")[0]);
  return na - nb || a.localeCompare(b);
});

/*
 * 超極巨化的名單。
 *
 * 2026-09-16 下午起它跟極巨化一樣是勾選條件，不是條目了，
 * 所以這裡也要產一份「哪些條目勾得到超極巨化」。
 *
 * 物種以 Dittobase 標已實裝的為準（17 個），型態則看 game master 的
 * allowedSourdoughPokemon——它給的是 pokemonId 加 form，顫弦蠑螈
 * 高調與低調都列了，光靠 Dittobase 那一筆掛在物種上的會漏掉低調。
 * game master 那份有 31 個物種，多出來的是還沒實裝的，用 Dittobase 篩掉。
 *
 * **不受「上游有沒有圖」限制**：當條目的時候沒圖就畫不出來，
 * 現在只是一個旗標，皮卡丘、喵喵、灰塵山與積怨番長那四隻照樣勾得到，
 * 只是勾了不會換圖（`gmaxIcon` 沒有就維持本體的圖）。
 */
const gmaxSpecies = new Set(
  dittoRows.filter((r) => r.gmax && r.released).map((r) => r.species)
);
const gmaxIds = new Set();
const gmaxUnmatched = [];
for (const { species, form } of gm.sourForms) {
  if (!gmaxSpecies.has(species)) continue;
  const key = species + (form ? "-" + slugify(form) : "");
  const id = names.get(key);
  if (!id) {
    gmaxUnmatched.push(key);
    continue;
  }
  gmaxIds.add(id);
}

const gmaxList = [...gmaxIds].sort(byDex);

/* ─────────── 交叉比對 ─────────── */

const dittoSpecies = new Set(hitRows.map((r) => r.species));
const onlyGM = [...gm.bread].filter((s) => !dittoSpecies.has(s));
const dittoGmax = new Set(
  dittoRows.filter((r) => r.gmax && r.released).map((r) => r.species)
);
const gmaxOnlyDitto = [...dittoGmax].filter((s) => !gm.gmax.has(s));
const gmaxOnlyGM = [...gm.gmax].filter((s) => !dittoGmax.has(s));

/* ─────────── 輸出 ─────────── */

const today = new Date();
const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
  today.getDate()
).padStart(2, "0")}`;

await writeFile(
  join(ROOT, "js", "maxdata.js"),
  `/**
 * maxdata.js — 可極巨化的條目名單（自動產生，不要手改）
 *
 * 由 tools/build-max.mjs 產生，下次重跑會整份蓋掉。
 * 主來源 Dittobase，交叉比對 game master 的 BREAD 設定，
 * 比對結果在 tools/max-report.md。
 *
 * 這一份決定「哪些條目的詳情面板會出現極巨化勾選框」。
 * **它不影響已經存在的紀錄**：使用者勾過的 max 會留著，
 * 名單縮水也不會把它洗掉，跟 id 一旦發布就不能改是同一個道理。
 *
 * 只有本體與型態變化，沒有裝扮——Max Battle 抓到的不會是裝扮版。
 * 那 13 隻超極巨化不在這裡，它們本身就是條目，已經是極巨化了。
 *
 * 產生時間：${stamp}
 * 筆數：${idList.length}
 */

export const MAX_IDS = [
${idList.map((id) => `  "${id}",`).join("\n")}
];

export const MAX_COUNT = MAX_IDS.length;

/**
 * 勾得到「超極巨化」的條目。MAX_IDS 的子集。
 *
 * 物種以 Dittobase 標已實裝的為準，型態看 game master 的
 * allowedSourdoughPokemon（顫弦蠑螈高調與低調都算）。
 *
 * **不受上游有沒有圖限制**：這只是一個旗標，皮卡丘、喵喵、灰塵山與
 * 積怨番長上游還沒有圖，照樣勾得到，只是勾了不換圖——
 * 換圖看的是條目自己的 gmaxIcon。
 */
export const GMAX_IDS = [
${gmaxList.map((id) => `  "${id}",`).join("\n")}
];

export const GMAX_COUNT = GMAX_IDS.length;
`
);

const report = [
  "# max-report.md — 可極巨化名單的比對報告",
  "",
  `> 由 \`tools/build-max.mjs\` 產生，${stamp}。`,
  "> 這一份是給人看的，程式只讀 `js/maxdata.js`。",
  "",
  "## 結果",
  "",
  `- Dittobase 解析到條目 **${dittoRows.length}** 筆`,
  `- 其中標了極巨化或超極巨化且已實裝 **${
    dittoRows.filter((r) => (r.dyn || r.gmax) && r.released).length
  }** 筆`,
  `- 對到本站條目 **${idList.length}** 個 id`,
  `- 其中勾得到超極巨化的 **${gmaxList.length}** 個：\`${gmaxList.join("`, `")}\``,
  `- 對不上的 **${unmatched.length}** 筆${
    unmatched.length ? "（下面列出，補進 `FORM_ALIAS` 就好）" : ""
  }`,
  "",
  unmatched.length ? "```\n" + unmatched.join("\n") + "\n```\n" : "",
  "## 交叉比對：game master",
  "",
  "遊戲資料裡 Max Battle 叫 `BREAD`，超極巨化叫 `sourdough`。",
  "",
  "### 極巨化",
  "",
  `game master 的 \`BREAD_POKEMON_SCALING_SETTINGS\` 有 **${gm.bread.size}** 個物種，`,
  "但那是「視覺縮放要特別調」的清單，不是可極巨化的清單，所以只當佐證。",
  "",
  onlyGM.length
    ? `**只有 game master 有、Dittobase 沒有的 ${onlyGM.length} 個**：\`${onlyGM.join(
        "`, `"
      )}\`\n\n這幾筆**照樣收進名單**（2026-09-16 改的）。第一版把它們當成還沒實裝而排除，\n後來發現其中兩隻出現在 GO Fest 2025 那張 Max Battle 背卡的清單裡，\n使用者也確認確實能極巨化。下次多出新的要回頭確認一次，\n這份清單只有「需要特調縮放」的才在，不完整但裡面的是真的。\n`
    : "兩邊一致。\n",
  fromGM.length
    ? `只靠 game master 才進名單的 **${fromGM.length}** 個條目：\`${fromGM.join("`, `")}\`\n`
    : "",
  gmUnmatched.length
    ? `game master 有 BREAD_MODE 但對不到條目的 ${gmUnmatched.length} 個：\`${gmUnmatched.join(
        "`, `"
      )}\`\n`
    : "",
  "### 超極巨化",
  "",
  `game master \`allowedSourdoughPokemon\` **${gm.gmax.size}** 個物種，`,
  `Dittobase 標已實裝的 **${dittoGmax.size}** 個。`,
  "",
  gmaxOnlyDitto.length
    ? `只有 Dittobase 有：\`${gmaxOnlyDitto.join("`, `")}\`\n`
    : "",
  gmaxOnlyGM.length ? `只有 game master 有：\`${gmaxOnlyGM.join("`, `")}\`\n` : "",
  "",
  "## 名單",
  "",
  "```",
  idList.join("\n"),
  "```",
  "",
].join("\n");

await writeFile(join(ROOT, "tools", "max-report.md"), report);

console.log("\n產生完成 js/maxdata.js");
console.log(`  Dittobase 條目        ${dittoRows.length}`);
console.log(`  可極巨化（已實裝）    ${dittoRows.filter((r) => (r.dyn || r.gmax) && r.released).length}`);
console.log(`  對到條目 id           ${idList.length}`);
console.log(`  其中勾得到超極巨化    ${gmaxList.length}`);
console.log(`  對不上                ${unmatched.length}`);
console.log(`  game master 補進來的  ${fromGM.length}${fromGM.length ? "（" + fromGM.join("、") + "）" : ""}`);
console.log(`  交叉比對 game master  極巨化 ${gm.bread.size} 個物種，只有它有的 ${onlyGM.length}`);
console.log(`                        超極巨化 ${gm.gmax.size} 對 ${dittoGmax.size}`);
console.log("\n報告 tools/max-report.md");
