/**
 * types.js — 屬性資料
 *
 * 每個屬性有代表色與三語名稱。
 * 資料來源：PokeAPI 官方資料表，一次性寫入，執行時不需連線。
 *
 * ── 如何改屬性配色 ──
 * 直接改下面的 color 值即可。
 *
 * ── 如何新增語言 ──
 * 每個屬性加上對應欄位（例如 ko:"..."），
 * 並記得在 i18n.js 的 LANGS 也加上該語言。
 */

export const TYPES = {
  bug: { color:"#96c22b", zh:"蟲", ja:"むし", en:"Bug" },
  dark: { color:"#5a5366", zh:"惡", ja:"あく", en:"Dark" },
  dragon: { color:"#0a6dc4", zh:"龍", ja:"ドラゴン", en:"Dragon" },
  electric: { color:"#e5c531", zh:"電", ja:"でんき", en:"Electric" },
  fairy: { color:"#e08fe0", zh:"妖精", ja:"フェアリー", en:"Fairy" },
  fighting: { color:"#cf4068", zh:"格鬥", ja:"かくとう", en:"Fighting" },
  fire: { color:"#e8672c", zh:"火", ja:"ほのお", en:"Fire" },
  flying: { color:"#8fa8dd", zh:"飛行", ja:"ひこう", en:"Flying" },
  ghost: { color:"#5a6cb5", zh:"幽靈", ja:"ゴースト", en:"Ghost" },
  grass: { color:"#5dbe62", zh:"草", ja:"くさ", en:"Grass" },
  ground: { color:"#d97746", zh:"地面", ja:"じめん", en:"Ground" },
  ice: { color:"#4fbfb2", zh:"冰", ja:"こおり", en:"Ice" },
  normal: { color:"#9199a1", zh:"一般", ja:"ノーマル", en:"Normal" },
  poison: { color:"#a864c8", zh:"毒", ja:"どく", en:"Poison" },
  psychic: { color:"#e8688f", zh:"超能力", ja:"エスパー", en:"Psychic" },
  rock: { color:"#c7b78b", zh:"岩石", ja:"いわ", en:"Rock" },
  steel: { color:"#5a8fa2", zh:"鋼", ja:"はがね", en:"Steel" },
  water: { color:"#4d90d5", zh:"水", ja:"みず", en:"Water" },};

/**
 * 取得屬性的顯示資訊
 * @param {string} slug 屬性代號，例如 "psychic"
 * @param {string} lang 語言代碼
 * @returns {{color: string, name: string}}
 */
export function typeInfo(slug, lang) {
  const t = TYPES[slug];
  if (!t) return { color: "#9199a1", name: slug };
  return { color: t.color, name: t[lang] || t.en };
}
