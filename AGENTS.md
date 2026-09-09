# AGENTS.md — 外部代理在本 repo 的作業範圍

> 這份是**護欄**，不是專案說明。專案背景在 `CLAUDE.md`，
> 檔案關係在 `project-index.md`，開發歷史在 `progress.md`。
> 放在根目錄是因為要**自動載入**——寫在別處的規則等於「希望你會去讀」，那不叫護欄。

---

## 這個 repo 是什麼

Pokémon GO 交換清單製作工具。純靜態站，ES modules，**沒有建置流程、沒有 npm、
沒有後台**。1478 個圖鑑條目，使用者排出「想要」與「可以給」兩份清單，產生分享圖。

線上是 `https://jp-study-list.github.io/poke-change/`，
GitHub Pages 直接吃 `main` 根目錄，**push 就上線，沒有審核也沒有預覽環境**。

---

## 開工前先讀

1. `project-index.md` 全部——掌握結構與各檔用途，不要重掃全部原始碼
2. `progress.md` 最新 3 筆——掌握上次做到哪
3. 要動某個檔才去讀那個檔

---

## 讀 vs 寫

**讀**：整個 repo 隨你讀，讀不會弄壞東西。

**寫**：可以改的是原始碼與文件，但下面那張表裡的東西一個都不要碰。

---

## 絕對不要碰（每一項都寫了後果，不是形式規則）

| 不要碰 | 為什麼 |
|---|---|
| **`js/godex.js`** | **自動產生的檔案**，357 KB。手改沒有意義，下次跑 `tools/build-dex.mjs` 就被整份蓋掉。要改內容是去改產生腳本或 `js/costumes.js`，然後重跑 |
| **已發布的條目 id** | `d150`、`d25.cHALLOWEEN_2017` 這些是**使用者紀錄的鍵**，存在他們瀏覽器的 localStorage 裡。改了會讓所有既有清單對不上，而且**沒有伺服器可以做資料遷移**，使用者的清單就是靜默消失 |
| **`js/store.js` 的 `KEY` 常數** | 同上。改了等於所有人的資料一次歸零 |
| **`tools/.cache/`** | 上游原始資料的快取，28 MB。刪掉要重下載 game master 與語言檔。不進 git 是刻意的 |
| **`img/bg/`** | 17 張背卡圖，**是使用者自己的檔案，沒有備援鏈**。刪掉或改名畫面就破圖 |
| **`.gitignore`** | 擋著 `tools/.cache/`。放寬會讓 28 MB 的上游快取進 git |

---

## 絕對不要執行

- **`git push`** —— push 到 `main` **直接上線**，沒有中間站。
- **`git reset --hard`／`git rebase`／`git push -f`／`rm`** —— 不可逆，一律先問。
- **`node tools/build-dex.mjs --force`** —— 會重新下載約 25 MB。
  想重新產生用不帶 `--force` 的版本，它會吃快取。
- **把圖片抓進 repo** —— 寶可夢圖片刻意不鏡像。3426 張約 75 MB，
  而且是 Niantic 素材，進了 git 歷史要拿掉得改寫歷史。

`git commit` 可以直接做，不需要事前確認，訊息用 `feat:`／`fix:`／`refactor:`／
`docs:`／`chore:` 前綴加繁中摘要。commit 可逆所以放行，push 不可逆所以要問。

---

## 改動的三條規則

1. **新增 `<img>` 一律用 `iconAttrs()` 產生屬性**，自己寫 `src` 就沒有備援鏈，
   上游缺圖時會直接破圖而不是退回官方立繪。

2. **改 `js/i18n.js` 三語 key 必須完全一致**。少一個會在畫面上直接顯示 key 名。
   改完跑 `node tools/check.mjs`。

3. **改完一定要跑 `node tools/check.mjs`**。它會驗 i18n、條目完整性、背卡引用、
   儲存往返、全部繪製函式與 HTML 逸出。加 `--net` 會多驗圖片網址。

---

## 動到畫面的話

**光跑 check 不夠，要實際起 server 用瀏覽器看過。**

```
python3 -m http.server 8000
```

不能用 `file://` 開，ES modules 會被 CORS 擋掉。

headless 截圖（`--user-data-dir` 要給獨立路徑，否則會卡在 Chrome 的 singleton lock）：

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --no-first-run --user-data-dir=/tmp/ccp \
  --window-size=1440,900 --virtual-time-budget=12000 \
  --screenshot=out.png http://localhost:8000/
```

⚠️ **headless Chrome 的視埠下限是 500px**。用 `--window-size=390` 截手機版
看起來溢出其實只是裁切，不是版面問題。要量真正的手機寬度得用 iframe 包一層。

---

## 不確定的時候

**停下來問人，不要自己決定。**

這個專案的資料有大量「看起來正常但其實錯了」的情況：上游同一個裝扮會用
`.c` 與 `.f` 兩種命名、`_NOEVOLVE` 後綴是遊戲機制不是外觀、大小寫會不一致、
`.g2` 是同一張圖的新版渲染。這些踩過的坑都寫在 `CLAUDE.md` 的「已知地雷」，
動資料層之前先讀那一段。

**「我改完了」不算完成，「我確認過畫面上是對的」才算。**

回覆一律用**繁體中文**。
