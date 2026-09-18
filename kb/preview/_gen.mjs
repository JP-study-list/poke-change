/**
 * _gen.mjs — 產生知識頁版面模板的預覽（暫時，定案後整個 kb/preview/ 刪掉）
 *
 *   node kb/preview/_gen.mjs
 *
 * **底線開頭，所以 Jekyll 不會把它當網頁送出去**，跟 kb/_src 同一個道理。
 *
 * 輸出到 kb/preview/，吃正式的 css/style.css，模板自己的樣式用 inline
 * <style>。選定一個之後那段就搬進 style.css 檔尾的知識區。
 */
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
/*
 * **不能放 kb/_preview**：GitHub Pages 跑 Jekyll，而 Jekyll 不發布底線
 * 開頭的目錄（kb/_src 就是靠這個擋掉的），push 上去線上是 404。
 * 所以預覽放 kb/preview，改用 noindex 擋爬蟲——它是暫時的，
 * 定案後整個目錄刪掉。
 */
const OUT = join(ROOT, "kb", "preview");

const DARK_BOOT = `<script>
      try {
        var p = JSON.parse(localStorage.getItem("poke-change/pref") || "{}");
        if (p.dark) document.body.classList.add("dark");
      } catch (e) {}
    </script>`;

const TPLS = [
  { id: "a", name: "模板 A · 摘要層" },
  { id: "b", name: "模板 B · 問答卡" },
  { id: "c", name: "模板 C · 資料優先" },
  { id: "ac", name: "A+C 合併" },
];

/** 預覽專用的切換列。正式版沒有這條 */
function bar(cur) {
  const links = TPLS.map((x) =>
    x.id === cur
      ? `<span class="pv-on">${x.name}</span>`
      : `<a href="./${x.id}.html">${x.name}</a>`
  ).join("");
  return `    <div class="pv-bar">
      <span class="pv-tag">預覽</span>
      ${links}
      <a class="pv-now" href="../trade-stardust/">現況</a>
    </div>`;
}

const PV_CSS = `
      /* ── 預覽列，正式版不會有 ── */
      .pv-bar {
        display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
        padding: 8px 20px; border-bottom: 1px solid var(--line);
        background: var(--sunk); font-size: var(--fs-13);
      }
      .pv-tag {
        padding: 1px 7px; border-radius: 999px; background: var(--gold);
        color: #fff; font: var(--caps); line-height: 1.7;
      }
      .pv-bar a { color: var(--ink2); }
      .pv-on { font-weight: 700; color: var(--gold-ink); }
      .pv-now { margin-left: auto; color: var(--dim) !important; }`;

function shell({ id, title, css, body }) {
  return `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="robots" content="noindex, nofollow" />
    <title>${title}</title>
    <link rel="stylesheet" href="../../css/style.css" />
    <style>${PV_CSS}
${css}
    </style>
  </head>
  <body class="tpl-${id}">
    ${DARK_BOOT}

    <header class="kb-top">
      <nav class="kb-crumb">
        <a href="../../">寶可夢交換所</a>
        <a href="../">知識</a>
        <span>交換的星星沙子</span>
      </nav>
    </header>

${bar(id)}

${body}
  </body>
</html>
`;
}

const HEAD = `      <p class="kb-cat" data-cat="trade">交換</p>
      <h1>交換的星星沙子</h1>
      <p class="kb-lead">交換要花多少星星沙子，取決於友誼等級、對方圖鑑裡登錄了沒有，以及牠是不是特殊種類。</p>
      <p class="kb-meta">更新於 2026-09-18</p>`;

const SRC = `      <section class="kb-src">
        <h2>出處</h2>
        <ol>
          <li><a href="#">Niantic 說明中心：交換寶可夢（FAQ 96，繁中）</a> <span class="kb-tag official">官方</span></li>
          <li><a href="#">Niantic 說明中心：Trading Pokémon（FAQ 96，英文）</a> <span class="kb-tag official">官方</span></li>
          <li><a href="#">Bulbapedia：Trade (GO)（2026-09 查閱）</a> <span class="kb-tag community">社群說法，非官方</span></li>
        </ol>
      </section>`;

/* ═════════ 模板 A ═════════ */

