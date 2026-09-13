/**
 * ui.js — 全部繪製函式
 *
 * 只把資料變成畫面，不決定資料怎麼變。
 * 不碰 localStorage、不改 state，那是 main.js 的事。
 *
 * 三個檢視共用這個檔：圖鑑、交換表、背卡。
 */

import {
  ENTRIES,
  find,
  knownItems,
  fullName,
  speciesName,
  formName,
  iconAttrs,
  hasShiny,
  FILTER_GROUPS,
  applyFilter,
  filterCount,
  search,
} from "./dex.js";
import { typeInfo } from "./types.js";
import {
  FOLDERS,
  allCards,
  entriesOf,
  cardsFor,
  findCard,
  bgAttrs,
  bgUrl,
  cardName,
  folderName,
} from "./backgrounds.js";
import { MAX_ITEMS, formatCode } from "./store.js";
import { VERSION, VERSION_DATE } from "./version.js";

const $ = (sel) => document.querySelector(sel);

/** HTML 逸出。條目名稱來自官方語言檔，備註來自使用者，兩者都要過 */
export function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

/* ─────────── 版面 ─────────── */

export function renderChrome(t, lang, disp = {}) {
  document.documentElement.lang = t("htmlLang");
  $("#appName").textContent = t("appName");
  $("#subtitle").textContent = t("subtitle");
  $("#q").placeholder = t("search");
  // 只有圖示的鈕，名字得靠 aria-label 與 title 給
  for (const [sel, key] of [
    ["#filterBtn", "filterBtn"],
    ["#gearBtn", "settings"],
    ["#closeX", "close"],
    ["#settingsX", "close"],
  ]) {
    $(sel).setAttribute("aria-label", t(key));
    $(sel).setAttribute("title", t(key));
  }
  $("#displayTitle").textContent = t("display");
  $("#dataTitle").textContent = t("data");

  /*
   * 三個顯示選項用 aria-pressed 表示開關，實際的版面切換靠
   * body 的 class，這樣圖鑑與交換表不必各自傳一個旗標下去。
   * 深淺色原本是頂部列一顆圖示鈕，現在跟另外兩個開關排在一起：
   * 它也是「畫面要長什麼樣」，不是一個獨立的功能。
   */
  $("#displayOpts").innerHTML = [
    ["big", t("bigIcons"), disp.big],
    ["names", t("showNames"), disp.names],
    ["dark", t("theme"), disp.dark],
  ]
    .map(
      ([k, label, on]) =>
        `<button type="button" data-disp="${k}" aria-pressed="${!!on}">
          <span class="ic" aria-hidden="true">
            <svg viewBox="0 0 24 24">${dispIcon(k, !!on)}</svg>
          </span>${esc(label)}
        </button>`
    )
    .join("");
  $("#localNotice").innerHTML = `<strong>${esc(t("localOnly"))}</strong>${esc(
    t("localHint")
  )}`;

  $("#langs").innerHTML = LANG_BTNS(lang);
  $("#dataActions").innerHTML = `
    <button type="button" data-act="export">${esc(t("export"))}</button>
    <button type="button" data-act="import">${esc(t("import"))}</button>
    <button type="button" class="danger" data-act="reset">${esc(t("reset"))}</button>`;

  // 版本號。只有標籤翻譯，號碼與日期三語共用同一個寫法
  $("#verLine").textContent = `${t("version")} ${VERSION} · ${VERSION_DATE}`;
}

let LANG_LIST = [];
export const setLangs = (langs) => (LANG_LIST = langs);

const LANG_BTNS = (cur) =>
  LANG_LIST.map(
    (l) =>
      `<button type="button" data-lang="${l.code}" aria-pressed="${
        l.code === cur
      }">${esc(l.label)}</button>`
  ).join("");

/*
 * 三個檢視的圖示。手機的底部 bar 只放得下圖示加一行小字，
 * 光有文字的 bar 認不出來，所以每個檢視都要有自己的形狀。
 * 圖鑑是格子牆、交換表是兩個對向的箭頭、背卡是一張圖。
 */
const VIEW_ICONS = {
  dex: `<rect x="3.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />`,
  trade: `<path d="M4 9h13l-3.5-3.5M20 15H7l3.5 3.5" />`,
  bg: `<rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="M2.5 15.5l5-4.5 4 3.5 3.5-3 6.5 5.5" /><circle cx="8.5" cy="9" r="1.6" />`,
};

/*
 * 設定面板那三個顯示選項的圖示（2026-09-14，使用者要求）。
 *
 * 圖示本身就是開關：關著是線條加淡框，開著填成金色。原本只有一個
 * 方框打勾，三項長得一模一樣，得靠讀字才知道自己在開什麼。
 *
 * 深色模式的圖示**跟著狀態換**，太陽與月亮：那一項的兩個狀態各自
 * 有公認的樣子，只換顏色等於浪費了這件事。另外兩項沒有這種對照，
 * 硬要換只會變成兩個都看不懂的圖。
 */
const DISP_ICONS = {
  big: `<rect x="2.8" y="4" width="11.4" height="11.4" rx="2.6" /><rect x="16.2" y="13.6" width="5" height="5" rx="1.4" />`,
  names: `<rect x="4.5" y="3.2" width="15" height="9.6" rx="2.2" /><path d="M4.5 16.8h15M7.5 20.4h9" />`,
  darkOn: `<path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 7.2 7.2 0 1 0 20 14.2z" />`,
  darkOff: `<circle cx="12" cy="12" r="4" /><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />`,
};

const dispIcon = (k, on) =>
  k === "dark" ? (on ? DISP_ICONS.darkOn : DISP_ICONS.darkOff) : DISP_ICONS[k];

