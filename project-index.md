# project-index.md — 專案檔案索引

> poke-change：Pokémon GO 交換清單製作工具。
> 純靜態站（ES modules），無建置流程，無後台，資料存在使用者裝置。
> 這份檔案只講**檔案職責與關係**，資料來源與已知地雷見 `CLAUDE.md`。

---

## 進入點

```
index.html  →  <script type="module" src="./js/main.js">  →  main.js  →  各模組
```

`index.html` 是骨架：頂部列（標題、三個檢視、語言、齒輪與設定面板）、
資訊列、搜尋列（含篩選漏斗與面板）、內容容器、右欄、toast。
所有內容由 `js/ui.js` 在執行時填入。無 build、無 bundler、無 npm。

版面是兩欄：內容與右欄。**沒有側欄**，導覽在頂部列，900 以下掉成貼底的 bar。
右欄（`#sheet`）**三個檢視一律彈出**，平常 `display: none`，
點開東西才靠 `is-open` 打開；形態是**置中的視窗**，900 以下也置中，只是留白縮窄。
常駐右欄（`rail-pop`／`rail-off`／1200 那段）2026-09-14 拿掉了。
檢視 bar 與篩選面板仍是同一段 DOM 兩種形態，繪製函式不需要知道自己在哪。
設定是置中的彈窗（`.modal`），放在 `<header>` 外面，所有寬度同一種形態。

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
                         ├─► store.js        MAX_ITEMS
                         └─► version.js      設定面板底下那行版本號

dex.js ──┬─► godex.js       自動產生的圖鑑資料
         ├─► extra.js       手動補的條目
         ├─► maxdata.js     可極巨化的名單（canMax 查這個）
         ├─► shadowdata.js  可淨化的名單（canPurify 查這個）
         ├─► backgrounds.js 「有背卡可拿」這個篩選條件要用
         ├─► imgchain.js    圖片備援鏈
         └─► types.js       屬性篩選的選項清單

backgrounds.js ──┬─► bgdata.js    自動產生的背卡骨架
                 ├─► bgflags.js   哪張卡的哪一隻能帶哪個條件（cardAllows 查這個）
                 ├─► bgevents.js  手工維護的背卡
                 ├─► bgseries.js  收納夾譯名與順序
                 └─► imgchain.js  圖片備援鏈

tools/build-dex.mjs ──► costumes.js（裝扮譯名）
tools/build-bg.mjs ───► bgseries.js, bgevents.js（產生 bgdata.js）
tools/build-bgflags.mjs ► backgrounds.js, dex.js（產生 bgflags.js）
tools/check.mjs ──────► 全部模組（用 DOM stub 在 Node 跑）
```

**單向依賴，無循環**。`dex.js` 是畫面層唯一的資料入口，
`ui.js` 不直接碰 `godex.js`，這樣換資料來源不會動到畫面。

分層：

| 層 | 檔案 | 特徵 |
| --- | --- | --- |
| 資料 | `godex.js` `extra.js` `costumes.js` `backgrounds.js` `types.js` `i18n.js` `maxdata.js` `shadowdata.js` `bgflags.js` | 純資料，不碰 DOM |
| 存取 | `dex.js` `store.js` | 查詢與讀寫，不碰 DOM |
| 繪製 | `ui.js` `share.js` | 把資料變成畫面，不決定資料怎麼變 |
| 協調 | `main.js` | 保管 state、綁事件、串起以上三層 |

---

## 各檔用途

### 骨架與樣式

| 檔案 | 用途 | 備註 |
| --- | --- | --- |
| `index.html` | 頁面骨架，149 行 | 設定面板要加區塊 → 在 `#settings` 的 `.modal-scroll` 內加 `<section class="side-block">`。圖示一律 inline SVG，不用文字符號 |
| `css/style.css` | 全部樣式 | 設計 token 全在 `:root`。**深色不是反色**，`body.dark` 是另一套值。**斷點只有一個：900px**（1200 那個是常駐右欄用的，2026-09-14 一起拿掉了） |