const A_CSS = `
      /* ── 摘要層：重點格 ── */
      .kb-tldr {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 10px;
        margin-top: 22px;
      }
      .tldr-i {
        padding: 12px 14px 11px;
        border: 1px solid var(--line);
        border-top: 3px solid var(--gold);
        border-radius: 0 0 var(--radius) var(--radius);
        background: var(--card);
      }
      .tldr-n {
        display: block;
        font-size: var(--fs-xl);
        font-weight: 700;
        line-height: 1.2;
        font-variant-numeric: tabular-nums;
      }
      .tldr-u { font-size: var(--fs-sm); color: var(--dim); }
      .tldr-t {
        display: block;
        margin-top: 5px;
        font-size: var(--fs-sm);
        line-height: 1.5;
        color: var(--ink2);
      }

      /* ── 章節速覽 ── */
      .kb-toc {
        display: flex; flex-wrap: wrap; gap: 6px;
        margin-top: 14px;
      }
      .kb-toc a {
        padding: 4px 10px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: var(--card);
        font-size: var(--fs-sm);
        color: var(--ink2);
        text-decoration: none;
      }
      .kb-toc a:hover { border-color: var(--gold); color: var(--gold-ink); }

      /* ── 編號小標 ── */
      .kb-numbered { counter-reset: kbsec; }
      .kb-numbered h2 {
        display: flex;
        align-items: baseline;
        gap: 10px;
      }
      /* 編號跟標題同一條基線。絕對定位對不準，行高一改就跑掉 */
      .kb-numbered h2::before {
        counter-increment: kbsec;
        content: counter(kbsec, decimal-leading-zero);
        flex: none;
        font: var(--caps);
        font-size: var(--fs-13);
        color: var(--gold-ink);
      }

      /* ── 表格：數字成列、斑馬紋、首欄不捲走 ── */
      .tpl-a .kb-body table { font-variant-numeric: tabular-nums; }
      .tpl-a .kb-body td { text-align: right; }
      .tpl-a .kb-body tr:nth-child(even) td,
      .tpl-a .kb-body tr:nth-child(even) th[scope="row"] { background: var(--sunk); }
      .tpl-a .kb-body th[scope="row"] {
        position: sticky; left: 0;
        background: var(--bg);
        white-space: nowrap;
      }
      .tpl-a .kb-body th[scope="col"] { text-align: right; line-height: 1.5; }
      .tpl-a .kb-body th[scope="col"]:first-child { text-align: left; }`;

const A_BODY = `    <main class="kb-page">
${HEAD}

      <div class="kb-tldr">
        <div class="tldr-i"><span class="tldr-n">100</span><span class="tldr-t">雙方圖鑑都登錄的一般寶可夢，六個友誼等級都一樣</span></div>
        <div class="tldr-i"><span class="tldr-n">1,000,000</span><span class="tldr-t">最貴的一格：對方沒登錄過的特殊寶可夢</span></div>
        <div class="tldr-i"><span class="tldr-n">1 <span class="tldr-u">點</span></span><span class="tldr-t">升到「好朋友」，四種交換全部解鎖</span></div>
        <div class="tldr-i"><span class="tldr-n">1 <span class="tldr-u">次／天</span></span><span class="tldr-t">特殊交換的每日上限，遠距離交換不算</span></div>
      </div>

      <nav class="kb-toc">
        <a href="#s1">一張表看完</a>
        <a href="#s2">哪些算「特殊」</a>
        <a href="#s3">「朋友」這一級</a>
        <a href="#s4">每天只能一次</a>
      </nav>

      <article class="kb-body kb-numbered">
        <h2 id="s1">一張表看完</h2>

        <p>交換要花多少星星沙子，看兩件事：<strong>那隻寶可夢在雙方的圖鑑裡登錄了沒有</strong>，以及<strong>牠是不是特殊種類</strong>。兩件事各有兩種可能，再乘上六個友誼等級，就是下面這張表。</p>

        <div class="kb-scroll">
          <table>
            <tr>
              <th scope="col">友誼等級</th>
              <th scope="col">一般<br />已登錄</th>
              <th scope="col">一般<br />未登錄</th>
              <th scope="col">特殊<br />已登錄</th>
              <th scope="col">特殊<br />未登錄</th>
            </tr>
            <tr><th scope="row">朋友</th><td>100</td><td>不可交換</td><td>不可交換</td><td>不可交換</td></tr>
            <tr><th scope="row">好朋友</th><td>100</td><td>20,000</td><td>20,000</td><td>1,000,000</td></tr>
            <tr><th scope="row">給力好朋友</th><td>100</td><td>16,000</td><td>16,000</td><td>800,000</td></tr>
            <tr><th scope="row">麻吉好朋友</th><td>100</td><td>1,600</td><td>1,600</td><td>80,000</td></tr>
            <tr><th scope="row">正港好朋友</th><td>100</td><td>800</td><td>800</td><td>40,000</td></tr>
            <tr><th scope="row">正港好朋友＋</th><td>100</td><td>800</td><td>800</td><td>40,000</td></tr>
          </table>
        </div>

        <p><strong>兩個人付一樣多。</strong>各付各的一份，不是分攤，而且兩隻寶可夢的費用不同時<strong>取貴的那一邊</strong>，雙方都照那個數字付。</p>

        <p>「登錄了沒有」看的是<strong>收到那一隻的人</strong>有沒有登錄過。所以想省沙子，<strong>先確認對方圖鑑裡有沒有你要給的那一隻</strong>，比衝友誼等級有用：同樣一隻異色，對方有登錄的話在正港好朋友之間是 800，沒登錄就要 40,000，而且兩個人都付 40,000。</p>

        <p class="kb-note"><strong>「正港好朋友＋」不會再更便宜。</strong>官方把它的交換折扣寫成「『正港好朋友』固定獎勵」，遊戲資料裡兩級的折扣值也一樣。升到第六級拿到的是<a href="../remote-trade/">遠距離交換</a>的機會，費用維持不變。</p>

        <h2 id="s2">哪些算「特殊」</h2>

        <p>被歸進特殊那兩欄的是<strong>傳說寶可夢、究極異獸、異色寶可夢、美錄坦與美錄梅塔，以及可超極巨化的寶可夢</strong>。</p>

        <p><strong>帶背卡的寶可夢也算特殊交換。</strong>所以它不只比較貴，還會吃掉<a href="../remote-trade/">每天那一次</a>特殊交換的額度。這對交換清單的影響不小：一份清單裡挑幾隻帶背卡的，就得排好幾天才換得完。</p>

        <p class="kb-note">背卡這一條<strong>只有官方英文版的說明頁寫了</strong>（列成「帶有獨特或特殊特徵的寶可夢，例如紀念背卡」），<strong>繁中版沒有這一行</strong>。繁中那頁是還沒更新的舊翻譯，跟交換的等級門檻寫 12 級是同一個情況。</p>

        <p><strong>圖鑑裡沒登錄過的型態也會被當成「未登錄」</strong>，即使那個物種你早就有了。地區型、未知圖騰、裝扮寶可夢、飄浮泡泡都算。所以一隻戴帽子的皮卡丘，費用可能跟你想的差很多。</p>

        <h2 id="s3">「朋友」這一級幾乎換不了東西</h2>

        <p>剛加好友、還沒累積任何朋友點數的時候，<strong>只能交換雙方圖鑑裡都已經登錄的一般寶可夢</strong>。異色、傳說、對方沒登錄過的，全部不能換。</p>

        <p>累積 <strong>1 點</strong>朋友點數升到「好朋友」，上面四欄就全部解鎖了。所以這一級只擋得住剛加完好友的那段時間。</p>

        <h2 id="s4">特殊交換每天只能一次</h2>

        <p>上面表格右邊三欄那些，在遊戲裡叫<strong>特殊交換</strong>，而特殊交換<strong>每天只能進行 1 次</strong>（官方只寫「有每日次數上限」，這個數字是社群的說法）。</p>

        <p><a href="../remote-trade/">遠距離交換</a><strong>不計入這個額度</strong>。不管換的是傳說、異色還是圖鑑裡沒有的，都不吃特殊交換的次數，等於每天多一次換稀有貨的機會。</p>
      </article>

${SRC}
    </main>`;

