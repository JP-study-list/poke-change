/**
 * share.js — 產生交換清單的分享圖
 *
 * 左右兩欄，左邊想要、右邊可以給，一張圖就講完整件事。
 * 這是主要的分享方式，所以要能直接丟進 LINE 或 Discord 看得懂。
 *
 * ── 為什麼要 crossOrigin ──
 * 圖片來自別的網域，沒設 crossOrigin 的話 canvas 會被標記為「污染」，
 * toBlob 會直接失敗。用到的來源都有給 CORS 標頭，已實測。
 *
 * ── 為什麼畫兩倍再縮 ──
 * 手機螢幕是高密度的，用 1 倍畫出來傳過去會糊。
 */

import { find, fullName, goUrl, artUrl } from "./dex.js";
import { allCards } from "./backgrounds.js";

const SCALE = 2;
const PAD = 24;
const COL_W = 300;
const GAP = 20;
const ROW_H = 72;
const HEAD_H = 78;
const COL_HEAD_H = 34;
const FOOT_H = 30;

const LIGHT = {
  bg: "#f5f5f3",
  card: "#ffffff",
  line: "#e2e0da",
  ink: "#22201c",
  dim: "#7d7870",
  want: "#c05621",
  have: "#2f6f4f",
  shiny: "#c94f7c",
  xxl: "#2f6f4f",
  xxs: "#8a5cc4",
  bgcard: "#4a7fb5",
};

const DARK = {
  bg: "#16150f",
  card: "#211f18",
  line: "#34312a",
  ink: "#ece9e0",
  dim: "#96908a",
  want: "#e08a52",
  have: "#5fae83",
  shiny: "#e87ba3",
  xxl: "#5fae83",
  xxs: "#b088e8",
  bgcard: "#6fa8dc",
};

/** 載入圖片，失敗回 null 而不是中斷整張圖 */
function loadImage(src) {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** 依條目取圖，順序跟畫面上的備援鏈一致 */
async function loadSprite(entry, shiny) {
  if (!entry) return null;
  if (entry.art) return (await loadImage(entry.art)) || (await loadImage(artUrl(entry.dex)));
  const main = shiny && entry.shinyIcon ? entry.shinyIcon : entry.icon;
  return (
    (await loadImage(goUrl(main))) ||
    (await loadImage(goUrl(entry.icon))) ||
    (await loadImage(artUrl(entry.dex)))
  );
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 畫一顆小標籤，回傳畫完後的 x，方便接著畫下一顆 */
function chip(ctx, text, x, y, color) {
  ctx.font = "500 11px system-ui, sans-serif";
  const w = ctx.measureText(text).width + 12;
  ctx.fillStyle = color;
  roundRect(ctx, x, y, w, 16, 8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 6, y + 8.5);
  return x + w + 4;
}

/** 文字太長就截斷加省略號，避免溢出欄寬 */
function fit(ctx, text, max) {
  if (ctx.measureText(text).width <= max) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + "…").width > max) s = s.slice(0, -1);
  return s + "…";
}

/**
 * 產生分享圖
 * @param {object} data store 的資料
 * @param {object} opts { title, dark, lang, t }
 * @returns {Promise<Blob|null>}
 */
export async function buildShareImage(data, opts) {
  const { title, dark, lang, t } = opts;
  const C = dark ? DARK : LIGHT;

  const cols = [
    { key: "want", label: t("colWant"), color: C.want, items: data.want },
    { key: "have", label: t("colHave"), color: C.have, items: data.have },
  ];

  const rows = Math.max(cols[0].items.length, cols[1].items.length, 1);
  const W = PAD * 2 + COL_W * 2 + GAP;
  const H = HEAD_H + COL_HEAD_H + rows * ROW_H + FOOT_H + PAD;

  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);

  // 底
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  // 標題
  ctx.fillStyle = C.ink;
  ctx.textBaseline = "alphabetic";
  ctx.font = "600 22px system-ui, sans-serif";
  ctx.fillText(fit(ctx, title, W - PAD * 2), PAD, PAD + 22);

  // 背卡名稱查詢表，項目上要標「指定哪張背卡」
  const cardName = {};
  for (const { card } of allCards()) cardName[card.id] = card[lang] || card.en;

  // 先把所有圖抓回來，一次畫完
  const sprites = new Map();
  await Promise.all(
    cols.flatMap((col) =>
      col.items.map(async (it) => {
        const key = `${it.id}|${it.shiny ? 1 : 0}`;
        if (sprites.has(key)) return;
        sprites.set(key, await loadSprite(find(it.id), it.shiny));
      })
    )
  );

  cols.forEach((col, ci) => {
    const x = PAD + ci * (COL_W + GAP);
    let y = HEAD_H;

    // 欄標題
    ctx.fillStyle = col.color;
    ctx.font = "600 15px system-ui, sans-serif";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`${col.label}  ${col.items.length}`, x + 4, y + 18);
    y += COL_HEAD_H;

    // 底板
    ctx.fillStyle = C.card;
    roundRect(ctx, x, y, COL_W, Math.max(rows, 1) * ROW_H, 10);
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.stroke();

    col.items.forEach((it, i) => {
      const ry = y + i * ROW_H;
      const e = find(it.id);
      if (!e) return;

      if (i) {
        ctx.strokeStyle = C.line;
        ctx.beginPath();
        ctx.moveTo(x + 10, ry);
        ctx.lineTo(x + COL_W - 10, ry);
        ctx.stroke();
      }

      // 圖示，一律等比縮放置中，GO 圖示不是正方形
      const img = sprites.get(`${it.id}|${it.shiny ? 1 : 0}`);
      if (img) {
        const box = 48;
        const k = Math.min(box / img.width, box / img.height);
        const w = img.width * k;
        const h = img.height * k;
        ctx.drawImage(
          img,
          x + 8 + (box - w) / 2,
          ry + (ROW_H - box) / 2 + (box - h) / 2,
          w,
          h
        );
      }

      const tx = x + 60;
      const maxW = COL_W - 68;

      /*
       * 一列可能有一到三段：名稱、標籤、備註。
       * 先算出實際高度再整塊垂直置中，否則只有名稱的那幾列
       * 會文字靠上、圖示置中，看起來像沒對齊。
       */
      const chips = [
        it.shiny && [t("markShiny"), C.shiny],
        it.xxl && [t("markXxl"), C.xxl],
        it.xxs && [t("markXxs"), C.xxs],
        it.bg && cardName[it.bg] && [cardName[it.bg], C.bgcard],
      ].filter(Boolean);

      const blockH = 18 + (chips.length ? 22 : 0) + (it.note ? 18 : 0);
      const top = ry + (ROW_H - blockH) / 2;

      ctx.fillStyle = C.ink;
      ctx.font = "500 13px system-ui, sans-serif";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(fit(ctx, fullName(e, lang), maxW), tx, top + 13);

      let cx = tx;
      if (chips.length) {
        for (const [label, color] of chips) cx = chip(ctx, label, cx, top + 20, color);
      }

      if (it.note) {
        ctx.fillStyle = C.dim;
        ctx.font = "12px system-ui, sans-serif";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(fit(ctx, it.note, maxW), tx, top + blockH - 4);
      }
    });
  });

  // 頁尾
  ctx.fillStyle = C.dim;
  ctx.font = "11px system-ui, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(t("subtitle"), PAD, H - PAD + 6);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
