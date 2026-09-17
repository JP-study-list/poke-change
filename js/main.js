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
import { emptyFilter, filterCount, knownItems, find, hasShiny } from "./dex.js";
import { CARDS as BG_CARDS, cardAllows } from "./backgrounds.js";
import * as store from "./store.js";
import * as ui from "./ui.js";
import { buildShareImage } from "./share.js";
import { searchString, STR_LANGS } from "./gostring.js";

/** 背卡總張數。資訊列要顯示，算一次就好 */
const CARD_TOTAL = BG_CARDS.length;

/* ─────────── state ─────────── */

const state = {
  book: store.emptyBook(), // 三份清單，外加目前在看第幾份
  lang: DEFAULT_LANG,
  /*
   * 搜尋字串裡的關鍵字要用哪一國的字。「auto」是跟介面語言走，也是預設。
   * **跟 lang 分開存**：那串字是給對方貼進他自己的遊戲的，
   * 我的介面是繁中不代表對方的遊戲也是。
   */
  goLang: "auto",
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
   * `open` 是篩選表展開了沒，`sel` 是多選模式下選起來的那些 id。
   * 關掉面板就整個丟掉。
   */
  pick: null,
  /*
   * 複製搜尋字串的確認面板。按下交換表那顆複製鈕時算好一包放這裡
   * （`{ col, str, count, dropped, long }`），**還沒有寫進剪貼簿**，
   * 要窗裡那顆鈕按下去才寫。跟 pick 一樣關掉就丟。
   */
  copy: null,
  /*
   * 那個面板的篩選與多選模式。**刻意放在 pick 外面**：
   * pick 關一次就沒了，而這兩個要記到下一次按加號，
   * 不然每加一批都要重篩一次。跟篩選一樣不寫進偏好，重整回到預設。
   *
   * 也刻意不跟圖鑑的 `filter` 共用：兩邊在做的事不一樣，
   * 在圖鑑篩了只看傳說，按加號看到一片空白是找不出原因的。
   */
  pickFilter: emptyFilter(),
  pickMulti: false,
  /*
   * 多選時「這一批都要異色」。跟上面兩個同一個理由放在 pick 外面，
   * 而且切回單選也不清掉——連加兩批異色不該要按第二次。
   * 只有異色做批次：XXL／XXS 是個體大小，不會一批十隻都要。
   */
  pickShiny: false,
  /*
   * 背卡詳情的多選。跟加號那個面板是兩套：那邊選的是「加哪幾隻」，
   * 這邊選的是「這張卡要收哪幾隻」，加進去時自動帶這張卡。
   * 選取跟著卡片走，換一張就清掉——不同卡的清單根本不是同一批寶可夢。
   * 模式本身記著，一張一張卡收下去不必每張都再按一次。
   */
  bgMulti: false,
  bgSel: [],
  /*
   * 交換表的編輯模式，兩欄各自一個。開著時格子上會出現刪除鈕——
   * 觸控裝置平常不放那顆，常駐就是滿畫面的紅點。
   * 跟篩選一樣不寫進偏好，重新整理回到關著。
   */
  edit: { want: false, have: false },
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
    if (p.goLang === "auto" || STR_LANGS.includes(p.goLang)) state.goLang = p.goLang;
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
        goLang: state.goLang,
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
    goLang: state.goLang,
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
          `${t("colWant")} ${knownItems(list.want).length}`,
          `${t("colHave")} ${knownItems(list.have).length}`,
        ],
      },
      t
    );
    ui.renderTrade(state.book, state.lang, t, state.code, state.edit);
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

/*
 * 選寶可夢面板要的那一包。`state.pick` 只裝這一次開啟的東西
 * （哪一欄、打了什麼、選了誰），篩選、多選與異色刻意放在它外面才記得住，
 * 要畫的時候再合起來。只重畫底部那一列時也要同一包，所以抽成函式。
 */
const pickView = () => ({
  ...state.pick,
  filter: state.pickFilter,
  multi: state.pickMulti,
  shiny: state.pickShiny,
});

/*
 * 右欄一次只顯示一種：條目詳情、背卡詳情、選寶可夢。
 * 打開任一種之前要把另外兩種清掉。
 * 篩選與設定是自己浮出來的面板，不跟這裡搶位置。
 *
 * **三個檢視一律彈出**（2026-09-14，使用者要求）。在那之前背卡是常駐的，
 * 因為它沒點卡片時擺目前清單的摘要；現在那塊摘要整個拿掉了，
 * 分享圖的入口本來就在交換表裡，右欄不必替它留一份。
 */
