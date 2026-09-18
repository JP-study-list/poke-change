/**
 * build-kb.mjs — 產生知識頁的靜態 HTML
 *
 *   node tools/build-kb.mjs          產生
 *   node tools/build-kb.mjs --check  只比對，不寫檔（check.mjs 用這條路）
 *
 * ── 這支存在的理由 ──
 * `index.html` 只有 170 行骨架，內容全部是 JS 執行後才填的，
 * 爬蟲與分享預覽拿到的是空殼。知識頁要被搜尋得到，
 * 內容就必須**直接寫在 HTML 裡**——所以它們是靜態頁，不是 SPA 的一個檢視。
 *
 * GitHub Pages 根目錄本來就能放任意多個 .html，架構上不衝突：
 * SPA 照舊，靜態頁是新長出來的一層。
 *
 * ── 輸入兩份，輸出兩種 ──
 * ```
 * js/kbdata.js           metadata（標題、摘要、分類、更新日、來源）
 * kb/_src/<slug>.html    內文，純 HTML 片段，不套殼
 *          ↓
 * kb/<slug>/index.html   一則一頁
 * kb/index.html          索引頁
 * ```
 *
 * ── 為什麼內文源的目錄是 `_src` 不是 `src` ──
 * **GitHub Pages 會把 repo 裡每一個檔案都當網頁送出去**，包含那些裸片段。
 * 一個沒有 `<head>`、沒有樣式、內容卻跟正規頁一模一樣的 HTML 被索引到，
 * 就是一頁重複內容。GitHub Pages 預設跑 Jekyll，而 **Jekyll 不發布
 * 底線開頭的目錄**，改個名就擋掉了。
 *
 * **所以不要在這個 repo 加 `.nojekyll`**：那會關掉 Jekyll，
 * `_src` 立刻全部公開。真要關的話得另外想辦法擋這個目錄。
 *
 * ── 為什麼要索引頁 ──
 * SPA 的知識格子牆是 JS 畫的，**爬蟲讀不到**，那些靜態頁就沒有任何一條
 * 真的連結指過去。所以 `kb/index.html` 是靜態的目錄，
 * 每一則的麵包屑指回它，`index.html` 頁尾再放一條連到 `kb/`。
 * 三段接起來，爬蟲才進得去。
 *
 * ── 刻意不做 Markdown 解析器 ──
 * 這個站沒有 npm，要自己刻一個，那是 bug 溫床（逸出、表格、巢狀清單）。
 * 寫內文時多打幾個 `<p>` 的代價遠比維護一個半吊子解析器低。
 * 改殼、改樣式重跑一次就好，這也是不手寫一頁一檔的理由。
 *
 * ── canonical、og:url 與 og:image 目前不寫 ──
 * 三個都需要絕對網址，而網域還沒買（待辦 C）。填現在的 GitHub Pages
 * 網址等於之後要全部改一次，所以先不寫；C 做完在 `SITE` 補上重跑，
 * 三個一起長出來。**其餘連結一律相對路徑**，搬家不用改。
 */

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { VERSION, VERSION_DATE } from "../js/version.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = join(ROOT, "kb", "_src");
const OUT_DIR = join(ROOT, "kb");

/**
 * 站台的絕對網址。**現在刻意是空字串**，填了才會長出 canonical 與 og:url。
 * 待辦 C（自有網域）做完再填，不要先填 GitHub Pages 那個路徑——
 * 那種子路徑吃不到什麼權重，之後還要全部改一次。
 */
const SITE = "";

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

/**
 * 深色。**放在 `<body>` 之後的第一行**，不是 `<head>` 裡：
 * head 裡 `document.body` 還不存在，而 style.css 那兩千行深色全部掛在
 * `body.dark` 底下。同步 script 會擋住繪製，所以不會先閃一下白的。
 */
