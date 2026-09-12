/**
 * extra.js — godex 沒收錄的條目（手動維護）
 *
 * godex 的條目來自 PokeMiners 圖檔清單，上游沒有的就不會出現。
 * 這裡補上那些確實存在於遊戲、但上游缺圖的條目。
 *
 * ── 為什麼要有這個檔 ──
 * 皮卡丘裝扮有兩個來源，兩邊都不完整，而且是互補的：
 *   PokeMiners 圖檔   有 2025 年的 GO Fest 與 GO Tour 裝扮，Choggor 沒有
 *   Choggor 追蹤表     有訓練家帽系列與 2026 年活動，PokeMiners 還沒放
 *   img/extra/         前兩個都沒有的少數幾種，例如 2026 世界賽皮卡丘
 * 所以主線走 godex，這裡只補 godex 缺的那幾種，三邊都不漏。
 *
 * 對照規則是「代碼轉小寫、底線換連字號、去掉 _NOEVOLVE」，
 * 例如 godex 的 `HALLOWEEN_2021_NOEVOLVE` 等於這邊的 `halloween-2021`。
 * 少數命名不同的用 ALIAS 對起來，避免同一個裝扮列兩次。
 *
 * ── fill / offX / offY 是什麼 ──
 * 主體佔畫布的比例，以及主體中心離畫布中心多遠，
 * 都是 `tools/measure-icons.mjs` 量出來的。
 * PokeMiners 的圖是緊貼裁切的（佔 96~99%），這裡兩個來源都畫在
 * 256×256 的畫布上、四周全是透明留白（佔 37~43%），
 * 畫面用 `object-fit: contain` 依畫布縮放，不補這個值就只有別人的四成大。
 * **每一張的留白都不一樣**，所以逐張記，不要乘同一個數字。
 * 偏移也要記：主體不在畫布正中央（偏下約 19%），只放大不平移的話
 * 偏移會跟著放大，腳會壓到格子底下的名稱。
 * 換圖之後重跑 `node tools/measure-icons.mjs` 就知道哪幾筆要改。
 *
 * ── 代價 ──
 * 這些圖來自個人專案，沒有異色版本，所以標了異色也是顯示一般圖。
 * 哪天 PokeMiners 補上了，重跑 tools/build-dex.mjs 就會自動接手，
 * 這裡對應的項目可以直接刪掉。
 */

import { GODEX } from "./godex.js";

const REMOTE_BASE =
  "https://raw.githubusercontent.com/Choggor/Pikachu-costume-tracker/main/sprites/";

/**
 * 第三批裝扮的圖，收在 repo 裡。
 *
 * ── 為什麼這幾張要鏡像 ──
 * 圖片一律不進 repo 是原則，但這幾張的來源沒有給 CORS 標頭，
 * 分享圖是 canvas 畫的，載不到就會退回官方立繪，等於看不出穿了什麼。
 * 五張合計 116 KB，比多一個相依划算。
 */
const LOCAL_EXTRA = "./img/extra/";

/** 官方立繪，給沒有 GO 圖示的條目用 */
const ART_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/";

/**
 * 有實裝但 PokeMiners 沒有 GO 圖示的寶可夢。
 * `pm807.icon.png` 與 `pm973.icon.png` 在上游都是 404，只能用官方立繪。
 * 哪天上游補上了，重跑 tools/build-dex.mjs 就會自動收錄，這裡可以刪掉。
 *
 * 纏紅鶴是背卡帶出來的：嘉年華那兩張背卡的清單只有牠一隻，
 * 圖鑑沒收就等於那兩張是空的。上游連異色圖都沒有，所以不標異色。
 */
export const MISSING_ICON = [
  {
    id: "d807",
    dex: 807,
    zh: "捷拉奧拉",
    ja: "ゼラオラ",
    en: "Zeraora",
    kind: "base",
    types: ["electric"],
    cls: "mythic",
    // IV100 的 CP。這兩筆沒有本體可抄，數字是照 build-dex 那條公式算的
    cp20: 1953,
    cp25: 2442,
    cp50: 3865,
    icon: null,
    art: ART_BASE + "807.png",
    fill: 0.945,
    offX: 0.004,
    offY: 0.013,
  },
  {
    id: "d973",
    dex: 973,
    zh: "纏紅鶴",
    ja: "カラミンゴ",
    en: "Flamigo",
    kind: "base",
    types: ["flying", "fighting"],
    cls: "normal",
    cp20: 1575,
    cp25: 1969,
    cp50: 3117,
    icon: null,
    art: ART_BASE + "973.png",
    fill: 0.924,
    offX: -0.001,
    offY: 0,
  },
];

