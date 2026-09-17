/**
 * gostring.js — 把交換清單變成 GO 遊戲內的搜尋字串
 *
 * 用途是把「想要」那一欄傳給對方，對方貼進自己的寶可夢搜尋框，
 * 一眼看出手上有沒有。搜尋只能搜自己的箱子，所以這串字對**收到的人**
 * 才有用，我們這邊產它、複製它，用的人是別人。
 *
 * ── 為什麼一定是一行 ──
 * GO 的搜尋框是**單行輸入**。多行文字貼進單行欄位會被黏成一串
 * （`4,19 異色&7`）或只吃第一行，兩種都會變成一個搜不到東西的字串，
 * 而且對方看不出哪裡不對——他只會以為自己沒有。所以這裡寧可放掉
 * 條件也不換行，見下面的降級。
 *
 * ── 怎麼把逐隻條件塞進一行 ──
 * GO 沒有括號，而且 `,`（或）綁得比 `&`（且）緊，所以整串字的結構
 * 永遠是「**與的或**」：`A,B&C,D` 讀作 `(A或B) 且 (C或D)`。
 * 而我們要表達的是「**或的與**」：小火龍 或 小拉達 或（異色且傑尼龜）。
 * 兩種形狀靠分配律可以互轉，不需要括號：
 *
 *   4 ∨ 19 ∨ (異色 ∧ 7)  =  (異色 ∨ 4 ∨ 19) ∧ (7 ∨ 4 ∨ 19)
 *                         =  `異色,4,19&7,4,19`
 *
 * 展開的規則是「每一桶選一個東西，取遍所有組合」，而**同一組條件的
 * 那幾隻可以共用一個選項**（整組編號一起選），不必一隻一個——
 * 混著選產生的子句一定被純條件那句吸收掉，列出來只是把字串變長。
 * 10 隻裡 3 隻要異色，最簡形式是 51 字元；一隻一個會變成 93。
 *
 * ── 降級：裝不下就放掉條件，不換行 ──
 * 子句數是各桶選項數的乘積，所以條件種類多的時候仍然會爆。
 * 超過 SEARCH_MAX 就**從隻數最少的那一組開始放掉條件**，那幾隻併回
 * 純編號的部分再算一次，最壞情況是條件全放光、退回純編號。
 * 放寬條件的方向永遠安全：對方搜出來會多幾隻，但一隻都不會漏，
 * 而漏掉才是災難——他不會知道自己漏了。
 *
 * ── 為什麼會塌成一筆 ──
 * 同一隻的不同裝扮、不同型態在字串裡都是同一個編號，搜尋指定不了
 * 是哪一個裝扮。**但條件不會塌**：皮卡丘收了一格普通一格異色，
 * 普通那格會把異色那格吸收掉（`25` 本來就涵蓋異色的 25）。
 *
 * ── 語言 ──
 * 編號三語通用，但關鍵字不是（`異色` 在日文介面搜不到）。這串字是給
 * 對方用的，所以語言要跟**對方的遊戲**走，選擇器在設定面板。
 * 關鍵字的三語對照來自官方說明中心 FAQ 1486，出處與其他未採用的
 * 關鍵字在 `docs/go-search-syntax.md`。
 */

import { find } from "./dex.js";

/**
 * 字串長度的保守上限。
 *
 * 搜尋框確實有上限——社群的清箱工具會自動分段——但 Niantic 沒有
 * 公開數字，這個 200 是**還沒實測的保守值**。實測出真正的數字之後
 * 改這裡就好：能塞進一行的條件組合會自動變多，演算法不必動。
 */
export const SEARCH_MAX = 200;

/**
 * 子句數的硬上限，純粹是效能保險。
 *
 * 子句數 = 各桶選項數的乘積，病態的清單（200 格、每格條件都不一樣）
 * 會算出天文數字。64 個子句早就遠超 SEARCH_MAX 了，展開它只是白燒
 * 使用者的手機，所以超過就直接當作「太長」走降級。
 */
const MAX_CLAUSES = 64;

/**
 * 條件在字串裡的固定順序。
 *
 * 順序寫死是為了**同一份清單永遠產出同一串字**——按兩次複製得到
 * 不一樣的東西會讓人以為程式壞了。順序本身沿用交換表格子的排法。
 */
