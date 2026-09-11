/**
 * main.js — 進入點
 *
 * 唯一保管 state、唯一綁事件的檔案。
 * 資料流一律是：使用者操作 → 改 state → draw() → save()
 *
 * 事件全部用 document 委派，因為畫面是整塊重畫的，
 * 個別綁定會在重畫後失效。
 */

import { LANGS, DEFAULT_LANG, makeT } from "./i18n.js";
import { find, fullName, emptyFilter } from "./dex.js";
import * as store from "./store.js";
import * as ui from "./ui.js";
import { buildShareImage } from "./share.js";

/* ─────────── state ─────────── */

const state = {
  data: store.emptyData(),
  lang: DEFAULT_LANG,
  view: "dex", // dex / trade / bg
  filter: emptyFilter(), // 五個群組，組間 AND、組內 OR
  query: "",
  openId: null, // 詳情面板顯示的條目
  openCard: null, // 詳情面板顯示的背卡
  openFilter: false, // 詳情面板顯示篩選
  /*
   * 詳情面板上的條件草稿。按下「加入」才會變成清單裡的一筆，
   * 關掉面板就丟，不進 localStorage。同一隻配不同背卡要各收一筆，
   * 靠的就是改草稿再按一次加入。
   */
  draft: null,
  flash: null, // 剛才想加的那一筆已經在清單裡，閃一下指出是哪一筆
  /*
   * 背卡檢視自己的狀態。收納夾預設全部收合，兩百四十張一次攤開沒辦法看。
   * 跟篩選一樣不寫進偏好，重新整理回到預設，免得下次打開只剩幾張卻不知為何。
   */
  bg: { query: "", scope: "all", open: new Set() },
  big: false, // 大圖示。預設小圖示，手機一排五隻
  names: true, // 格子下方顯示名稱
  code: "", // 訓練家代碼，只印在分享圖上
};

let t = makeT(state.lang);

/* ─────────── 偏好設定 ─────────── */

/**
 * 語言、深淺色、顯示選項與訓練家代碼存在另一個 key，跟交換清單分開。
 * 這樣「清空全部」不會把語言也重設掉。
 *
 * 訓練家代碼放這裡而不是清單裡，因為它是使用者的身分，
 * 不是某一份清單的屬性。換一份清單不該要重打一次。
 */
const PREF_KEY = "poke-change/pref";

function loadPref() {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) || "{}");
    if (LANGS.some((l) => l.code === p.lang)) state.lang = p.lang;
    if (p.dark) document.body.classList.add("dark");
    state.big = !!p.big;
    // 舊的偏好沒有這個欄位，沒寫過就當成要顯示
    state.names = p.names !== false;
    state.code = store.cleanCode(p.code);
  } catch {
    /* 讀不到就用預設，不是錯誤 */
  }
  applyDisplay();
}

function savePref() {
  try {
    localStorage.setItem(
      PREF_KEY,
      JSON.stringify({
        lang: state.lang,
        dark: document.body.classList.contains("dark"),
        big: state.big,
        names: state.names,
        code: state.code,
      })
    );
  } catch {
    /* 存不了也不影響使用 */
  }
}

/*
 * 顯示選項走 body 的 class，不是傳旗標給每個繪製函式。
 * 圖鑑與交換表共用同一組格子樣式，用 CSS 切換只要改一個地方。
 */
function applyDisplay() {
  document.body.classList.toggle("big-icons", state.big);
  document.body.classList.toggle("no-names", !state.names);
}

/* ─────────── 繪製 ─────────── */

function draw() {
  ui.renderChrome(t, state.lang, { big: state.big, names: state.names });
  ui.renderViews(state.view, t);

  const isDex = state.view === "dex";
  document.querySelector("#searchbar").hidden = !isDex;

  if (state.view === "dex") {
    ui.renderFilterBtn(state.filter, t);
    const list = ui.visibleEntries(state.filter, state.query);
    document.querySelector("#viewTitle").innerHTML = `${t(
      "viewDex"
    )}<span class="dim">${t("itemCount", list.length)}</span>`;
    ui.renderGrid(list, state.data, state.lang, t);
  } else if (state.view === "trade") {
    document.querySelector("#viewTitle").textContent = t("viewTrade");
    ui.renderTrade(state.data, state.lang, t, state.code);
  } else {
    document.querySelector("#viewTitle").textContent = t("viewBg");
    ui.renderBg(state.bg, state.lang, t);
  }
}

