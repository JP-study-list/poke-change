/**
 * dex.js — 圖鑑條目的單一入口
 *
 * 把兩個來源合併成一份清單，並負責名稱組合、搜尋、圖片備援。
 * 畫面層只跟這個檔說話，不直接碰 godex.js 或 pika-extra.js。
 *
 *   godex.js       自動產生，1458 筆，含地區型、型態、裝扮
 *   extra.js       手動維護，23 筆，補 godex 缺的條目
 *
 * ── 條目 id ──
 * 發布後不可更改，這是使用者紀錄的鍵。三種形狀：
 *   d150                    一般
 *   d150.fA                 型態變化
 *   d25.cHALLOWEEN_2017     裝扮
 *   d25.xREDS_HAT           裝扮，圖片來自外部個人專案
 *
 * ── 圖片備援 ──
 * GO 圖示 → 官方立繪。備援鏈的機制在 imgchain.js，背卡也共用同一套。
 * 新增 <img> 一律用 iconAttrs 產生，自己寫 src 就沒有備援。
 */

import { GODEX } from "./godex.js";
import { extraEntries } from "./extra.js";
import { MAX_IDS, GMAX_IDS } from "./maxdata.js";
import { allBgEntryIds } from "./backgrounds.js";
import { TYPES } from "./types.js";
import { imgAttrs } from "./imgchain.js";

/** 屬性的 key，順序就是篩選面板上的順序 */
const TYPE_KEYS = Object.keys(TYPES);

/* ─────────── 圖片來源 ─────────── */

const GO_BASE =
  "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/";

/*
 * 另一個圖檔目錄。上游兩邊的進度不一樣：主目錄的超極巨化只有 13 種，
 * 這裡有 19 種，而且皮卡丘、喵喵、灰塵山、長毛巨魔與武道熊師只在這裡。
 * 差別是這批畫在 256×256 的固定畫布上、四周有留白，
 * 所以用它的條目會帶 gmax256 與量出來的 gmaxFill／gmaxOffX／gmaxOffY。
 */
const GO_BASE_256 =
  "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon%20-%20256x256/Addressable%20Assets/";

/** 官方立繪，GO 圖示載入失敗時的最後防線 */
const ART_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/";

export const goUrl = (file) => (file ? GO_BASE + file : null);
export const go256Url = (file) => (file ? GO_BASE_256 + file : null);
export const artUrl = (dex) => (dex ? `${ART_BASE}${dex}.png` : null);

/* ─────────── 條目清單 ─────────── */

/** 全部條目，依圖鑑編號排序，同編號時一般排在型態與裝扮前面 */
export const ENTRIES = [...GODEX, ...extraEntries()].sort((a, b) => {
  if (a.dex !== b.dex) return a.dex - b.dex;
  const rank = (r) => (r.kind === "base" ? 0 : r.kind === "form" ? 1 : 2);
  return rank(a) - rank(b) || a.id.localeCompare(b.id);
});

const INDEX = new Map(ENTRIES.map((e) => [e.id, e]));

/** 依 id 查條目 */
export const find = (id) => INDEX.get(id) || null;

export const ENTRY_COUNT = ENTRIES.length;

/**
 * 濾掉查不到條目的紀錄。
 *
 * 顯示的筆數一律走這裡。紀錄裡的 id 不保證還在圖鑑：使用者可以手改
 * localStorage，圖鑑也可能拿掉某個條目（阿爾宙斯就是暫時隱藏的）。
 * 那些紀錄畫不出格子，卻仍然佔著陣列的長度，直接數就會出現
 * 「寫 3 筆只畫得出 1 格」。
 *
 * **只影響顯示，不影響儲存。** 畫不出來的紀錄照樣留在 localStorage 裡，
 * 條目回來了就自己接上。一欄上限那類管儲存的判斷仍然數原始長度。
 *
 * @param {object[]} items 清單裡的項目
 * @returns {object[]} 畫得出來的那些
 */
export const knownItems = (items) => items.filter((it) => find(it.id));