/* ═════════ 模板 B ═════════ */

const B_CSS = `
      /* ── 問答卡 ── */
      .qa {
        margin-top: 16px;
        padding: 18px 20px 6px;
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: var(--card);
      }
      .qa > h2 {
        display: flex; gap: 10px; align-items: baseline;
        margin: 0 0 12px;
        padding: 0;
        border-top: 0;
        font-size: var(--fs-lg);
      }
      .qa > h2::before {
        content: "Q";
        flex: none;
        width: 22px; height: 22px;
        border-radius: 999px;
        background: var(--gold);
        color: #fff;
        font: 700 var(--fs-sm) / 22px system-ui, sans-serif;
        text-align: center;
      }
      /*
       * 一句話答案。讀完四張卡的這一行就等於讀完整頁。
       * **不給它框**：這一頁上「灰底加金色左線」已經是 .kb-note 的樣子，
       * 那個框的意思是「這條沒有官方依據」，兩個撞臉會讀成同一種份量。
       * 改用字級與粗細拉開，底下一條髮絲線收尾。
       */
      .qa-a {
        margin: 0 0 14px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--hair);
        font-size: var(--fs-lg);
        font-weight: 600;
        line-height: 1.7;
      }
      /* 細節退一階，卡片裡兩種份量分得出來 */
      .qa > p:not(.qa-a):not(.kb-note),
      .qa > .kb-scroll + p { color: var(--ink2); }
      .qa .kb-note { background: var(--bg); }
      .tpl-b .kb-body table { font-variant-numeric: tabular-nums; }
      .tpl-b .kb-body td { text-align: right; }
      .tpl-b .kb-body th[scope="col"] { text-align: right; line-height: 1.5; }
      .tpl-b .kb-body th[scope="col"]:first-child { text-align: left; }
      .tpl-b .kb-body tr:nth-child(even) td,
      .tpl-b .kb-body tr:nth-child(even) th[scope="row"] { background: var(--sunk); }`;