/** 檢視切換。桌機在頂部列，900 以下是貼底的 bar，同一段 DOM */
export function renderViews(view, t) {
  const items = [
    ["dex", t("viewDex")],
    ["trade", t("viewTrade")],
    ["bg", t("viewBg")],
  ];
  $("#views").innerHTML = items
    .map(
      ([k, label]) =>
        `<button type="button" data-view="${k}" aria-pressed="${k === view}">
          <svg viewBox="0 0 24 24" aria-hidden="true">${VIEW_ICONS[k]}</svg>
          <span>${esc(label)}</span>
        </button>`
    )
    .join("");
}

let toastTimer = null;

export function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2600);
}

export function openSheet() {
  $("#sheet").classList.add("is-open");
  $("#sheet").setAttribute("aria-hidden", "false");
}

export function closeSheet() {
  $("#sheet").classList.remove("is-open");
  $("#sheet").setAttribute("aria-hidden", "true");
}

export const isSheetOpen = () => $("#sheet").classList.contains("is-open");

/* ─────────── 資訊列與篩選 ─────────── */

/**
 * 資訊列。頂部列下面那一條，寫「你現在在看哪一批」。
 *
 * 原本這些資訊是內容區裡一行 15px 的小標題，跟格子裡的名稱一樣大，
 * 看不出是標題。現在它是一條橫貫版面的列，有固定的位置與地位。
 *
 * 文字一律由 main.js 翻好再傳進來，這個檔不決定要顯示哪個 key。
 */
export function renderInfoBar(info, t) {
  const stats = (info.stats || [])
    .filter(Boolean)
    .map((s) => `<span class="stat">${esc(s)}</span>`)
    .join("");

  $("#infobar").innerHTML = `
    <span class="ib-title">${esc(info.title)}</span>
    <span class="ib-stats">${stats}</span>
    ${
      info.clear
        ? `<button type="button" class="ib-clear" data-fclear>${esc(
            t("filterClear")
          )}</button>`
        : ""
    }`;
}

/*
 * 篩選。
 *
 * 36 個條件原本常駐在畫面上，三排就吃掉格子牆上方一大段。
 * 現在收進搜尋框旁邊的漏斗，但「看不出自己篩了什麼」是收起來的代價，
 * 所以已選的那幾個留在漏斗外面，各自點一下就移除。
 *
 * 面板裡的分組順序：選項少的三組在上面，屬性 18 個與世代 9 個排在下面。
 */
const FGROUPS = ["kind", "rarity", "other", "type", "gen"];

/** 一個選項的顯示文字與代表色。屬性的名稱來自 types.js，其餘來自語言檔 */
function optInfo(g, key, lang, t) {
  const grp = FILTER_GROUPS[g];
  if (grp.labelOf) return { label: t(grp.labelOf(key)), color: null };
  const info = typeInfo(key, lang);
  return { label: info.name, color: info.color };
}

/* 屬性的代表色。18 個裡面認顏色比認字快 */
const swatch = (color) =>
  color ? `<i class="swatch" style="background:${esc(color)}"></i>` : "";

/*
 * 篩選的兩塊 HTML（已選條件、五組選項）由圖鑑的搜尋列與選寶可夢面板共用。
 *
 * 差別只在「點下去要改哪一份篩選」，所以 dataset 的名字由呼叫端給。
 * 兩邊用同一組名字的話 main.js 的委派會兩邊都接到，
 * 在選寶可夢面板裡篩一下，圖鑑的格子牆也跟著變。
 */
const FATTR = {
  dex: { drop: "fdrop", group: "group", opt: "opt" },
  pick: { drop: "pdrop", group: "pgroup", opt: "popt" },
};

/** 已選條件。每一顆自己帶 ✕，點了只移除那一個 */
function pickedChips(filter, lang, t, a) {
  return FGROUPS.flatMap((g) =>
    (filter[g] || []).map((key) => {
      const { label, color } = optInfo(g, key, lang, t);
      return `<button type="button" class="fsel" data-${a.drop} data-${
        a.group
      }="${g}" data-${a.opt}="${esc(key)}">
        ${swatch(color)}${esc(label)}
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>`;
    })
  ).join("");
}

/**
 * 五組選項。
 *
 * 每個選項後面的數字是「扣掉自己這一組之後還剩幾筆」，
 * 不是「這個條件本身有幾筆」。這樣才看得出點下去會剩多少，
 * 而且同一組裡的選項加起來才會等於這一組全不選的結果。
 */
function filterGroups(filter, lang, t, a) {
  return FGROUPS.map((g) => {
    const grp = FILTER_GROUPS[g];
    const picked = filter[g] || [];
    // 這一組的計數基準：其他組都套用，這一組放掉
    const pool = applyFilter(ENTRIES, filter, g);

    const opts = grp.options
      .map(([key, pred]) => {
        const n = pool.filter(pred).length;
        const { label, color } = optInfo(g, key, lang, t);
        return `<button type="button" class="fopt" data-${a.group}="${g}" data-${
          a.opt
        }="${esc(key)}" aria-pressed="${picked.includes(key)}"${
          n ? "" : " disabled"
        }>
          ${swatch(color)}${esc(label)}<span class="count">${n}</span>
        </button>`;
      })
      .join("");

    return `<div class="fgroup">
      <p class="fgroup-t">${esc(t(grp.label))}</p>
      <div class="fopts">${opts}</div>
    </div>`;
  }).join("");
}

/**
 * 搜尋列右邊那一段：漏斗上的條件數，以及已選條件。
 *
 * 已選的每一顆自己帶 ✕，點了只移除那一個；
 * 「清除全部」不在這裡重複做一顆，用頂部資訊列那顆現成的。
 */
