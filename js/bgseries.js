/**
 * bgseries.js — 背卡收納夾的譯名
 *
 * 背卡數量到了兩百多張，攤平列出來沒辦法看，所以照活動系列收進資料夾。
 * 系列本身沒有官方名稱，跟裝扮一樣是自己取的，原則是看得出是哪一類活動。
 *
 * ── 這個檔是手工維護的 ──
 * 系列的判定規則寫在 tools/build-bg.mjs 的 SERIES_RULES，
 * 這裡只放名稱與顯示順序。腳本發現有規則對不到名稱時會列出來。
 *
 * ── 順序 ──
 * 陣列順序就是畫面上的順序。原則是能拿得到的排前面：
 * 全球活動 → 大型實體活動 → 常駐地點 → 其他。
 */

export const SERIES = [
  { id: "gofest", zh: "GO Fest", ja: "GO Fest", en: "GO Fest" },
  { id: "gotour", zh: "GO Tour", ja: "GO Tour", en: "GO Tour" },
  { id: "season", zh: "季節", ja: "シーズン", en: "Season" },
  { id: "gowa", zh: "GO 狂野區域", ja: "GOワイルドエリア", en: "GO Wild Area" },
  { id: "wcs", zh: "世界錦標賽", ja: "世界大会", en: "World Championships" },
  { id: "citysafari", zh: "City Safari", ja: "シティサファリ", en: "City Safari" },
  { id: "roadtrip", zh: "公路旅行", ja: "ロードトリップ", en: "Road Trip" },
  { id: "airadv", zh: "空中冒險", ja: "エアアドベンチャー", en: "Air Adventures" },
  { id: "tpc30th", zh: "寶可夢 30 週年", ja: "ポケモン30周年", en: "Pokémon 30th" },
  { id: "pokecenter", zh: "寶可夢中心", ja: "ポケモンセンター", en: "Pokémon Center" },
  { id: "pokelid", zh: "人孔蓋", ja: "ポケふた", en: "Poké Lids" },
  { id: "nationaltrust", zh: "英國國民信託", ja: "ナショナル・トラスト", en: "National Trust" },
  { id: "npb", zh: "日本職棒", ja: "NPB", en: "NPB" },
  { id: "mlb", zh: "美國職棒", ja: "MLB", en: "MLB" },
  { id: "kbo", zh: "韓國職棒", ja: "KBO", en: "KBO" },
  { id: "nfl", zh: "美式足球", ja: "NFL", en: "NFL" },
  { id: "tokmun", zh: "東京都內", ja: "東京都内", en: "Tokyo Wards" },
  { id: "osaka2025", zh: "大阪 2025", ja: "大阪 2025", en: "Osaka 2025" },
  { id: "paris2025", zh: "巴黎 2025", ja: "パリ 2025", en: "Paris 2025" },
  { id: "carnival", zh: "嘉年華", ja: "カーニバル", en: "Carnival" },
  { id: "teamleader", zh: "隊長", ja: "リーダー", en: "Team Leaders" },
  { id: "sbmisc", zh: "其他特殊背景", ja: "その他の特別背景", en: "Other Special Backgrounds" },
  { id: "lcmisc", zh: "其他地區活動", ja: "その他の地域イベント", en: "Other Local Events" },
];

const INDEX = new Map(SERIES.map((s) => [s.id, s]));

/** 依 id 查系列，查不到回 null */
export const seriesInfo = (id) => INDEX.get(id) || null;

/** 系列的顯示順序，數字越小越前面 */
export const seriesOrder = (id) => {
  const i = SERIES.findIndex((s) => s.id === id);
  return i < 0 ? SERIES.length : i;
};
