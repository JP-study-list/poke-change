/**
 * measure-icons.mjs — 量 extra.js 那批圖的主體佔畫布多少
 *
 * ── 為什麼需要這個 ──
 * PokeMiners 的 GO 圖示是緊貼裁切的，主體佔畫布 96~99%。
 * Choggor 與 Dittobase 的圖一律畫在 256×256 的畫布上，主體只佔 37~43%，
 * 四周全是透明留白。畫面用 `object-fit: contain` 依畫布縮放，
 * 所以那批在圖鑑裡看起來只有別人的四成大。
 *
 * 修法是每張各自放大，倍率要用量出來的實際佔比去算，
 * 因為 26 張的留白各不相同，乘同一個數字仍然會差 15 個百分點。
 *
 * ── 用法 ──
 *   node tools/measure-icons.mjs         比對 extra.js 現有的 fill 對不對
 *   node tools/measure-icons.mjs --list  印出可以貼進 extra.js 的數字
 *
 * **這個工具不會自己改檔**。`js/extra.js` 是手寫維護的，
 * 數字量出來之後自己貼進去，免得手寫的註解與排版被蓋掉。
 * Choggor 換圖之後重跑就知道哪幾筆要改。
 */

import { readFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";

const LIST = process.argv.includes("--list");
const ROOT = new URL("../", import.meta.url);

const { PIKA_EXTRA, DB_EXTRA, MISSING_ICON } = await import("../js/extra.js");

const REMOTE_BASE =
  "https://raw.githubusercontent.com/Choggor/Pikachu-costume-tracker/main/sprites/";

/**
 * 量 PNG 的非透明範圍：佔畫布多少，以及中心偏了多少。
 *
 * 只解 8-bit RGBA，這批圖全是這種。遇到別種格式直接報錯，
 * 默默回傳一個看起來合理的數字比較危險。
 */
function measure(buf) {
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
  if (depth !== 8 || color !== 6) {
    throw new Error(`只支援 8-bit RGBA，這張是 depth=${depth} color=${color}`);
  }

  // 逐列還原 PNG 的 filter，拿到原始像素
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[p++];
    const row = raw.subarray(p, p + stride);
    p += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = row[x];
      if (ft === 1) v += a;
      else if (ft === 2) v += b;
      else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 255;
    }
  }

  // alpha 門檻給 8 而不是 0，邊緣的抗鋸齒殘影不算內容
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (out[y * stride + x * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error("整張都是透明的");

  /*
   * contain 是照比較長的那一邊縮放，所以佔比取兩軸的大值。
   * 取平均或取小值的話，細長的圖會被放大到超出格子。
   *
   * 偏移是主體中心離畫布中心多遠，以畫布邊長為單位。
   * 這批圖的主體畫在偏下的位置（約 19%），只放大不平移的話
   * 偏移也會跟著放大，腳會壓到格子底下的名稱。
   */
  return {
    fill: Math.max((x1 - x0 + 1) / w, (y1 - y0 + 1) / h),
    offX: (x0 + x1 + 1) / 2 / w - 0.5,
    offY: (y0 + y1 + 1) / 2 / h - 0.5,
  };
}

async function load(src) {
  if (src.startsWith("http")) {
    const r = await fetch(src);
    if (!r.ok) throw new Error(`${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  }
  return readFile(new URL(src, ROOT));
}

const targets = [
  ...PIKA_EXTRA.map((c) => ({
    where: "PIKA_EXTRA",
    key: c.id,
    src: REMOTE_BASE + c.file,
    have: c,
  })),
  ...DB_EXTRA.map((c) => ({
    where: "DB_EXTRA",
    key: c.code,
    src: "img/extra/" + c.file,
    have: c,
  })),
  /*
   * 這兩筆用的是官方立繪，留白不多（92~95%）但也不是滿版。
   * 一起量是為了規則單純：**有 art 的條目就要有 fill**，
   * 不必記得哪幾筆是例外。
   */
  ...MISSING_ICON.map((c) => ({
    where: "MISSING_ICON",
    key: c.id,
    src: c.art,
    have: c,
  })),
];

const r3 = (n) => Math.round(n * 1000) / 1000;

let bad = 0;
const lines = [];
for (const t of targets) {
  let m;
  try {
    m = measure(await load(t.src));
  } catch (err) {
    console.log(`  ✗ ${t.key}：讀不到或解不開（${err.message}）`);
    bad++;
    continue;
  }
  const got = { fill: r3(m.fill), offX: r3(m.offX), offY: r3(m.offY) };
  lines.push(
    `  ${t.where} ${t.key.padEnd(30)} fill: ${got.fill}, offX: ${got.offX}, offY: ${got.offY}`
  );
  for (const k of ["fill", "offX", "offY"]) {
    const have = t.have[k];
    if (have === undefined) {
      console.log(`  ✗ ${t.key}：extra.js 還沒寫 ${k}，量到 ${got[k]}`);
      bad++;
    } else if (Math.abs(have - got[k]) > 0.01) {
      console.log(`  ✗ ${t.key} 的 ${k}：extra.js 寫 ${have}，量到 ${got[k]}`);
      bad++;
    }
  }
}

if (LIST) console.log(lines.join("\n"));
console.log(
  bad
    ? `\n${bad} 個值對不上，把上面量到的數字貼進 js/extra.js`
    : `\n${targets.length} 筆的 fill 與偏移都跟圖片一致`
);
process.exitCode = bad ? 1 : 0;
