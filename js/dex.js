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
import { allBgEntryIds } from "./backgrounds.js";
import { TYPES } from "./types.js";
import { imgAttrs } from "./imgchain.js";

/** 屬性的 key，順序就是篩選面板上的順序 */
const TYPE_KEYS = Object.keys(TYPES);

/* ─────────── 圖片來源 ─────────── */

const GO_BASE =
  "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/";

/** 官方立繪，GO 圖示載入失敗時的最後防線 */
const ART_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/";

export const goUrl = (file) => (file ? GO_BASE + file : null);
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
 */
export function iconAttrs(e, shiny) {
  if (!e) return "";
  // 外部來源的裝扮沒有異色圖，一律顯示一般版
  if (e.art) return imgAttrs([e.art, artUrl(e.dex)]);
  const main = shiny && e.shinyIcon ? e.shinyIcon : e.icon;
  return imgAttrs([goUrl(main), goUrl(e.icon), artUrl(e.dex)]);
}

/** 這個條目有沒有異色可以收 */
export const hasShiny = (e) => !!(e && e.shinyIcon);

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
