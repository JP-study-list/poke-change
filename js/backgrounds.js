/**
 * backgrounds.js — 背卡的單一入口
 *
 * 把兩個來源合併成一份清單，並負責收納夾分組、名稱與圖片備援。
 * 畫面層只跟這個檔說話，不直接碰 bgdata.js 或 bgevents.js。
 *
 *   bgdata.js    自動產生，240 張骨架，只有代號、圖、英文名與日期
 *   bgevents.js  手工維護，17 張，有三語名、註記與寶可夢清單
 *   bgseries.js  收納夾的譯名與順序
 *
 * 背卡（Special Background）是在特定活動期間或特定地點捕捉寶可夢時，
 * 附加在寶可夢資料頁上的背景圖。
 *
 * ── 合併規則 ──
 * 以 asset（上游檔名）為準對上同一張卡，手工資料逐欄覆蓋骨架。
 * 手工有的欄位才蓋，沒填的沿用骨架，所以補一個譯名不必連日期一起抄。
 *
 * ── 背卡 id ──
 * 發布後不可更改，這是使用者紀錄的鍵，存在 item.bg 裡。
 * 既有的十七張沿用原本的短代號（gf26-global 那種），
 * 新的照上游檔名產生（city-safari-2025-amsterdam 那種）。
 *
 * ── 圖片 ──
 * 連上游，不鏡像進 repo，新活動只要填檔名就有圖。
 * 例外是有特效層的那 31 張，上游只有底層，本地 img/bg/ 有實際卡面的
 * 那幾張會優先用本地的。詳見 bgSources。
 *
 * ── 收納夾 ──
 * 兩百四十張攤平沒辦法看，照活動系列收進資料夾，夾內每張卡就是一個活動。
 */

import { BG_CARDS } from "./bgdata.js";
import { HAND_EVENTS } from "./bgevents.js";
import { SERIES, seriesInfo, seriesOrder } from "./bgseries.js";
import { imgAttrs } from "./imgchain.js";

/* ─────────── 圖片來源 ─────────── */

const BG_BASE =
  "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/LocationCards/";

/** 本地備援，只有手工那批有圖 */
const LOCAL_BASE = "./img/bg/";

export const bgUrl = (card) => (card && card.asset ? `${BG_BASE}${card.asset}.png` : null);
const localUrl = (card) => (card && card.local ? `${LOCAL_BASE}${card.local}` : null);

/**
 * 依序要嘗試的圖片網址。
 *
 * ── 為什麼有本地圖時本地優先 ──
 * 有特效層的背卡（game master 標了 vfxAddress，31 張，全部是 sb_），
 * 上游那個 PNG 只是底層，玩家實際看到的卡面是它再疊一層特效。
 * 本地那 17 張是實際卡面，所以有本地圖就先用本地的，
 * 上游只當備援。沒有本地圖的就只能顯示上游那張。
 */
export const bgSources = (card) =>
  (card && card.local ? [localUrl(card), bgUrl(card)] : [bgUrl(card)]).filter(Boolean);

/**
 * 背卡 <img> 的屬性。
 * 自己寫 src 就沒有備援，上游改檔名會直接破圖。
 */
export const bgAttrs = (card) => imgAttrs(bgSources(card));

/* ─────────── 合併 ─────────── */

/** 手工那層攤平成 asset → 卡片，順便把活動名稱掛到卡片上 */
function handCards() {
  const out = [];
  for (const ev of HAND_EVENTS) {
    for (const card of ev.cards) {
      out.push({
        ...card,
        date: card.date || ev.date || "",
        event: { zh: ev.zh, ja: ev.ja, en: ev.en },
      });
    }
  }
  return out;
}

/**
 * 全部背卡。手工的排前面，同一張卡以 asset 對應，手工逐欄覆蓋骨架。
 * 骨架沒有 pokemon，所以沒有手工資料的卡片收集格是零。
 */
export const CARDS = (() => {
  const byAsset = new Map();
  for (const c of BG_CARDS) byAsset.set(c.asset, { ...c, pokemon: c.pokemon || [] });

  for (const h of handCards()) {
    const base = byAsset.get(h.asset) || {};
    const merged = { ...base };
    for (const [k, v] of Object.entries(h)) {
      if (v !== undefined && v !== "" && !(Array.isArray(v) && !v.length)) merged[k] = v;
    }
    merged.pokemon = h.pokemon || base.pokemon || [];
    byAsset.set(h.asset || h.id, merged);
  }
  return [...byAsset.values()];
})();

const CARD_INDEX = new Map(CARDS.map((c) => [c.id, c]));

/** 依 id 查背卡 */
export const findCard = (id) => CARD_INDEX.get(id) || null;