### 資料層

| 檔案 | 匯出 | 用途 |
| --- | --- | --- |
| `js/godex.js` | `GODEX` `GODEX_COUNT` | **自動產生，不要手改。** 1431 個條目，含 dex / 型態 / 裝扮 / 三語名 / 屬性 / 稀有度 / 圖檔名 / 有無異色 / IV100 的 `cp20` `cp25` `cp50` |
| `js/extra.js` | `PIKA_EXTRA` `DB_EXTRA` `ALIAS` `MISSING_ICON` `extraEntries()` | 手動補 godex 缺的 29 筆：22 種 Choggor 的裝扮皮卡丘、5 種只有 Dittobase 有圖的裝扮，以及沒有 GO 圖示的捷拉奧拉與纏紅鶴。每筆帶 `fill`／`offX`／`offY`，那批圖四周有透明留白，不補這三個值會小一半，數字由 `tools/measure-icons.mjs` 量 |
| `js/costumes.js` | `COSTUME_NAMES` `costumeName()` | 裝扮的三語譯名。**遊戲內裝扮沒有官方名稱**，只能自己取，這是唯一來源 |
| `js/maxdata.js` | `MAX_IDS` `MAX_COUNT` `GMAX_IDS` `GMAX_COUNT` | **自動產生，不要手改。** `MAX_IDS` 151 個可極巨化的條目 id，`GMAX_IDS` 是其中 20 個可超極巨化的（等於圖鑑裡有 `gmaxIcon` 的條目）。決定詳情面板要畫哪幾顆條件鈕，由 `dex.canMax()` / `canGmax()` 查。Dittobase 與 game master 的 `BREAD_MODE` 取聯集，再加 `MANUAL_MAX` 那三筆官方公告有、兩邊都漏的（壺壺、勾魂眼、吼吼鯨），報告在 `tools/max-report.md` |
| `js/shadowdata.js` | `SHADOW_IDS` `SHADOW_COUNT` | **自動產生，不要手改。** 480 個可淨化的條目 id，由 `dex.canPurify()` 查。名單其實是「有沒有暗影版」——能變成暗影的淨化之後就是淨化版。**只做淨化不做暗影**：暗影在 GO 裡不能交換。只有本體與型態，沒有裝扮。主來源 Dittobase 的 `isShadow`，game master 的 `shadow` 設定只當佐證（1015 筆過度包含，連裝扮都有），報告在 `tools/shadow-report.md` |
| `js/bgflags.js` | `BG_FLAGS` | **自動產生，不要手改。** 12 張卡、107 個標記，「這張卡的這一隻能不能帶淨化／極巨化／超極巨化」。1.09.00 取代卡片層級的 `MAX_BATTLE_CARDS`——隊長那三張卡各一百多筆裡只有 6 隻能極巨化，整張放行或整張濾掉都答不對。來源是 Bulbapedia 的逐隻角標，**只涵蓋 77 張卡裡的那 12 張，沒收錄的卡一律沒有旗標** |
| `js/bgdata.js` | `BG_CARDS` `BG_CARD_COUNT` | **自動產生，不要手改。** 240 張背卡骨架，含代號、上游檔名、收納夾、英文名、日期、特效層旗標與寶可夢清單 |
| `js/bgevents.js` | `HAND_EVENTS` | 手工維護的 21 張，有三語名、註記、寶可夢清單與本地備援圖。會逐欄覆蓋骨架。其中 30 週年那四張只蓋名稱與日期，清單等活動辦完 |
| `js/bgseries.js` | `SERIES` `seriesInfo` `seriesOrder` | 23 個收納夾的三語名與顯示順序 |
| `js/types.js` | `TYPES` `typeInfo` | 18 種屬性的代表色與三語名 |
| `js/i18n.js` | `LANGS` `DEFAULT_LANG` `STRINGS` `makeT` | 介面文字，三語各 126 個 key，必須完全一致 |
| `js/version.js` | `VERSION` `VERSION_DATE` | 版本號。**畫面唯一認的值**，`VERSION.md` 是給人看的紀錄，兩邊必須一致，`check.mjs` 會驗 |

