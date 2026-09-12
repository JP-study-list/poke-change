# project-index.md — 專案檔案索引

> poke-change：Pokémon GO 交換清單製作工具。
> 純靜態站（ES modules），無建置流程，無後台，資料存在使用者裝置。
> 這份檔案只講**檔案職責與關係**，資料來源與已知地雷見 `CLAUDE.md`。

---

## 進入點

```
index.html  →  <script type="module" src="./js/main.js">  →  main.js  →  各模組
```

`index.html` 114 行，是骨架：頂部列（標題、三個檢視、語言、齒輪與設定面板）、
資訊列、搜尋列（含篩選漏斗與面板）、內容容器、右欄、toast。
所有內容由 `js/ui.js` 在執行時填入。無 build、無 bundler、無 npm。

版面是兩欄：內容與右欄。**沒有側欄**，導覽在頂部列，900 以下掉成貼底的 bar。
右欄（`#sheet`）在 1200 以上常駐，以下退回彈出。
檢視 bar、右欄、篩選面板、設定面板都是同一段 DOM 兩種形態，
繪製函式不需要知道自己在哪。

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

dex.js ──┬─► godex.js       自動產生的圖鑑資料
         ├─► extra.js       手動補的條目
         ├─► backgrounds.js 「有背卡可拿」這個篩選條件要用
         ├─► imgchain.js    圖片備援鏈
         └─► types.js       屬性篩選的選項清單

backgrounds.js ──┬─► bgdata.js    自動產生的背卡骨架
                 ├─► bgevents.js  手工維護的背卡
                 ├─► bgseries.js  收納夾譯名與順序
                 └─► imgchain.js  圖片備援鏈

tools/build-dex.mjs ──► costumes.js（裝扮譯名）
tools/build-bg.mjs ───► bgseries.js, bgevents.js（產生 bgdata.js）
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
| `index.html` | 頁面骨架，114 行 | 設定面板要加區塊 → 在 `#settings` 內加 `<section class="side-block">`。圖示一律 inline SVG，不用文字符號 |
| `css/style.css` | 全部樣式 | 設計 token 全在 `:root`。**深色不是反色**，`body.dark` 是另一套值。斷點兩個：900px（手機）與 1200px（右欄收起） |

### 資料層

| 檔案 | 匯出 | 用途 |
| --- | --- | --- |
| `js/godex.js` | `GODEX` `GODEX_COUNT` | **自動產生，不要手改。** 1435 個條目，含 dex / 型態 / 裝扮 / 三語名 / 屬性 / 稀有度 / 圖檔名 / 有無異色 / IV100 的 `cp20` `cp25` `cp50` |
| `js/extra.js` | `PIKA_EXTRA` `DB_EXTRA` `ALIAS` `MISSING_ICON` `extraEntries()` | 手動補 godex 缺的 29 筆：22 種 Choggor 的裝扮皮卡丘、5 種只有 Dittobase 有圖的裝扮，以及沒有 GO 圖示的捷拉奧拉與纏紅鶴 |
| `js/costumes.js` | `COSTUME_NAMES` `costumeName()` | 裝扮的三語譯名。**遊戲內裝扮沒有官方名稱**，只能自己取，這是唯一來源 |
| `js/bgdata.js` | `BG_CARDS` `BG_CARD_COUNT` | **自動產生，不要手改。** 240 張背卡骨架，含代號、上游檔名、收納夾、英文名、日期、特效層旗標與寶可夢清單 |
| `js/bgevents.js` | `HAND_EVENTS` | 手工維護的 21 張，有三語名、註記、寶可夢清單與本地備援圖。會逐欄覆蓋骨架。其中 30 週年那四張只蓋名稱與日期，清單等活動辦完 |
| `js/bgseries.js` | `SERIES` `seriesInfo` `seriesOrder` | 23 個收納夾的三語名與顯示順序 |
| `js/types.js` | `TYPES` `typeInfo` | 18 種屬性的代表色與三語名 |
| `js/i18n.js` | `LANGS` `DEFAULT_LANG` `STRINGS` `makeT` | 介面文字，三語各 106 個 key，必須完全一致 |

### 存取層

