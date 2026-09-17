/**
 * ui.js — 全部繪製函式
 *
 * 只把資料變成畫面，不決定資料怎麼變。
 * 不碰 localStorage、不改 state，那是 main.js 的事。
 *
 * 四個檢視共用這個檔：圖鑑、交換表、背卡、知識。
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
  canMax,
  canGmax,
  canPurify,
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
import { KB_ENTRIES, KB_CATS } from "./kbdata.js";
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
    dispGroup("big", t("dispSize"), [
      { val: false, name: t("dispSizeS"), thumb: DISP_THUMBS.bigOff },
      { val: true, name: t("dispSizeL"), thumb: DISP_THUMBS.bigOn },
    ], !!disp.big),
    dispGroup("names", t("dispNames"), [
      { val: true, name: t("dispNamesOn"), thumb: DISP_THUMBS.namesOn },
      { val: false, name: t("dispNamesOff"), thumb: DISP_THUMBS.namesOff },
    ], !!disp.names),
    dispGroup("dark", t("dispTheme"), [
      { val: false, name: t("dispLight"), thumb: DISP_THUMBS.darkOff },
      { val: true, name: t("dispDark"), thumb: DISP_THUMBS.darkOn },
    ], !!disp.dark),
  ].join("");
  $("#localNotice").innerHTML = `<strong>${esc(t("localOnly"))}</strong>${esc(
    t("localHint")
  )}`;

  $("#langs").innerHTML = LANG_BTNS(lang);

  /*
   * 搜尋字串的語言。跟介面語言分開，因為那串字是給**對方**貼進
   * 遊戲的，關鍵字得是對方遊戲的語言（「異色」在日文介面搜不到）。
   */
  $("#strLangTitle").textContent = t("strLang");
  $("#strLangHint").textContent = t("strLangHint");
  $("#strLangs").innerHTML = STR_LANG_BTNS(disp.goLang || "auto", t);
  $("#dataActions").innerHTML = `
    <button type="button" data-act="export">${esc(t("export"))}</button>
    <button type="button" data-act="import">${esc(t("import"))}</button>
    <button type="button" class="danger" data-act="reset">${esc(t("reset"))}</button>`;

  /*
   * 頁尾那條到知識頁的連結。骨架裡寫死繁中（爬蟲讀初始 HTML），
   * 這裡依介面語言覆蓋。**沒有內容就整條藏起來**，跟第四顆檢視鈕同一個判斷。
   */
  $("#kbFoot").hidden = !KB_ENTRIES.length;
  $("#kbFootLink").textContent = t("kbFooter");

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
 * 搜尋字串的語言選擇器。比介面語言多一個「跟介面」，而且那是預設——
 * 台灣人跟台灣人換是常態，需要指定對方語言的是少數，所以這一項
 * 收在設定裡，交換表那一列一個像素都不動。
 */
const STR_LANG_BTNS = (cur, t) =>
  [{ code: "auto", label: t("strLangAuto") }, ...LANG_LIST]
    .map(
      (l) =>
        `<button type="button" data-golang="${l.code}" aria-pressed="${
          l.code === cur
        }">${esc(l.label)}</button>`
    )
    .join("");

/*
 * 三個檢視的圖示。手機的底部 bar 只放得下圖示加一行小字，
 * 光有文字的 bar 認不出來，所以每個檢視都要有自己的形狀。
 * 圖鑑是格子牆、交換表是兩個對向的箭頭、背卡是一張圖。
 */
const VIEW_ICONS = {
  dex: `<rect x="3.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />`,
  trade: `<path d="M4 9h13l-3.5-3.5M20 15H7l3.5 3.5" />`,
  bg: `<rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="M2.5 15.5l5-4.5 4 3.5 3.5-3 6.5 5.5" /><circle cx="8.5" cy="9" r="1.6" />`,
  /* 攤開的書。兩半各自往外彎，中間那條是書脊 */
  kb: `<path d="M12 6.5C10.5 5 8.3 4.3 4 4.3v13.4c4.3 0 6.5 0.7 8 2.2 1.5-1.5 3.7-2.2 8-2.2V4.3c-4.3 0-6.5 0.7-8 2.2z" /><path d="M12 6.5v13.4" />`,
};