const DARK_BOOT = `<script>
      try {
        var p = JSON.parse(localStorage.getItem("poke-change/pref") || "{}");
        if (p.dark) document.body.classList.add("dark");
      } catch (e) {}
    </script>`;

/** 站名與副標。跟 `js/i18n.js` 的繁中那份一致，靜態頁只做繁中 */
const SITE_NAME = "寶可夢交換所";

/** 齒輪。SVG 逐點抄 `index.html` 那顆，兩邊要長得一樣 */
const GEAR_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M9.5 2.8 L14.5 2.8 L13.9 5.8 L16.4 7.2 L18.7 5.3 L21.2 9.5 L18.3 10.5 L18.3 13.5 L21.2 14.5 L18.7 18.7 L16.4 16.8 L13.9 18.2 L14.5 21.2 L9.5 21.2 L10.1 18.2 L7.6 16.8 L5.3 18.7 L2.8 14.5 L5.7 13.5 L5.7 10.5 L2.8 9.5 L5.3 5.3 L7.6 7.2 L10.1 5.8Z"
            />
            <circle cx="12" cy="12" r="3" />
          </svg>`;

/**
 * 外觀那兩張縮圖。**配色寫死**，跟 `js/ui.js` 的 `themeThumb` 同一組值：
 * 它們預覽的正是兩套配色本身，吃 CSS 變數的話兩張會長得一模一樣。
 */
const themeThumb = (bg, line, cell) =>
  `<rect x="0" y="0" width="100" height="55" fill="${bg}" />` +
  `<rect x="8" y="7" width="30" height="4" rx="2" fill="${line}" />` +
  [0, 1]
    .map((r) =>
      [0, 1, 2]
        .map(
          (c) =>
            `<rect x="${8 + c * 29}" y="${17 + r * 18}" width="25" height="14" rx="2.5" fill="${cell}" />`
        )
        .join("")
    )
    .join("");

/*
 * 外觀切換。**是選值不是 toggle**（跟主站那三組同一個道理）：兩張卡各代表
 * 一個值，點已經選中的那張不該把它關掉，否則會變成兩張都沒選。
 *
 * `aria-pressed` 這裡先寫死淺色，載入後那段 script 會照真正的 body.dark
 * 修正——HTML 是靜態的，寫哪一個都會有一半的人看到錯的。
 */
const themeCards = (t) =>
  [
    [0, t("dispLight"), themeThumb("#faf9f5", "#cfc9bd", "#e8e4da")],
    [1, t("dispDark"), themeThumb("#101010", "#3c3c40", "#232326")],
  ]
    .map(
      ([val, name, thumb]) => `            <button type="button" class="opt-card" data-theme="${val}"
                    aria-pressed="${val === 0}">
              <span class="thumb"><svg viewBox="0 0 100 55" aria-hidden="true">${thumb}</svg></span>
              <span class="opt-name">${esc(name)}</span>
            </button>`
    )
    .join("\n");

/**
 * 設定的行為。**放 body 末端**，不是開頭那段 boot：它要摸到彈窗的 DOM。
 *
 * 深淺色寫回 `poke-change/pref` 的同一個 key，所以在知識頁切換，
 * 回 SPA 也是同一套；反過來也一樣。
 */
const SETTINGS_JS = `<script>
      (function () {
        var gear = document.getElementById("kbGear");
        var box = document.getElementById("kbSettings");
        if (!gear || !box) return;

        function show(on) {
          box.hidden = !on;
          gear.setAttribute("aria-expanded", on ? "true" : "false");
        }
        function mark() {
          var dark = document.body.classList.contains("dark");
          var cards = box.querySelectorAll("[data-theme]");
          for (var i = 0; i < cards.length; i++)
            cards[i].setAttribute(
              "aria-pressed",
              (cards[i].getAttribute("data-theme") === "1") === dark ? "true" : "false"
            );
        }

        mark();
        gear.addEventListener("click", function () { show(box.hidden); });

        box.addEventListener("click", function (ev) {
          /* 遮罩在 DOM 上就是 #kbSettings 自己，所以點它本身也算點外面 */
          if (ev.target === box || ev.target.closest("[data-closepop]")) { show(false); return; }
          var card = ev.target.closest("[data-theme]");
          if (!card) return;
          var dark = card.getAttribute("data-theme") === "1";
          document.body.classList.toggle("dark", dark);
          mark();
          try {
            var pref = JSON.parse(localStorage.getItem("poke-change/pref") || "{}");
            pref.dark = dark;
            localStorage.setItem("poke-change/pref", JSON.stringify(pref));
          } catch (e) {}
        });

        document.addEventListener("keydown", function (ev) {
          if (ev.key === "Escape" && !box.hidden) show(false);
        });
      })();
    </script>`;

/**
 * 共用的殼。
 *
 * `up` 是回到站台根目錄要幾層（一則是 `../../`、索引頁是 `../`），
 * 每一條連結與 CSS 都吃它，所以目錄結構改了只要改呼叫端。
 */
function shell({ up, title, desc, cls, crumb, body, t, extra = "" }) {
  const canonical =
    SITE && crumb.path
      ? `\n    <link rel="canonical" href="${esc(SITE + crumb.path)}" />
    <meta property="og:url" content="${esc(SITE + crumb.path)}" />`
      : "";

  return `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}" />
    <meta property="og:type" content="${cls === "article" ? "article" : "website"}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:site_name" content="${esc(SITE_NAME)}" />${canonical}
    <link rel="stylesheet" href="${up}css/style.css" />
  </head>
  <body>
    ${DARK_BOOT}

    <header class="kb-top">
      <div class="kb-topin">
        <nav class="kb-crumb">