export function renderFilterBar(filter, lang, t) {
  const n = filterCount(filter);
  const badge = $("#filterN");
  badge.textContent = n ? String(n) : "";
  badge.hidden = !n;

  $("#fpicked").innerHTML = pickedChips(filter, lang, t, FATTR.dex);
}

/** 漏斗點開的面板。五組各一個小標題，組內攤開不橫捲 */
export function renderFilterPanel(filter, lang, t) {
  $("#fpanel").innerHTML = `${filterGroups(filter, lang, t, FATTR.dex)}
    <div class="fpanel-foot">
      <button type="button" class="fdone" data-fclose>${esc(t("filterDone"))}</button>
    </div>`;
}

/*
 * 浮出來的面板只有兩個：篩選與設定。
 *
 * 一次只開一個，所以開合走同一個函式、狀態只有一個字串。
 * 兩顆鈕的 aria-expanded 跟面板的顯示綁在這裡，不會兩邊講不同的話，
 * 也天生擋掉兩個下拉同時打開疊在一起。
 */
const POPS = {
  filter: ["#fpanel", "#filterBtn"],
  settings: ["#settings", "#gearBtn"],
};

/** 點在這些東西上面不算「點面板外面」。main.js 判斷要不要關的時候用 */
export const POP_PARTS = Object.values(POPS).flat().join(",");

export function setPop(open) {
  for (const [name, [panel, btn]] of Object.entries(POPS)) {
    const on = name === open;
    $(panel).hidden = !on;
    $(btn).setAttribute("aria-expanded", on ? "true" : "false");
  }
}

/* ─────────── 右欄摘要 ─────────── */

/**
 * 背卡檢視沒有東西可顯示時的預設內容：目前這一份清單的摘要。
 *
 * 只有背卡在用。桌機右欄常駐，在背卡裡挑卡的時候順便看得到排了幾隻。
 * 分享圖的按鈕也在這裡，跟交換表那顆同一條路徑。
 * 圖鑑不擺這個（2026-09-12 使用者指定），交換表本身就是清單，也不擺。
 */
export function renderRailSummary(book, t) {
  const data = book.lists[book.active] || book.lists[0];

  /*
   * 數字與分享鈕都算畫得出來的那些，跟欄標題和分享圖同一個判斷。
   * 未濾的話，清單裡只剩圖鑑已經沒有的條目時，鈕是亮的但產不出圖。
   */
  const want = knownItems(data.want).length;
  const have = knownItems(data.have).length;
  const total = want + have;

  $("#panel").innerHTML = `
    <div class="rs">
      <p class="rs-label">${esc(t("viewTrade"))}</p>
      <p class="rs-name">${esc(data.name || t("listTab", book.active + 1))}</p>
      <div class="rs-nums">
        <span class="rs-num want">
          <i class="dot"></i>${esc(t("colWant"))}<b>${want}</b>
        </span>
        <span class="rs-num have">
          <i class="dot"></i>${esc(t("colHave"))}<b>${have}</b>
        </span>
      </div>
      <button type="button" class="btn-share wide" data-share${
        total ? "" : " disabled"
      }>${esc(t("share"))}</button>
    </div>`;
}

/* ─────────── 圖鑑 ─────────── */

/** 詳情面板要顯示哪幾個等級的 IV100 CP。欄位名就是 cp + 等級 */
const CP_LEVELS = [20, 25, 50];

/** 目前條件下要顯示哪些條目 */
export function visibleEntries(filter, query) {
  return search(applyFilter(ENTRIES, filter), query);
}

/**
 * 屬性色帶。圖下面那條 3px 的線，雙屬性就兩段。
 *
 * types.js 有 18 個代表色，原本圖鑑一個都沒用到，
 * 1484 隻在畫面上全是同一種白格子。這條線讓整面牆有顏色，
 * 而且關掉名稱之後它是唯一還認得出屬性的東西。
 */
const typeBand = (e) => {
  const ks = e.types || [];
  if (!ks.length) return "";
  return `<span class="band">${ks
    .map((k) => `<i style="background:${esc(typeInfo(k, "en").color)}"></i>`)
    .join("")}</span>`;
};

/**
 * 圖鑑格狀清單。
 *
 * 格子不畫框也不鋪白底，圖直接站在畫布上。
 * 1484 個框線是這個站看起來最像模板的原因：導覽、資料、卡片
 * 全部是同一種白底圓角盒子，分不出誰是誰。
 *
 * 左上角的圓點表示已加進哪一欄，兩欄都在就兩個點。
 */
export function renderGrid(list, data, lang, t) {
  if (!list.length) {
    $("#app").innerHTML = `<p class="empty">${esc(t("empty"))}</p>`;
    return;
  }
  const inWant = new Set(data.want.map((i) => i.id));
  const inHave = new Set(data.have.map((i) => i.id));

  $("#app").innerHTML = `<div class="grid">${list
    .map((e) => {
      const tags = [
        inWant.has(e.id) ? '<i class="tag want"></i>' : "",
        inHave.has(e.id) ? '<i class="tag have"></i>' : "",
      ].join("");
      const form = formName(e, lang);
      return `<button class="cell" type="button" data-id="${esc(e.id)}">
        <span class="shot">
          ${tags ? `<span class="tags">${tags}</span>` : ""}
          <img ${iconAttrs(e, false)} alt="" loading="lazy" />
        </span>
        ${typeBand(e)}
        <span class="no">#${e.dex}</span>
        <span class="nm">${esc(speciesName(e, lang))}${
        form ? `<span class="form">${esc(form)}</span>` : ""
      }</span>
      </button>`;
    })
    .join("")}</div>`;
}

