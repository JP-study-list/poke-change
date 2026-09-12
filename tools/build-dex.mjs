/**
 * build-dex.mjs — 產生 GO 圖鑑資料檔
 *
 * 離線解析三個上游來源，輸出 `js/godex.js`。網站本身不會在執行時抓這些檔案。
 *
 * ── 來源 ──
 * 1. PokeMiners game_masters  遊戲原始數值：屬性、稀有度、型態清單
 * 2. PokeMiners pogo_assets   圖檔清單：決定「哪些條目真的存在」與「異色有沒有圖」
 * 3. pogo_assets 語言檔        官方三語名稱
 *
 * ── 為什麼以圖檔清單為準 ──
 * game master 裡有很多沒實裝、或玩家看不到的型態。
 * 反過來說，畫面上畫得出來的一定有圖檔。所以條目清單以圖檔為準，
 * 再回頭去 game master 補屬性與稀有度。
 *
 * ── 圖檔命名 ──
 *   pm25.icon.png                   一般
 *   pm25.fWORLD_CAP.icon.png        型態（含部分裝扮）
 *   pm25.cHALLOWEEN_2017.icon.png   裝扮疊加
 *   pm25.s.icon.png                 異色，在 .icon 前加 .s.
 *   pm25.cPI.g2.icon.png            同一條目的新版渲染，視為重複，只留一份
 *
 * ── 執行 ──
 *   node tools/build-dex.mjs          用快取，沒快取才下載
 *   node tools/build-dex.mjs --force  忽略快取重新下載
 *
 * 下載約 25 MB，存在 tools/.cache/（不進 git）。
 */

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { costumeName } from "../js/costumes.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "tools", ".cache");
const FORCE = process.argv.includes("--force");

const GM_URL =
  "https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/latest.json";
const TREE_URL =
  "https://api.github.com/repos/PokeMiners/pogo_assets/git/trees/master";
const TEXT_BASE =
  "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Texts/Latest%20APK/JSON/";

const LANG_FILES = {
  zh: "i18n_chinesetraditional.json",
  ja: "i18n_japanese.json",
  en: "i18n_english.json",
};

/* ─────────── 下載與快取 ─────────── */

async function cached(name, url) {
  const path = join(CACHE, name);
  if (!FORCE) {
    try {
      await stat(path);
      return JSON.parse(await readFile(path, "utf8"));
    } catch {
      /* 沒快取就往下走 */
    }
  }
  process.stdout.write(`  下載 ${name} … `);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${name} HTTP ${res.status}`);
  const text = await res.text();
  await mkdir(CACHE, { recursive: true });
  await writeFile(path, text);
  console.log(`${(text.length / 1048576).toFixed(1)} MB`);
  return JSON.parse(text);
}

/**
 * 取得 Addressable Assets 目錄下的檔名清單。
 * GitHub 的 tree API 一次只回一層，所以要沿著 Images → Pokemon → Addressable Assets 往下走。
 */
async function assetList() {
  const path = join(CACHE, "assets.json");
  if (!FORCE) {
    try {
      await stat(path);
      return JSON.parse(await readFile(path, "utf8"));
    } catch {
      /* 沒快取就往下走 */
    }
  }
  process.stdout.write("  下載 圖檔清單 … ");
  let sha = null;
  let url = TREE_URL;
  for (const seg of ["Images", "Pokemon", "Addressable Assets"]) {
    const tree = await (await fetch(url)).json();
    const hit = (tree.tree || []).find((t) => t.path === seg);
    if (!hit) throw new Error(`圖檔清單找不到 ${seg}`);
    sha = hit.sha;
    url = `https://api.github.com/repos/PokeMiners/pogo_assets/git/trees/${sha}`;
  }
  const tree = await (await fetch(url)).json();
  if (tree.truncated) throw new Error("圖檔清單被截斷，需要改用分頁");
  const files = tree.tree.filter((t) => t.type === "blob").map((t) => t.path);
  await mkdir(CACHE, { recursive: true });
  await writeFile(path, JSON.stringify(files));
  console.log(`${files.length} 個檔案`);
  return files;
}

