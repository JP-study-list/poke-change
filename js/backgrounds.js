/**
 * backgrounds.js — 活動背卡資料
 *
 * 背卡（Special Background）是在特定活動期間捕捉寶可夢時，
 * 有機率附加在寶可夢資料頁上的背景圖。
 *
 * ── 資料結構 ──
 * EVENTS 是活動清單，每個活動底下有一或多張背卡（cards）。
 * 每張背卡記錄哪些寶可夢可能帶有它（pokemon: 圖鑑 id 陣列）。
 *
 * ── 如何新增一個活動 ──
 * 1. 在 EVENTS 陣列加一筆，id 不要跟既有的重複
 * 2. 背卡圖片放進 img/bg/，檔名對應 card.img
 * 3. pokemon 陣列有兩種寫法：
 *
 *    "p003"                    圖鑑（data.js）裡的傳說，直接用 id
 *    { dex: 131 }              一般寶可夢，用全國圖鑑編號，名稱查 pokedex.js
 *    { dex: 131, note_zh:"布蘭琪風", note_ja:"ブランシェ", note_en:"Blanche" }
 *                              特殊造型，合併成本體但加註說明
 *    { dex: 25, costume: "gotour-2026-calems-hat" }
 *                              裝扮皮卡丘，圖片與名稱查 pikachu.js
 *
 * 造型一律合併成本體（例如帕底亞肯泰羅三種都算「肯泰羅」一格），
 * 需要區分時用 note 註記。
 *
 * ── scope 的意思 ──
 * "global"   全球活動，所有玩家都有機會取得
 * "regional" 地區限定，只有該地區的實體活動才拿得到，非常稀有
 */