/* ─────────── 條目詳情 ─────────── */

const KIND_LABEL = { base: "kindBase", form: "kindForm", costume: "kindCostume" };
/*
 * 稀有度在畫面上只有兩種說法（2026-09-12，使用者要求）。
 * 神話與究極異獸都併進傳說，它們在 GO 裡的交換規則是同一套。
 * 資料層的 `cls` 沒有動，仍然是 game master 的原貌。
 */
const CLS_LABEL = {
  normal: "clsNormal",
  legendary: "clsLegendary",
  mythic: "clsLegendary",
  ultra_beast: "clsLegendary",
};

/**
 * 詳情面板裡「已經加進清單」的那幾筆。
 *
 * 同一隻可以配不同背卡各收一筆，所以這裡列的是該欄裡所有
 * id 相同的項目，每一筆各自有自己的標記與背卡，互不影響。
 * 沒加進這一欄就整區不顯示，避免面板變成一長串沒用的選項。
 */
function editBlock(col, data, id, e, lang, t, flash) {
  const rows = data[col]
    .map((item, idx) => ({ item, idx }))
    .filter((r) => r.item.id === id);
  if (!rows.length) return "";

  /*
   * 背卡下拉照收納夾分組。同一隻寶可夢能帶的背卡會隨著資料補齊變多，
   * 一長串平的選項在手機上滑不完，分組之後至少找得到。
   * 上面選背卡是點圖，這裡是下拉，因為這裡改的是已經收進清單的那一筆，
   * 每一筆都攤成一整排圖會把面板撐得很長。
   */
  const cards = cardsFor(id);
  const groups = [];
  for (const { folder, card } of cards) {
    const last = groups[groups.length - 1];
    if (last && last.folder === folder) last.cards.push(card);
    else groups.push({ folder, cards: [card] });
  }

  const block = ({ item, idx }) => {
    const mk = (field, label, cls) =>
      `<button type="button" class="mk ${cls}" data-field="${field}"
               aria-pressed="${!!item[field]}">${esc(label)}</button>`;

    const opt = (card) =>
      `<option value="${esc(card.id)}"${
        card.id === item.bg ? " selected" : ""
      }>${esc(cardName(card, lang))}</option>`;
    const bgSelect = cards.length
      ? `<select data-field="bg">
           <option value="">${esc(t("bgAny"))}</option>
           ${groups
             .map(
               (g) =>
                 `<optgroup label="${esc(folderName(g.folder, lang))}">${g.cards
                   .map(opt)
                   .join("")}</optgroup>`
             )
             .join("")}
         </select>`
      : "";

    const hit = flash && flash.col === col && flash.idx === idx;
    return `<div class="d-edit ${col}${hit ? " flash" : ""}"
                 data-col="${col}" data-idx="${idx}">
      <div class="marks">
        ${hasShiny(e) ? mk("shiny", t("markShiny"), "shiny") : ""}
        ${mk("xxl", t("markXxl"), "xxl")}
        ${mk("xxs", t("markXxs"), "xxs")}
        <button type="button" class="mk del" data-del="${idx}" data-col="${col}">${esc(
      t("remove")
    )}</button>
      </div>
      ${bgSelect}
    </div>`;
  };

  return `<p class="d-sect">${esc(
    col === "want" ? t("colWant") : t("colHave")
  )} · ${esc(t("itemCount", rows.length))}</p>
    ${rows.map(block).join("")}`;
}

/**
 * 條目詳情。
 *
 * 由上到下就是操作順序：確認是哪一隻 → 選條件 → 選背卡 → 加進某一欄。
 * 條件與背卡是草稿（`draft`），按下加入才會寫進清單，關掉面板就丟。
 * 上方那張圖跟著草稿的異色走：勾起來就換成異色圖，這樣不必加進清單
 * 也看得出自己要的是哪一種。異色預設不勾，大多數交換談的是一般色。
 * 已經在清單裡的那幾筆列在按鈕下方，各自編輯，互不干擾。
 */