/*
 * 設定面板那三個顯示選項的預覽縮圖（2026-09-14，使用者要求）。
 *
 * 三項都是「畫面會長什麼樣」，所以用兩張小縮圖二選一，不用開關——
 * 一排五隻還是三隻、格子底下有沒有字，畫出來比寫出來好懂。
 *
 * 縮圖是 inline SVG，不是圖檔：要跟著深淺色換色，而且 240 個位元組
 * 就畫得完的東西不值得多一次請求。
 *
 * **外觀那兩張的顏色寫死**，不吃 CSS 變數：它們預覽的正是兩套配色本身，
 * 跟著當前主題走的話兩張會長得一模一樣。數字抄自 `:root` 與 `body.dark`，
 * 改配色時這裡要跟著改（跟 `js/share.js` 同一個道理）。
 */
const thumbCells = (cols, size, gap, rowGap, withName) => {
  const w = cols * size + (cols - 1) * gap;
  const x0 = (100 - w) / 2;
  const rows = 2;
  const y0 = (55 - (rows * size + (rows - 1) * rowGap)) / 2;
  let out = "";
  for (let r = 0; r < rows; r++) {
    const y = y0 + r * (size + rowGap);
    for (let c = 0; c < cols; c++) {
      const x = x0 + c * (size + gap);
      out += `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="2.5" class="tc" />`;
      if (withName)
        out += `<rect x="${x + size * 0.18}" y="${y + size + 3}" width="${
          size * 0.64
        }" height="2.4" rx="1.2" class="tl" />`;
    }
  }
  return out;
};

/* 外觀那兩張：一條標題列加兩排格子，配色寫死 */
const themeThumb = (bg, line, cell) =>
  `<rect x="0" y="0" width="100" height="55" fill="${bg}" />
   <rect x="8" y="7" width="30" height="4" rx="2" fill="${line}" />
   ${[0, 1]
     .map((r) =>
       [0, 1, 2]
         .map(
           (c) =>
             `<rect x="${8 + c * 29}" y="${17 + r * 18}" width="25" height="14" rx="2.5" fill="${cell}" />`
         )
         .join("")
     )
     .join("")}`;

const DISP_THUMBS = {
  bigOff: thumbCells(5, 12, 2.5, 6, false),
  bigOn: thumbCells(3, 19, 4, 6, false),
  namesOn: thumbCells(3, 15, 4, 10, true),
  namesOff: thumbCells(3, 15, 4, 10, false),
  darkOff: themeThumb("#faf9f5", "#cfc9bd", "#e8e4da"),
  darkOn: themeThumb("#101010", "#3c3c40", "#232326"),
};

/*
 * 一項就是一組：小標題加兩張縮圖。`data-val` 是要切成哪一個值，
 * 不是 toggle——兩張卡各自代表一個值，點已經選中的那張不該把它關掉。
 */
function dispGroup(key, label, opts, cur) {
  const cards = opts
    .map(
      ({ val, name, thumb }) =>
        `<button type="button" class="opt-card" data-disp="${key}"
                 data-val="${val ? 1 : 0}" aria-pressed="${val === cur}">
          <span class="thumb">
            <svg viewBox="0 0 100 55" aria-hidden="true">${thumb}</svg>
          </span>
          <span class="opt-name">${esc(name)}</span>
        </button>`
    )
    .join("");
  return `<div class="opt-group">
    <p class="opt-label">${esc(label)}</p>
    <div class="opt-cards">${cards}</div>
  </div>`;
}

/**
 * 檢視切換。桌機在頂部列，900 以下是貼底的 bar，同一段 DOM。
 *
 * **知識那一顆在沒有內容時不畫**：點進去是一片空白比沒有那顆鈕更難解釋，
 * 跟「空的那一欄不畫鉛筆」同一個理由。第一則進 `js/kbdata.js` 就自己出現。
 *
 * 四格排得下，2026-09-18 量過：三語 × 320~430 五種寬度零裁切零換行，
 * bar 高度不變。數字在 CLAUDE.md 的「三件先知道的代價」第 1 點。
 */