/*
 * 三種東西共用同一個 sheet：條目詳情、背卡詳情、篩選。
 * 一次只會有一種，所以打開任一種之前要把另外兩種清掉。
 */
function drawDetail() {
  if (state.openFilter) ui.renderFilterPanel(state.filter, state.lang, t);
  else if (state.openId) {
    ui.renderDetail(
      state.openId,
      state.data,
      state.lang,
      t,
      state.draft,
      state.flash
    );
    state.flash = null; // 閃一次就好，下一次重畫不該再閃
  } else if (state.openCard) ui.renderCardDetail(state.openCard, state.lang, t);
}

function closePanels() {
  state.openId = state.openCard = null;
  state.openFilter = false;
  state.draft = state.flash = null;
  ui.closeSheet();
}

function save() {
  store.save(state.data, (ok) => {
    if (!ok) ui.toast(t("saveFailed"));
  });
}

/* ─────────── 操作 ─────────── */

/** 面板上那份條件草稿。沒有異色可收的條目不預設勾異色，不然會出現收不到的需求 */
function newDraft(id) {
  const e = find(id);
  return { shiny: !!(e && e.shinyIcon), xxl: false, xxs: false, bg: "" };
}

/**
 * 把條目加進某一欄，條件取自面板上的草稿。
 *
 * 按鈕不是開關。同一隻可以配不同背卡各收一筆，
 * 「再按一次就移除」在這種情況下沒有意義，移除走每一筆自己的刪除鈕。
 * 四個條件完全一樣的那一筆已經在清單裡就不再新增，改成閃一下指出它，
 * 因為那是手滑按兩次，不是真的想要兩格一模一樣的。
 */
function addItem(id, col) {
  const list = state.data[col];
  const d = state.draft || newDraft(id);

  const same = list.findIndex(
    (x) =>
      x.id === id &&
      (x.bg || "") === (d.bg || "") &&
      !!x.shiny === !!d.shiny &&
      !!x.xxl === !!d.xxl &&
      !!x.xxs === !!d.xxs
  );
  if (same >= 0) {
    state.flash = { col, idx: same };
    ui.toast(t("dupe"));
    drawDetail();
    return;
  }

  if (list.length >= store.MAX_ITEMS) {
    ui.toast(t("full", store.MAX_ITEMS));
    return;
  }

  const item = store.newItem(id, d.shiny);
  item.xxl = !!d.xxl;
  item.xxs = !!d.xxs;
  item.bg = d.bg || "";
  list.push(item);
  save();
  draw();
  drawDetail();
}

/** 改某一筆的標記 */
function setField(col, idx, field, value) {
  const item = state.data[col][idx];
  if (!item) return;
  item[field] = value;
  save();
}

function removeItem(col, idx) {
  state.data[col].splice(idx, 1);
  save();
  draw();
  drawDetail(); // 詳情面板開著時，被刪掉的那一列要跟著消失
}

/* ─────────── 匯出與匯入 ─────────── */

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 立刻釋放會讓部分瀏覽器來不及下載，延後一點
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function doExport() {
  const blob = new Blob([store.toJSON(state.data)], {
    type: "application/json",
  });
  download(blob, store.exportName());
  ui.toast(t("exported"));
}

function doImport(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const data = store.fromJSON(String(reader.result));
    if (!data) {
      ui.toast(t("importFailed"));
      return;
    }
    state.data = data;
    store.flush(state.data);
    ui.toast(t("imported"));
    draw();
  };
  reader.onerror = () => ui.toast(t("importFailed"));
  reader.readAsText(file);
}

function doReset() {
  if (!confirm(t("resetConfirm"))) return;
  store.clear();
  state.data = store.emptyData();
  ui.toast(t("resetDone"));
  draw();
}

/* ─────────── 分享圖 ─────────── */

