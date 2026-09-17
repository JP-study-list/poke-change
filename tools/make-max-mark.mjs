/**
 * make-max-mark.mjs — 產生極巨化符號的圖檔
 *
 * 輸出 `img/max-mark.png`（進 git）。
 *
 * ── 為什麼需要這一步 ──
 * 官方那顆符號是**細線條的空心輪廓**，原圖 185×185、線條約 10px。
 * 直接縮到畫面上的 20px，線條剩不到 1 像素，抗鋸齒一稀釋就糊成
 * 一團淡色（實測 alpha>150 的只剩 10%），看不出是什麼形狀。
 *
 * 所以先把線條加粗（形態學膨脹）再縮到 96×96 存起來。
 * 在資產層做一次，畫面與 canvas 都受益，不必在每個使用點補救。
 *
 * ── 為什麼收進 repo ──
 * 跟 `img/bg/` 與 `img/extra/` 同一個理由：來源沒有 CORS 標頭，
 * 不收進來就畫不進分享圖。一張 96×96，幾 KB。
 *
 * ── 顏色 ──
 * 這張圖只有形狀有意義，顏色由使用端給：畫面用 CSS mask 上色、
 * canvas 用 `source-in`。極巨化粉紅、超極巨化紫，遊戲裡也是只有顏色不同。
 *
 * ── 執行 ──
 *   node tools/make-max-mark.mjs
 */

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** 官方符號。Bulbapedia 的 File:GO_Dynamax_icon.png */
const SRC = "https://archives.bulbagarden.net/media/upload/6/6e/GO_Dynamax_icon.png";

/** 膨脹半徑，相對原圖 185px。3 讓線條大約粗一倍 */
const DILATE = 3;

/** 輸出邊長。畫面最大用到 30px，兩倍解析度綽綽有餘 */
const OUT = 96;

import { decode, encode, dilate, downscale } from "./png.mjs";

console.log("make-max-mark");
process.stdout.write(`  下載 ${SRC.split("/").pop()} … `);
const res = await fetch(SRC, { headers: { "User-Agent": "poke-change/make-max-mark" } });
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const src = decode(Buffer.from(await res.arrayBuffer()));
console.log(`${src.w}×${src.h}`);

const alpha = new Uint8Array(src.w * src.h);
for (let i = 0; i < alpha.length; i++) alpha[i] = src.data[i * 4 + 3];

const thick = dilate(alpha, src.w, src.h, DILATE);
const small = downscale(thick, src.w, src.h, OUT);

/*
 * 輸出成白色 + alpha。顏色由使用端給（CSS mask 或 canvas 的 source-in），
 * 這裡的 RGB 是什麼都無所謂，白色最不會在半透明邊緣帶出髒色。
 */
const rgba = Buffer.alloc(OUT * OUT * 4);
for (let i = 0; i < OUT * OUT; i++) {
  rgba[i * 4] = 255;
  rgba[i * 4 + 1] = 255;
  rgba[i * 4 + 2] = 255;
  rgba[i * 4 + 3] = small[i];
}
const png = encode(OUT, OUT, rgba);
await writeFile(join(ROOT, "img", "max-mark.png"), png);

const solid = small.filter((v) => v > 150).length;
console.log(`\n產生完成 img/max-mark.png`);
console.log(`  ${OUT}×${OUT}，${(png.length / 1024).toFixed(1)} KB`);
console.log(`  膨脹半徑 ${DILATE}，實心像素 ${solid} / ${OUT * OUT}（${((solid / (OUT * OUT)) * 100).toFixed(1)}%）`);