export function renderDetail(id, data, lang, t, draft = null, flash = null, back = false) {
  const e = find(id);
  if (!e) return;

  // 沒有草稿（例如自我檢查直接呼叫）就當場開一份，繪製不依賴 main.js 的狀態
  const d = draft || { shiny: false, xxl: false, xxs: false, bg: "" };

  const types = e.types
    .map((ty) => {
      const info = typeInfo(ty, lang);
      return `<span class="type" style="background:${info.color}">${esc(
        info.name
      )}</span>`;
    })
    .join("");

  const dmk = (field, label, cls) =>
    `<button type="button" class="mk ${cls}" data-draft="${field}"
             aria-pressed="${!!d[field]}">${esc(label)}</button>`;

  const cards = cardsFor(id);
  const bgBlock = cards.length
    ? `<div class="bg-list">
        <button type="button" class="bg-row none" data-pick=""
                aria-pressed="${!d.bg}">
          <span class="tx"><span class="t">${esc(t("bgAny"))}</span></span>
        </button>
        ${cards
          .map(
            ({ folder, card, note }) => `<button type="button" class="bg-row"
              data-pick="${esc(card.id)}" aria-pressed="${d.bg === card.id}">
            <img ${bgAttrs(card)} alt="" loading="lazy" />
            <span class="tx">
              <span class="t">${esc(cardName(card, lang))}</span>
              <span class="s">${esc(folderName(folder, lang))}${
              note && note[lang] ? ` · ${esc(note[lang])}` : ""
            }</span>
            </span>
          </button>`
          )
          .join("")}
      </div>`
    : `<p class="dim">${esc(t("bgNone"))}</p>`;

  const form = formName(e, lang);

  /*
   * IV100 的 CP。團體戰前要查的就是這個，所以排在條件上面，不必捲。
   * 三個等級：20 是團體戰捕捉、25 是天氣加成、50 是練滿。
   * 沒有 CP 的那幾筆整列不畫——上游缺那個型態的基礎數值，
   * 擺三個破折號只是佔位子，還會讓人以為是載入失敗。
   */
  const cpBlock = e.cp20
    ? `<p class="d-sect">${esc(t("cpSection"))}</p>
      <div class="cp-row">
        ${CP_LEVELS.map(
          (lv) => `<div class="cp-box">
            <span class="k">${esc(t("cpLevel", lv))}</span>
            <span class="v">${e[`cp${lv}`]}</span>
          </div>`
        ).join("")}
      </div>`
    : "";

  $("#panel").innerHTML = `
    ${
      back
        ? `<button type="button" class="btn-back" data-pickback="1">${esc(
            t("back")
          )}</button>`
        : ""
    }
    <div class="d-head">
      <img ${iconAttrs(e, d.shiny)} alt="" />
      <div>
        <div class="d-name">${esc(speciesName(e, lang))}</div>
        ${form ? `<div class="d-form">${esc(form)}</div>` : ""}
        <div class="d-meta">${esc(t("dexNo"))} #${e.dex} · ${esc(
    t(KIND_LABEL[e.kind])
  )} · ${esc(t(CLS_LABEL[e.cls] || "clsNormal"))}</div>
        <div class="type-row">${types}</div>
        <div class="d-meta">${esc(
          hasShiny(e) ? t("shinyAvailable") : t("shinyNone")
        )}</div>
      </div>
    </div>

    ${cpBlock}

    <p class="d-sect">${esc(t("condSection"))}</p>
    <div class="marks draft">
      ${hasShiny(e) ? dmk("shiny", t("markShiny"), "shiny") : ""}
      ${dmk("xxl", t("markXxl"), "xxl")}
      ${dmk("xxs", t("markXxs"), "xxs")}
    </div>

    <p class="d-sect">${esc(t("bgSection"))}</p>
    ${bgBlock}

    <div class="d-actions">
      <button type="button" class="want" data-add="want">${esc(
        t("addWant")
      )}</button>
      <button type="button" class="have" data-add="have">${esc(
        t("addHave")
      )}</button>
    </div>

    ${editBlock("want", data, id, e, lang, t, flash)}
    ${editBlock("have", data, id, e, lang, t, flash)}

    <button class="btn-close" type="button" data-close="1">${esc(t("close"))}</button>`;
}

/* ─────────── 交換表 ─────────── */

/**
 * 一格交換項目。
 *
 * 版面刻意跟圖鑑的格子一致：背卡圖疊在圖示後方，
 * 狀態用角落的小符號表示，不寫成整行文字。
 * 要改條件請點格子，在詳情面板裡調整。
 */
function tradeCell(item, col, idx, lang, t) {
  const e = find(item.id);
  if (!e) return "";

  // 背景圖走 CSS，沒有 onerror 可以接，所以只給上游那一個網址
  const card = item.bg ? findCard(item.bg) : null;
  const bgLayer = card
    ? `<span class="want-bg" style="background-image:url('${esc(bgUrl(card))}')"></span>`
    : "";

  /*
   * 異色是星星，疊在格子左上角。尺寸是文字，放在格子下方。
   * 兩者分開是因為尺寸有 XXL 與 XXS 兩種，塞進格子裡會蓋到圖。
   */
  const size = [item.xxl ? "XXL" : "", item.xxs ? "XXS" : ""]
    .filter(Boolean)
    .join(" ");

  /*
   * 格子帶著自己在那一欄的索引。同一隻可以有好幾筆，
   * 點進詳情面板時要指得出點的是哪一筆，不然面板列出三筆會分不清。
   */
  return `<div class="cell want-cell" data-id="${esc(
    item.id
  )}" data-col="${col}" data-idx="${idx}">
    <span class="want-tile">
      ${bgLayer}
      <img ${iconAttrs(e, item.shiny)} alt="" loading="lazy" />
      ${item.shiny ? '<i class="spark">✦</i>' : ""}
      <button class="want-del" type="button" data-del="${idx}" data-col="${col}"
              title="${esc(t("remove"))}" aria-label="${esc(t("remove"))}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </span>
    <span class="nm">${esc(speciesName(e, lang))}${
    formName(e, lang) ? `<span class="form">${esc(formName(e, lang))}</span>` : ""
  }</span>
    ${size ? `<span class="sz">${size}</span>` : ""}
  </div>`;
}

/**
 * 一欄的內容。
 *
 * 先濾掉查不到條目的紀錄再算數量，否則圖鑑更新拿掉某個 id 之後，
 * 標題會寫 4 項但只畫得出 3 個。索引保留原本的位置，刪除才會刪對。
 */