async function doShare(btn) {
  const { want, have } = state.data;
  if (!want.length && !have.length) {
    ui.toast(t("shareEmpty"));
    return;
  }
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = t("sharing");
  try {
    const blob = await buildShareImage(state.data, {
      title: state.data.name.want || t("shareTitle"),
      dark: document.body.classList.contains("dark"),
      lang: state.lang,
      names: state.names,
      code: state.code,
      t,
    });
    if (!blob) throw new Error("empty blob");
    download(blob, `poke-change-${Date.now()}.png`);
    ui.toast(t("shareDone"));
  } catch (err) {
    console.error("[share] 失敗：", err);
    ui.toast(t("shareFailed"));
  }
  btn.disabled = false;
  btn.textContent = label;
}

/* ─────────── 事件 ─────────── */

document.addEventListener("click", (ev) => {
  const el = (sel) => ev.target.closest(sel);

  // 語言
  const lang = el("[data-lang]");
  if (lang) {
    state.lang = lang.dataset.lang;
    t = makeT(state.lang);
    savePref();
    draw();
    drawDetail();
    return;
  }

  // 檢視切換
  const view = el("[data-view]");
  if (view) {
    state.view = view.dataset.view;
    closePanels();
    ui.setSidebar(false);
    draw();
    return;
  }

  // 篩選
  const filter = el("[data-filter]");
  if (filter) {
    state.filter = filter.dataset.filter;
    draw();
    return;
  }

  // 側欄與遮罩
  if (el("#menuBtn")) {
    ui.setSidebar(!document.body.classList.contains("side-open"));
    return;
  }
  if (ev.target.id === "scrim") {
    ui.setSidebar(false);
    return;
  }

  // 開篩選面板
  if (el("#filterBtn")) {
    state.openId = state.openCard = null;
    state.openFilter = true;
    drawDetail();
    ui.openSheet();
    return;
  }

  // 篩選面板裡的選項。同一組可以複選，再點一次取消
  const fopt = el(".fopt[data-group]");
  if (fopt) {
    const { group, opt } = fopt.dataset;
    const picked = state.filter[group] || [];
    const i = picked.indexOf(opt);
    if (i >= 0) picked.splice(i, 1);
    else picked.push(opt);
    state.filter[group] = picked;
    draw();
    drawDetail(); // 計數會跟著變，面板要重畫
    return;
  }

  if (el("[data-fclear]")) {
    state.filter = emptyFilter();
    draw();
    drawDetail();
    return;
  }

  // 顯示選項
  const disp = el("[data-disp]");
  if (disp) {
    if (disp.dataset.disp === "big") state.big = !state.big;
    else state.names = !state.names;
    applyDisplay();
    savePref();
    draw();
    return;
  }

  // 深淺色
  if (el("#themeBtn")) {
    document.body.classList.toggle("dark");
    savePref();
    return;
  }

  // 資料按鈕
  const act = el("[data-act]");
  if (act) {
    if (act.dataset.act === "export") doExport();
    if (act.dataset.act === "import") document.querySelector("#importFile").click();
    if (act.dataset.act === "reset") doReset();
    return;
  }

  // 關閉面板
  if (el("[data-close]") || ev.target.id === "sheet") {
    closePanels();
    return;
  }

  // 詳情面板上的條件草稿
  const dmk = el(".mk[data-draft]");
  if (dmk && state.draft) {
    const f = dmk.dataset.draft;
    state.draft[f] = !state.draft[f];
    drawDetail();
    return;
  }

  // 詳情面板上的背卡。點一下選起來，點「不指定」或點同一張取消
  const pick = el("[data-pick]");
  if (pick && state.draft) {
    const id = pick.dataset.pick;
    state.draft.bg = state.draft.bg === id ? "" : id;
    drawDetail();
    return;
  }

  // 加入某一欄
  const add = el("[data-add]");
  if (add && state.openId) {
    addItem(state.openId, add.dataset.add);
    return;
  }

  // 交換表格子上的刪除鈕。要擋掉冒泡，否則會順便打開詳情面板
  const del = el("[data-del]");
  if (del && del.dataset.col) {
    ev.stopPropagation();
    removeItem(del.dataset.col, Number(del.dataset.del));
    return;
  }

  // 詳情面板裡的條件標記
  const edit = el(".d-edit[data-col]");
  if (edit) {
    const mk = el(".mk[data-field]");
    if (mk) {
      const next = mk.getAttribute("aria-pressed") !== "true";
      setField(edit.dataset.col, Number(edit.dataset.idx), mk.dataset.field, next);
      drawDetail();
      draw();
      return;
    }
  }

  // 分享
  if (el("#shareBtn")) {
    doShare(el("#shareBtn"));
    return;
  }

  // 背卡：收納夾開合
  const folder = el("[data-folder]");
  if (folder) {
    const id = folder.dataset.folder;
    if (state.bg.open.has(id)) state.bg.open.delete(id);
    else state.bg.open.add(id);
    draw();
    return;
  }

  // 背卡：全球 / 地區限定
  const scope = el("[data-bgscope]");
  if (scope) {
    state.bg.scope = scope.dataset.bgscope;
    draw();
    return;
  }

  // 背卡卡片
  const card = el("[data-card]");
  if (card) {
    state.openCard = card.dataset.card;
    state.openId = null;
    drawDetail();
    ui.openSheet();
    return;
  }

  // 圖鑑格子
  const cell = el("[data-id]");
  if (cell) {
    state.openId = cell.dataset.id;
    state.openCard = null;
    state.draft = newDraft(state.openId);
    // 從交換表點進來就指出是哪一筆，圖鑑點進來沒有對應的筆數就不閃
    state.flash = cell.dataset.col
      ? { col: cell.dataset.col, idx: Number(cell.dataset.idx) }
      : null;
    drawDetail();
    ui.openSheet();
  }
});