### 存取層

| 檔案 | 匯出 | 用途 |
| --- | --- | --- |
| `js/backgrounds.js` | `CARDS` `FOLDERS` `findCard` `bgUrl` `bgAttrs` `bgSources` `cardName` `folderName` `allCards` `entriesOf` `cardsFor` `allBgEntryIds` `totalCardSlots` `cardAllows` | 合併骨架與手工資料，240 張背卡 / 23 個收納夾 / 1579 個收集格 |
| `js/imgchain.js` | `imgAttrs` | 圖片備援鏈。dex 與 backgrounds 共用，獨立成檔是為了不讓那兩個檔繞成一圈 |
| `js/dex.js` | `ENTRIES` `find` `fullName` `speciesName` `formName` `iconAttrs` `hasShiny` `canMax` `canGmax` `canPurify` `search` `FILTER_GROUPS` `GROUP_KEYS` `emptyFilter` `normalizeFilter` `applyFilter` `filterCount` `goUrl` `artUrl` | 合併 godex 與 extra，1460 個條目。負責名稱組合、搜尋、篩選、圖片備援鏈 |
| `js/store.js` | `emptyList` `emptyBook` `current` `newItem` `normalize` `normalizeList` `load` `save` `flush` `clearList` `toJSON` `fromJSON` `exportName` `cleanCode` `formatCode` `MAX_ITEMS` `COLUMNS` `LIST_COUNT` | localStorage 讀寫。三份清單裝在一個 key 裡，`current()` 取目前那一份。**任何讀進來的資料都不信任**，一律過 `normalize` |

### 繪製層

| 檔案 | 用途 |
| --- | --- |
| `js/ui.js` | 全部繪製函式。三個檢視共用 |
| `js/share.js` | 分享圖。方格牆版面，兩區上下排列，canvas 畫 PNG，2 倍解析度，深色模式輸出深色版 |

`ui.js` 依檢視分區：

| 區塊 | 主要函式 |
| --- | --- |
| 版面共用 | `renderChrome` `renderViews` `renderInfoBar` `setPop` `railFoot` `toast` `openSheet` `closeSheet` `esc` |
| 圖鑑 | `renderFilterBar` `renderFilterPanel` `visibleEntries` `renderGrid` `renderDetail` |
| 交換表 | `renderTrade` `tradeCell` `tradeColumn` `editBlock` `renderPicker` `renderPickFoot` `pickHidden` |
| 背卡 | `renderBg` `renderCardDetail` `renderBgFoot` |

### 協調層

`js/main.js` —— 唯一有狀態、唯一綁事件的檔案。

- **state**：`book` `lang` `view` `filter` `pop` `query` `openId` `openCard` `draft` `flash`
  `pick` `pickFilter` `pickMulti` `pickShiny` `bgMulti` `bgSel` `edit`
- **選寶可夢面板的篩選與多選模式放在 `pick` 外面**：`state.pick` 關一次面板就沒了，
  而那兩個要記到下一次按加號。也不跟圖鑑的 `filter` 共用，兩邊在做的事不一樣
- **浮出來的面板只走 `ui.setPop()`**：`state.pop` 是 `null`／`"filter"`／`"settings"`，
  兩顆鈕的 `aria-expanded` 與面板的顯示綁在同一個函式裡，兩邊不會講不同的話，
  也天生擋掉兩片面板同時打開。點外面關掉那一段放在 click 委派最前面，
  因為底下每一段處理完都會 return