/* ─────────── 語言檔 ─────────── */

/** 語言檔是 key, value, key, value… 的扁平陣列，轉成物件比較好查 */
function toMap(arr) {
  const m = Object.create(null);
  for (let i = 0; i < arr.length; i += 2) m[arr[i]] = arr[i + 1];
  return m;
}

/* ─────────── 圖檔清單 → 條目 ─────────── */

/**
 * 解析一個圖檔名。
 * @returns {{dex:number, form:string|null, costume:string|null, shiny:boolean} | null}
 */
function parseIcon(file) {
  if (!file.endsWith(".icon.png")) return null;
  // 去掉 .g2（同一條目的新版渲染），兩者指同一個東西
  const parts = file.replace(".icon.png", "").replace(".g2", "").split(".");
  const head = parts.shift();
  const m = head.match(/^pm(\d+)$/);
  if (!m) return null;

  let form = null;
  let costume = null;
  let shiny = false;
  for (const p of parts) {
    if (p === "s") shiny = true;
    // 上游偶爾大小寫不一致（例如 fMay_2023 與 fMAY_2023），一律轉大寫避免同一個
    // 裝扮被拆成兩個條目
    else if (p.startsWith("f")) form = p.slice(1).toUpperCase();
    else if (p.startsWith("c")) costume = p.slice(1).toUpperCase();
  }
  return { dex: Number(m[1]), form, costume, shiny };
}

/** 條目 id。一旦發布就不可以再改，這是使用者紀錄的鍵 */
function entryId({ dex, form, costume }) {
  let id = `d${dex}`;
  if (form) id += `.f${form}`;
  if (costume) id += `.c${costume}`;
  return id;
}

/** 圖檔名，交給前端組成網址 */
function iconFile({ dex, form, costume }, shiny) {
  let f = `pm${dex}`;
  if (form) f += `.f${form}`;
  if (costume) f += `.c${costume}`;
  if (shiny) f += ".s";
  return `${f}.icon.png`;
}

/* ─────────── 主流程 ─────────── */

