/**
 * imgchain.js — 圖片備援鏈
 *
 * 圖片全部來自外部，上游改檔名或掛掉就會破圖，所以每個 <img> 都帶著
 * 後備網址，前一個載不出來就換下一個。
 *
 * ── 為什麼不用 onerror 直接換 ──
 * onerror 裡改 src 只能安全重試一次，再多會無限迴圈。所以剩下的來源
 * 放在 data-fb，由 window.__imgfb 逐一取用，用完就把 onerror 拿掉。
 *
 * ── 誰在用 ──
 * dex.js 的 iconAttrs（寶可夢圖示 → 官方立繪）
 * backgrounds.js 的 bgAttrs（上游背卡 → 本地備援圖）
 *
 * 這個檔獨立出來是因為那兩個檔互相有依賴關係，共用的東西放在它們
 * 底下才不會繞成一圈。
 */

/**
 * 依序嘗試多個來源，前一個失敗就換下一個。
 * @param {string[]} chain 圖片網址，空值會先濾掉
 * @returns {string} <img> 的屬性字串
 */
export function imgAttrs(chain) {
  const [first, ...rest] = chain.filter(Boolean);
  if (!first) return "";
  if (!rest.length) return `src="${first}"`;
  return `src="${first}" data-fb="${rest.join(" ")}" onerror="__imgfb(this)"`;
}

// 給 inline onerror 用。Node 測試環境沒有 window，所以要判斷
if (typeof window !== "undefined") {
  window.__imgfb = (img) => {
    const rest = img.dataset.fb || "";
    if (!rest) {
      img.onerror = null; // 來源用完了，停止重試
      return;
    }
    const i = rest.indexOf(" ");
    img.dataset.fb = i < 0 ? "" : rest.slice(i + 1);
    img.src = i < 0 ? rest : rest.slice(0, i);
  };
}