- **右欄三個檢視一律彈出**（2026-09-14）：沒點東西就整欄不存在，
  格子牆吃滿寬度。`rail-pop`、`rail-off`、`railHasContent()` 與背卡的
  清單摘要都已移除
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
| `tools/build-max.mjs` | 產生 `js/maxdata.js`。抓 Dittobase 圖鑑頁的 `isDynamax`／`isGigantamax` 旗標，映射到條目 id。兩個來源都漏、但官方公告有的走 `MANUAL_MAX` 指名。**game master 給不出這份名單**（`breadTierGroup` 2467 筆幾乎全有），只能拿它的 `BREAD` 設定佐證。另外寫一份 `tools/max-report.md`。快取在 `tools/.cache/max/` |
| `tools/build-shadow.mjs` | 產生 `js/shadowdata.js`。抓 Dittobase 圖鑑頁的 `isShadow` 旗標，映射到條目 id。**game master 的 `pokemonSettings.shadow` 只當佐證**，那 1015 筆明顯過度包含（連 2019 秋季妙蛙種子都有淨化費用）。報告在 `tools/shadow-report.md`。快取與 build-max 共用 `tools/.cache/max/` |
| `tools/build-bgflags.mjs` | 產生 `js/bgflags.js`。解析 Bulbapedia 的 Background (GO)，抽出逐隻的暗影／極巨化／超極巨化角標。卡片對照 `CARD_MANUAL` 與型態後綴 `SUFFIX` 都是人工指名，**指名前逐張比對過清單內容**。報告在 `tools/bgflags-report.md`，會列出對不到的（多半是我們的卡片清單缺那一隻）。快取在 `tools/.cache/bgflags/` |
| `tools/make-purified-mark.mjs` | 產生 `img/purified-mark.png`。抓 PokeMiners 的 `Images/Rocket/ic_purified.png`，**不是旁邊的 `_filter` 版**（那是圓底的篩選標籤版）。**不膨脹**：它是實心星芒，線條本來就夠粗 |
| `tools/png.mjs` | PNG 讀寫與影像處理（膨脹、降採樣）。`make-max-mark` 與 `make-purified-mark` 共用，只處理 8-bit RGBA，不是通用函式庫 |
| `tools/check.mjs` | 自我檢查。i18n key、版本號兩個檔沒寫岔、extra 的留白欄位齊全、條目完整性、背卡引用、儲存往返、全部繪製函式、逸出。`--net` 加驗圖片網址 |
| `tools/make-max-mark.mjs` | 產生 `img/max-mark.png`。抓 Bulbapedia 的官方符號，**先把細線條加粗再縮**——原圖 185px 直接縮到 20px 會糊掉 |
| `tools/measure-icons.mjs` | 量 `extra.js` 那批圖的主體佔畫布多少、中心偏多少。要連外網。**不自動改檔**，`--list` 印出數字自己貼進 `js/extra.js` |

### 資源

| 路徑 | 進 git | 內容 |
| --- | --- | --- |
| `img/bg/` | ✓ | 17 張背卡的本地備援圖，jpg / png / webp 混雜，**寫死檔名前先確認副檔名** |
| `img/extra/` | ✓ | 5 張上游沒有的裝扮圖。來源沒有 CORS，不收進來就畫不進分享圖 |
| `img/purified-mark.png` | ✓ | 淨化的官方符號，64×64 只有 alpha。顏色由使用端給（`--pur-mark` / canvas），由 `tools/make-purified-mark.mjs` 產生 |
| `img/max-mark.png` | ✓ | 極巨化的官方符號，96×96 只有 alpha。顏色由使用端給（CSS mask／canvas source-in），所以一張圖出兩種顏色。由 `tools/make-max-mark.mjs` 產生 |

寶可夢圖片**不鏡像**，一律直接連外部 CDN。3426 張約 75 MB，
放進 repo 不划算，而且是 Niantic 素材。

### 參考文件

| 檔案 | 用途 |
| --- | --- |
| `docs/go-search-syntax.md` | GO 遊戲內搜尋語法，**英／繁中／日三語對照**。**程式沒有用到**，是之後要做「產生搜尋字串」時的參考。主來源是 Niantic 說明中心 FAQ 1486 的三語原文，未文件化的部分靠社群（leidwesen/SearchPhrases）。查不到的一律寫「未確認」，用之前每一條都要實測 |

