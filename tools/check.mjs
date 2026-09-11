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
    "localNotice", "viewTitle", "scrim", "sidebar",
    "searchbar", "importFile", "listName", "shareBtn",
    "displayTitle", "displayOpts", "trainerCode", "filterBtn",
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
const extra = await import("../js/extra.js");

/** 背卡檢視的狀態，畫面測試用。收合狀態不影響資料正確性，給預設值就好 */
const BG_STATE = { query: "", scope: "all", open: new Set() };
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

  /*
   * extra.js 補的條目，上游哪天補上了就該讓位。
   * 沒讓位的話圖鑑會出現兩張一模一樣的卡，而且是兩個不同的 id。
   */
  const superseded = extra.supersededEntries();
  ok(
    "補充條目沒有跟圖鑑重複",
    !superseded.length,
    superseded.length
      ? `${superseded.map((e) => e.id).join(", ")} 已被 godex 收錄，可以從 js/extra.js 刪掉`
      : ""
  );

  /*
   * ALIAS 是給命名不同的裝扮對起來用的。
   * 它指到的代碼要真的存在，否則這條對照早就失效了，去重會漏掉。
   */
  const codes = new Set(
    dex.ENTRIES.filter((e) => e.costume || e.form).map((e) =>
      String(e.costume || e.form).toLowerCase().replace(/_/g, "-")
    )
  );
  const staleAlias = Object.entries(extra.ALIAS).filter(([, v]) => !codes.has(v));
  ok(
    "ALIAS 指到的代碼都還在",
    !staleAlias.length,
    staleAlias.map(([k, v]) => `${k} → ${v}`).join(", ")
  );
}

console.log("\n2b. 篩選");
{
  const f = dex.emptyFilter();
  ok("空條件等於全部", dex.applyFilter(dex.ENTRIES, f).length === dex.ENTRY_COUNT);
  ok("空條件的計數是 0", dex.filterCount(f) === 0);

  // 組內 OR
  const fire = dex.emptyFilter();
  fire.type = ["fire"];
  const water = dex.emptyFilter();
  water.type = ["water"];
  const both = dex.emptyFilter();
  both.type = ["fire", "water"];
  const nF = dex.applyFilter(dex.ENTRIES, fire).length;
  const nW = dex.applyFilter(dex.ENTRIES, water).length;
  const nB = dex.applyFilter(dex.ENTRIES, both).length;
  ok("組內是 OR 不是 AND", nB > nF && nB > nW);
  ok("兩種屬性沒有重複計算", nB <= nF + nW);

  // 組間 AND
  const andF = dex.emptyFilter();
  andF.type = ["fire"];
  andF.gen = ["gen4"];
  const nAnd = dex.applyFilter(dex.ENTRIES, andF).length;
  ok("組間是 AND", nAnd < nF && nAnd > 0);

  // 每一組的選項加起來要蓋住整組不設限的結果
  let genSum = 0;
  for (const [k] of dex.FILTER_GROUPS.gen.options) {
    const g = dex.emptyFilter();
    g.gen = [k];
    genSum += dex.applyFilter(dex.ENTRIES, g).length;
  }
  ok("九個世代加起來等於全部", genSum === dex.ENTRY_COUNT, String(genSum));

  // skip 參數：算某一組的計數時要放掉自己
  const skipped = dex.applyFilter(dex.ENTRIES, andF, "gen").length;
  ok("skip 會放掉指定的那一組", skipped === nF);

  ok("計數會累加", dex.filterCount(andF) === 2);

  // 髒資料
  const dirty = dex.normalizeFilter({ type: ["fire", "nope", 7], bogus: ["x"] });
  ok("認不得的選項會被丟掉", dirty.type.length === 1 && dirty.type[0] === "fire");
  ok("認不得的群組不會混進來", !("bogus" in dirty));
  ok("不是物件也不會炸", dex.filterCount(dex.normalizeFilter(null)) === 0);

  // 有背卡可拿
  const bgF = dex.emptyFilter();
  bgF.other = ["bg"];
  const bgHits = dex.applyFilter(dex.ENTRIES, bgF);
  const bgSet = new Set(bg.allBgEntryIds());
  ok(
    "有背卡的條目對得上背卡資料",
    bgHits.length > 0 && bgHits.every((e) => bgSet.has(e.id))
  );
}

