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
import { inflateSync, deflateSync } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** 官方符號。Bulbapedia 的 File:GO_Dynamax_icon.png */
const SRC = "https://archives.bulbagarden.net/media/upload/6/6e/GO_Dynamax_icon.png";

/** 膨脹半徑，相對原圖 185px。3 讓線條大約粗一倍 */
const DILATE = 3;

/** 輸出邊長。畫面最大用到 30px，兩倍解析度綽綽有餘 */
const OUT = 96;

/* ─────────── PNG ─────────── */

function decode(buf) {
  let pos = 8;
  let w = 0;
  let h = 0;
  let depth = 0;
  let color = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      depth = data[8];
      color = data[9];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  if (depth !== 8 || color !== 6) throw new Error(`只處理 8-bit RGBA，拿到 depth=${depth} color=${color}`);
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++];
    const line = raw.subarray(p, p + stride);
    p += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pp = a + b - c;
        const pa = Math.abs(pp - a);
        const pb = Math.abs(pp - b);
        const pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 255;
    }
  }
  return { w, h, data: out };
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** 寫出 8-bit RGBA PNG，每一列都用 filter 0（None），夠小也夠簡單 */
function encode(w, h, rgba) {
  const stride = w * 4;
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ─────────── 處理 ─────────── */

/** 形態學膨脹：每個點取半徑內最大的 alpha，線條因此變粗 */
function dilate(alpha, w, h, r) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = 0;
      for (let dy = -r; dy <= r && m < 255; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          if (dx * dx + dy * dy > r * r) continue;
          const v = alpha[yy * w + xx];
          if (v > m) m = v;
          if (m === 255) break;
        }
      }
      out[y * w + x] = m;
    }
  }
  return out;
}

/** 平均降採樣。縮小用盒式取樣，比取最近點乾淨得多 */
function downscale(alpha, w, h, size) {
  const out = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    const y0 = Math.floor((y * h) / size);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * h) / size));
    for (let x = 0; x < size; x++) {
      const x0 = Math.floor((x * w) / size);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * w) / size));
      let sum = 0;
      let n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          sum += alpha[yy * w + xx];
          n++;
        }
      }
      out[y * size + x] = Math.round(sum / n);
    }
  }
  return out;
}

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
