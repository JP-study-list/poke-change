/**
 * share.js — 產生交換清單的分享圖
 *
 * 版面刻意跟畫面上的交換表一致：一排五個的方格牆，背卡圖疊在寶可夢後方，
 * 異色是左上角的星星，尺寸在格子下方。看圖的人不必讀字就知道你要什麼。
 *
 * 名稱顯不顯示跟著使用者的偏好走，關掉的話整張圖會明顯變短。
 *
 * 兩區上下排列，上面「想要」下面「可以給」。
 * 左右並排會太寬，傳進 LINE 會被縮到看不清楚。
 *
 * 底部的訓練家代碼是整張圖唯一需要讀字的地方，
 * 對方要照著加好友，所以字級比浮水印大，也給了實色底。
 *
 * ── 為什麼要 crossOrigin ──
 * 圖片來自別的網域，沒設 crossOrigin 的話 canvas 會被標記為「污染」，
 * toBlob 會直接失敗。用到的來源都有給 CORS 標頭，已實測。
 *
 * ── 為什麼畫兩倍再縮 ──
 * 手機螢幕是高密度的，用 1 倍畫出來傳過去會糊。
 */

import { find, speciesName, formName, goUrl, artUrl } from "./dex.js";
import { findCard, bgSources } from "./backgrounds.js";
import { formatCode } from "./store.js";

const SCALE = 2;
const PAD = 20;
const COLS = 5;
const CELL = 120;
const TITLE_H = 60;
const SECT_H = 34;
const SECT_GAP = 12;
const PANEL_PAD = 10;
const FOOT_H = 28;

/*
 * 格子下方那一行的高度。顯示名稱時要放名稱與型態兩行，
 * 關掉名稱時仍留一點空間給 XXL 與 XXS，跟畫面上一致。
 */
const CAP_ON = 34;
const CAP_OFF = 14;

/*
 * 兩套配色跟 css/style.css 的 :root 與 body.dark 對齊。
 * 分享圖與網站看起來要是同一個東西，改了 token 這裡就要一起改。
 *
 * canvas 沒有 CSS 變數，只能抄一份。順序與命名刻意跟那邊一致，
 * 對照的時候兩邊可以逐行比。
 */
const LIGHT = {
  bg: "#f2f2ef",
  card: "#ffffff",
  line: "#dedcd6",
  ink: "#1b1a17",
  dim: "#6f6a62",
  gold: "#8a6508", // 文字用的那一個，不是填色那一個
  want: "#c05621",
  have: "#2f6f4f",
  shiny: "#c94f7c",
  xxl: "#2f6f4f",
  xxs: "#8a5cc4",
};