document.addEventListener("input", (ev) => {
  const el = ev.target;

  if (el.id === "q") {
    state.query = el.value;
    draw();
    // 重畫會換掉輸入框，把游標放回去
    const box = document.querySelector("#q");
    if (box) {
      box.value = state.query;
      box.focus();
      box.setSelectionRange(state.query.length, state.query.length);
    }
    return;
  }

  /* 背卡搜尋。跟圖鑑那個搜尋框一樣，重畫後要把游標放回去 */
  if (el.id === "bgSearch") {
    state.bg.query = el.value;
    draw();
    const box = document.querySelector("#bgSearch");
    if (box) {
      box.value = state.bg.query;
      box.focus();
      box.setSelectionRange(state.bg.query.length, state.bg.query.length);
    }
    return;
  }

  if (el.id === "listName") {
    state.data.name.want = el.value;
    save();
    return;
  }

  /*
   * 代碼只存數字，但輸入框要看到四碼一組的樣子。
   * 重寫 value 會把游標推到最前面，所以補回結尾。
   */
  if (el.id === "trainerCode") {
    state.code = store.cleanCode(el.value);
    savePref();
    const shown = store.formatCode(state.code);
    if (el.value !== shown) {
      el.value = shown;
      el.setSelectionRange(shown.length, shown.length);
    }
    return;
  }

  const edit = el.closest && el.closest(".d-edit[data-col]");
  if (edit && el.dataset.field) {
    setField(edit.dataset.col, Number(edit.dataset.idx), el.dataset.field, el.value);
    draw(); // 指定背卡會換掉格子的底圖
  }
});

document.addEventListener("change", (ev) => {
  const edit = ev.target.closest && ev.target.closest(".d-edit[data-col]");
  if (edit && ev.target.dataset.field) {
    setField(edit.dataset.col, Number(edit.dataset.idx), ev.target.dataset.field, ev.target.value);
    draw();
    return;
  }

  if (ev.target.id === "importFile") {
    const file = ev.target.files && ev.target.files[0];
    if (file) doImport(file);
    ev.target.value = ""; // 同一個檔案要能再選一次
  }
});

document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") {
    closePanels();
    ui.setSidebar(false);
  }
});

// 關閉分頁前把還沒送出的變更寫掉
window.addEventListener("pagehide", () => store.flush(state.data));

/* ─────────── 啟動 ─────────── */

loadPref();
t = makeT(state.lang);
ui.setLangs(LANGS);
state.data = store.load();
draw();
