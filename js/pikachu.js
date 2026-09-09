/**
 * pikachu.js — 裝扮皮卡丘圖鑑
 *
 * Pokémon GO 歷年活動推出的裝扮皮卡丘。
 * 每一種都是獨立的收藏品，可分別記錄「有沒有」與「異色」。
 *
 * ── 資料來源 ──
 * 圖片來自 Choggor/Pikachu-costume-tracker（已驗證可直接連結）。
 * 官方沒有公開的裝扮清單 API，所以這份資料是靜態的，
 * 有新裝扮時要手動加一行。
 *
 * ── 名稱說明 ──
 * 英文名沿用來源資料。中文與日文為對照翻譯，
 * 可能與遊戲內用詞不完全一致，發現有誤直接改這個檔案即可。
 *
 * ── 如何新增 ──
 * 1. 在 COSTUMES 加一行，id 用檔名去掉 "25-pikachu-" 與 ".png"
 * 2. id 一旦發布就不要改，它是使用者紀錄的鍵
 * 3. 圖片會自動從 CDN 取得，不需要自己存檔
 */

import { imgAttrs } from "./data.js";

export const COSTUMES = [
  { id:"normal", file:"25-pikachu.png", zh:"一般", ja:"ノーマル", en:"Normal" },
  { id:"adventure-hat-2020", file:"25-pikachu-adventure-hat-2020.png", zh:"探險帽", ja:"たんけんぼうし", en:"Explorer" },
  { id:"anniversary", file:"25-pikachu-anniversary.png", zh:"派對帽", ja:"パーティーハット", en:"Party Hat" },
  { id:"anniversary-2022", file:"25-pikachu-anniversary-2022.png", zh:"蛋糕帽", ja:"ケーキハット", en:"Cake Hat" },
  { id:"anniversary-2026", file:"25-pikachu-anniversary-2026.png", zh:"威洛博士助手", ja:"ウィロー博士の助手", en:"Professor Willow's Assistant" },
  { id:"april-2020", file:"25-pikachu-april-2020.png", zh:"花帽", ja:"はなのぼうし", en:"Flower Hat" },
  { id:"baseball-shirt", file:"25-pikachu-baseball-shirt.png", zh:"棒球衫", ja:"ベースボールシャツ", en:"Baseball Shirt" },
  { id:"copy-2019", file:"25-pikachu-copy-2019.png", zh:"複製", ja:"コピー", en:"Clone" },
  { id:"costume-1", file:"25-pikachu-costume-1.png", zh:"世界帽", ja:"ワールドキャップ", en:"World Cap" },
  { id:"costume-2", file:"25-pikachu-costume-2.png", zh:"新年帽", ja:"おしょうがつぼうし", en:"New Year's Hat" },
  { id:"costume-2020", file:"25-pikachu-costume-2020.png", zh:"飛行", ja:"そらとぶ", en:"Flying" },
  { id:"dapper-blue", file:"25-pikachu-dapper-blue.png", zh:"紳士藍", ja:"ダッパーブルー", en:"Dapper Blue" },
  { id:"dapper-red", file:"25-pikachu-dapper-red.png", zh:"紳士紅", ja:"ダッパーレッド", en:"Dapper Red" },
  { id:"dapper-yellow", file:"25-pikachu-dapper-yellow.png", zh:"紳士黃", ja:"ダッパーイエロー", en:"Dapper Yellow" },
  { id:"diwali-2024", file:"25-pikachu-diwali-2024.png", zh:"紗麗", ja:"サリー", en:"Saree" },
  { id:"doctor", file:"25-pikachu-doctor.png", zh:"博士", ja:"ハカセ", en:"Ph.D." },
  { id:"ethans-hat", file:"25-pikachu-ethans-hat.png", zh:"小金帽", ja:"ヒビキの帽子", en:"Ethan's Hat" },
  { id:"fall-2018", file:"25-pikachu-fall-2018.png", zh:"碎片帽", ja:"フラグメントハット", en:"Fragment Hat" },
  { id:"fall-2019", file:"25-pikachu-fall-2019.png", zh:"謎擬Ｑ裝", ja:"ミミッキュコスチューム", en:"Mimikyu Costume" },
  { id:"fall-2023", file:"25-pikachu-fall-2023.png", zh:"不給糖就搗蛋", ja:"トリックオアトリート", en:"Trick and Treats" },
  { id:"feb-2019", file:"25-pikachu-feb-2019.png", zh:"偵探帽", ja:"たんていハット", en:"Detective Hat" },
  { id:"flying-01", file:"25-pikachu-flying-01.png", zh:"飛行綠", ja:"そらとぶ・緑", en:"Flying Green" },
  { id:"flying-02", file:"25-pikachu-flying-02.png", zh:"飛行紫", ja:"そらとぶ・紫", en:"Flying Purple" },
  { id:"flying-03", file:"25-pikachu-flying-03.png", zh:"飛行橙", ja:"そらとぶ・橙", en:"Flying Orange" },
  { id:"flying-04", file:"25-pikachu-flying-04.png", zh:"飛行紅", ja:"そらとぶ・赤", en:"Flying Red" },
  { id:"flying-5th-anniv", file:"25-pikachu-flying-5th-anniv.png", zh:"飛行五週年", ja:"そらとぶ5周年", en:"Flying 5th Anniversary" },
  { id:"flying-okinawa", file:"25-pikachu-flying-okinawa.png", zh:"飛行沖繩", ja:"そらとぶ沖縄", en:"Flying Okinawa" },
  { id:"fossil-2026", file:"25-pikachu-fossil-2026.png", zh:"化石", ja:"かせき", en:"Fossil" },
  { id:"gofest-2021", file:"25-pikachu-gofest-2021.png", zh:"美洛耶塔帽", ja:"メロエッタハット", en:"Meloetta Hat" },
  { id:"gofest-2022", file:"25-pikachu-gofest-2022.png", zh:"謝米圍巾", ja:"シェイミマフラー", en:"Shaymin Scarf" },
  { id:"gofest-2022-gracidea-flower", file:"25-pikachu-gofest-2022-gracidea-flower.png", zh:"謝米花", ja:"グラシデアの花", en:"Shaymin Flower" },
  { id:"gofest-2024-mtiara", file:"25-pikachu-gofest-2024-mtiara.png", zh:"月之冠", ja:"つきのティアラ", en:"Moon Crown" },
  { id:"gofest-2024-stiara", file:"25-pikachu-gofest-2024-stiara.png", zh:"日之冠", ja:"たいようのティアラ", en:"Sun Crown" },
  { id:"gofest-2026-cap-blue", file:"25-pikachu-gofest-2026-cap-blue.png", zh:"神秘隊帽", ja:"ミスティックキャップ", en:"Mystic Cap" },
  { id:"gofest-2026-cap-red", file:"25-pikachu-gofest-2026-cap-red.png", zh:"勇氣隊帽", ja:"ヴァーラーキャップ", en:"Valor Cap" },
  { id:"gofest-2026-cap-yellow", file:"25-pikachu-gofest-2026-cap-yellow.png", zh:"直覺隊帽", ja:"インスティンクトキャップ", en:"Instinct Cap" },
  { id:"gotour-2023-bandana", file:"25-pikachu-gotour-2023-bandana.png", zh:"小遙頭巾", ja:"ハルカのバンダナ", en:"May's Bow" },
  { id:"gotour-2023-hat", file:"25-pikachu-gotour-2023-hat.png", zh:"小悠帽", ja:"ユウキの帽子", en:"Brendan's Hat" },
  { id:"gotour-2024-a", file:"25-pikachu-gotour-2024-a.png", zh:"光輝帽", ja:"コウキの帽子", en:"Lucas's Hat" },
  { id:"gotour-2024-a-02", file:"25-pikachu-gotour-2024-a-02.png", zh:"小光帽", ja:"ヒカリの帽子", en:"Dawn's Hat" },
  { id:"gotour-2024-b", file:"25-pikachu-gotour-2024-b.png", zh:"零帽", ja:"テルの帽子", en:"Rei's Cap" },
  { id:"gotour-2024-b-02", file:"25-pikachu-gotour-2024-b-02.png", zh:"小明頭巾", ja:"ショウのスカーフ", en:"Akari's Kerchief" },
  { id:"gotour-2026-calems-hat", file:"25-pikachu-gotour-2026-calems-hat.png", zh:"卡爾姆帽", ja:"カルムの帽子", en:"Calem's Hat" },
  { id:"gotour-2026-serenas-hat", file:"25-pikachu-gotour-2026-serenas-hat.png", zh:"莎莉娜帽", ja:"セレナの帽子", en:"Serena's Hat" },
  { id:"halloween-2017", file:"25-pikachu-halloween-2017.png", zh:"女巫帽", ja:"まじょのぼうし", en:"Witch Hat" },
  { id:"halloween-2021", file:"25-pikachu-halloween-2021.png", zh:"萬聖帽", ja:"ハロウィンハット", en:"Halloween Hat" },
  { id:"hilbert", file:"25-pikachu-hilbert.png", zh:"小黑帽", ja:"トウヤの帽子", en:"Hilbert's Hat" },
  { id:"hilda", file:"25-pikachu-hilda.png", zh:"小白帽", ja:"トウコの帽子", en:"Hilda's Hat" },
  { id:"hoenn-2020", file:"25-pikachu-hoenn-2020.png", zh:"烈空坐帽", ja:"レックウザハット", en:"Rayquaza Hat" },
  { id:"holiday-2016", file:"25-pikachu-holiday-2016.png", zh:"聖誕帽", ja:"サンタぼうし", en:"Santa Hat" },
  { id:"holiday-2023", file:"25-pikachu-holiday-2023.png", zh:"2023 冬季", ja:"ホリデー2023", en:"Holiday 2023" },
  { id:"horizons", file:"25-pikachu-horizons.png", zh:"莉可帽", ja:"キャップの帽子", en:"Cap's Hat" },
  { id:"indonesia-football", file:"25-pikachu-indonesia-football.png", zh:"印尼足球", ja:"インドネシアサッカー", en:"Indonesia Football" },
  { id:"jan-2020", file:"25-pikachu-jan-2020.png", zh:"紅派對帽", ja:"あかいパーティーハット", en:"Red Party Hat" },
  { id:"jan-2023", file:"25-pikachu-jan-2023.png", zh:"派對高帽", ja:"パーティーシルクハット", en:"Party Top Hat" },
  { id:"jeju", file:"25-pikachu-jeju.png", zh:"藍襯衫", ja:"ブルーシャツ", en:"Blue Shirt" },
  { id:"johto-2020", file:"25-pikachu-johto-2020.png", zh:"月精靈帽", ja:"ブラッキーハット", en:"Umbreon Hat" },
  { id:"kanto-2020", file:"25-pikachu-kanto-2020.png", zh:"噴火龍帽", ja:"リザードンハット", en:"Charizard Hat" },
  { id:"kariyushi", file:"25-pikachu-kariyushi.png", zh:"嘉利吉襯衫", ja:"かりゆしウェア", en:"Kariyushi Shirt" },
  { id:"kurta", file:"25-pikachu-kurta.png", zh:"庫爾塔", ja:"クルタ", en:"Kurta" },
  { id:"leafs-hat", file:"25-pikachu-leafs-hat.png", zh:"小綠帽", ja:"グリーンの帽子", en:"Leaf's Hat" },
  { id:"lyras-hat", file:"25-pikachu-lyras-hat.png", zh:"琴音帽", ja:"コトネの帽子", en:"Lyra's Hat" },
  { id:"may-2019", file:"25-pikachu-may-2019.png", zh:"草帽", ja:"むぎわらぼうし", en:"Straw Hat" },
  { id:"monacle-blue", file:"25-pikachu-monacle-blue.png", zh:"單片眼鏡藍", ja:"モノクルブルー", en:"Monocle Blue" },
  { id:"monacle-red", file:"25-pikachu-monacle-red.png", zh:"單片眼鏡紅", ja:"モノクルレッド", en:"Monocle Red" },
  { id:"monacle-yellow", file:"25-pikachu-monacle-yellow.png", zh:"單片眼鏡黃", ja:"モノクルイエロー", en:"Monocle Yellow" },
  { id:"nate", file:"25-pikachu-nate.png", zh:"小南遮陽帽", ja:"キョウヘイのバイザー", en:"Nate's Visor" },
  { id:"november-2018", file:"25-pikachu-november-2018.png", zh:"花冠", ja:"はなのかんむり", en:"Flower Crown" },
  { id:"one-year-anniversary", file:"25-pikachu-one-year-anniversary.png", zh:"原始帽", ja:"オリジナルキャップ", en:"Original Cap" },
  { id:"pi", file:"25-pikachu-pi.png", zh:"2023 偵探帽", ja:"たんていハット2023", en:"Detective Hat 2023" },
  { id:"pop-star", file:"25-pikachu-pop-star.png", zh:"流行歌手", ja:"ポップスター", en:"Pop Star" },
  { id:"reds-hat", file:"25-pikachu-reds-hat.png", zh:"赤紅帽", ja:"レッドの帽子", en:"Red's Hat" },
  { id:"rock-star", file:"25-pikachu-rock-star.png", zh:"搖滾巨星", ja:"ロックスター", en:"Rock Star" },
  { id:"rosa", file:"25-pikachu-rosa.png", zh:"小芽遮陽帽", ja:"メイのバイザー", en:"Rosa's Visor" },
  { id:"safari-2020", file:"25-pikachu-safari-2020.png", zh:"狩獵帽", ja:"サファリハット", en:"Safari Hat" },
  { id:"sinnoh-2020", file:"25-pikachu-sinnoh-2020.png", zh:"路卡利歐帽", ja:"ルカリオハット", en:"Lucario Hat" },
  { id:"spring-2023", file:"25-pikachu-spring-2023.png", zh:"櫻花", ja:"さくら", en:"Cherry Blossom" },
  { id:"summer-2018", file:"25-pikachu-summer-2018.png", zh:"夏日帽", ja:"サマーハット", en:"Summer Hat" },
  { id:"summer-2023-a", file:"25-pikachu-summer-2023-a.png", zh:"孔雀石冠", ja:"マラカイトクラウン", en:"Malachite Crown" },
  { id:"summer-2023-b", file:"25-pikachu-summer-2023-b.png", zh:"海藍寶冠", ja:"アクアマリンクラウン", en:"Aquamarine Crown" },
  { id:"summer-2023-c", file:"25-pikachu-summer-2023-c.png", zh:"水晶冠", ja:"クォーツクラウン", en:"Quartz Crown" },
  { id:"summer-2023-d", file:"25-pikachu-summer-2023-d.png", zh:"黃鐵礦冠", ja:"パイライトクラウン", en:"Pyrite Crown" },
  { id:"summer-2023-e", file:"25-pikachu-summer-2023-e.png", zh:"紫水晶冠", ja:"アメジストクラウン", en:"Amethyst Crown" },
  { id:"tcg-2022", file:"25-pikachu-tcg-2022.png", zh:"集換式卡牌帽", ja:"TCGハット", en:"TCG Hat" },
  { id:"tshirt-01", file:"25-pikachu-tshirt-01.png", zh:"綠襯衫", ja:"グリーンシャツ", en:"Green Shirt" },
  { id:"tshirt-02", file:"25-pikachu-tshirt-02.png", zh:"紫襯衫", ja:"パープルシャツ", en:"Purple Shirt" },
  { id:"tshirt-03", file:"25-pikachu-tshirt-03.png", zh:"蠟染襯衫", ja:"バティックシャツ", en:"Batik Shirt" },
  { id:"visor-2026", file:"25-pikachu-visor-2026.png", zh:"馬拉松", ja:"マラソン", en:"Marathon" },
  { id:"vs-2019", file:"25-pikachu-vs-2019.png", zh:"摔角手", ja:"リブレ", en:"Libre" },
  { id:"wcs-2022", file:"25-pikachu-wcs-2022.png", zh:"2022 世界賽", ja:"WCS2022", en:"World Championships 2022" },
  { id:"wcs-2023", file:"25-pikachu-wcs-2023.png", zh:"2023 世界賽", ja:"WCS2023", en:"World Championships 2023" },
  { id:"wcs-2024", file:"25-pikachu-wcs-2024.png", zh:"2024 世界賽", ja:"WCS2024", en:"World Championships 2024" },
  { id:"wcs-2025", file:"25-pikachu-wcs-2025.png", zh:"2025 世界賽", ja:"WCS2025", en:"World Championships 2025" },
  { id:"winter-2018", file:"25-pikachu-winter-2018.png", zh:"毛帽", ja:"ニットぼうし", en:"Beanie" },
  { id:"winter-2020", file:"25-pikachu-winter-2020.png", zh:"冬季嘉年華", ja:"ウィンターカーニバル", en:"Winter Carnival Outfit" },];

/**
 * 圖片來源。優先讀自己 repo 的 img/pika/，找不到才連外部。
 *
 * 外部來源是個人專案，如果哪天被刪除圖片就會消失，
 * 所以 img/pika/ 由 tools/fetch-images.mjs 抓取（不進 git，部署時產生）。
 * 沒抓也能正常運作，只是會退回外部。
 */
export const LOCAL_BASE = "./img/pika/";
export const REMOTE_BASE =
  "https://raw.githubusercontent.com/Choggor/Pikachu-costume-tracker/main/sprites/";

/** 裝扮圖片網址（外部來源，作為備援） */
export const costumeArt = (file) => REMOTE_BASE + file;

/** <img> 屬性：先試本機，失敗再連外部 */
export function costumeAttrs(file) {
  return imgAttrs([LOCAL_BASE + file, REMOTE_BASE + file]);
}

/** 依 id 查裝扮 */
export function findCostume(id) {
  return COSTUMES.find((c) => c.id === id) || null;
}

/** 裝扮總數 */
export const COSTUME_COUNT = COSTUMES.length;
