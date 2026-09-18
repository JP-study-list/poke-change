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
  {
    slug: "guaranteed-lucky",
    title: "必定變亮晶晶",
    summary: "三條路：亮晶晶好朋友、亮晶晶首飾，或交換 2020 年以前捉到的寶可夢。第三條有 45 隻的上限，而且是兩個人一起算",
    cat: "trade",
    updated: "2026-09-18",
    /*
     * **「35 → 45」這條追到官方出處了**，而且繁中版就有原句
     * （CLAUDE.md 原本記著「可能找得到，值得追」）。出處不是 FAQ，
     * 是 pokemongo.com 的活動公告——**說明中心只講機制，數字在公告裡**，
     * 這是找官方數字的第二個地方，下次先想到它。
     *
     * **2018 年最初那則也有繁中版，而且比新的那則講得更死**：
     * 「兩位訓練家過去獲得的亮晶晶寶可夢數量都未滿10隻」。
     * 2026 那則只換了數字，沒有重提也沒有取消這個條件，所以頁面照舊寫雙方。
     *
     * **機率那兩個數字（5%／20%）是使用者拍板要寫的，但前提查下去站不住。**
     * 只有巴哈那一篇給數字；PoGO Alley（2026-08）明講網路上的機率表
     * 幾乎都追溯到 The Silph Road 的取樣，而那個組織 2023 年就結束了，
     * 數字從未被官方證實，之後沒有人重做。所以**不是兩個來源互相印證，
     * 是一份舊資料被抄很多遍**——寫是寫了，但把這個來歷一起寫在頁面上。
     * 收 PoGO Alley 當來源正是為了那段警告，不是為了數字。
     */
    sources: [
      {
        label: "Pokémon GO 官方公告：「新年 2026」活動（上限 35→45、2020 年門檻）",
        url: "https://pokemongo.com/zh-Hant/news/new-years-2026",
        official: true,
      },
      {
        label: "Pokémon GO 官方公告：讓亮晶晶寶可夢為你帶來更多幸運！（2018，首次公布保證機制）",
        url: "https://pokemongo.com/zh-Hant/news/luckypokemon-update",
        official: true,
      },
      {
        label: "Niantic 說明中心：亮晶晶寶可夢（FAQ 38）",
        url: "https://niantic.helpshift.com/hc/zh-hant/6-pokemon-go/faq/38-lucky-pokemon/",
        official: true,
      },
      {
        label: "Niantic 說明中心：亮晶晶好朋友（FAQ 1485）",
        url: "https://niantic.helpshift.com/hc/zh-hant/6-pokemon-go/faq/1485-lucky-friends/",
        official: true,
      },
      {
        label: "巴哈姆特 Pokémon GO 哈啦板：亮晶晶寶可夢交換大全（2026-07-13）",
        url: "https://forum.gamer.com.tw/C.php?bsn=29659&snA=47444",
        official: false,
      },
      {
        label: "PoGO Alley：Lucky Trades 指南（2026-08-10 更新；機率表來歷的警告出自這裡）",
        url: "https://pogoalley.com/guides/lucky-trades",
        official: false,
      },
      {
        label: "Pokémon GO Hub：Guaranteed Lucky Trades 機制（2023-12-12）",
        url: "https://pokemongohub.net/post/news/how-do-guaranteed-lucky-trades-work-in-pokemon-go/",
        official: false,
      },
    ],
  },
  {
    slug: "trade-stardust",
    title: "交換的星星沙子",
    summary: "四種情形乘六個友誼等級，從 100 到 1,000,000。圖鑑已登錄的一般寶可夢固定 100、不吃折扣，其餘照友誼等級打折",
    cat: "trade",
    updated: "2026-09-18",
    /*
     * **這一則的折扣值來自遊戲本體資料，不是社群推算的。**
     * `FRIENDSHIP_LEVEL_0`~`5` 的 `tradingDiscount` 依序是
     * 0、0、0.2、0.92、0.96、0.96；`FRIENDSHIP_LEVEL_0` 的
     * `unlockedTrading` 只有 `REGULAR_IN_POKEDEX`，這就是「朋友」那一排
     * 三欄不可交換的出處。**底價（100／20,000／1,000,000）不在 game master**，
     * 那是 client 端常數，所以完整格子對照 Bulbapedia 的 Trade (GO)。
     * 兩邊乘起來逐格吻合。
     *
     * **1.16.00 的遠距交換那一則寫錯過這張表**（一般交換寫成
     * 100/100/80/8/4），錯因是拿折扣去乘 100 推算。**實際上 100 那一格
     * 不吃折扣，六級都是 100。** Bulbapedia、使用者提供的兩張社群表
     * 與英文社群三邊一致。1.18.00 連同那一則一起修掉。
     * **教訓：推算出來的數字要當成待驗證的假設，不是結論。**
     *
     * Bulbapedia 這裡又破例當資料來源（跟 bgflags 同一個理由）：
     * 官方只給定性描述，game master 又缺底價，沒有別的地方有完整格子。
     */
    sources: [
      {
        label: "Pokémon GO game master：FRIENDSHIP_LEVEL_0~5 的 tradingDiscount 與 unlockedTrading（遊戲本體設定資料，PokeMiners 鏡像）",
        url: "https://github.com/PokeMiners/game_masters",
        official: true,
      },
      {
        label: "Niantic 說明中心：朋友名單 & 友誼等級（FAQ 2847，折扣的定性描述）",
        url: "https://niantic.helpshift.com/hc/zh-hant/6-pokemon-go/faq/2847-friend-list-friendship-levels-1614900279/",
        official: true,
      },
      {
        label: "Niantic 說明中心：交換寶可夢（FAQ 96，哪些算特殊交換）",
        url: "https://niantic.helpshift.com/hc/zh-hant/6-pokemon-go/faq/96-trading-pokemon/",
        official: true,
      },
      {
        label: "Bulbapedia：Trade (GO) — 完整的費用格子（底價不在遊戲資料裡，只能對照這裡）",
        url: "https://bulbapedia.bulbagarden.net/wiki/Trade_(GO)",
        official: false,
      },
      {
        label: "神奇寶貝百科：朋友（Pokémon GO）— 底價與折扣",
        url: "https://wiki.52poke.com/zh-hant/%E6%9C%8B%E5%8F%8B%EF%BC%88Pok%C3%A9mon_GO%EF%BC%89",
        official: false,
      },
    ],
  },
  {
    slug: "search-syntax",
    title: "搜尋術語規則",
    summary: "GO 搜尋欄的運算符怎麼拼，以及本站複製鈕產生的那串字在做什麼。「或」綁得比「且」緊，而 | 是「且」不是「或」",
    cat: "search",
    updated: "2026-09-18",
    /*
     * **`search` 分類的第一則**，前五則都是 `trade`。
     *
     * **底稿在 `docs/go-search-syntax.md`（212 行），但沒有整份搬過來。**
     * 那份是給自己看的完整參考，這一頁只收「讀得懂本站產生的字串」需要的部分：
     * 三個運算符、優先順序、交換用得到的關鍵字、字串拆解、陷阱。
     *
     * **底稿裡標「未確認」的 14 條，這一頁一條都沒列繁中寫法。**
     * 2026-09-18 重抓過官方繁中 FAQ 1486 全文確認：**那 8 條繁中未確認的
     * 官方一條都沒收**，社群那邊也沒有繁中字串。GO 的關鍵字是各語言各自
     * 一套、不是互相翻譯的，照字面推一個出來，讀的人打進去會得到一個
     * 搜不到東西的字串而且看不出哪裡不對。剩下 4 條只缺日文，
     * 而知識頁只做繁中，不影響。
     * 改成用一段文字交代「有這些東西、但繁中沒有可靠來源」。
     *
     * **`|` 是「且」不是「或」是官方寫的**，這一頁把它拉成 note，
     * 因為多數程式語言相反，是最容易搞反的一條。
     * **而「`,` 綁得比 `&` 緊」官方三語都沒寫**，是社群整理的，
     * 但 `js/gostring.js` 的分配律整個靠它，所以頁面上標明並建議自己先試。
     */
    sources: [
      {
        label: "Niantic 說明中心：搜尋和篩選你收藏的寶可夢（FAQ 1486）",
        url: "https://niantic.helpshift.com/hc/zh-hant/6-pokemon-go/faq/1486-searching-filtering-your-pokemon-inventory/",
        official: true,
      },
      {
        label: "leidwesen/SearchPhrases：社群最完整的關鍵字整理（對到版本 0.413.0）",
        url: "https://leidwesen.github.io/SearchPhrases/",
        official: false,
      },
      {
        label: "巴哈姆特 Pokémon GO 哈啦板：搜尋關鍵字整理（繁中，地區只到伽勒爾）",
        url: "https://forum.gamer.com.tw/C.php?bsn=29659&snA=32191",
        official: false,
      },
    ],
  },
];

export const KB_COUNT = KB_ENTRIES.length;
