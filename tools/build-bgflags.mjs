/**
 * build-bgflags.mjs — 產生「這張背卡上，哪幾隻可以是淨化／極巨化／超極巨化」
 *
 * 輸出 `js/bgflags.js`，網站執行時不會抓任何東西。
 *
 * ── 為什麼要這一份 ──
 * 交換條件與背卡有些組合在遊戲裡湊不出來。極巨化只能從 Max Battle 抓到，
 * 所以身上那張卡一定是某場 Max Battle 給的；暗影只能從火箭隊或暗影團戰
 * 抓到，淨化是暗影來的，所以同理。列出湊不出來的組合會誤導使用者。
 *
 * ── 為什麼是逐隻不是整張卡（2026-09-17 改的）──
 * 1.08.03 的第一版把「哪幾張卡是 Max Battle」寫成卡片層級的白名單
 * （`MAX_BATTLE_CARDS`），整張卡放行或整張卡濾掉。後來發現粒度就是錯的：
 * 隊長那三張卡各有一百多筆，其中**只有 6 隻**能極巨化
 * （妙蛙種子、小火龍、傑尼龜、敲音猴、炎兔兒、淚眼蜥）。
 * 整張放行會多出九十幾隻，整張濾掉會少掉那 6 隻——使用者當初回報的
 * 「妙蛙花勾了極巨化還列出隊長卡」兩種做法都答不對，因為能極巨化的是
 * 妙蛙**種子**不是妙蛙花。
 *
 * ── 來源 ──
 * Bulbapedia 的 Background (GO)。它**逐隻**標了角標，圖例寫得很白：
 *   "Pokémon with a [Shadow] icon or a [Dynamax] icon can be obtained with
 *    the corresponding background as a Shadow Pokémon or a Dynamax Pokémon"
 * 超極巨化則是獨立的圖（`3GMax Venusaur`），有那張圖就表示這張卡配得上。
 *
 * **這是唯一有這份資料的來源。** Dittobase 的卡片層級只有 shiny 與 evolve
 * 兩個旗標，game master 完全沒有「背卡與交換條件的關係」這種東西。
 * 所以 CLAUDE.md 原本寫的「Bulbapedia 只比對不進資料」在這一份破例了，
 * 代價寫在下面。
 *
 * ── 代價：沒標記不等於不行 ──
 * Bulbapedia 只收錄 77 張卡，我們有 240 張。**沒收錄的卡一律沒有旗標**，
 * 勾了條件就一張都不剩。這跟白名單「只會長」是同一種代價，但分母大得多。
 * 所以這份資料只用來**過濾畫面上列出什麼**，絕不拿去洗使用者存好的紀錄。
 *
 * 另外它連有收錄的卡也不見得列全：長崎那張我們有 23 筆（來自 Dittobase），
 * Bulbapedia 只列了 4 隻。它列的是「按取得方式分組值得一提的」，不是全部。
 *
 * ── 卡片對照是人工的 ──
 * Bulbapedia 用自己的命名（`Wild_Area` 指的是 2024 福岡那張特殊背景），
 * 跟上游檔名與 Dittobase 都接不起來，只能一張一張指名。指名前**逐張比對
 * 過清單內容**，不是靠名字猜——名稱推論會錯得很難看，這個坑 build-bg.mjs
 * 已經踩過（巴黎兩張的編號是交叉的）。
 *
 * ── 執行 ──
 *   node tools/build-bgflags.mjs          用快取，沒快取才下載
 *   node tools/build-bgflags.mjs --force  忽略快取重新下載
 *
 * 快取在 tools/.cache/bgflags/（不進 git）。
 */

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { allCards, entriesOf } from "../js/backgrounds.js";
import { find } from "../js/dex.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "tools", ".cache", "bgflags");
const FORCE = process.argv.includes("--force");

const BULBA = "https://bulbapedia.bulbagarden.net/wiki/Background_(GO)";

/* ─────────── 快取 ─────────── */