function tradeColumn(col, items, lang, t, editing) {
  const title = col === "want" ? t("colWant") : t("colHave");
  const rows = items
    .map((it, idx) => ({ it, idx }))
    .filter(({ it }) => find(it.id));

  /*
   * 格子牆最後一格永遠是加號，空的時候也在。
   * 沒有它，空清單只剩一句「到圖鑑點一隻加進來」，
   * 使用者得先離開交換表才動得了。
   */
  const plus = `<button class="cell add-cell" type="button" data-addcell="${col}"
          aria-label="${esc(col === "want" ? t("addWant") : t("addHave"))}">
    <span class="plus">+</span>
  </button>`;

  const body = `<div class="grid${editing ? " editing" : ""}">${rows
    .map(({ it, idx }) => tradeCell(it, col, idx, lang, t))
    .join("")}${plus}</div>${
    rows.length
      ? ""
      : `<p class="empty">${esc(
          col === "want" ? t("emptyWant") : t("emptyHave")
        )}</p>`
  }`;

  /*
   * 鉛筆只有觸控裝置看得到（CSS 管），因為那邊的格子上沒有刪除鈕：
   * 常駐就是滿畫面的紅點，所以改成按了才一起出現。
   * 空的那一欄不畫——沒有東西可刪的時候給一顆鈕只會讓人按了沒反應。
   */
  const pencil = rows.length
    ? `<button type="button" class="edit-btn" data-edit="${col}"
               aria-pressed="${!!editing}" title="${esc(t("editItems"))}"
               aria-label="${esc(t("editItems"))}">
         <svg viewBox="0 0 24 24" aria-hidden="true">
           <path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M14 6l4 4" />
         </svg>
       </button>`
    : "";

  return `<section class="col ${col}">
    <div class="col-head">
      <i class="dot"></i>
      <span class="t">${esc(title)}</span>
      <span class="n">${esc(t("itemCount", rows.length))}</span>
      ${pencil}
    </div>
    <div class="panel">${body}</div>
  </section>`;
}

/**
 * 交換表。
 *
 * 三份清單用分頁切換，一次只顯示一份。分頁標籤就是那一份的名稱，
 * 沒取名才顯示「清單 1」，這樣使用者取了名就看得出哪份是哪份。
 *
 * 友情碼只是輸入框，畫面上不另外顯示，它的用途是印在分享圖底部。
 * 收到圖的人可以直接照著加好友，這是圖片唯一需要「讀字」的地方。
 * 它存在偏好裡，三份清單共用同一組，因為那是使用者的身分。
 */
export function renderTrade(book, lang, t, code = "", edit = {}) {
  const data = book.lists[book.active] || book.lists[0];
  const total = knownItems(data.want).length + knownItems(data.have).length;

  const tabs = book.lists
    .map((l, i) => {
      const n = knownItems(l.want).length + knownItems(l.have).length;
      return `<button type="button" class="tab" data-list="${i}"
               aria-pressed="${i === book.active}">
        ${esc(l.name || t("listTab", i + 1))}<span class="n">${n}</span>
      </button>`;
    })
    .join("");

  $("#app").innerHTML = `
    <div class="list-tabs">${tabs}</div>
    <div class="trade-head">
      <label class="fld">
        <span>${esc(t("listName"))}</span>
        <input id="listName" value="${esc(data.name)}"
               placeholder="${esc(t("listNameHint"))}" maxlength="24" />
      </label>
      <label class="fld">
        <span>${esc(t("friendCode"))}</span>
        <input id="trainerCode" value="${esc(formatCode(code))}" inputmode="numeric"
               placeholder="${esc(t("friendCodeHint"))}" maxlength="14" />
      </label>
      <button type="button" class="btn-share" data-share${
        total ? "" : " disabled"
      }>${esc(t("share"))}</button>
    </div>
    <div class="cols">
      ${tradeColumn("want", data.want, lang, t, edit.want)}
      ${tradeColumn("have", data.have, lang, t, edit.have)}
    </div>`;
}

/**
 * 交換表的加號開的選寶可夢面板。
 *
 * 這裡的篩選與搜尋跟圖鑑檢視是兩份：在圖鑑篩了「只看傳說」，
 * 從交換表按加號不該看到一片空白，而且不會知道為什麼。
 * 反過來也一樣，這裡篩完不該把圖鑑的格子牆也換掉。
 *
 * 一次最多畫 150 筆。面板很窄，全部一千多筆畫下去只是拖慢開啟，
 * 沒有人會捲到底，要找特定一隻本來就該打字。
 */
const PICK_MAX = 150;

/**
 * 面板有兩種模式。
 *
 * 單選：點一隻就切到詳情，可以配背卡與條件，跟原本一樣。
 * 多選：點一隻是選起來，底下那顆鈕一次全加，條件一律不帶——
 * 逐隻配背卡本來就得一隻一隻來，那是單選那條路在做的事。
 *
 * 篩選收在漏斗裡，但已選條件留在外面，跟圖鑑同一條規則：
 * 只留一個數字的話，使用者看不出自己篩掉了什麼。
 */
