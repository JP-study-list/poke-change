/**
 * kbdata.js — 知識檢視的 metadata
 *
 * **手動維護**，跟 godex／bgdata 那批自動產生的不一樣。
 *
 * ── 為什麼 metadata 與內文分開 ──
 * 格子牆只讀這個檔，畫一面牆不必載入任何一則的內文。
 * 內文在 `kb/_src/<slug>.html`，是純 HTML 片段（不套殼），
 * `tools/build-kb.mjs` 把兩邊合起來輸出 `kb/<slug>/index.html`。
 *
 * ── 為什麼不做 Markdown ──
 * 這個站沒有 npm，要自己刻一個解析器，那是 bug 溫床（逸出、表格、巢狀清單）。
 * 寫內文時多打幾個 `<p>` 的代價遠比維護一個半吊子解析器低。
 *
 * ── 一則長這樣 ──
 * ```
 * {
 *   slug: "lucky-trinket",           // 小寫英數與連字號，就是網址那一段
 *   title: "亮晶晶首飾",              // 繁中。**官方譯名，不自己翻**
 *   summary: "一次性道具，對方要到給力好朋友才能用",
 *   cat: "trade",                    // KB_CATS 裡的一個
 *   updated: "2026-09-18",           // 內容最後查證的日期，不是檔案改動日
 *   sources: [
 *     { label: "Niantic 說明中心 FAQ 4945", url: "https://…", official: true },
 *   ],
 * }
 * ```
 *
 * ── 三條規矩 ──
 * 1. **`slug` 一旦發布就不能改**。它是網址，改了外部連結全部斷掉，
 *    搜尋引擎累積的權重也歸零。跟條目 id 同一個道理。
 * 2. **至少要有一條來源**，而且 `official: false` 的會在頁面上標成
 *    「社群說法」。查不到官方出處不是不能寫，是要講明白——
 *    這一點跟圖鑑的「查不到就不要放」不同，因為頁面寫得出這句話，
 *    圖鑑的格子寫不出。
 * 3. **術語一律用官方繁中**（亮晶晶好朋友、給力好朋友），
 *    不用玩家俗稱也不自己翻譯。
 *
 * 內容一則一則進來（待辦 A-4 到 A-7）。
 * **空的時候第四顆檢視鈕不會畫**，沒有內容就沒有入口。
 */

/** 分類。譯名在 `js/i18n.js` 的 `kbCat<Xxx>`，順序就是格子牆的排序 */
export const KB_CATS = ["trade", "search"];

/** 全部知識條目。反向時間序沒有意義，這裡照分類與加入順序排 */
export const KB_ENTRIES = [
  {
    slug: "lucky-trinket",
    title: "亮晶晶首飾",
    summary: "一次性道具，把一名朋友直接變成亮晶晶好朋友。只能用在給力好朋友以上，而且不會改變交換距離",
    cat: "trade",
    updated: "2026-09-18",
    /*
     * 四條全是官方。**這一則是五則裡出處最齊的**，所以排在最前面做。
     * 2847（友誼等級）是為了那張「哪幾級可以用」的表：4945 只寫
     * 「給力好朋友以上」，要對到六個里程碑才知道被擋掉的是哪兩級。
     */
    sources: [
      {
        label: "Niantic 說明中心：「亮晶晶首飾」是什麼？（FAQ 4945）",
        url: "https://niantic.helpshift.com/hc/zh-hant/6-pokemon-go/faq/4945-what-is-the-lucky-trinket/",
        official: true,
      },
      {
        label: "Niantic 說明中心：亮晶晶好朋友（FAQ 1485）",
        url: "https://niantic.helpshift.com/hc/zh-hant/6-pokemon-go/faq/1485-lucky-friends/",
        official: true,
      },
      {
        label: "Niantic 說明中心：朋友名單 & 友誼等級（FAQ 2847）",
        url: "https://niantic.helpshift.com/hc/zh-hant/6-pokemon-go/faq/2847-friend-list-friendship-levels-1614900279/",
        official: true,
      },
      {
        label: "Niantic 說明中心：亮晶晶寶可夢（FAQ 38）",
        url: "https://niantic.helpshift.com/hc/zh-hant/6-pokemon-go/faq/38-lucky-pokemon/",
        official: true,
      },
    ],
  },
];

export const KB_COUNT = KB_ENTRIES.length;