---

## 常見任務對照

| 想做的事 | 改哪裡 |
| --- | --- |
| GO 出了新寶可夢或新裝扮 | `node tools/build-dex.mjs --force`，缺譯名時補 `js/costumes.js` |
| GO 出了新背卡 | `node tools/build-bg.mjs --force`，骨架會自己長出來 |
| 補背卡的寶可夢清單或譯名 | `js/bgevents.js`，會覆蓋骨架 |
| 改收納夾的名稱或順序 | `js/bgseries.js`；改分類規則是 `tools/build-bg.mjs` 的 `SERIES_RULES` |
| 加 `<img>` | **一律用 `iconAttrs()` 產生屬性**，自己寫 `src` 就沒有備援鏈，外部圖也不會放大回正常尺寸 |
| extra 換了圖或加了條目 | `node tools/measure-icons.mjs --list`，把 `fill`／`offX`／`offY` 貼進 `js/extra.js` |
| 改配色、字級、間距 | `css/style.css` 的 `:root`。改了顏色要同步 `js/share.js` 的 `LIGHT`／`DARK`，canvas 吃不到 CSS 變數 |
| 改篩選面板的分組順序 | `js/ui.js` 的 `FGROUPS` |
| 改詳情面板顯示哪幾個等級的 CP | `js/ui.js` 的 `CP_LEVELS`，數字要對得上 godex 的欄位名 |
| 改設定面板裡有什麼 | `index.html` 的 `#settings` 裡的 `.modal-scroll`，內容由 `renderChrome` 填 |
| 改檢視的圖示 | `js/ui.js` 的 `VIEW_ICONS` |
| 改設定裡三個顯示選項 | `js/ui.js` 的 `DISP_THUMBS`（縮圖）與 `dispGroup()`（一項一組）。外觀那兩張的顏色寫死，改配色要跟著改 |
| 改手機底部 bar 的高度 | `css/style.css` 的 `--tab-h`，內容區的底部內距吃同一個值 |
| 改資訊列顯示什麼 | `js/main.js` 的 `draw()`，文字翻好再傳給 `renderInfoBar` |
| 改右欄寬度或收起的斷點 | `css/style.css` 的 `--rail-w` 與 1200px 那段查詢 |
| 改介面文字、加語言 | `js/i18n.js`（三語 key 必須一致） |
| 升版 | `js/version.js` 的兩個常數 + `VERSION.md` 補一筆，兩邊號碼與日期要一樣 |
| 改屬性配色 | `js/types.js` |
| 改分享圖版面 | `js/share.js` 上方的尺寸常數（`CELL` `COLS` `NAME_H`） |
| 改交換表格子長相 | `js/ui.js` 的 `tradeCell` + `css/style.css` 的 `.want-cell` |
| 改交換表格子的刪除鈕 | `css/style.css` 的 `.want-del`。紅圓一半露在框外，所以 `.want-tile` **不能**有 `overflow: hidden`；觸控裝置平常藏著，靠欄標題那顆鉛筆（`.edit-btn`）切換 `.grid.editing` 才出現 |
| 改詳情面板的順序 | `js/ui.js` 的 `renderDetail`，由上到下就是操作順序 |
| 改一欄的上限 | `js/store.js` 的 `MAX_ITEMS` |
| GO 開放新的寶可夢可以極巨化 | `node tools/build-max.mjs --force`，名單會自己長出來 |
| 上游補了缺的超極巨化圖 | `node tools/build-dex.mjs --force` 就好，`gmaxIcon` 會自己長出來 |
| 改極巨化的符號 | 圖是 `img/max-mark.png`（`tools/make-max-mark.mjs` 產生），顏色是 `css/style.css` 的 `--max-mark`／`--gmax-mark`，分享圖那份在 `js/share.js` 的 `maxMark`／`gmaxMark`。詳情面板那顆靠 `.d-icon` 定位 |
| 超極巨化勾了要換的圖 | `js/godex.js` 的 `gmaxIcon`（由 `build-dex.mjs` 的 `GMAX_ICONS` 掛到本體），畫面走 `dex.iconAttrs(e, shiny, gmax)` |
| 改清單份數 | `js/store.js` 的 `LIST_COUNT`，分頁樣式在 `css/style.css` 的 `.list-tabs` |
| 改背卡詳情的卡面圖大小 | `css/style.css` 的 `.card-art`（限高 38vh，寬度 auto） |
| GO 開放新的寶可夢可以淨化 | `node tools/build-shadow.mjs --force`，名單會自己長出來 |
| 某張卡的某一隻可以帶某個條件 | `js/bgflags.js`（自動產生）。改 `tools/build-bgflags.mjs` 的 `CARD_MANUAL` 再重跑；**卡片對照要先逐張比對清單內容**，不要照名字猜 |
| 改淨化的符號 | 圖是 `img/purified-mark.png`（`tools/make-purified-mark.mjs` 產生），顏色是 `css/style.css` 的 `--pur-mark`，分享圖那份在 `js/share.js` 的 `purMark` |
| 勾了條件該列哪些背卡 | `js/bgflags.js` 的逐隻旗標。過濾走 `cardsFor(id, { purified, max, gmax })`，只影響列出什麼，不洗存進去的值。`opts.keep` 保住使用者自己選著的那張 |
| 條件與背卡的衝突清除 | `js/main.js` 兩條路：草稿在 `data-draft` 那段、已加入那筆在 `setField`。三方互斥的名單是 `EXCLUSIVE`，`store.cleanItem` 再收斂一次 |
| 改背卡詳情的批次加入 | `js/ui.js` 的 `renderCardDetail`（多選時的格子）與 `renderBgFoot`（底部兩顆鈕）。加進去帶哪些條件在 `js/main.js` 的 `addMany` |
| 改選寶可夢面板 | `js/ui.js` 的 `renderPicker`，一次最多畫 `PICK_MAX` 筆。多選的底部動作列是 `renderPickFoot`，殼在 `index.html` 的 `#pickFoot` |
| 改那個面板的篩選 | 跟圖鑑同一組 `FILTER_GROUPS`，HTML 走共用的 `pickedChips` / `filterGroups`，dataset 前綴由 `FATTR` 給。**改篩選不清掉選取**，畫面上看不到的那幾隻由 `countHidden` / `pickHidden` 算出來，底部補一句交代 |
| 加篩選條件 | `js/dex.js` 的 `FILTER_GROUPS`，標籤補 `js/i18n.js`，面板裡的組序在 `js/ui.js` 的 `FGROUPS` |
| 改手機的欄數 | `css/style.css` 的 `--cell-cols`，900px 以下講死不推算 |
| 改選寶可夢面板的欄數 | 單選吃 `--cell-cols`、多選（720 寬）吃 `--pick-wide-cols`，兩組都在 `:root` 與 `body.big-icons`。跟著設定的大小圖示走，不要改成推算 |
| 改格子大小的兩段值 | `css/style.css` 的 `--cell-*`，桌機在 `:root`，手機在斷點內 |

---

## 已知落差

- **裝扮譯名不是官方名稱**，官方根本沒給裝扮命名。全部是看圖自己取的，
  原則是「看得出是哪一個」。覺得不好認就直接改 `js/costumes.js`，
  型態的部分改 `tools/build-dex.mjs` 的 `FORM_OVERRIDE`，改完重跑腳本。
- **沒有自由備註欄，這是刻意的**。備註只有自己看得到，對方收到的是
  分享圖，讀不到任何文字欄位。條件要能傳達就得畫得出來，所以只留
  異色、XXL、XXS、背卡這四個維度。`note` 已於 2026-09-10 移除。
