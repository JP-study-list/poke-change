/**
 * png.mjs — 產生符號圖檔用的 PNG 讀寫與影像處理
 *
 * `make-max-mark.mjs` 與 `make-purified-mark.mjs` 共用。
 * 兩支做的事情一樣：抓官方符號 → 取出 alpha → 需要的話加粗 → 縮小存起來，
 * 差別只在來源網址與參數，所以編解碼放這裡一份就好。
 *
 * 只處理 8-bit RGBA，這兩個來源都是。不是通用的 PNG 函式庫。
 */

import { inflateSync, deflateSync } from "node:zlib";

/* ─────────── PNG ─────────── */

export function decode(buf) {
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
export function encode(w, h, rgba) {
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
export function dilate(alpha, w, h, r) {
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
export function downscale(alpha, w, h, size) {
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