export const EVENTS = [
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
        img: "./img/bg/gofest2026-global.jpg",
        zh: "GO Fest 2026",
        ja: "GO Fest 2026",
        en: "GO Fest 2026",
        note_zh: "7/6～7/12 期間五星、原始、超級團戰捕捉的寶可夢有機率帶有",
        note_ja: "7/6〜7/12 の五つ星・原始・メガレイドで捕獲したポケモンに付く可能性",
        note_en: "From five-star, Primal, and Mega Raids between July 6 and 12",
        pokemon: [
          "p000", "p001", "p002", "p004", "p005", "p006", "p007", "p008",
          "p017", "p018", "p019", "p020", "p022", "p026", "p027", "p041",
          "p042", "p047", "p048", "p014", "p015", "p016", "p036", "p037",
          "p040", "p009", "p010", "p011", "p021", "p023", "p024", "p025",
          "p032", "p033", "p034", "p035", "p038", "p039", "p065", "p066",
          "p067", "p068", "p069", "p070", "p071", "p072", "p074", "p075",
          "p076", "p077", "p078", "p043", "p044", "p045", "p046", "p049",
          "p050", "p051", "p052", "p053", "p054", "p055", "p056", "p059",
          "p060", "p012", "p013", "p028", "p073", "p029", "p030", "p031",
          "p061", "p062",
        ],
      },
      {
        id: "gf26-mewtwo",
        scope: "global",
        img: "./img/bg/gofest2026-mewtwo.jpg",
        zh: "超夢限定",
        ja: "ミュウツー限定",
        en: "Mewtwo Special",
        note_zh: "GO Fest 期間從超級究極團戰捕捉的超夢限定",
        note_ja: "GO Fest 期間のスーパーメガレイドのミュウツー限定",
        note_en: "Only from Super Mega Raid Mewtwo during GO Fest",
        pokemon: ["p003"],
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
        img: "./img/bg/gofest2026-tokyo.png",
        zh: "東京",
        ja: "東京",
        en: "Tokyo",
        note_zh: "5/25～6/1 台場，僅限持票者。急凍鳥、水君為當場限定",
        note_ja: "5/25〜6/1 お台場、チケット所持者限定。フリーザーとスイクンが登場",
        note_en: "May 25 – Jun 1, Tokyo Waterfront City. Ticket holders only.",
        pokemon: [
          "p000", "p006", "p003", "p014", "p015",
          { dex: 128, note_zh: "帕底亞的樣子・水", note_ja: "パルデアのすがた・水", note_en: "Paldean Aqua" },
          { dex: 131, note_zh: "布蘭琪風", note_ja: "ブランシェ風", note_en: "Blanche-themed" },
          { dex: 807 },
        ],
      },
      {
        id: "gf26-chicago",
        scope: "regional",
        img: "./img/bg/gofest2026-chicago.png",
        zh: "芝加哥",
        ja: "シカゴ",
        en: "Chicago",
        note_zh: "6/4～6/8 Grant Park，僅限持票者。閃電鳥、雷公為當場限定",
        note_ja: "6/4〜6/8 グラントパーク、チケット所持者限定。サンダーとライコウが登場",
        note_en: "Jun 4 – 8, Grant Park. Ticket holders only.",
        pokemon: [
          "p001", "p004", "p003", "p014", "p015",
          { dex: 128, note_zh: "帕底亞的樣子・火", note_ja: "パルデアのすがた・炎", note_en: "Paldean Blaze" },
          { dex: 239, note_zh: "斯帕克風", note_ja: "スパーク風", note_en: "Spark-themed" },
          { dex: 807 },
        ],
      },
      {
        id: "gf26-copenhagen",
        scope: "regional",
        img: "./img/bg/gofest2026-copenhagen.png",
        zh: "哥本哈根",
        ja: "コペンハーゲン",
        en: "Copenhagen",
        note_zh: "6/11～6/15 Fælledparken，僅限持票者。火焰鳥、炎帝為當場限定",
        note_ja: "6/11〜6/15 フェレズパーケン、チケット所持者限定。ファイヤーとエンテイが登場",
        note_en: "Jun 11 – 15, Fælledparken. Ticket holders only.",
        pokemon: [
          "p002", "p005", "p003", "p014", "p015",
          { dex: 77, note_zh: "坎黛拉風", note_ja: "キャンデラ風", note_en: "Candela-themed" },
          { dex: 128, note_zh: "帕底亞的樣子・鬥", note_ja: "パルデアのすがた・格闘", note_en: "Paldean Combat" },
          { dex: 807 },
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
        img: "./img/bg/gotour2026-mega.webp",
        zh: "GO Tour 2026 Mega",
        ja: "GO Tour 2026 メガ",
        en: "GO Tour 2026 Mega",
        note_zh: "2/28～3/2 期間捕捉可超級進化的寶可夢有機率帶有",
        note_ja: "2/28〜3/2 にメガシンカできるポケモンを捕獲すると付く可能性",
        note_en: "From Mega-capable Pokémon caught between Feb 28 and Mar 2",
        pokemon: [
          { dex: 3 }, { dex: 6 }, { dex: 9 }, { dex: 18 }, { dex: 71 },
          { dex: 115 }, { dex: 149 }, { dex: 212 }, { dex: 214 }, { dex: 248 },
          { dex: 254 }, { dex: 257 }, { dex: 260 }, { dex: 282 }, { dex: 359 },
          { dex: 373 }, { dex: 376 },
          "p012", "p013",
          { dex: 445 }, { dex: 448 }, { dex: 475 }, { dex: 687 },
        ],
      },
      {
        id: "gt26-x",
        scope: "global",
        img: "./img/bg/gotour2026-x.webp",
        zh: "GO Tour 2026 X",
        ja: "GO Tour 2026 X",
        en: "GO Tour 2026 X",
        note_zh: "2/27～3/9 卡洛斯御三家兌換碼與 GO Tour 期間取得",
        note_ja: "2/27〜3/9 カロス御三家コードと GO Tour 期間に入手",
        note_en: "From the Kalos Starters promo code and GO Tour, Feb 27 – Mar 9",
        pokemon: [
          { dex: 25, costume: "gotour-2026-calems-hat", note_zh: "卡爾姆帽", note_ja: "カルムの帽子", note_en: "Calem's Hat" },
          { dex: 25, costume: "gotour-2026-serenas-hat", note_zh: "莎莉娜帽", note_ja: "セレナの帽子", note_en: "Serena's Hat" },
          { dex: 650 }, { dex: 653 }, { dex: 656 }, { dex: 679 },
          "p041",
        ],
      },
      {
        id: "gt26-y",
        scope: "global",
        img: "./img/bg/gotour2026-y.webp",
        zh: "GO Tour 2026 Y",
        ja: "GO Tour 2026 Y",
        en: "GO Tour 2026 Y",
        note_zh: "2/27～3/9 卡洛斯御三家兌換碼與 GO Tour 期間取得",
        note_ja: "2/27〜3/9 カロス御三家コードと GO Tour 期間に入手",
        note_en: "From the Kalos Starters promo code and GO Tour, Feb 27 – Mar 9",
        pokemon: [
          { dex: 25, costume: "gotour-2026-calems-hat", note_zh: "卡爾姆帽", note_ja: "カルムの帽子", note_en: "Calem's Hat" },
          { dex: 25, costume: "gotour-2026-serenas-hat", note_zh: "莎莉娜帽", note_ja: "セレナの帽子", note_en: "Serena's Hat" },
          { dex: 650 }, { dex: 653 }, { dex: 656 }, { dex: 679 },
          "p042",
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
        img: "./img/bg/gotour2026-diamond.webp",
        zh: "GO Tour 2026 鑽石",
        ja: "GO Tour 2026 ダイヤモンド",
        en: "GO Tour 2026 Diamond",
        note_zh: "2/26～2/27 通往卡洛斯之路活動期間取得",
        note_ja: "2/26〜2/27 カロスへの道の期間に入手",
        note_en: "From the Road to Kalos event, Feb 26 – 27",
        pokemon: [
          { dex: 25, costume: "gotour-2024-a", note_zh: "光輝帽", note_ja: "コウキの帽子", note_en: "Lucas's Hat" },
          { dex: 25, costume: "gotour-2024-a-02", note_zh: "小光帽", note_ja: "ヒカリの帽子", note_en: "Dawn's Hat" },
          { dex: 25, costume: "gotour-2024-b", note_zh: "零帽", note_ja: "テルの帽子", note_en: "Rei's Cap" },
          { dex: 25, costume: "gotour-2024-b-02", note_zh: "小明頭巾", note_ja: "ショウのスカーフ", note_en: "Akari's Kerchief" },
          "p020", "p021",
        ],
      },
      {
        id: "gt26-pearl",
        scope: "global",
        img: "./img/bg/gotour2026-pearl.webp",
        zh: "GO Tour 2026 珍珠",
        ja: "GO Tour 2026 パール",
        en: "GO Tour 2026 Pearl",
        note_zh: "2/26～2/27 通往卡洛斯之路活動期間取得",
        note_ja: "2/26〜2/27 カロスへの道の期間に入手",
        note_en: "From the Road to Kalos event, Feb 26 – 27",
        pokemon: [
          { dex: 25, costume: "gotour-2024-a", note_zh: "光輝帽", note_ja: "コウキの帽子", note_en: "Lucas's Hat" },
          { dex: 25, costume: "gotour-2024-a-02", note_zh: "小光帽", note_ja: "ヒカリの帽子", note_en: "Dawn's Hat" },
          { dex: 25, costume: "gotour-2024-b", note_zh: "零帽", note_ja: "テルの帽子", note_en: "Rei's Cap" },
          { dex: 25, costume: "gotour-2024-b-02", note_zh: "小明頭巾", note_ja: "ショウのスカーフ", note_en: "Akari's Kerchief" },
          "p022", "p023",
        ],
      },
      {
        id: "gt26-ruby",
        scope: "global",
        img: "./img/bg/gotour2026-ruby.webp",
        zh: "GO Tour 2026 紅寶石",
        ja: "GO Tour 2026 ルビー",
        en: "GO Tour 2026 Ruby",
        note_zh: "2/25～2/26 通往卡洛斯之路活動期間取得",
        note_ja: "2/25〜2/26 カロスへの道の期間に入手",
        note_en: "From the Road to Kalos event, Feb 25 – 26",
        pokemon: [
          { dex: 25, costume: "gotour-2023-hat", note_zh: "小悠帽", note_ja: "ユウキの帽子", note_en: "Brendan's Hat" },
          { dex: 25, costume: "gotour-2023-bandana", note_zh: "小遙頭巾", note_ja: "ハルカのバンダナ", note_en: "May's Bow" },
          "p015",
        ],
      },
      {
        id: "gt26-sapphire",
        scope: "global",
        img: "./img/bg/gotour2026-sapphire.webp",
        zh: "GO Tour 2026 藍寶石",
        ja: "GO Tour 2026 サファイア",
        en: "GO Tour 2026 Sapphire",
        note_zh: "2/25～2/26 通往卡洛斯之路活動期間取得",
        note_ja: "2/25〜2/26 カロスへの道の期間に入手",
        note_en: "From the Road to Kalos event, Feb 25 – 26",
        pokemon: [
          { dex: 25, costume: "gotour-2023-hat", note_zh: "小悠帽", note_ja: "ユウキの帽子", note_en: "Brendan's Hat" },
          { dex: 25, costume: "gotour-2023-bandana", note_zh: "小遙頭巾", note_ja: "ハルカのバンダナ", note_en: "May's Bow" },
          "p014",
        ],
      },
      {
        id: "gt26-gold",
        scope: "global",
        img: "./img/bg/gotour2026-gold.webp",
        zh: "GO Tour 2026 金",
        ja: "GO Tour 2026 ゴールド",
        en: "GO Tour 2026 Gold",
        note_zh: "2/24～2/25 通往卡洛斯之路活動期間取得",
        note_ja: "2/24〜2/25 カロスへの道の期間に入手",
        note_en: "From the Road to Kalos event, Feb 24 – 25",
        pokemon: [
          { dex: 25, costume: "lyras-hat", note_zh: "琴音帽", note_ja: "コトネの帽子", note_en: "Lyra's Hat" },
          { dex: 25, costume: "ethans-hat", note_zh: "小金帽", note_ja: "ヒビキの帽子", note_en: "Ethan's Hat" },
          "p008",
        ],
      },
      {
        id: "gt26-silver",
        scope: "global",
        img: "./img/bg/gotour2026-silver.webp",
        zh: "GO Tour 2026 銀",
        ja: "GO Tour 2026 シルバー",
        en: "GO Tour 2026 Silver",
        note_zh: "2/24～2/25 通往卡洛斯之路活動期間取得",
        note_ja: "2/24〜2/25 カロスへの道の期間に入手",
        note_en: "From the Road to Kalos event, Feb 24 – 25",
        pokemon: [
          { dex: 25, costume: "lyras-hat", note_zh: "琴音帽", note_ja: "コトネの帽子", note_en: "Lyra's Hat" },
          { dex: 25, costume: "ethans-hat", note_zh: "小金帽", note_ja: "ヒビキの帽子", note_en: "Ethan's Hat" },
          "p007",
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
        img: "./img/bg/gotour2026-la.webp",
        zh: "洛杉磯",
        ja: "ロサンゼルス",
        en: "Los Angeles",
        note_zh: "2/20～2/23 洛杉磯實體活動，僅限持票者",
        note_ja: "2/20〜2/23 ロサンゼルスのリアルイベント、チケット所持者限定",
        note_en: "Feb 20 – 23, Los Angeles in-person event. Ticket holders only.",
        pokemon: [
          { dex: 6 }, { dex: 71 }, { dex: 130 }, { dex: 149 }, { dex: 181 },
          { dex: 254 }, { dex: 282 }, { dex: 334 }, { dex: 359 }, { dex: 373 },
          { dex: 445 }, { dex: 448 }, { dex: 679 }, { dex: 687 },
          "p041", "p042",
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
        img: "./img/bg/gotour2026-tainan.webp",
        zh: "台南",
        ja: "台南",
        en: "Tainan",
        note_zh: "2/20～2/23 台南實體活動，僅限持票者",
        note_ja: "2/20〜2/23 台南のリアルイベント、チケット所持者限定",
        note_en: "Feb 20 – 23, Tainan in-person event. Ticket holders only.",
        pokemon: [
          { dex: 6 }, { dex: 71 }, { dex: 130 }, { dex: 149 }, { dex: 181 },
          { dex: 254 }, { dex: 282 }, { dex: 334 }, { dex: 359 }, { dex: 373 },
          { dex: 445 }, { dex: 448 }, { dex: 679 }, { dex: 687 },
          "p041", "p042",
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
        img: "./img/bg/pokepark2026-kanto.webp",
        zh: "寶可夢樂園",
        ja: "ポケモンパーク",
        en: "Pokémon Park",
        note_zh: "2/5 PokéPark KANTO 開幕，園區內限定",
        note_ja: "2/5 ポケパーク カントー開園、園内限定",
        note_en: "Feb 5, PokéPark KANTO opening. On-site only.",
        pokemon: ["p000", "p001", "p002"],
      },
    ],
  },
];

/** 攤平成 [{event, card}] 方便查詢 */
export function allCards() {
  const out = [];
  for (const ev of EVENTS) for (const card of ev.cards) out.push({ event: ev, card });
  return out;
}

/**
 * 把 pokemon 陣列裡的一筆轉成統一格式。
 * 兩種輸入：字串 id（圖鑑內的傳說）或 { dex, note_* }（一般寶可夢）。
 * @returns {{key: string, pid: string|null, dex: number|null, note: object}}
 */
export function normalizeEntry(entry) {
  if (typeof entry === "string") {
    return { key: entry, pid: entry, dex: null, costume: null, note: null };
  }
  // 裝扮皮卡丘的鍵要帶上裝扮 id，否則同編號的不同裝扮會互相覆蓋
  const key = entry.costume ? `d${entry.dex}-${entry.costume}` : `d${entry.dex}`;
  return {
    key,
    pid: null,
    dex: entry.dex,
    costume: entry.costume || null,
    note: {
      zh: entry.note_zh || "",
      ja: entry.note_ja || "",
      en: entry.note_en || "",
    },
  };
}

/** 某張背卡的所有項目（已正規化） */
export function entriesOf(card) {
  return card.pokemon.map(normalizeEntry);
}

/** 某隻寶可夢可能擁有的所有背卡（只查圖鑑內的傳說） */
export function cardsFor(pokemonId) {
  return allCards().filter(({ card }) =>
    card.pokemon.some((e) => typeof e === "string" && e === pokemonId)
  );
}

/**
 * 某個裝扮皮卡丘可能擁有的所有背卡
 * @returns {Array<{event, card, key}>} key 是該背卡上的項目鍵
 */
export function cardsForCostume(costumeId) {
  const out = [];
  for (const { event, card } of allCards()) {
    for (const e of entriesOf(card)) {
      if (e.costume === costumeId) out.push({ event, card, key: e.key });
    }
  }
  return out;
}

/** 背卡總數（用於統計） */
export function totalCardSlots() {
  return allCards().reduce((n, { card }) => n + card.pokemon.length, 0);
}