const B_BODY = `    <main class="kb-page">
${HEAD}

      <article class="kb-body">
        <section class="qa">
          <h2>一次交換要花多少星星沙子？</h2>
          <p class="qa-a">看兩件事：那隻寶可夢在雙方的圖鑑裡登錄了沒有，以及牠是不是特殊種類。兩件事各有兩種可能，再乘上六個友誼等級。</p>

          <div class="kb-scroll">
            <table>
              <tr>
                <th scope="col">友誼等級</th>
                <th scope="col">一般<br />已登錄</th>
                <th scope="col">一般<br />未登錄</th>
                <th scope="col">特殊<br />已登錄</th>
                <th scope="col">特殊<br />未登錄</th>
              </tr>
              <tr><th scope="row">朋友</th><td>100</td><td>不可交換</td><td>不可交換</td><td>不可交換</td></tr>
              <tr><th scope="row">好朋友</th><td>100</td><td>20,000</td><td>20,000</td><td>1,000,000</td></tr>
              <tr><th scope="row">給力好朋友</th><td>100</td><td>16,000</td><td>16,000</td><td>800,000</td></tr>
              <tr><th scope="row">麻吉好朋友</th><td>100</td><td>1,600</td><td>1,600</td><td>80,000</td></tr>
              <tr><th scope="row">正港好朋友</th><td>100</td><td>800</td><td>800</td><td>40,000</td></tr>
              <tr><th scope="row">正港好朋友＋</th><td>100</td><td>800</td><td>800</td><td>40,000</td></tr>
            </table>
          </div>

          <p><strong>兩個人付一樣多</strong>，各付一份不是分攤，兩隻寶可夢的費用不同時取貴的那一邊。「登錄了沒有」看的是<strong>收到那一隻的人</strong>，所以想省沙子，先確認對方圖鑑裡有沒有你要給的那一隻，比衝友誼等級有用：同樣一隻異色，對方有登錄的話在正港好朋友之間是 800，沒登錄就要 40,000，而且兩個人都付。</p>

          <p class="kb-note"><strong>「正港好朋友＋」不會再更便宜。</strong>官方把它的交換折扣寫成「『正港好朋友』固定獎勵」，遊戲資料裡兩級的折扣值也一樣。升到第六級拿到的是<a href="../remote-trade/">遠距離交換</a>的機會，費用維持不變。</p>
        </section>

        <section class="qa">
          <h2>哪些算「特殊」？</h2>
          <p class="qa-a">傳說寶可夢、究極異獸、異色寶可夢、美錄坦與美錄梅塔、可超極巨化的寶可夢，還有帶背卡的寶可夢。</p>

          <p><strong>帶背卡的那一條影響最大。</strong>它不只比較貴，還會吃掉<a href="../remote-trade/">每天那一次</a>特殊交換的額度。一份清單裡挑幾隻帶背卡的，就得排好幾天才換得完。</p>

          <p><strong>圖鑑裡沒登錄過的型態也會被當成「未登錄」</strong>，即使那個物種你早就有了。地區型、未知圖騰、裝扮寶可夢、飄浮泡泡都算。所以一隻戴帽子的皮卡丘，費用可能跟你想的差很多。</p>

          <p class="kb-note">背卡這一條<strong>只有官方英文版的說明頁寫了</strong>（列成「帶有獨特或特殊特徵的寶可夢，例如紀念背卡」），<strong>繁中版沒有這一行</strong>。繁中那頁是還沒更新的舊翻譯，跟交換的等級門檻寫 12 級是同一個情況。</p>
        </section>

        <section class="qa">
          <h2>剛加好友就能開始交換嗎？</h2>
          <p class="qa-a">只能換雙方圖鑑裡都已經登錄的一般寶可夢。累積 1 點朋友點數升到「好朋友」，四種交換就全部解鎖。</p>

          <p>「朋友」這一級之下，異色、傳說、對方沒登錄過的全部不能換。而 1 點只要互動一次就有，所以這一級只擋得住剛加完好友的那段時間。</p>
        </section>

        <section class="qa">
          <h2>特殊交換一天能做幾次？</h2>
          <p class="qa-a">1 次。<a href="../remote-trade/">遠距離交換</a>不計入這個額度。</p>

          <p>表格右邊三欄那些在遊戲裡都叫<strong>特殊交換</strong>（官方只寫「有每日次數上限」，1 次這個數字是社群的說法）。遠距離交換不管換的是傳說、異色還是圖鑑裡沒有的，都不吃這個次數，等於每天多一次換稀有貨的機會。</p>
        </section>
      </article>

${SRC}
    </main>`;

/* ═════════ 模板 C ═════════ */

