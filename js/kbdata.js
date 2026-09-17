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
      /*
       * 社群來源。個體值下限 12/12/12 與星星沙子減半這兩個數字
       * **官方從來沒有公布過**，但它正是使用者最想知道的事。
       * 巴哈那篇（2026-07-13）與英文社群的 wiki、幾個攻略站講的一致，
       * 三邊獨立對得起來才寫進去，頁面上也標成社群說法。
       */
      {
        label: "巴哈姆特 Pokémon GO 哈啦板：亮晶晶寶可夢交換大全（2026-07-13）",
        url: "https://forum.gamer.com.tw/C.php?bsn=29659&snA=47444",
        official: false,
      },
      {
        label: "Pokémon GO Wiki（Fandom）：Lucky Pokémon",
        url: "https://pokemongo.fandom.com/wiki/Lucky_Pok%C3%A9mon",
        official: false,
      },
    ],
  },
  {
    slug: "lucky-friends",
    title: "亮晶晶好朋友",
    summary: "交換時兩隻都變亮晶晶。要先是正港好朋友，每天只有第一次互動才判定，而且交換完就解除",
    cat: "trade",
    updated: "2026-09-18",
    /*
     * **機率刻意不寫進內容**（2026-09-18 使用者拍板）。官方沒公布過，
     * 社群測出來的從 1% 到 5% 都有，彼此對不起來，連整理得最完整的
     * 英文社群都直說精確機率沒有人找到過。挑一個數字寫等於幫讀者
     * 算一個假的期望值。
     *
     * **社群來源只列讀得到原文的那一個。** 「每天第一次互動才判定」
     * 另外在 Fandom 與 sportskeeda 交叉比對過，說法一致，
     * 但那兩個站擋爬蟲（402／405）拿不到原文——**沒讀過的不列進來源**。
     */
    sources: [
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
        label: "Niantic 說明中心：「亮晶晶首飾」是什麼？（FAQ 4945）",
        url: "https://niantic.helpshift.com/hc/zh-hant/6-pokemon-go/faq/4945-what-is-the-lucky-trinket/",
        official: true,
      },
      {
        label: "Pokémon GO Hub：Lucky Friends 機制整理（2020-11-26 更新）",
        url: "https://pokemongohub.net/post/guide/lucky-friends-feature-overview/",
        official: false,
      },
    ],
  },
  {
    slug: "remote-trade",
    title: "遠距離交換",
    summary: "要「正港好朋友＋」才解鎖，每天 1 次、每階段 48 小時。過去 30 天內捉到的寶可夢不能用，但它不計入特殊交換次數",
    cat: "trade",
    updated: "2026-09-18",
    /*
     * **三條官方把整個機制講完了**，這一則是五則裡出處最硬的。
     * 5312 是主幹（流程、48 小時、每天 1 次、九種不能換的）；
     * 2847 補兩件 5312 沒寫的：「同時只能擁有 1 次機會」是它的原句，
     * 而「正港好朋友＋」的沙子折扣寫成「『正港好朋友』固定獎勵」——
     * 升到第六級不會更便宜，這是讀者會誤會的地方。
     *
     * **FAQ 96 收了兩個語言，這是刻意的。** 英文版與繁中版內容不一樣：
     * 等級門檻英文寫 10 級、繁中寫 12 級（繁中是還沒更新的舊翻譯），
     * 而且英文版的特殊交換清單多一行 Location Cards（背卡）。
     * 只列繁中的話，頁面上寫 10 級會變成沒有出處。
     *
     * 社群兩條只為了那張沙子費用表與 100 公尺，兩邊獨立對得起來才寫。
     * **官方的定性描述（略為／適中／更加減少）正好裁定了等級對應**：
     * 第一次出現折扣是「給力好朋友」，Pokemon Hubs 把等級標錯一格，
     * 52poke 的對應才對得上官方。
     */
    sources: [
      {
        label: "Niantic 說明中心：遠距交換（FAQ 5312）",
        url: "https://niantic.helpshift.com/hc/zh-hant/6-pokemon-go/faq/5312-trading-remotely/",
        official: true,
      },
      {
        label: "Niantic 說明中心：朋友名單 & 友誼等級（FAQ 2847）",
        url: "https://niantic.helpshift.com/hc/zh-hant/6-pokemon-go/faq/2847-friend-list-friendship-levels-1614900279/",
        official: true,
      },
      {
        label: "Niantic 說明中心：交換寶可夢（FAQ 96）",
        url: "https://niantic.helpshift.com/hc/zh-hant/6-pokemon-go/faq/96-trading-pokemon/",
        official: true,
      },
      {
        label: "Niantic 說明中心：交換寶可夢（FAQ 96，英文版；等級門檻 10 級只有這一版寫）",
        url: "https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/96-trading-pokemon/",
        official: true,
      },
      {
        label: "神奇寶貝百科：朋友（Pokémon GO）— 交換費用與折扣表",
        url: "https://wiki.52poke.com/zh-hant/%E6%9C%8B%E5%8F%8B%EF%BC%88Pok%C3%A9mon_GO%EF%BC%89",
        official: false,
      },
      {
        label: "Pokemon Hubs：寶可夢交換—機制／交易成本／特別交易",
        url: "https://pokemonhubs.com/pokemongo/2355/",
        official: false,
      },
    ],
  },
];

export const KB_COUNT = KB_ENTRIES.length;
