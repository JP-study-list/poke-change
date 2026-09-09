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
  FILTERS,
  applyFilter,
  search,
} from "./dex.js";
import { typeInfo } from "./types.js";
import { EVENTS, allCards, entriesOf, cardsFor } from "./backgrounds.js";
import { MAX_ITEMS } from "./store.js";

const $ = (sel) => document.querySelector(sel);

/** HTML 逸出。條目名稱來自官方語言檔，備註來自使用者，兩者都要過 */
export function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

/* ─────────── 版面 ─────────── */

export function renderChrome(t, lang) {
  document.documentElement.lang = t("htmlLang");
  $("#appName").textContent = t("appName");
  $("#subtitle").textContent = t("subtitle");
  $("#q").placeholder = t("search");
  $("#filterTitle").textContent = t("viewDex");
  $("#dataTitle").textContent = t("data");
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

/* ─────────── 篩選列 ─────────── */

/** 篩選鍵 → i18n 鍵 */
const FILTER_LABEL = {
  all: "filterAll",
  base: "filterBase",
  form: "filterForm",
  costume: "filterCostume",
  regional: "filterRegional",
  shiny: "filterShiny",
  legendary: "filterLegendary",
  mythic: "filterMythic",
  ultra: "filterUltra",
};

export function renderFilters(active, t) {
  $("#filters").innerHTML = Object.keys(FILTER_LABEL)
    .map((k) => {
      const n = applyFilter(ENTRIES, k).length;
      return `<button type="button" data-filter="${k}" aria-pressed="${
        k === active
      }">${esc(t(FILTER_LABEL[k]))}<span class="count">${n}</span></button>`;
    })
    .join("");
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

    <p class="d-sect">${esc(t("bgSection"))}</p>
    ${bgBlock}

    <button class="btn-close" type="button" data-close="1">${esc(t("close"))}</button>`;
}

/* ─────────── 交換表 ─────────── */

/** 這個條目可以指定哪些背卡，給下拉選單用 */
function bgOptions(id, selected, lang, t) {
  const cards = cardsFor(id);
  if (!cards.length) return "";
  const opts = [`<option value="">${esc(t("bgAny"))}</option>`].concat(
    cards.map(
      ({ card }) =>
        `<option value="${esc(card.id)}"${
          card.id === selected ? " selected" : ""
        }>${esc(card[lang] || card.en)}</option>`
    )
  );
  return `<select data-field="bg">${opts.join("")}</select>`;
}

function renderItem(item, col, idx, lang, t) {
  const e = find(item.id);
  if (!e) return "";
  const mk = (field, label, cls) =>
    `<button type="button" class="mk ${cls}" data-field="${field}" aria-pressed="${!!item[
      field
    ]}">${esc(label)}</button>`;

  return `<div class="item" data-col="${col}" data-idx="${idx}">
    <img ${iconAttrs(e, item.shiny)} alt="" loading="lazy" />
    <div class="body">
      <div class="nm">${esc(fullName(e, lang))}</div>
      <div class="marks">
        ${hasShiny(e) ? mk("shiny", t("markShiny"), "shiny") : ""}
        ${mk("xxl", t("markXxl"), "xxl")}
        ${mk("xxs", t("markXxs"), "xxs")}
      </div>
      ${bgOptions(item.id, item.bg, lang, t)}
      <input class="note" data-field="note" value="${esc(item.note)}"
             placeholder="${esc(t("noteHint"))}" maxlength="60" />
    </div>
    <button type="button" class="del" data-del="1" aria-label="${esc(
      t("remove")
    )}">×</button>
  </div>`;
}

function renderColumn(col, items, lang, t) {
  const title = col === "want" ? t("colWant") : t("colHave");
  const body = items.length
    ? `<div class="items">${items
        .map((it, i) => renderItem(it, col, i, lang, t))
        .join("")}</div>`
    : `<p class="empty">${esc(col === "want" ? t("emptyWant") : t("emptyHave"))}</p>`;

  return `<section class="col ${col}">
    <div class="col-head">
      <span class="t">${esc(title)}</span>
      <span class="n">${esc(t("itemCount", items.length))}</span>
    </div>
    ${body}
  </section>`;
}

export function renderTrade(data, lang, t) {
  const total = data.want.length + data.have.length;
  $("#app").innerHTML = `
    <div class="trade-head">
      <input id="listName" value="${esc(data.name.want)}"
             placeholder="${esc(t("listNameHint"))}" maxlength="24" />
      <button type="button" class="btn-share" id="shareBtn"${
        total ? "" : " disabled"
      }>${esc(t("share"))}</button>
    </div>
    <div class="cols">
      ${renderColumn("want", data.want, lang, t)}
      ${renderColumn("have", data.have, lang, t)}
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