async function main() {
  console.log("讀取上游資料");
  const [gm, files, zh, ja, en] = await Promise.all([
    cached("game_master.json", GM_URL),
    assetList(),
    cached("i18n_zh.json", TEXT_BASE + LANG_FILES.zh),
    cached("i18n_ja.json", TEXT_BASE + LANG_FILES.ja),
    cached("i18n_en.json", TEXT_BASE + LANG_FILES.en),
  ]);

  const T = { zh: toMap(zh.data), ja: toMap(ja.data), en: toMap(en.data) };

  /* 1. 從圖檔清單整理出條目，順便記錄異色有沒有圖 */
  const entries = new Map();
  for (const f of files) {
    const p = parseIcon(f);
    if (!p) continue;
    const id = entryId(p);
    const cur = entries.get(id) || { ...p, shiny: false, hasBase: false };
    if (p.shiny) cur.shiny = true;
    else cur.hasBase = true;
    entries.set(id, cur);
  }
  // 只有異色圖沒有一般圖的條目不收，那是上游的殘留
  for (const [id, e] of entries) if (!e.hasBase) entries.delete(id);

  /*
   * 同一個裝扮有時會同時出現 X 與 X_NOEVOLVE 兩個代碼，
   * 差別只是「穿了能不能進化」，外觀完全一樣。
   * 兩筆都留的話圖鑑會出現兩張長得一模一樣的卡，所以合併成一筆，
   * 保留 id 較短的那個，異色只要有一邊有就算有。
   */
  /**
   * 外觀一樣、只有遊戲機制不同的型態代碼。左邊併進右邊。
   *
   * 基格爾德的 `COMPLETE_` 前綴代表細胞已經收集滿、可以變成完全體，
   * 跟不帶前綴的那筆圖檔逐位元組相同、基礎數值也相同，
   * 留兩筆就是兩張一模一樣的卡掛著兩個不同的 id。跟 `_NOEVOLVE` 同一類。
   *
   * 這裡一筆一筆指名，不寫成「去掉 COMPLETE_ 前綴」那種規則：
   * `COMPLETE` 自己是獨立的形態（完全體），規則化會把它也吃掉。
   */
  const SAME_LOOK = {
    "718|COMPLETE_FIFTY_PERCENT": "FIFTY_PERCENT",
    "718|COMPLETE_TEN_PERCENT": "TEN_PERCENT",
  };

  const merged = new Map();
  let mergedCount = 0;
  for (const [id, e] of entries) {
    // 型態與裝扮都算進 key，否則南瓜精四種尺寸的萬聖節版會被併成一筆。
    // 不分 .c 與 .f，因為同一個活動在上游有時歸型態、有時歸裝扮。
    const codes = [e.form, e.costume]
      .filter(Boolean)
      .map((c) => c.replace("_NOEVOLVE", ""))
      .map((c) => SAME_LOOK[`${e.dex}|${c}`] || c)
      .sort();
    const key = `${e.dex}|${codes.join("+")}`;
    const kept = merged.get(key);
    if (!kept) {
      merged.set(key, [id, e]);
      continue;
    }
    mergedCount++;
    if (e.shiny) kept[1].shiny = true;
    if (id.length < kept[0].length) merged.set(key, [id, { ...e, shiny: kept[1].shiny }]);
  }
  if (mergedCount) {
    entries.clear();
    for (const [id, e] of merged.values()) entries.set(id, e);
    console.log(`  合併 NOEVOLVE 重複裝扮 ${mergedCount} 筆`);
  }

  /* 2. game master：以 dex + form 建索引，補屬性與稀有度 */
  const settings = new Map();
  for (const tpl of gm) {
    const s = tpl.data && tpl.data.pokemonSettings;
    if (!s) continue;
    const m = String(tpl.templateId).match(/^V(\d+)_POKEMON_/);
    if (!m) continue;
    const dex = Number(m[1]);
    // form 欄位長得像 PIKACHU_FLYING_5TH_ANNIV，去掉物種前綴只留代碼
    const code = s.form ? String(s.form).replace(`${s.pokemonId}_`, "") : null;
    /*
     * 兩種寫法都收，跟底下的 statsOf 一樣。
     *
     * 條目的 form 是從圖檔名抽的，上游有時把物種寫進去（WORMADAM_TRASH），
     * 有時不寫（HISUIAN）。只收去前綴的那種，含前綴的就會查不到而靜默
     * 退回本體，屬性看起來很正常其實是別的型態的：結草貴婦的砂土與垃圾
     * 蓑衣就這樣掛了本體的蟲加草，實際上是蟲加地面與蟲加鋼。
     */
    const put = (key) => {
      if (!settings.has(key)) settings.set(key, { dex, s });
    };
    put(`${dex}|${code === "NORMAL" ? null : code}`);
    if (s.form) put(`${dex}|${s.form}`);
    put(`${dex}|null`);
  }

  /*
   * 基礎數值另外建一份索引，不共用上面那個。
   *
   * 上面那個查不到會退回本體（`dex|null`），對屬性與稀有度來說沒問題，
   * 但 CP 不能這樣退：原始回歸與洗翠黏美龍在 game master 裡沒有自己的數值，
   * 退回本體會得到一個看起來很像真的、其實是別隻的 CP，而且不會有人發現。
   *
   * 兩種寫法都收，因為上游有時把物種寫進 form（UNOWN_A），有時不寫（ORIGIN）。
   */
  const statsOf = new Map();
  for (const tpl of gm) {
    const s = tpl.data && tpl.data.pokemonSettings;
    const m = String(tpl.templateId).match(/^V(\d+)_POKEMON_/);
    if (!s || !s.stats || !m) continue;
    const dex = Number(m[1]);
    const put = (key) => {
      if (!statsOf.has(key)) statsOf.set(key, s.stats);
    };
    if (s.form) {
      put(`${dex}|${s.form}`);
      put(`${dex}|${String(s.form).replace(`${s.pokemonId}_`, "")}`);
    } else put(`${dex}|`);
  }

  /**
   * 型態沒有自己的數值、但實際上就是本體的那幾筆。
   * 目前只有哲爾尼亞斯，它那兩個樣子在 GO 裡只是外觀。
   * 這張表要一筆一筆指名，不能寫成「查不到就用本體」，
   * 那樣原始回歸會拿到蓋歐卡的數字。
   */
  const STATS_SAME_AS = { "716|NEUTRAL": "NORMAL" };

  /*
   * IV100 的 CP。團體戰捕捉是 20 級、天氣加成 25 級、練滿 50 級。
   * 公式：(攻+15) × √(防+15) × √(耐+15) × 倍率² ÷ 10，無條件捨去，下限 10。
   * 倍率取自 game master 的 PLAYER_LEVEL_SETTINGS，不要自己抄一份。
   */
  const CPM = gm.find((x) => x.data && x.data.playerLevel).data.playerLevel
    .cpMultiplier;
  const CP_LEVELS = [20, 25, 50];
  const ivCp = (st, lv) =>
    Math.max(
      10,
      Math.floor(
        ((st.baseAttack + 15) *
          Math.sqrt(st.baseDefense + 15) *
          Math.sqrt(st.baseStamina + 15) *
          CPM[lv - 1] ** 2) /
          10
      )
    );

  /**
   * 一筆條目該用哪一組基礎數值。
   * 裝扮不改數值，用本體的；真正的型態一定要有自己的，沒有就是沒有。
   * kind 要從外面傳進來，因為裝扮有時掛在型態代碼上（fFALL_2019）。
   */
  const statsFor = (e, kind) => {
    const base = () => statsOf.get(`${e.dex}|NORMAL`) || statsOf.get(`${e.dex}|`);
    if (kind === "costume" || !e.form) return base();
    const own = statsOf.get(`${e.dex}|${e.form}`);
    if (own) return own;
    const same = STATS_SAME_AS[`${e.dex}|${e.form}`];
    if (same) return statsOf.get(`${e.dex}|${same}`);
    return null;
  };

  const TYPE = (t) => (t ? String(t).replace("POKEMON_TYPE_", "").toLowerCase() : null);
  const CLASS = (c) =>
    !c ? "normal" : String(c).replace("POKEMON_CLASS_", "").toLowerCase();

  /* 3. 名稱 */
  const REGION = {
    ALOLA: "alola_pokedex_header",
    GALARIAN: "galarian_pokedex_header",
    HISUIAN: "hisuian_pokedex_header",
    PALDEA: "paldean_pokedex_header",
  };

  /**
   * 語言檔漏掉的物種名。上游修好後這裡就會失效，但留著也無害。
   * 譯名取自 PokeAPI 官方資料表。
   */
  const NAME_PATCH = {
    1011: ["裹蜜蟲", "カミッチュ", "Dipplin"],
    1012: ["斯魔茶", "チャデス", "Poltchageist"],
    1013: ["來悲粗茶", "ヤバソチャ", "Sinistcha"],
    1019: ["蜜集大蛇", "カミツオロチ", "Hydrapple"],
  };
  const LANG_I = { zh: 0, ja: 1, en: 2 };

  const speciesName = (dex, lang) => {
    const hit = T[lang][`pokemon_name_${String(dex).padStart(4, "0")}`];
    if (hit) return hit;
    const patch = NAME_PATCH[dex];
    return patch ? patch[LANG_I[lang]] : null;
  };

  /** 未知圖騰的字母就是它的名字，語言檔沒收 */
  const unownLabel = (code) => {
    const c = code.replace("UNOWN_", "");
    if (c === "EXCLAMATION_POINT") return "!";
    if (c === "QUESTION_MARK") return "?";
    return c.length === 1 ? c : null;
  };

  /**
   * 型態譯名。官方 key 有兩種寫法，帶物種前綴的比較多。
   * @param species game master 的 pokemonId，例如 CASTFORM
   */
  const formLabel = (code, lang, species) => {
    if (!code) return null;
    if (REGION[code]) return T[lang][REGION[code]] || null;
    if (FORM_OVERRIDE[code]) return FORM_OVERRIDE[code][LANG_I[lang]];
    if (code.startsWith("UNOWN_")) return unownLabel(code);
    const lower = code.toLowerCase();
    if (species) {
      const hit = T[lang][`form_${species.toLowerCase()}_${lower}`];
      if (hit) return hit;
    }
    return T[lang][`form_${lower}`] || null;
  };

  /**
   * 語言檔查不到、但確實是遊戲內型態而不是裝扮的代碼。
   * 沒有這張表的話，下面的「查不到譯名就當裝扮」會把它們誤判。
   * 晃晃斑的斑點編號有 0 到 8 共九種，各自是獨立的樣子。
   */
  const FORM_OVERRIDE = {
    A: ["盔甲", "アーマード", "Armored"],
    // 比對過原本的圖，差別在姿勢：洛奇亞與鳳王展翅、拉帝斯兄妹前傾，
    // 不是換色也不是裝扮，所以叫姿勢而不是型態
    S: ["特別姿勢", "スペシャルポーズ", "Special Pose"],
    GALARIAN_STANDARD: ["伽勒爾的樣子 普通模式", "ガラルのすがた ノーマルモード", "Galarian Standard Mode"],
    GALARIAN_ZEN: ["伽勒爾的樣子 達摩模式", "ガラルのすがた ダルマモード", "Galarian Zen Mode"],
    WORMADAM_PLANT: ["草木蓑衣", "くさきのミノ", "Plant Cloak"],
    WORMADAM_SANDY: ["砂土蓑衣", "すなちのミノ", "Sandy Cloak"],
    WORMADAM_TRASH: ["垃圾蓑衣", "ゴミのミノ", "Trash Cloak"],
    ARTISAN: ["名匠之作", "めいこうのさくひん", "Artisan"],
    MASTERPIECE: ["傑作", "けっさく", "Masterpiece"],
    COUNTERFEIT: ["贗品", "がんさく", "Counterfeit"],
    UNREMARKABLE: ["凡作", "ぼんさく", "Unremarkable"],
    COIN_A1: ["寶箱的樣子", "はこのすがた", "Chest Form"],
    NEUTRAL: ["活力滿溢的樣子", "アクティブモード", "Active Mode"],
    // 基格爾德。語言檔只給了帶 COMPLETE_ 前綴那兩個的中日文，
    // 而那兩筆因為外觀重複被併掉了，留下來的這三個查不到，要自己指定
    COMPLETE: ["完全體形態", "パーフェクトフォルム", "Complete Forme"],
    FIFTY_PERCENT: ["５０％形態", "５０％フォルム", "50% Forme"],
    TEN_PERCENT: ["１０％形態", "１０％フォルム", "10% Forme"],
  };
  for (let i = 0; i <= 8; i++) {
    const n = String(i).padStart(2, "0");
    FORM_OVERRIDE[n] = [`斑點 ${i}`, `もよう ${i}`, `Pattern ${i}`];
  }

  /**
   * 超級進化、極巨化與原始回歸都是暫時狀態，不是可交換的個體，整批排除。
   * 玩家交換的是原本那隻，那些只是戰鬥中的形態。
   * 原始回歸是後來才補進這條的：它跟超級進化同一類，
   * 而且 game master 根本沒給它自己的基礎數值，收進來連 CP 都是空的。
   */
  const isTempEvo = (code) =>
    !!code &&
    (/^MEGA(_|$)/.test(code) || /GIGANTAMAX|ETERNAMAX/.test(code) || code === "PRIMAL");

  /**
   * 暫時不要出現在網站上的圖鑑編號。
   *
   * 阿爾宙斯：GO 還沒實裝，上游只有圖。18 個屬性型態的數值完全一樣，
   * 型態名稱多半還沒有官方譯名，畫面上會出現一整排「Bug-Type form」。
   * 實裝之後把這裡的編號刪掉、重跑腳本就會回來，id 不會變。
   */
  const HIDDEN_DEX = new Set([493]);

  /**
   * 有圖但 GO 還沒實裝的**型態**。
   *
   * 跟 HIDDEN_DEX 不同，那個藏的是整個圖鑑編號（阿爾宙斯整隻都沒實裝），
   * 這裡藏的是某一個型態，本體要留著。
   *
   * 洗翠黏美兒與黏美龍的圖在上游有，game master 完全沒有它們的設定，
   * 所以屬性會退回本體的龍、CP 算不出來。2026-11 的 GO Wild Area
   * 才首次登場，實裝後把這裡刪掉重跑，屬性與 CP 就會帶真實資料回來，
   * id 不變，使用者既有的紀錄會自己接上。
   */
  const HIDDEN_FORMS = new Set(["705|HISUIAN", "706|HISUIAN"]);

  /* 4. 組出輸出 */
  const out = [];
  const missing = { name: [], form: new Set(), costume: new Set(), gm: [], stats: [] };
  let skipped = 0;

  for (const [id, e] of [...entries].sort((a, b) => {
    const d = a[1].dex - b[1].dex;
    return d || a[0].localeCompare(b[0]);
  })) {
    if (
      isTempEvo(e.form) ||
      HIDDEN_DEX.has(e.dex) ||
      HIDDEN_FORMS.has(`${e.dex}|${e.form}`)
    ) {
      skipped++;
      continue;
    }

    const hit =
      settings.get(`${e.dex}|${e.form}`) || settings.get(`${e.dex}|null`) || null;
    if (!hit) missing.gm.push(id);
    const s = hit && hit.s;
    const species = s && s.pokemonId;

    const row = { id, dex: e.dex };
    if (e.form) row.form = e.form;
    if (e.costume) row.costume = e.costume;

    for (const lang of ["zh", "ja", "en"]) {
      const base = speciesName(e.dex, lang);
      if (!base) {
        if (lang === "zh") missing.name.push(e.dex);
        continue;
      }
      row[lang] = base;
    }

    // 有官方譯名的是真正的型態；查不到的幾乎都是裝扮，遊戲內本來就不顯示名字
    let labelled = false;
    if (e.form) {
      for (const lang of ["zh", "ja", "en"]) {
        const l = formLabel(e.form, lang, species);
        if (l && row[lang]) {
          row[`${lang}Form`] = l;
          labelled = true;
        }
      }
      // 查不到官方譯名不一定是問題，多半是裝扮，下面會再查一次裝扮表
    }

    // kind 決定畫面怎麼分類：一般 / 型態 / 裝扮
    row.kind = e.costume || (e.form && !labelled) ? "costume" : e.form ? "form" : "base";
    if (row.kind === "costume") {
      // 南瓜精這種「尺寸型態 + 裝扮」的條目，兩個標籤都要留，
      // 否則四種尺寸會變成四筆一模一樣的「2022 萬聖節」
      const code = e.costume || e.form;
      let named = false;
      for (const lang of ["zh", "ja", "en"]) {
        const l = costumeName(code, lang);
        if (!l || !row[lang]) continue;
        const size = e.costume && labelled ? row[`${lang}Form`] : null;
        row[`${lang}Form`] = size ? `${size}・${l}` : l;
        named = true;
      }
      if (!named) missing.costume.add(code);
    }

    row.types = s ? [TYPE(s.type), TYPE(s.type2)].filter(Boolean) : [];
    row.cls = CLASS(s && s.pokemonClass);

    // IV100 的 CP。查不到自己的數值就三個都不輸出，不借本體的來充數
    const st = statsFor(e, row.kind);
    if (st) for (const lv of CP_LEVELS) row[`cp${lv}`] = ivCp(st, lv);
    else missing.stats.push(id);
    row.icon = iconFile(e, false);
    if (e.shiny) row.shinyIcon = iconFile(e, true);

    out.push(row);
  }
  console.log(`  排除暫時狀態與暫時隱藏的 ${skipped} 筆`);

  /* 5. 寫檔 */
  const body = out
    .map((r) => "  " + JSON.stringify(r).replace(/","/g, '", "'))
    .join(",\n");

  const js = `/**
 * godex.js — GO 圖鑑條目（自動產生，不要手改）
 *
 * 由 tools/build-dex.mjs 從 PokeMiners game_master 與圖檔清單產生。
 * GO 更新後重跑腳本即可，不需要手動維護。
 *
 * ── 欄位 ──
 * id        條目鍵，發布後不可更改。d<圖鑑編號>[.f<型態>][.c<裝扮>]
 * dex       全國圖鑑編號
 * form      型態代碼，沒有就沒這個欄位
 * costume   裝扮代碼，沒有就沒這個欄位
 * zh/ja/en  物種名稱（官方翻譯）
 * *Form     型態名稱（官方翻譯），沒有官方譯名時不輸出
 * kind      base 一般 / form 型態變化 / costume 裝扮
 * types     屬性，一或兩個
 * cls       normal / legendary / mythic / ultra_beast
 * cp20/25/50 個體值全滿（15/15/15）在該等級的 CP
 *           20 是團體戰捕捉、25 是天氣加成、50 是練滿
 *           game master 沒有那個型態的基礎數值時三個都不輸出
 * icon      GO 圖示檔名
 * shinyIcon 異色圖示檔名，上游沒有異色圖就沒這個欄位
 *
 * 裝扮沒有官方名稱，遊戲內只顯示物種名。譯名見 js/costumes.js。
 *
 * 產生時間：${new Date().toISOString().slice(0, 10)}
 * 條目數：${out.length}
 */

export const GODEX = [
${body},
];

export const GODEX_COUNT = GODEX.length;
`;

  await writeFile(join(ROOT, "js", "godex.js"), js);

  /* 6. 報告 */
  const n = (f) => out.filter(f).length;
  console.log("\n產生完成 js/godex.js");
  console.log(`  條目總數        ${out.length}`);
  console.log(`  有異色圖        ${n((r) => r.shinyIcon)}`);
  console.log(`  一般            ${n((r) => r.kind === "base")}`);
  console.log(`  型態變化        ${n((r) => r.kind === "form")}`);
  console.log(`  裝扮            ${n((r) => r.kind === "costume")}`);
  console.log(`  傳說            ${n((r) => r.cls === "legendary")}`);
  console.log(`  神話            ${n((r) => r.cls === "mythic")}`);
  console.log(`  究極異獸        ${n((r) => r.cls === "ultra_beast")}`);
  console.log(`  缺屬性          ${n((r) => !r.types.length)}`);
  console.log(`  有 IV100 CP     ${n((r) => r.cp20)}`);

  if (missing.name.length)
    console.log(`  ! 缺物種名 ${[...new Set(missing.name)].join(", ")}`);
  const unnamed = out.filter((r) => (r.form || r.costume) && !r.zhForm);
  if (unnamed.length)
    console.log(
      `  ! 完全查不到名稱 ${unnamed.length} 筆：` +
        [...new Set(unnamed.map((r) => r.form || r.costume))].join(", ")
    );
  if (missing.costume.size)
    console.log(
      `  ! 裝扮缺譯名 ${missing.costume.size} 種，補進 js/costumes.js：` +
        [...missing.costume].join(", ")
    );
  if (missing.gm.length)
    console.log(`  ! 對不到 game master ${missing.gm.length} 筆`);
  if (missing.stats.length)
    console.log(
      `  ! 沒有基礎數值因此沒有 CP ${missing.stats.length} 筆：` +
        missing.stats.join(", ")
    );
}

// process.exit() 會在 Windows 上炸掉，讓 Node 自己收尾
main().catch((err) => {
  console.error("失敗：", err.message);
  process.exitCode = 1;
});