const DARK = {
  bg: "#101010",
  card: "#191919",
  line: "#2b2b2b",
  ink: "#e9e7e3",
  dim: "#8b867e",
  gold: "#cf9a1a",
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

/** 背卡圖。上游優先，本地備援，跟畫面上的備援鏈同一個順序 */
async function loadBg(cardId) {
  const card = cardId ? findCard(cardId) : null;
  if (!card) return null;
  for (const src of bgSources(card)) {
    const img = await loadImage(src);
    if (img) return img;
  }
  return null;
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
  const { title, dark, lang, t, names = true, code = "" } = opts;
  const C = dark ? DARK : LIGHT;
  const CAP = names ? CAP_ON : CAP_OFF;
  const codeText = formatCode(code);

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

  const rowsOf = (s) => Math.ceil(s.items.length / COLS);
  const gridH = (s) => rowsOf(s) * (CELL + CAP);
  const sectionH = (s) => SECT_H + gridH(s) + PANEL_PAD * 2 + SECT_GAP;

  const W = PAD * 2 + PANEL_PAD * 2 + COLS * CELL;
  const H =
    TITLE_H +
    sections.reduce((n, s) => n + sectionH(s), 0) +
    (codeText ? FOOT_H : 0) +
    FOOT_H +
    PAD;

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

  // 先把要用的圖全部載入，避免逐格等待
  const jobs = [];
  for (const s of sections) {
    for (const it of s.items) {
      jobs.push(
        (async () => ({
          it,
          sprite: await loadSprite(find(it.id), it.shiny),
          bgImg: await loadBg(it.bg),
        }))()
      );
    }
  }
  const loaded = new Map();
  for (const r of await Promise.all(jobs)) loaded.set(r.it, r);

  let y = TITLE_H;

  for (const sect of sections) {
    // 圓點認區塊，跟畫面上的交換表一致
    const dotR = 6;
    ctx.fillStyle = sect.color;
    ctx.beginPath();
    ctx.arc(PAD + dotR, y + SECT_H / 2, dotR, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = `600 16px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(sect.label, PAD + dotR * 2 + 8, y + SECT_H / 2);

    ctx.fillStyle = C.dim;
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(t("itemCount", sect.items.length), W - PAD, y + SECT_H / 2);
    ctx.textAlign = "left";

    // 面板把格子牆框起來
    const panelY = y + SECT_H;
    const panelH = gridH(sect) + PANEL_PAD * 2;
    roundRect(ctx, PAD + 0.5, panelY + 0.5, W - PAD * 2 - 1, panelH - 1, 14);
    ctx.fillStyle = C.bg;
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.stroke();

    const top = panelY + PANEL_PAD;

    sect.items.forEach((it, i) => {
      const e = find(it.id);
      const { sprite, bgImg } = loaded.get(it) || {};

      const cx = PAD + PANEL_PAD + (i % COLS) * CELL;
      const cy = top + Math.floor(i / COLS) * (CELL + CAP);
      const box = CELL - 10;
      const bx = cx + 5;

      /*
       * 格子不畫框，跟畫面上一致。只有指定了背卡的才畫底圖，
       * 那張圖本身就是框，所以只有它需要裁圓角。
       */
      if (bgImg) {
        ctx.save();
        roundRect(ctx, bx, cy, box, box, 12);
        ctx.fillStyle = C.card;
        ctx.fill();
        ctx.clip();
        ctx.globalAlpha = dark ? 0.42 : 0.5;
        drawCover(ctx, bgImg, bx, cy, box);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      if (sprite) drawContain(ctx, sprite, bx, cy, box, 0.78);

      /*
       * 異色是星星疊在左上角，跟畫面上的格子一致。
       * 描邊是因為背卡底圖有亮有暗，只靠顏色會在淺色背卡上看不見。
       */
      if (it.shiny) {
        ctx.font = `600 14px ${FONT}`;
        ctx.textBaseline = "top";
        ctx.textAlign = "left";
        ctx.lineWidth = 3;
        ctx.strokeStyle = C.card;
        ctx.strokeText("✦", bx + 4, cy + 3);
        ctx.fillStyle = C.shiny;
        ctx.fillText("✦", bx + 4, cy + 3);
      }

      const mid = bx + box / 2;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const size = [it.xxl ? "XXL" : "", it.xxs ? "XXS" : ""]
        .filter(Boolean)
        .join(" ");

      if (names) {
        // 名稱在格子下方，型態或裝扮另起一行小字
        const form = formName(e, lang);
        ctx.fillStyle = C.ink;
        ctx.font = `500 12px ${FONT}`;
        ctx.fillText(
          fit(ctx, speciesName(e, lang), box),
          mid,
          cy + box + (form || size ? 10 : 15)
        );

        const sub = [form, size].filter(Boolean).join(" · ");
        if (sub) {
          ctx.fillStyle = C.dim;
          ctx.font = `10px ${FONT}`;
          ctx.fillText(fit(ctx, sub, box), mid, cy + box + 24);
        }
      } else if (size) {
        // 名稱關掉時只剩尺寸，沒有尺寸的格子下方就是空的
        ctx.fillStyle = C.dim;
        ctx.font = `600 10px ${FONT}`;
        ctx.fillText(size, mid, cy + box + 9);
      }
      ctx.textAlign = "left";
    });

    y += sectionH(sect);
  }

  if (codeText) {
    const cy = H - PAD - FOOT_H;
    ctx.font = `600 17px ${FONT}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    const label = `${t("friendCode")}  ${codeText}`;
    const w = ctx.measureText(label).width + 24;
    roundRect(ctx, (W - w) / 2, cy - 15, w, 30, 8);
    ctx.fillStyle = C.card;
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = C.ink;
    ctx.textAlign = "center";
    ctx.fillText(label, W / 2, cy);
    ctx.textAlign = "left";
  }

  ctx.fillStyle = C.dim;
  ctx.font = `11px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(t("subtitle"), PAD, H - PAD - 2);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
