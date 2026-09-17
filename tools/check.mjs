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
 *   1d. 知識條目的欄位與 slug，以及 kb/ 的產出沒有過期
 *   2. 圖鑑條目欄位完整、id 不重複
 *   3. 背卡引用的條目都存在
 *   4. 儲存讀取往返後資料不變
 *   5. 每個繪製函式都能跑完不拋錯（用 DOM stub）
 *
 * 圖片網址不在這裡驗，那要連外網。需要時跑 --net。
 */

import { readFile, readdir } from "node:fs/promises";

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
    /*
     * 只支援 growPicker 會用到的那兩個查詢，不是通用的選擇器實作。
     * 它接下一批時要 append 到格子牆、換掉底下那行哨兵，
     * 兩個都**寫回這個元素的 innerHTML**，測試才量得到真正的格子數。
     */
    querySelector(sel) {
      const self = this;
      if (sel === ".pick-grid") {
        if (!self.innerHTML.includes('class="grid pick-grid"')) return null;
        return {
          insertAdjacentHTML(_pos, html) {
            // 格子是 <button>，裡面沒有 </div>，所以第一個就是格子牆的收尾
            self.innerHTML = self.innerHTML.replace(
              /(<div class="grid pick-grid">[\s\S]*?)<\/div>/,
              (_m, head) => `${head}${html}</div>`
            );
          },
        };
      }
      if (sel === "[data-pickrest]") {
        if (!self.innerHTML.includes("data-pickrest")) return null;
        return {
          set outerHTML(html) {
            self.innerHTML = self.innerHTML.replace(
              /<p class="dim pick-rest"[\s\S]*?<\/p>/,
              () => html
            );
          },
        };
      }
      return null;
    },
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
    "strLangTitle", "strLangHint", "strLangs",
    "kbFoot", "kbFootLink",
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
const shadowdata = await import("../js/shadowdata.js");
const { BG_FLAGS } = await import("../js/bgflags.js");
const gostring = await import("../js/gostring.js");
const kbdata = await import("../js/kbdata.js");
const buildKb = await import("./build-kb.mjs");

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

console.log("\n1d. 知識");
{
  const { KB_ENTRIES, KB_CATS } = kbdata;
  // 繪製那一區才有 t，這裡自己造一個
  const t = makeT("zh");

  /*
   * slug 就是網址那一段。**一旦發布就不能改**——外部連結會全部斷掉，
   * 搜尋引擎累積的權重也歸零，跟條目 id 同一個道理。
   * 這裡只擋形狀不對的，改動擋不了，那要靠人。
   */
  const badSlug = KB_ENTRIES.filter((e) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.slug || ""));
  ok("slug 都是小寫英數與連字號", !badSlug.length, badSlug.map((e) => e.slug).join(","));

  const seen = new Set();
  const dup = KB_ENTRIES.filter((e) => (seen.has(e.slug) ? true : (seen.add(e.slug), false)));
  ok("slug 不重複", !dup.length, dup.map((e) => e.slug).join(","));

  const badField = KB_ENTRIES.filter(
    (e) => !e.title || !e.summary || !e.cat || !e.updated || !Array.isArray(e.sources)
  );
  ok("欄位都齊全", !badField.length, badField.map((e) => e.slug).join(","));

  const badCat = KB_ENTRIES.filter((e) => !KB_CATS.includes(e.cat));
  ok("分類都在 KB_CATS 裡", !badCat.length, badCat.map((e) => `${e.slug}=${e.cat}`).join(","));

  const badDate = KB_ENTRIES.filter((e) => !/^\d{4}-\d{2}-\d{2}$/.test(e.updated || ""));
  ok("更新日是 YYYY-MM-DD", !badDate.length, badDate.map((e) => e.slug).join(","));

  /*
   * **至少要有一條來源。** 查不到官方出處的不是不能寫，是要在頁面上
   * 標成社群說法（`official: false`）——圖鑑只能不列，知識頁寫得出這句話。
   * 一條都沒有就是兩者皆非，那種頁不該上線。
   */
  const noSrc = KB_ENTRIES.filter((e) => !e.sources?.length || e.sources.some((x) => !x.label));
  ok("每一則至少一條來源，而且都有名稱", !noSrc.length, noSrc.map((e) => e.slug).join(","));

  /*
   * 分類的譯名。`ui.js` 的 `kbCatName` 查不到時會原樣回傳分類代碼，
   * 畫面上就會冒出一個 `trade`，很醜但不會壞——所以要靠這條抓。
   */
  const noName = KB_CATS.filter((c) => ui.kbCatName(c, t) === c);
  ok(`${KB_CATS.length} 個分類都有譯名`, !noName.length, noName.join(","));

  /*
   * **中文段落不能在句中換行。**
   *
   * HTML 把 CJK 字元之間的換行渲染成一個空格，畫面上就會冒出
   * 「其中一名朋友 變成」這種縫——**原始碼看起來完全正常**，
   * 而且是整篇零星幾處，肉眼看很容易漏。第一則寫完實測抓到 7 處。
   *
   * 判準是純文字的：上一行結尾與下一行開頭都是 CJK 字元或全形標點。
   * 標籤之間的換行不會誤報（上一行結尾是 `>`、下一行開頭是 `<`），
   * 所以縮排照常寫。
   */
  {
    const CJK = /[\u3000-\u303f\u3040-\u30ff\u4e00-\u9fff\uff00-\uffef]/;
    const srcDir = new URL("../kb/_src/", import.meta.url);
    let srcFiles = [];
    try {
      srcFiles = await readdir(srcDir);
    } catch {
      /* 還沒有任何內文，不是錯誤 */
    }
    const hits = [];
    for (const f of srcFiles) {
      if (!f.endsWith(".html")) continue;
      const lines = (await readFile(new URL(f, srcDir), "utf8")).split("\n");

      /*
       * **HTML 註解裡的換行要跳過**，它根本不會被渲染。
       * 不跳的話範本那份寫滿說明的註解會整片報出來，全是假的。
       * 一個位元一個位元掃，因為 `<!--` 與 `-->` 可能在同一行。
       */
      let open = false;
      const state = lines.map((line) => {
        const startedOpen = open;
        for (let j = 0; j < line.length; j++) {
          if (!open && line.startsWith("<!--", j)) (open = true), (j += 3);
          else if (open && line.startsWith("-->", j)) (open = false), (j += 2);
        }
        return { startedOpen, endedOpen: open };
      });

      for (let i = 1; i < lines.length; i++) {
        // 上一行結尾在註解裡，或這一行開頭在註解裡，都不算
        if (state[i - 1].endedOpen || state[i].startedOpen) continue;
        const prev = lines[i - 1].trimEnd();
        const cur = lines[i].trimStart();
        if (!prev || !cur) continue;
        if (CJK.test(prev.at(-1)) && CJK.test(cur[0]))
          hits.push(`${f}:${i + 1}「${prev.slice(-6)}／${cur.slice(0, 6)}」`);
      }
    }
    ok("中文段落沒有在句中換行", !hits.length, hits.join("，"));

    /*
     * **知識頁之間的連結要指到真的存在的一則。**
     * 內文裡寫的是 `../<slug>/`（從 `kb/<slug>/index.html` 看出去正好是
     * 隔壁那一則），slug 打錯就是一條死連結——**畫面上看起來完全正常**，
     * 點下去才 404，而寫的人多半不會去點自己剛寫的連結。
     * 圖片是 `../img/檔名`，結尾不是斜線，不會被這條抓到。
     */
    const slugs = new Set(KB_ENTRIES.map((e) => e.slug));
    const bad = [];
    for (const f of srcFiles) {
      if (!f.endsWith(".html") || f.startsWith("_")) continue;
      const body = await readFile(new URL(f, srcDir), "utf8");
      for (const m of body.matchAll(/href="\.\.\/([^"\/]+)\/"/g)) {
        if (!slugs.has(m[1])) bad.push(`${f} → ${m[1]}`);
        if (m[1] === f.slice(0, -5)) bad.push(`${f} 連到自己`);
      }
    }
    ok("知識頁之間的連結都指到存在的一則", !bad.length, bad.join("，"));
  }

  /*
   * **產出沒有過期。** 改了 `kb/_src/` 的內文或殼卻忘記重跑 build-kb 的話，
   * 線上那一頁就一直是舊的，而那是**看不出來的**：頁面好好地在，只是內容
   * 過期了。所以拿 build 的結果跟磁碟上的逐檔比。
   */
  const { files, problems } = await buildKb.buildAll();
  ok("內文與 kbdata 對得起來", !problems.length, problems.join("；"));

  const stale = [];
  for (const [path, content] of files) {
    let disk = null;
    try {
      disk = await readFile(path, "utf8");
    } catch {
      /* 還沒產生 */
    }
    if (disk !== content) stale.push(path.split("/poke-change/")[1] || path);
  }
  ok(
    files.size ? `kb/ 的 ${files.size} 個產出都是最新的` : "kbdata 是空的，kb/ 不該有產出",
    !stale.length,
    stale.join("，") + "（跑 node tools/build-kb.mjs）"
  );
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