/** Choggor id 與 godex 代碼命名不同、但其實是同一個裝扮 */
export const ALIAS = {
  "monacle-blue": "gofest-2025-monocle-blue",
  "monacle-red": "gofest-2025-monocle-red",
  "monacle-yellow": "gofest-2025-monocle-yellow"
};

/** godex 沒有的裝扮 */
export const PIKA_EXTRA = [
  { id:"anniversary-2026", file:"25-pikachu-anniversary-2026.png", zh:"威洛博士助手", ja:"ウィロー博士の助手", en:"Professor Willow's Assistant", fill:0.395, offX:0.053, offY:0.189 },
  { id:"baseball-shirt", file:"25-pikachu-baseball-shirt.png", zh:"棒球衫", ja:"ベースボールシャツ", en:"Baseball Shirt", fill:0.398, offX:0.066, offY:0.188 },
  { id:"dapper-blue", file:"25-pikachu-dapper-blue.png", zh:"紳士藍", ja:"ダッパーブルー", en:"Dapper Blue", fill:0.414, offX:0.051, offY:0.18 },
  { id:"dapper-red", file:"25-pikachu-dapper-red.png", zh:"紳士紅", ja:"ダッパーレッド", en:"Dapper Red", fill:0.414, offX:0.051, offY:0.18 },
  { id:"dapper-yellow", file:"25-pikachu-dapper-yellow.png", zh:"紳士黃", ja:"ダッパーイエロー", en:"Dapper Yellow", fill:0.414, offX:0.051, offY:0.18 },
  { id:"ethans-hat", file:"25-pikachu-ethans-hat.png", zh:"小金帽", ja:"ヒビキの帽子", en:"Ethan's Hat", fill:0.43, offX:0.086, offY:0.176 },
  { id:"fossil-2026", file:"25-pikachu-fossil-2026.png", zh:"化石", ja:"かせき", en:"Fossil", fill:0.387, offX:0.043, offY:0.189 },
  { id:"gofest-2022-gracidea-flower", file:"25-pikachu-gofest-2022-gracidea-flower.png", zh:"謝米花", ja:"グラシデアの花", en:"Shaymin Flower", fill:0.41, offX:0.072, offY:0.189 },
  { id:"gofest-2026-cap-blue", file:"25-pikachu-gofest-2026-cap-blue.png", zh:"神秘隊帽", ja:"ミスティックキャップ", en:"Mystic Cap", fill:0.418, offX:0.076, offY:0.178 },
  { id:"gofest-2026-cap-red", file:"25-pikachu-gofest-2026-cap-red.png", zh:"勇氣隊帽", ja:"ヴァーラーキャップ", en:"Valor Cap", fill:0.426, offX:0.076, offY:0.174 },
  { id:"gofest-2026-cap-yellow", file:"25-pikachu-gofest-2026-cap-yellow.png", zh:"直覺隊帽", ja:"インスティンクトキャップ", en:"Instinct Cap", fill:0.418, offX:0.076, offY:0.178 },
  { id:"gotour-2026-calems-hat", file:"25-pikachu-gotour-2026-calems-hat.png", zh:"卡爾姆帽", ja:"カルムの帽子", en:"Calem's Hat", fill:0.422, offX:0.074, offY:0.178 },
  { id:"gotour-2026-serenas-hat", file:"25-pikachu-gotour-2026-serenas-hat.png", zh:"莎莉娜帽", ja:"セレナの帽子", en:"Serena's Hat", fill:0.406, offX:0.078, offY:0.184 },
  { id:"hilbert", file:"25-pikachu-hilbert.png", zh:"小黑帽", ja:"トウヤの帽子", en:"Hilbert's Hat", fill:0.402, offX:0.074, offY:0.186 },
  { id:"hilda", file:"25-pikachu-hilda.png", zh:"小白帽", ja:"トウコの帽子", en:"Hilda's Hat", fill:0.402, offX:0.078, offY:0.186 },
  { id:"indonesia-football", file:"25-pikachu-indonesia-football.png", zh:"印尼足球", ja:"インドネシアサッカー", en:"Indonesia Football", fill:0.398, offX:0.064, offY:0.188 },
  { id:"leafs-hat", file:"25-pikachu-leafs-hat.png", zh:"小綠帽", ja:"グリーンの帽子", en:"Leaf's Hat", fill:0.418, offX:0.074, offY:0.197 },
  { id:"lyras-hat", file:"25-pikachu-lyras-hat.png", zh:"琴音帽", ja:"コトネの帽子", en:"Lyra's Hat", fill:0.422, offX:0.08, offY:0.176 },
  { id:"nate", file:"25-pikachu-nate.png", zh:"小南遮陽帽", ja:"キョウヘイのバイザー", en:"Nate's Visor", fill:0.402, offX:0.084, offY:0.186 },
  { id:"reds-hat", file:"25-pikachu-reds-hat.png", zh:"赤紅帽", ja:"レッドの帽子", en:"Red's Hat", fill:0.422, offX:0.08, offY:0.176 },
  { id:"rosa", file:"25-pikachu-rosa.png", zh:"小芽遮陽帽", ja:"メイのバイザー", en:"Rosa's Visor", fill:0.402, offX:0.084, offY:0.186 },
  { id:"visor-2026", file:"25-pikachu-visor-2026.png", zh:"馬拉松", ja:"マラソン", en:"Marathon", fill:0.402, offX:0.074, offY:0.186 },
];

