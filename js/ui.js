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
import { EVENTS, allCards, entriesOf, cardsFor } from "./backgrounds.js";
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
 * 詳情面板裡的條件編輯區。
 *
 * 所有文字型的設定都集中在這裡，交換表本身只顯示圖與符號。
 * 沒加進這一欄就不顯示，避免面板變成一長串沒用的選項。
 */
function editBlock(col, data, id, e, lang, t) {
  const idx = data[col].findIndex((x) => x.id === id);
  if (idx < 0) return "";
  const item = data[col][idx];

  const mk = (field, label, cls) =>
    `<button type="button" class="mk ${cls}" data-field="${field}"
             aria-pressed="${!!item[field]}">${esc(label)}</button>`;

  const cards = cardsFor(id);
  const bgSelect = cards.length
    ? `<select data-field="bg">
         <option value="">${esc(t("bgAny"))}</option>
         ${cards
           .map(
             ({ card }) =>
               `<option value="${esc(card.id)}"${
                 card.id === item.bg ? " selected" : ""
               }>${esc(card[lang] || card.en)}</option>`
           )
           .join("")}
       </select>`
    : "";

  return `<div class="d-edit ${col}" data-col="${col}" data-idx="${idx}">
    <p class="d-sect">${esc(col === "want" ? t("colWant") : t("colHave"))}</p>
    <div class="marks">
      ${hasShiny(e) ? mk("shiny", t("markShiny"), "shiny") : ""}
      ${mk("xxl", t("markXxl"), "xxl")}
      ${mk("xxs", t("markXxs"), "xxs")}
    </div>
    ${bgSelect}
  </div>`;
}

export function renderDetail(id, data, lang, t) {
  const e = find(id);
  if (!e) return;

  const inWant = data.want.some((i) => i.id === id);
  const inHave = data.have.some((i) => i.id === id);

  const types = e.types
    .map((ty) => {
      const info = typeInfo(ty, lang);
      return `<span class="type" style="background:${info.color}">${esc(
        info.name
      )}</span>`;
    })
    .join("");

  const cards = cardsFor(id);
  const bgBlock = cards.length
    ? `<div class="bg-list">${cards
        .map(
          ({ event, card, note }) => `<div class="bg-row">
            <img src="${esc(card.img)}" alt="" loading="lazy" />
            <div>
              <div class="t">${esc(card[lang] || card.en)}</div>
              <div class="s">${esc(event[lang] || event.en)}${
            note && note[lang] ? ` · ${esc(note[lang])}` : ""
          }</div>
            </div>
          </div>`
        )
        .join("")}</div>`
    : `<p class="dim">${esc(t("bgNone"))}</p>`;

  const form = formName(e, lang);

  $("#panel").innerHTML = `
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

    <div class="d-actions">
      <button type="button" class="want" data-add="want" aria-pressed="${inWant}">${esc(
    t("addWant")
  )}</button>
      <button type="button" class="have" data-add="have" aria-pressed="${inHave}">${esc(
    t("addHave")
  )}</button>
    </div>

    ${editBlock("want", data, id, e, lang, t)}
    ${editBlock("have", data, id, e, lang, t)}

    <p class="d-sect">${esc(t("bgSection"))}</p>
    ${bgBlock}

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

  const hit = item.bg ? allCards().find((x) => x.card.id === item.bg) : null;
  const bgLayer = hit
    ? `<span class="want-bg" style="background-image:url('${esc(hit.card.img)}')"></span>`
    : "";

  /*
   * 異色是星星，疊在格子左上角。尺寸是文字，放在格子下方。
   * 兩者分開是因為尺寸有 XXL 與 XXS 兩種，塞進格子裡會蓋到圖。
   */
  const size = [item.xxl ? "XXL" : "", item.xxs ? "XXS" : ""]
    .filter(Boolean)
    .join(" ");

  return `<div class="cell want-cell" data-id="${esc(item.id)}">
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

  const body = rows.length
    ? `<div class="grid">${rows
        .map(({ it, idx }) => tradeCell(it, col, idx, lang, t))
        .join("")}</div>`
    : `<p class="empty">${esc(col === "want" ? t("emptyWant") : t("emptyHave"))}</p>`;

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
 * 訓練家代碼只是輸入框，畫面上不另外顯示，它的用途是印在分享圖底部。
 * 收到圖的人可以直接照著加好友，這是圖片唯一需要「讀字」的地方。
 */
export function renderTrade(data, lang, t, code = "") {
  const total = data.want.length + data.have.length;
  $("#app").innerHTML = `
    <div class="trade-head">
      <input id="listName" value="${esc(data.name.want)}"
             placeholder="${esc(t("listNameHint"))}" maxlength="24" />
      <input id="trainerCode" value="${esc(formatCode(code))}" inputmode="numeric"
             placeholder="${esc(t("trainerCodeHint"))}"
             aria-label="${esc(t("trainerCode"))}" maxlength="14" />
      <button type="button" class="btn-share" id="shareBtn"${
        total ? "" : " disabled"
      }>${esc(t("share"))}</button>
    </div>
    <div class="cols">
      ${tradeColumn("want", data.want, lang, t)}
      ${tradeColumn("have", data.have, lang, t)}
    </div>`;
}

/* ─────────── 背卡 ─────────── */

export function renderBg(lang, t) {
  $("#app").innerHTML = `<div class="bg-grid">${EVENTS.map(
    (ev) => `
    <h2 class="ev-title">${esc(ev[lang] || ev.en)}<span class="dim"> · ${esc(
      ev.date || ""
    )}</span></h2>
    ${ev.cards
      .map(
        (card) => `<button class="bg-card" type="button" data-card="${esc(card.id)}">
        <img src="${esc(card.img)}" alt="" loading="lazy" />
        <div class="b">
          <div class="t">${esc(card[lang] || card.en)}</div>
          <div class="s">${esc(t("bgSlots", card.pokemon.length))}</div>
        </div>
      </button>`
      )
      .join("")}`
  ).join("")}</div>`;
}

/** 單張背卡的詳情：列出所有可能帶有它的寶可夢 */
export function renderCardDetail(cardId, lang, t) {
  const hit = allCards().find(({ card }) => card.id === cardId);
  if (!hit) return;
  const { event, card } = hit;

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

  $("#panel").innerHTML = `
    <div class="d-name">${esc(card[lang] || card.en)}</div>
    <div class="d-meta">${esc(event[lang] || event.en)} · ${esc(
    t("bgSlots", card.pokemon.length)
  )}</div>
    ${
      card[`note_${lang}`]
        ? `<p class="d-meta">${esc(card[`note_${lang}`])}</p>`
        : ""
    }
    <img src="${esc(card.img)}" alt="" style="width:100%;border-radius:8px;margin:14px 0" />
    <p class="d-sect">${esc(t("bgSlots", card.pokemon.length))}</p>
    <div class="grid">${cells}</div>
    <button class="btn-close" type="button" data-close="1">${esc(t("close"))}</button>`;
}

export { MAX_ITEMS };
