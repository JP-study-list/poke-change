/**
 * costumes.js — 裝扮代碼的三語名稱（手動維護）
 *
 * ── 為什麼要手動維護 ──
 * 遊戲裡的裝扮寶可夢只顯示物種名，官方從來沒有給裝扮命名，
 * 語言檔裡也查不到。所以譯名一律由我們自己取，這份表就是唯一來源。
 *
 * ── 代碼從哪來 ──
 * tools/build-dex.mjs 從 PokeMiners 圖檔名解析出來，例如
 * `pm25.cHALLOWEEN_2017.icon.png` 的代碼是 `HALLOWEEN_2017`。
 * 出現沒收錄的代碼時腳本會列出來，補進這裡再重跑即可。
 *
 * ── _NOEVOLVE 後綴 ──
 * 代表「這隻穿了裝扮就不能進化」，是遊戲機制不是外觀差異，
 * 查表時會自動去掉，所以這裡不需要重複列。
 *
 * ── 標了 ※ 的項目 ──
 * 代碼含意從檔名推測，還沒對照過遊戲畫面，看到錯的直接改這裡。
 */

/** 裝扮代碼 → [繁中, 日文, 英文] */
export const COSTUME_NAMES = {
  /* 週年與里程碑 */
  ONE_YEAR_ANNIVERSARY: ["一週年派對帽", "1周年パーティーハット", "1st Anniversary Party Hat"],
  ANNIVERSARY: ["週年派對帽", "パーティーハット", "Anniversary Party Hat"],
  ANNIVERSARY_2022: ["六週年蛋糕帽", "6周年ケーキハット", "6th Anniversary Cake Hat"],
  ANNIVERSARY_2024: ["八週年", "8周年", "8th Anniversary"],
  FLYING_5TH_ANNIV: ["飛行五週年", "そらとぶ5周年", "Flying 5th Anniversary"],

  /* 萬聖節 */
  HALLOWEEN_2017: ["2017 萬聖節", "2017ハロウィン", "Halloween 2017"],
  FALL_2018: ["2018 萬聖節", "2018ハロウィン", "Halloween 2018"],
  FALL_2019: ["2019 萬聖節", "2019ハロウィン", "Halloween 2019"],
  COSTUME_2020: ["2020 萬聖節", "2020ハロウィン", "Halloween 2020"],
  FALL_2020: ["2020 萬聖節", "2020ハロウィン", "Halloween 2020"],
  HALLOWEEN_2021: ["2021 萬聖節", "2021ハロウィン", "Halloween 2021"],
  FALL_2022: ["2022 萬聖節", "2022ハロウィン", "Halloween 2022"],
  FALL_2023: ["2023 萬聖節", "2023ハロウィン", "Halloween 2023"],
  FALL_2024: ["2024 萬聖節", "2024ハロウィン", "Halloween 2024"],

  /* 假日與冬季 */
  HOLIDAY_2016: ["2016 假日", "2016ホリデー", "Holiday 2016"],
  WINTER_2018: ["2018 假日", "2018ホリデー", "Holiday 2018"],
  WINTER_2020: ["2020 假日", "2020ホリデー", "Holiday 2020"],
  HOLIDAY_2021: ["2021 假日", "2021ホリデー", "Holiday 2021"],
  HOLIDAY_2022: ["2022 假日", "2022ホリデー", "Holiday 2022"],
  HOLIDAY_2023: ["2023 假日", "2023ホリデー", "Holiday 2023"],
  WINTER_2024: ["2024 假日", "2024ホリデー", "Holiday 2024"],

  /* 新年 */
  COSTUME_2: ["新年帽", "おしょうがつぼうし", "New Year's Hat"],
  JAN_2020: ["2020 新年", "2020お正月", "New Year 2020"],
  JAN_2022: ["2022 新年", "2022お正月", "New Year 2022"],
  JAN_2023: ["2023 新年", "2023お正月", "New Year 2023"],
  JAN_2024: ["2024 新年", "2024お正月", "New Year 2024"],

  /* 春季 */
  APRIL_2020: ["2020 春季花帽", "2020春 はなのぼうし", "Spring 2020 Flower Hat"],
  SPRING_2020: ["2020 春季", "2020春", "Spring 2020"],
  SPRING_2023: ["2023 春季", "2023春", "Spring 2023"],
  SPRING_2023_INSTINCT: ["2023 春季 黃隊", "2023春 イエローチーム", "Spring 2023 Instinct"],
  SPRING_2023_MYSTIC: ["2023 春季 藍隊", "2023春 ブルーチーム", "Spring 2023 Mystic"],
  SPRING_2023_VALOR: ["2023 春季 紅隊", "2023春 レッドチーム", "Spring 2023 Valor"],
  SPRING_2024: ["2024 春季", "2024春", "Spring 2024"],

  /* 夏季與水邊 */
  SUMMER_2018: ["2018 夏季", "2018夏", "Summer 2018"],
  SUMMER_2023: ["2023 夏季", "2023夏", "Summer 2023"],
  SUMMER_2023_A: ["2023 夏季 A", "2023夏 A", "Summer 2023 A"],
  SUMMER_2023_B: ["2023 夏季 B", "2023夏 B", "Summer 2023 B"],
  SUMMER_2023_C: ["2023 夏季 C", "2023夏 C", "Summer 2023 C"],
  SUMMER_2023_D: ["2023 夏季 D", "2023夏 D", "Summer 2023 D"],
  SUMMER_2023_E: ["2023 夏季 E", "2023夏 E", "Summer 2023 E"],
  SUMMER_2024: ["2024 夏季", "2024夏", "Summer 2024"],
  SWIM_2025: ["2025 泳裝", "2025 みずぎ", "Swim 2025"],
  SAFARI_2020: ["2020 探險尋寶", "2020サファリ", "Safari 2020"],

  /* GO Fest */
  GOFEST_2021: ["2021 GO Fest", "2021 GO Fest", "GO Fest 2021"],
  GOFEST_2022: ["2022 GO Fest", "2022 GO Fest", "GO Fest 2022"],
  GOFEST_2024_STIARA: ["2024 GO Fest 太陽頭冠", "2024 GO Fest サンティアラ", "GO Fest 2024 Sun Tiara"],
  GOFEST_2024_MTIARA: ["2024 GO Fest 月亮頭冠", "2024 GO Fest ムーンティアラ", "GO Fest 2024 Moon Tiara"],
  GOFEST_2024_SSCARF: ["2024 GO Fest 太陽圍巾", "2024 GO Fest サンスカーフ", "GO Fest 2024 Sun Scarf"],
  GOFEST_2024_MSCARF: ["2024 GO Fest 月亮圍巾", "2024 GO Fest ムーンスカーフ", "GO Fest 2024 Moon Scarf"],
  GOFEST_2025_GOGGLES_BLUE: ["2025 GO Fest 藍護目鏡", "2025 GO Fest ブルーゴーグル", "GO Fest 2025 Blue Goggles"],
  GOFEST_2025_GOGGLES_RED: ["2025 GO Fest 紅護目鏡", "2025 GO Fest レッドゴーグル", "GO Fest 2025 Red Goggles"],
  GOFEST_2025_GOGGLES_YELLOW: ["2025 GO Fest 黃護目鏡", "2025 GO Fest イエローゴーグル", "GO Fest 2025 Yellow Goggles"],
  GOFEST_2025_MONOCLE_BLUE: ["2025 GO Fest 藍單片眼鏡", "2025 GO Fest ブルーモノクル", "GO Fest 2025 Blue Monocle"],
  GOFEST_2025_MONOCLE_RED: ["2025 GO Fest 紅單片眼鏡", "2025 GO Fest レッドモノクル", "GO Fest 2025 Red Monocle"],
  GOFEST_2025_MONOCLE_YELLOW: ["2025 GO Fest 黃單片眼鏡", "2025 GO Fest イエローモノクル", "GO Fest 2025 Yellow Monocle"],
  GOFEST_2025_TRAIN_CONDUCTOR: ["2025 GO Fest 列車長", "2025 GO Fest しゃしょう", "GO Fest 2025 Train Conductor"],

  /* GO Tour */
  GOTOUR_2023_HAT: ["2023 GO Tour 帽子", "2023 GO Tour ぼうし", "GO Tour 2023 Hat"],
  GOTOUR_2023_BANDANA: ["2023 GO Tour 頭巾", "2023 GO Tour バンダナ", "GO Tour 2023 Bandana"],
  GOTOUR_2024_A: ["2024 GO Tour A", "2024 GO Tour A", "GO Tour 2024 A"],
  GOTOUR_2024_A_02: ["2024 GO Tour A 之二", "2024 GO Tour A その2", "GO Tour 2024 A II"],
  GOTOUR_2024_B: ["2024 GO Tour B", "2024 GO Tour B", "GO Tour 2024 B"],
  GOTOUR_2024_B_02: ["2024 GO Tour B 之二", "2024 GO Tour B その2", "GO Tour 2024 B II"],
  GOTOUR_2025_A: ["2025 GO Tour A", "2025 GO Tour A", "GO Tour 2025 A"],
  GOTOUR_2025_A_02: ["2025 GO Tour A 之二", "2025 GO Tour A その2", "GO Tour 2025 A II"],
  GOTOUR_2025_B: ["2025 GO Tour B", "2025 GO Tour B", "GO Tour 2025 B"],
  GOTOUR_2025_B_02: ["2025 GO Tour B 之二", "2025 GO Tour B その2", "GO Tour 2025 B II"],

  /* 地區主題 */
  KANTO_2020: ["2020 關都", "2020カントー", "Kanto 2020"],
  JOHTO_2020: ["2020 城都", "2020ジョウト", "Johto 2020"],
  HOENN_2020: ["2020 豐緣", "2020ホウエン", "Hoenn 2020"],
  SINNOH_2020: ["2020 神奧", "2020シンオウ", "Sinnoh 2020"],
  GEMS_1_2021: ["2021 神奧之石 一", "2021シンオウのいし 1", "Sinnoh Stone 2021 I"],
  GEMS_2_2021: ["2021 神奧之石 二", "2021シンオウのいし 2", "Sinnoh Stone 2021 II"],
  WILDAREA_2024: ["2024 曠野地帶", "2024ワイルドエリア", "Wild Area 2024"],

  /* 各國與城市 */
  KARIYUSHI: ["沖繩花襯衫", "かりゆしウェア", "Kariyushi Shirt"],
  FLYING_OKINAWA: ["飛行沖繩", "そらとぶ沖縄", "Flying Okinawa"],
  JEJU: ["濟州島", "チェジュ島", "Jeju"],
  KURTA: ["印度傳統上衣", "クルタ", "Kurta"],
  DIWALI_2024: ["2024 排燈節", "2024ディワリ", "Diwali 2024"],
  INDONESIA_2025: ["2025 印尼", "2025インドネシア", "Indonesia 2025"],

  /* 世界錦標賽 */
  WCS_2022: ["2022 世界錦標賽", "2022世界大会", "World Championships 2022"],
  WCS_2023: ["2023 世界錦標賽", "2023世界大会", "World Championships 2023"],
  WCS_2024: ["2024 世界錦標賽", "2024世界大会", "World Championships 2024"],
  WCS_2025: ["2025 世界錦標賽", "2025世界大会", "World Championships 2025"],
  COSTUME_1: ["世界帽", "ワールドキャップ", "World Cap"],

  /* 動畫與聯名 */
  HORIZONS: ["地平線系列", "リコとロイの旅", "Horizons"],
  HORIZONS_2025: ["2025 地平線系列", "2025リコとロイの旅", "Horizons 2025"],
  TCG_2022: ["2022 集換式卡牌", "2022カードゲーム", "TCG 2022"],
  COPY_2019: ["複製", "コピー", "Clone"],

  /* 時裝與造型 */
  FASHION_2021: ["2021 時裝週", "2021ファッションウィーク", "Fashion Week 2021"],
  FASHION_2025: ["2025 時裝週", "2025ファッションウィーク", "Fashion Week 2025"],
  ROYAL: ["皇家", "ロイヤル", "Royal"],
  POP_STAR: ["流行歌手", "ポップスター", "Pop Star"],
  ROCK_STAR: ["搖滾歌手", "ロックスター", "Rock Star"],
  TSHIRT_01: ["T 恤 一", "Tシャツ 1", "T-Shirt I"],
  TSHIRT_02: ["T 恤 二", "Tシャツ 2", "T-Shirt II"],
  TSHIRT_03: ["T 恤 三", "Tシャツ 3", "T-Shirt III"],
  ADVENTURE_HAT_2020: ["探險帽", "たんけんぼうし", "Explorer Hat"],
  NIGHTCAP: ["睡帽", "ナイトキャップ", "Nightcap"],
  DOCTOR: ["博士", "ハカセ", "Ph.D."],

  /* 飛行皮卡丘系列 */
  FLYING_01: ["飛行綠", "そらとぶ 緑", "Flying Green"],
  FLYING_02: ["飛行紫", "そらとぶ 紫", "Flying Purple"],
  FLYING_03: ["飛行橙", "そらとぶ 橙", "Flying Orange"],
  FLYING_04: ["飛行紅", "そらとぶ 赤", "Flying Red"],

  /* 其他單發活動 */
  FEB_2019: ["2019 偵探帽", "2019たんていハット", "Detective Hat 2019"],
  MAY_2019: ["2019 五月", "2019年5月", "May 2019"],
  VS_2019: ["2019 對戰", "2019バトル", "Battle 2019"],
  NOVEMBER_2018: ["2018 十一月", "2018年11月", "November 2018"],
  MAY_2023: ["2023 五月", "2023年5月", "May 2023"],
  PI: ["圓周率日", "円周率の日", "Pi Day"], // ※ 代碼推測
  2020: ["2020 裝扮", "2020コスチューム", "Costume 2020"], // ※ 代碼推測
  2021: ["2021 裝扮", "2021コスチューム", "Costume 2021"], // ※ 代碼推測
  2022: ["2022 裝扮", "2022コスチューム", "Costume 2022"], // ※ 代碼推測
};

/**
 * 查裝扮名稱。
 * `_NOEVOLVE` 是「穿了不能進化」的遊戲機制，外觀相同，查表時去掉。
 * @param {string} code 裝扮代碼
 * @param {string} lang zh / ja / en
 * @returns {string|null}
 */
export function costumeName(code, lang) {
  if (!code) return null;
  const row =
    COSTUME_NAMES[code] || COSTUME_NAMES[code.replace(/_NOEVOLVE$/, "")] || null;
  if (!row) return null;
  return row[lang === "zh" ? 0 : lang === "ja" ? 1 : 2];
}

export const COSTUME_CODE_COUNT = Object.keys(COSTUME_NAMES).length;