/**
 * 另外兩個鏡像都還沒有的裝扮，圖收在 img/extra/。
 *
 * PokeMiners 的即時清單裡沒有任何 2026 的裝扮，Choggor 的世界賽系列
 * 只到 2025，所以這幾種原本只剩 Dittobase 拿得到圖，抓下來收進 repo。
 *
 * 譯名是自己取的。世界賽與曠野地帶照 godex 既有的年份加活動名，
 * 看不出活動的就看圖命名，跟裝扮譯名同一套原則。
 *
 * 物種名稱與屬性不寫死，從 godex 抓本體那筆，避免手打錯字。
 * 哪天上游補上了，重跑 tools/build-dex.mjs 之後這裡對應的項目可以刪掉。
 */
export const DB_EXTRA = [
  { dex: 25, code: "WCS_2026", file: "25-pikachu-wcs-2026.png",
    zh: "2026 世界錦標賽", ja: "2026世界大会", en: "World Championships 2026", fill: 0.422, offX: 0.066, offY: 0.172 },
  { dex: 25, code: "PXP_2026", file: "25-pikachu-pxp-2026.png",
    zh: "玩偶裝", ja: "きぐるみ", en: "Mascot Suit", fill: 0.426, offX: 0.057, offY: 0.186 },
  { dex: 132, code: "CAP", file: "132-ditto-cap.png",
    zh: "白鴨舌帽", ja: "白いキャップ", en: "White Cap", fill: 0.367, offX: -0.004, offY: 0.207 },
  { dex: 132, code: "HAT", file: "132-ditto-hat.png",
    zh: "金色派對帽", ja: "金のパーティーハット", en: "Gold Party Hat", fill: 0.367, offX: -0.004, offY: 0.215 },
  { dex: 760, code: "WILDAREA_2025", file: "760-bewear-wildarea-2025.png",
    zh: "2025 曠野地帶", ja: "2025ワイルドエリア", en: "Wild Area 2025", fill: 1, offX: 0, offY: 0 },
];

/** 從 godex 找本體那筆，用來借物種名稱、屬性與稀有度 */
function speciesOf(dex) {
  return GODEX.find((e) => e.dex === dex && e.kind === "base") || null;
}

/**
 * 本體的 IV100 CP。裝扮不改數值，所以直接抄，不在這裡自己維護數字。
 * 本體沒有 CP（game master 缺基礎數值）時就什麼都不給，不要補 0。
 */
function cpOf(base) {
  if (!base || !base.cp20) return {};
  return { cp20: base.cp20, cp25: base.cp25, cp50: base.cp50 };
}