console.log("\n2b2. 條件鈕的底色");
{
  /*
   * 每一種條件鈕都要有自己的底色。
   *
   * 漏掉一個不會報錯，會變成**整顆鈕隱形**：`.mk[aria-pressed="true"]`
   * 把字轉白、邊框轉透明，沒有底色就是白字畫在白面板上。
   * 超極巨化剛加進來時就漏了，使用者回報「按下去按鈕會不見」才發現。
   * DOM stub 沒有 CSS，量不到 computed style，所以改成讀樣式表比對。
   */
  const css = await readFile(new URL("../css/style.css", import.meta.url), "utf8");
  const used = [...ui.renderDetail.toString().matchAll(/[dm]mk\("(\w+)", [^,]+, "(\w+)"\)/g)].map(
    (m) => m[2]
  );
  const classes = [...new Set(used.length ? used : ["shiny", "xxl", "xxs", "max", "gmax"])];
  const missing = classes.filter(
    (c) => !new RegExp(`\\.mk\\.${c}\\[aria-pressed="true"\\]`).test(css)
  );
  ok(
    `${classes.length} 種條件鈕都有底色`,
    !missing.length,
    missing.length ? `${missing.join(", ")} 會變成白字配透明底` : ""
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
    ok("有 gmaxIcon 的條目 20 筆", withIcon.length === 20, String(withIcon.length));

    /*
     * 名單就是「有 gmaxIcon 的條目」，兩邊必須完全相等。
     * 名單多了會出現勾得到卻沒反應的條目，那比少一隻還難解釋。
     */
    ok(
      "名單完全等於有圖的那些",
      GMAX_IDS.length === withIcon.length &&
        withIcon.every((e) => GMAX_IDS.includes(e.id))
    );

    /*
     * 上游對超極巨化有兩套命名：GIGANTAMAX，以及武道熊師那兩筆的
     * BREAD_DOUGH_MODE（bread 是 Max Battle 在遊戲資料裡的代號）。
     * 只認前者的話武道熊師會靜默消失。
     */
    ok(
      "gmaxIcon 指向超極巨化的圖",
      withIcon.every((e) => /\.f(GIGANTAMAX|BREAD_DOUGH_MODE)/.test(e.gmaxIcon)),
      withIcon.filter((e) => !/\.f(GIGANTAMAX|BREAD_DOUGH_MODE)/.test(e.gmaxIcon)).map((e) => e.id).join(", ")
    );
    ok(
      "gmaxIcon 不掛在裝扮上",
      !withIcon.some((e) => e.kind === "costume"),
      withIcon.filter((e) => e.kind === "costume").map((e) => e.id).join(", ")
    );

    /*
     * 喵喵的兩個地區型不能超極巨化，掛了就會長出一顆不該有的鈕。
     * 這是「同編號就掛」會犯的錯，粒度要看 game master 的型態。
     */
    for (const id of ["d52.fALOLA", "d52.fGALARIAN"]) {
      ok(`${id} 沒有超極巨化`, !byId.get(id).gmaxIcon && !dex.canGmax(byId.get(id)));
    }
    ok("喵喵本體有超極巨化", !!byId.get("d52").gmaxIcon);

    /*
     * 256x256 目錄那批是固定畫布、四周有留白，不修正會比旁邊小一號還偏位。
     * 逐張量的數字在 build-dex 的 GMAX_256。
     */
    const c256 = withIcon.filter((e) => e.gmax256);
    ok(`${c256.length} 筆用 256 目錄的圖`, c256.length === 6, String(c256.length));
    ok(
      "256 那批都有留白修正值",
      c256.every((e) => typeof e.gmaxFill === "number" && e.gmaxFill > 0 && e.gmaxFill <= 1)
    );

    // iconAttrs 要真的換圖，這是「勾了看得出來」的唯一機制
    const v = byId.get("d3");
    const plain = dex.iconAttrs(v, false, false);
    const big = dex.iconAttrs(v, false, true);
    ok("勾超極巨化會換圖", big.includes(v.gmaxIcon) && !plain.includes(v.gmaxIcon));
    const bigShiny = dex.iconAttrs(v, true, true);
    ok("異色加超極巨化取異色的那張", bigShiny.includes(v.gmaxShinyIcon));
    // 不在名單裡的條目就算被要求 gmax 也不能破圖，備援鏈要退回一般那張
    const plainOne = byId.get("d1");
    ok(
      "沒有 gmaxIcon 的退回一般圖",
      dex.iconAttrs(plainOne, false, true).includes(plainOne.icon)
    );
  }

  // canMax 是畫面唯一的判斷入口，兩邊講的話要一樣
  ok(
    "canMax 跟名單一致",
    MAX_IDS.every((id) => dex.canMax(byId.get(id))) &&
      !dex.canMax(byId.get("d1.cJAN_2020_NOEVOLVE"))
  );

  /*
   * 背卡旗標（1.09.00 改成逐隻）。
   *
   * 有些組合在遊戲裡湊不出來：極巨化只能從 Max Battle 抓到，
   * 淨化只能從火箭隊或暗影團戰抓到。**旗標打錯會靜默失效**：
   * 那一筆永遠查不到，於是勾了條件的選單裡少一張，畫面上完全看不出
   * 異狀——跟漏掉條件鈕底色同一類的洞，所以在這裡釘住。
   */
  const cardById = new Map(bg.allCards().map(({ card }) => [card.id, card]));
  {
    const bad = [];
    const notOnCard = [];
    const cantDo = [];
    for (const [cardId, f] of Object.entries(BG_FLAGS)) {
      const card = cardById.get(cardId);
      if (!card) {
        bad.push(cardId);
        continue;
      }
      const onCard = new Set(bg.entriesOf(card).map((e) => e.id));
      for (const [kind, ids] of Object.entries(f)) {
        for (const id of ids) {
          if (!onCard.has(id)) notOnCard.push(`${cardId}/${id}`);
          const can =
            kind === "purified"
              ? dex.canPurify(id)
              : kind === "gmax"
                ? dex.canGmax(id)
                : dex.canMax(id);
          if (!can) cantDo.push(`${cardId}/${id}（${kind}）`);
        }
      }
    }
    ok("旗標的卡都存在", !bad.length, bad.join(", "));
    /*
     * 旗標指的那一筆必須真的在那張卡的清單裡。對不上就是死資料：
     * `cardsFor` 是從卡的清單找條目，清單裡沒有的那一筆永遠不會被列出來。
     */
    ok("旗標的條目都在那張卡的清單裡", !notOnCard.length, notOnCard.join(", "));
    /*
     * 旗標說這一隻能極巨化／淨化，名單就得同意。兩邊來源不同
     * （旗標來自 Bulbapedia、名單來自 Dittobase），對不上表示其中一邊過期了。
     * 尤其**裝扮不該出現**：名單是物種層級的，裝扮一律勾不到這些條件。
     */
    ok("旗標跟條件名單一致", !cantDo.length, cantDo.join(", "));
  }

  /*
   * 勾了極巨化之後剩下的卡必須非空，而且每一張都真的標了這一隻。
   * d1（妙蛙種子）在 Dark Skies 的 Max Battle 陣容與隊長三張卡上。
   */
  const vCards = bg.cardsFor("d1", { max: true });
  ok(
    "勾極巨化後妙蛙種子只剩標了牠的卡",
    vCards.length > 0 && vCards.every(({ card }) => bg.cardAllows(card.id, "d1", "max")),
    vCards.map(({ card }) => card.id).join(", ")
  );

  /*
   * **這一版修正的東西，兩個方向都釘住。**
   *
   * 1.08.03 用卡片層級的白名單，隊長那三張整張被濾掉，於是妙蛙種子
   * 勾了極巨化也看不到它們——但 Bulbapedia 標了那三張卡的妙蛙種子
   * 確實能極巨化。反過來，使用者當初回報的是妙蛙**花**勾極巨化還列出
   * 隊長卡，那個要繼續不列。同一張卡、同一個編號、不同條目，
   * 答案相反——這就是白名單答不對的原因。
   */
  ok(
    "妙蛙種子勾極巨化留得下隊長卡",
    vCards.some(({ card }) => card.id === "team-leader-blue")
  );
  ok(
    "妙蛙花勾超極巨化不會列出隊長卡",
    !bg.cardsFor("d3", { gmax: true }).some(({ card }) => card.id.startsWith("team-leader"))
  );

  /*
   * 反向：不過濾時那些野生卡要在。這條擋的是「過濾寫死成永遠生效」，
   * 那會讓沒勾任何條件的人也選不到背卡。
   */
  const vAll = bg.cardsFor("d1");
  ok(
    "沒勾極巨化時野生卡還在",
    vAll.length > vCards.length && vAll.some(({ card }) => !bg.cardAllows(card.id, "d1", "max"))
  );

  /*
   * keep 是舊紀錄的出口：1.08.03 之前存下的「極巨化 + 野生卡」，
   * 濾掉的話下拉會顯示「不指定」、格子上卻還畫著那張卡，改不掉。
   */
  const wild = vAll.find(({ card }) => !bg.cardAllows(card.id, "d1", "max")).card.id;
  ok(
    "keep 會留下自己已經選著的那張",
    bg.cardsFor("d1", { max: true, keep: wild }).some(({ card }) => card.id === wild)
  );

  /*
   * 淨化這一半。鳳王的暗影版在 GO Tour 金版那張與 2025 曠野地帶那張上，
   * 而它出現在別的卡上時是一般個體。
   */
  const pur = bg.cardsFor("d250", { purified: true });
  ok(
    "勾淨化後鳳王只剩標了牠的卡",
    pur.length > 0 && pur.every(({ card }) => bg.cardAllows(card.id, "d250", "purified")),
    pur.map(({ card }) => card.id).join(", ")
  );
  ok("勾淨化會濾掉沒標的卡", bg.cardsFor("d250").length > pur.length);

  // 雷吉那張是五星團戰給的，沒有任何 Max Battle 旗標
  ok("雷吉那張沒有極巨化旗標", !BG_FLAGS["go-fest-2025"]);
}