export function renderPicker(pick, lang, t) {
  const filter = pick.filter || {};
  const multi = !!pick.multi;
  const sel = new Set(pick.sel || []);

  const hits = search(applyFilter(ENTRIES, filter), pick.query || "");
  const shown = hits.slice(0, PICK_MAX);
  const n = filterCount(filter);

  const cells = shown
    .map((e) => {
      const form = formName(e, lang);
      const on = multi && sel.has(e.id);
      return `<button class="cell${on ? " picked" : ""}" type="button"
              data-id="${esc(e.id)}" data-pickcell="1"${
        multi ? ` aria-pressed="${on}"` : ""
      }>
        <img ${iconAttrs(e, false)} alt="" loading="lazy" />
        ${
          multi
            ? `<span class="pick-tick" aria-hidden="true">
                 <svg viewBox="0 0 24 24"><path d="M5 13l4.5 4.5L19 7.5" /></svg>
               </span>`
            : ""
        }
        <span class="nm">${esc(speciesName(e, lang))}${
        form ? `<span class="form">${esc(form)}</span>` : ""
      }</span>
      </button>`;
    })
    .join("");

  const chips = pickedChips(filter, lang, t, FATTR.pick);

  $("#panel").innerHTML = `
    <div class="pick-head">
      <div>
        <div class="d-name">${esc(
          pick.col === "want" ? t("addWant") : t("addHave")
        )}</div>
        <div class="d-meta">${esc(multi ? t("pickHintMulti") : t("pickHint"))}</div>
      </div>
      <div class="pick-tools">
        <button type="button" class="pick-btn" data-pickfilter
                aria-pressed="${!!pick.open}" title="${esc(t("filterBtn"))}"
                aria-label="${esc(t("filterBtn"))}">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 5h18l-7 8v6l-4 2v-8z" />
          </svg>
          ${n ? `<span class="pick-n">${n}</span>` : ""}
        </button>
        <button type="button" class="pick-btn wide" data-pickmulti
                aria-pressed="${multi}">${esc(t("pickMulti"))}</button>
      </div>
    </div>

    <input id="pickQ" class="pick-q" value="${esc(pick.query || "")}"
           placeholder="${esc(t("search"))}" />

    ${chips ? `<div class="pick-picked">${chips}</div>` : ""}

    ${
      pick.open
        ? `<div class="pick-f">
            ${filterGroups(filter, lang, t, FATTR.pick)}
            <div class="fpanel-foot">
              ${
                n
                  ? `<button type="button" class="fclear" data-pclear>${esc(
                      t("filterClear")
                    )}</button>`
                  : ""
              }
              <button type="button" class="fdone" data-pickfilter>${esc(
                t("filterDone")
              )}</button>
            </div>
          </div>`
        : ""
    }

    ${
      shown.length
        ? `<div class="grid pick-grid">${cells}</div>
           ${
             hits.length > shown.length
               ? `<p class="dim">${esc(t("pickMore", PICK_MAX))}</p>`
               : ""
           }`
        : `<p class="empty">${esc(t("empty"))}</p>`
    }
    <button class="btn-close" type="button" data-close="1">${esc(t("close"))}</button>`;

  /*
   * 多選的動作列貼在面板底部，不排在格子牆後面。
   * 選完要捲到最底才按得到「加入」的話，一次加很多隻反而更累。
   * 沒在多選就整條不畫，單選的版面跟以前一模一樣。
   */
  if (multi) renderPickFoot(sel.size, t, pick.shiny);
  else railFoot("");
}

/**
 * 多選動作列的內容。
 *
 * 單獨一個函式是因為點一格不能重畫整片：`#panel` 是捲動容器，
 * 換掉 innerHTML 會把 scrollTop 歸零，選到第七排點一下就彈回最上面。
 * 所以 main.js 點格子時只改那一格的 class，動作列走這裡。
 */
export function renderPickFoot(n, t, shiny) {
  railFoot(
    `<div class="pick-foot-l">
       <button type="button" class="mk shiny" data-pickshiny
               aria-pressed="${!!shiny}">${esc(t("markShiny"))}</button>
       <span class="dim">${esc(t("pickSel", n))}</span>
     </div>
     <button type="button" class="pick-add" data-addmulti${
       n ? "" : " disabled"
     }>${esc(t("pickAdd", n))}</button>`
  );
}

/**
 * 右欄底部那條動作列。目前只有選寶可夢面板的多選在用。
 *
 * 它在捲動區外面，所以不會隨著內容被換掉——換句話說，切到別的面板
 * 不清就會留在那裡。清的責任放在 main.js 重畫右欄的第一行，
 * 不是要每個繪製函式自己記得。
 */
export function railFoot(html) {
  const el = $("#pickFoot");
  el.innerHTML = html || "";
  el.hidden = !html;
}

/* ─────────── 背卡 ─────────── */

/**
 * 背卡檢視。
 *
 * 兩百四十張攤平沒辦法看，所以照收納夾收起來，預設全部收合，
 * 標題右邊寫張數。點標題展開，狀態存在 main.js 的 state.bgOpen。
 *
 * 搜尋有輸入時改成另一種行為：只顯示有命中的夾並全部展開，
 * 否則使用者得先猜對活動屬於哪一類才找得到。
 */
