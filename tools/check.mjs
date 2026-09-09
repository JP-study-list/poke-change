/**
 * check.mjs — 自我檢查
 *
 * 沒有測試框架，用 Node 直接驗證。每次改完跑一次：
 *   node tools/check.mjs
 *
 * 檢查項目：
 *   1. 三語 i18n key 完全一致
 *   2. 圖鑑條目欄位完整、id 不重複
 *   3. 背卡引用的條目都存在
 *   4. 儲存讀取往返後資料不變
 *   5. 每個繪製函式都能跑完不拋錯（用 DOM stub）
 *
 * 圖片網址不在這裡驗，那要連外網。需要時跑 --net。
 */

const NET = process.argv.includes("--net");

let fail = 0;
const ok = (name, cond, detail) => {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${detail ? "：" + detail : ""}`);
  }
};

/* ─────────── DOM stub ─────────── */

/**
 * 繪製函式只會 querySelector 幾個固定 id，然後塞 innerHTML。
 * 給它一組假的元素就能在 Node 裡跑完，不需要瀏覽器。
 */
function installDom() {
  const els = {};
  const mk = (id) => ({
    id,
    innerHTML: "",
    textContent: "",
    value: "",
    hidden: false,
    placeholder: "",
    dataset: {},
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains: () => false,
    },
    setAttribute() {},
    getAttribute: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => null,
    style: {},
  });
  for (const id of [
    "app", "panel", "sheet", "toast", "filters", "views", "langs", "q",
    "appName", "subtitle", "filterTitle", "dataTitle", "dataActions",
    "localNotice", "viewTitle", "scrim", "sidebar", "filterBlock",
    "searchbar", "importFile", "listName", "shareBtn",
  ]) {
    els[id] = mk(id);
  }
  globalThis.document = {
    querySelector: (s) => els[String(s).replace("#", "")] || null,
    querySelectorAll: () => [],
    documentElement: { lang: "" },
    createElement: () => mk("x"),
    addEventListener() {},
    body: { classList: { contains: () => false, toggle() {}, add() {} } },
  };
  globalThis.window = {
    matchMedia: () => ({ matches: false }),
    addEventListener() {},
  };
  globalThis.localStorage = (() => {
    const m = new Map();
    return {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: (k) => m.delete(k),
    };
  })();
  return els;
}

const els = installDom();

/* ─────────── 開跑 ─────────── */

const { STRINGS, LANGS, makeT } = await import("../js/i18n.js");
const dex = await import("../js/dex.js");
const store = await import("../js/store.js");
const bg = await import("../js/backgrounds.js");
const ui = await import("../js/ui.js");

console.log("\n1. i18n");
{
  const keys = Object.fromEntries(
    Object.entries(STRINGS).map(([l, v]) => [l, Object.keys(v).sort()])
  );
  const base = keys.zh;
  for (const [lang, k] of Object.entries(keys)) {
    const miss = base.filter((x) => !k.includes(x));
    const extra = k.filter((x) => !base.includes(x));
    ok(
      `${lang} 有 ${k.length} 個 key`,
      !miss.length && !extra.length,
      [miss.length ? "缺 " + miss.join(",") : "", extra.length ? "多 " + extra.join(",") : ""]
        .filter(Boolean)
        .join(" ")
    );
  }
  ok("LANGS 都有字典", LANGS.every((l) => STRINGS[l.code]));
}

console.log("\n2. 圖鑑條目");
{
  const ids = new Set();
  const dup = [];
  const badField = [];
  for (const e of dex.ENTRIES) {
    if (ids.has(e.id)) dup.push(e.id);
    ids.add(e.id);
    if (!e.zh || !e.ja || !e.en || !e.types.length || !e.kind) badField.push(e.id);
    if (!e.icon && !e.art) badField.push(e.id);
  }
  ok(`條目 ${dex.ENTRY_COUNT} 筆`, dex.ENTRY_COUNT > 1400);
  ok("id 不重複", !dup.length, dup.slice(0, 5).join(", "));
  ok("欄位完整", !badField.length, badField.slice(0, 5).join(", "));

  const names = new Map();
  const clash = [];
  for (const e of dex.ENTRIES) {
    const k = `${e.dex}|${dex.fullName(e, "zh")}`;
    if (names.has(k)) clash.push(k);
    names.set(k, e.id);
  }
  ok("沒有同名重複條目", !clash.length, clash.slice(0, 3).join(" / "));
}

console.log("\n3. 背卡");
{
  const missing = [];
  for (const { card } of bg.allCards()) {
    for (const e of bg.entriesOf(card)) if (!dex.find(e.id)) missing.push(e.id);
  }
  ok(`收集格 ${bg.totalCardSlots()} 個`, bg.totalCardSlots() > 0);
  ok("引用的條目都存在", !missing.length, [...new Set(missing)].slice(0, 5).join(", "));

  const noImg = bg.allCards().filter(({ card }) => !card.img);
  ok("每張背卡都有圖", !noImg.length);
}

console.log("\n4. 儲存往返");
{
  const data = store.emptyData();
  data.want.push({ ...store.newItem("d150"), xxl: true, note: "測試" });
  data.have.push(store.newItem("d25.cHALLOWEEN_2017", false));
  data.name.want = "測試清單";
  store.flush(data);
  const back = store.load();
  ok("往返後資料不變", JSON.stringify(back.want) === JSON.stringify(data.want));
  ok("清單名稱保留", back.name.want === "測試清單");

  const round = store.fromJSON(store.toJSON(data));
  ok("匯出匯入往返不變", JSON.stringify(round.have) === JSON.stringify(data.have));
  ok("壞掉的 JSON 回 null", store.fromJSON("{{{") === null);
  ok("空清單的匯入視為失敗", store.fromJSON('{"want":[],"have":[]}') === null);

  const dirty = store.normalize({
    want: [{ id: "d1", shiny: "yes", note: "x".repeat(200) }, null, { nope: 1 }],
    name: { want: 123 },
  });
  ok("髒資料會被洗乾淨", dirty.want.length === 1 && dirty.want[0].shiny === true);
  ok("過長備註會截斷", dirty.want[0].note.length === 60);
  ok("非字串清單名變空字串", dirty.name.want === "");
}

console.log("\n5. 繪製函式");
{
  const t = makeT("zh");
  ui.setLangs(LANGS);
  const data = store.emptyData();
  data.want.push(store.newItem("d150"));
  data.have.push(store.newItem("d25.xREDS_HAT", false));

  const run = (name, fn) => {
    try {
      fn();
      ok(name, true);
    } catch (err) {
      ok(name, false, err.message);
    }
  };

  run("renderChrome", () => ui.renderChrome(t, "zh"));
  run("renderViews", () => ui.renderViews("dex", t));
  run("renderFilters", () => ui.renderFilters("all", t));
  run("renderGrid", () =>
    ui.renderGrid(dex.ENTRIES.slice(0, 60), data, "zh", t)
  );
  run("renderGrid 空清單", () => ui.renderGrid([], data, "zh", t));
  run("renderTrade", () => ui.renderTrade(data, "zh", t));
  run("renderTrade 空清單", () => ui.renderTrade(store.emptyData(), "zh", t));
  run("renderBg", () => ui.renderBg("zh", t));
  run("toast", () => ui.toast("hi"));

  // 每個條目的詳情都畫一次，比只抽樣可靠
  let detailErr = null;
  for (const e of dex.ENTRIES) {
    try {
      ui.renderDetail(e.id, data, "zh", t);
    } catch (err) {
      detailErr = `${e.id} ${err.message}`;
      break;
    }
  }
  ok(`renderDetail 全部 ${dex.ENTRY_COUNT} 筆`, !detailErr, detailErr);

  let cardErr = null;
  for (const { card } of bg.allCards()) {
    try {
      ui.renderCardDetail(card.id, "zh", t);
    } catch (err) {
      cardErr = `${card.id} ${err.message}`;
      break;
    }
  }
  ok("renderCardDetail 全部 17 張", !cardErr, cardErr);

  // 三種語言都要能畫
  for (const l of LANGS) {
    const tl = makeT(l.code);
    run(`三語繪製 ${l.code}`, () => {
      ui.renderGrid(dex.ENTRIES.slice(0, 30), data, l.code, tl);
      ui.renderTrade(data, l.code, tl);
      ui.renderBg(l.code, tl);
      ui.renderDetail("d150", data, l.code, tl);
    });
  }
}

console.log("\n6. 逸出");
{
  const evil = '<img src=x onerror=alert(1)>';
  ok("esc 會擋掉標籤", !ui.esc(evil).includes("<img"));
  const data = store.emptyData();
  data.want.push({ ...store.newItem("d150"), note: evil });
  ui.renderTrade(data, "zh", makeT("zh"));
  ok("備註不會直接插進 HTML", !els.app.innerHTML.includes("<img src=x"));
}

if (NET) {
  console.log("\n7. 圖片網址（抽樣）");
  const pick = [];
  for (const kind of ["base", "form", "costume"]) {
    const rows = dex.ENTRIES.filter((e) => e.kind === kind);
    for (let i = 0; i < 3; i++) pick.push(rows[Math.floor((i * rows.length) / 3)]);
  }
  for (const e of pick) {
    const url = e.art || dex.goUrl(e.icon);
    const res = await fetch(url, { method: "HEAD" });
    ok(`${e.id} 圖片可取得`, res.ok, String(res.status));
  }
}

console.log(fail ? `\n失敗 ${fail} 項\n` : "\n全部通過\n");
process.exitCode = fail ? 1 : 0;