${[
  `<a href="${up}">${esc(SITE_NAME)}</a>`,
  crumb.mid ? `<a href="${up}kb/">${esc(t("viewKb"))}</a>` : `<span>${esc(t("viewKb"))}</span>`,
  ...(crumb.here ? [`<span>${esc(crumb.here)}</span>`] : []),
]
  .map((x) => `          ${x}`)
  .join("\n")}
        </nav>
        <button
          class="icon-btn"
          id="kbGear"
          type="button"
          aria-expanded="false"
          aria-controls="kbSettings"
          aria-label="${esc(t("settings"))}"
        >
          ${GEAR_SVG}
        </button>
      </div>
    </header>

${body}

    <div class="modal" id="kbSettings" hidden>
      <div class="modal-inner">
        <button class="btn-x" type="button" data-closepop="1" aria-label="${esc(t("close"))}">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div class="modal-scroll">
          <section class="side-block">
            <p class="side-title">${esc(t("dispTheme"))}</p>
            <div class="opt-cards">
${themeCards(t)}
            </div>
          </section>
${extra}          <section class="side-block">
            <a class="kb-home" href="${up}">${esc(SITE_NAME)}</a>
            <p class="kb-ver">${esc(t("version"))} ${esc(VERSION)} · ${esc(VERSION_DATE)}</p>
          </section>
        </div>
      </div>
    </div>

    ${SETTINGS_JS}
  </body>
</html>
`;
}

/** 一條來源。沒有 url 的只印名稱，官方與社群各帶一個標籤 */
const sourceItem = (s, t) => {
  const label = esc(s.label);
  const link = s.url
    ? `<a href="${esc(s.url)}" rel="nofollow noopener" target="_blank">${label}</a>`
    : label;
  const tag = s.official
    ? `<span class="kb-tag official">${esc(t("kbOfficialTag"))}</span>`
    : `<span class="kb-tag community">${esc(t("kbCommunityTag"))}</span>`;
  return `                <li>${link} ${tag}</li>`;
};

/**
 * 一則知識頁。
 *
 * **出處逐條列在底部**，而且官方與社群分得出來——查不到官方出處的不是
 * 不能寫，是要講明白。這一點跟圖鑑的「查不到就不要放」不衝突：
 * 頁面寫得出「這條沒有官方依據」，圖鑑的格子寫不出。
 */
export function renderPage(e, body, t, catName) {
  const inner = `    <main class="kb-page">
      <p class="kb-cat" data-cat="${esc(e.cat)}">${esc(catName)}</p>
      <h1>${esc(e.title)}</h1>
      <p class="kb-lead">${esc(e.summary)}</p>
      <p class="kb-meta">${esc(t("kbUpdated", e.updated))}</p>

      <article class="kb-body">