const C_CSS = `
      /* ── 兩欄：主內容 + 右側目錄 ── */
      .tpl-c .kb-page { max-width: 1040px; }
      .kb-cols {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 190px;
        gap: 40px;
        align-items: start;
      }
      .kb-aside {
        position: sticky; top: 20px;
        padding-left: 18px;
        border-left: 1px solid var(--line);
      }
      .kb-aside h2 { margin: 0 0 10px; font: var(--caps); color: var(--dim); text-transform: uppercase; }
      .kb-aside a {
        display: block;
        padding: 5px 0;
        font-size: var(--fs-13);
        line-height: 1.5;
        color: var(--ink2);
        text-decoration: none;
      }
      .kb-aside a:hover { color: var(--gold-ink); }

      /* ── 費用矩陣。表格換成色階，貴不貴用看的 ── */
      .cost {
        display: grid;
        grid-template-columns: max-content repeat(4, minmax(78px, 1fr));
        gap: 4px;
        min-width: 480px;
      }
      .cost .ch {
        padding: 0 6px 6px;
        font: var(--caps);
        line-height: 1.5;
        color: var(--dim);
        text-transform: uppercase;
        text-align: center;
      }
      .cost .ch:first-child { text-align: left; }
      .cost .rh {
        display: flex; align-items: center;
        padding-right: 10px;
        font-size: var(--fs-base);
        font-weight: 600;
        white-space: nowrap;
      }
      /*
       * **階只做在底色，文字一律 --ink。** 各階配自己色相的文字量過了：
       * 淺色的千位 4.32、萬位 3.50、百萬位 3.61 都低於 AA 的 4.5
       * （15px 粗體不到大字標準，要 4.5 不是 3）。底色濃度已經把階說清楚，
       * 文字再上色換不到辨識度，只換到四格不合格。
       */
      .cost .c {
        padding: 9px 6px;
        border-radius: 6px;
        color: var(--ink);
        font-size: var(--fs-md);
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        text-align: center;
        line-height: 1.3;
      }
      /* 四階色。淺色用低飽和底配深字，深色那套只調底色濃度 */
      .c.t0 { background: color-mix(in srgb, var(--have) 14%, var(--card)); }
      .c.t1 { background: color-mix(in srgb, var(--gold) 20%, var(--card)); }
      .c.t2 { background: color-mix(in srgb, var(--want) 20%, var(--card)); }
      .c.t3 { background: color-mix(in srgb, var(--danger) 16%, var(--card)); }
      /* 百萬那一格要跟四萬分得出來，差 25 倍 */
      .c.t4 { background: color-mix(in srgb, var(--danger) 34%, var(--card)); }
      /*
       * 「不可交換」是空格子，不是一個值。**底色不能用 --sunk**：
       * 深色的 --sunk（#0b0b0b）比畫布（#101010）更暗，那三格會變成
       * 頁面上三個黑洞——.kb-note 為同一條理由改吃 --card。
       * 虛線框讓它讀起來就是「這裡沒有東西」。
       */
      .c.no {
        border: 1px dashed var(--line);
        background: var(--card);
        color: var(--dim);
        font-size: var(--fs-sm);
        font-weight: 600;
      }
      .cost-key {
        display: flex; flex-wrap: wrap; gap: 14px;
        margin: 12px 0 18px;
        font-size: var(--fs-sm);
        color: var(--dim);
      }
      .cost-key span { display: flex; align-items: center; gap: 5px; }
      .cost-key .c { padding: 0; }
      /* 圖例的色塊吃格子那幾個 class，不另外調濃度——調了就對不上 */
      .cost-key i {
        width: 22px; height: 12px; border-radius: 3px;
        border: 1px solid var(--line);
      }

      /* ── 大數字 ── */
      .stat-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 10px;
        margin: 22px 0 18px;
      }
      .stat {
        padding: 12px 14px;
        border-radius: var(--radius);
        background: var(--sunk);
      }
      .stat b {
        display: block;
        font-size: var(--fs-xl);
        line-height: 1.2;
        font-variant-numeric: tabular-nums;
      }
      .stat span {
        display: block;
        margin-top: 4px;
        font-size: var(--fs-sm);
        line-height: 1.5;
        color: var(--ink2);
      }

      /* ── 要點清單。段落塌成可掃的短行 ── */
      .kb-body ul.pts { padding-left: 0; list-style: none; }
      ul.pts > li {
        position: relative;
        margin-bottom: 9px;
        padding-left: 18px;
        line-height: 1.7;
      }
      ul.pts > li::before {
        content: "";
        position: absolute; left: 2px; top: 11px;
        width: 6px; height: 6px;
        border-radius: 2px;
        background: var(--gold);
      }

      @media (max-width: 900px) {
        /*
         * **minmax(0, 1fr) 不能寫成 1fr**：1fr 的下限是 auto，
         * 費用矩陣那 480px 會把整欄撐開，整頁跟著橫向捲（實測 496 對 390）。
         * 跟寶可夢格子牆那條是同一個坑。
         */
        .kb-cols { grid-template-columns: minmax(0, 1fr); gap: 0; }
        /*
         * 目錄搬到內文前面。DOM 上它排在後面（桌機靠 grid 擺到右邊），
         * 單欄之後就會掉到出處底下——捲完整頁才看到目錄沒有意義。
         */
        .kb-aside {
          order: -1;
          position: static;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 20px;
          padding: 0;
          border-left: 0;
        }
        .kb-aside h2 { width: 100%; margin: 0; }
        .kb-aside a {
          padding: 4px 10px;
          border: 1px solid var(--line);
          border-radius: 999px;
          background: var(--card);
          font-size: var(--fs-sm);
        }
      }`;

