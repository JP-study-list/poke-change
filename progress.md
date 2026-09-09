# progress.md — 開發歷史

> 反向時間序，最新在最上面。

---

## 2026-09-09（二）
- 類型：新增
- 影響檔案：index.html, css/style.css, js/dex.js, js/store.js, js/i18n.js,
  js/ui.js, js/main.js, js/share.js, js/extra.js, js/backgrounds.js,
  tools/check.mjs, README.md, project-index.md
- 摘要：完成整個介面層，站台可以實際使用了。
  - `js/dex.js`：合併 godex 與 extra 成 1478 個條目，統一名稱組合、
    搜尋、篩選與圖片備援鏈。畫面層只跟這個檔說話。
  - `js/store.js`：localStorage 儲存，加匯出匯入。讀進來的資料一律過
    `normalize`，因為 localStorage 使用者可以手動改。
  - `js/i18n.js`：重寫成交換工具的字典，三語各 70 個 key。
  - `js/ui.js` + `js/main.js`：三個檢視，圖鑑、交換表、背卡。
  - `js/share.js`：雙欄分享圖，左邊想要右邊可以給。
  - `js/backgrounds.js`：helper 改寫成用條目 id，`cardsFor` 改成通用查詢。
  - `tools/check.mjs`：自我檢查，涵蓋 i18n、條目、背卡、儲存往返、
    全部繪製函式與 HTML 逸出。
- 原因：資料層完成後接介面，讓交換表能實際產出分享圖。
- 驗證：
  - `node tools/check.mjs` 全部通過，含 1478 筆詳情與 17 張背卡逐一繪製。
  - 本機 server 實測，13 個檔案全部 200。
  - headless Chrome 實際渲染並截圖確認四個畫面：圖鑑、交換表、
    背卡、條目詳情，深色模式與英文介面另外確認。
  - 分享圖實際產出並檢查版面，修掉備註與標籤重疊、
    以及只有名稱的列文字靠上而圖示置中的對齊問題。
  - 手機版用 360px iframe 量測，`scrollWidth` 等於視埠寬，沒有水平溢出。
    先前 430px 截圖看起來溢出是 headless Chrome 視埠下限 500px 造成的裁切，
    不是版面問題。
- 待辦/已知問題：
  - 尚未推上 GitHub，也還沒設定 Pages。
  - 裝扮譯名有 4 個代碼是推測的，`js/costumes.js` 標了 ※。
  - `S` 型態譯成「特別」是暫定，待確認實際是什麼。

---

## 2026-09-09
- 類型：新增
- 影響檔案：tools/build-dex.mjs, js/godex.js, js/costumes.js, .gitignore
- 摘要：建立專案並完成資料層。
  - `tools/build-dex.mjs` 離線解析 PokeMiners game master 與圖檔清單，
    產出 `js/godex.js`，1458 個條目，含地區型、型態變化、裝扮。
  - 條目清單以圖檔為準而非 game master，因為 game master 收了很多
    沒實裝的型態，而畫得出來的一定有圖檔。
  - 異色是否實裝改用「有沒有異色圖檔」判斷。game master 沒有這個旗標，
    實測熊徒弟、武道熊師、眷戀雲確實沒有異色圖，與已知情況相符。
  - `js/costumes.js` 手動維護裝扮譯名。裝扮在遊戲內沒有官方名稱，
    語言檔查不到，只能自己取。共 121 個代碼。
  - 排除超級進化與極巨化 60 筆。那是戰鬥中的暫時狀態，不是可交換的個體。
- 原因：專案從「傳說收集圖鑑」轉向「交換表格製作」，資料庫要從 79 隻
  擴到全圖鑑，且以活動限定的裝扮與背卡為差異化重點。
- 驗證：全欄位完整、id 無重複、屬性零缺漏；三語名稱齊全；
  隨機抽樣 12 個條目共 24 個圖片網址實測全部 200。
- 待辦/已知問題：
  - 裝扮譯名有 4 個代碼含意是從檔名推測的，標了 ※ 待核對。
  - 尚未接介面。下一步是儲存層改 localStorage 與雙欄交換表。