${body.trimEnd()}
      </article>
    </main>`;

  /*
   * **出處住在設定面板裡**（2026-09-18，使用者要求），不在頁面底部。
   * 內容仍然逐條寫在 HTML 裡、官方與社群分得出來，爬蟲也讀得到，
   * 只是不再佔掉每一則的結尾。
   */
  const official = e.sources.filter((s) => s.official).length;
  const community = e.sources.length - official;
  const tally = [official ? `官方 ${official} 筆` : "", community ? `社群 ${community} 筆` : ""]
    .filter(Boolean)
    .join("・");

  const src = `          <section class="side-block">
            <p class="side-title">${esc(t("kbSourceTitle"))}</p>
            <details class="kb-row kb-src">
              <summary>
                <span class="row-ic">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 3.5h7.5L18 8v12.5H6z" />
                    <path d="M13.5 3.5V8H18" />
                    <path d="M9 12.5h6M9 16h4" />
                  </svg>
                </span>
                <span class="row-tx">
                  <span class="row-t">這一則的出處</span>
                  <span class="row-s">${esc(tally)}</span>
                </span>
                <svg class="row-ar" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9.5 5.5 L16 12 L9.5 18.5" />
                </svg>
              </summary>
              <ol>
${e.sources.map((s) => sourceItem(s, t)).join("\n")}
              </ol>
            </details>
          </section>
`;

  return shell({
    up: "../../",
    title: `${e.title} · ${t("viewKb")} · ${SITE_NAME}`,
    desc: e.summary,
    cls: "article",
    crumb: { mid: true, here: e.title, path: `kb/${e.slug}/` },
    body: inner,
    extra: src,
    t,
  });
}

/** 索引頁。爬蟲從這裡走到每一則，所以它列的是真的 `<a>` */
export function renderIndex(entries, t, catName) {
  const items = entries
    .map(
      (e) => `        <li class="kb-item">
          <a href="${esc(e.slug)}/">
            <span class="kb-cat" data-cat="${esc(e.cat)}">${esc(catName(e.cat))}</span>
            <span class="kb-t">${esc(e.title)}</span>
            <span class="kb-s">${esc(e.summary)}</span>
            <span class="kb-d">${esc(t("kbUpdated", e.updated))}</span>
          </a>
        </li>`
    )
    .join("\n");

  /*
   * 引言用 `kbLead` 不是 `kbFooter`。後者是給 SPA 頁尾那條連結用的，
   * 自帶「知識：」前綴——擺在 h1「知識」底下會變成同一句講兩次。
   */
  const inner = `    <main class="kb-page">
      <h1>${esc(t("viewKb"))}</h1>
      <p class="kb-lead">${esc(t("kbLead"))}</p>

      <ul class="kb-list">