export function renderViews(view, t) {
  const items = [
    ["dex", t("viewDex")],
    ["trade", t("viewTrade")],
    ["bg", t("viewBg")],
  ];
  if (KB_ENTRIES.length) items.push(["kb", t("viewKb")]);
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
   *
   * **逐筆算，不共用一份**：同一隻的兩筆可以一筆極巨化、一筆不是，
   * 而極巨化那筆只能配 Max Battle 的卡。
   */
  const groupCards = (cards) => {
    const groups = [];
    for (const { folder, card } of cards) {
      const last = groups[groups.length - 1];
      if (last && last.folder === folder) last.cards.push(card);
      else groups.push({ folder, cards: [card] });
    }
    return groups;
  };

  const block = ({ item, idx }) => {
    // keep：舊紀錄可能帶著現在不合的組合，自己選著的那張一律留在選項裡
    const cards = cardsFor(id, {
      purified: item.purified,
      max: item.max,
      gmax: item.gmax,
      keep: item.bg,
    });
    const groups = groupCards(cards);
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
        ${canMax(e) ? mk("max", t("markMax"), "max") : ""}
        ${canGmax(e) ? mk("gmax", t("markGmax"), "gmax") : ""}
        ${canPurify(e) ? mk("purified", t("markPurified"), "purified") : ""}
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
 * 底部那顆加入鈕。
 *
 * `from` 有值時只畫它指的那一欄——從加號進來的脈絡已經選好欄了。
 * 樣式不必分兩套：`.d-actions button` 是 `flex: 1`，剩一顆就自己撐滿整列。
 */
function addBtn(col, from, t) {
  if (from && from !== col) return "";
  return `<button type="button" class="${col}" data-add="${col}">${esc(
    t(col === "want" ? "addWant" : "addHave")
  )}</button>`;
}

/**
 * 條目詳情。
 *
 * 由上到下就是操作順序：確認是哪一隻 → 選條件 → 選背卡 → 加進某一欄。
 * 條件與背卡是草稿（`draft`），按下加入才會寫進清單，關掉面板就丟。
 * 上方那張圖跟著草稿的異色走：勾起來就換成異色圖，這樣不必加進清單
 * 也看得出自己要的是哪一種。異色預設不勾，大多數交換談的是一般色。
 * 已經在清單裡的那幾筆列在按鈕下方，各自編輯，互不干擾。
 *
 * `from` 是「從哪一欄的加號進來的」（`"want"` / `"have"`，空字串表示
 * 不是從加號進來）。有值時面板上多一顆返回鈕，而且**底部只畫那一欄
 * 那顆加入鈕**：加號已經指定了欄，標題也寫著「加入可以給」，
 * 再擺兩顆同等權重的鈕只是給人按錯的機會——而且橘色那顆排在左邊，
 * 誤按的結果是東西掉進另一欄，加完還會直接跳回交換表。
 * 從圖鑑點進來沒有欄的脈絡，兩顆都要留。
 */
export function renderDetail(id, data, lang, t, draft = null, flash = null, from = "") {
  const e = find(id);
  if (!e) return;

  // 沒有草稿（例如自我檢查直接呼叫）就當場開一份，繪製不依賴 main.js 的狀態
  const d = draft || { shiny: false, xxl: false, xxs: false, max: false, bg: "" };

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

  /*
   * 勾了極巨化或超極巨化就只剩 Max Battle 的卡。
   * 極巨化只能從 Max Battle 抓到，野生或團戰拿到的卡跟它互斥，
   * 列出來的每一張都是實際上組不出來的組合。
   * 草稿不必傳 keep：勾下去那一刻 main.js 就把不合的那張退成「不指定」了。
   */
  const cards = cardsFor(id, { purified: d.purified, max: d.max, gmax: d.gmax });
  /*
   * 一張都不剩時仍然畫出區塊，只有「不指定」那一列。
   * 換成「目前沒有活動背卡」會被讀成「這隻寶可夢沒有背卡」，
   * 但它其實有，只是極巨化配不上——那句話留給真的沒有背卡的條目。
   */
  const bgBlock = cards.length || d.max || d.gmax || d.purified
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
      from
        ? `<button type="button" class="btn-back" data-pickback="1">${esc(
            t("back")
          )}</button>`
        : ""
    }
    <div class="d-head">
      <span class="d-icon">
        <img ${iconAttrs(e, d.shiny, d.gmax)} alt="" />
        ${markBadge(d, t)}
      </span>
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
      ${canMax(e) ? dmk("max", t("markMax"), "max") : ""}
      ${canGmax(e) ? dmk("gmax", t("markGmax"), "gmax") : ""}
      ${canPurify(e) ? dmk("purified", t("markPurified"), "purified") : ""}
    </div>

    <p class="d-sect">${esc(t("bgSection"))}</p>
    ${bgBlock}

    <div class="d-actions">
      ${addBtn("want", from, t)}${addBtn("have", from, t)}
    </div>

    ${editBlock("want", data, id, e, lang, t, flash)}
    ${editBlock("have", data, id, e, lang, t, flash)}
`;
}

/**
 * 極巨化的符號。
 *
 * **這是官方那張圖，不是自己畫的。** 先前手工描過一版 SVG path，
 * 形狀差很多——官方那顆是空心輪廓，上方分岔成尖角、下方兩條帶子張開，
 * 右下還有平行線紋理，照著截圖畫不出來。
 *
 * 圖存在 `img/max-mark.png`（從 Bulbapedia 取得，185×185 帶 alpha）。
 * **收進 repo 的理由跟 img/bg、img/extra 一樣**：來源沒有 CORS 標頭，
 * 不收進來就畫不進分享圖。25 KB，一張。
 *
 * 顏色靠 CSS mask 上色（極巨化粉紅、超極巨化紫），所以只要一張圖。
 * canvas 那邊用 `source-in` 做同一件事，見 js/share.js。
 */
export const MAX_MARK_SRC = "./img/max-mark.png";
export const PURIFIED_MARK_SRC = "./img/purified-mark.png";

/**
 * 極巨化／超極巨化／淨化的徽章。圖的右上角一顆官方符號。
 *
 * 詳情面板與交換表的格子共用這一顆，所以勾下去看到的東西跟之後
 * 存在清單裡看到的一模一樣——使用者要的就是「按下去右上角跳符號」。
 *
 * **三者互斥，只會有一顆。** 那一角一次只放得下一個東西，
 * 而三種狀態在遊戲裡本來就不會同時發生（見 store.js 的 cleanItem）。
 *
 * 淨化用另一張圖（青色星芒），所以 class 不同；極巨化那兩個共用
 * 同一張圖只換顏色，遊戲裡也是這樣。
 *
 * @param {{max?:boolean, gmax?:boolean, purified?:boolean}} v 草稿或清單項目，兩邊欄位同名
 */
function markBadge(v, t) {
  if (!v) return "";
  const kind = v.gmax ? "gmax" : v.max ? "max" : v.purified ? "purified" : null;
  if (!kind) return "";
  const cls = kind === "purified" ? "purb" : kind === "gmax" ? "maxb gmax" : "maxb";
  const key = kind === "purified" ? "markPurified" : kind === "gmax" ? "markGmax" : "markMax";
  return `<i class="${cls}" title="${esc(t(key))}"></i>`;
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
   *
   * 極巨化是右上角的洋紅圓徽章，跟左上角的星星分成兩個角落，
   * 兩個同時出現也不會疊在一起。不放進下方那行文字是因為
   * 「極巨化」三個字比 XXL 長太多，手機 68px 的格子排不下。
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
      <img ${iconAttrs(e, item.shiny, item.gmax)} alt="" loading="lazy" />
      ${item.shiny ? '<i class="spark">✦</i>' : ""}
      ${markBadge(item, t)}
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

  /*
   * 複製搜尋字串。跟鉛筆並排，但**桌機手機都顯示**——鉛筆是為了
   * 補觸控裝置沒有刪除鈕才存在的，這顆兩邊都用得到。
   * 同樣空欄不畫：沒有東西可複製時給一顆鈕，按了只會得到空字串。
   */
  const copy = rows.length
    ? `<button type="button" class="copy-btn" data-copy="${col}"
               title="${esc(t("copyStr"))}" aria-label="${esc(t("copyStr"))}">
         <svg viewBox="0 0 24 24" aria-hidden="true">
           <rect x="9" y="9" width="11" height="11" rx="2" />
           <path d="M5 15V6a2 2 0 0 1 2-2h8" />
         </svg>
       </button>`
    : "";

  return `<section class="col ${col}">
    <div class="col-head">
      <i class="dot"></i>
      <span class="t">${esc(title)}</span>
      <span class="n">${esc(t("itemCount", rows.length))}</span>
      ${pencil}
      ${copy}
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
 * **分段畫**：先畫 200 筆，捲到底再接 200，一路接到全部（2026-09-18，
 * 使用者要求）。在那之前是硬上限 150 筆，超過的永遠叫不出來。
 *
 * 改掉的理由是那個上限站不住：量過桌機畫全部 1460 筆是 17ms
 * （150 筆 3.9ms），而且圖鑑檢視本來就一次全畫、沒有任何上限。
 * 真正的問題是**捲動高度** 28711px，約 96 個手機螢幕——沒有人會那樣捲。
 * 分段同時解決兩件事：開啟只付第一批的錢，而後面的叫得出來。
 */
const PICK_STEP = 200;

/**
 * 選起來但畫面上看不到的有幾隻。
 *
 * 改篩選與打字**不清掉選取**（先篩火選兩隻、再篩水選三隻、一次加完，
 * 這是這個面板本來就該支援的用法），代價是那幾隻的勾跟著格子一起
 * 從畫面上消失，底部卻仍然算在數字裡。不交代的話就是「我明明只看到
 * 兩個勾，卻加進來五筆」，而且沒有任何線索。
 *
 * 「看不到」包含兩種：被篩選或搜尋濾掉的，以及**還沒接出來的那幾批**。
 * 對使用者來說是同一件事——格子不在畫面上。
 */
function countHidden(sel, shown) {
  const ids = new Set(shown.map((e) => e.id));
  return [...sel].filter((id) => !ids.has(id)).length;
}

/**
 * 同上，但給 main.js 用：點格子與切異色那兩條路只重畫底部那一列，
 * 手上沒有 `shown`，所以在這裡重算一次。
 * 那兩個時機都不常按，多跑一次 search 不影響打字時的重畫。
 */
export function pickHidden(pick) {
  const sel = pick.sel || [];
  if (!sel.length) return 0;
  const hits = search(applyFilter(ENTRIES, pick.filter || {}), pick.query || "");
  // 吃目前接到第幾筆，不是第一批的長度——接出來的那幾隻看得見，不算藏起來
  return countHidden(sel, hits.slice(0, shownCount(pick)));
}

/**
 * 目前該畫到第幾筆。
 *
 * `pick.shown` 由 main.js 保管：開面板、打字、改篩選都回到一批，
 * 捲到底才長。沒有值時當第一批，這樣舊的呼叫端不必全部改。
 */
function shownCount(pick) {
  return Math.max(PICK_STEP, pick.shown || 0);
}

/**
 * 一批格子的 HTML。
 *
 * 抽出來是因為**接下一批不能重畫整片**：`#panel` 是捲動容器，
 * 換掉 innerHTML 會把 scrollTop 歸零，而捲到底的那一瞬間正是最不能
 * 歸零的時候。所以 `growPicker` 拿這個函式產出新的幾格，
 * 直接 append 到現有的格子牆後面。
 */
function pickCells(list, lang, multi, sel) {
  return list
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
}

/**
 * 格子牆底下那一行「還有 N 筆」。
 *
 * 它同時是捲到底的**哨兵**：還在就表示還有東西可以接，
 * 接完最後一批就整行拿掉，main.js 靠它決定要不要再接。
 * 全部畫完不留一行「已經是全部了」——那是沒有人需要知道的事。
 */
function pickRest(rest, t) {
  return rest > 0
    ? `<p class="dim pick-rest" data-pickrest>${esc(t("pickMore", rest))}</p>`
    : "";
}

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
  const shown = hits.slice(0, shownCount(pick));
  const n = filterCount(filter);

  const cells = pickCells(shown, lang, multi, sel);
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
           ${pickRest(hits.length - shown.length, t)}`
        : `<p class="empty">${esc(t("empty"))}</p>`
    }`;

  /*
   * 多選的動作列貼在面板底部，不排在格子牆後面。
   * 選完要捲到最底才按得到「加入」的話，一次加很多隻反而更累。
   * 沒在多選就整條不畫，單選的版面跟以前一模一樣。
   */
  if (multi) renderPickFoot(sel.size, t, pick.shiny, countHidden(sel, shown));
  else railFoot("");
}

/**
 * 捲到底時接下一批。
 *
 * **只 append，不重畫。** `#panel` 是捲動容器，重畫會把 scrollTop 歸零，
 * 使用者會被彈回最上面——而他正在往下捲，這是最糟的時機。
 * 所以這裡只做三件事：新的幾格塞到格子牆後面、更新哨兵那一行、
 * 更新底部的數字（多選時「N 隻在篩選外」會因為接出來而變少）。
 *
 * 回傳新的「已經畫到第幾筆」，由 main.js 寫回 `state.pick.shown`。
 * 已經畫完就回原值，呼叫端不必先問。
 */
export function growPicker(pick, lang, t) {
  const hits = search(applyFilter(ENTRIES, pick.filter || {}), pick.query || "");
  /*
   * 夾到命中數：一批是 200，但這次搜尋可能只有 105 筆。
   * 不夾的話已經畫完時會回一個比實際格子還大的數字，
   * main.js 把它寫進 `shown`，「N 隻在篩選外」就會算錯。
   */
  const from = Math.min(shownCount(pick), hits.length);
  if (from >= hits.length) return from;

  const to = Math.min(from + PICK_STEP, hits.length);
  const grid = $("#panel").querySelector(".pick-grid");
  if (!grid) return from; // 面板換成別的了，什麼都不做

  const multi = !!pick.multi;
  const sel = new Set(pick.sel || []);
  grid.insertAdjacentHTML(
    "beforeend",
    pickCells(hits.slice(from, to), lang, multi, sel)
  );

  /*
   * 哨兵那一行整個換掉而不是改 textContent：接完最後一批要連元素一起
   * 消失，main.js 靠「還在不在」判斷要不要再接。
   */
  const rest = $("#panel").querySelector("[data-pickrest]");
  if (rest) rest.outerHTML = pickRest(hits.length - to, t);

  if (multi)
    renderPickFoot(sel.size, t, pick.shiny, countHidden(sel, hits.slice(0, to)));
  return to;
}

/**
 * 多選動作列的內容。
 *
 * 單獨一個函式是因為點一格不能重畫整片：`#panel` 是捲動容器，
 * 換掉 innerHTML 會把 scrollTop 歸零，選到第七排點一下就彈回最上面。
 * 所以 main.js 點格子時只改那一格的 class，動作列走這裡。
 */
export function renderPickFoot(n, t, shiny, hidden = 0) {
  railFoot(
    `<div class="pick-foot-l">
       <button type="button" class="mk shiny" data-pickshiny
               aria-pressed="${!!shiny}">${esc(t("markShiny"))}</button>
       <span class="dim">${esc(t("pickSel", n))}${
      hidden ? esc(t("pickHidden", hidden)) : ""
    }</span>
     </div>
     <button type="button" class="pick-add" data-addmulti${
       n ? "" : " disabled"
     }>${esc(t("pickAdd", n))}</button>`
  );
}

/**
 * 複製搜尋字串的確認面板。
 *
 * 按下交換表的複製鈕**不直接寫剪貼簿**，先把字串攤出來（2026-09-17，
 * 使用者要求）。理由是那串字長得跟原清單完全不像
 * （`異色,4,19&7,4,19`），複製完只有一句 toast 的話，使用者無從判斷
 * 自己拿到的是不是對的東西，更不會發現「有幾隻的條件被放掉了」。
 *
 * 所以提醒也從 toast 搬到這裡：**複製前就看得到**，還來得及決定要不要複製。
 * toast 那邊只留「已複製」。
 *
 * 字串本身可以選取，手機長按也複製得了——底下那顆鈕失敗時還有一條路。
 */
export function renderCopy(v, t) {
  const warns = [
    v.dropped ? t("copyDropped", v.dropped) : "",
    v.long ? t("copyLong") : "",
  ].filter(Boolean);

  $("#panel").innerHTML = `
    <div class="copy-head">
      <div class="d-name">${esc(
        t("copyPanel", v.col === "want" ? t("colWant") : t("colHave"))
      )}</div>
      <div class="d-meta">${esc(t("copyHint"))}</div>
    </div>

    ${warns
      .map((w) => `<p class="copy-warn">${esc(w)}</p>`)
      .join("")}

    <div class="copy-str">${esc(v.str)}</div>`;

  /*
   * 底部只有一顆鈕，不像多選那條動作列左邊還掛著數字與異色開關。
   * 「幾隻」留給複製後的 toast：這裡要的是「按下去會發生什麼」，
   * 多一個數字反而讓那顆鈕不是一眼就看得到的那個東西。
   */
  railFoot(
    `<button type="button" class="pick-add wide" data-docopy>${esc(
      t("copyDo")
    )}</button>`
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
    <img ${bgAttrs(card)} class="card-art" alt="" />
    ${list}`;

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

/* ─────────── 知識 ─────────── */

/**
 * 分類代碼對到 i18n 的 key。
 * 寫成表不寫成字串拼接，`check.mjs` 才驗得出 `KB_CATS` 與這裡沒有寫岔。
 */
const KB_CAT_KEY = {
  trade: "kbCatTrade",
  search: "kbCatSearch",
};

export const kbCatName = (cat, t) =>
  KB_CAT_KEY[cat] ? t(KB_CAT_KEY[cat]) : cat;

/** 格子牆的排序：先照 `KB_CATS` 的順序分群，同一群保持 kbdata 裡的順序 */
const kbSorted = () =>
  KB_ENTRIES.map((e, i) => ({ e, i })).sort((a, b) => {
    const ga = KB_CATS.indexOf(a.e.cat);
    const gb = KB_CATS.indexOf(b.e.cat);
    return ga === gb ? a.i - b.i : ga - gb;
  }).map(({ e }) => e);

/**
 * 知識檢視的格子牆。
 *
 * **一格是一條真的連結，不是 `<button>`**：它指向一頁真的 HTML
 * （`kb/<slug>/`），中鍵開新分頁、右鍵複製連結都要能用。
 * 點擊不經過 main.js 的委派，瀏覽器自己走。
 *
 * **格子裡沒有圖**，這是這個站唯一純文字的格子牆。知識沒有一張能代表它
 * 的圖，硬塞一張佔了位置卻講不出內容；摘要那一行才是這面牆的內容，
 * 少了它就只剩一份目錄，看不出值不值得點進去。插圖在內文裡（`kb/img/`）。
 *
 * 內容目前只有繁中（待辦 A 的決定），所以標題與摘要不吃 `lang`；
 * 分類與更新日是介面文字，跟著 `t` 走。
 */
export function renderKb(t) {
  if (!KB_ENTRIES.length) {
    $("#app").innerHTML = `<p class="dim pad">${esc(t("kbEmpty"))}</p>`;
    return;
  }

  const cards = kbSorted()
    .map(
      (e) => `<a class="kb-card" href="kb/${esc(e.slug)}/">
      <span class="kb-cat" data-cat="${esc(e.cat)}">${esc(kbCatName(e.cat, t))}</span>
      <span class="kb-t">${esc(e.title)}</span>
      <span class="kb-s">${esc(e.summary)}</span>
      <span class="kb-d">${esc(t("kbUpdated", e.updated))}</span>
    </a>`
    )
    .join("");

  $("#app").innerHTML = `<div class="kb-grid">${cards}</div>`;
}

export { MAX_ITEMS };
