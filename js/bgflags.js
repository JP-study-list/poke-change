/**
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
 * 產生時間：2026-09-17
 * 卡 12 張，標記 107 個
 */

export const BG_FLAGS = {
  "community-2026": {
    purified: ["d37", "d37.fALOLA", "d633"],
    max: ["d810", "d813", "d816"],
  },
  "go-fest-2025-eternatus": {
    max: ["d1", "d4", "d7", "d10", "d66", "d92", "d98", "d113", "d138", "d140", "d144", "d145", "d146", "d213", "d243", "d244", "d245", "d302", "d320", "d374", "d380", "d381", "d519", "d529", "d554", "d568", "d615", "d766", "d810", "d813", "d816", "d819", "d821", "d831", "d849.fAMPED", "d849.fLOW_KEY", "d856", "d870"],
    gmax: ["d3", "d6", "d9", "d12", "d68", "d94", "d99", "d812", "d815", "d818", "d849.fAMPED"],
  },
  "gowa-2025-global": {
    purified: ["d249", "d250", "d488", "d491"],
  },
  "gt26-gold": {
    purified: ["d250"],
  },
  "gt26-silver": {
    purified: ["d249"],
  },
  "lc-gowa-fukuoka": {
    max: ["d849.fAMPED", "d849.fLOW_KEY"],
    gmax: ["d849.fAMPED"],
  },
  "nagasaki-2025": {
    purified: ["d488", "d491"],
    gmax: ["d861"],
  },
  "sb-gowa-fukuoka": {
    max: ["d849.fAMPED", "d849.fLOW_KEY"],
    gmax: ["d849.fAMPED"],
  },
  "season20-tales-of-transformation": {
    purified: ["d731"],
  },
  "team-leader-blue": {
    purified: ["d1", "d4", "d7", "d252", "d255", "d258"],
    max: ["d1", "d4", "d7", "d810", "d813", "d816"],
  },
  "team-leader-red": {
    purified: ["d1", "d4", "d7", "d252", "d255", "d258"],
    max: ["d1", "d4", "d7", "d810", "d813", "d816"],
  },
  "team-leader-yellow": {
    purified: ["d1", "d4", "d7", "d252", "d255", "d258"],
    max: ["d1", "d4", "d7", "d810", "d813", "d816"],
  },
};
