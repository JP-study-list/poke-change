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
  fullName,
  speciesName,
  formName,
  iconAttrs,
  hasShiny,
  FILTER_GROUPS,
  GROUP_KEYS,
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
  $("#displayTitle").textContent = t("display");
  $("#dataTitle").textContent = t("data");

  /*
   * 兩個顯示選項用 aria-pressed 表示開關，實際的版面切換靠
   * body 的 class，這樣圖鑑與交換表不必各自傳一個旗標下去。
   */
  $("#displayOpts").innerHTML = `
    <button type="button" data-disp="big" aria-pressed="${!!disp.big}">${esc(
    t("bigIcons")
  )}</button>
    <button type="button" data-disp="names" aria-pressed="${!!disp.names}">${esc(
    t("showNames")
  )}</button>`;
  $("#localNotice").innerHTML = `<strong>${esc(t("localOnly"))}</strong>${esc(
    t("localHint")
  )}`;

  $("#langs").innerHTML = LANG_BTNS(lang);
  $("#dataActions").innerHTML = `
    <button type="button" data-act="export">${esc(t("export"))}</button>
    <button type="button" data-act="import">${esc(t("import"))}</button>
    <button type="button" class="danger" data-act="reset">${esc(t("reset"))}</button>`;
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

/** 檢視切換 */
export function renderViews(view, t) {
  const items = [
    ["dex", t("viewDex")],
    ["trade", t("viewTrade")],
    ["bg", t("viewBg")],
  ];
  $("#views").innerHTML = items
    .map(
      ([k, label]) =>
        `<button type="button" data-view="${k}" aria-pressed="${
          k === view
        }">${esc(label)}</button>`
    )
    .join("");
}