const COND_ORDER = ["shiny", "xxl", "xxs", "purified", "max", "gmax", "bg"];

/**
 * 六個交換條件的遊戲內關鍵字，三語。
 *
 * 全部出自官方說明中心 FAQ 1486 的三語原文（見 docs/go-search-syntax.md），
 * 沒有一個是照字面推的——推錯的下場是使用者傳出一個搜不到東西的字串。
 *
 * **背卡一律用寬的那個**。`紀念背卡`（locationbackground）只涵蓋
 * `lc_` 地點卡，我們還有 `sb_` 特殊背景，而 `specialbackground` 的
 * 中日文查不到。分兩種寫會多出一整排桶，還可能漏掉對方真的有的那隻；
 * 用寬的只是多列幾隻。這跟圖鑑「寧可少列」的方向相反是刻意的：
 * 圖鑑多列會讓人配出不存在的組合，搜尋少列會讓人以為自己沒有。
 *
 * **`極巨化` 的語意有已知歧義**：它是 `dynamax1-` 的捷徑，找的是
 * 「這隻解鎖了幾個極巨招式」，不完全等於「這隻能極巨化」。
 * 2026-09-17 使用者拍板照放（是官方關鍵字），真值待遊戲內實測。
 *
 * 裝扮的 `特殊`（costume）**刻意不做**：1460 筆裡 303 筆是裝扮，
 * 加進來幾乎每份清單都會多一組桶、把爆炸機率主動拉高，換來的只是
 * 少翻幾隻。等 SEARCH_MAX 實測出真值、確認額度夠了再說。
 */
const KEYWORDS = {
  zh: {
    shiny: "異色",
    xxl: "XXL",
    xxs: "XXS",
    purified: "淨化",
    max: "極巨化",
    gmax: "超極巨化",
    bg: "背卡",
  },
  ja: {
    shiny: "色違い",
    xxl: "XXL",
    xxs: "XXS",
    purified: "らいと",
    max: "だいまっくす",
    gmax: "きょだいまっくす",
    bg: "はいけい",
  },
  en: {
    shiny: "shiny",
    xxl: "xxl",
    xxs: "xxs",
    purified: "purified",
    max: "dynamax",
    gmax: "gigantamax",
    bg: "background",
  },
};

/** 有沒有這個語言的關鍵字。設定面板的選項照這個長 */
export const STR_LANGS = Object.keys(KEYWORDS);

/**
 * 一欄的項目 → 去重、升序的圖鑑編號。
 *
 * 編號一律跟 `dex.js` 要，不從 id 字串拆。id 的形狀雖然是
 * `d150.fA`，但「名稱、圖片、屬性一律以圖鑑為準」這條也涵蓋編號，
 * 自己解析等於多開一個會跟圖鑑講不同話的來源。
 *
 * 查不到條目的紀錄直接跳過，跟格子牆同一個做法：圖鑑更新拿掉某個 id
 * 之後，畫面上畫不出那一格，字串裡也不該冒出一個編號。
 */
export function dexNumbers(items) {
  const seen = new Set();
  for (const it of items || []) {
    const e = it && find(it.id);
    if (e && e.dex) seen.add(e.dex);
  }
  return [...seen].sort((a, b) => a - b);
}

/** 一格勾了哪些條件，照 COND_ORDER 排。背卡只看有沒有，不看是哪一張 */
function cellConds(it) {
  return COND_ORDER.filter((c) => (c === "bg" ? !!it.bg : !!it[c]));
}

/**
 * 一欄的項目 → 沒有條件的編號（base）與各組條件的桶。
 *
 * 同一格的條件集合當桶的 key，所以「異色的傑尼龜」與「異色的皮卡丘」
 * 會進同一桶，共用一個選項。
 */
function bucketize(items) {
  const base = new Set();
  const map = new Map();
  for (const it of items || []) {
    const e = it && find(it.id);
    if (!e || !e.dex) continue;
    const conds = cellConds(it);
    if (!conds.length) {
      base.add(e.dex);
      continue;
    }
    const key = conds.join("|");
    if (!map.has(key)) map.set(key, { conds, nums: new Set() });
    map.get(key).nums.add(e.dex);
  }
  return { base, buckets: [...map.values()] };
}