console.log("\n3. 背卡");
{
  const missing = [];
  for (const { card } of bg.allCards()) {
    for (const e of bg.entriesOf(card)) if (!dex.find(e.id)) missing.push(e.id);
  }
  ok(`收集格 ${bg.totalCardSlots()} 個`, bg.totalCardSlots() > 0);
  ok("引用的條目都存在", !missing.length, [...new Set(missing)].slice(0, 5).join(", "));

  const noAsset = bg.CARDS.filter((c) => !c.asset);
  ok(`每張背卡都有上游檔名（${bg.CARD_COUNT} 張）`, !noAsset.length,
     noAsset.map((c) => c.id).join(", "));

  const ids = bg.CARDS.map((c) => c.id);
  ok("背卡 id 不重複", new Set(ids).size === ids.length);

  /*
   * id 是使用者紀錄的鍵，存在 item.bg 裡，normalize 會截到 40 字。
   * 超過就會被截斷，使用者的紀錄從此對不回來。
   */
  const tooLong = ids.filter((id) => id.length > 40);
  ok("背卡 id 不超過 40 字", !tooLong.length, tooLong.join(", "));

  /*
   * 回歸測試：這十七個 id 已經發布，存在使用者的 localStorage 裡。
   * 腳本重跑或資料重整都不可以讓它們消失。
   */
  const PUBLISHED = [
    "gf26-global", "gf26-mewtwo", "gf26-tokyo", "gf26-chicago", "gf26-copenhagen",
    "gt26-mega", "gt26-x", "gt26-y", "gt26-diamond", "gt26-pearl", "gt26-ruby",
    "gt26-sapphire", "gt26-gold", "gt26-silver", "gt26-la", "gt26-tainan",
    "pp26-kanto",
  ];
  const gone = PUBLISHED.filter((id) => !bg.findCard(id));
  ok(`既有 ${PUBLISHED.length} 個背卡 id 都還在`, !gone.length, gone.join(", "));

  const badSeries = bg.CARDS.filter((c) => !bg.SERIES.some((s) => s.id === c.series));
  ok("每張背卡的收納夾都有名稱", !badSeries.length,
     [...new Set(badSeries.map((c) => c.series))].join(", "));

  ok(`收納夾 ${bg.FOLDERS.length} 個都不是空的`,
     bg.FOLDERS.every((f) => f.cards.length));
}

