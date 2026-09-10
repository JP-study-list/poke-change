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
 *   Dittobase          前兩個都沒有的少數幾種，例如 2026 世界賽皮卡丘
 * 所以主線走 godex，這裡只補 godex 缺的那幾種，三邊都不漏。
 *
 * 對照規則是「代碼轉小寫、底線換連字號、去掉 _NOEVOLVE」，
 * 例如 godex 的 `HALLOWEEN_2021_NOEVOLVE` 等於這邊的 `halloween-2021`。
 * 少數命名不同的用 ALIAS 對起來，避免同一個裝扮列兩次。
 *
 * ── 代價 ──
 * 這些圖來自個人專案，沒有異色版本，所以標了異色也是顯示一般圖。
 * 哪天 PokeMiners 補上了，重跑 tools/build-dex.mjs 就會自動接手，
 * 這裡對應的項目可以直接刪掉。
 */

import { GODEX } from "./godex.js";

const REMOTE_BASE =
  "https://raw.githubusercontent.com/Choggor/Pikachu-costume-tracker/main/sprites/";

/** 第三個來源。前兩個都還沒有的裝扮只剩這裡拿得到圖 */
const DB_BASE = "https://assets.dittobase.com/go/pokemon/";

/** 官方立繪，給沒有 GO 圖示的條目用 */
const ART_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/";

/**
 * 有實裝但 PokeMiners 沒有 GO 圖示的寶可夢。
 * 目前只有捷拉奧拉，`pm807.icon.png` 在上游是 404，只能用官方立繪。
 * 哪天上游補上了，重跑 tools/build-dex.mjs 就會自動收錄，這裡可以刪掉。
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
    icon: null,
    art: ART_BASE + "807.png",
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
  { id:"anniversary-2026", file:"25-pikachu-anniversary-2026.png", zh:"威洛博士助手", ja:"ウィロー博士の助手", en:"Professor Willow's Assistant" },
  { id:"baseball-shirt", file:"25-pikachu-baseball-shirt.png", zh:"棒球衫", ja:"ベースボールシャツ", en:"Baseball Shirt" },
  { id:"dapper-blue", file:"25-pikachu-dapper-blue.png", zh:"紳士藍", ja:"ダッパーブルー", en:"Dapper Blue" },
  { id:"dapper-red", file:"25-pikachu-dapper-red.png", zh:"紳士紅", ja:"ダッパーレッド", en:"Dapper Red" },
  { id:"dapper-yellow", file:"25-pikachu-dapper-yellow.png", zh:"紳士黃", ja:"ダッパーイエロー", en:"Dapper Yellow" },
  { id:"ethans-hat", file:"25-pikachu-ethans-hat.png", zh:"小金帽", ja:"ヒビキの帽子", en:"Ethan's Hat" },
  { id:"fossil-2026", file:"25-pikachu-fossil-2026.png", zh:"化石", ja:"かせき", en:"Fossil" },
  { id:"gofest-2022-gracidea-flower", file:"25-pikachu-gofest-2022-gracidea-flower.png", zh:"謝米花", ja:"グラシデアの花", en:"Shaymin Flower" },
  { id:"gofest-2026-cap-blue", file:"25-pikachu-gofest-2026-cap-blue.png", zh:"神秘隊帽", ja:"ミスティックキャップ", en:"Mystic Cap" },
  { id:"gofest-2026-cap-red", file:"25-pikachu-gofest-2026-cap-red.png", zh:"勇氣隊帽", ja:"ヴァーラーキャップ", en:"Valor Cap" },
  { id:"gofest-2026-cap-yellow", file:"25-pikachu-gofest-2026-cap-yellow.png", zh:"直覺隊帽", ja:"インスティンクトキャップ", en:"Instinct Cap" },
  { id:"gotour-2026-calems-hat", file:"25-pikachu-gotour-2026-calems-hat.png", zh:"卡爾姆帽", ja:"カルムの帽子", en:"Calem's Hat" },
  { id:"gotour-2026-serenas-hat", file:"25-pikachu-gotour-2026-serenas-hat.png", zh:"莎莉娜帽", ja:"セレナの帽子", en:"Serena's Hat" },
  { id:"hilbert", file:"25-pikachu-hilbert.png", zh:"小黑帽", ja:"トウヤの帽子", en:"Hilbert's Hat" },
  { id:"hilda", file:"25-pikachu-hilda.png", zh:"小白帽", ja:"トウコの帽子", en:"Hilda's Hat" },
  { id:"indonesia-football", file:"25-pikachu-indonesia-football.png", zh:"印尼足球", ja:"インドネシアサッカー", en:"Indonesia Football" },
  { id:"leafs-hat", file:"25-pikachu-leafs-hat.png", zh:"小綠帽", ja:"グリーンの帽子", en:"Leaf's Hat" },
  { id:"lyras-hat", file:"25-pikachu-lyras-hat.png", zh:"琴音帽", ja:"コトネの帽子", en:"Lyra's Hat" },
  { id:"nate", file:"25-pikachu-nate.png", zh:"小南遮陽帽", ja:"キョウヘイのバイザー", en:"Nate's Visor" },
  { id:"reds-hat", file:"25-pikachu-reds-hat.png", zh:"赤紅帽", ja:"レッドの帽子", en:"Red's Hat" },
  { id:"rosa", file:"25-pikachu-rosa.png", zh:"小芽遮陽帽", ja:"メイのバイザー", en:"Rosa's Visor" },
  { id:"visor-2026", file:"25-pikachu-visor-2026.png", zh:"馬拉松", ja:"マラソン", en:"Marathon" },
];

/**
 * Dittobase 有圖、另外兩個鏡像都還沒有的裝扮。
 *
 * PokeMiners 的即時清單裡沒有任何 2026 的裝扮，Choggor 的世界賽系列
 * 只到 2025，所以這幾種只剩 Dittobase 拿得到圖。
 *
 * 譯名是自己取的。世界賽與曠野地帶照 godex 既有的年份加活動名，
 * 看不出活動的就看圖命名，跟裝扮譯名同一套原則。
 *
 * 物種名稱與屬性不寫死，從 godex 抓本體那筆，避免手打錯字。
 * 哪天上游補上了，重跑 tools/build-dex.mjs 之後這裡對應的項目可以刪掉。
 */