/*
 * 一格。第三個值是**手機用的短寫**：390 螢幕塞不下「1,000,000」九個字元，
 * 而再縮字級就到不能讀的大小了。兩份都寫進 DOM，靠 CSS 切——
 * display: none 那份讀屏也不會唸到，所以不必 aria-hidden。
 */
const CELL = (v, t, short) => {
  if (v === "—") return `<div class="c no">不可交換</div>`;
  const inner = short
    ? `<span class="n-lg">${v}</span><span class="n-sm">${short}</span>`
    : v;
  return `<div class="c t${t}">${inner}</div>`;
};

const ROWS = [
  ["朋友", ["100", 0], ["—"], ["—"], ["—"]],
  ["好朋友", ["100", 0], ["20,000", 2, "2萬"], ["20,000", 2, "2萬"], ["1,000,000", 4, "100萬"]],
  ["給力好朋友", ["100", 0], ["16,000", 2, "1.6萬"], ["16,000", 2, "1.6萬"], ["800,000", 4, "80萬"]],
  ["麻吉好朋友", ["100", 0], ["1,600", 1], ["1,600", 1], ["80,000", 3, "8萬"]],
  ["正港好朋友", ["100", 0], ["800", 1], ["800", 1], ["40,000", 3, "4萬"]],
  ["正港好朋友＋", ["100", 0], ["800", 1], ["800", 1], ["40,000", 3, "4萬"]],
];

const COST = ROWS.map(
  ([name, ...cells]) =>
    `            <div class="rh">${name}</div>\n` +
    cells.map((c) => `            ${CELL(c[0], c[1], c[2])}`).join("\n")
).join("\n");

const C_BODY = `    <main class="kb-page">
${HEAD}

      <div class="kb-cols">
        <div>
          <article class="kb-body">
            <h2 id="s1">費用一覽</h2>

            <p>交換要花多少星星沙子，看<strong>那隻寶可夢在雙方的圖鑑裡登錄了沒有</strong>，以及<strong>牠是不是特殊種類</strong>。</p>

            <div class="kb-scroll">
              <div class="cost">
                <div class="ch">友誼等級</div>
                <div class="ch">一般<br />已登錄</div>
                <div class="ch">一般<br />未登錄</div>
                <div class="ch">特殊<br />已登錄</div>
                <div class="ch">特殊<br />未登錄</div>
${COST}
              </div>
            </div>

            <div class="cost-key">
              <span><i class="c t0"></i>百位</span>
              <span><i class="c t1"></i>千位</span>
              <span><i class="c t2"></i>萬位</span>
              <span><i class="c t3"></i>十萬位</span>
              <span><i class="c t4"></i>百萬位</span>
            </div>

            <ul class="pts">
              <li><strong>兩個人付一樣多。</strong>各付一份不是分攤，兩隻寶可夢的費用不同時取貴的那一邊。</li>
              <li>「登錄了沒有」看的是<strong>收到那一隻的人</strong>。想省沙子，先確認對方圖鑑裡有沒有你要給的那一隻，比衝友誼等級有用：同樣一隻異色，對方有登錄是 800，沒登錄要 40,000，而且兩個人都付。</li>
            </ul>

            <p class="kb-note"><strong>「正港好朋友＋」不會再更便宜。</strong>官方把它的交換折扣寫成「『正港好朋友』固定獎勵」，遊戲資料裡兩級的折扣值也一樣。升到第六級拿到的是<a href="../remote-trade/">遠距離交換</a>的機會，費用維持不變。</p>

            <h2 id="s2">哪些算「特殊」</h2>

            <ul class="pts">
              <li>傳說寶可夢、究極異獸、異色寶可夢、美錄坦與美錄梅塔、可超極巨化的寶可夢。</li>
              <li><strong>帶背卡的寶可夢也算。</strong>它不只比較貴，還會吃掉<a href="../remote-trade/">每天那一次</a>特殊交換的額度。一份清單裡挑幾隻帶背卡的，就得排好幾天才換得完。</li>
              <li><strong>圖鑑裡沒登錄過的型態算「未登錄」</strong>，即使那個物種你早就有了。地區型、未知圖騰、裝扮寶可夢、飄浮泡泡都算，所以一隻戴帽子的皮卡丘費用可能跟你想的差很多。</li>
            </ul>

            <p class="kb-note">背卡這一條<strong>只有官方英文版的說明頁寫了</strong>（列成「帶有獨特或特殊特徵的寶可夢，例如紀念背卡」），<strong>繁中版沒有這一行</strong>。繁中那頁是還沒更新的舊翻譯，跟交換的等級門檻寫 12 級是同一個情況。</p>

            <h2 id="s3">兩個門檻</h2>

            <div class="stat-row">
              <div class="stat"><b>1 點</b><span>朋友點數升到「好朋友」，四種交換全部解鎖</span></div>
              <div class="stat"><b>1 次／天</b><span>特殊交換的每日上限，遠距離交換不計入</span></div>
            </div>

            <ul class="pts">
              <li>剛加好友、還沒累積任何朋友點數時，<strong>只能交換雙方圖鑑裡都已經登錄的一般寶可夢</strong>。這一級只擋得住加完好友的那段時間。</li>
              <li>表格右邊三欄那些在遊戲裡叫<strong>特殊交換</strong>，每天只能進行 1 次（官方只寫「有每日次數上限」，這個數字是社群的說法）。</li>
              <li><a href="../remote-trade/">遠距離交換</a>不吃這個額度，等於每天多一次換稀有貨的機會。</li>
            </ul>
          </article>

${SRC}
        </div>

        <aside class="kb-aside">
          <h2>這一頁</h2>
          <a href="#s1">費用一覽</a>
          <a href="#s2">哪些算「特殊」</a>
          <a href="#s3">兩個門檻</a>
        </aside>
      </div>
    </main>`;

