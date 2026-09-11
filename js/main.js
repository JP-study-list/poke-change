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
import { find, fullName, emptyFilter, filterCount } from "./dex.js";
import { CARDS as BG_CARDS } from "./backgrounds.js";
import * as store from "./store.js";
import * as ui from "./ui.js";
import { buildShareImage } from "./share.js";

/** 背卡總張數。資訊列要顯示，算一次就好 */
const CARD_TOTAL = BG_CARDS.length;

/* ─────────── state ─────────── */

const state = {
  book: store.emptyBook(), // 三份清單，外加目前在看第幾份
  lang: DEFAULT_LANG,
  view: "dex", // dex / trade / bg
  filter: emptyFilter(), // 五個群組，組間 AND、組內 OR
  /*
   * 現在哪一個面板開著：null、"filter" 或 "settings"。
   * 一次只有一個，兩個下拉不會疊在一起。
   * 跟篩選本身一樣不寫進偏好，重新整理回到全部收起。
   */
  pop: null,
  query: "",
  openId: null, // 詳情面板顯示的條目
  openCard: null, // 詳情面板顯示的背卡
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
  /*
   * 交換表的加號開的那個選寶可夢面板。
   * `col` 是從哪一欄按的，`query` 是面板自己的搜尋字，
   * 跟圖鑑檢視的搜尋與篩選分開，不互相干擾。
   */
  pick: null,
  big: false, // 大圖示。預設小圖示，手機一排五隻
  names: true, // 格子下方顯示名稱
  code: "", // 訓練家代碼，只印在分享圖上
};

let t = makeT(state.lang);

/** 目前在看的那一份清單。畫面與操作一律只碰這一份 */
const cur = () => store.current(state.book);

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
  ui.renderChrome(t, state.lang, {
    big: state.big,
    names: state.names,
    dark: document.body.classList.contains("dark"),
  });
  ui.renderViews(state.view, t);

  /*
   * 設定面板在三個檢視都要開得起來，所以它的開合不能收在圖鑑那一段裡。
   * 篩選那一個在別的檢視裡連鈕都藏著，狀態切檢視時會歸零。
   */
  ui.setPop(state.pop);

  /*
   * 搜尋列只有圖鑑要。背卡有自己的搜尋與範圍切換，交換表兩樣都不需要。
   * 篩選的漏斗與面板都在這一條裡面，藏起來就一起藏。
   */
  const isDex = state.view === "dex";
  document.querySelector("#searchbar").hidden = !isDex;

  if (state.view === "dex") {
    const list = ui.visibleEntries(state.filter, state.query);
    ui.renderFilterBar(state.filter, state.lang, t);
    ui.renderFilterPanel(state.filter, state.lang, t);
    ui.renderInfoBar(
      {
        title: t("viewDex"),
        stats: [t("itemCount", list.length)],
        clear: filterCount(state.filter) > 0,
      },
      t
    );
    ui.renderGrid(list, cur(), state.lang, t);
  } else if (state.view === "trade") {
    const list = cur();
    ui.renderInfoBar(
      {
        title: t("viewTrade"),
        stats: [
          list.name || t("listTab", state.book.active + 1),
          `${t("colWant")} ${list.want.length}`,
          `${t("colHave")} ${list.have.length}`,
        ],
      },
      t
    );
    ui.renderTrade(state.book, state.lang, t, state.code);
  } else {
    ui.renderInfoBar(
      { title: t("viewBg"), stats: [t("bgCount", CARD_TOTAL)] },
      t
    );
    ui.renderBg(state.bg, state.lang, t);
  }

  /*
   * 右欄跟著重畫。它現在是版面的一部分，不是彈出來的東西，
   * 清單的數字變了就該當場反映，不能等下一次打開詳情才更新。
   */
  drawDetail();
}

/** 右欄現在有沒有東西要顯示。交換表不算，那個檢視自己就是清單 */
const railHasContent = () =>
  !!(state.openId || state.openCard || state.pick || state.view !== "trade");

/*
 * 右欄一次只顯示一種：條目詳情、背卡詳情、選寶可夢。
 * 打開任一種之前要把另外兩種清掉。
 * 篩選與設定是自己浮出來的面板，不跟這裡搶位置。
 *
 * 三種都沒有的時候顯示目前清單摘要，桌機右欄常駐，空著是浪費。
 * 但交換表例外：那個檢視本身就是清單，再擺一份摘要是同一件事說兩次，
 * 而且會出現兩顆產生分享圖。那裡整欄收起來，版面讓給格子牆。
 */
function drawDetail() {
  document.body.classList.toggle("rail-off", !railHasContent());
  if (state.openId) {
    ui.renderDetail(
      state.openId,
      cur(),
      state.lang,
      t,
      state.draft,
      state.flash,
      !!state.pick // 從加號進來的話，面板上要有返回鈕回去選別隻
    );
    state.flash = null; // 閃一次就好，下一次重畫不該再閃
  } else if (state.openCard) ui.renderCardDetail(state.openCard, state.lang, t);
  else if (state.pick) ui.renderPicker(state.pick, state.lang, t);
  else if (state.view !== "trade") ui.renderRailSummary(state.book, t);
}

/*
 * 關掉右欄正在顯示的那一種。
 *
 * 右欄現在是常駐的，清掉 state 之後一定要重畫，
 * 否則桌機上會停在剛才那個詳情，關不掉也回不到摘要。
 * 彈出的年代不必這樣做，因為整片消失就等於畫好了。
 */
function closePanels() {
  state.openId = state.openCard = null;
  state.draft = state.flash = state.pick = null;
  ui.closeSheet();
  drawDetail();
}