export const DB_EXTRA = [
  { dex: 25, code: "WCS_2026", file: "25-pikachu-wcs-2026.png",
    zh: "2026 世界錦標賽", ja: "2026世界大会", en: "World Championships 2026" },
  { dex: 25, code: "PXP_2026", file: "25-pikachu-pxp-2026.png",
    zh: "玩偶裝", ja: "きぐるみ", en: "Mascot Suit" },
  { dex: 132, code: "CAP", file: "132-ditto-cap.png",
    zh: "白鴨舌帽", ja: "白いキャップ", en: "White Cap" },
  { dex: 132, code: "HAT", file: "132-ditto-hat.png",
    zh: "金色派對帽", ja: "金のパーティーハット", en: "Gold Party Hat" },
  { dex: 760, code: "WILDAREA_2025", file: "760-bewear-wildarea-2025.png",
    zh: "2025 曠野地帶", ja: "2025ワイルドエリア", en: "Wild Area 2025" },
];

/** 從 godex 找本體那筆，用來借物種名稱、屬性與稀有度 */
function speciesOf(dex) {
  return GODEX.find((e) => e.dex === dex && e.kind === "base") || null;
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
        icon: null,
        art: DB_BASE + c.file,
      },
    ];
  });
}

/** 轉成跟 godex 一樣的條目格式，id 用 x 前綴標示來源不同 */
export function pikaExtraEntries() {
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
    icon: null,
    art: REMOTE_BASE + c.file,
  }));
}

/** 全部手動補的條目 */
export function extraEntries() {
  return [...pikaExtraEntries(), ...dbExtraEntries(), ...MISSING_ICON];
}

export const EXTRA_COUNT = PIKA_EXTRA.length + MISSING_ICON.length;
