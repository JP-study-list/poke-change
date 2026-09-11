/**
 * bgevents.js — 手工維護的背卡資料
 *
 * 這一份會覆蓋 js/bgdata.js 的骨架，逐欄覆蓋，只有這裡有的欄位才蓋過去。
 * 骨架給的是「有哪些背卡」，這裡給的是「這張背卡是什麼、誰帶得了」。
 *
 * ── 為什麼分開放 ──
 * bgdata.js 是腳本產生的，重跑就整份重寫。手工填的活動名稱、註記與
 * 寶可夢清單放在那裡會被洗掉，所以獨立成這個檔。
 *
 * ── 欄位 ──
 *   id       使用者紀錄的鍵，發布後不可更改
 *   asset    上游圖檔名，用來跟骨架對上同一張卡
 *   series   收納夾，要對得上 js/bgseries.js
 *   local    img/bg/ 底下的備援圖，上游掛掉時用
 *   scope    global 全球 / regional 地區限定
 *
 * ── pokemon 陣列的兩種寫法 ──
 *
 *    "d128.fPALDEA_COMBAT"     直接用條目 id，型態與裝扮寫到底
 *    { id: "d150", note_zh:"…", ... }
 *                              需要補一句說明時才用物件形式
 *
 * 型態與裝扮一律寫到條目層級，跟 bgdata.js 那批一致。
 * 這樣格子會顯示正確的裝扮圖，名稱也直接取自圖鑑，不必自己維護註記。
 */