async function cached(name, url) {
  const path = join(CACHE, name);
  if (!FORCE) {
    try {
      await stat(path);
      return await readFile(path, "utf8");
    } catch {
      /* 沒快取就往下走 */
    }
  }
  process.stdout.write(`  下載 ${name} … `);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (poke-change/build-bgflags)" },
  });
  if (!res.ok) throw new Error(`${name} HTTP ${res.status}`);
  const text = await res.text();
  await mkdir(CACHE, { recursive: true });
  await writeFile(path, text);
  console.log(`${(text.length / 1048576).toFixed(1)} MB`);
  return text;
}

/* ─────────── 人工對照 ─────────── */

/**
 * Bulbapedia 的背景名 → 我們的卡 id。
 *
 * **每一筆都逐張比對過清單內容才寫進來**，不是照名字猜：
 *   Fukuoka(5)   = 483O/484O/849A/849L/849GMax  → lc-gowa-fukuoka(4)，差的是超極巨那筆
 *   Wild_Area(7) = 上面再加 382/383            → sb-gowa-fukuoka(6)，同一場的特殊背景
 *   Dark_Skies(88) ↔ go-fest-2025-eternatus(74)，差額全是 GMax 那批獨立圖
 *   Nagasaki(4) 只列了有特殊取得方式的那幾隻，我們有 23 筆（Dittobase 比較全），
 *     那 4 隻都在我們的清單裡，日期也對得上（LC_2025_GOWA_NAGASAKI，11/7–9）
 *   Gold/Silver_Version(3) ↔ gt26-gold/silver(3)，一模一樣
 *   Tales_of_Transformation(33) ↔ 我們 33 筆；2026_Community_Day(35) ↔ 35 筆
 */
const CARD_MANUAL = new Map([
  ["Nagasaki", "nagasaki-2025"],
  ["Valor", "team-leader-red"],
  ["Mystic", "team-leader-blue"],
  ["Instinct", "team-leader-yellow"],
  ["Gold_Version", "gt26-gold"],
  ["Silver_Version", "gt26-silver"],
  ["Tales_of_Transformation", "season20-tales-of-transformation"],
  ["Wild_Area_2025", "gowa-2025-global"],
  ["2026_Community_Day", "community-2026"],
  ["Fukuoka", "lc-gowa-fukuoka"],
  ["Wild_Area", "sb-gowa-fukuoka"],
  ["Dark_Skies", "go-fest-2025-eternatus"],
  /*
   * GO Fest 2025 實體場三張：888/889（蒼響、藏瑪然特，含冠軍型態）逐筆對上，
   * Bulbapedia 各多一隻超極巨化御三家——那是 GOFESTMAX 兌換碼的限時研究給的。
   * Delightful_Days 也是同一路：清單跟我們 22 筆幾乎一模一樣，
   * 它多了那三隻御三家，我們多了拉普拉斯。
   *
   * **那三隻目前補不進旗標**：我們這幾張卡的清單（來自 Dittobase）
   * 根本沒有 812／815／818，而旗標只認卡上真的有的條目。
   * 要補得先把牠們加進 `js/bgevents.js` 的清單，而且**逐隻補不是整張卡**——
   * 那張季節卡上其他寶可夢是野生的。報告會把這幾筆列出來。
   */
  ["Osaka_Go_Fest_2025", "go-fest-2025-osaka"],
  ["Jersey_City", "go-fest-2025-jerseycity"],
  ["Paris", "go-fest-2025-paris"],
  ["Delightful_Days", "season19-delightful-days"],
]);

/**
 * Bulbapedia 圖檔名的型態後綴 → 我們的型態代碼。
 *
 * **一筆一筆指名，不要規則化**：同一個字母在不同物種是不同的意思，
 * `37A` 是阿羅拉六尾、`849A` 是高調顫弦蠑螈。規則化第一次就會錯。
 */
const SUFFIX = new Map([
  ["37A", "ALOLA"],
  ["849A", "AMPED"],
  ["849L", "LOW_KEY"],
]);

