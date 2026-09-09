# project-index.md — 專案檔案索引

> poke-change：Pokémon GO 交換清單製作工具。
> 純靜態站（ES modules），無建置流程，無後台，資料存在使用者裝置。
> 這份檔案只講**檔案職責與關係**，資料來源與已知地雷見 `CLAUDE.md`。

---

## 進入點

```
index.html  →  <script type="module" src="./js/main.js">  →  main.js  →  各模組
```

`index.html` 只有 61 行，是骨架：頂部列、側欄、內容容器、詳情面板、toast。
所有內容由 `js/ui.js` 在執行時填入。無 build、無 bundler、無 npm。

**本機啟動**：`python3 -m http.server 8000`（ES modules 不能用 `file://`）

---

## 依賴關係

```
main.js ──┬─► i18n.js      語言字典 + makeT()
          ├─► store.js     localStorage 讀寫、匯出匯入
          ├─► dex.js       條目查詢（唯一入口）
          ├─► share.js ──┬─► dex.js
          │              └─► backgrounds.js
          └─► ui.js ─────┬─► dex.js
                         ├─► types.js        屬性顏色
                         ├─► backgrounds.js  背卡查詢
                         └─► store.js        MAX_ITEMS

dex.js ──┬─► godex.js   自動產生的圖鑑資料
         └─► extra.js   手動補的條目

tools/build-dex.mjs ──► costumes.js（裝扮譯名）
tools/check.mjs ──────► 全部模組（用 DOM stub 在 Node 跑）
```

**單向依賴，無循環**。`dex.js` 是畫面層唯一的資料入口，
`ui.js` 不直接碰 `godex.js`，這樣換資料來源不會動到畫面。

分層：

| 層 | 檔案 | 特徵 |
| --- | --- | --- |
| 資料 | `godex.js` `extra.js` `costumes.js` `backgrounds.js` `types.js` `i18n.js` | 純資料，不碰 DOM |
| 存取 | `dex.js` `store.js` | 查詢與讀寫，不碰 DOM |
| 繪製 | `ui.js` `share.js` | 把資料變成畫面，不決定資料怎麼變 |
| 協調 | `main.js` | 保管 state、綁事件、串起以上三層 |

---

## 各檔用途

### 骨架與樣式

| 檔案 | 用途 | 備註 |
| --- | --- | --- |
| `index.html` | 頁面骨架，61 行 | 側欄要加區塊 → 在 `.sidebar` 內加 `<section class="side-block">` |
| `css/style.css` | 全部樣式 | 設計 token 全在 `:root`；深色模式用 `body.dark` 覆寫同一組變數。斷點只有 900px |

### 資料層

| 檔案 | 匯出 | 用途 |
| --- | --- | --- |
| `js/godex.js` | `GODEX` `GODEX_COUNT` | **自動產生，不要手改。** 1455 個條目，含 dex / 型態 / 裝扮 / 三語名 / 屬性 / 稀有度 / 圖檔名 / 有無異色 |
| `js/extra.js` | `PIKA_EXTRA` `ALIAS` `MISSING_ICON` `extraEntries()` | 手動補 godex 缺的 23 筆：22 種上游沒有的裝扮皮卡丘，以及沒有 GO 圖示的捷拉奧拉 |
| `js/costumes.js` | `COSTUME_NAMES` `costumeName()` | 裝扮的三語譯名。**遊戲內裝扮沒有官方名稱**，只能自己取，這是唯一來源 |
| `js/backgrounds.js` | `EVENTS` `allCards` `entriesOf` `cardsFor` `allBgEntryIds` `totalCardSlots` | 7 個活動 / 17 張背卡 / 195 個收集格。`pokemon` 陣列填 dex.js 的條目 id |
| `js/types.js` | `TYPES` `typeInfo` | 18 種屬性的代表色與三語名 |
| `js/i18n.js` | `LANGS` `DEFAULT_LANG` `STRINGS` `makeT` | 介面文字，三語各 70 個 key，必須完全一致 |

### 存取層

