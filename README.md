# poke-change

Pokémon GO 交換清單製作工具。用圖鑑找出活動裝扮、地區型與背卡寶可夢，
排出「想要」與「可以給」兩份清單，一鍵產生分享圖傳給對方。

## 跟其他交換工具的差別

一般的交換工具只收錄一般型態，這裡收 1478 個條目，包含：

| 分類 | 數量 |
| --- | --- |
| 一般 | 893 |
| 型態變化（含地區型 55） | 287 |
| 活動裝扮 | 298 |
| 已實裝異色 | 1434 |

活動裝扮橫跨一百多個物種，不只皮卡丘。再加上 17 張活動背卡與 195 個收集格，
可以直接指定「有東京背卡的異色超夢」這種真實存在的交換需求。

## 資料只存在你的裝置

沒有帳號、沒有後台、沒有雲端。所有紀錄存在瀏覽器的 localStorage。

**換裝置、清除瀏覽資料，或長時間沒開啟本站，紀錄都會消失。**
iOS Safari 對長期沒互動的網站會主動清除資料。重要的清單請按「匯出備份」存成檔案。

## 本機開發

```
python3 -m http.server 8000
```

不能用 `file://` 開，ES modules 會被 CORS 擋掉。沒有建置流程，改完存檔重整就好。

改完跑一次自我檢查：

```
node tools/check.mjs        # 不連外網
node tools/check.mjs --net  # 加驗圖片網址
```

## 更新圖鑑資料

GO 有新寶可夢或新裝扮時：

```
node tools/build-dex.mjs --force
```

腳本會從 PokeMiners 重新抓 game master 與圖檔清單，重新產生 `js/godex.js`。
如果出現沒收錄的裝扮代碼，腳本會列出來，補進 `js/costumes.js` 再跑一次。

## 新增活動背卡

1. 圖片放進 `img/bg/`
2. 在 `js/backgrounds.js` 的 `EVENTS` 加一筆，`pokemon` 陣列填條目 id
3. `node tools/check.mjs` 確認 id 都對得上

## 資料來源

| 用途 | 來源 |
| --- | --- |
| 遊戲數值與型態清單 | PokeMiners/game_masters |
| GO 圖示與官方三語名稱 | PokeMiners/pogo_assets |
| 部分裝扮皮卡丘 | Choggor/Pikachu-costume-tracker |
| 立繪備援 | PokeAPI/sprites |
| 背卡圖 | 本 repo 的 `img/bg/` |

圖片一律直接連外部 CDN，不鏡像進 repo。