/** 側欄開合。手機才有意義，桌機永遠開著 */
export function setSidebar(open) {
  document.body.classList.toggle("side-open", open);
  $("#scrim").hidden = !open;
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

/* ─────────── 篩選 ─────────── */

/**
 * 搜尋列旁邊那顆鈕。有選條件時顯示個數，讓人知道畫面被篩過。
 *
 * 這很重要：篩選面板關起來之後，唯一還看得到「現在有條件」的地方
 * 就是這顆鈕。沒有這個提示就會出現「我的寶可夢怎麼不見了」。
 */
export function renderFilterBtn(filter, t) {
  const n = filterCount(filter);
  const btn = $("#filterBtn");
  btn.innerHTML = `${esc(t("filterBtn"))}${
    n ? `<span class="count">${n}</span>` : ""
  }`;
  btn.setAttribute("aria-pressed", n > 0);
}

/**
 * 篩選面板。跟條目詳情共用同一個 sheet。
 *
 * 每個選項後面的數字是「扣掉自己這一組之後還剩幾筆」，
 * 不是「這個條件本身有幾筆」。這樣才看得出點下去會剩多少，
 * 而且同一組裡的選項加起來才會等於這一組全不選的結果。
 */
export function renderFilterPanel(filter, lang, t) {
  const total = applyFilter(ENTRIES, filter).length;

  const groups = GROUP_KEYS.map((g) => {
    const grp = FILTER_GROUPS[g];
    const picked = filter[g] || [];
    // 這一組的計數基準：其他組都套用，這一組放掉
    const pool = applyFilter(ENTRIES, filter, g);

    const opts = grp.options
      .map(([key, pred]) => {
        const n = pool.filter(pred).length;
        const info = grp.labelOf ? null : typeInfo(key, lang);
        const label = info ? info.name : t(grp.labelOf(key));
        const dot = info
          ? `<i class="swatch" style="background:${esc(info.color)}"></i>`
          : "";
        return `<button type="button" class="fopt" data-group="${g}" data-opt="${esc(
          key
        )}" aria-pressed="${picked.includes(key)}"${n ? "" : " disabled"}>
          ${dot}${esc(label)}<span class="count">${n}</span>
        </button>`;
      })
      .join("");

    return `<section class="fgroup">
      <p class="fgroup-title">${esc(t(grp.label))}</p>
      <div class="fopts">${opts}</div>
    </section>`;
  }).join("");

  $("#panel").innerHTML = `
    <div class="f-head">
      <div class="d-name">${esc(t("filterBtn"))}</div>
      <div class="d-meta">${esc(t("filterHits", total))}</div>
    </div>
    ${groups}
    <button type="button" class="btn-clear" data-fclear${
      filterCount(filter) ? "" : " disabled"
    }>${esc(t("filterClear"))}</button>
    <button class="btn-close" type="button" data-close="1">${esc(t("close"))}</button>`;
}

/* ─────────── 圖鑑 ─────────── */

/** 目前條件下要顯示哪些條目 */
export function visibleEntries(filter, query) {
  return search(applyFilter(ENTRIES, filter), query);
}

/**
 * 圖鑑格狀清單。
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
        ${tags ? `<span class="tags">${tags}</span>` : ""}
        <img ${iconAttrs(e, false)} alt="" loading="lazy" />
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
const CLS_LABEL = {
  normal: "clsNormal",
  legendary: "clsLegendary",
  mythic: "clsMythic",
  ultra_beast: "clsUltraBeast",
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
 * 已經在清單裡的那幾筆列在按鈕下方，各自編輯，互不干擾。
 */
export function renderDetail(id, data, lang, t, draft = null, flash = null, back = false) {
  const e = find(id);
  if (!e) return;

  // 沒有草稿（例如自我檢查直接呼叫）就當場開一份，繪製不依賴 main.js 的狀態
  const d = draft || { shiny: hasShiny(e), xxl: false, xxs: false, bg: "" };

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

  $("#panel").innerHTML = `
    ${
      back
        ? `<button type="button" class="btn-back" data-pickback="1">${esc(
            t("back")
          )}</button>`
        : ""
    }
    <div class="d-head">
      <img ${iconAttrs(e, false)} alt="" />
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
              title="${esc(t("remove"))}">×</button>
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
function tradeColumn(col, items, lang, t) {
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

  const body = `<div class="grid">${rows
    .map(({ it, idx }) => tradeCell(it, col, idx, lang, t))
    .join("")}${plus}</div>${
    rows.length
      ? ""
      : `<p class="empty">${esc(
          col === "want" ? t("emptyWant") : t("emptyHave")
        )}</p>`
  }`;

  return `<section class="col ${col}">
    <div class="col-head">
      <i class="dot"></i>
      <span class="t">${esc(title)}</span>
      <span class="n">${esc(t("itemCount", rows.length))}</span>
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
export function renderTrade(book, lang, t, code = "") {
  const data = book.lists[book.active] || book.lists[0];
  const total = data.want.length + data.have.length;

  const tabs = book.lists
    .map((l, i) => {
      const n = l.want.length + l.have.length;
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
      <button type="button" class="btn-share" id="shareBtn"${
        total ? "" : " disabled"
      }>${esc(t("share"))}</button>
    </div>
    <div class="cols">
      ${tradeColumn("want", data.want, lang, t)}
      ${tradeColumn("have", data.have, lang, t)}
    </div>`;
}

/**
 * 交換表的加號開的選寶可夢面板。
 *
 * 這裡的搜尋跟圖鑑檢視是兩回事：不套用圖鑑當下的篩選，
 * 否則使用者在圖鑑篩了「只看傳說」，從交換表按加號會看到一片空白，
 * 而且不會知道為什麼。
 *
 * 一次最多畫 150 筆。面板很窄，全部一千多筆畫下去只是拖慢開啟，
 * 沒有人會捲到底，要找特定一隻本來就該打字。
 */
const PICK_MAX = 150;

export function renderPicker(pick, lang, t) {
  const hits = search(ENTRIES, pick.query || "");
  const shown = hits.slice(0, PICK_MAX);

  const cells = shown
    .map((e) => {
      const form = formName(e, lang);
      return `<button class="cell" type="button" data-id="${esc(e.id)}">
        <img ${iconAttrs(e, false)} alt="" loading="lazy" />
        <span class="nm">${esc(speciesName(e, lang))}${
        form ? `<span class="form">${esc(form)}</span>` : ""
      }</span>
      </button>`;
    })
    .join("");

  $("#panel").innerHTML = `
    <div class="f-head">
      <div class="d-name">${esc(
        pick.col === "want" ? t("addWant") : t("addHave")
      )}</div>
      <div class="d-meta">${esc(t("pickHint"))}</div>
    </div>
    <input id="pickQ" class="pick-q" value="${esc(pick.query || "")}"
           placeholder="${esc(t("search"))}" />
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

  const body = folders
    .map(({ folder, cards, total }) => {
      const open = q ? true : bg.open.has(folder.id);
      return `<section class="bg-folder">
      <button class="folder-head" type="button" data-folder="${esc(folder.id)}"
              aria-expanded="${open}">
        <span class="nm">${esc(folderName(folder, lang))}</span>
        <span class="ct">${esc(t("bgCount", q ? `${cards.length}/${total}` : total))}</span>
      </button>
      <div class="bg-grid"${open ? "" : " hidden"}>${cards.map(bgCard(lang, t)).join("")}</div>
    </section>`;
    })
    .join("");

  $("#app").innerHTML = `${tools}<div class="bg-folders">${body}</div>`;
}

/** 一張背卡的方格。收集格是零的不寫張數，寫了只會讓人以為壞掉 */
const bgCard = (lang, t) => (card) =>
  `<button class="bg-card" type="button" data-card="${esc(card.id)}">
    <img ${bgAttrs(card)} alt="" loading="lazy" />
    <div class="b">
      <div class="t">${esc(cardName(card, lang))}</div>
      <div class="s">${esc(
        card.pokemon.length ? t("bgSlots", card.pokemon.length) : card.date || ""
      )}</div>
    </div>
  </button>`;

/** 單張背卡的詳情：列出所有可能帶有它的寶可夢 */
export function renderCardDetail(cardId, lang, t) {
  const hit = allCards().find(({ card }) => card.id === cardId);
  if (!hit) return;
  const { folder, card } = hit;

  const cells = entriesOf(card)
    .map(({ id, note }) => {
      const e = find(id);
      if (!e) return "";
      const form = formName(e, lang);
      const extra = note && note[lang] ? note[lang] : form;
      return `<button class="cell" type="button" data-id="${esc(id)}">
        <img ${iconAttrs(e, false)} alt="" loading="lazy" />
        <span class="no">#${e.dex}</span>
        <span class="nm">${esc(speciesName(e, lang))}${
        extra ? `<span class="form">${esc(extra)}</span>` : ""
      }</span>
      </button>`;
    })
    .join("");

  // 骨架那批還沒有寶可夢清單，講明白比留一塊空白好
  const list = card.pokemon.length
    ? `<p class="d-sect">${esc(t("bgSlots", card.pokemon.length))}</p>
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
}

export { MAX_ITEMS };