console.log("\n2c2. 淨化名單");
{
  const { SHADOW_IDS } = shadowdata;
  const byId = new Map(dex.ENTRIES.map((e) => [e.id, e]));

  ok("名單不是空的", SHADOW_IDS.length > 0, String(SHADOW_IDS.length));

  const missing = SHADOW_IDS.filter((id) => !byId.has(id));
  ok("名單上的條目都還在圖鑑裡", !missing.length, missing.join(", "));

  ok("名單沒有重複", new Set(SHADOW_IDS).size === SHADOW_IDS.length);

  /*
   * **裝扮一律不收**。火箭隊給的不會是裝扮版，Dittobase 那 519 筆
   * 暗影條目也一筆裝扮都沒有。收了會讓「2020 新年妙蛙種子」長出
   * 一個它不該有的勾選框。
   */
  const costume = SHADOW_IDS.filter((id) => byId.get(id)?.kind === "costume");
  ok("名單裡沒有裝扮", !costume.length, costume.join(", "));

  ok(
    "canPurify 跟名單一致",
    SHADOW_IDS.every((id) => dex.canPurify(byId.get(id))) &&
      !dex.canPurify(byId.get("d25"))
  );

  /*
   * 皮卡丘沒有暗影版（GO 從來沒給過），拿它當反例。
   * 這條擋的是「canPurify 寫死成永遠為真」，那會讓一千多筆全長出勾選框。
   */
  ok("不在名單的不能淨化", !dex.canPurify("d25") && !dex.canPurify("d999999"));
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
  first.have.push({ ...store.newItem("d1"), purified: true });
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
  ok("淨化會往返保留", back.lists[0].have[1].purified === true);

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

  /*
   * 淨化跟那兩個也互斥（1.09.00）。收斂順序是超極巨化 → 極巨化 → 淨化。
   *
   * 這不只是畫面問題：暗影寶可夢不能參加 Max Battle，而極巨化只能從
   * 那裡抓到，所以「淨化又極巨化」這個狀態在遊戲裡根本不存在。
   * 一樣是 localStorage 使用者改得到，讀進來要收斂。
   */
  const pm = store.normalizeList({ name: "", want: [{ id: "d1", purified: true, max: true }], have: [] });
  ok("淨化與極巨化都勾時只留極巨化", pm.want[0].max === true && pm.want[0].purified === false);
  const pg = store.normalizeList({ name: "", want: [{ id: "d1", purified: true, gmax: true }], have: [] });
  ok("淨化與超極巨化都勾時只留超極巨化", pg.want[0].gmax === true && pg.want[0].purified === false);
  const po = store.normalizeList({ name: "", want: [{ id: "d1", purified: true }], have: [] });
  ok("只勾淨化時留得住", po.want[0].purified === true);

  /*
   * purified 跟 max 一樣沒有升儲存版本號，舊紀錄讀進來補 false。
   * 升 v 反而會讓舊版整包讀不到，代價只是這個旗標給舊版讀會被洗掉。
   */
  ok("舊紀錄沒有 purified 欄位時補 false", legacy.want[0].purified === false);

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

console.log("\n4b. 搜尋字串");
{
  const { searchString, dexNumbers, SEARCH_MAX, STR_LANGS } = gostring;
  const str = (items, lang = "zh") => searchString(items, lang).str;
  // newItem 的第二個參數是 shiny，而且**預設 true**，基底要自己關掉
  const item = (id, extra = {}) => ({ ...store.newItem(id, false), ...extra });

  /*
   * 每一串的固定開頭：排掉交換來的（交換過的不能再交換）。
   * 下面的期待值全部帶著它，這樣改壞了開頭會整節一起紅，
   * 不會只有專門測開頭的那一條掉。
   */
  const HEAD = "!交換&";
  const h = (body) => HEAD + body;

  ok("空清單回空字串", str([]) === "" && str(undefined) === "");
  ok("空清單不會只剩一個開頭", !str([]).includes("交換"));

  ok("編號升序、逗號連接",
     str([item("d150"), item("d1"), item("d25")]) === h("1,25,150"));

  /*
   * 同一隻的不同裝扮與型態在字串裡是同一個編號。這是刻意的：
   * 搜尋指定不了裝扮，對方要做的就是翻自己所有的皮卡丘。
   * **但條件不會塌**：沒條件那格會把有條件那格吸收掉（25 涵蓋異色的 25）。
   */
  ok("同編號只出現一次",
     str([item("d25"), item("d25.cHALLOWEEN_2017"), item("d25", { shiny: true })]) === h("25"));

  ok("型態塌回本體編號",
     str([item("d487.fORIGIN"), item("d487.fALTERED")]) === h("487"));

  /*
   * 圖鑑更新拿掉某個 id 之後，格子牆畫不出那一格，字串裡也不該冒出編號。
   */
  ok("查不到的條目跳過",
     str([item("d25"), { id: "d99999" }]) === h("25"));

  ok("編號一律跟圖鑑要，不從 id 拆",
     dexNumbers([item("d25.cHALLOWEEN_2017")])[0] === dex.find("d25").dex);

  ok("SEARCH_MAX 是數字", typeof SEARCH_MAX === "number" && SEARCH_MAX > 0);

  /*
   * ── 條件 ──
   * 逐隻條件靠分配律塞進一行：
   *   4 ∨ 19 ∨ (異色 ∧ 7) = (異色 ∨ 4 ∨ 19) ∧ (7 ∨ 4 ∨ 19)
   * 這個形狀是整個功能的地基，寫死在測試裡，改壞了要當場看得見。
   */
  ok("條件進得了同一行",
     str([item("d4"), item("d19.fALOLA"), item("d7", { shiny: true })])
       === h("異色,4,19&7,4,19"));

  /*
   * 同一組條件的那幾隻共用一個選項，不是一隻一個——
   * 一隻一個會從 2 個子句變成 4 個，字串長度接近翻倍。
   */
  ok("同一組條件的共用一個子句",
     str([item("d1"), item("d4", { shiny: true }), item("d7", { shiny: true })])
       === h("異色,1&4,7,1"));

  ok("全部都有同一個條件時 base 是空的",
     str([item("d4", { shiny: true }), item("d7", { shiny: true })]) === h("異色&4,7"));

  /* 六個條件都要有自己的關鍵字。漏掉會在字串裡變成 undefined */
  for (const [field, word] of [
    ["shiny", "異色"], ["xxl", "XXL"], ["xxs", "XXS"],
    ["purified", "淨化"], ["max", "極巨化"], ["gmax", "超極巨化"],
  ]) {
    ok(`條件 ${field} 的關鍵字`, str([item("d25", { [field]: true })]) === h(`${word}&25`));
  }
  ok("背卡只看有沒有，不看是哪一張",
     str([item("d25", { bg: "go-fest-2025" })]) === h("背卡&25"));

  /* 三語：關鍵字要跟著對方的遊戲語言換，編號不換 */
  ok("日文關鍵字", str([item("d25", { shiny: true })], "ja") === "!こうかん&色違い&25");
  ok("英文關鍵字", str([item("d25", { shiny: true })], "en") === "!traded&shiny&25");
  ok("認不得的語言退回繁中", str([item("d25", { shiny: true })], "xx") === h("異色&25"));
  ok("三個語言都有關鍵字", STR_LANGS.length === 3);

  /*
   * ── 固定開頭 ──
   * GO 裡交換過的寶可夢不能再交換，所以兩欄都要把它們排掉：
   * 「想要」那欄同樣是對方拿去翻自己的箱子，他交換來的那隻給不了。
   * `!` 要緊貼關鍵字，中間不能有空格。
   */
  for (const [lang, head] of [
    ["zh", "!交換&"], ["ja", "!こうかん&"], ["en", "!traded&"],
  ]) {
    ok(`${lang} 的字串以 ${head} 起頭`,
       str([item("d25"), item("d4", { shiny: true })], lang).startsWith(head));
  }
  ok("開頭只出現一次",
     str([item("d25"), item("d4", { shiny: true })]).split("交換").length === 2);
  ok("降級到純編號也帶開頭", (() => {
    const many = [];
    for (const f of ["shiny", "xxl", "xxs", "purified", "max", "gmax"])
      for (let i = 0; i < 8; i++) many.push(item(`d${100 + many.length}`, { [f]: true }));
    return searchString(many, "zh").str.startsWith(HEAD);
  })());

  /*
   * ── 降級 ──
   * GO 的搜尋框是單行輸入，多行貼進去會被黏成一串，所以寧可放掉條件
   * 也不換行。條件太多時從隻數最少的那一組開始放，最壞退回純編號。
   */
  {
    const many = [];
    // 每一種條件各給一批，湊到一定會爆的程度
    for (const f of ["shiny", "xxl", "xxs", "purified", "max", "gmax"]) {
      for (let i = 0; i < 6; i++) many.push(item(`d${100 + many.length}`, { [f]: true }));
    }
    const res = searchString(many, "zh");
    ok("爆掉時只出一行", !res.str.includes("\n"));
    ok("爆掉時字串仍在上限內", res.str.length <= SEARCH_MAX);
    ok("爆掉時有講幾隻被放掉了", res.dropped > 0);
    ok("放掉條件不會少掉任何一隻",
       dexNumbers(many).every((n) => res.str.split(/[,&]/).includes(String(n))));
  }

  /* 沒爆就不該報 dropped，不然使用者會以為自己少了東西 */
  {
    const res = searchString([item("d4"), item("d7", { shiny: true })], "zh");
    ok("沒爆就不報放掉", res.dropped === 0 && res.count === 2);
  }

  /* 同一份清單按兩次要一模一樣，不然會讓人以為程式壞了 */
  {
    const list = [
      item("d25", { shiny: true }), item("d1"), item("d150", { max: true }),
      item("d7", { shiny: true, bg: "go-fest-2025" }),
    ];
    ok("同一份清單產出穩定", str(list) === str([...list].reverse()) );
  }

  /*
   * ── 對拍 ──
   * 這一段是整個功能的正確性保證，不是補充測試。
   *
   * 分配律轉出來的字串長得跟原清單完全不像（`異色,4,19&7,4,19`），
   * 肉眼看不出對不對，逐例寫死又只能蓋到寫得出來的那幾種。所以這裡
   * **枚舉每一種可能的寶可夢狀態**（編號 × 條件的所有子集），拿字串的
   * 真值跟清單的原意逐一比對。
   *
   * 兩種期待不一樣：
   *   沒降級 → 完全等價，多一隻少一隻都是錯
   *   降級了 → 只准多不准少。放掉條件的方向是安全的（對方多翻幾隻），
   *            漏掉才是災難——他不會知道自己漏了。
   *
   * 求值照 GO 的語法：`&` 是且、`,` 是或，而且 `,` 綁得比較緊，
   * 所以整串就是「每個以 & 分開的群組裡至少中一個」。
   */
  {
    const WORD = {
      shiny: "異色", xxl: "XXL", xxs: "XXS",
      purified: "淨化", max: "極巨化", gmax: "超極巨化", bg: "背卡",
    };
    /*
     * `!` 是非，要緊貼關鍵字。固定開頭 `!交換` 靠它求值，
     * 所以枚舉的狀態多一個維度：這隻是不是交換來的。
     */
    const lit = (l, st) => {
      if (l.startsWith("!")) return !lit(l.slice(1), st);
      if (/^[0-9]+$/.test(l)) return st.dex === Number(l);
      if (l === "交換") return st.traded;
      return st.has.has(l);
    };
    const strTrue = (text, st) =>
      text.split("&").every((g) => g.split(",").some((l) => lit(l, st)));
    // 清單的原意：某一格的編號對得上，而且那一格要的條件對方全都有
    const listTrue = (items, st) =>
      // 交換來的不能再交換，所以它永遠不是我們要的，不管編號對不對
      st.traded
        ? false
        : items.some((it) => {
            const e = dex.find(it.id);
            if (!e || e.dex !== st.dex) return false;
            return Object.keys(WORD).every(
              (f) => !(f === "bg" ? it.bg : it[f]) || st.has.has(WORD[f])
            );
          });

    const compare = (name, items) => {
      const res = searchString(items, "zh");
      const words = [...new Set(Object.values(WORD))];
      const dexes = [...new Set(dexNumbers(items)), 99999];
      let miss = 0; // 清單要、字串搜不到（絕對不允許）
      let extra = 0; // 字串搜得到、清單沒要（降級時允許）
      let traded = 0; // 交換來的卻搜得到（降級與否都絕對不允許）
      for (const d of dexes) {
        for (const isTraded of [false, true]) {
          for (let m = 0; m < 1 << words.length; m++) {
            const st = {
              dex: d,
              traded: isTraded,
              has: new Set(words.filter((_, i) => m & (1 << i))),
            };
            const want = listTrue(items, st);
            const got = strTrue(res.str, st);
            if (want && !got) miss++;
            else if (!want && got) {
              extra++;
              if (isTraded) traded++;
            }
          }
        }
      }
      ok(`${name}：一隻都不會漏`, miss === 0, `${miss} 種狀態搜不到`);
      /*
       * 這一條**不因降級而放寬**。放掉條件是安全的（對方多翻幾隻），
       * 但放掉固定開頭不是：列出來的那隻他根本換不了，
       * 而他要按下去才知道。所以開頭永遠不進降級的候選。
       */
      ok(`${name}：交換來的一律搜不到`, traded === 0,
         `${traded} 種交換來的狀態仍搜得到`);
      ok(
        `${name}：${res.dropped ? "放掉條件後只多不少" : "語意完全等價"}`,
        res.dropped ? true : extra === 0,
        `${extra} 種多出來的狀態`
      );
    };

    compare("截圖那三格", [
      item("d4"), item("d19.fALOLA"), item("d7", { shiny: true }),
    ]);
    compare("兩種條件", [
      item("d1"), item("d25"), item("d4", { shiny: true }),
      item("d7", { shiny: true }), item("d6", { max: true }),
    ]);
    compare("條件疊在同一格", [
      item("d1"), item("d94", { shiny: true, bg: "go-fest-2025" }),
      item("d150", { xxl: true }), item("d143", { purified: true }),
    ]);
    compare("同一隻既有無條件格也有異色格", [
      item("d25"), item("d25", { shiny: true }), item("d7", { shiny: true }),
    ]);
    compare("全部都要異色", [
      item("d4", { shiny: true }), item("d7", { shiny: true }),
    ]);
    {
      // 一定會爆、必須降級的那種
      const many = [];
      for (const f of ["shiny", "xxl", "xxs", "purified", "max", "gmax"])
        for (let i = 0; i < 6; i++)
          many.push(item(`d${100 + many.length}`, { [f]: true }));
      compare("爆掉而降級的", many);
    }
  }
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
  /*
   * 複製鈕。空的那一欄不畫——跟鉛筆同一個道理，按了只會得到空字串。
   * 兩顆鈕都在 col-head 裡，所以數 data-copy 就知道畫了幾欄。
   */
  run("renderTrade 複製鈕只長在有東西的那一欄", () => {
    const oneSide = store.normalize({
      v: 2,
      active: 0,
      lists: [
        { name: "", want: [{ id: "d25" }], have: [] },
        store.emptyList(),
        store.emptyList(),
      ],
    });
    ui.renderTrade(oneSide, "zh", t);
    const html = els.app.innerHTML;
    const n = (html.match(/data-copy=/g) || []).length;
    if (n !== 1) throw new Error(`複製鈕有 ${n} 顆，只有「想要」那欄該有`);
    if (!html.includes('data-copy="want"')) throw new Error("長錯欄了");
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

  /*
   * 改篩選不清掉選取（先篩火選幾隻、再篩水選幾隻是這個面板該支援的用法），
   * 所以會有「選了 2 隻、畫面上只看得到 1 個勾」的狀態。
   * 底部那行必須把差額講出來，否則就是「我只看到一個勾卻加進來兩筆」。
   */
  run("renderPicker 篩選不清選取，藏起來的要交代", () => {
    const f = dex.emptyFilter();
    f.type = ["fire"];
    const fire = dex.applyFilter(dex.ENTRIES, f);
    const fireIds = new Set(fire.map((e) => e.id));
    // 一隻通過篩選、一隻被篩掉
    const sel = [fire[0].id, dex.ENTRIES.find((e) => !fireIds.has(e.id)).id];
    const pick = { col: "want", query: "", multi: true, sel, filter: f };

    ui.renderPicker(pick, "zh", t);
    const foot = els.pickFoot.innerHTML;
    if (!foot.includes(t("pickSel", 2)))
      throw new Error("數字要算全部選取的 2 隻，不是畫面上看得到的那 1 隻");
    if (!foot.includes(t("pickHidden", 1)))
      throw new Error("沒有交代被篩掉的那 1 隻");
    const on = (els.panel.innerHTML.match(/class="cell picked"/g) || []).length;
    if (on !== 1) throw new Error(`畫面上應該只有 1 個勾，得到 ${on}`);
    if (ui.pickHidden(pick) !== 1)
      throw new Error("pickHidden 跟畫面算的不一樣");

    // 清掉篩選，兩隻都看得到，那一句就不該出現
    const all = { ...pick, filter: dex.emptyFilter() };
    ui.renderPicker(all, "zh", t);
    const clean = els.pickFoot.innerHTML;
    ui.renderPickFoot(2, t, false, 0);
    if (clean !== els.pickFoot.innerHTML)
      throw new Error("沒有藏起來的時候底部不該多那一句");
    if (ui.pickHidden(all) !== 0)
      throw new Error("沒有篩選時 pickHidden 應該是 0");
  });

  // 整批異色開關：預設不開，開著時要標出來，兩種狀態都要有那顆鈕
  /*
   * ── 分段顯示 ──
   * 先畫 200 筆，捲到底再接 200，一路接到全部（2026-09-18，使用者要求）。
   * 在那之前是硬上限 150 筆，超過的永遠叫不出來。
   *
   * 捲動本身沒辦法在 Node 裡模擬，所以這裡測的是 growPicker 的行為：
   * 接出來的是**下一批**、不是從頭再來一次，而且接完就停。
   */
  {
    const cellsIn = (html) => (html.match(/data-pickcell="1"/g) || []).length;
    const idsIn = (html) =>
      [...html.matchAll(/data-id="([^"]+)"/g)].map((m) => m[1]);
    const all = dex.search(dex.applyFilter(dex.ENTRIES, {}), "");

    run("renderPicker 分段：第一批 200 筆", () => {
      ui.renderPicker({ col: "want", query: "", shown: 0 }, "zh", t);
      const n = cellsIn(els.panel.innerHTML);
      if (n !== 200) throw new Error(`第一批應該 200 筆，得到 ${n}`);
      if (!els.panel.innerHTML.includes("data-pickrest"))
        throw new Error("還有沒畫完的，底下要留哨兵那一行");
    });

    run("renderPicker 分段：接的是下一批，不是從頭再來", () => {
      const pick = { col: "want", query: "", shown: 0 };
      ui.renderPicker(pick, "zh", t);
      const next = ui.growPicker(pick, "zh", t);
      if (next !== 400) throw new Error(`接完該回 400，得到 ${next}`);

      const ids = idsIn(els.panel.innerHTML);
      if (ids.length !== 400)
        throw new Error(`畫面上該有 400 格，得到 ${ids.length}`);
      if (ids[200] !== all[200].id)
        throw new Error(`第 201 格該是 ${all[200].id}，得到 ${ids[200]}`);
      if (new Set(ids).size !== 400) throw new Error("接出來的有重複");
    });

    run("renderPicker 分段：一批畫得完就沒有哨兵", () => {
      const pick = { col: "want", query: "皮卡丘", shown: 0 };
      ui.renderPicker(pick, "zh", t);
      const n = cellsIn(els.panel.innerHTML);
      if (n >= 200) throw new Error(`這個搜尋該少於一批，得到 ${n}`);
      if (els.panel.innerHTML.includes("data-pickrest"))
        throw new Error("一批就畫得完，不該留哨兵");
      if (ui.growPicker(pick, "zh", t) !== n)
        throw new Error("已經畫完了還在長");
    });

    run("renderPicker 分段：一路接到底就停", () => {
      const pick = { col: "want", query: "", shown: 0 };
      ui.renderPicker(pick, "zh", t);
      for (let i = 0; i < 20; i++) pick.shown = ui.growPicker(pick, "zh", t);
      if (pick.shown !== all.length)
        throw new Error(`該接到 ${all.length}，停在 ${pick.shown}`);
      if (cellsIn(els.panel.innerHTML) !== all.length)
        throw new Error("畫面上的格子數跟接到的筆數對不上");
      if (els.panel.innerHTML.includes("data-pickrest"))
        throw new Error("接完了哨兵還在，會一直想再接");
    });

    /*
     * 「N 隻在篩選外」要扣掉已經接出來的，否則接到第 400 筆之後
     * 那幾隻明明看得見，底部還說它們在篩選外。
     */
    run("pickHidden 吃分段的進度", () => {
      const late = all[300].id;
      const base = { query: "", filter: {}, sel: [late] };
      if (ui.pickHidden({ ...base, shown: 0 }) !== 1)
        throw new Error("還沒接到那一筆，該算成看不到");
      if (ui.pickHidden({ ...base, shown: 400 }) !== 0)
        throw new Error("已經接出來了，不該再算成看不到");
    });
  }

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

  /*
   * 複製搜尋字串的確認面板。按下複製鈕先開這個窗，窗裡那顆鈕才寫剪貼簿，
   * 所以三件事一定要在畫面上：字串本身、`data-docopy` 那顆鈕，
   * 以及該講的提醒——提醒是從 toast 搬過來的，就是為了複製前看得到。
   */
  run("renderCopy", () => {
    ui.renderCopy({ col: "want", str: "4,19,25", count: 3 }, t);
    if (!els.panel.innerHTML.includes("4,19,25"))
      throw new Error("字串沒有攤在面板上");
    if (!els.pickFoot.innerHTML.includes("data-docopy"))
      throw new Error("底部沒有複製鈕");
  });

  run("renderCopy 的提醒在複製前就看得到", () => {
    ui.renderCopy({ col: "have", str: "4,19", count: 2 }, t);
    if (els.panel.innerHTML.includes("copy-warn"))
      throw new Error("沒有要提醒的事時不該畫提醒列");

    ui.renderCopy(
      { col: "want", str: "4,19", count: 2, dropped: 3, long: true },
      t
    );
    const html = els.panel.innerHTML;
    if (!html.includes(t("copyDropped", 3)))
      throw new Error("放掉條件的那幾隻沒有講出來");
    if (!html.includes(t("copyLong"))) throw new Error("字串過長沒有提醒");
  });

  run("renderDetail 從加號進來有返回鈕", () => {
    ui.renderDetail("d150", data, "zh", t, null, null, "want");
    if (!els.panel.innerHTML.includes("data-pickback"))
      throw new Error("沒有返回鈕");
  });

  /*
   * 從某一欄的加號進來時，底部只該有那一欄的加入鈕。
   * 兩顆都畫的話，橘色的「加入想要」排在左邊第一顆，
   * 從「可以給」進來的人一按就掉進另一欄——使用者回報過。
   */
  run("renderDetail 從加號進來只有那一欄的加入鈕", () => {
    for (const [from, other] of [
      ["have", "want"],
      ["want", "have"],
    ]) {
      ui.renderDetail("d150", data, "zh", t, null, null, from);
      const html = els.panel.innerHTML;
      if (!html.includes(`data-add="${from}"`))
        throw new Error(`${from} 那顆加入鈕不見了`);
      if (html.includes(`data-add="${other}"`))
        throw new Error(`從 ${from} 的加號進來，卻還畫得出 ${other} 的加入鈕`);
    }
  });

  run("renderDetail 不是從加號進來的兩顆都在", () => {
    ui.renderDetail("d150", data, "zh", t);
    const html = els.panel.innerHTML;
    if (!html.includes('data-add="want"') || !html.includes('data-add="have"'))
      throw new Error("圖鑑點進來沒有欄的脈絡，兩顆都要留");
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
   * 知識檢視。**空與非空兩種都要驗**，而且**不依賴 kbdata 當下有沒有內容**：
   * 空狀態那條路在有內容之後就沒有人走到了，等到哪天最後一則被拿掉才發現
   * 壞掉太晚。所以先把真資料整個搬走，兩種狀態各自用可控的資料驗，
   * 最後原封放回去（`ui.js` 拿的是同一個陣列參考，所以動這個陣列就夠了）。
   */
  const kbReal = kbdata.KB_ENTRIES.splice(0, kbdata.KB_ENTRIES.length);

  run("renderKb 空的時候", () => {
    ui.renderKb(t);
    if (!els.app.innerHTML.includes(t("kbEmpty"))) throw new Error("沒有畫出空狀態");
  });

  run("renderViews 沒有知識內容就不畫那顆鈕", () => {
    ui.renderViews("dex", t);
    if (els.views.innerHTML.includes('data-view="kb"'))
      throw new Error("kbdata 是空的，第四顆鈕不該出現");
  });

  {
    const fake = {
      slug: "check-sample",
      title: "假的一則 <script>",
      summary: "驗繪製用的，跑完就還原",
      cat: kbdata.KB_CATS[0],
      updated: "2026-09-18",
      sources: [{ label: "來源", url: "https://example.com", official: true }],
    };
    kbdata.KB_ENTRIES.push(fake);

    run("renderKb 有內容", () => {
      ui.renderKb(t);
      const html = els.app.innerHTML;
      if (!html.includes('href="kb/check-sample/"')) throw new Error("格子不是連到那一頁");
      if (!html.includes(ui.kbCatName(fake.cat, t))) throw new Error("分類沒有畫出來");
    });

    /*
     * 格子是 `<a>` 不是 `<button>`：中鍵開新分頁、右鍵複製連結都要能用，
     * 而且它指向一頁真的 HTML。寫成 button 的話那些全部沒有。
     */
    run("知識的格子是真的連結", () => {
      ui.renderKb(t);
      if (!/<a class="kb-card"/.test(els.app.innerHTML))
        throw new Error("格子必須是 <a>");
    });

    run("renderViews 有內容就畫第四顆鈕", () => {
      ui.renderViews("kb", t);
      const html = els.views.innerHTML;
      if (!html.includes('data-view="kb"')) throw new Error("第四顆鈕不見了");
      if (!html.includes('data-view="kb" aria-pressed="true"'))
        throw new Error("在知識檢視時那顆鈕沒有標成選中");
    });

    run("renderChrome 有內容時頁尾那條連結要露出來", () => {
      ui.renderChrome(t, "zh");
      if (els.kbFoot.hidden) throw new Error("有內容卻藏著爬蟲的入口");
    });

    // 標題是手寫的，一樣會被逸出——它跟寶可夢名稱走同一條路
    run("知識的標題有逸出", () => {
      ui.renderKb(t);
      if (els.app.innerHTML.includes("<script>")) throw new Error("標題沒有逸出");
    });

    /*
     * 靜態頁的殼。內文是我們自己手寫的 HTML **刻意不逸出**（它就是內容），
     * 但 metadata 一律要逸出——它會進 <title> 與 meta content，
     * 一個引號就把標籤切斷了。
     */
    run("build-kb 的殼把 metadata 逸出", () => {
      const html = buildKb.renderPage(fake, "<p>內文</p>", t, "交換");
      /*
       * **不能拿 `includes("<script>")` 當判準**：殼裡本來就有讀深色偏好
       * 的那一段 inline script，這條會永遠成立。要找的是逸出後的樣子。
       */
      if (!html.includes("&lt;script&gt;")) throw new Error("標題沒有逸出");
      if (!html.includes("<p>內文</p>")) throw new Error("內文不該被逸出");
      for (const need of [
        '<html lang="zh-Hant">',
        '<meta name="description"',
        'property="og:title"',
        'property="og:type" content="article"',
        'class="kb-crumb"',
        'class="kb-src"',
      ]) {
        if (!html.includes(need)) throw new Error(`殼裡少了 ${need}`);
      }
      // canonical 與 og:url 等待辦 C 才啟用，現在不該出現
      if (html.includes("canonical") || html.includes("og:url"))
        throw new Error("SITE 還是空的，不該長出 canonical");
    });

    kbdata.KB_ENTRIES.length = 0;
  }

  run("renderChrome 沒有內容時頁尾那條連結藏著", () => {
    ui.renderChrome(t, "zh");
    if (!els.kbFoot.hidden) throw new Error("沒有內容卻露出一條連到空頁的連結");
  });

  // 真資料放回去。後面還有三語繪製那一輪要用
  kbdata.KB_ENTRIES.push(...kbReal);

  run(`renderKb 真的那 ${kbReal.length} 則`, () => {
    ui.renderKb(t);
    for (const e of kbReal) {
      if (!els.app.innerHTML.includes(`href="kb/${e.slug}/"`))
        throw new Error(`${e.slug} 沒有畫出來`);
    }
  });

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

  /*
   * 淨化的鈕只在名單內出現，勾了要掛徽章。
   *
   * 徽章是**另一個 class**（`purb` 不是 `maxb`）：淨化的符號是青色星芒，
   * 形狀跟極巨化那顆完全不同，不是同一張圖換顏色。寫錯 class 的話
   * CSS 那條 mask 對不上，畫面上會變成一個看不見的方塊。
   */
  run("renderDetail 淨化：鈕、徽章", () => {
    const id = shadowdata.SHADOW_IDS[0];

    ui.renderDetail(id, store.emptyList(), "zh", t);
    let html = els.panel.innerHTML;
    if (!/data-draft="purified"/.test(html)) throw new Error(`${id} 沒有淨化鈕`);
    if (html.includes("purb")) throw new Error("沒勾就不該有徽章");

    ui.renderDetail(id, store.emptyList(), "zh", t, {
      shiny: false, xxl: false, xxs: false, max: false, gmax: false, purified: true, bg: "",
    });
    html = els.panel.innerHTML;
    if (!/data-draft="purified"\s+aria-pressed="true"/.test(html))
      throw new Error("淨化沒有標起來");
    if (!/class="purb"/.test(html)) throw new Error("圖上沒有淨化徽章");
    if (/class="maxb/.test(html)) throw new Error("淨化不該掛極巨化那顆徽章");

    // 不在名單裡的不該長出這顆鈕。皮卡丘沒有暗影版
    ui.renderDetail("d25", store.emptyList(), "zh", t);
    if (/data-draft="purified"/.test(els.panel.innerHTML))
      throw new Error("d25 不在名單裡卻有淨化鈕");
  });

  /*
   * 勾了淨化之後，背卡清單只剩標了這一隻的那幾張，而且區塊仍然畫出來。
   * 換成「目前沒有活動背卡」會被讀成「這隻寶可夢沒有背卡」，
   * 但牠其實有，只是淨化配不上——那句話留給真的沒有背卡的條目。
   */
  run("renderDetail 勾淨化會濾掉配不上的背卡", () => {
    const id = "d250"; // 鳳王：暗影版在 GO Tour 金版與 2025 曠野地帶那兩張上
    ui.renderDetail(id, store.emptyList(), "zh", t);
    const before = (els.panel.innerHTML.match(/data-pick="/g) || []).length;

    ui.renderDetail(id, store.emptyList(), "zh", t, {
      shiny: false, xxl: false, xxs: false, max: false, gmax: false, purified: true, bg: "",
    });
    const after = (els.panel.innerHTML.match(/data-pick="/g) || []).length;
    if (!(after > 0)) throw new Error("勾了淨化之後一張都不剩");
    if (!(before > after)) throw new Error(`沒有濾掉任何卡（${before} → ${after}）`);
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