${items || `        <li class="dim">${esc(t("kbEmpty"))}</li>`}
      </ul>
    </main>`;

  return shell({
    up: "../",
    title: `${t("viewKb")} · ${SITE_NAME}`,
    desc: t("kbLead"),
    cls: "website",
    crumb: { mid: false, here: "", path: "kb/" },
    body: inner,
    t,
  });
}

/**
 * 產生全部頁面，回傳「檔案路徑 → 內容」。
 *
 * 不直接寫檔，`--check` 那條路要拿這份跟磁碟上的比對——
 * 改了內文忘記重跑 build 的話，線上那頁就一直是舊的，
 * 而那是**看不出來的**：頁面好好地在，只是內容過期。
 */
export async function buildAll() {
  const { KB_ENTRIES, KB_CATS } = await import("../js/kbdata.js");
  const { STRINGS, makeT } = await import("../js/i18n.js");
  const t = makeT("zh");
  const CAT_KEY = { trade: "kbCatTrade", search: "kbCatSearch" };
  const catName = (c) => (CAT_KEY[c] ? t(CAT_KEY[c]) : c);

  const problems = [];
  for (const c of KB_CATS) {
    if (!CAT_KEY[c] || !STRINGS.zh[CAT_KEY[c]])
      problems.push(`分類 ${c} 在 i18n 裡沒有譯名`);
  }

  // 排序跟格子牆一致：先照 KB_CATS 分群，同群保持 kbdata 的順序
  const sorted = KB_ENTRIES.map((e, i) => ({ e, i }))
    .sort((a, b) => {
      const ga = KB_CATS.indexOf(a.e.cat);
      const gb = KB_CATS.indexOf(b.e.cat);
      return ga === gb ? a.i - b.i : ga - gb;
    })
    .map(({ e }) => e);

  /*
   * **一則都沒有就不產出任何檔案。** 產一頁寫著「還沒有內容」的索引頁
   * 上線，等於給搜尋引擎一頁空的——而 SPA 那條頁尾連結在沒有內容時
   * 本來就藏著，沒有人會走到它。第一則進 kbdata 就整套長出來。
   */
  const files = new Map();
  if (!sorted.length) return { files, problems, count: 0 };

  for (const e of sorted) {
    let body;
    try {
      body = await readFile(join(SRC_DIR, `${e.slug}.html`), "utf8");
    } catch {
      problems.push(`${e.slug}：找不到內文 kb/_src/${e.slug}.html`);
      continue;
    }
    files.set(join(OUT_DIR, e.slug, "index.html"), renderPage(e, body, t, catName(e.cat)));
  }
  files.set(join(OUT_DIR, "index.html"), renderIndex(sorted, t, catName));

  // kb/_src 有、kbdata 沒有的（底線開頭的是範本，不算）
  let srcFiles = [];
  try {
    srcFiles = await readdir(SRC_DIR);
  } catch {
    /* 還沒有任何內文，不是錯誤 */
  }
  const known = new Set(KB_ENTRIES.map((e) => e.slug));
  for (const f of srcFiles) {
    if (!f.endsWith(".html") || f.startsWith("_")) continue;
    const slug = f.slice(0, -5);
    if (!known.has(slug)) problems.push(`kb/_src/${f} 在 js/kbdata.js 裡沒有對應的一則`);
  }

  return { files, problems, count: sorted.length };
}

async function main() {
  const checkOnly = process.argv.includes("--check");
  const { files, problems, count } = await buildAll();

  for (const p of problems) console.log(`  ! ${p}`);

  let stale = 0;
  for (const [path, content] of files) {
    let old = null;
    try {
      old = await readFile(path, "utf8");
    } catch {
      /* 還沒產生過 */
    }
    if (old === content) continue;
    stale++;
    if (checkOnly) {
      console.log(`  ! ${path.slice(ROOT.length + 1)} 與原始檔不同步`);
      continue;
    }
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
    console.log(`  ✓ ${path.slice(ROOT.length + 1)}`);
  }

  if (!files.size) console.log("  （js/kbdata.js 是空的，不產生任何頁面）");
  else if (!checkOnly && !stale) console.log("  （沒有變動）");
  console.log(`\n知識頁 ${count} 則${SITE ? "" : "，canonical 與 og:url 尚未啟用（待辦 C）"}`);

  if (problems.length || (checkOnly && stale)) process.exitCode = 1;
}

if (import.meta.main) await main();