/* ─────────── 名稱 ─────────── */

/** 物種名，不含型態 */
export const speciesName = (e, lang) => (e ? e[lang] || e.en : "");

/** 型態或裝扮名，一般條目回空字串 */
export const formName = (e, lang) => (e ? e[`${lang}Form`] || "" : "");

/**
 * 完整顯示名稱。
 * 型態與裝扮接在物種名後面加括號，例如「雷丘（阿羅拉的樣子）」。
 * 英文用半形括號並補空格，中日文用全形，不然排版會很醜。
 */
export function fullName(e, lang) {
  if (!e) return "";
  const form = formName(e, lang);
  const base = speciesName(e, lang);
  if (!form) return base;
  return lang === "en" ? `${base} (${form})` : `${base}（${form}）`;
}

/* ─────────── 圖片 ─────────── */

/**
 * <img> 屬性。
 * @param {object} e 條目
 * @param {boolean} shiny 要異色版本
 * @param {boolean} gmax 要超極巨化版本
 *
 * 超極巨化不是條目而是勾選條件，但它的外觀真的不一樣，
 * 所以那 13 種的圖掛在本體的 `gmaxIcon`／`gmaxShinyIcon` 上，
 * 勾起來就換這一張——跟異色同一個機制。
 * 名單裡有四隻上游還沒有圖（皮卡丘、喵喵、灰塵山、長毛巨魔），
 * 那幾隻勾了也拿不到圖，備援鏈會退回一般的那張，不會破圖。
 */
export function iconAttrs(e, shiny, gmax) {
  if (!e) return "";
  // 外部來源的裝扮沒有異色圖，一律顯示一般版
  if (e.art) return imgAttrs([e.art, artUrl(e.dex)]) + zoomAttr(e);
  const normal = shiny && e.shinyIcon ? e.shinyIcon : e.icon;
  const bigFile = gmax ? (shiny && e.gmaxShinyIcon ? e.gmaxShinyIcon : e.gmaxIcon) : null;
  const big = bigFile ? (e.gmax256 ? go256Url(bigFile) : goUrl(bigFile)) : null;
  const chain = [big, goUrl(normal), goUrl(e.icon), artUrl(e.dex)].filter(Boolean);
  /*
   * 256 那批要補留白，否則會比旁邊的小一號還偏位。
   * 載不出來換到備援時 `__imgfb` 會把這三個變數清掉，
   * 不然退回的一般圖會被放大——跟 extra.js 那批是同一個機制。
   */
  return imgAttrs(chain) + (big && e.gmax256 ? gmaxZoomAttr(e) : "");
}

/*
 * 主體佔畫布 98% 時看起來跟 PokeMiners 那批一樣大。
 * 那批量過是 96~99%，取中間偏上的整數。
 */
const FILL_TARGET = 0.98;

/**
 * 放大倍率。extra.js 那批圖四周有大量透明留白，
 * `object-fit: contain` 依畫布縮放，不補這一下就只有別人的四成大。
 *
 * 倍率逐張算，因為每張的留白都不一樣（量出來是 37~43%），
 * 乘同一個數字仍然會差 15 個百分點。
 * 已經滿版的（`fill: 1`）不輸出，省得每個 `<img>` 都掛一個 1。
 */
export function iconZoom(e) {
  const fill = e && e.fill;
  if (!fill || fill >= FILL_TARGET) return 1;
  return Math.round((FILL_TARGET / fill) * 100) / 100;
}

/**
 * 主體中心離圖框中心多遠，以圖框邊長為單位。
 * 放大之後這個偏移也會放大，要靠 translate 抵銷回來。
 */
export const iconOffset = (e) => ({ x: (e && e.offX) || 0, y: (e && e.offY) || 0 });

/** 超極巨化那張圖的放大倍率與偏移，只有用 256 目錄的條目才有 */
export const gmaxZoom = (e) => {
  const fill = e && e.gmaxFill;
  if (!fill || fill >= FILL_TARGET) return 1;
  return Math.round((FILL_TARGET / fill) * 100) / 100;
};