/**
 * 超極巨化對到哪一個型態。
 *
 * Bulbapedia 把超極巨化畫成獨立的圖（`849GMax`），不分型態，
 * 而我們的顫弦蠑螈高調與低調**兩型都掛著 gmaxIcon**，光看編號分不出來。
 * 遊戲裡的超極巨化顫弦蠑螈就是高調形態，所以指到 AMPED——
 * 跟 build-max.mjs 的 `FORM_ALIAS` 同一個判斷，兩邊要一致。
 */
const GMAX_MANUAL = new Map([["849", "d849.fAMPED"]]);

/* ─────────── 解析 ─────────── */

/**
 * 每隻寶可夢的起點是牠自己的圖鑑連結（`/wiki/XXX_(Pokémon)#…`），
 * 角標（異色星星、暗影、極巨化）的連結不帶 `#`，所以用它當切點，
 * 每一段就正好是「一隻寶可夢加她自己的角標」。
 *
 * 表格用 rowspan 把一張卡拆成好幾列（每列一種取得方式），
 * 所以背景圖只出現在第一列，往後沿用——這正是 rowspan 的語意。
 *
 * 抓到 0 筆要當錯誤處理，不能安靜地產出一份空旗標。
 */
function parseBulba(html) {
  const SPLIT = /<a href="\/wiki\/[^"]*\(Pok%C3%A9mon\)#[^"]*"/;
  const trs = html.match(/<tr[\s\S]*?<\/tr>/g) || [];
  const cards = new Map();
  let cur = null;
  for (const tr of trs) {
    const bg = tr.match(/File:GO_([A-Za-z0-9_'\-]+?)_background\.(?:png|jpg)/);
    if (bg) cur = bg[1];
    if (!cur) continue;
    if (!cards.has(cur)) cards.set(cur, []);
    for (const td of tr.match(/<td[^>]*>[\s\S]*?<\/td>/g) || []) {
      if (!/\(Pok%C3%A9mon\)#/.test(td)) continue;
      for (const seg of td.split(SPLIT).slice(1)) {
        const mon = seg.match(/\/\d+px-GO(\d{4})([A-Za-z_]*)\.png/);
        if (!mon) continue;
        cards.get(cur).push({
          dex: Number(mon[1]),
          suffix: mon[2] || "",
          name: (seg.match(/title="([^"]+)"/) || [])[1] || "",
          shadow: /<img[^>]*GO_Shadow_icon\.png/.test(seg),
          dyn: /<img[^>]*GO_Dynamax_icon\.png/.test(seg),
        });
      }
    }
  }
  const total = [...cards.values()].reduce((n, v) => n + v.length, 0);
  if (!total) throw new Error("Bulbapedia 一隻都沒解析到，頁面結構可能改了");
  return cards;
}

/* ─────────── 條目對照 ─────────── */

const ourCards = new Map([...allCards()].map(({ card }) => [card.id, card]));

/**
 * 「Bulbapedia 的一格」→ 我們的條目 id。
 *
 * **一律在那張卡自己的清單裡找**，不是在整個圖鑑裡找：
 * 標記講的是「這張卡上的這一隻」，配不到卡上的就是對不起來，
 * 硬找一個全域的同編號條目掛上去等於自己編資料。
 */
function resolve(cardId, mon, kind) {
  const card = ourCards.get(cardId);
  if (!card) return { err: "卡不存在" };
  const ids = entriesOf(card).map((e) => e.id);
  const same = ids.filter((id) => {
    const e = find(id);
    return e && e.dex === mon.dex;
  });
  if (!same.length) return { err: "這張卡的清單裡沒有這個編號" };

  if (kind === "gmax") {
    // 超極巨化不是條目，是掛在本體上的旗標，所以找有 gmaxIcon 的那一筆
    const named = GMAX_MANUAL.get(String(mon.dex));
    if (named) {
      return same.includes(named)
        ? { id: named }
        : { err: `對照表指名 ${named}，但卡上沒有這一筆` };
    }
    const hit = same.filter((id) => find(id)?.gmaxIcon);
    if (!hit.length) return { err: "這張卡上這個編號沒有能超極巨化的條目" };
    if (hit.length > 1) return { err: `有 ${hit.length} 個都能超極巨化，要指名` };
    return { id: hit[0] };
  }

  const code = SUFFIX.get(`${mon.dex}${mon.suffix}`);
  if (code) {
    const hit = same.filter((id) => find(id)?.form === code);
    if (!hit.length) return { err: `對照表說是 ${code}，但卡上沒有這個型態` };
    return { id: hit[0] };
  }
  if (mon.suffix) return { err: `後綴 ${mon.suffix} 不在 SUFFIX 對照表裡` };

  // 沒有後綴：本體優先。本體不在卡上時，唯一的那一筆才算數
  const base = same.find((id) => find(id)?.kind === "base");
  if (base) return { id: base };
  /*
   * **裝扮不收**，即使它是卡上唯一的同編號條目。
   *
   * 隊長那三張卡踩過這個：Bulbapedia 標了尼多力諾可以是暗影，
   * 而我們那張卡的清單（來自 Dittobase）只有「尼多力諾（2020 新年）」。
   * 兩邊在講同一格，但裝扮一律勾不到淨化與極巨化
   * （名單是物種層級的），把旗標掛在裝扮上就是一筆永遠查不到的死資料，
   * 而且會讓下次讀到的人以為裝扮可以勾。寧可列進報告。
   */
  const single = same.length === 1 ? find(same[0]) : null;
  if (single && single.kind !== "costume") return { id: same[0] };
  if (single) return { err: `卡上只有裝扮版（${same[0]}），裝扮勾不到這個條件` };
  return { err: `卡上有 ${same.length} 筆同編號（${same.join("／")}），無法判斷是哪一筆` };
}

/* ─────────── 合成 ─────────── */

console.log("build-bgflags");
const parsed = parseBulba(await cached("bulbapedia-background.html", BULBA));

const flags = new Map(); // cardId -> { purified:Set, max:Set, gmax:Set }
const unmatchedCards = [];
const problems = [];
let marks = 0;

for (const [bgName, mons] of parsed) {
  const cardId = CARD_MANUAL.get(bgName);
  const wanted = mons.filter((m) => m.shadow || m.dyn || /GMax/.test(m.suffix));
  if (!wanted.length) continue;
  if (!cardId) {
    unmatchedCards.push(`${bgName}（${wanted.length} 個標記）`);
    continue;
  }
  for (const m of wanted) {
    const kinds = [];
    if (m.shadow) kinds.push("purified");
    if (m.dyn) kinds.push("max");
    if (/GMax/.test(m.suffix)) kinds.push("gmax");
    for (const kind of kinds) {
      const { id, err } = resolve(cardId, m, kind);
      if (!id) {
        problems.push(`${cardId} / ${m.dex}${m.suffix} ${m.name}（${kind}）：${err}`);
        continue;
      }
      if (!flags.has(cardId)) flags.set(cardId, { purified: new Set(), max: new Set(), gmax: new Set() });
      flags.get(cardId)[kind].add(id);
      marks++;
    }
  }
}

/* ─────────── 輸出 ─────────── */

const today = new Date();
const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
  today.getDate()
).padStart(2, "0")}`;

const byDex = (a, b) => {
  const na = Number(a.slice(1).split(".")[0]);
  const nb = Number(b.slice(1).split(".")[0]);
  return na - nb || a.localeCompare(b);
};

const cardIds = [...flags.keys()].sort();
const body = cardIds
  .map((cid) => {
    const f = flags.get(cid);
    const part = (k) =>
      f[k].size ? `    ${k}: [${[...f[k]].sort(byDex).map((x) => `"${x}"`).join(", ")}],` : null;
    return [`  "${cid}": {`, part("purified"), part("max"), part("gmax"), "  },"]
      .filter(Boolean)
      .join("\n");
  })
  .join("\n");

await writeFile(
  join(ROOT, "js", "bgflags.js"),
  `/**
 * bgflags.js — 背卡與交換條件的對應（自動產生，不要手改）
 *
 * 由 tools/build-bgflags.mjs 產生，下次重跑會整份蓋掉。
 * 來源是 Bulbapedia 的 Background (GO) 逐隻角標，報告在
 * tools/bgflags-report.md。
 *
 * 「這張卡的這一隻可以是淨化／極巨化／超極巨化」。有些組合在遊戲裡
 * 湊不出來：極巨化只能從 Max Battle 抓到，淨化只能從火箭隊或暗影團戰
 * 抓到，那些場合給的背卡就那幾張。
 *
 * **粒度是逐隻，不是整張卡。** 隊長那三張卡各有一百多筆，其中只有
 * 6 隻能極巨化——整張放行或整張濾掉都答不對。
 *
 * **沒列到的一律當作不行。** Bulbapedia 只收錄 77 張卡（我們有 240 張），
 * 沒收錄的卡勾了條件就一張都不剩。這只影響畫面上列出什麼，
 * **絕不拿去洗使用者存好的紀錄**——存進去的 bg 一律留著。
 *
 * 產生時間：${stamp}
 * 卡 ${cardIds.length} 張，標記 ${marks} 個
 */

export const BG_FLAGS = {
${body}
};
`
);

const report = [
  "# bgflags-report.md — 背卡旗標的產生報告",
  "",
  `> 由 \`tools/build-bgflags.mjs\` 產生，${stamp}。`,
  "> 這一份是給人看的，程式只讀 `js/bgflags.js`。",
  "",
  "## 結果",
  "",
  `- Bulbapedia 解析到背景 **${parsed.size}** 張、寶可夢格 **${[...parsed.values()].reduce(
    (n, v) => n + v.length,
    0
  )}** 個`,
  `- 帶標記且對到我們的卡：**${cardIds.length}** 張、**${marks}** 個標記`,
  `- 對不上的卡 **${unmatchedCards.length}** 張${
    unmatchedCards.length ? "（補進 `CARD_MANUAL` 前要先逐張比對清單）" : ""
  }`,
  `- 對不上的條目 **${problems.length}** 筆`,
  "",
  unmatchedCards.length ? "### 有標記但對不到卡\n\n```\n" + unmatchedCards.join("\n") + "\n```\n" : "",
  problems.length
    ? "### 對不到條目\n\n多半是資料源的粒度不同：Bulbapedia 標的是一般型態，\n" +
      "而我們這張卡的清單（來自 Dittobase）記的是裝扮版。\n" +
      "裝扮本來就勾不到這些條件，所以這幾筆對結果沒有影響。\n\n```\n" +
      problems.join("\n") +
      "\n```\n"
    : "",
  "## 名單",
  "",
  ...cardIds.map((cid) => {
    const f = flags.get(cid);
    const line = (k, label) =>
      f[k].size ? `- ${label}：\`${[...f[k]].sort(byDex).join("`, `")}\`` : null;
    return [`### ${cid}`, "", line("purified", "淨化"), line("max", "極巨化"), line("gmax", "超極巨化"), ""]
      .filter((x) => x !== null)
      .join("\n");
  }),
].join("\n");

await writeFile(join(ROOT, "tools", "bgflags-report.md"), report);

console.log("\n產生完成 js/bgflags.js");
console.log(`  Bulbapedia 背景       ${parsed.size} 張`);
console.log(`  對到我們的卡          ${cardIds.length} 張`);
console.log(`  標記                  ${marks} 個`);
console.log(`  對不到卡              ${unmatchedCards.length}${unmatchedCards.length ? "（" + unmatchedCards.join("、") + "）" : ""}`);
console.log(`  對不到條目            ${problems.length}`);
console.log("\n報告 tools/bgflags-report.md");