export const HAND_EVENTS = [
  {
    id: "gofest2026",
    zh: "GO Fest 2026 全球",
    ja: "GO Fest 2026 グローバル",
    en: "GO Fest 2026: Global",
    date: "2026-07-06 ~ 07-12",
    cards: [
      {
        id: "gf26-global",
        scope: "global",
        asset: "sb_GoFest2026_global",
        series: "gofest",
        local: "gofest2026-global.jpg",
        zh: "GO Fest 2026",
        ja: "GO Fest 2026",
        en: "GO Fest 2026",
        note_zh: "7/6～7/12 期間五星、原始、超級團戰捕捉的寶可夢有機率帶有",
        note_ja: "7/6〜7/12 の五つ星・原始・メガレイドで捕獲したポケモンに付く可能性",
        note_en: "From five-star, Primal, and Mega Raids between July 6 and 12",
        pokemon: [
          "d144", "d145", "d146", "d243", "d244", "d245", "d249", "d250",
          "d480", "d481", "d482", "d483", "d484", "d487.fALTERED", "d487.fORIGIN", "d716",
          "d717", "d791", "d792", "d382", "d383", "d384", "d643", "d644",
          "d646.fNORMAL", "d377", "d378", "d379", "d483.fORIGIN", "d484.fORIGIN", "d485", "d486",
          "d641.fINCARNATE", "d641.fTHERIAN", "d642.fINCARNATE", "d642.fTHERIAN", "d645.fINCARNATE", "d645.fTHERIAN", "d894", "d895",
          "d905.fINCARNATE", "d905.fTHERIAN", "d386", "d386.fATTACK", "d386.fDEFENSE", "d386.fSPEED", "d649.fNORMAL", "d649.fBURN",
          "d649.fCHILL", "d649.fDOUSE", "d649.fSHOCK", "d785", "d786", "d787", "d788", "d793",
          "d794", "d795", "d796", "d797", "d798", "d799", "d800", "d805",
          "d806", "d380", "d381", "d488", "d491", "d638", "d639", "d640",
          "d888.fHERO", "d889.fHERO",
        ],
      },
      {
        id: "gf26-mewtwo",
        scope: "global",
        asset: "sb_GoFest2026_mewtwo",
        series: "gofest",
        local: "gofest2026-mewtwo.jpg",
        zh: "超夢限定",
        ja: "ミュウツー限定",
        en: "Mewtwo Special",
        note_zh: "GO Fest 期間從超級究極團戰捕捉的超夢限定",
        note_ja: "GO Fest 期間のスーパーメガレイドのミュウツー限定",
        note_en: "Only from Super Mega Raid Mewtwo during GO Fest",
        pokemon: ["d150"],
      },
    ],
  },

  {
    id: "gofest2026-inperson",
    zh: "GO Fest 2026 實體活動",
    ja: "GO Fest 2026 リアルイベント",
    en: "GO Fest 2026: In-Person",
    date: "2026-05-25 ~ 06-15",
    cards: [
      {
        id: "gf26-tokyo",
        scope: "regional",
        asset: "lc_GoFest2026_tokyo",
        series: "gofest",
        local: "gofest2026-tokyo.png",
        zh: "東京",
        ja: "東京",
        en: "Tokyo",
        note_zh: "5/25～6/1 台場，僅限持票者。急凍鳥、水君為當場限定",
        note_ja: "5/25〜6/1 お台場、チケット所持者限定。フリーザーとスイクンが登場",
        note_en: "May 25 – Jun 1, Tokyo Waterfront City. Ticket holders only.",
        pokemon: [
          "d144", "d245", "d150", "d382", "d383",
          "d128.fPALDEA_AQUA",
          "d131.cSPRING_2023_MYSTIC",
          { id: "d807" },
        ],
      },
      {
        id: "gf26-chicago",
        scope: "regional",
        asset: "lc_GoFest2026_chicago",
        series: "gofest",
        local: "gofest2026-chicago.png",
        zh: "芝加哥",
        ja: "シカゴ",
        en: "Chicago",
        note_zh: "6/4～6/8 Grant Park，僅限持票者。閃電鳥、雷公為當場限定",
        note_ja: "6/4〜6/8 グラントパーク、チケット所持者限定。サンダーとライコウが登場",
        note_en: "Jun 4 – 8, Grant Park. Ticket holders only.",
        pokemon: [
          "d145", "d243", "d150", "d382", "d383",
          "d128.fPALDEA_BLAZE",
          "d239.cSPRING_2023_INSTINCT",
          { id: "d807" },
        ],
      },
      {
        id: "gf26-copenhagen",
        scope: "regional",
        asset: "lc_GoFest2026_copenhagen",
        series: "gofest",
        local: "gofest2026-copenhagen.png",
        zh: "哥本哈根",
        ja: "コペンハーゲン",
        en: "Copenhagen",
        note_zh: "6/11～6/15 Fælledparken，僅限持票者。火焰鳥、炎帝為當場限定",
        note_ja: "6/11〜6/15 フェレズパーケン、チケット所持者限定。ファイヤーとエンテイが登場",
        note_en: "Jun 11 – 15, Fælledparken. Ticket holders only.",
        pokemon: [
          "d146", "d244", "d150", "d382", "d383",
          "d77.cSPRING_2023_VALOR",
          "d128.fPALDEA_COMBAT",
          { id: "d807" },
        ],
      },
    ],
  },

  {
    id: "gotour2026-kalos",
    zh: "GO Tour: 卡洛斯 全球",
    ja: "GO Tour: カロス グローバル",
    en: "GO Tour: Kalos – Global",
    date: "2026-02-28 ~ 03-02",
    cards: [
      {
        id: "gt26-mega",
        scope: "global",
        asset: "sb_GoTour2026_mega",
        series: "gotour",
        local: "gotour2026-mega.webp",
        zh: "GO Tour 2026 Mega",
        ja: "GO Tour 2026 メガ",
        en: "GO Tour 2026 Mega",
        note_zh: "2/28～3/2 期間捕捉可超級進化的寶可夢有機率帶有",
        note_ja: "2/28〜3/2 にメガシンカできるポケモンを捕獲すると付く可能性",
        note_en: "From Mega-capable Pokémon caught between Feb 28 and Mar 2",
        pokemon: [
          { id: "d3" }, { id: "d6" }, { id: "d9" }, { id: "d18" }, { id: "d71" },
          { id: "d115" }, { id: "d149" }, { id: "d212" }, { id: "d214" }, { id: "d248" },
          { id: "d254" }, { id: "d257" }, { id: "d260" }, { id: "d282" }, { id: "d359" },
          { id: "d373" }, { id: "d376" },
          "d380", "d381",
          { id: "d445" }, { id: "d448" }, { id: "d475" }, { id: "d687" },
        ],
      },
      {
        id: "gt26-x",
        scope: "global",
        asset: "sb_GoTour2026_x",
        series: "gotour",
        local: "gotour2026-x.webp",
        zh: "GO Tour 2026 X",
        ja: "GO Tour 2026 X",
        en: "GO Tour 2026 X",
        note_zh: "2/27～3/9 卡洛斯御三家兌換碼與 GO Tour 期間取得",
        note_ja: "2/27〜3/9 カロス御三家コードと GO Tour 期間に入手",
        note_en: "From the Kalos Starters promo code and GO Tour, Feb 27 – Mar 9",
        pokemon: [
          { id: "d25.xGOTOUR_2026_CALEMS_HAT", note_zh: "卡爾姆帽", note_ja: "カルムの帽子", note_en: "Calem's Hat" },
          { id: "d25.xGOTOUR_2026_SERENAS_HAT", note_zh: "莎莉娜帽", note_ja: "セレナの帽子", note_en: "Serena's Hat" },
          { id: "d650" }, { id: "d653" }, { id: "d656" }, { id: "d679" },
          "d716",
        ],
      },
      {
        id: "gt26-y",
        scope: "global",
        asset: "sb_GoTour2026_y",
        series: "gotour",
        local: "gotour2026-y.webp",
        zh: "GO Tour 2026 Y",
        ja: "GO Tour 2026 Y",
        en: "GO Tour 2026 Y",
        note_zh: "2/27～3/9 卡洛斯御三家兌換碼與 GO Tour 期間取得",
        note_ja: "2/27〜3/9 カロス御三家コードと GO Tour 期間に入手",
        note_en: "From the Kalos Starters promo code and GO Tour, Feb 27 – Mar 9",
        pokemon: [
          { id: "d25.xGOTOUR_2026_CALEMS_HAT", note_zh: "卡爾姆帽", note_ja: "カルムの帽子", note_en: "Calem's Hat" },
          { id: "d25.xGOTOUR_2026_SERENAS_HAT", note_zh: "莎莉娜帽", note_ja: "セレナの帽子", note_en: "Serena's Hat" },
          { id: "d650" }, { id: "d653" }, { id: "d656" }, { id: "d679" },
          "d717",
        ],
      },
    ],
  },

  {
    id: "roadtokalos2026",
    zh: "通往卡洛斯之路",
    ja: "カロスへの道",
    en: "Road to Kalos",
    date: "2026-02-24 ~ 02-27",
    cards: [
      {
        id: "gt26-diamond",
        scope: "global",
        asset: "sb_GoTour2026_diamond",
        series: "gotour",
        local: "gotour2026-diamond.webp",
        zh: "GO Tour 2026 鑽石",
        ja: "GO Tour 2026 ダイヤモンド",
        en: "GO Tour 2026 Diamond",
        note_zh: "2/26～2/27 通往卡洛斯之路活動期間取得",
        note_ja: "2/26〜2/27 カロスへの道の期間に入手",
        note_en: "From the Road to Kalos event, Feb 26 – 27",
        pokemon: [
          { id: "d25.fGOTOUR_2024_A", note_zh: "光輝帽", note_ja: "コウキの帽子", note_en: "Lucas's Hat" },
          { id: "d25.fGOTOUR_2024_A_02", note_zh: "小光帽", note_ja: "ヒカリの帽子", note_en: "Dawn's Hat" },
          { id: "d25.fGOTOUR_2024_B", note_zh: "零帽", note_ja: "テルの帽子", note_en: "Rei's Cap" },
          { id: "d25.fGOTOUR_2024_B_02", note_zh: "小明頭巾", note_ja: "ショウのスカーフ", note_en: "Akari's Kerchief" },
          "d483", "d483.fORIGIN",
        ],
      },
      {
        id: "gt26-pearl",
        scope: "global",
        asset: "sb_GoTour2026_pearl",
        series: "gotour",
        local: "gotour2026-pearl.webp",
        zh: "GO Tour 2026 珍珠",
        ja: "GO Tour 2026 パール",
        en: "GO Tour 2026 Pearl",
        note_zh: "2/26～2/27 通往卡洛斯之路活動期間取得",
        note_ja: "2/26〜2/27 カロスへの道の期間に入手",
        note_en: "From the Road to Kalos event, Feb 26 – 27",
        pokemon: [
          { id: "d25.fGOTOUR_2024_A", note_zh: "光輝帽", note_ja: "コウキの帽子", note_en: "Lucas's Hat" },
          { id: "d25.fGOTOUR_2024_A_02", note_zh: "小光帽", note_ja: "ヒカリの帽子", note_en: "Dawn's Hat" },
          { id: "d25.fGOTOUR_2024_B", note_zh: "零帽", note_ja: "テルの帽子", note_en: "Rei's Cap" },
          { id: "d25.fGOTOUR_2024_B_02", note_zh: "小明頭巾", note_ja: "ショウのスカーフ", note_en: "Akari's Kerchief" },
          "d484", "d484.fORIGIN",
        ],
      },
      {
        id: "gt26-ruby",
        scope: "global",
        asset: "sb_GoTour2026_ruby",
        series: "gotour",
        local: "gotour2026-ruby.webp",
        zh: "GO Tour 2026 紅寶石",
        ja: "GO Tour 2026 ルビー",
        en: "GO Tour 2026 Ruby",
        note_zh: "2/25～2/26 通往卡洛斯之路活動期間取得",
        note_ja: "2/25〜2/26 カロスへの道の期間に入手",
        note_en: "From the Road to Kalos event, Feb 25 – 26",
        pokemon: [
          { id: "d25.cGOTOUR_2023_HAT", note_zh: "小悠帽", note_ja: "ユウキの帽子", note_en: "Brendan's Hat" },
          { id: "d25.cGOTOUR_2023_BANDANA", note_zh: "小遙頭巾", note_ja: "ハルカのバンダナ", note_en: "May's Bow" },
          "d383",
        ],
      },
      {
        id: "gt26-sapphire",
        scope: "global",
        asset: "sb_GoTour2026_sapphire",
        series: "gotour",
        local: "gotour2026-sapphire.webp",
        zh: "GO Tour 2026 藍寶石",
        ja: "GO Tour 2026 サファイア",
        en: "GO Tour 2026 Sapphire",
        note_zh: "2/25～2/26 通往卡洛斯之路活動期間取得",
        note_ja: "2/25〜2/26 カロスへの道の期間に入手",
        note_en: "From the Road to Kalos event, Feb 25 – 26",
        pokemon: [
          { id: "d25.cGOTOUR_2023_HAT", note_zh: "小悠帽", note_ja: "ユウキの帽子", note_en: "Brendan's Hat" },
          { id: "d25.cGOTOUR_2023_BANDANA", note_zh: "小遙頭巾", note_ja: "ハルカのバンダナ", note_en: "May's Bow" },
          "d382",
        ],
      },
      {
        id: "gt26-gold",
        scope: "global",
        asset: "sb_GoTour2026_gold",
        series: "gotour",
        local: "gotour2026-gold.webp",
        zh: "GO Tour 2026 金",
        ja: "GO Tour 2026 ゴールド",
        en: "GO Tour 2026 Gold",
        note_zh: "2/24～2/25 通往卡洛斯之路活動期間取得",
        note_ja: "2/24〜2/25 カロスへの道の期間に入手",
        note_en: "From the Road to Kalos event, Feb 24 – 25",
        pokemon: [
          { id: "d25.xLYRAS_HAT", note_zh: "琴音帽", note_ja: "コトネの帽子", note_en: "Lyra's Hat" },
          { id: "d25.xETHANS_HAT", note_zh: "小金帽", note_ja: "ヒビキの帽子", note_en: "Ethan's Hat" },
          "d250",
        ],
      },
      {
        id: "gt26-silver",
        scope: "global",
        asset: "sb_GoTour2026_silver",
        series: "gotour",
        local: "gotour2026-silver.webp",
        zh: "GO Tour 2026 銀",
        ja: "GO Tour 2026 シルバー",
        en: "GO Tour 2026 Silver",
        note_zh: "2/24～2/25 通往卡洛斯之路活動期間取得",
        note_ja: "2/24〜2/25 カロスへの道の期間に入手",
        note_en: "From the Road to Kalos event, Feb 24 – 25",
        pokemon: [
          { id: "d25.xLYRAS_HAT", note_zh: "琴音帽", note_ja: "コトネの帽子", note_en: "Lyra's Hat" },
          { id: "d25.xETHANS_HAT", note_zh: "小金帽", note_ja: "ヒビキの帽子", note_en: "Ethan's Hat" },
          "d249",
        ],
      },
    ],
  },

  {
    id: "gotour2026-la",
    zh: "GO Tour 2026 洛杉磯",
    ja: "GO Tour 2026 ロサンゼルス",
    en: "GO Tour 2026: Los Angeles",
    date: "2026-02-20 ~ 02-23",
    cards: [
      {
        id: "gt26-la",
        scope: "regional",
        asset: "lc_GoTour2026_losAngeles",
        series: "gotour",
        local: "gotour2026-la.webp",
        zh: "洛杉磯",
        ja: "ロサンゼルス",
        en: "Los Angeles",
        note_zh: "2/20～2/23 洛杉磯實體活動，僅限持票者",
        note_ja: "2/20〜2/23 ロサンゼルスのリアルイベント、チケット所持者限定",
        note_en: "Feb 20 – 23, Los Angeles in-person event. Ticket holders only.",
        pokemon: [
          { id: "d6" }, { id: "d71" }, { id: "d130" }, { id: "d149" }, { id: "d181" },
          { id: "d254" }, { id: "d282" }, { id: "d334" }, { id: "d359" }, { id: "d373" },
          { id: "d445" }, { id: "d448" }, { id: "d679" }, { id: "d687" },
          "d716", "d717",
        ],
      },
    ],
  },

  {
    id: "gotour2026-tainan",
    zh: "GO Tour 2026 台南",
    ja: "GO Tour 2026 台南",
    en: "GO Tour 2026: Tainan",
    date: "2026-02-20 ~ 02-23",
    cards: [
      {
        id: "gt26-tainan",
        scope: "regional",
        asset: "lc_GoTour2026_tainan",
        series: "gotour",
        local: "gotour2026-tainan.webp",
        zh: "台南",
        ja: "台南",
        en: "Tainan",
        note_zh: "2/20～2/23 台南實體活動，僅限持票者",
        note_ja: "2/20〜2/23 台南のリアルイベント、チケット所持者限定",
        note_en: "Feb 20 – 23, Tainan in-person event. Ticket holders only.",
        pokemon: [
          { id: "d6" }, { id: "d71" }, { id: "d130" }, { id: "d149" }, { id: "d181" },
          { id: "d254" }, { id: "d282" }, { id: "d334" }, { id: "d359" }, { id: "d373" },
          { id: "d445" }, { id: "d448" }, { id: "d679" }, { id: "d687" },
          "d716", "d717",
        ],
      },
    ],
  },

  {
    id: "pokepark2026",
    zh: "PokéPark KANTO",
    ja: "ポケパーク カントー",
    en: "PokéPark KANTO",
    date: "2026-02-05",
    cards: [
      {
        id: "pp26-kanto",
        scope: "regional",
        asset: "lc_2026_ppk_001",
        series: "lcmisc",
        local: "pokepark2026-kanto.webp",
        zh: "寶可夢樂園",
        ja: "ポケモンパーク",
        en: "Pokémon Park",
        note_zh: "2/5 PokéPark KANTO 開幕，園區內限定",
        note_ja: "2/5 ポケパーク カントー開園、園内限定",
        note_en: "Feb 5, PokéPark KANTO opening. On-site only.",
        pokemon: ["d144", "d145", "d146"],
      },
    ],
  },

  /*
   * 30 週年的亞洲巡迴。這裡只補名稱與日期：Serebii 那邊拼字錯了兩處
   * （Phippines、Octboer），照抄會直接顯示在畫面上。
   *
   * 寶可夢清單留空是因為活動還沒辦，最早的吉隆坡場是 2026-09-12。
   * 官方只說集滿五個章可以換到帶該地背景的 PokéXciting! 皮卡丘，
   * 那個裝扮還沒進 game master，圖鑑收不到，硬填會變成猜。
   * 活動辦完之後重跑 tools/build-bg.mjs，Dittobase 補上就會自己接上。
   */
  {
    id: "pokexciting2026",
    zh: "PokéXciting！亞洲巡迴",
    ja: "PokéXciting！アジアツアー",
    en: "PokéXciting! Asia Tour",
    cards: [
      {
        id: "tpc30th-malaysia",
        scope: "regional",
        asset: "lc_tpc30th_malaysia",
        series: "tpc30th",
        date: "2026-09-12 ~ 09-13",
        zh: "PokéXciting 馬來西亞",
        ja: "PokéXciting マレーシア",
        en: "PokéXciting! Malaysia",
        note_zh: "吉隆坡 KLCC 公園，集滿五個章可換帶背卡的皮卡丘",
        note_ja: "クアラルンプール KLCC 公園、スタンプ 5 個でご当地背景のピカチュウ",
        note_en: "KLCC Park, Kuala Lumpur. Five stamps for a Pikachu with this background.",
      },
      {
        id: "tpc30th-taiwan",
        scope: "regional",
        asset: "lc_tpc30th_taiwan",
        series: "tpc30th",
        date: "2026-10-10 ~ 10-11",
        zh: "PokéXciting 台灣",
        ja: "PokéXciting 台湾",
        en: "PokéXciting! Taiwan",
        note_zh: "台北信義區，集滿五個章可換帶背卡的皮卡丘",
        note_ja: "台北・信義区、スタンプ 5 個でご当地背景のピカチュウ",
        note_en: "Xinyi District, Taipei. Five stamps for a Pikachu with this background.",
      },
      {
        id: "tpc30th-singapore",
        scope: "regional",
        asset: "lc_tpc30th_singapore",
        series: "tpc30th",
        date: "2026-11-07 ~ 11-08",
        zh: "PokéXciting 新加坡",
        ja: "PokéXciting シンガポール",
        en: "PokéXciting! Singapore",
        note_zh: "新加坡全市，集滿五個章可換帶背卡的皮卡丘",
        note_ja: "シンガポール全域、スタンプ 5 個でご当地背景のピカチュウ",
        note_en: "Citywide, Singapore. Five stamps for a Pikachu with this background.",
      },
      {
        id: "tpc30th-philippines",
        scope: "regional",
        asset: "lc_tpc30th_philippines",
        series: "tpc30th",
        date: "2027-01-23 ~ 01-24",
        zh: "PokéXciting 菲律賓",
        ja: "PokéXciting フィリピン",
        en: "PokéXciting! Philippines",
        note_zh: "馬尼拉 SM Mall of Asia 周邊，集滿五個章可換帶背卡的皮卡丘",
        note_ja: "マニラ SM モール・オブ・アジア周辺、スタンプ 5 個でご当地背景のピカチュウ",
        note_en: "Around SM Mall of Asia, Manila. Five stamps for a Pikachu with this background.",
      },
    ],
  },
];