/**
 * 吸收：純編號已經涵蓋的，條件桶裡就不必再提。
 *
 * 皮卡丘收了一格普通、一格異色時，`25 ∨ (異色 ∧ 25)` 就是 `25`。
 * 不做這一步不會算錯，但字串會白白變長、桶也可能白白多一個。
 */
function absorb(base, buckets) {
  const out = [];
  for (const b of buckets) {
    // 排序不是美觀問題：不排的話同一份清單會依加入順序產出不同的字串
    const nums = [...b.nums].filter((n) => !base.has(n)).sort((x, y) => x - y);
    if (nums.length) out.push({ conds: b.conds, nums });
  }
  // 桶的順序也要穩定：條件少的在前，同樣多的照 COND_ORDER
  return out.sort(
    (a, b) =>
      a.conds.length - b.conds.length ||
      COND_ORDER.indexOf(a.conds[0]) - COND_ORDER.indexOf(b.conds[0]) ||
      a.nums[0] - b.nums[0]
  );
}

/**
 * 組出字串。太長或子句太多回 null，交給呼叫端降級。
 *
 * 每一桶的選項是「它的每個條件各一個」加上「整組編號一個」，
 * 取遍所有組合，每個子句再補上 base 的全部編號。
 */
function build(base, buckets, kw) {
  const nums = [...base].sort((a, b) => a - b).map(String);
  let count = 1;
  for (const b of buckets) count *= b.conds.length + 1;
  if (count > MAX_CLAUSES) return null;

  let clauses = [[]];
  for (const b of buckets) {
    const opts = [...b.conds.map((c) => [kw[c]]), b.nums.map(String)];
    const next = [];
    for (const c of clauses) for (const o of opts) next.push([...c, ...o]);
    clauses = next;
  }
  const str = clauses
    .map((c) => [...new Set([...c, ...nums])].join(","))
    .join("&");
  return str.length > SEARCH_MAX ? null : str;
}

/**
 * 一欄的項目 → 給對方貼進遊戲的搜尋字串。
 *
 * 回傳 `{ str, count, dropped, long }`：
 *   str      要複製的字串，空欄回空字串（呼叫端自己決定要不要畫鈕）
 *   count    涵蓋幾隻（去重後的編號數）
 *   dropped  有幾隻的條件為了塞進一行被放掉了，toast 要交代
 *   long     連純編號都超過 SEARCH_MAX，只能提醒使用者自己看一眼
 *
 * lang 是**對方遊戲的語言**，不是介面語言。認不得就當繁中——
 * 這個站的使用者以繁中為主，而且關鍵字錯了頂多搜不到，不會搜錯。
 */
export function searchString(items, lang) {
  const kw = KEYWORDS[lang] || KEYWORDS.zh;
  const count = dexNumbers(items).length;
  const { base, buckets: raw } = bucketize(items);
  let buckets = absorb(base, raw);
  const dropped = new Set();

  for (;;) {
    const str = build(base, buckets, kw);
    if (str !== null) {
      return { str, count, dropped: dropped.size, long: false };
    }
    if (!buckets.length) break;

    /*
     * 丟隻數最少的那一桶，失去的精度最少。平手時丟條件多的：
     * 它的選項多、乘數大，縮得比較快。
     */
    let worst = 0;
    for (let i = 1; i < buckets.length; i++) {
      const a = buckets[i];
      const b = buckets[worst];
      if (a.nums.length < b.nums.length) worst = i;
      else if (a.nums.length === b.nums.length && a.conds.length > b.conds.length)
        worst = i;
    }
    for (const n of buckets[worst].nums) {
      base.add(n);
      dropped.add(n);
    }
    buckets = absorb(base, buckets.filter((_, i) => i !== worst));
  }

  // 條件全放光了，剩純編號。這一串就是 1.10.00 的行為
  const str = [...base].sort((a, b) => a - b).join(",");
  return { str, count, dropped: dropped.size, long: str.length > SEARCH_MAX };
}