function drawDetail() {
  /*
   * 底部動作列在捲動區外面，換內容不會把它一起換掉，
   * 所以每次重畫先清乾淨，要用的那個面板自己再填回去。
   */
  ui.railFoot("");
  /*
   * 多選時把彈窗放寬成一排五隻。三欄挑二十隻要捲七排，捲動本身就是瓶頸。
   * 切在 body 上是因為寬度寫在 .rail-inner，那一層沒有自己的狀態。
   */
  document.body.classList.toggle(
    "pick-wide",
    !!(state.pick && state.pickMulti)
  );
  if (state.openId) {
    ui.renderDetail(
      state.openId,
      cur(),
      state.lang,
      t,
      state.draft,
      state.flash,
      // 從加號進來的是哪一欄。有值就多一顆返回鈕，而且底部只畫那一欄的加入鈕
      state.pick ? state.pick.col : ""
    );
    state.flash = null; // 閃一次就好，下一次重畫不該再閃
  } else if (state.openCard)
    ui.renderCardDetail(state.openCard, state.lang, t, {
      multi: state.bgMulti,
      sel: state.bgSel,
      shiny: state.pickShiny,
    });
  else if (state.pick) {
    /*
     * 整片重畫一定從第一批開始。打字、改篩選、切多選走的都是這裡，
     * 而 `#panel` 換掉 innerHTML 時 scrollTop 本來就歸零——
     * 留著長出來的筆數只是在看不到的地方畫一堆格子。
     * 接下一批走的是 growPicker，不經過這裡。
     */
    state.pick.shown = 0;
    ui.renderPicker(pickView(), state.lang, t);
  }
  else if (state.copy) ui.renderCopy(state.copy, t);
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
  state.draft = state.flash = state.pick = state.copy = null;
  ui.closeSheet();
  drawDetail();
}

function save() {
  store.save(state.book, (ok) => {
    if (!ok) ui.toast(t("saveFailed"));
  });
}

/* ─────────── 操作 ─────────── */

/**
 * 一次只能亮一個的那幾個條件。
 *
 * 超極巨化本來就蘊含極巨化；淨化與那兩個在遊戲裡湊不出來——
 * 暗影寶可夢不能參加 Max Battle，而極巨化只能從那裡抓到。
 * 而且格子右上角只放得下一顆徽章。
 *
 * 三條路都吃這一份：草稿、已加入那筆的 setField，
 * 還有 store.js 的 cleanItem（localStorage 使用者改得到）。
 */
const EXCLUSIVE = ["max", "gmax", "purified"];

/**
 * 面板上那份條件草稿。
 *
 * 六個條件一律從「沒有」開始。異色曾經在有異色圖時預設勾起來，
 * 但大多數交換談的是一般色，預設勾著等於每次都要先取消；
 * 而且詳情面板上方那張圖現在跟著這個值走，一開就是異色會看錯是哪一隻。
 *
 * max 與 purified 不管條目能不能都帶著。不能的條目根本不會畫出那顆鈕
 * （`ui.js` 看 `canMax` / `canPurify`），草稿裡多一個永遠是 false 的
 * 欄位比讓兩邊各自判斷一次安全。
 */
function newDraft(bg = "") {
  return { shiny: false, xxl: false, xxs: false, max: false, gmax: false, purified: false, bg };
}

/**
 * 把條目加進某一欄，條件取自面板上的草稿。
 *
 * 按鈕不是開關。同一隻可以配不同背卡各收一筆，
 * 「再按一次就移除」在這種情況下沒有意義，移除走每一筆自己的刪除鈕。
 * 五個條件完全一樣的那一筆已經在清單裡就不再新增，改成閃一下指出它，
 * 因為那是手滑按兩次，不是真的想要兩格一模一樣的。
 */