| 檔案 | 匯出 | 用途 |
| --- | --- | --- |
| `js/dex.js` | `ENTRIES` `find` `fullName` `speciesName` `formName` `iconAttrs` `hasShiny` `search` `FILTERS` `applyFilter` `goUrl` `artUrl` | 合併 godex 與 extra，1478 個條目。負責名稱組合、搜尋、篩選、圖片備援鏈 |
| `js/store.js` | `emptyData` `newItem` `normalize` `load` `save` `flush` `clear` `toJSON` `fromJSON` `exportName` `MAX_ITEMS` `COLUMNS` | localStorage 讀寫。**任何讀進來的資料都不信任**，一律過 `normalize` |

### 繪製層

| 檔案 | 用途 |
| --- | --- |
| `js/ui.js` | 全部繪製函式。三個檢視共用 |
| `js/share.js` | 分享圖。方格牆版面，兩區上下排列，canvas 畫 PNG，2 倍解析度，深色模式輸出深色版 |

`ui.js` 依檢視分區：

| 區塊 | 主要函式 |
| --- | --- |
| 版面共用 | `renderChrome` `renderViews` `setSidebar` `toast` `openSheet` `closeSheet` `esc` |
| 圖鑑 | `renderFilters` `visibleEntries` `renderGrid` `renderDetail` |
| 交換表 | `renderTrade` `tradeCell` `tradeColumn` `editBlock` |
| 背卡 | `renderBg` `renderCardDetail` |

### 協調層

`js/main.js` —— 唯一有狀態、唯一綁事件的檔案。

- **state**：`data` `lang` `view` `filter` `query` `openId` `openCard`
- **資料流**：使用者操作 → 改 state → `draw()` → `save()`
- **事件**：單一 `document` 委派（click / input / change / keydown）+ `pagehide`
- **偏好與清單分開存**：語言與深淺色在 `poke-change/pref`，
  交換清單在 `poke-change/v1`。這樣「清空全部」不會把語言也重設掉

### 工具

| 檔案 | 用途 |
| --- | --- |
| `tools/build-dex.mjs` | 從 PokeMiners 產生 `js/godex.js`。`--force` 忽略快取重抓。快取在 `tools/.cache/`（不進 git，約 25 MB） |
| `tools/check.mjs` | 自我檢查。i18n key、條目完整性、背卡引用、儲存往返、全部繪製函式、逸出。`--net` 加驗圖片網址 |

### 資源

| 路徑 | 進 git | 內容 |
| --- | --- | --- |
| `img/bg/` | ✓ | 17 張背卡圖，jpg / png / webp 混雜，**寫死檔名前先確認副檔名** |

寶可夢圖片**不鏡像**，一律直接連外部 CDN。3426 張約 75 MB，
放進 repo 不划算，而且是 Niantic 素材。

---

## 常見任務對照

| 想做的事 | 改哪裡 |
| --- | --- |
| GO 出了新寶可夢或新裝扮 | `node tools/build-dex.mjs --force`，缺譯名時補 `js/costumes.js` |
| 新增活動背卡 | `js/backgrounds.js` + 圖放 `img/bg/` |
| 加 `<img>` | **一律用 `iconAttrs()` 產生屬性**，自己寫 `src` 就沒有備援鏈 |
| 改配色、字級、間距 | `css/style.css` 的 `:root` |
| 改介面文字、加語言 | `js/i18n.js`（三語 key 必須一致） |
| 改屬性配色 | `js/types.js` |
| 改分享圖版面 | `js/share.js` 上方的尺寸常數（`CELL` `COLS` `NAME_H`） |
| 改交換表格子長相 | `js/ui.js` 的 `tradeCell` + `css/style.css` 的 `.want-cell` |
| 改一欄的上限 | `js/store.js` 的 `MAX_ITEMS` |

---

## 已知落差

- **裝扮譯名有 4 個代碼是推測的**（`PI`、`2020`、`2021`、`2022`），
  在 `js/costumes.js` 標了 ※，待核對遊戲畫面。
- **`S` 型態譯成「特別」是暫定的**。出現在洛奇亞、鳳王、拉帝亞斯、拉帝歐斯，
  在 `tools/build-dex.mjs` 的 `FORM_OVERRIDE`。
- **尚未部署**。GitHub Pages 還沒設定，repo 也還沒推上去。