/* ═════════ A + C 合併 ═════════ */

const AC_CSS = `
      /* ── A：章節速覽 ── */
      .kb-toc { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 20px; }
      .kb-toc a {
        padding: 4px 10px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: var(--card);
        font-size: var(--fs-sm);
        color: var(--ink2);
        text-decoration: none;
      }
      .kb-toc a:hover { border-color: var(--gold); color: var(--gold-ink); }

      .kb-numbered { counter-reset: kbsec; }
      .kb-numbered h2 { display: flex; align-items: baseline; gap: 10px; }
      .kb-numbered h2::before {
        counter-increment: kbsec;
        content: counter(kbsec, decimal-leading-zero);
        flex: none;
        font: var(--caps);
        font-size: var(--fs-13);
        color: var(--gold-ink);
      }

      /*
       * 兩端對齊。CJK 靠字元間距撐，不像英文會被拉出大空隙。
       * **只給整段的內文**：標題、矩陣、出處那種短行對齊了反而更亂。
       * 最後一行照常靠左，那是 justify 本來的行為。
       */
      .kb-lead,
      .kb-body p,
      .kb-body li {
        text-align: justify;
      }

      /* ── C：費用矩陣 ── */
      .cost {
        display: grid;
        grid-template-columns: max-content repeat(4, minmax(78px, 1fr));
        gap: 4px;
        min-width: 480px;
      }
      .cost .ch {
        padding: 0 6px 6px;
        font: var(--caps);
        line-height: 1.5;
        color: var(--dim);
        text-transform: uppercase;
        text-align: center;
      }
      .cost .ch:first-child { text-align: left; }
      .cost .rh {
        display: flex; align-items: center;
        padding-right: 10px;
        font-size: var(--fs-base);
        font-weight: 600;
        white-space: nowrap;
      }
      /*
       * **階只做在底色，文字一律 --ink。** 各階配自己色相的文字量過了：
       * 淺色的千位 4.32、萬位 3.50、百萬位 3.61 都低於 AA 的 4.5
       * （15px 粗體不到大字標準，要 4.5 不是 3）。底色濃度已經把階說清楚，
       * 文字再上色換不到辨識度，只換到四格不合格。
       */
      .cost .c {
        padding: 9px 6px;
        border-radius: 6px;
        color: var(--ink);
        font-size: var(--fs-md);
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        text-align: center;
        line-height: 1.3;
      }
      .c.t0 { background: color-mix(in srgb, var(--have) 14%, var(--card)); }
      .c.t1 { background: color-mix(in srgb, var(--gold) 20%, var(--card)); }
      .c.t2 { background: color-mix(in srgb, var(--want) 20%, var(--card)); }
      .c.t3 { background: color-mix(in srgb, var(--danger) 16%, var(--card)); }
      .c.t4 { background: color-mix(in srgb, var(--danger) 34%, var(--card)); }
      /*
       * 「不可交換」是空格子，不是一個值。**底色不能用 --sunk**：
       * 深色的 --sunk（#0b0b0b）比畫布（#101010）更暗，那三格會變成
       * 頁面上三個黑洞——.kb-note 為同一條理由改吃 --card。
       * 虛線框讓它讀起來就是「這裡沒有東西」。
       */
      .c.no {
        border: 1px dashed var(--line);
        background: var(--card);
        color: var(--dim);
        font-size: var(--fs-sm);
        font-weight: 600;
      }
      /*
       * 手機上矩陣要塞進螢幕，不靠左右滑。縮三處：字級、格子內距、欄間距，
       * 並把 min-width 收掉、資料欄改 minmax(0, 1fr)。
       */
      .n-sm { display: none; }

      @media (max-width: 900px) {
        .cost {
          min-width: 0;
          grid-template-columns: max-content repeat(4, minmax(0, 1fr));
          gap: 3px;
        }
        .cost .rh { padding-right: 6px; font-size: var(--fs-sm); }
        .cost .c { padding: 8px 2px; }
        .cost .c.no { font-size: var(--fs-xs); }
        .cost .ch { padding: 0 2px 6px; }
        /* 六位數換成萬進位，字級才不必跟著縮 */
        .n-lg { display: none; }
        .n-sm { display: inline; }
      }

      /* ── C：要點清單 ── */
      .kb-body ul.pts { padding-left: 0; list-style: none; }
      ul.pts > li {
        position: relative;
        margin-bottom: 9px;
        padding-left: 18px;
        line-height: 1.7;
      }
      ul.pts > li::before {
        content: "";
        position: absolute; left: 2px; top: 11px;
        width: 6px; height: 6px;
        border-radius: 2px;
        background: var(--gold);
      }`;