function addItem(id, col) {
  const list = cur()[col];
  const d = state.draft || newDraft();

  const same = list.findIndex(
    (x) =>
      x.id === id &&
      (x.bg || "") === (d.bg || "") &&
      !!x.shiny === !!d.shiny &&
      !!x.xxl === !!d.xxl &&
      !!x.xxs === !!d.xxs &&
      !!x.max === !!d.max &&
      !!x.gmax === !!d.gmax &&
      !!x.purified === !!d.purified
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
  item.max = !!d.max;
  item.gmax = !!d.gmax;
  item.purified = !!d.purified;
  item.bg = d.bg || "";
  list.push(item);
  save();
  // 從加號進來的是「加一隻到這一欄」，加完就該回到交換表看結果
  if (state.pick) closePanels();
  draw();
  drawDetail();
}

/**
 * 多選模式一次加進某一欄。
 *
 * 背卡一律不帶，逐隻配背卡是單選那條路在做的事；異色則可以整批帶，
 * 底部那顆開關開著就全部要異色。一批十隻常常整批都是異色，
 * 但一批十隻不會整批都是 XXL，所以只有異色做成批次。
 *
 * **沒有異色的那幾隻照一般色加進去**，不略過（2026-09-13，使用者確認）。
 * 1460 筆裡有 50 筆沒有實裝異色，開著異色選到那幾隻時，
 * 略過等於默默少了幾隻，照加至少東西在清單裡，差在 toast 講明白。
 *
 * 三件事會讓某一隻加不進去，都不擋整批：
 * 完全相同的那一筆已經在清單裡（跟單選同一條規則）、那一欄滿了、
 * 以及 id 在圖鑑裡已經不存在。結果用一則 toast 講完，不逐隻跳。
 */
function addMany(col, ids, { shiny = false, bg = "", stay = false } = {}) {
  const list = cur()[col];
  let added = 0;
  let dupe = 0;
  let noShiny = 0;
  let full = false;

  for (const id of ids) {
    if (list.length >= store.MAX_ITEMS) {
      full = true;
      break;
    }
    const e = find(id);
    if (!e) continue;
    // 沒有實裝異色的就算開著也只能一般色，重複判斷要拿實際會寫進去的值去比
    const wantShiny = !!shiny && hasShiny(e);
    // 極巨化、超極巨化與淨化跟 XXL／XXS 一樣不做批次，所以這裡比的是「沒有勾」
    const same = list.some(
      (x) =>
        x.id === id &&
        x.bg === bg &&
        !!x.shiny === wantShiny &&
        !x.xxl &&
        !x.xxs &&
        !x.max &&
        !x.gmax &&
        !x.purified
    );
    if (same) {
      dupe++;
      continue;
    }
    const item = store.newItem(id, wantShiny);
    item.xxl = item.xxs = item.max = item.gmax = item.purified = false;
    item.bg = bg;
    list.push(item);
    added++;
    if (shiny && !wantShiny) noShiny++;
  }

  if (added) save();

  const msg = [
    added ? t("pickAdded", added) : "",
    dupe ? t("pickDupe", dupe) : "",
    noShiny ? t("pickNoShiny", noShiny) : "",
    full ? t("full", store.MAX_ITEMS) : "",
  ].filter(Boolean);
  if (msg.length) ui.toast(msg.join(" · "));

  /*
   * 從背卡進來的留在原地：使用者還在看這張卡，多半接著挑另一欄要哪幾隻。
   * 選取清掉、勾圈要跟著消失，所以整片重畫，但把捲動位置放回去——
   * 一張卡七十幾格，加完彈回最上面等於要重找剛才看到哪裡。
   */
  if (stay) {
    const panel = document.querySelector("#panel");
    const y = panel ? panel.scrollTop : 0;
    state.bgSel = [];
    draw();
    drawDetail();
    const after = document.querySelector("#panel");
    if (after) after.scrollTop = y;
    return;
  }

  // 從加號進來的回交換表看結果，跟單選一樣。篩選留著，下次按加號還在
  closePanels();
  draw();
}

/** 改某一筆的標記 */
function setField(col, idx, field, value) {
  const item = cur()[col][idx];
  if (!item) return;
  item[field] = value;
  // 三個互斥，跟草稿那邊同一條規則
  if (value && EXCLUSIVE.includes(field)) {
    for (const f of EXCLUSIVE) if (f !== field) item[f] = false;
    /*
     * 條件與背卡配不上的話退回「不指定」。極巨化只能從 Max Battle 抓到、
     * 淨化只能從火箭隊或暗影團戰抓到，野生或團戰拿到的卡湊不出這些組合。
     * 留著的話畫面上會有一個點不到、也取消不掉的選取。
     */
    if (item.bg && !cardAllows(item.bg, item.id, field)) item.bg = "";
  }
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

/* ─────────── 搜尋字串 ─────────── */

/**
 * 把一欄變成 GO 的搜尋字串，寫進剪貼簿。
 *
 * 用的人是**收到字串的那一方**：他貼進自己的寶可夢搜尋框，
 * 就知道手上有沒有我們想要的。搜尋只搜得到自己的箱子，
 * 所以這顆鈕的產物是要傳出去的，不是自己看的。
 *
 * 複製走 Clipboard API。它要求安全內容（HTTPS 或 localhost）與使用者手勢，
 * 兩個條件在這裡都成立——線上是 GitHub Pages，本機是 localhost，
 * 而這段本來就跑在 click 裡。舊 iOS Safari 沒有這個 API，
 * 退回藏起來的 textarea 加 execCommand。
 */
function openCopy(col) {
  /*
   * 關鍵字要用**對方遊戲**的語言。預設跟介面走，因為台灣人跟台灣人
   * 換是常態；要傳給日本人的那次去設定改一下，值會記著。
   */
  const lang = state.goLang === "auto" ? state.lang : state.goLang;
  const res = searchString(cur()[col], lang);
  if (!res.str) return;

  /*
   * **這裡不寫剪貼簿**（2026-09-17，使用者要求）。先把字串攤在面板上，
   * 按了窗裡那顆鈕才是真的複製。
   *
   * 兩個提醒也跟著搬過去，理由是它們在 toast 裡出現得太晚：
   *   dropped  有幾隻的條件為了塞進一行被放掉了（搜出來會多幾隻，但不會漏）
   *   long     連純編號都超過 SEARCH_MAX，只能請他自己看一眼結尾
   * 複製前就看得到的話，還來得及決定要不要複製，或回去減幾隻再來。
   *
   * long 那條一樣不切字串：那個上限是還沒實測的保守值，拿猜的數字去切，
   * 切錯了是靜默少一半；讓使用者看得見，錯了至少發現得了。
   */
  state.copy = { col, ...res };
  state.openId = state.openCard = null;
  state.draft = state.flash = state.pick = null;
  drawDetail();
  ui.openSheet();
}

/** 窗裡那顆鈕。走到這裡才真的寫剪貼簿，寫完就收掉 */
async function doCopy() {
  if (!state.copy) return;
  const { str, count } = state.copy;

  const ok = await writeClipboard(str);
  if (!ok) {
    // 失敗不關窗：字串還在畫面上，使用者可以自己選取複製
    ui.toast(t("copyFailed"));
    return;
  }

  closePanels();
  ui.toast(t("copiedStr", count));
}

/** 寫剪貼簿。成功回 true，兩條路都失敗回 false */
async function writeClipboard(str) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(str);
      return true;
    }
  } catch {
    /* 沒有權限或使用者拒絕，往下退回舊做法 */
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = str;
    // 不能用 display:none，那樣選不到字；移出畫面外才選得到又看不見
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
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
   *
   * 設定是置中的彈窗，它那片遮罩在 DOM 上就是 `#settings` 自己，
   * 所以「點在面板裡面」這個判斷擋不掉它，得另外認 target 是不是遮罩本身。
   * 右上角那顆 X 走 `data-closepop`，不跟右欄的 `data-close` 共用，
   * 那一顆管的是右欄，按下去會連詳情一起收掉。
   */
  const onScrim = ev.target.id === "settings";
  if (state.pop && (!el(ui.POP_PARTS) || onScrim || el("[data-closepop]"))) {
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

  /*
   * 搜尋字串的語言。只重畫設定面板那一條，不必動整個畫面——
   * 它不影響任何已經畫出來的東西，只影響下一次按複製產出什麼。
   */
  const goLang = el("[data-golang]");
  if (goLang) {
    state.goLang = goLang.dataset.golang;
    savePref();
    draw();
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
    /*
     * 兩張縮圖各代表一個值，所以是「設成這個值」不是 toggle——
     * 點已經選中的那張把它關掉，畫面會變成兩張都沒選。
     */
    const which = disp.dataset.disp;
    const val = disp.dataset.val === "1";
    if (which === "big") state.big = val;
    else if (which === "names") state.names = val;
    else document.body.classList.toggle("dark", val);
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
    /*
     * 三個互斥：超極巨化本來就蘊含極巨化，而淨化跟極巨化在遊戲裡
     * 湊不出來（暗影寶可夢不能參加 Max Battle）。而且格子右上角
     * 只放得下一顆徽章。開一個就把另外兩個關掉。
     */
    if (state.draft[f] && EXCLUSIVE.includes(f)) {
      for (const x of EXCLUSIVE) if (x !== f) state.draft[x] = false;
      /*
       * 下面那份背卡清單跟著縮成配得上的那幾張，已經選著的那張
       * 如果不在裡面就退回「不指定」——留著的話畫面上會有一個
       * 點不到、也取消不掉的選取。
       */
      if (state.draft.bg && !cardAllows(state.draft.bg, state.openId, f))
        state.draft.bg = "";
    }
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
  // 欄標題那顆複製鈕。把那一欄變成 GO 的搜尋字串傳給對方
  const copyBtn = el("[data-copy]");
  if (copyBtn) {
    openCopy(copyBtn.dataset.copy);
    return;
  }

  // 複製面板底部那顆鈕。Clipboard API 要使用者手勢，這裡仍在 click 裡
  if (el("[data-docopy]")) {
    doCopy();
    return;
  }

  // 欄標題那顆鉛筆。只切換自己那一欄，另一欄不受影響
  const pencil = el("[data-edit]");
  if (pencil) {
    const col = pencil.dataset.edit;
    state.edit[col] = !state.edit[col];
    draw();
    return;
  }

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
    // 換一張卡就清掉選取，兩張卡的清單不是同一批，留著只會加錯
    if (state.openCard !== card.dataset.card) state.bgSel = [];
    state.openCard = card.dataset.card;
    state.openId = state.copy = null;
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
    // shown 是分段畫到第幾筆。0 表示還沒長過，ui 會當第一批
    state.pick = { col: addcell.dataset.addcell, query: "", open: false, sel: [], shown: 0 };
    state.openId = state.openCard = state.copy = null;
    state.draft = state.flash = null;
    drawDetail();
    ui.openSheet();
    return;
  }

  /*
   * 選寶可夢面板自己的漏斗。展開的是排在流排裡的一段，不是浮出來的面板，
   * 所以不走 state.pop——那個字串管的是頂部列的漏斗與齒輪，
   * 混用會變成「在這裡點篩選就把設定面板關掉」。
   * 底下那顆「完成」共用同一個屬性，點了就是收起來。
   */
  if (el("[data-pickfilter]") && state.pick) {
    state.pick.open = !state.pick.open;
    drawDetail();
    return;
  }

  // 單選與多選切換。換模式就把選起來的清掉，免得看不見的選取被一起加進去
  if (el("[data-pickmulti]") && state.pick) {
    state.pickMulti = !state.pickMulti;
    state.pick.sel = [];
    drawDetail();
    return;
  }

  // 面板裡的篩選選項。同一組可以複選，再點一次取消
  const popt = el(".fopt[data-pgroup]");
  if (popt) {
    const { pgroup, popt: key } = popt.dataset;
    const picked = state.pickFilter[pgroup] || [];
    const i = picked.indexOf(key);
    if (i >= 0) picked.splice(i, 1);
    else picked.push(key);
    state.pickFilter[pgroup] = picked;
    drawDetail(); // 計數跟著變，整片要重畫
    return;
  }

  // 面板上的已選條件。點一下只移除那一個
  const pdrop = el("[data-pdrop]");
  if (pdrop) {
    const { pgroup, popt: key } = pdrop.dataset;
    state.pickFilter[pgroup] = (state.pickFilter[pgroup] || []).filter(
      (k) => k !== key
    );
    drawDetail();
    return;
  }

  if (el("[data-pclear]")) {
    state.pickFilter = emptyFilter();
    drawDetail();
    return;
  }

  /*
   * 整批異色開關。跟點格子同一個道理只重畫底部那一列：
   * 走 drawDetail() 會把格子牆的捲動位置歸零，而按這顆的時機
   * 多半是已經往下選了一段。
   */
  if (el("[data-pickshiny]")) {
    state.pickShiny = !state.pickShiny;
    // 兩個地方共用這顆開關，重畫的是自己那一條動作列
    if (state.pick)
      ui.renderPickFoot(
        state.pick.sel.length,
        t,
        state.pickShiny,
        ui.pickHidden(pickView())
      );
    else if (state.openCard) ui.renderBgFoot(state.bgSel.length, t, state.pickShiny);
    return;
  }

  // 背卡詳情的多選開關。換模式就把選起來的清掉，跟加號那邊同一條規則
  if (el("[data-bgmulti]") && state.openCard) {
    state.bgMulti = !state.bgMulti;
    state.bgSel = [];
    drawDetail();
    return;
  }

  /*
   * 背卡詳情多選時的兩顆加入鈕。整批自動帶這張背卡。
   * 加完留在原地（stay）：使用者還在看這張卡，常常是想要幾隻之後
   * 再挑可以給的幾隻，跳去交換表等於要自己找回來。
   */
  const addbg = el("[data-addbg]");
  if (addbg && state.openCard) {
    addMany(addbg.dataset.addbg, state.bgSel, {
      shiny: state.pickShiny,
      bg: state.openCard,
      stay: true,
    });
    return;
  }

  // 多選模式下，底部那顆一次加進整批
  if (el("[data-addmulti]") && state.pick) {
    addMany(state.pick.col, state.pick.sel, { shiny: state.pickShiny });
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
    /*
     * 多選模式下，選寶可夢面板的格子是勾選不是開詳情。
     * 只認那個面板自己的格子，交換表與圖鑑的格子照舊開詳情。
     */
    if (state.pick && state.pickMulti && cell.dataset.pickcell) {
      const id = cell.dataset.id;
      const i = state.pick.sel.indexOf(id);
      if (i >= 0) state.pick.sel.splice(i, 1);
      else state.pick.sel.push(id);
      /*
       * 只改那一格與底部的數字，不走 drawDetail()。
       * 整片重畫會把捲動位置歸零，選到第七排點一下就彈回最上面，
       * 而「一次選很多隻」正是要一路往下選。
       */
      cell.classList.toggle("picked", i < 0);
      cell.setAttribute("aria-pressed", String(i < 0));
      // 點得到的格子一定看得到，藏起來的數字不會變，但值仍由同一條路算
      ui.renderPickFoot(
        state.pick.sel.length,
        t,
        state.pickShiny,
        ui.pickHidden(pickView())
      );
      return;
    }
    /*
     * 背卡詳情的多選也是勾選不是開詳情。跟加號那邊一樣只改那一格，
     * 一張卡最多七十幾格，重畫整片同樣會把捲動位置歸零。
     */
    if (state.openCard && state.bgMulti && cell.dataset.bgcell) {
      const id = cell.dataset.id;
      const i = state.bgSel.indexOf(id);
      if (i >= 0) state.bgSel.splice(i, 1);
      else state.bgSel.push(id);
      cell.classList.toggle("picked", i < 0);
      cell.setAttribute("aria-pressed", String(i < 0));
      ui.renderBgFoot(state.bgSel.length, t, state.pickShiny);
      return;
    }
    /*
     * 從背卡詳情點一隻進去，草稿先配好剛才那張卡——
     * 使用者就是在那張卡的清單裡點的，再叫他自己從下拉挑一次同一張很沒道理。
     */
    state.draft = newDraft(state.openCard || "");
    state.openId = cell.dataset.id;
    state.openCard = state.copy = null;
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

/*
 * 選寶可夢面板捲到底就接下一批（2026-09-18，使用者要求）。
 *
 * **scroll 不冒泡**，所以用 capture 在 document 上接，再認是不是 `#panel`。
 * 這樣仍然是單一委派，不必替面板綁一顆自己的監聽、也不必在關面板時解掉。
 *
 * 距底 400px 就接，不等真的碰到底——接的那一下要在使用者捲到空白之前
 * 完成，看到底了才開始長就已經晚了。
 *
 * 哨兵是底部那一行「還有 N 筆」：它不在就表示接完了，直接退出。
 * 用元素在不在判斷而不是自己算，是因為那一行本來就由 growPicker 維護，
 * 兩邊各算一次遲早會講不同的話。
 */
document.addEventListener(
  "scroll",
  (ev) => {
    const el = ev.target;
    if (!state.pick || !el || el.id !== "panel") return;
    if (!document.querySelector("[data-pickrest]")) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight > 400) return;
    state.pick.shown = ui.growPicker(pickView(), state.lang, t);
  },
  true
);

// 關閉分頁前把還沒送出的變更寫掉
window.addEventListener("pagehide", () => store.flush(state.book));

/* ─────────── 啟動 ─────────── */

loadPref();
t = makeT(state.lang);
ui.setLangs(LANGS);
state.book = store.load();
draw();
