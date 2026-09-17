/**
 * make-purified-mark.mjs — 產生淨化符號的圖檔
 *
 * 輸出 `img/purified-mark.png`（進 git）。
 *
 * ── 來源 ──
 * PokeMiners 的 `Images/Rocket/ic_purified.png`，64×64，就是遊戲裡
 * 淨化寶可夢右上角那顆青色星芒。
 *
 * **不要拿旁邊的 `ic_purified_filter.png`**：那張是篩選標籤用的，
 * 官方只在標籤上給符號加圓底。跟極巨化那顆踩過的坑一樣——
 * 圓底版跟交換表的刪除鈕（紅圓白叉）撞臉，而且遊戲裡的寶可夢清單
 * 本來就是無底的符號直接疊在圖上。
 *
 * ── 為什麼要這一步，明明 PokeMiners 有 CORS ──
 * 因為畫面用 CSS mask 上色，需要的是**只有 alpha 的圖**，
 * 而原圖是彩色的（rgb(180, 237, 240) 那種淺青）。
 * 一旦要加工就得存一份本地檔，那就順便定版：
 * 上游哪天換圖，我們的符號不會跟著無聲改變。
 *
 * ── 不膨脹 ──
 * 跟極巨化那顆不同，這顆**線條本來就夠粗**：原圖是實心星芒不是空心輪廓，
 * 縮到畫面上的 20px 之後 alpha>150 的還有 33.5%，
 * 極巨化那顆膨脹完也才 28.5%。再加粗只會把中間的縫糊掉。
 *
 * ── 尺寸 ──
 * 輸出 64×64，跟原圖一樣大，不放大。畫面最大用到 30px，
 * 兩倍解析度是 60px，64 剛好夠，放大只會變糊。
 * （極巨化那顆輸出 96 是因為它原圖 185，縮過來的。）
 *
 * ── 顏色 ──
 * 這張圖只有形狀有意義，顏色由使用端給：畫面用 CSS mask 上色、
 * canvas 用 `source-in`。官方那個淺青太淡，**不能直接拿來用**——
 * 當條件鈕的實心底時白字只有 1.3:1。所以畫面上的兩個值是另外挑的：
 * `--pur` #0f7d8c（實心底，白字 4.85:1）、`--pur-mark` #1aa8bd（疊在圖上）。
 *
 * ── 執行 ──
 *   node tools/make-purified-mark.mjs
 */

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { decode, encode, downscale } from "./png.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** 官方符號。PokeMiners 的 Images/Rocket/ic_purified.png */
const SRC =
  "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Rocket/ic_purified.png";

/** 輸出邊長。原圖就是 64，不放大 */
const OUT = 64;

console.log("make-purified-mark");
process.stdout.write(`  下載 ${SRC.split("/").pop()} … `);
const res = await fetch(SRC, { headers: { "User-Agent": "poke-change/make-purified-mark" } });
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const src = decode(Buffer.from(await res.arrayBuffer()));
console.log(`${src.w}×${src.h}`);

const alpha = new Uint8Array(src.w * src.h);
for (let i = 0; i < alpha.length; i++) alpha[i] = src.data[i * 4 + 3];

const small = src.w === OUT && src.h === OUT ? alpha : downscale(alpha, src.w, src.h, OUT);

/*
 * 輸出成白色 + alpha，跟 max-mark 一樣：顏色由使用端給，
 * 白色最不會在半透明邊緣帶出髒色。
 */
const rgba = Buffer.alloc(OUT * OUT * 4);
for (let i = 0; i < OUT * OUT; i++) {
  rgba[i * 4] = 255;
  rgba[i * 4 + 1] = 255;
  rgba[i * 4 + 2] = 255;
  rgba[i * 4 + 3] = small[i];
}
const png = encode(OUT, OUT, rgba);
await writeFile(join(ROOT, "img", "purified-mark.png"), png);

const solid = small.filter((v) => v > 150).length;
console.log(`\n產生完成 img/purified-mark.png`);
console.log(`  ${OUT}×${OUT}，${(png.length / 1024).toFixed(1)} KB`);
console.log(`  沒有膨脹，實心像素 ${solid} / ${OUT * OUT}（${((solid / (OUT * OUT)) * 100).toFixed(1)}%）`);
