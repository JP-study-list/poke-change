/**
 * check.mjs — 自我檢查
 *
 * 沒有測試框架，用 Node 直接驗證。每次改完跑一次：
 *   node tools/check.mjs
 *
 * 檢查項目：
 *   1. 三語 i18n key 完全一致
 *   1b. 版本號的格式，以及 VERSION.md 與 js/version.js 沒有寫岔
 *   1c. extra.js 那批圖都有 fill，放大倍率算得出來
 *   2. 圖鑑條目欄位完整、id 不重複
 *   3. 背卡引用的條目都存在
 *   4. 儲存讀取往返後資料不變
 *   5. 每個繪製函式都能跑完不拋錯（用 DOM stub）
 *
 * 圖片網址不在這裡驗，那要連外網。需要時跑 --net。
 */

import { readFile } from "node:fs/promises";

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
    "appName", "subtitle", "dataTitle", "dataActions",
    "localNotice", "infobar",
    "filterBtn", "filterN", "fpicked", "fpanel", "gearBtn", "settings", "closeX", "settingsX",
    "searchbar", "importFile", "listName", "shareBtn", "pickFoot",
    "displayTitle", "displayOpts", "trainerCode", "verLine",
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
const maxdata = await import("../js/maxdata.js");

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

console.log("\n1b. 版本號");
{
  const { VERSION, VERSION_DATE } = await import("../js/version.js");
  ok("號碼是 x.xx.xx", /^\d+\.\d{2}\.\d{2}$/.test(VERSION), VERSION);
  ok("日期是 YYYY-MM-DD", /^\d{4}-\d{2}-\d{2}$/.test(VERSION_DATE), VERSION_DATE);

  /*
   * VERSION.md 是給人看的，js/version.js 是畫面認的，兩邊寫不一樣的話
   * 網站會顯示一個紀錄裡查不到的號碼。所以在這裡釘住：
   * md 最上面那個小節的號碼與日期，必須等於模組匯出的值。
   */
  const md = await readFile(new URL("../VERSION.md", import.meta.url), "utf8");
  const first = md.match(/^## (\S+) — (\S+)$/m);
  ok("VERSION.md 有版本小節", !!first);
  if (first) {
    ok(`md 最新一筆是 ${first[1]}`, first[1] === VERSION, `模組是 ${VERSION}`);
    ok(`md 的日期是 ${first[2]}`, first[2] === VERSION_DATE, `模組是 ${VERSION_DATE}`);
  }
}

console.log("\n1c. extra 的圖片留白");
{
  /*
   * extra.js 那批圖畫在 256×256 的畫布上、四周是透明留白，
   * 每一筆都要有量出來的 fill，否則畫面上會退回 1 倍、只有別人的四成大。
   * 數字對不對是 `tools/measure-icons.mjs` 的事（那個要連外網），
   * 這裡只確保欄位沒有漏掉、值在合理範圍。
   */
  const withArt = dex.ENTRIES.filter((e) => e.art);
  const noFill = withArt.filter((e) => typeof e.fill !== "number");
  ok(`外部圖 ${withArt.length} 筆都有 fill`, !noFill.length, noFill.map((e) => e.id).join(","));
  const bad = withArt.filter((e) => e.fill <= 0 || e.fill > 1);
  ok("fill 都在 0 到 1 之間", !bad.length, bad.map((e) => e.id).join(","));

  const zoomed = withArt.filter((e) => dex.iconZoom(e) > 1);
  ok(`${zoomed.length} 筆需要放大`, zoomed.length === withArt.length - 1, "只有曠野地帶那張是滿版的");
  const over = zoomed.filter((e) => dex.iconZoom(e) > 3);
  ok("倍率都不超過 3", !over.length, over.map((e) => `${e.id} ${dex.iconZoom(e)}`).join(","));
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

  /*
   * IV100 的 CP。三個等級是 build-dex 用 game master 的基礎數值算的，
   * 這裡驗三件事：定值沒跑掉、三個等級的大小關係、要有就三個都要有。
   */
  {
    const mew = dex.find("d150");
    ok(
      "超夢的 IV100 CP 是 2387 / 2984 / 4724",
      mew && mew.cp20 === 2387 && mew.cp25 === 2984 && mew.cp50 === 4724,
      mew ? `得到 ${mew.cp20} / ${mew.cp25} / ${mew.cp50}` : "找不到 d150"
    );

    const bad = dex.ENTRIES.filter(
      (e) => e.cp20 && !(e.cp20 < e.cp25 && e.cp25 < e.cp50)
    );
    ok("CP 隨等級遞增", !bad.length, bad.slice(0, 3).map((e) => e.id).join(", "));

    const half = dex.ENTRIES.filter(
      (e) => [e.cp20, e.cp25, e.cp50].filter(Boolean).length % 3 !== 0
    );
    ok("三個等級要有就三個都有", !half.length, half.slice(0, 3).map((e) => e.id).join(", "));

    /*
     * 現在每一筆都有 CP。
     *
     * 曾經有兩筆沒有（洗翠黏美兒與黏美龍），因為 game master 沒給它們
     * 自己的基礎數值，退回本體會算出一個看起來很像真的、其實是別隻的
     * 數字，所以寧可空著。那兩筆 GO 還沒實裝，已經整批隱藏。
     *
     * 這條失敗代表又混進了沒有遊戲資料的型態。它要嘛是新的隱藏對象，
     * 要嘛該進 build-dex.mjs 的 STATS_SAME_AS，不要直接放它過去。
     */
    const none = dex.ENTRIES.filter((e) => !e.cp20).map((e) => e.id);
    ok("每一筆都有 IV100 的 CP", none.length === 0, `少了 ${none.join(", ")}`);

    /*
     * 屬性索引要收得到含物種前綴的型態代碼。
     *
     * 條目的 form 是從圖檔名抽的，上游有時寫 WORMADAM_TRASH 有時寫
     * HISUIAN。索引只收去前綴那種的話，含前綴的會查不到而靜默退回本體，
     * 屬性看起來正常其實是別的型態的。結草貴婦三種蓑衣曾經全掛本體的
     * 蟲加草，實際上砂土是蟲加地面、垃圾是蟲加鋼。
     */
    const TYPED = {
      "d413.fWORMADAM_PLANT": ["bug", "grass"],
      "d413.fWORMADAM_SANDY": ["bug", "ground"],
      "d413.fWORMADAM_TRASH": ["bug", "steel"],
    };
    for (const [id, want] of Object.entries(TYPED)) {
      const e = dex.find(id);
      ok(
        `${id} 的屬性是 ${want.join(" + ")}`,
        !!e && JSON.stringify(e.types) === JSON.stringify(want),
        e ? `得到 ${e.types.join(" + ")}` : "查無此條目"
      );
    }

    /*
     * GO 還沒實裝的型態不該出現。上游有圖不等於遊戲裡有。
     * 2026-11 的 GO Wild Area 實裝後，把 build-dex.mjs 的 HIDDEN_FORMS
     * 清掉重跑，這兩條要改成驗屬性是鋼加龍。
     */
    for (const id of ["d705.fHISUIAN", "d706.fHISUIAN"]) {
      ok(`${id} 還沒實裝，不該在圖鑑裡`, !dex.find(id));
    }

    /*
     * 基格爾德是三筆不是五筆。
     *
     * 上游另外給了 COMPLETE_FIFTY_PERCENT 與 COMPLETE_TEN_PERCENT，
     * 那是細胞收集滿了可以變身的狀態，圖檔跟不帶前綴的逐位元組相同、
     * 基礎數值也相同。留兩筆就是兩張一模一樣的卡掛著兩個不同的 id。
     * 合併規則在 build-dex.mjs 的 SAME_LOOK。
     */
    {
      const zy = dex.ENTRIES.filter((e) => e.dex === 718);
      ok(`基格爾德是 3 筆`, zy.length === 3, `現在是 ${zy.map((e) => e.id).join(", ")}`);
      for (const id of ["d718.fCOMPLETE_FIFTY_PERCENT", "d718.fCOMPLETE_TEN_PERCENT"]) {
        ok(`${id} 已經併掉，不該存在`, !dex.find(id));
      }
      const named = zy.filter((e) => /[\u4e00-\u9fff]/.test(e.zhForm || ""));
      ok(
        "基格爾德三筆都有中文型態名",
        named.length === 3,
        `沒有的是 ${zy.filter((e) => !/[\u4e00-\u9fff]/.test(e.zhForm || "")).map((e) => e.zhForm).join(", ")}`
      );
    }
  }

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

console.log("\n2c. 極巨化名單");
{
  const { MAX_IDS } = maxdata;
  const byId = new Map(dex.ENTRIES.map((e) => [e.id, e]));

  ok("名單不是空的", MAX_IDS.length > 0, String(MAX_IDS.length));

  const missing = MAX_IDS.filter((id) => !byId.has(id));
  ok(
    "名單上的條目都還在圖鑑裡",
    !missing.length,
    missing.slice(0, 5).join(", ")
  );

  ok("名單沒有重複", new Set(MAX_IDS).size === MAX_IDS.length);

  /*
   * Max Battle 抓到的不會是裝扮版，名單收進裝扮就會讓
   * 「2020 新年妙蛙種子」長出一個它不該有的勾選框。
   */
  const costumes = MAX_IDS.filter((id) => byId.get(id).kind === "costume");
  ok("名單裡沒有裝扮", !costumes.length, costumes.slice(0, 5).join(", "));

  // 條目已經不存在了，名單裡當然也不該有這種 id
  const gmaxIds = MAX_IDS.filter((id) => /GIGANTAMAX/.test(id));
  ok("名單裡沒有 GIGANTAMAX 的 id", !gmaxIds.length, gmaxIds.join(", "));

  /*
   * 超極巨化 2026-09-16 下午從條目收回成勾選條件（使用者要求：
   * 圖鑑裡多一排「妙蛙花 超極巨化」在洗版）。
   * 這幾條盯著那次改動沒有回頭。
   */
  {
    const gmaxEntries = dex.ENTRIES.filter((e) => e.form === "GIGANTAMAX");
    ok("超極巨化不是條目", !gmaxEntries.length, gmaxEntries.map((e) => e.id).join(", "));

    const { GMAX_IDS } = maxdata;
    ok("超極巨化名單不是空的", GMAX_IDS.length > 0, String(GMAX_IDS.length));
    ok(
      "超極巨化名單是可極巨化的子集",
      GMAX_IDS.every((id) => MAX_IDS.includes(id)),
      GMAX_IDS.filter((id) => !MAX_IDS.includes(id)).join(", ")
    );
    ok("canGmax 跟名單一致", GMAX_IDS.every((id) => dex.canGmax(byId.get(id))));
    ok("不在名單的不能超極巨化", !dex.canGmax(byId.get("d1")));

    /*
     * 外觀沒有因為收回而消失：那 13 種的圖掛到本體的 gmaxIcon，
     * 勾起來就換圖。掉了的話勾超極巨化會看不出任何差別。
     */
    const withIcon = dex.ENTRIES.filter((e) => e.gmaxIcon);
    ok("有 gmaxIcon 的條目 14 筆", withIcon.length === 14, String(withIcon.length));
    ok(
      "gmaxIcon 指向超極巨化的圖",
      withIcon.every((e) => /\.fGIGANTAMAX\./.test(e.gmaxIcon))
    );
    ok(
      "gmaxIcon 不掛在裝扮上",
      !withIcon.some((e) => e.kind === "costume"),
      withIcon.filter((e) => e.kind === "costume").map((e) => e.id).join(", ")
    );

    /*
     * 名單比有圖的多：皮卡丘、喵喵、灰塵山與長毛巨魔上游還沒有圖，
     * 但它現在只是一個旗標，勾得到，只是勾了不換圖。
     */
    const noIcon = GMAX_IDS.filter((id) => !byId.get(id).gmaxIcon);
    ok(`名單裡有 ${noIcon.length} 筆上游還沒有圖`, noIcon.length > 0, noIcon.join(", "));

    // iconAttrs 要真的換圖，這是「勾了看得出來」的唯一機制
    const v = byId.get("d3");
    const plain = dex.iconAttrs(v, false, false);
    const big = dex.iconAttrs(v, false, true);
    ok("勾超極巨化會換圖", big.includes(v.gmaxIcon) && !plain.includes(v.gmaxIcon));
    const bigShiny = dex.iconAttrs(v, true, true);
    ok("異色加超極巨化取異色的那張", bigShiny.includes(v.gmaxShinyIcon));
    // 沒圖的那幾隻不能破圖，備援鏈要退回一般那張
    const pika = byId.get("d25");
    ok("沒有 gmaxIcon 的退回一般圖", dex.iconAttrs(pika, false, true).includes(pika.icon));
  }

  // canMax 是畫面唯一的判斷入口，兩邊講的話要一樣
  ok(
    "canMax 跟名單一致",
    MAX_IDS.every((id) => dex.canMax(byId.get(id))) &&
      !dex.canMax(byId.get("d1.cJAN_2020_NOEVOLVE"))
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
  const book = store.emptyBook();
  ok("開場就有三份清單", book.lists.length === store.LIST_COUNT);

  const first = store.current(book);
  first.want.push({ ...store.newItem("d150"), xxl: true });
  first.want.push({ ...store.newItem("d6"), max: true });
  first.have.push(store.newItem("d25.cHALLOWEEN_2017", false));
  first.name = "測試清單";
  book.lists[2].want.push(store.newItem("d1"));
  book.active = 2;
  store.flush(book);

  const back = store.load();
  ok("往返後資料不變", JSON.stringify(back.lists) === JSON.stringify(book.lists));
  ok("清單名稱保留", back.lists[0].name === "測試清單");
  ok("目前看哪一份會保留", back.active === 2);
  ok("三份各自獨立", back.lists[1].want.length === 0 && back.lists[2].want.length === 1);
  ok("極巨化會往返保留", back.lists[0].want[1].max === true);

  /*
   * max 是 2026-09-16 加的欄位，沒有升儲存版本號，
   * 靠的就是舊紀錄讀進來補 false。這條壞了等於舊使用者一開網站就爆。
   */
  const legacy = store.normalizeList({
    name: "舊的",
    want: [{ id: "d6", shiny: true, xxl: false, xxs: false, bg: "" }],
    have: [],
  });
  ok("舊紀錄沒有 max 欄位時補 false", legacy.want[0].max === false);
  ok("舊紀錄其他欄位不受影響", legacy.want[0].shiny === true);

  /*
   * 極巨化與超極巨化互斥。畫面上兩顆鈕點一個會關掉另一個，
   * 但 localStorage 使用者改得到，讀進來也要收斂——
   * 兩個都真的話格子右上角會出現兩顆徽章疊在一起。
   */
  const both = store.normalizeList({
    name: "",
    want: [{ id: "d6", max: true, gmax: true }],
    have: [],
  });
  ok("兩個都勾時只留超極巨化", both.want[0].gmax === true && both.want[0].max === false);

  const round = store.fromJSON(store.toJSON(book));
  ok("匯出匯入是整包", round && round.kind === "book");
  ok(
    "匯出匯入往返不變",
    JSON.stringify(round.book.lists) === JSON.stringify(book.lists)
  );
  ok("壞掉的 JSON 回 null", store.fromJSON("{{{") === null);
  ok("整包三份都空視為失敗", store.fromJSON(store.toJSON(store.emptyBook())) === null);
  ok("空清單的匯入視為失敗", store.fromJSON('{"want":[],"have":[]}') === null);

  // v1 是單獨一份，want/have 掛在最外層，名稱是 { want, have }
  const old = store.fromJSON(
    '{"v":1,"want":[{"id":"d150","shiny":true}],"have":[],"name":{"want":"舊清單","have":""}}'
  );
  ok("舊版的單份備份認得出來", old && old.kind === "list");
  ok("舊版的清單名稱接得上", old.list.name === "舊清單");

  const migrated = store.normalize({
    v: 1,
    want: [{ id: "d150", shiny: true }],
    have: [],
    name: { want: "舊清單", have: "" },
  });
  ok("v1 會變成第一份", migrated.lists[0].want.length === 1);
  ok("另外兩份是空的", migrated.lists[1].want.length === 0 && migrated.lists[2].want.length === 0);
  ok("v1 的名稱取 want 那個", migrated.lists[0].name === "舊清單");

  const cleared = store.clearList(store.normalize(migrated), 0);
  ok("清掉一份不影響另外兩份", cleared.lists.length === store.LIST_COUNT);
  ok("清掉的那份是空的", !cleared.lists[0].want.length && cleared.lists[0].name === "");

  const dirty = store.normalize({
    lists: [
      {
        want: [{ id: "d1", shiny: "yes", bg: "x".repeat(200) }, null, { nope: 1 }],
        name: 123,
      },
    ],
    active: 99,
  });
  const d0 = dirty.lists[0];
  ok("髒資料會被洗乾淨", d0.want.length === 1 && d0.want[0].shiny === true);
  ok("過長字串會截斷", d0.want[0].bg.length === 40);
  ok("舊版的備註欄位會被洗掉", !("note" in d0.want[0]));
  ok("非字串清單名變空字串", d0.name === "");
  ok("壞掉的 active 退回第一份", dirty.active === 0);
  ok("缺的那幾份會補滿", dirty.lists.length === store.LIST_COUNT);

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
  const data = store.emptyList();
  data.want.push(store.newItem("d150"));
  data.have.push(store.newItem("d25.xREDS_HAT", false));

  // 交換表拿的是整包，因為它要畫三份清單的分頁
  const book = store.emptyBook();
  book.lists[0] = data;

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
  /*
   * 三個顯示選項是兩張縮圖二選一，不是開關。
   * 每一項一定剛好有一張被標成選中，點已經選中的那張不會把它關掉。
   */
  run("renderChrome 顯示選項的縮圖", () => {
    ui.renderChrome(t, "zh", { big: false, names: true, dark: false });
    const html = els.displayOpts.innerHTML;
    const cards = (html.match(/class="opt-card"/g) || []).length;
    if (cards !== 6) throw new Error(`三項各兩張應該 6 張，得到 ${cards}`);
    const on = (html.match(/aria-pressed="true"/g) || []).length;
    if (on !== 3) throw new Error(`每項各一張選中應該 3 張，得到 ${on}`);
    for (const k of ["big", "names", "dark"]) {
      for (const v of ["0", "1"]) {
        if (!html.includes(`data-disp="${k}"\n                 data-val="${v}"`))
          throw new Error(`${k} 少了 data-val="${v}" 那一張`);
      }
    }

    // 值變了，選中的那張要跟著換
    const dark = (h) =>
      h.slice(h.lastIndexOf('data-disp="dark"\n                 data-val="1"'));
    if (!dark(html).startsWith('data-disp="dark"\n                 data-val="1" aria-pressed="false"'))
      throw new Error("淺色時深色那張不該是選中的");
    ui.renderChrome(t, "zh", { big: false, names: true, dark: true });
    const h2 = els.displayOpts.innerHTML;
    if (!dark(h2).startsWith('data-disp="dark"\n                 data-val="1" aria-pressed="true"'))
      throw new Error("深色時深色那張要選中");
  });

  run("renderViews", () => ui.renderViews("dex", t));
  run("renderFilterBar 沒選條件", () => {
    ui.renderFilterBar(dex.emptyFilter(), "zh", t);
    if (els.fpicked.innerHTML !== "") throw new Error("沒選條件就不該有已選那一排");
    if (!els.filterN.hidden) throw new Error("沒選條件時漏斗上不該有數字");
  });
  run("renderFilterBar 有選條件", () => {
    const f = dex.emptyFilter();
    f.type = ["fire", "water"];
    f.gen = ["gen4"];
    f.other = ["bg"];
    ui.renderFilterBar(f, "zh", t);
    // 四個條件四顆，各自帶自己那一組與選項，點了只移除那一個
    const n = (els.fpicked.innerHTML.match(/data-fdrop/g) || []).length;
    if (n !== 4) throw new Error(`已選條件應該 4 顆，得到 ${n}`);
    if (els.filterN.textContent !== "4") {
      throw new Error(`漏斗上應該是 4，得到 ${els.filterN.textContent}`);
    }
  });
  run("renderFilterPanel", () => ui.renderFilterPanel(dex.emptyFilter(), "zh", t));
  run("renderFilterPanel 有選條件", () => {
    const f = dex.emptyFilter();
    f.kind = ["costume"];
    f.type = ["fire"];
    ui.renderFilterPanel(f, "zh", t);
    // 五組都要在，少一組等於有條件永遠選不到
    const n = (els.fpanel.innerHTML.match(/class="fgroup"/g) || []).length;
    if (n !== dex.GROUP_KEYS.length) {
      throw new Error(`面板應該 ${dex.GROUP_KEYS.length} 組，得到 ${n}`);
    }
  });
  /*
   * 篩選面板裡的計數。同一組裡的選項加起來要等於這一組全不選的結果，
   * 算某一組的時候要放掉自己那一組，否則數字會互相扣。
   */
  run("篩選計數扣掉自己那一組", () => {
    const f = dex.emptyFilter();
    f.type = ["fire"];
    const pool = dex.applyFilter(dex.ENTRIES, f, "type");
    const all = dex.applyFilter(dex.ENTRIES, dex.emptyFilter());
    if (pool.length !== all.length) {
      throw new Error(`放掉 type 之後應該等於全部 ${all.length}，得到 ${pool.length}`);
    }
  });
  run("renderInfoBar", () =>
    ui.renderInfoBar({ title: t("viewDex"), stats: [t("itemCount", 12)] }, t)
  );
  run("renderInfoBar 有清除鈕", () =>
    ui.renderInfoBar({ title: t("viewDex"), stats: [], clear: true }, t)
  );
  run("renderGrid", () =>
    ui.renderGrid(dex.ENTRIES.slice(0, 60), data, "zh", t)
  );
  run("renderGrid 空清單", () => ui.renderGrid([], data, "zh", t));
  run("renderTrade", () => ui.renderTrade(book, "zh", t));
  run("renderTrade 帶背卡的格子", () => {
    const withBg = store.normalize({
      v: 1,
      want: [{ id: "d150", bg: "gf26-copenhagen" }],
      have: [],
    });
    ui.renderTrade(withBg, "zh", t);
  });
  /*
   * 極巨化的徽章。分享圖也畫同一顆，但那是 canvas 驗不到的，
   * 所以這裡至少釘住「勾了就畫、沒勾就不畫」。
   */
  run("renderTrade 極巨化的徽章", () => {
    const withMax = store.normalize({
      v: 2,
      active: 0,
      lists: [
        { name: "", want: [{ id: "d6", max: true }, { id: "d6" }], have: [] },
        store.emptyList(),
        store.emptyList(),
      ],
    });
    ui.renderTrade(withMax, "zh", t);
    const n = (els.app.innerHTML.match(/class="maxb"/g) || []).length;
    if (n !== 1) throw new Error(`徽章有 ${n} 顆，勾了的那一格才該有`);
  });
  run("renderTrade 超極巨化的徽章與換圖", () => {
    const e = dex.find("d6");
    const book = store.normalize({
      v: 2,
      active: 0,
      lists: [
        { name: "", want: [{ id: "d6", gmax: true }, { id: "d6" }], have: [] },
        store.emptyList(),
        store.emptyList(),
      ],
    });
    ui.renderTrade(book, "zh", t);
    const html = els.app.innerHTML;
    const g = (html.match(/class="maxb gmax"/g) || []).length;
    if (g !== 1) throw new Error(`G 徽章有 ${g} 顆`);
    if (!html.includes(e.gmaxIcon)) throw new Error("格子沒有換成超極巨化的圖");
  });
  run("renderTrade 帶友情碼", () => ui.renderTrade(book, "zh", t, "499230220284"));
  run("renderTrade 空清單", () => ui.renderTrade(store.emptyBook(), "zh", t));
  run("renderTrade 三份分頁都在", () => {
    const many = store.emptyBook();
    many.lists[1].name = "朋友那份";
    many.active = 1;
    ui.renderTrade(many, "zh", t);
    const n = (els.app.innerHTML.match(/data-list="/g) || []).length;
    if (n !== store.LIST_COUNT) throw new Error(`分頁有 ${n} 個`);
    if (!els.app.innerHTML.includes('data-list="1"\n               aria-pressed="true"'))
      throw new Error("目前這一份沒有標起來");
  });
  /*
   * 編輯模式：鉛筆按下去那一欄的格子牆才帶 editing，刪除鈕靠它顯示。
   * 兩欄各自一個狀態，一欄開著不該把另一欄也打開。
   */
  run("renderTrade 編輯模式", () => {
    ui.renderTrade(book, "zh", t);
    const n = (els.app.innerHTML.match(/data-edit="/g) || []).length;
    if (n !== 2) throw new Error(`鉛筆有 ${n} 顆，兩欄各一顆才對`);
    if (els.app.innerHTML.includes("grid editing"))
      throw new Error("沒開編輯不該有 editing");

    ui.renderTrade(book, "zh", t, "", { want: true });
    const html = els.app.innerHTML;
    if ((html.match(/grid editing/g) || []).length !== 1)
      throw new Error("只有想要那一欄該帶 editing");
    if (!html.includes('data-edit="want"\n               aria-pressed="true"'))
      throw new Error("鉛筆沒有標成按下去的樣子");
    if (html.includes('data-edit="have"\n               aria-pressed="true"'))
      throw new Error("另一欄不該跟著開");

    // 空的那一欄沒有東西可刪，不給鉛筆
    const empty = store.emptyBook();
    ui.renderTrade(empty, "zh", t, "", { want: true, have: true });
    if (els.app.innerHTML.includes("data-edit="))
      throw new Error("空清單不該有鉛筆");
  });

  run("renderTrade 兩欄都有加號", () => {
    ui.renderTrade(book, "zh", t);
    const n = (els.app.innerHTML.match(/data-addcell="/g) || []).length;
    if (n !== 2) throw new Error(`加號有 ${n} 個`);
  });

  /*
   * 顯示的筆數一律只算畫得出來的。
   *
   * 紀錄裡的 id 不保證還在圖鑑：使用者可以手改 localStorage，圖鑑也會
   * 拿掉條目（阿爾宙斯現在就是隱藏的）。那些紀錄佔著陣列長度卻畫不出
   * 格子，直接數就會出現「寫 3 筆只畫得出 1 格」。曾經資訊列、右欄摘要
   * 與分頁標籤三處都在直接數，所以這裡逐處釘住。
   */
  const ghostBook = () =>
    store.normalize({
      v: 2,
      active: 0,
      lists: [
        {
          name: "",
          want: [{ id: "d150" }, { id: "d9999" }, { id: "d493" }],
          have: [{ id: "d9999" }],
        },
        { name: "", want: [], have: [] },
        { name: "", want: [], have: [] },
      ],
    });

  run("畫不出來的紀錄不會被吃掉", () => {
    const g = ghostBook();
    if (g.lists[0].want.length !== 3 || g.lists[0].have.length !== 1) {
      throw new Error("儲存層不該濾掉查不到的條目");
    }
  });

  run("分頁與欄標題只數畫得出來的", () => {
    ui.renderTrade(ghostBook(), "zh", t);
    const html = els.app.innerHTML;
    const tabs = [...html.matchAll(/<span class="n">(\d+)<\/span>/g)].map(
      (m) => m[1]
    );
    if (tabs[0] !== "1") throw new Error(`第一份的分頁數字是 ${tabs[0]}，應該是 1`);
    if (!html.includes(t("itemCount", 1))) throw new Error("想要那欄不是 1");
    if (html.includes(t("itemCount", 3))) throw new Error("想要那欄數了畫不出來的");
    if (!html.includes(t("itemCount", 0))) throw new Error("可以給那欄不是 0");
  });

  run("只剩畫不出來的條目時分享鈕是灰的", () => {
    const g = ghostBook();
    g.lists[0].want = [{ id: "d9999", shiny: false, xxl: false, xxs: false, bg: "" }];
    g.lists[0].have = [];
    ui.renderTrade(g, "zh", t);
    if (!els.app.innerHTML.includes("disabled")) {
      throw new Error("交換表的分享鈕該是灰的");
    }
  });
  run("renderPicker", () => ui.renderPicker({ col: "want", query: "" }, "zh", t));
  run("renderPicker 搜尋", () =>
    ui.renderPicker({ col: "have", query: "皮卡丘" }, "zh", t)
  );
  run("renderPicker 沒有結果", () =>
    ui.renderPicker({ col: "want", query: "zzzzz" }, "zh", t)
  );
  // 面板自己的篩選。跟圖鑑那份是兩回事，套下去要真的少掉幾筆
  run("renderPicker 套篩選", () => {
    const f = dex.emptyFilter();
    f.type = ["fire"];
    ui.renderPicker({ col: "want", query: "", open: true, filter: f }, "zh", t);
    const html = els.panel.innerHTML;
    // 五組都要畫得出來，少一組等於有條件永遠選不到
    const n = (html.match(/class="fgroup"/g) || []).length;
    if (n !== dex.GROUP_KEYS.length)
      throw new Error(`篩選表應該 ${dex.GROUP_KEYS.length} 組，得到 ${n}`);
    // 選項與 chip 都要帶自己的 dataset，跟圖鑑那份分開
    if (!html.includes("data-pgroup=") || !html.includes("data-pdrop"))
      throw new Error("面板的篩選用了圖鑑那一組 dataset，會互相干擾");
    if (html.includes('data-group="type"'))
      throw new Error("面板裡出現圖鑑的 data-group，點了會改到圖鑑的篩選");

    const cells = (html.match(/data-pickcell/g) || []).length;
    const all = dex.applyFilter(dex.ENTRIES, f).length;
    if (!cells || cells > all)
      throw new Error(`篩選沒有套用：畫了 ${cells} 格，符合的只有 ${all} 筆`);
  });

  // 多選：選起來的要標出來，底部動作列要數得對
  run("renderPicker 多選", () => {
    const ids = dex.ENTRIES.slice(0, 3).map((e) => e.id);
    ui.renderPicker(
      { col: "want", query: "", multi: true, sel: ids.slice(0, 2) },
      "zh",
      t
    );
    const html = els.panel.innerHTML;
    const on = (html.match(/class="cell picked"/g) || []).length;
    if (on !== 2) throw new Error(`選起來的應該 2 格，得到 ${on}`);
    if (els.pickFoot.hidden) throw new Error("多選時底部動作列要出現");
    if (!els.pickFoot.innerHTML.includes("data-addmulti"))
      throw new Error("底部沒有加入鈕");

    // 單選要完全回到原本的樣子，底部那條不留在畫面上
    ui.renderPicker({ col: "want", query: "" }, "zh", t);
    if (!els.pickFoot.hidden) throw new Error("單選時底部動作列沒有收掉");
    if (els.panel.innerHTML.includes("cell picked"))
      throw new Error("單選時不該有選取狀態");
  });

  // 整批異色開關：預設不開，開著時要標出來，兩種狀態都要有那顆鈕
  run("renderPicker 多選的異色開關", () => {
    ui.renderPicker({ col: "want", query: "", multi: true, sel: [] }, "zh", t);
    const off = els.pickFoot.innerHTML;
    if (!off.includes("data-pickshiny"))
      throw new Error("底部沒有整批異色開關");
    if (!off.includes('data-pickshiny\n               aria-pressed="false"'))
      throw new Error("異色預設不該是開著的");

    ui.renderPicker(
      { col: "want", query: "", multi: true, sel: [], shiny: true },
      "zh",
      t
    );
    if (!els.pickFoot.innerHTML.includes('aria-pressed="true"'))
      throw new Error("開著的時候要標成 pressed");
  });

  run("renderDetail 從加號進來有返回鈕", () => {
    ui.renderDetail("d150", data, "zh", t, null, null, true);
    if (!els.panel.innerHTML.includes("data-pickback"))
      throw new Error("沒有返回鈕");
  });
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
    const multi = store.normalizeList({
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
    ui.renderDetail(id, store.emptyList(), "zh", t, {
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

  /*
   * 極巨化的勾選框只在名單內的條目出現。
   * 兩個方向都要驗：名單外的長出來，使用者會勾一個遊戲裡做不到的條件；
   * 名單內的沒長出來，這個功能等於不存在。
   */
  run("renderDetail 只有能極巨化的才有那顆鈕", () => {
    const { MAX_IDS } = maxdata;
    const inList = MAX_IDS[0];
    const outList = dex.ENTRIES.find((e) => !dex.canMax(e)).id;

    ui.renderDetail(inList, store.emptyList(), "zh", t);
    if (!/data-draft="max"/.test(els.panel.innerHTML))
      throw new Error(`${inList} 在名單裡卻沒有極巨化鈕`);

    ui.renderDetail(outList, store.emptyList(), "zh", t);
    if (/data-draft="max"/.test(els.panel.innerHTML))
      throw new Error(`${outList} 不在名單裡卻有極巨化鈕`);
  });

  // 勾起來要標起來，不然按了畫面沒反應
  run("renderDetail 草稿的極巨化有標起來", () => {
    const { MAX_IDS } = maxdata;
    ui.renderDetail(MAX_IDS[0], store.emptyList(), "zh", t, {
      shiny: false,
      xxl: false,
      xxs: false,
      max: true,
      bg: "",
    });
    if (!/data-draft="max"\s+aria-pressed="true"/.test(els.panel.innerHTML))
      throw new Error("極巨化沒有標起來");
  });

  /*
   * 超極巨化的鈕只在名單內出現，而且勾了要換圖加掛徽章——
   * 使用者要的就是「按下去右上角跳符號」，那是這個功能唯一的回饋。
   */
  run("renderDetail 超極巨化：鈕、換圖、徽章", () => {
    const id = maxdata.GMAX_IDS[0];
    const e = dex.find(id);

    ui.renderDetail(id, store.emptyList(), "zh", t);
    let html = els.panel.innerHTML;
    if (!/data-draft="gmax"/.test(html)) throw new Error(`${id} 沒有超極巨化鈕`);
    if (html.includes("maxb")) throw new Error("沒勾就不該有徽章");

    ui.renderDetail(id, store.emptyList(), "zh", t, {
      shiny: false, xxl: false, xxs: false, max: false, gmax: true, bg: "",
    });
    html = els.panel.innerHTML;
    if (!/data-draft="gmax"\s+aria-pressed="true"/.test(html))
      throw new Error("超極巨化沒有標起來");
    if (!html.includes(e.gmaxIcon)) throw new Error("勾了沒有換成超極巨化的圖");
    if (!/class="maxb gmax"/.test(html)) throw new Error("圖上沒有 G 徽章");

    // 不在名單裡的不該長出這顆鈕
    ui.renderDetail("d1", store.emptyList(), "zh", t);
    if (/data-draft="gmax"/.test(els.panel.innerHTML))
      throw new Error("d1 不在名單裡卻有超極巨化鈕");
  });

  // 上方那張圖要跟著草稿的異色走，不然勾了異色畫面上沒有任何反應
  run("renderDetail 勾異色會換成異色圖", () => {
    const e = dex.ENTRIES.find((x) => x.shinyIcon && x.icon !== x.shinyIcon);
    const head = () =>
      els.panel.innerHTML.slice(0, els.panel.innerHTML.indexOf("</div>"));

    ui.renderDetail(e.id, store.emptyList(), "zh", t);
    if (!head().includes(e.icon)) throw new Error("預設沒有顯示一般色的圖");
    if (head().includes(e.shinyIcon))
      throw new Error("沒有勾異色卻顯示了異色圖");

    ui.renderDetail(e.id, store.emptyList(), "zh", t, {
      shiny: true,
      xxl: false,
      xxs: false,
      bg: "",
    });
    if (!head().includes(e.shinyIcon)) throw new Error("勾了異色沒有換圖");
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

  // 背卡詳情的多選：格子要能勾、底部要有兩顆加入鈕、單選時整條收掉
  run("renderCardDetail 多選", () => {
    const hit = bg.allCards().find(({ card }) => card.pokemon.length >= 2);
    if (!hit) throw new Error("找不到有清單的背卡");
    const ids = bg.entriesOf(hit.card).map((x) => x.id);

    ui.renderCardDetail(hit.card.id, "zh", t);
    if (!els.panel.innerHTML.includes("data-bgmulti"))
      throw new Error("有清單的卡要有多選鈕");
    if (!els.pickFoot.hidden)
      throw new Error("沒開多選不該有底部動作列");

    ui.renderCardDetail(hit.card.id, "zh", t, {
      multi: true,
      sel: ids.slice(0, 1),
    });
    const html = els.panel.innerHTML;
    if (!html.includes("data-bgcell"))
      throw new Error("多選時格子要認得出來");
    const on = (html.match(/class="cell picked"/g) || []).length;
    if (on !== 1) throw new Error(`選起來的應該 1 格，得到 ${on}`);
    const foot = els.pickFoot.innerHTML;
    for (const col of ["want", "have"]) {
      if (!foot.includes(`data-addbg="${col}"`))
        throw new Error(`底部少了「加進${col}」那顆`);
    }
    if (!foot.includes("data-pickshiny"))
      throw new Error("底部少了整批異色開關");

    // 沒有清單的那批不給多選鈕，按了也沒有格子可選
    const empty = bg.allCards().find(({ card }) => !card.pokemon.length);
    if (empty) {
      ui.renderCardDetail(empty.card.id, "zh", t, { multi: true, sel: [] });
      if (els.panel.innerHTML.includes("data-bgmulti"))
        throw new Error("沒有清單的卡不該有多選鈕");
    }
  });

  // 三種語言都要能畫
  for (const l of LANGS) {
    const tl = makeT(l.code);
    run(`三語繪製 ${l.code}`, () => {
      ui.renderGrid(dex.ENTRIES.slice(0, 30), data, l.code, tl);
      ui.renderTrade(book, l.code, tl);
      ui.renderBg(BG_STATE, l.code, tl);
      ui.renderDetail("d150", data, l.code, tl);
    });
  }
}

console.log("\n6. 逸出");
{
  const evil = '<img src=x onerror=alert(1)>';
  ok("esc 會擋掉標籤", !ui.esc(evil).includes("<img"));
  const book = store.emptyBook();
  book.lists[0].want.push(store.newItem("d150"));
  book.lists[0].name = evil;
  ui.renderTrade(book, "zh", makeT("zh"));
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