| 檔案 | 匯出 | 用途 |
| --- | --- | --- |
| `js/backgrounds.js` | `CARDS` `FOLDERS` `findCard` `bgUrl` `bgAttrs` `bgSources` `cardName` `folderName` `allCards` `entriesOf` `cardsFor` `allBgEntryIds` `totalCardSlots` | 合併骨架與手工資料，240 張背卡 / 23 個收納夾 / 1579 個收集格 |
| `js/imgchain.js` | `imgAttrs` | 圖片備援鏈。dex 與 backgrounds 共用，獨立成檔是為了不讓那兩個檔繞成一圈 |
| `js/dex.js` | `ENTRIES` `find` `fullName` `speciesName` `formName` `iconAttrs` `hasShiny` `search` `FILTER_GROUPS` `GROUP_KEYS` `emptyFilter` `normalizeFilter` `applyFilter` `filterCount` `goUrl` `artUrl` | 合併 godex 與 extra，1464 個條目。負責名稱組合、搜尋、篩選、圖片備援鏈 |
| `js/store.js` | `emptyList` `emptyBook` `current` `newItem` `normalize` `normalizeList` `load` `save` `flush` `clearList` `toJSON` `fromJSON` `exportName` `cleanCode` `formatCode` `MAX_ITEMS` `COLUMNS` `LIST_COUNT` | localStorage 讀寫。三份清單裝在一個 key 裡，`current()` 取目前那一份。**任何讀進來的資料都不信任**，一律過 `normalize` |

### 繪製層

| 檔案 | 用途 |
| --- | --- |
| `js/ui.js` | 全部繪製函式。三個檢視共用 |
| `js/share.js` | 分享圖。方格牆版面，兩區上下排列，canvas 畫 PNG，2 倍解析度，深色模式輸出深色版 |

`ui.js` 依檢視分區：

| 區塊 | 主要函式 |
| --- | --- |
| 版面共用 | `renderChrome` `renderViews` `renderInfoBar` `setPop` `toast` `openSheet` `closeSheet` `esc` |
| 右欄 | `renderRailSummary`（背卡沒有詳情可顯示時的預設內容，只有那個檢視用） |
| 圖鑑 | `renderFilterBar` `renderFilterPanel` `visibleEntries` `renderGrid` `renderDetail` |
| 交換表 | `renderTrade` `tradeCell` `tradeColumn` `editBlock` `renderPicker` |
| 背卡 | `renderBg` `renderCardDetail` |

### 協調層

`js/main.js` —— 唯一有狀態、唯一綁事件的檔案。

- **state**：`book` `lang` `view` `filter` `pop` `query` `openId` `openCard` `draft` `flash` `pick`
- **浮出來的面板只走 `ui.setPop()`**：`state.pop` 是 `null`／`"filter"`／`"settings"`，
  兩顆鈕的 `aria-expanded` 與面板的顯示綁在同一個函式裡，兩邊不會講不同的話，
  也天生擋掉兩片面板同時打開。點外面關掉那一段放在 click 委派最前面，
  因為底下每一段處理完都會 return
- **右欄一定要重畫**：它是常駐的，`closePanels()` 清掉 state 之後必須
  接 `drawDetail()`，否則桌機會停在剛才那個詳情，關不掉也回不到摘要
- **右欄的預設摘要只有背卡擺**：`railHasContent()` 認的是 `state.view === "bg"`。
  圖鑑與交換表沒點開東西時整欄收起（`body.rail-off`），格子牆吃滿寬度
- **三份清單**：`state.book` 是整包，`cur()` 取目前那一份。畫面與操作一律只碰那一份
- **資料流**：使用者操作 → 改 state → `draw()` → `save()`
- **事件**：單一 `document` 委派（click / input / change / keydown）+ `pagehide`
- **偏好與清單分開存**：語言與深淺色在 `poke-change/pref`，
  交換清單在 `poke-change/v1`。這樣「清空全部」不會把語言也重設掉

### 工具

| 檔案 | 用途 |
| --- | --- |
| `tools/build-dex.mjs` | 從 PokeMiners 產生 `js/godex.js`，含 IV100 的三個 CP（倍率取自 game master 的 `PLAYER_LEVEL_SETTINGS`）。`--force` 忽略快取重抓。快取在 `tools/.cache/`（不進 git，約 25 MB） |
| `tools/build-bg.mjs` | 產生 `js/bgdata.js`。PokeMiners 給代號與圖，Dittobase 給寶可夢清單，Serebii 給日期並墊底，Bulbapedia 只做交叉比對。兩邊叫法不同接不上的走 `DB_MANUAL`／`SEREBII_MANUAL` 人工指名，`resolveMatches` 擋掉兩張卡搶同一筆。另外寫一份 `tools/bg-report.md`。快取在 `tools/.cache/bg/` |
| `tools/check.mjs` | 自我檢查。i18n key、條目完整性、背卡引用、儲存往返、全部繪製函式、逸出。`--net` 加驗圖片網址 |