export const gmaxOffset = (e) => ({
  x: (e && e.gmaxOffX) || 0,
  y: (e && e.gmaxOffY) || 0,
});

function gmaxZoomAttr(e) {
  const z = gmaxZoom(e);
  const { x, y } = gmaxOffset(e);
  if (z <= 1 && !x && !y) return "";
  const pct = (n) => `${Math.round(n * 1000) / 10}%`;
  return ` style="--iz:${z};--ix:${pct(x)};--iy:${pct(y)}"`;
}

/* CSS 變數形式。備援圖是滿版的，所以換了來源要清掉，見 imgchain.js */
function zoomAttr(e) {
  const z = iconZoom(e);
  if (z <= 1) return "";
  const { x, y } = iconOffset(e);
  const pct = (n) => `${Math.round(n * 1000) / 10}%`;
  return ` style="--iz:${z};--ix:${pct(x)};--iy:${pct(y)}"`;
}

/** 這個條目有沒有異色可以收 */
export const hasShiny = (e) => !!(e && e.shinyIcon);

/**
 * 這個條目能不能極巨化。
 *
 * 極巨化在 GO 裡不是外觀而是個體身上的能力，所以它是交換條件不是條目，
 * 勾選框只在名單內的條目出現。名單由 tools/build-max.mjs 產生，
 * 來源與比對見 tools/max-report.md。
 *
 * 那 13 隻超極巨化本身就是條目，它已經是極巨化了，名單刻意不收，
 * 不會長出一個再勾一次的框。
 */
const MAX_SET = new Set(MAX_IDS);
export const canMax = (e) => !!(e && MAX_SET.has(typeof e === "string" ? e : e.id));

/**
 * 這個條目能不能超極巨化。名單是 canMax 的子集（18 筆）。
 *
 * 它曾經是條目（2026-09-16 那半天），現在是勾選條件：
 * 圖鑑裡一個物種本來就有本體加好幾個裝扮，再多一格排擠掉的是別隻。
 * 外觀沒有因此消失，勾起來會換成 `gmaxIcon` 那張。
 */
const GMAX_SET = new Set(GMAX_IDS);
export const canGmax = (e) => !!(e && GMAX_SET.has(typeof e === "string" ? e : e.id));

/* ─────────── 搜尋與篩選 ─────────── */

/** 地區型代碼，用來做「只看地區型」的篩選 */
const REGION_FORMS = new Set(["ALOLA", "GALARIAN", "HISUIAN", "PALDEA"]);

export const isRegional = (e) => !!(e && e.form && REGION_FORMS.has(e.form));

/**
 * 搜尋。比對三語名稱、型態名稱與圖鑑編號，全部忽略大小寫。
 * 輸入純數字時只比對圖鑑編號，避免「25」把所有含 25 的名字都撈出來。
 */
export function search(list, q) {
  const s = String(q || "").trim().toLowerCase();
  if (!s) return list;
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    return list.filter((e) => e.dex === n);
  }
  return list.filter((e) => {
    for (const k of ["zh", "ja", "en", "zhForm", "jaForm", "enForm"]) {
      if (e[k] && String(e[k]).toLowerCase().includes(s)) return true;
    }
    return false;
  });
}

/* ─────────── 篩選 ─────────── */

/*
 * 世代用圖鑑編號的區間判斷，game master 沒有這個欄位。
 * 標籤走地區名而不是世代編號，因為「第四代」不如「神奧」好認。
 * 注意這跟種類裡的「地區型」是兩回事：那個指的是阿羅拉的樣子那種型態。
 */
const GEN_RANGES = [
  ["gen1", 1, 151],
  ["gen2", 152, 251],
  ["gen3", 252, 386],
  ["gen4", 387, 493],
  ["gen5", 494, 649],
  ["gen6", 650, 721],
  ["gen7", 722, 809],
  ["gen8", 810, 905],
  ["gen9", 906, 1025],
];