/** DB_EXTRA 轉成條目格式。id 一樣用 x 前綴，代表圖片來自外部 */
export function dbExtraEntries() {
  return DB_EXTRA.flatMap((c) => {
    const base = speciesOf(c.dex);
    if (!base) return []; // 本體都不在就別硬湊，圖鑑會查不到名稱
    return [
      {
        id: `d${c.dex}.x${c.code}`,
        dex: c.dex,
        costume: c.code,
        zh: base.zh,
        ja: base.ja,
        en: base.en,
        zhForm: c.zh,
        jaForm: c.ja,
        enForm: c.en,
        kind: "costume",
        types: base.types,
        cls: base.cls,
        // 裝扮不改數值，CP 跟本體一樣
        ...cpOf(base),
        icon: null,
        art: LOCAL_EXTRA + c.file,
        fill: c.fill,
        offX: c.offX,
        offY: c.offY,
      },
    ];
  });
}

/** 轉成跟 godex 一樣的條目格式，id 用 x 前綴標示來源不同 */
export function pikaExtraEntries() {
  const base = speciesOf(25);
  return PIKA_EXTRA.map((c) => ({
    id: `d25.x${c.id.toUpperCase().replace(/-/g, "_")}`,
    dex: 25,
    costume: c.id.toUpperCase().replace(/-/g, "_"),
    zh: "皮卡丘",
    ja: "ピカチュウ",
    en: "Pikachu",
    zhForm: c.zh,
    jaForm: c.ja,
    enForm: c.en,
    kind: "costume",
    types: ["electric"],
    cls: "normal",
    ...cpOf(base),
    icon: null,
    art: REMOTE_BASE + c.file,
    fill: c.fill,
    offX: c.offX,
    offY: c.offY,
  }));
}

/** 全部手動補的條目 */
/* ─────────── 與 godex 去重 ─────────── */

/**
 * 裝扮代碼的比對形式：轉小寫、底線換連字號、去掉 _NOEVOLVE。
 * 「穿了不能進化」是遊戲機制不是外觀，同一個裝扮兩種代碼都指同一件衣服。
 */
const costumeKey = (dex, code) =>
  `${dex}:${String(code).toLowerCase().replace(/_/g, "-").replace(/-noevolve$/, "")}`;

/** godex 已經有的裝扮，以及已經有的條目 id */
function godexHas() {
  const costumes = new Set();
  const ids = new Set();
  for (const e of GODEX) {
    ids.add(e.id);
    const code = e.costume || e.form;
    if (code) costumes.add(costumeKey(e.dex, code));
  }
  return { costumes, ids };
}

/**
 * 全部補充條目，扣掉 godex 已經有的。
 *
 * 上游補上某個裝扮之後，這裡對應的那筆就該讓位，否則圖鑑會出現
 * 兩張一模一樣的卡，而且是兩個不同的 id，使用者會兩個都收。
 * 讓位的是這裡，不是 godex，因為 godex 有異色圖、有官方名稱。
 *
 * 代碼命名不同的先過 ALIAS 再比，例如 Choggor 的 monacle-blue
 * 其實就是 godex 的 GOFEST_2025_MONOCLE_BLUE。
 */
export function extraEntries() {
  const { costumes, ids } = godexHas();
  const keep = (e) => {
    if (ids.has(e.id)) return false;
    const code = ALIAS[String(e.costume).toLowerCase().replace(/_/g, "-")] || e.costume;
    return !(code && costumes.has(costumeKey(e.dex, code)));
  };
  return [...pikaExtraEntries(), ...dbExtraEntries(), ...MISSING_ICON].filter(keep);
}

/** 目前被 godex 蓋掉、可以從這個檔刪掉的補充條目 */
export function supersededEntries() {
  const { costumes, ids } = godexHas();
  return [...pikaExtraEntries(), ...dbExtraEntries(), ...MISSING_ICON].filter((e) => {
    if (ids.has(e.id)) return true;
    const code = ALIAS[String(e.costume).toLowerCase().replace(/_/g, "-")] || e.costume;
    return !!(code && costumes.has(costumeKey(e.dex, code)));
  });
}

export const EXTRA_COUNT = PIKA_EXTRA.length + MISSING_ICON.length;
