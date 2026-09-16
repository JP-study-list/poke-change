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
 * 有 Max Battle 的背卡。
 *
 * 極巨化只能從 Max Battle 抓到，所以一隻極巨化的寶可夢身上那張背卡，
 * 一定是某場 Max Battle 給的。野生或團戰拿到的卡跟極巨化互斥——
 * 「極巨化的妙蛙花配東京都內背卡」這種組合在遊戲裡不存在，
 * 列出來只會誤導。
 *
 * ── 為什麼是卡片層級，不逐隻標 ──
 * 這幾張卡的寶可夢清單本來就是該場 Max Battle 的陣容
 * （Eternatus 那張 74 筆裡 70 筆可極巨化，13 個可超極巨化的條目
 * 跟官方公布的 Max Finale 輪替陣容逐隻對得上），所以標了卡，
 * 交集自然就精準，不必再維護第二份名單。
 *
 * ── 為什麼不能從資料自動判斷 ──
 * 皮卡丘可超極巨化，而它出現在六十幾張人孔蓋與職棒背卡上，
 * 那些全是野生皮卡丘。同一隻在同一張卡上是野生抓的還是 Max Battle
 * 抓的，Dittobase 的清單不分，比例也推不出來——229 張有清單的卡裡
 * 134 張比例是 100%，但那些卡的清單中位長度只有 2 筆，全是御三家、
 * 皮卡丘這種熱門物種的小卡，100% 是巧合不是訊號。所以只能人工指名。
 *
 * ── 目前這四張 ──
 * 全部是 GO Fest 2025。Dark Skies 與 Max Finale 的 Max Battle 成功捕捉
 * 有機會拿到特殊背景（官方說法），實體場那三張的清單就是該場的
 * Max Battle 陣容：蒼響、藏瑪然特，巴黎多了超極巨化噴火龍那一路。
 *
 * **雷吉那張（go-fest-2025）刻意不收**：那六隻是 2025 年 6 月
 * 「Ancients Recovered」的五星團戰陣容，背卡來自團戰捕捉。
 * 雷吉三神柱後來確實有自己的 Max Battle，但那是另一回事，
 * 這張卡不是那時候給的。
 *
 * 之後 GO 再辦給背卡的 Max Battle，補進來就好。
 * **名單只會長**，所以不拿它去洗使用者存好的紀錄，見 cardsFor。
 */
export const MAX_BATTLE_CARDS = new Set([
  "go-fest-2025-eternatus", // Dark Skies／Max Finale，超極巨化輪替陣容
  "go-fest-2025-paris", // 實體場：蒼響、藏瑪然特、超極巨化噴火龍
  "go-fest-2025-jerseycity", // 實體場：蒼響、藏瑪然特
  "go-fest-2025-osaka", // 實體場：蒼響、藏瑪然特
]);

/** 這張卡是不是 Max Battle 給的 */
export const isMaxBattle = (cardId) => MAX_BATTLE_CARDS.has(cardId);

/**
 * 某個條目可能擁有的所有背卡。
 *
 * `opts.max` 為真時只留 Max Battle 的卡。這是**畫面層的過濾**，
 * 不是資料清洗：`MAX_BATTLE_CARDS` 之後會長，拿它去清掉使用者
 * 已經存好的背卡等於默默改人家的東西，跟「normalize 不拿極巨化
 * 名單洗紀錄」同一個道理。存進去的值一律留著，只有使用者自己
 * 按下極巨化那一刻才會把不合的那張退掉。
 *
 * `opts.keep` 是那條原則的出口：**使用者自己已經選著的那張一律留著**，
 * 即使它不合。這條規則是 1.08.03 才加的，在那之前存下的紀錄可能
 * 帶著現在不合的組合；把它濾掉的話下拉會顯示「不指定」、格子上
 * 卻還畫著那張卡，而且使用者再也點不到它、改不掉它。
 * 能看見才能修正，所以寧可多列一張。
 *
 * @param {string} entryId
 * @param {{max?: boolean, keep?: string}} [opts]
 * @returns {Array<{folder, card, note}>}
 */
export function cardsFor(entryId, opts = {}) {
  const out = [];
  for (const { folder, card } of allCards()) {
    if (opts.max && !isMaxBattle(card.id) && card.id !== opts.keep) continue;
    for (const e of entriesOf(card)) {
      if (e.id === entryId) out.push({ folder, card, note: e.note });
    }
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