const AC_BODY = `    <main class="kb-page">
${HEAD}

      <nav class="kb-toc">
        <a href="#s1">費用一覽</a>
        <a href="#s2">哪些算「特殊」</a>
        <a href="#s3">兩個門檻</a>
      </nav>

      <article class="kb-body kb-numbered">
        <h2 id="s1">費用一覽</h2>

        <p>交換要花多少星星沙子，看<strong>那隻寶可夢在雙方的圖鑑裡登錄了沒有</strong>，以及<strong>牠是不是特殊種類</strong>。</p>

        <div class="kb-scroll">
          <div class="cost">
            <div class="ch">友誼等級</div>
            <div class="ch">一般<br />已登錄</div>
            <div class="ch">一般<br />未登錄</div>
            <div class="ch">特殊<br />已登錄</div>
            <div class="ch">特殊<br />未登錄</div>
${COST}
          </div>
        </div>

        <ul class="pts">
          <li><strong>兩個人付一樣多。</strong>各付一份不是分攤，兩隻寶可夢的費用不同時取貴的那一邊。</li>
          <li>「登錄了沒有」看的是<strong>收到那一隻的人</strong>。想省沙子，先確認對方圖鑑裡有沒有你要給的那一隻，比衝友誼等級有用：同樣一隻異色，對方有登錄是 800，沒登錄要 40,000，而且兩個人都付。</li>
          <li><strong>「正港好朋友＋」消耗的星星沙子跟「正港好朋友」相同</strong>，所以表上最後兩列一樣。</li>
        </ul>

        <h2 id="s2">哪些算「特殊」</h2>

        <ul class="pts">
          <li>傳說寶可夢、究極異獸、異色寶可夢、美錄坦與美錄梅塔、可超極巨化的寶可夢。</li>
          <li><strong>帶背卡的寶可夢也算。</strong>它不只比較貴，還會吃掉<a href="../remote-trade/">每天那一次</a>特殊交換的額度。一份清單裡挑幾隻帶背卡的，就得排好幾天才換得完。</li>
          <li><strong>圖鑑裡沒登錄過的型態算「未登錄」</strong>，即使那個物種你早就有了。地區型、未知圖騰、裝扮寶可夢、飄浮泡泡都算，所以一隻戴帽子的皮卡丘費用可能跟你想的差很多。</li>
        </ul>

        <p class="kb-note">背卡這一條<strong>只有官方英文版的說明頁寫了</strong>（列成「帶有獨特或特殊特徵的寶可夢，例如紀念背卡」），<strong>繁中版沒有這一行</strong>。繁中那頁是還沒更新的舊翻譯，跟交換的等級門檻寫 12 級是同一個情況。</p>

        <h2 id="s3">兩個門檻</h2>

        <ul class="pts">
          <li>剛加好友、還沒累積任何朋友點數時，<strong>只能交換雙方圖鑑裡都已經登錄的一般寶可夢</strong>。這一級只擋得住加完好友的那段時間。</li>
          <li>表格右邊三欄那些在遊戲裡叫<strong>特殊交換</strong>，每天只能進行 1 次（官方只寫「有每日次數上限」，這個數字是社群的說法）。</li>
          <li><a href="../remote-trade/">遠距離交換</a>不吃這個額度，等於每天多一次換稀有貨的機會。</li>
        </ul>
      </article>

${SRC}
    </main>`;

await mkdir(OUT, { recursive: true });
const pages = [
  ["a.html", shell({ id: "a", title: "模板 A · 摘要層", css: A_CSS, body: A_BODY })],
  ["b.html", shell({ id: "b", title: "模板 B · 問答卡", css: B_CSS, body: B_BODY })],
  ["c.html", shell({ id: "c", title: "模板 C · 資料優先", css: C_CSS, body: C_BODY })],
  ["ac.html", shell({ id: "ac", title: "A+C 合併", css: AC_CSS, body: AC_BODY })],
];
for (const [f, html] of pages) {
  await writeFile(join(OUT, f), html);
  console.log("  ✓ kb/preview/" + f);
}