function save() {
  store.save(state.book, (ok) => {
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
  const list = cur()[col];
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
  // 從加號進來的是「加一隻到這一欄」，加完就該回到交換表看結果
  if (state.pick) closePanels();
  draw();
  drawDetail();
}

/** 改某一筆的標記 */
function setField(col, idx, field, value) {
  const item = cur()[col][idx];
  if (!item) return;
  item[field] = value;
  save();
}

function removeItem(col, idx) {
  cur()[col].splice(idx, 1);
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
  const blob = new Blob([store.toJSON(state.book)], {
    type: "application/json",
  });
  download(blob, store.exportName());
  ui.toast(t("exported"));
}

function doImport(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const got = store.fromJSON(String(reader.result));
    if (!got) {
      ui.toast(t("importFailed"));
      return;
    }
    /*
     * 整包的檔案就整包換掉；舊版匯出的單獨一份只蓋掉目前在看的這一份，
     * 不能讓一個舊檔案把另外兩份一起清掉。
     */
    if (got.kind === "book") {
      state.book = got.book;
      ui.toast(t("imported"));
    } else {
      state.book.lists[state.book.active] = got.list;
      ui.toast(t("importedOne"));
    }
    store.flush(state.book);
    closePanels();
    draw();
  };
  reader.onerror = () => ui.toast(t("importFailed"));
  reader.readAsText(file);
}

/** 只清目前這一份，另外兩份不動 */
function doReset() {
  if (!confirm(t("resetConfirm", listLabel(state.book.active)))) return;
  store.clearList(state.book, state.book.active);
  store.flush(state.book);
  ui.toast(t("resetDone"));
  closePanels();
  draw();
}

/** 分頁上顯示的名字。沒取名就叫「清單 1」，總得有東西可以指 */
function listLabel(i) {
  return state.book.lists[i].name || t("listTab", i + 1);
}

/* ─────────── 分享圖 ─────────── */

async function doShare(btn) {
  const { want, have } = cur();
  if (!want.length && !have.length) {
    ui.toast(t("shareEmpty"));
    return;
  }
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = t("sharing");
  try {
    const blob = await buildShareImage(cur(), {
      title: cur().name || t("shareTitle"),
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

  /*
   * 點面板外面就關掉那個面板。
   *
   * 放在最前面，因為底下每一段處理完都會 return，
   * 收在最後就只有「點到空白處」那一種情況執行得到。
   * 兩個面板自己與那兩顆鈕不算外面，連選幾個條件時面板不該關。
   * 這裡不 return，這一下點到的東西照常處理。
   */
  if (state.pop && !el(ui.POP_PARTS)) {
    state.pop = null;
    ui.setPop(null);
  }

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
    state.pop = null;
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

  // 篩選的漏斗與設定的齒輪。同一顆再按一次就收起來
  const pop = el("#filterBtn") ? "filter" : el("#gearBtn") ? "settings" : null;
  if (pop) {
    state.pop = state.pop === pop ? null : pop;
    ui.setPop(state.pop);
    return;
  }

  // 面板底部的完成鈕。桌機點外面就關了，這顆是給手機抽屜用的
  if (el("[data-fclose]")) {
    state.pop = null;
    ui.setPop(null);
    return;
  }

  // 搜尋列上的已選條件。點一下只移除那一個
  const fdrop = el("[data-fdrop]");
  if (fdrop) {
    const { group, opt } = fdrop.dataset;
    state.filter[group] = (state.filter[group] || []).filter((k) => k !== opt);
    draw();
    drawDetail();
    return;
  }

  // 面板裡的篩選選項。同一組可以複選，再點一次取消
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
    const which = disp.dataset.disp;
    if (which === "big") state.big = !state.big;
    else if (which === "names") state.names = !state.names;
    else document.body.classList.toggle("dark");
    applyDisplay();
    savePref();
    draw();
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
  // 分享圖。交換表與右欄摘要各有一顆，走同一個路徑
  const shareBtn = el("[data-share]");
  if (shareBtn) {
    doShare(shareBtn);
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

  // 交換表的清單分頁
  const tab = el("[data-list]");
  if (tab) {
    const i = Number(tab.dataset.list);
    if (i !== state.book.active) {
      state.book.active = i;
      save();
      closePanels();
      draw();
    }
    return;
  }

  // 交換表格子牆最後那一格加號
  const addcell = el("[data-addcell]");
  if (addcell) {
    state.pick = { col: addcell.dataset.addcell, query: "" };
    state.openId = state.openCard = null;
    state.draft = state.flash = null;
    drawDetail();
    ui.openSheet();
    return;
  }

  // 從加號選了一隻之後，回去選別隻
  if (el("[data-pickback]")) {
    state.openId = null;
    state.draft = state.flash = null;
    drawDetail();
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

  if (el.id === "pickQ" && state.pick) {
    state.pick.query = el.value;
    drawDetail();
    // 重畫會換掉輸入框，把游標放回去
    const box = document.querySelector("#pickQ");
    if (box) {
      box.focus();
      box.setSelectionRange(state.pick.query.length, state.pick.query.length);
    }
    return;
  }

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
    cur().name = el.value;
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
    state.pop = null;
    ui.setPop(null);
  }
});

// 關閉分頁前把還沒送出的變更寫掉
window.addEventListener("pagehide", () => store.flush(state.book));

/* ─────────── 啟動 ─────────── */

loadPref();
t = makeT(state.lang);
ui.setLangs(LANGS);
state.book = store.load();
draw();
