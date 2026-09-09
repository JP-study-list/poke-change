/**
 * share.js — 產生交換清單的分享圖
 *
 * 版面刻意跟畫面上的交換表一致：方格牆，背卡圖疊在寶可夢後方，
 * 狀態用角落的小符號表示。看圖的人不必讀字就知道你要什麼。
 *
 * 兩區上下排列，上面「想要」下面「可以給」。
 * 左右並排會太寬，傳進 LINE 會被縮到看不清楚。
 *
 * ── 為什麼要 crossOrigin ──
 * 圖片來自別的網域，沒設 crossOrigin 的話 canvas 會被標記為「污染」，
 * toBlob 會直接失敗。用到的來源都有給 CORS 標頭，已實測。
 *
 * ── 為什麼畫兩倍再縮 ──
 * 手機螢幕是高密度的，用 1 倍畫出來傳過去會糊。
 */

import { find, speciesName, formName, goUrl, artUrl } from "./dex.js";
import { allCards } from "./backgrounds.js";

const SCALE = 2;
const PAD = 20;
const COLS = 4;
const CELL = 148;
const NAME_H = 34;
const TITLE_H = 60;
const SECT_H = 34;
const FOOT_H = 28;

const LIGHT = {
  bg: "#f5f5f3",
  card: "#ffffff",
  line: "#e2e0da",
  ink: "#22201c",
  dim: "#7d7870",
  gold: "#b8860b",
  want: "#c05621",
  have: "#2f6f4f",
  shiny: "#c94f7c",
  xxl: "#2f6f4f",
  xxs: "#8a5cc4",
};

const DARK = {
  bg: "#16150f",
  card: "#211f18",
  line: "#34312a",
  ink: "#ece9e0",
  dim: "#96908a",
  gold: "#d9a520",
  want: "#e08a52",
  have: "#5fae83",
  shiny: "#e87ba3",
  xxl: "#5fae83",
  xxs: "#b088e8",
};

const FONT = "'Noto Sans TC', 'Hiragino Sans', system-ui, sans-serif";

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
  if (entry.art) {
    return (await loadImage(entry.art)) || (await loadImage(artUrl(entry.dex)));
  }
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

/** 文字太長就截斷加省略號 */
function fit(ctx, text, max) {
  if (ctx.measureText(text).width <= max) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + "…").width > max) s = s.slice(0, -1);
  return s + "…";
}

/** 等比縮放置中。GO 圖示不是正方形，不能直接拉滿 */
function drawContain(ctx, img, x, y, box, ratio) {
  const k = Math.min((box * ratio) / img.width, (box * ratio) / img.height);
  const w = img.width * k;
  const h = img.height * k;
  ctx.drawImage(img, x + (box - w) / 2, y + (box - h) / 2, w, h);
}

/** 填滿整格，用在背卡底圖 */
function drawCover(ctx, img, x, y, box) {
  const k = Math.max(box / img.width, box / img.height);
  const w = img.width * k;
  const h = img.height * k;
  ctx.drawImage(img, x + (box - w) / 2, y + (box - h) / 2, w, h);
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

  /*
   * 查不到條目的紀錄先濾掉，否則標題的數量會跟畫出來的格子對不上。
   * 圖鑑更新拿掉某個 id 之後就會發生。
   * 空的那一區整段不畫，不留下一塊空白。
   */
  const known = (list) => list.filter((it) => find(it.id));
  const sections = [
    { label: t("colWant"), color: C.want, items: known(data.want) },
    { label: t("colHave"), color: C.have, items: known(data.have) },
  ].filter((s) => s.items.length);

  if (!sections.length) return null;

  const sectionH = (s) =>
    SECT_H + Math.ceil(s.items.length / COLS) * (CELL + NAME_H);

  const W = PAD * 2 + COLS * CELL;
  const H = TITLE_H + sections.reduce((n, s) => n + sectionH(s), 0) + FOOT_H + PAD;

  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = C.gold;
  ctx.font = `600 24px ${FONT}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(fit(ctx, title, W - PAD * 2), PAD, TITLE_H / 2 + 4);

  const cardById = Object.create(null);
  for (const { card } of allCards()) cardById[card.id] = card;

  // 先把要用的圖全部載入，避免逐格等待
  const jobs = [];
  for (const s of sections) {
    for (const it of s.items) {
      jobs.push(
        (async () => ({
          it,
          sprite: await loadSprite(find(it.id), it.shiny),
          bgImg:
            it.bg && cardById[it.bg] ? await loadImage(cardById[it.bg].img) : null,
        }))()
      );
    }
  }
  const loaded = new Map();
  for (const r of await Promise.all(jobs)) loaded.set(r.it, r);

  let y = TITLE_H;

  for (const sect of sections) {
    ctx.fillStyle = sect.color;
    ctx.font = `600 15px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`${sect.label}  ${sect.items.length}`, PAD, y + SECT_H / 2);

    ctx.strokeStyle = sect.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD, y + SECT_H - 5);
    ctx.lineTo(W - PAD, y + SECT_H - 5);
    ctx.stroke();

    const top = y + SECT_H;

    sect.items.forEach((it, i) => {
      const e = find(it.id);
      const { sprite, bgImg } = loaded.get(it) || {};

      const cx = PAD + (i % COLS) * CELL;
      const cy = top + Math.floor(i / COLS) * (CELL + NAME_H);
      const box = CELL - 10;
      const bx = cx + 5;

      ctx.save();
      roundRect(ctx, bx, cy, box, box, 12);
      ctx.fillStyle = C.card;
      ctx.fill();
      ctx.clip();

      // 指定了背卡才畫底圖，疊在寶可夢後方
      if (bgImg) {
        ctx.globalAlpha = dark ? 0.42 : 0.5;
        drawCover(ctx, bgImg, bx, cy, box);
        ctx.globalAlpha = 1;
      }
      if (sprite) drawContain(ctx, sprite, bx, cy, box, 0.78);
      ctx.restore();

      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1;
      roundRect(ctx, bx + 0.5, cy + 0.5, box - 1, box - 1, 12);
      ctx.stroke();

      // 狀態符號，跟畫面上的格子一致
      const tags = [];
      if (it.xxl) tags.push(["XXL", C.xxl]);
      if (it.xxs) tags.push(["XXS", C.xxs]);
      if (it.shiny) tags.push(["✦", C.shiny]);

      let tx = bx + 6;
      ctx.font = `600 11px ${FONT}`;
      ctx.textBaseline = "middle";
      for (const [label, color] of tags) {
        const w = ctx.measureText(label).width + 12;
        ctx.fillStyle = color;
        roundRect(ctx, tx, cy + 6, w, 17, 8);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText(label, tx + 6, cy + 15);
        tx += w + 4;
      }

      // 名稱在格子下方，型態或裝扮另起一行小字
      const form = formName(e, lang);
      ctx.textAlign = "center";
      const mid = bx + box / 2;

      ctx.fillStyle = C.ink;
      ctx.font = `500 13px ${FONT}`;
      ctx.fillText(
        fit(ctx, speciesName(e, lang), box),
        mid,
        cy + box + (form ? 11 : 17)
      );

      if (form) {
        ctx.fillStyle = C.dim;
        ctx.font = `11px ${FONT}`;
        ctx.fillText(fit(ctx, form, box), mid, cy + box + 25);
      }
      ctx.textAlign = "left";
    });

    y += sectionH(sect);
  }

  ctx.fillStyle = C.dim;
  ctx.font = `11px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(t("subtitle"), PAD, H - PAD - 2);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