### 資源

| 路徑 | 進 git | 內容 |
| --- | --- | --- |
| `img/bg/` | ✓ | 17 張背卡的本地備援圖，jpg / png / webp 混雜，**寫死檔名前先確認副檔名** |
| `img/extra/` | ✓ | 5 張上游沒有的裝扮圖。來源沒有 CORS，不收進來就畫不進分享圖 |

寶可夢圖片**不鏡像**，一律直接連外部 CDN。3426 張約 75 MB，
放進 repo 不划算，而且是 Niantic 素材。

---

## 常見任務對照

| 想做的事 | 改哪裡 |
| --- | --- |
| GO 出了新寶可夢或新裝扮 | `node tools/build-dex.mjs --force`，缺譯名時補 `js/costumes.js` |
| GO 出了新背卡 | `node tools/build-bg.mjs --force`，骨架會自己長出來 |
| 補背卡的寶可夢清單或譯名 | `js/bgevents.js`，會覆蓋骨架 |
| 改收納夾的名稱或順序 | `js/bgseries.js`；改分類規則是 `tools/build-bg.mjs` 的 `SERIES_RULES` |
| 加 `<img>` | **一律用 `iconAttrs()` 產生屬性**，自己寫 `src` 就沒有備援鏈 |
| 改配色、字級、間距 | `css/style.css` 的 `:root`。改了顏色要同步 `js/share.js` 的 `LIGHT`／`DARK`，canvas 吃不到 CSS 變數 |
| 改篩選面板的分組順序 | `js/ui.js` 的 `FGROUPS` |
| 改詳情面板顯示哪幾個等級的 CP | `js/ui.js` 的 `CP_LEVELS`，數字要對得上 godex 的欄位名 |
| 改設定面板裡有什麼 | `index.html` 的 `#settings`，內容由 `renderChrome` 填 |
| 改檢視的圖示 | `js/ui.js` 的 `VIEW_ICONS` |
| 改手機底部 bar 的高度 | `css/style.css` 的 `--tab-h`，內容區的底部內距吃同一個值 |
| 改資訊列顯示什麼 | `js/main.js` 的 `draw()`，文字翻好再傳給 `renderInfoBar` |
| 改右欄寬度或收起的斷點 | `css/style.css` 的 `--rail-w` 與 1200px 那段查詢 |
| 改介面文字、加語言 | `js/i18n.js`（三語 key 必須一致） |
| 改屬性配色 | `js/types.js` |
| 改分享圖版面 | `js/share.js` 上方的尺寸常數（`CELL` `COLS` `NAME_H`） |
| 改交換表格子長相 | `js/ui.js` 的 `tradeCell` + `css/style.css` 的 `.want-cell` |
| 改詳情面板的順序 | `js/ui.js` 的 `renderDetail`，由上到下就是操作順序 |
| 改一欄的上限 | `js/store.js` 的 `MAX_ITEMS` |
| 改清單份數 | `js/store.js` 的 `LIST_COUNT`，分頁樣式在 `css/style.css` 的 `.list-tabs` |
| 改選寶可夢面板 | `js/ui.js` 的 `renderPicker`，一次最多畫 `PICK_MAX` 筆 |
| 加篩選條件 | `js/dex.js` 的 `FILTER_GROUPS`，標籤補 `js/i18n.js`，面板裡的組序在 `js/ui.js` 的 `FGROUPS` |
| 改手機的欄數 | `css/style.css` 的 `--cell-cols`，900px 以下講死不推算 |
| 改格子大小的兩段值 | `css/style.css` 的 `--cell-*`，桌機在 `:root`，手機在斷點內 |

---

## 已知落差

- **裝扮譯名不是官方名稱**，官方根本沒給裝扮命名。全部是看圖自己取的，
  原則是「看得出是哪一個」。覺得不好認就直接改 `js/costumes.js`，
  型態的部分改 `tools/build-dex.mjs` 的 `FORM_OVERRIDE`，改完重跑腳本。
- **沒有自由備註欄，這是刻意的**。備註只有自己看得到，對方收到的是
  分享圖，讀不到任何文字欄位。條件要能傳達就得畫得出來，所以只留
  異色、XXL、XXS、背卡這四個維度。`note` 已於 2026-09-10 移除。
