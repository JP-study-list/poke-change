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
 * GO 圖示 → 官方立繪。onerror 只能安全重試一次，再多會無限迴圈，
 * 所以剩下的來源放 data-fb，由 window.__imgfb 逐一取用。
 * 新增 <img> 一律用 iconAttrs 產生，自己寫 src 就沒有備援。
 */

import { GODEX } from "./godex.js";
import { extraEntries } from "./extra.js";

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
 * 依序嘗試多個來源，前一個失敗就換下一個。
 * @param {string[]} chain 圖片網址，空值會先濾掉
 */
function imgAttrs(chain) {
  const [first, ...rest] = chain.filter(Boolean);
  if (!first) return "";
  if (!rest.length) return `src="${first}"`;
  return `src="${first}" data-fb="${rest.join(" ")}" onerror="__imgfb(this)"`;
}

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

// 給 inline onerror 用。Node 測試環境沒有 window，所以要判斷
if (typeof window !== "undefined") {
  window.__imgfb = (img) => {
    const rest = img.dataset.fb || "";
    if (!rest) {
      img.onerror = null; // 來源用完了，停止重試
      return;
    }
    const i = rest.indexOf(" ");
    img.dataset.fb = i < 0 ? "" : rest.slice(i + 1);
    img.src = i < 0 ? rest : rest.slice(0, i);
  };
}

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

/** 篩選條件。key 對應 i18n 的字典鍵 */
export const FILTERS = {
  all: () => true,
  base: (e) => e.kind === "base",
  form: (e) => e.kind === "form",
  costume: (e) => e.kind === "costume",
  regional: isRegional,
  shiny: hasShiny,
  legendary: (e) => e.cls === "legendary",
  mythic: (e) => e.cls === "mythic",
  ultra: (e) => e.cls === "ultra_beast",
};

/** 套用篩選 */
export const applyFilter = (list, key) => list.filter(FILTERS[key] || FILTERS.all);
