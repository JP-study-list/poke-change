/**
 * store.js — 資料儲存（只在這台裝置）
 *
 * 沒有後台、沒有登入、沒有雲端。全部存在瀏覽器的 localStorage，
 * 換裝置或清除瀏覽資料就會不見，所以一定要提供匯出。
 *
 * ── iOS Safari 會清掉資料 ──
 * Safari 對「長期沒互動的網站」會清除 localStorage，大約兩週。
 * 這不是 bug 也擋不掉，只能靠匯出檔案自保。
 * 介面上要一直看得到匯出按鈕，不要藏在設定裡。
 *
 * ── 存什麼 ──
 * 只存使用者的選擇，不存名稱與圖片。這樣圖鑑資料更新、
 * 改譯名、補裝扮都不會動到既有紀錄，也不需要資料遷移。
 *
 *   {
 *     v: 1,
 *     want: [ {id, shiny, xxl, xxs, bg, note}, ... ],   想要的
 *     have: [ {id, shiny, xxl, xxs, bg, note}, ... ],   可以給的
 *     name: { want: "", have: "" },                     兩欄的標題
 *     updated: 時間戳
 *   }
 *
 * 同一個條目可以出現多次。「異色超夢」與「有東京背卡的超夢」
 * 是兩個獨立的交換目標，不該合併。
 */

const KEY = "poke-change/v1";

/** 一欄最多幾筆。純粹避免分享圖爆掉，不是技術限制 */
export const MAX_ITEMS = 200;

/** 兩欄的欄位名，順序就是畫面由左到右 */
export const COLUMNS = ["want", "have"];

/* ─────────── 空白資料 ─────────── */

export function emptyData() {
  return {
    v: 1,
    want: [],
    have: [],
    name: { want: "", have: "" },
    updated: 0,
  };
}

/** 一筆新的交換項目。預設想要異色，因為交換的價值就在重骰個體值 */
export function newItem(id, shiny = true) {
  return { id, shiny: !!shiny, xxl: false, xxs: false, bg: "", note: "" };
}

/* ─────────── 正規化 ─────────── */

/**
 * 洗掉不認得的欄位與壞掉的值。
 * localStorage 的內容使用者可以手動改，也可能是舊版寫的，一律不信任。
 */
function cleanItem(v) {
  if (!v || typeof v !== "object" || typeof v.id !== "string" || !v.id) return null;
  return {
    id: v.id,
    shiny: !!v.shiny,
    xxl: !!v.xxl,
    xxs: !!v.xxs,
    bg: typeof v.bg === "string" ? v.bg.slice(0, 40) : "",
    note: typeof v.note === "string" ? v.note.slice(0, 60) : "",
  };
}

function cleanList(v) {
  if (!Array.isArray(v)) return [];
  return v.map(cleanItem).filter(Boolean).slice(0, MAX_ITEMS);
}

/** 把任意輸入整理成合法的資料結構 */
export function normalize(raw) {
  const out = emptyData();
  if (!raw || typeof raw !== "object") return out;
  for (const col of COLUMNS) out[col] = cleanList(raw[col]);
  if (raw.name && typeof raw.name === "object") {
    for (const col of COLUMNS) {
      const n = raw.name[col];
      out.name[col] = typeof n === "string" ? n.slice(0, 24) : "";
    }
  }
  out.updated = Number(raw.updated) || 0;
  return out;
}

/* ─────────── 讀寫 ─────────── */

/**
 * 讀取。任何失敗都回空白資料，不讓壞掉的儲存內容擋住整個網站。
 * 無痕視窗、關閉網站資料的瀏覽器會直接丟例外，所以要包起來。
 */
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyData();
    return normalize(JSON.parse(raw));
  } catch (err) {
    console.warn("[store] 讀取失敗，改用空白資料：", err);
    return emptyData();
  }
}

let timer = null;

/**
 * 儲存。連續操作合併成一次寫入。
 * @param {object} data
 * @param {(ok:boolean)=>void} [onDone]
 */
export function save(data, onDone) {
  clearTimeout(timer);
  timer = setTimeout(() => flush(data, onDone), 300);
}

/** 立刻寫入，不等合併。關閉分頁前要呼叫 */
export function flush(data, onDone) {
  clearTimeout(timer);
  try {
    data.updated = Date.now();
    localStorage.setItem(KEY, JSON.stringify(data));
    if (onDone) onDone(true);
  } catch (err) {
    console.error("[store] 儲存失敗：", err);
    if (onDone) onDone(false);
  }
}

/** 清空這台裝置上的紀錄 */
export function clear() {
  try {
    localStorage.removeItem(KEY);
  } catch (err) {
    console.warn("[store] 清除失敗：", err);
  }
}

/* ─────────── 匯出與匯入 ─────────── */

/** 匯出成可下載的 JSON 字串 */
export const toJSON = (data) => JSON.stringify(normalize(data), null, 2);

/**
 * 匯入。解析失敗回 null，讓呼叫端顯示錯誤而不是把資料洗掉。
 * @returns {object|null}
 */
export function fromJSON(text) {
  try {
    const parsed = JSON.parse(text);
    const data = normalize(parsed);
    // 兩欄都空的多半是選錯檔案，當作失敗比較安全
    if (!data.want.length && !data.have.length) return null;
    return data;
  } catch {
    return null;
  }
}

/** 匯出用的檔名，帶當地日期。不用 toISOString，那是 UTC 會差一天 */
export function exportName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `poke-change-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.json`;
}