/** 背卡拿得到的條目。只算一次，背卡資料在執行期不會變 */
let bgIds = null;
const hasBgCard = (e) => {
  if (!bgIds) bgIds = new Set(allBgEntryIds());
  return bgIds.has(e.id);
};

/**
 * 篩選群組。
 *
 * 組間 AND、組內 OR：選了「火」與「水」是兩者皆可，
 * 但再選「神奧」就必須同時符合。組內全不選等於這一組不設限。
 *
 * key 對應 i18n 的字典鍵，屬性那組例外，它的名稱在 types.js。
 */
export const FILTER_GROUPS = {
  kind: {
    label: "grpKind",
    options: [
      ["base", (e) => e.kind === "base"],
      ["form", (e) => e.kind === "form"],
      ["costume", (e) => e.kind === "costume"],
      ["regional", isRegional],
    ],
    labelOf: (k) =>
      ({ base: "filterBase", form: "filterForm", costume: "filterCostume", regional: "filterRegional" })[k],
  },
  type: {
    label: "grpType",
    options: TYPE_KEYS.map((k) => [k, (e) => e.types && e.types.includes(k)]),
    labelOf: null, // 名稱來自 types.js
  },
  gen: {
    label: "grpGen",
    options: GEN_RANGES.map(([k, a, b]) => [k, (e) => e.dex >= a && e.dex <= b]),
    labelOf: (k) => k,
  },
  /*
   * 稀有度只有一個選項（2026-09-12，使用者要求）。
   *
   * 傳說、神話與究極異獸在 GO 裡的交換規則是同一套，都要特殊交換，
   * 分成三個選項對「這隻換不換得動」沒有幫助，只是把一格拆成三格。
   * 條目的 `cls` 仍然保留 game master 的原貌，之後想分開不必重跑腳本。
   */
  rarity: {
    label: "grpRarity",
    options: [["legendary", (e) => e.cls !== "normal"]],
    labelOf: (k) => ({ legendary: "filterLegendary" })[k],
  },
  other: {
    label: "grpOther",
    options: [
      ["shiny", hasShiny],
      ["bg", hasBgCard],
    ],
    labelOf: (k) => ({ shiny: "filterShiny", bg: "filterBg" })[k],
  },
};

export const GROUP_KEYS = Object.keys(FILTER_GROUPS);

/** 每一組一個陣列，空陣列代表這一組不設限 */
export function emptyFilter() {
  const f = {};
  for (const g of GROUP_KEYS) f[g] = [];
  return f;
}

/** 讀進來的篩選不信任，只留認得的選項 */
export function normalizeFilter(raw) {
  const f = emptyFilter();
  if (!raw || typeof raw !== "object") return f;
  for (const g of GROUP_KEYS) {
    const valid = new Set(FILTER_GROUPS[g].options.map(([k]) => k));
    const got = Array.isArray(raw[g]) ? raw[g] : [];
    f[g] = got.filter((k) => valid.has(k));
  }
  return f;
}

/** 某一組的判斷式。這一組沒選就一律通過 */
function groupPass(g, picked) {
  if (!picked.length) return () => true;
  const preds = FILTER_GROUPS[g].options
    .filter(([k]) => picked.includes(k))
    .map(([, fn]) => fn);
  return (e) => preds.some((fn) => fn(e));
}

/**
 * 套用篩選。
 * @param {Array} list 條目
 * @param {object} filter emptyFilter() 的形狀
 * @param {string} [skip] 略過這一組，用來算「點下去會剩幾筆」
 */
export function applyFilter(list, filter, skip) {
  const f = filter && typeof filter === "object" ? filter : emptyFilter();
  const tests = GROUP_KEYS.filter((g) => g !== skip).map((g) =>
    groupPass(g, f[g] || [])
  );
  return list.filter((e) => tests.every((fn) => fn(e)));
}

/** 目前選了幾個條件 */
export const filterCount = (filter) =>
  GROUP_KEYS.reduce((n, g) => n + ((filter && filter[g]) || []).length, 0);