export function renderBg(bg, lang, t) {
  const q = String(bg.query || "").trim().toLowerCase();

  const hitCard = (card) =>
    !q ||
    ["zh", "ja", "en"].some((l) =>
      String(card[l] || "").toLowerCase().includes(q)
    ) ||
    String(card.id).includes(q);

  const inScope = (card) => bg.scope === "all" || card.scope === bg.scope;

  const folders = FOLDERS.map((folder) => {
    const all = folder.cards.filter(inScope);
    const cards = q
      ? all.filter((c) => hitCard(c) || folderName(folder, lang).toLowerCase().includes(q))
      : all;
    return { folder, cards, total: all.length };
  }).filter((f) => f.cards.length);

  const scopes = [
    ["all", t("bgScopeAll")],
    ["global", t("bgScopeGlobal")],
    ["regional", t("bgScopeRegional")],
  ];

  const tools = `<div class="bg-tools">
    <input id="bgSearch" type="search" value="${esc(bg.query || "")}"
           placeholder="${esc(t("bgSearch"))}" />
    <div class="bg-scope">${scopes
      .map(
        ([k, label]) =>
          `<button type="button" data-bgscope="${k}" aria-pressed="${
            k === bg.scope
          }">${esc(label)}</button>`
      )
      .join("")}</div>
  </div>`;

  if (!folders.length) {
    $("#app").innerHTML = `${tools}<p class="dim pad">${esc(t("bgNoResult"))}</p>`;
    return;
  }

  /*
   * 每個收納夾一段，段標題是一條髮絲線上的小型大寫標籤。
   *
   * 收合的時候不再只剩一行字，而是一排橫向捲的真卡面。
   * 原本 23 條純文字長條佔滿一整屏卻一張圖都看不到，
   * 而這個檢視的內容本來就是圖。展開才換成網格一次看完。
   *
   * 兩種形態是同一份 DOM 換 class，不是畫兩次。
   * 畫兩次會讓 240 張圖變成 480 個節點，切換時還要重新載圖。
   */
  const body = folders
    .map(({ folder, cards, total }) => {
      const open = q ? true : bg.open.has(folder.id);
      return `<section class="bg-folder">
      <button class="folder-head" type="button" data-folder="${esc(folder.id)}"
              aria-expanded="${open}">
        <span class="nm">${esc(folderName(folder, lang))}</span>
        <span class="ct">${esc(t("bgCount", q ? `${cards.length}/${total}` : total))}</span>
      </button>
      <div class="${open ? "bg-grid" : "bg-strip"}">${cards
        .map(bgCard(lang, t))
        .join("")}</div>
    </section>`;
    })
    .join("");

  $("#app").innerHTML = `${tools}<div class="bg-folders">${body}</div>`;
}

/**
 * 一張背卡。
 *
 * 不畫外框也不鋪白底，卡面圖本身就是卡片，名稱與張數在圖下面。
 * 收集格是零的不寫張數，寫了只會讓人以為壞掉。
 */
const bgCard = (lang, t) => (card) =>
  `<button class="bg-card" type="button" data-card="${esc(card.id)}">
    <img ${bgAttrs(card)} alt="" loading="lazy" />
    <span class="t">${esc(cardName(card, lang))}</span>
    <span class="s">${esc(
      card.pokemon.length ? t("bgSlots", card.pokemon.length) : card.date || ""
    )}</span>
  </button>`;

/** 單張背卡的詳情：列出所有可能帶有它的寶可夢 */
export function renderCardDetail(cardId, lang, t, pick = {}) {
  const hit = allCards().find(({ card }) => card.id === cardId);
  if (!hit) return;
  const { folder, card } = hit;

  const multi = !!pick.multi;
  const sel = new Set(pick.sel || []);

  const cells = entriesOf(card)
    .map(({ id, note }) => {
      const e = find(id);
      if (!e) return "";
      const form = formName(e, lang);
      const extra = note && note[lang] ? note[lang] : form;
      const on = multi && sel.has(id);
      return `<button class="cell${on ? " picked" : ""}" type="button"
              data-id="${esc(id)}"${multi ? ` data-bgcell="1" aria-pressed="${on}"` : ""}>
        <img ${iconAttrs(e, false)} alt="" loading="lazy" />
        ${
          multi
            ? `<span class="pick-tick" aria-hidden="true">
                 <svg viewBox="0 0 24 24"><path d="M5 13l4.5 4.5L19 7.5" /></svg>
               </span>`
            : `<span class="no">#${e.dex}</span>`
        }
        <span class="nm">${esc(speciesName(e, lang))}${
        extra ? `<span class="form">${esc(extra)}</span>` : ""
      }</span>
      </button>`;
    })
    .join("");

  /*
   * 骨架那批還沒有寶可夢清單，講明白比留一塊空白好。
   * 有清單的才給多選鈕——沒有格子可選的時候放一顆鈕只會讓人按了沒反應。
   */
  const list = card.pokemon.length
    ? `<div class="d-sect-row">
         <p class="d-sect">${esc(t("bgSlots", card.pokemon.length))}</p>
         <button type="button" class="pick-btn wide" data-bgmulti
                 aria-pressed="${multi}">${esc(t("pickMulti"))}</button>
       </div>
       <div class="grid">${cells}</div>`
    : `<p class="dim">${esc(t("bgNoList"))}</p>`;

  const meta = [
    folderName(folder, lang),
    card.date || "",
    card.event ? card.event[lang] || card.event.en : "",
  ]
    .filter(Boolean)
    .join(" · ");

  $("#panel").innerHTML = `
    <div class="d-name">${esc(cardName(card, lang))}</div>
    <div class="d-meta">${esc(meta)}</div>
    ${
      card[`note_${lang}`]
        ? `<p class="d-meta">${esc(card[`note_${lang}`])}</p>`
        : ""
    }
    <img ${bgAttrs(card)} alt="" style="width:100%;border-radius:8px;margin:14px 0" />
    ${list}
    <button class="btn-close" type="button" data-close="1">${esc(t("close"))}</button>`;

  // 跟選寶可夢面板同一條規則：沒在多選就整條收掉，版面回到原本的樣子
  if (multi) renderBgFoot(sel.size, t, pick.shiny);
  else railFoot("");
}

/**
 * 背卡詳情多選時的底部動作列。
 *
 * 跟選寶可夢面板那一條長得一樣，差別在右邊是兩顆鈕不是一顆：
 * 從交換表按加號是「從某一欄進來的」，這裡沒有那個脈絡，
 * 同一張卡常常是想要幾隻、可以給幾隻，所以兩欄都要按得到。
 */
export function renderBgFoot(n, t, shiny) {
  railFoot(
    `<div class="pick-foot-l">
       <button type="button" class="mk shiny" data-pickshiny
               aria-pressed="${!!shiny}">${esc(t("markShiny"))}</button>
       <span class="dim">${esc(t("pickSel", n))}</span>
     </div>
     <div class="pick-foot-r">
       <button type="button" class="pick-add want" data-addbg="want"${
         n ? "" : " disabled"
       }>${esc(t("bgAddWant", n))}</button>
       <button type="button" class="pick-add have" data-addbg="have"${
         n ? "" : " disabled"
       }>${esc(t("bgAddHave", n))}</button>
     </div>`
  );
}

export { MAX_ITEMS };