console.log("\n4. 儲存往返");
{
  const data = store.emptyData();
  data.want.push({ ...store.newItem("d150"), xxl: true });
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
    want: [{ id: "d1", shiny: "yes", bg: "x".repeat(200) }, null, { nope: 1 }],
    name: { want: 123 },
  });
  ok("髒資料會被洗乾淨", dirty.want.length === 1 && dirty.want[0].shiny === true);
  ok("過長字串會截斷", dirty.want[0].bg.length === 40);
  ok("舊版的備註欄位會被洗掉", !("note" in dirty.want[0]));
  ok("非字串清單名變空字串", dirty.name.want === "");

  ok("代碼只留數字", store.cleanCode("4992-3022 0284") === "499230220284");
  ok("代碼最多 12 碼", store.cleanCode("1".repeat(30)).length === 12);
  ok("代碼四碼一組", store.formatCode("499230220284") === "4992 3022 0284");
  ok("代碼不足 12 碼也能顯示", store.formatCode("49923") === "4992 3");
  ok("空代碼是空字串", store.formatCode(null) === "");
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
  run("renderChrome 帶顯示選項", () =>
    ui.renderChrome(t, "zh", { big: true, names: false })
  );
  run("renderViews", () => ui.renderViews("dex", t));
  run("renderFilterBtn", () => ui.renderFilterBtn(dex.emptyFilter(), t));
  run("renderFilterPanel", () =>
    ui.renderFilterPanel(dex.emptyFilter(), "zh", t)
  );
  run("renderFilterPanel 有選條件", () => {
    const f = dex.emptyFilter();
    f.type = ["fire", "water"];
    f.gen = ["gen4"];
    f.other = ["bg"];
    ui.renderFilterPanel(f, "zh", t);
  });
  run("renderGrid", () =>
    ui.renderGrid(dex.ENTRIES.slice(0, 60), data, "zh", t)
  );
  run("renderGrid 空清單", () => ui.renderGrid([], data, "zh", t));
  run("renderTrade", () => ui.renderTrade(data, "zh", t));
  run("renderTrade 帶背卡的格子", () => {
    const withBg = store.normalize({
      v: 1,
      want: [{ id: "d150", bg: "gf26-copenhagen" }],
      have: [],
    });
    ui.renderTrade(withBg, "zh", t);
  });
  run("renderTrade 帶訓練家代碼", () =>
    ui.renderTrade(data, "zh", t, "499230220284")
  );
  run("renderTrade 空清單", () => ui.renderTrade(store.emptyData(), "zh", t));
  run("renderBg", () => ui.renderBg(BG_STATE, "zh", t));
  run("renderBg 展開一個收納夾", () =>
    ui.renderBg({ ...BG_STATE, open: new Set(["gofest"]) }, "zh", t)
  );
  run("renderBg 搜尋", () =>
    ui.renderBg({ ...BG_STATE, query: "tokyo" }, "zh", t)
  );
  run("renderBg 搜尋沒有結果", () =>
    ui.renderBg({ ...BG_STATE, query: "zzzzz" }, "zh", t)
  );
  run("renderBg 只看地區限定", () =>
    ui.renderBg({ ...BG_STATE, scope: "regional" }, "zh", t)
  );
  run("renderBg 只看全球", () =>
    ui.renderBg({ ...BG_STATE, scope: "global" }, "zh", t)
  );
  run("toast", () => ui.toast("hi"));

  /*
   * 同一隻寶可夢可以配不同背卡各收一筆，詳情面板要把那幾筆都列出來，
   * 而且每一筆帶自己的索引，否則改其中一筆會改到另一筆。
   */
  run("renderDetail 同一隻配不同背卡各一筆", () => {
    const id = dex.ENTRIES.map((e) => e.id).find(
      (x) => bg.cardsFor(x).length >= 2
    );
    const picks = bg.cardsFor(id);
    const multi = store.normalize({
      v: 1,
      want: [
        { id, bg: picks[0].card.id },
        { id, bg: picks[1].card.id },
      ],
      have: [],
    });
    ui.renderDetail(id, multi, "zh", t);
    const idx = [...els.panel.innerHTML.matchAll(/data-idx="(\d+)"/g)].map(
      (m) => m[1]
    );
    if (idx.join(",") !== "0,1") throw new Error(`列出的索引是 ${idx.join(",")}`);
  });

  // 草稿是「還沒加進清單」的條件，面板上要看得出哪些已經選了
  run("renderDetail 草稿的條件與背卡有標起來", () => {
    const id = dex.ENTRIES.map((e) => e.id).find(
      (x) => bg.cardsFor(x).length >= 1
    );
    const card = bg.cardsFor(id)[0].card.id;
    ui.renderDetail(id, store.emptyData(), "zh", t, {
      shiny: false,
      xxl: true,
      xxs: false,
      bg: card,
    });
    const html = els.panel.innerHTML;
    if (!/data-draft="xxl"\s+aria-pressed="true"/.test(html))
      throw new Error("XXL 沒有標起來");
    if (!html.includes(`data-pick="${card}" aria-pressed="true"`))
      throw new Error("選起來的背卡沒有標起來");
    if (!/data-pick=""\s+aria-pressed="false"/.test(html))
      throw new Error("「不指定」那一列的狀態不對");
    if (html.includes('data-idx="'))
      throw new Error("還沒加進清單就不該出現編輯區");
  });

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
  ok(`renderCardDetail 全部 ${bg.CARD_COUNT} 張`, !cardErr, cardErr);

  // 三種語言都要能畫
  for (const l of LANGS) {
    const tl = makeT(l.code);
    run(`三語繪製 ${l.code}`, () => {
      ui.renderGrid(dex.ENTRIES.slice(0, 30), data, l.code, tl);
      ui.renderTrade(data, l.code, tl);
      ui.renderBg(BG_STATE, l.code, tl);
      ui.renderDetail("d150", data, l.code, tl);
    });
  }
}

console.log("\n6. 逸出");
{
  const evil = '<img src=x onerror=alert(1)>';
  ok("esc 會擋掉標籤", !ui.esc(evil).includes("<img"));
  const data = store.emptyData();
  data.want.push(store.newItem("d150"));
  data.name.want = evil;
  ui.renderTrade(data, "zh", makeT("zh"));
  ok("清單名稱不會直接插進 HTML", !els.app.innerHTML.includes("<img src=x"));
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

  /*
   * 背卡全部驗，不抽樣。圖改連上游之後，上游改一個檔名就會破圖，
   * 而背卡只有兩百多張，驗得完。
   */
  console.log("\n8. 背卡圖片網址");
  let bad = [];
  for (const card of bg.CARDS) {
    const res = await fetch(bg.bgUrl(card), { method: "HEAD" });
    if (!res.ok) bad.push(`${card.id} ${res.status}`);
  }
  ok(`背卡圖片 ${bg.CARD_COUNT} 張都取得到`, !bad.length, bad.slice(0, 5).join(", "));
}

console.log(fail ? `\n失敗 ${fail} 項\n` : "\n全部通過\n");
process.exitCode = fail ? 1 : 0;