export const CARD_COUNT = CARDS.length;

/* ─────────── 收納夾 ─────────── */

/** 檔名或日期裡的西元年，拿來排序 */
const yearOf = (s) => Number((String(s || "").match(/20\d\d/) || [0])[0]);

/** 新的排前面。同一年的照名稱排，避免每次重跑順序都在跳 */
function cardOrder(a, b) {
  const ya = yearOf(a.date) || yearOf(a.asset);
  const yb = yearOf(b.date) || yearOf(b.asset);
  if (ya !== yb) return yb - ya;
  return String(a.en || "").localeCompare(String(b.en || ""));
}

/**
 * 收納夾清單，順序照 bgseries.js。
 * 沒有卡片的夾不會出現，所以刪掉一整個系列不會留下空殼。
 */
export const FOLDERS = (() => {
  const bucket = new Map();
  for (const c of CARDS) {
    const key = seriesInfo(c.series) ? c.series : "lcmisc";
    if (!bucket.has(key)) bucket.set(key, []);
    bucket.get(key).push(c);
  }
  return [...bucket.entries()]
    .sort((a, b) => seriesOrder(a[0]) - seriesOrder(b[0]))
    .map(([id, cards]) => ({ ...seriesInfo(id), id, cards: cards.sort(cardOrder) }));
})();

/** 名稱，缺譯名時退回英文 */
export const cardName = (card, lang) => (card ? card[lang] || card.en || card.id : "");
export const folderName = (folder, lang) => (folder ? folder[lang] || folder.en : "");

export { SERIES };

/* ─────────── 查詢 ─────────── */

/** 攤平成 [{folder, card}] 方便查詢 */
export function allCards() {
  const out = [];
  for (const folder of FOLDERS) for (const card of folder.cards) out.push({ folder, card });
  return out;
}

/**
 * 把 pokemon 陣列裡的一筆轉成統一格式。
 * 兩種寫法：字串條目 id，或 { id, note_* } 加註說明。
 * @returns {{id: string, note: object|null}}
 */
export function normalizeEntry(entry) {
  if (typeof entry === "string") return { id: entry, note: null };
  return {
    id: entry.id,
    note: {
      zh: entry.note_zh || "",
      ja: entry.note_ja || "",
      en: entry.note_en || "",
    },
  };
}

/** 某張背卡的所有項目（已正規化） */
export function entriesOf(card) {
  return (card.pokemon || []).map(normalizeEntry);
}

/**
 * 超極巨化沒有自己的背卡清單，查本體那一份。
 *
 * 背卡的清單來自 Dittobase，而它**不收任何特殊型態**：Max Battle 抓到的
 * 寶可夢一律記成本體 id，因為抓到的當下本來就是本體外觀。
 * 但那一隻確實可以是超極巨化的個體——GO Fest 2025 那張無極汰那背卡
 * 74 隻裡有 68 隻在可極巨化名單裡，那就是一張 Max Battle 的卡。
 * 同一隻寶可夢、同一個來源，外觀不同不改變它在哪裡抓的。
 *
 * 代價是沒有 Max Battle 的活動卡也會出現在下拉裡（2026-09-16，使用者確認
 * 接受）。要擋得先知道哪幾場活動有 Max Battle，上游沒有這份資料。
 *
 * **只做這個方向**：背卡詳情那一面不列超極巨化，否則收集格會憑空多出來，
 * 而 Dittobase 並沒有說那張卡收得到超極巨化。
 *
 * 顫弦蠑螈沒有本體條目，指名到高調形態，跟 build-dex 的 STATS_SAME_AS 一致。
 */
const GMAX_BASE = { "d849.fGIGANTAMAX": "d849.fAMPED" };

/**
 * 某個條目可能擁有的所有背卡。
 * @returns {Array<{folder, card, note}>}
 */
export function cardsFor(entryId) {
  const out = [];
  for (const { folder, card } of allCards()) {
    for (const e of entriesOf(card)) {
      if (e.id === entryId) out.push({ folder, card, note: e.note });
    }
  }
  if (!out.length && /\.fGIGANTAMAX$/.test(entryId)) {
    return cardsFor(GMAX_BASE[entryId] || entryId.split(".")[0]);
  }
  return out;
}

/** 所有出現在背卡裡的條目 id */
export function allBgEntryIds() {
  const out = new Set();
  for (const { card } of allCards()) for (const e of entriesOf(card)) out.add(e.id);
  return out;
}

/** 收集格總數（用於統計） */
export function totalCardSlots() {
  return allCards().reduce((n, { card }) => n + (card.pokemon || []).length, 0);
}
