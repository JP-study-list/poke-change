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
 *     v: 2,
 *     active: 0,                      目前在看第幾份，0 ~ 2
 *     lists: [ list, list, list ],     三份清單，形狀一模一樣
 *     updated: 時間戳
 *   }
 *
 *   list = {
 *     name: "",                        這一份的名稱
 *     want: [ {id, shiny, xxl, xxs, max, gmax, bg}, ... ],   想要的
 *     have: [ {id, shiny, xxl, xxs, max, gmax, bg}, ... ],   可以給的
 *   }
 *
 * ── max 是 2026-09-16 加的，沒有升版本號 ──
 * 多一個布林欄位對舊資料是相容的：讀到沒有 max 的舊紀錄就補 false。
 * 反過來，新版存的 max 給舊版讀會被 cleanItem 洗掉——跟 v1 到 v2
 * 一樣是單向的，但這裡只丟一個旗標，不像 v1 會整份清單對不上，
 * 所以不值得為它升 v，升了反而讓舊版讀不到整包資料。
 *
 * 同一個條目可以出現多次。「異色超夢」與「有東京背卡的超夢」
 * 是兩個獨立的交換目標，不該合併。
 *
 * ── v1 怎麼進來的 ──
 * v1 是單獨一份，want / have / name 直接掛在最外層，
 * 而且 name 是 { want, have } 兩個欄位，其中 have 從來沒被用過。
 * 讀到那種形狀就整個包成第一份，另外兩份留空，使用者不必做任何事。
 * 反過來不行：寫成 v2 之後舊版程式讀這個 key 會看到空清單。
 */

const KEY = "poke-change/v1";

/** 一欄最多幾筆。純粹避免分享圖爆掉，不是技術限制 */
export const MAX_ITEMS = 200;

/** 兩欄的欄位名，順序就是畫面由左到右 */
export const COLUMNS = ["want", "have"];

/** 幾份清單。三份是刻意的上限，不是設定值，多了分頁就擠不下 */
export const LIST_COUNT = 3;

/* ─────────── 空白資料 ─────────── */

/** 一份空白清單 */
export function emptyList() {
  return { name: "", want: [], have: [] };
}

/** 整包空白資料（三份清單） */
export function emptyBook() {
  const lists = [];
  for (let i = 0; i < LIST_COUNT; i++) lists.push(emptyList());
  return { v: 2, active: 0, lists, updated: 0 };
}

/** 目前在看的那一份。active 壞掉時退回第一份，不讓畫面空白 */
export const current = (book) => book.lists[book.active] || book.lists[0];

/** 一筆新的交換項目。預設想要異色，因為交換的價值就在重骰個體值 */
export function newItem(id, shiny = true) {
  return { id, shiny: !!shiny, xxl: false, xxs: false, max: false, gmax: false, bg: "" };
}

/* ─────────── 訓練家代碼 ─────────── */

/*
 * 代碼存在偏好而不是清單裡，因為它是使用者的身分，
 * 不是某一份清單的屬性。這兩個函式放在這裡是為了讓
 * 畫面與分享圖共用同一套規則，不要各寫一份。
 */

/** 只留數字，最多 12 碼 */
export function cleanCode(v) {
  return String(v || "").replace(/\D/g, "").slice(0, 12);
}

/** 顯示用，四碼一組。存的一律是純數字 */
export function formatCode(v) {
  return cleanCode(v).replace(/(\d{4})(?=\d)/g, "$1 ");
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
    /*
     * 舊紀錄沒有這兩個欄位，補 false。**不檢查條目能不能極巨化**：
     * 名單會隨 GO 更新縮水，拿名單去洗紀錄等於默默改掉使用者存的東西。
     *
     * 兩個互斥：超極巨化本來就蘊含極巨化，畫面上那兩顆鈕點一個會取消
     * 另一個，手改過的 localStorage 也照這條規則收斂，免得畫面上
     * 出現兩顆徽章疊在一起。
     */
    max: !!v.max && !v.gmax,
    gmax: !!v.gmax,
    bg: typeof v.bg === "string" ? v.bg.slice(0, 40) : "",
  };
}

function cleanItems(v) {
  if (!Array.isArray(v)) return [];
  return v.map(cleanItem).filter(Boolean).slice(0, MAX_ITEMS);
}

const cleanName = (v) => (typeof v === "string" ? v.slice(0, 24) : "");

/**
 * 把任意輸入整理成一份合法的清單。
 * v1 的名稱是 `{ want, have }`，取 want 那個，另一個從來沒用過。
 */
export function normalizeList(raw) {
  const out = emptyList();
  if (!raw || typeof raw !== "object") return out;
  for (const col of COLUMNS) out[col] = cleanItems(raw[col]);
  out.name = cleanName(
    typeof raw.name === "string" ? raw.name : raw.name && raw.name.want
  );
  return out;
}

/** 把任意輸入整理成整包合法的資料。v1 的單份會變成第一份 */
export function normalize(raw) {
  const out = emptyBook();
  if (!raw || typeof raw !== "object") return out;

  const src = Array.isArray(raw.lists) ? raw.lists : [raw];
  for (let i = 0; i < LIST_COUNT; i++) out.lists[i] = normalizeList(src[i]);

  const a = Number(raw.active);
  out.active = Number.isInteger(a) && a >= 0 && a < LIST_COUNT ? a : 0;
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
    if (!raw) return emptyBook();
    return normalize(JSON.parse(raw));
  } catch (err) {
    console.warn("[store] 讀取失敗，改用空白資料：", err);
    return emptyBook();
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

/**
 * 清空其中一份，另外兩份不動。
 * 側欄那顆鈕清的是目前這一份，不是整台裝置上的紀錄。
 */
export function clearList(book, i) {
  book.lists[i] = emptyList();
  return book;
}

/* ─────────── 匯出與匯入 ─────────── */

/** 匯出成可下載的 JSON 字串。一個檔就是三份清單的全部 */
export const toJSON = (book) => JSON.stringify(normalize(book), null, 2);

const isEmpty = (list) => !list.want.length && !list.have.length;

/**
 * 匯入。解析失敗回 null，讓呼叫端顯示錯誤而不是把資料洗掉。
 *
 * 檔案有兩種：這個版本匯出的整包（三份），以及舊版匯出的單獨一份。
 * 整包就整包換掉，單份只蓋掉目前在看的那一份，另外兩份不該被一個
 * 舊檔案清掉，所以這裡只負責分辨，要蓋哪裡由呼叫端決定。
 *
 * @returns {{kind:"book", book:object}|{kind:"list", list:object}|null}
 */
export function fromJSON(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  if (Array.isArray(parsed.lists)) {
    const book = normalize(parsed);
    // 三份都空的多半是選錯檔案，當作失敗比較安全
    if (book.lists.every(isEmpty)) return null;
    return { kind: "book", book };
  }

  const list = normalizeList(parsed);
  if (isEmpty(list)) return null;
  return { kind: "list", list };
}

/** 匯出用的檔名，帶當地日期。不用 toISOString，那是 UTC 會差一天 */
export function exportName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `poke-change-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.json`;
}
