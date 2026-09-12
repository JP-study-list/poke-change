# CLAUDE.md — 開發規範與專案脈絡（單一檔）

> 本檔為通用規範 + 本專案技術背景的合併檔，放在專案根目錄，Claude Code 啟動時自動載入。
> 新 repo 只需複製本檔（§0~§7 通用部分照抄），第一次對 Claude Code 說「初始化這個專案」，
> 其餘檔案（project-index.md、progress.md）與 §8 專案背景會自動長出來（見 §1 自舉）。
>
> ⚠️ 本檔會 commit 上公開 repo。**嚴禁寫入任何 secret**（見 §4 規則 D 的可寫/不可寫清單）。

---

## 0. 語言與溝通
- 一律使用**繁體中文**回覆。
- 解釋精簡、切中要點，節省 token。

---

## 1. 啟動 SOP（每次新 session 開場）

### 一般啟動
1. 讀 `project-index.md`（全部）——掌握結構與各檔用途，**不重掃全部原始碼**。
2. 讀 `progress.md` **最新 3~5 筆**——掌握上次進度與待辦。
3. 需動到某檔時，才針對性讀該檔。

### 首次進專案 / 使用者說「初始化這個專案」時（自舉）
依序執行，**全程只新增、不刪除、不覆蓋**：
1. **讀**現有全部檔案（唯讀，不動任何一個）。
2. 若 `project-index.md` **不存在** → 自動生成；若已存在 → 更新，**絕不覆蓋既有內容**。
3. 若 `progress.md` **不存在** → 建立空模板；若已存在 → 保留。
4. 訪談使用者補齊 §8 專案技術背景，寫進本檔 §8 區塊。
   - **只問非機密項**（Project ID、collection 結構、部署 branch 等）。
   - 遇到金鑰類（`/exec` URL、API key）→ **不寫進本檔**，改提醒使用者放 `.env`，本檔只記指標。

> **自舉硬規則**：初始化流程明文禁止任何 `rm`、覆寫、`git reset` 等破壞既有檔案的操作。只建立不存在的檔。

---

## 2. 開發流程規範（嚴格執行）

收到任何工具／功能開發請求時，**不得立即寫程式碼**。依序：

### Phase 1：需求確認（必做）
1. 用自己的話覆述需求。
2. 提釐清問題，涵蓋：使用情境（手機／桌機／網頁、頻率）、核心功能（MVP vs. 加分）、UI 偏好（語言預設繁中、深/淺色、版面）、資料處理（需持久化？存哪？）、技術限制（單一 HTML？React？GitHub Pages？）。
3. 一次最多 3~5 個關鍵問題，不洗版。

### Phase 2：提案（必做）
- 功能清單（MVP vs. 未來擴充）
- 技術方案 + 一句話理由
- UI 結構文字描述（免圖）
- 結尾問：「確認後才動工，有要調整的嗎？」

### Phase 3：實作
- 僅在明確說「start／確認／go ahead」後開始寫碼。
- 驗證與 review 嚴謹徹底；交付前自我檢查功能完整性。

### 例外
- 瑣碎請求（一行 CSS、明顯 bug）可跳過，但先說「Simple request, proceeding directly」。

### 中途變更
- 需求中途更動且影響架構 → **先指出影響範圍**再動手。

---

## 3. 交付原則（本機環境）
- 直接讀寫本機檔案，不再提供「完整檔案手動貼回／ZIP」。
- 偏好乾淨美學：衝突時，簡潔 > 附加功能；果斷、直接。
- 期望根因診斷，不要表面修復。

---

## 4. 本機環境安全與協作規則（ABCD）

### A. Commit 規範
- **允許直接 commit**，不需事前確認。
- 訊息格式：`feat:` / `fix:` / `refactor:` / `docs:` / `chore:` 前綴 + 繁中摘要。
  - 例：`fix: 修正背景卡 shiny 切換未同步 Firestore`

### B. 破壞性操作前先確認（最高優先，不因 A 而放寬）
- 以下操作**必須先說明影響範圍並等待明確同意**：
  - 刪除檔案、`rm`
  - `git reset --hard`、`git push -f`、`git rebase`
  - 大範圍重構、跨多檔結構性變更
- Commit 可逆，故 A 放行；上述不可逆，故一律先問。不確定是否具破壞性時，先問。

### C. 本機測試優先於宣稱完成
- 宣稱「完成」前，能本機驗證的先驗證：起 server、看 console、跑既有測試。
- 不憑「讀過碼看起來對」就宣稱完成。

### D. Secrets 不進 git（含本 CLAUDE.md）
本檔會上公開 repo，界線如下：

**可寫進本檔（非機密）：**
- Firebase **Project ID**（本就出現在前端 config，非機密）
- Firestore collection 結構、key 設計原則
- 部署 branch、GitHub Pages 網域
- 使用的 API、資料來源、cron 時間
- 已知地雷

**絕不寫進本檔（外置到 `.env` / `config.local.js`，並列入 `.gitignore`）：**
- Apps Script `/exec` URL（等同後端入口，視為機密）
- 任何 API key / token / 私鑰、service account 憑證

本檔只記**指標**，例：`Apps Script /exec URL 存於 .env 的 APPS_SCRIPT_URL（不進 git）`。

> 註：Firebase 前端 `apiKey` 並非密鑰，本就暴露於客戶端，靠 Firestore Security Rules 保護；重點是 Rules 有沒有寫好，而非藏 key。Apps Script `/exec` URL 則須當機密。

---

## 5. 檔案維護機制

### progress.md — 開發歷史（每次改檔即更新）
- 反向時間序（最新在上）。
- 欄位：
  ```
  ## YYYY-MM-DD
  - 類型：新增 / 修正 / 重構
  - 影響檔案：xxx.html, yyy.js
  - 摘要：做了什麼
  - 原因：為什麼
  - 待辦/已知問題：（可留空）
  ```
- 小改允許精簡：只填「日期 + 類型 + 摘要」。

### project-index.md — 專案檔案索引（首次建立，每次改檔同步）
- 每個檔案的用途、彼此關係、進入點。
- 檔案新增／刪除／職責變動 → 同步更新。

---

## 6. 技術教訓（跨專案通用原則）

> 以下為既往踩坑固化的原則。**若當下發現更優解，先提出與使用者討論，不擅自沿用舊規則、也不默默改掉。**

- **Firestore key 設計**：用穩定 ID（`p###`、costume ID）當 key，seed 變動不破壞既有紀錄；只存狀態，不存顯示資料。
- **Apps Script 部署**：一律**編輯現有 deployment**（鉛筆 → 新版本 → 部署）保留 `/exec` URL，絕不新建 deployment。
- **Base64 圖片**：存 Firestore <700KB；iOS Shortcut Base64 encode 關閉換行。
- **GitHub Actions cron**：避開 UTC 午夜，偏移如 `43 0 * * *`。
- **日期／時區**：Taiwan UTC+8，日期邏輯用 local time 格式化，**不用 `toISOString()`**。
- **Google Maps API**：tile 依 ToS 不可快取；離線資料由 Firestore `persistentLocalCache` 處理。
- **靜態站資料源**：AniList GraphQL 支援 CORS 免金鑰；Nominatim 1 req/sec、免金鑰。
- **iOS Shortcut 分享**：LINE Flex Message 擷取走「截圖 → OCR」最可靠。
- **fast-flights**：用 `FlightQuery` / `create_query`（v3.x）；`FlightData` 為破壞性移除。
- **圖片格式**：背景卡等圖片 jpg/png/webp 混雜，寫死檔名前**先確認格式**。

---

## 7. 環境差異備註（vs. Artifact）
- 本機開發可用 localStorage／IndexedDB 除錯；線上部署 GitHub Pages 時，持久化仍走 Firestore。
- 本機可實跑、可 git、可 build/test —— review 標準相應提高。

---

## 8. 專案技術背景【poke-change / 交換所】

### 這個專案在做什麼
Pokémon GO 交換清單製作工具。用圖鑑找出活動裝扮、地區型與背卡寶可夢，
排出「想要」與「可以給」兩份清單，產生分享圖傳給對方。

**差異化在資料庫深度**，不在介面。一般交換工具只收一般型態，
這裡收 1464 個條目，其中 303 個裝扮橫跨一百多個物種，
再加 240 張背卡收在 23 個收納夾裡、1579 個收集格。

背卡的圖與代號抓得到上游，「哪些寶可夢帶得了這張背卡」上游沒有，
靠 Dittobase 補、Serebii 與 Bulbapedia 交叉比對。240 張裡 229 張有清單。

### 技術棧（一行摘要）
純靜態站：ES modules，無建置流程，無後台，資料存在使用者裝置的 localStorage。

### 沒有 Firebase，也不會有
刻意的決定。核心原則是**壓低營運成本到只剩網域年費**。
沒有帳號、沒有雲端、沒有跨裝置同步。代價是使用者換裝置就沒了，
所以匯出備份必須是一等公民，不能藏在設定裡。

**iOS Safari 會清掉 localStorage**（長期沒互動的網站，大約兩週）。
這擋不掉，只能靠匯出提醒。警語現在住在設定面板的資料區，
跟匯出鈕放在一起（2026-09-12 側欄拆掉時使用者指定只放那裡）。
它不是被弄丟了，不要再搬回畫面上，但也不要刪掉。

### 儲存結構
```
localStorage["poke-change/v1"]     交換清單（key 沒換，版本號從 1 變 2）
  { v:2, active:0, lists:[ list, list, list ], updated }
  list：{ name, want:[...], have:[...] }
  項目：{ id, shiny, xxl, xxs, bg }
  同一個 id 在同一欄可以有好幾筆，靠背卡與條件區分
  （想要皮卡丘的鑽石背卡版，也想要珍珠背卡版，就是兩格）

localStorage["poke-change/pref"]   偏好
  { lang, dark, big, names, code }
  big   大圖示。預設 false，手機一排五隻
  names 格子下方顯示名稱。預設 true
  code  友情碼，只存數字，只印在分享圖上
```

兩個 key 分開存，「清空這份清單」只清前者裡的一份，不會把語言也重設掉。

**三份清單是刻意的上限，不是設定值。** 分頁一排三個剛好，多了手機擠不下。
一次只顯示一份，分享圖也只印目前這一份。

**讀進來的資料一律不信任**，全部過 `store.normalize()`。
localStorage 使用者可以手動改，也可能是舊版寫的。

### 條目 id 設計（三個不可違反的原則）
1. **只存使用者的選擇**，名稱、圖片、屬性一律以 `dex.js` 為準。
   圖鑑更新、改譯名、補裝扮都不影響既有紀錄，不需要資料遷移。
2. **id 一旦發布就不能改**。它是使用者紀錄的鍵。
3. **id 的形狀**：
   ```
   d150                    一般
   d150.fA                 型態變化
   d25.cHALLOWEEN_2017     裝扮
   d25.xREDS_HAT           裝扮，圖片來自外部個人專案
   ```

### 資料來源

| 用途 | 來源 | 風險 |
| --- | --- | --- |
| 遊戲數值、型態清單 | PokeMiners/game_masters | 低 |
| GO 圖示、官方三語名稱 | PokeMiners/pogo_assets | 低 |
| 部分裝扮皮卡丘 | Choggor/Pikachu-costume-tracker | **中，個人專案** |
| 前兩個都沒有的裝扮圖 | 自己的 `img/extra/`，5 張 | 無 |
| 立繪備援 | PokeAPI/sprites | 低 |
| 背卡圖與代號 | PokeMiners/pogo_assets `Images/LocationCards/` | 低 |
| 背卡的寶可夢清單 | Dittobase（一次性離線抽取，含型態） | **中，別人的網站** |
| 背卡的日期與英文名 | Serebii（一次性離線抽取） | **中，別人的網站** |
| 背卡清單的交叉比對 | Bulbapedia（只比對，不進資料） | **中，別人的網站** |
| 背卡的本地備援圖 | 自己的 `img/bg/`，17 張 | 無 |

`tools/build-dex.mjs` 離線解析前兩者產生 `js/godex.js`，
網站執行時不會抓這些檔案。GO 更新後重跑腳本即可。

**圖片原則上不鏡像進 repo**。3426 張約 75 MB，而且是 Niantic 素材，
進了 git 歷史要拿掉得改寫歷史。一律直接連外部 CDN。
例外是背卡的備援圖與 `img/extra/` 那 5 張，來源沒有 CORS，
不收進來就畫不進分享圖。兩者合計不到 2 MB。

### 部署
- 線上網址：`https://jp-study-list.github.io/poke-change/`
- repo：`JP-study-list/poke-change`，公開
- GitHub Pages **Source：`main` 根目錄**（不是 GitHub Actions）
  - 這個專案的圖片不鏡像，沒有建置流程，所以不需要 Actions
  - push 即生效，不用等
- 之後：轉私人 repo + Cloudflare Pages + 自有網域。
  轉私人後免費方案的 Pages 會停掉，所以兩件事要一起做

### 已知地雷（本專案特有）

- **`.g2` 是同一個條目的新版渲染**，不是不同條目。解析圖檔名時要去掉，
  否則每個裝扮都會變成兩筆。

- **裝扮在上游有兩套命名**：`.cCODE` 與 `.fCODE`。同一個活動有時歸型態、
  有時歸裝扮，所以合併重複時不能只看其中一種。

- **`_NOEVOLVE` 是遊戲機制不是外觀**（穿了不能進化）。同一個裝扮可能同時有
  `X` 與 `X_NOEVOLVE` 兩個代碼，圖鑑要合併成一筆，否則會出現兩張一樣的卡。

- **上游大小寫會不一致**（出現過 `fMay_2023` 與 `fMAY_2023`），
  代碼一律轉大寫再比對。

- **型態與裝扮可以並存**（例如南瓜精四種尺寸各有萬聖節版），
  組名稱時兩個標籤都要留，否則四筆會變成一模一樣的「2022 萬聖節」。

- **異色是否實裝，game master 沒有旗標**。靠「有沒有異色圖檔」判斷。
  實測熊徒弟、武道熊師、眷戀雲確實沒有異色圖，與已知情況相符。

- **超級進化、極巨化與原始回歸不是可交換條目**，是戰鬥中的暫時狀態，
  產生時整批排除。原始回歸是 2026-09-12 才補進這條的，它跟超級進化同一類，
  而且 game master 連基礎數值都沒給它。

- **阿爾宙斯暫時隱藏**（2026-09-12，使用者要求）。GO 還沒實裝，上游只有圖，
  18 個屬性型態的數值一模一樣、多半沒有官方譯名，畫面上是一整排
  「Bug-Type form」。名單在 `tools/build-dex.mjs` 的 `HIDDEN_DEX`，
  實裝之後刪掉編號重跑就會回來，id 不會變。

- **裝扮沒有官方名稱**。遊戲內只顯示物種名，語言檔查不到。
  譯名全部在 `js/costumes.js` 自己維護，原則是看圖命名、看得出是哪一個，
  不必去猜代碼原本的含意。`fS` 那類沒有譯名的型態同理，
  改 `tools/build-dex.mjs` 的 `FORM_OVERRIDE`。

- **捷拉奧拉與纏紅鶴上游沒有 GO 圖示**（`pm807` 與 `pm973` 的 icon 都 404），
  在 `js/extra.js` 手動補，用官方立繪。纏紅鶴是背卡帶出來的：
  嘉年華那兩張的清單只有牠一隻，圖鑑沒收那兩張就是空的。

- **外部圖沒有 CORS 標頭就不能畫進分享圖**。畫面上的 `<img>` 不受影響，
  但 canvas 的 `crossOrigin="anonymous"` 會載入失敗而退回備援。
  Dittobase 的 CDN 就是這種，所以那 5 張改成鏡像進 `img/extra/`。
  Choggor 與 PokeMiners 走 raw.githubusercontent，有 `access-control-allow-origin: *`，沒這個問題。

- **`js/extra.js` 補的條目會跟 godex 搶同一個裝扮**。上游補上之後
  兩邊都有，圖鑑就會出現兩張一樣的卡，而且是兩個不同的 id。
  `extraEntries()` 會擋掉，比對規則是代碼轉小寫、底線換連字號、去掉
  `_NOEVOLVE`，命名不同的走 `ALIAS`。`check.mjs` 會提醒哪幾筆可以刪了。

- **世代靠圖鑑編號的區間判斷**，game master 沒有這個欄位。
  標籤走地區名不走世代編號。注意這跟種類裡的「地區型」是兩回事，
  後者指的是阿羅拉的樣子那種型態，容易混淆。

- **IV100 的 CP 不能退回本體的數值**。`build-dex.mjs` 查屬性時查不到會退回
  本體（`dex|null`），那對屬性沒問題；CP 照做會出事：原始回歸與洗翠黏美龍在
  game master 裡沒有自己的基礎數值，退回本體會得到一個看起來很像真的、
  其實是別隻的數字。所以 CP 另外建一份索引，型態一定要有自己的數值，
  例外走 `STATS_SAME_AS` 一筆一筆指名。目前 1464 筆裡有 2 筆沒有 CP，
  都是洗翠黏美兒與黏美龍；原始回歸那兩筆已經整批排除掉了。

- **CP 的等級倍率取自 game master**（`PLAYER_LEVEL_SETTINGS`），不要自己抄一份。
  LV20 是 0.5974、LV25 是 0.667934、LV50 是 0.8403。天氣加成的 +5 級也是
  遊戲資料寫的（`WEATHER_BONUS_SETTINGS` 的 `raidEncounterCpBaseLevelBonus`）。

- **舊專案手寫的 CP 有五筆是錯的**。露奈雅拉、毒貝比、四顎針龍與熊徒弟兩筆，
  跟現在的 game master 對不上。2026-09-12 用本機快取、PokeMiners 線上最新與
  pogoapi.net 三邊比對過，三邊一致。要 CP 一律用算的，不要從舊站抄。

- **篩選的計數要扣掉自己那一組**。算「火」有幾筆的時候，
  其他組的條件要照套，屬性這一組要放掉，否則同一組的選項
  加起來不會等於這一組全不選的結果，數字看起來就是錯的。

- **篩選收在漏斗裡，但已選條件不能一起收起來**。36 個選項攤在畫面上
  太吵，收進面板是對的；可是只在漏斗上留一個數字，使用者就看不出
  自己篩掉了什麼——2026-09-11 曾經因為這個理由把面板改成常駐 chip，
  隔天又改回漏斗。兩次都對，差別在已選的那幾顆有沒有留在外面。
  搜尋列右邊那排 `.fsel` 就是這個代價的補償，不要為了更乾淨而拿掉。

- **面板放在 `.searchbar` 裡面靠 absolute 浮著**，不是排在它下面。
  進了流排就會把搜尋框推窄，而且沒篩選時也佔著高度。
  900 以下同一段 DOM 改 fixed 貼底變抽屜，跟右欄同一個手法。

- **沒有側欄了**（2026-09-12 拆掉）。導覽在頂部列、900 以下貼底成 bar，
  顯示與資料兩區搬進右上角齒輪的設定面板。`.sidebar`、`.scrim`、
  漢堡鈕與 `setSidebar()` 全部不存在，不要再找。

- **浮出來的面板一次只開一個**。`state.pop` 是字串不是兩個布林，
  值只有 `null`、`"filter"`、`"settings"`。兩個各自一個開關的話，
  漏斗與齒輪可以同時打開，兩片面板在桌機會疊在一起。

- **手機的底部 bar 要留內容區的內距**。`.content` 在 900 以下補
  `calc(var(--tab-h) + env(safe-area-inset-bottom) + 24px)`，
  不然最後一排格子被 bar 蓋住，而且那是看不出原因的，因為捲到底也還在。

- **金色不能直接當文字**。`#b8860b` 對白底只有 3.25:1，低於 AA 的 4.5:1。
  文字與小元件用 `--gold-ink`（淺色 `#8a6508`、深色 `#cf9a1a`），
  `--gold` 只做大面積填色。`--dim` 同理，`#7d7870` 也不合格，已改成 `#6f6a62`。

- **深色是另一套值，不是把淺色反過來**。原本 `#16150f` 偏暖褐，
  寶可夢圖彩度高，暖底會跟圖打架，改成中性近黑 `#101010`。
  兩套要各自驗對比，不能從其中一套推另一套。

- **改了配色要同步 `js/share.js`**。canvas 吃不到 CSS 變數，
  `LIGHT` 與 `DARK` 是抄一份的，順序與命名刻意跟 `:root` 對齊，方便逐行比。

- **右欄是常駐的，關掉要重畫**。`closePanels()` 只清 state 不畫的話，
  桌機會停在剛才那個詳情，關不掉也回不到摘要。彈出的年代不必這樣做，
  因為整片消失就等於畫好了。

- **圖鑑不擺交換表摘要**（2026-09-12，使用者指定）。圖鑑就是圖鑑，
  旁邊不掛半張交換表。摘要只剩背卡在用，交換表本身就是清單也不擺。
  判斷寫在 `railHasContent()`，認的是 `state.view === "bg"`。
  不要為了「桌機右欄空著是浪費」再把它加回圖鑑。

- **斷點有兩個**：900px（導覽掉到貼底的 bar、欄數講死）與 1200px（右欄收起）。
  右欄在 900 到 1200 之間沒地方站，所以那一段退回點了才滑出來。

- **手機的欄數是講死的，不是算出來的**。`minmax` 推出來的欄數會跟著
  螢幕寬度飄，360px 的手機會掉成四欄。而且圖鑑沒有面板內距、交換表有，
  同樣寬度會算出不同結果。900px 以下直接 `repeat(var(--cell-cols), 1fr)`。

- **固定欄數要寫 `minmax(0, 1fr)`**。`1fr` 的下限是 `auto`，
  格子裡的名稱長一點就把整排撐開捲出容器。選寶可夢面板踩過這個。

- **v2 是單向的**。2026-09-11 之前的 v1 是單獨一份，want／have 掛在最外層，
  讀到那種形狀會整個包成第一份，另外兩份留空，使用者不必做任何事。
  反過來不行：寫成 v2 之後舊版程式讀這個 key 只會看到空清單。
  只有真的改動才會寫回，光是打開網站不會升級。

- **匯出是三份包成一個檔**。匯入時整包就整包換掉，
  舊版匯出的單份只蓋掉目前在看的那一份，不能讓一個舊檔案把另外兩份清掉。

- **友情碼存偏好不存清單**。它是使用者的身分不是清單的屬性，
  換一份清單不該要重打一次，清空全部也不該把它洗掉。

- **詳情面板的加入鈕不是開關**。同一隻可以配不同背卡各收一筆，
  「再按一次就移除」在這種情況下沒有意義，移除走每一筆自己的鈕。
  四個條件（異色、XXL、XXS、背卡）完全一樣才算重複，那時不新增只閃一下。
  只比對背卡會擋掉「同一張背卡，一筆要異色一筆不要」這種合法需求。

- **不做自由備註欄**。備註只有自己看得到，對方收到的是分享圖，
  讀不到任何文字欄位。要讓對方知道的條件必須畫進圖裡，
  也就是異色、XXL、XXS、背卡這四個有視覺表示的維度。
  2026-09-10 已把 `note` 從儲存結構移除。

- **背卡的圖與代號有資料源，對應關係沒有**。game master 的 `LC_` 樣板給代號，
  `Images/LocationCards/` 給圖，`sb_` 是特殊背景、`lc_` 是地點卡。
  但「哪些寶可夢帶得了這張背卡」上游完全沒有，那一份仍是手工，也還是護城河。

- **上游的背卡圖不一定是玩家看到的卡面**。game master 標了 `vfxAddress` 的
  那 31 張（全部是 `sb_` 特殊背景），上游那個 PNG 只是底層，實際卡面是它
  再疊一層特效。GO Tour 2026 鑽石那張上游只有一片漸層天空，實際卡面還有
  石柱與星軌。`lc_` 地點卡沒有這個問題，實測五張與本地圖逐像素相同。
  所以有本地圖的優先用本地那張，沒有的只能顯示底層。

- **背卡的 game master 代號與圖檔名大小寫不一致**（`lc_citysafari2025_amsterdam`
  對 `lc_CitySafari2025_amsterdam`），跟裝扮同一個坑，一律轉小寫再比對。

- **Serebii 的背卡表是三列一組**（圖、日期、可取得寶可夢），
  平面攤開對會錯位，一定要照列分組。它的代號不帶年份，
  跟上游檔名要用去數字加年份的方式配。

- **Serebii 會漏掉進化取得的寶可夢**。City Safari 那批它只列伊布，
  Dittobase 與 Bulbapedia 都列了八個進化型。實測 193 張比對，
  119 張是這個原因，所以它只當墊底不當主來源。

- **Dittobase 的頁面裡嵌了結構化 JSON**，比解 DOM 穩，
  而且帶物種編號、型態代號與異色、暗影、超級進化、極巨化的旗標。
  代號組成是「編號-英文名-型態代號」，跟條目 id 對得起來。

- **上游與 Dittobase 對同一張卡的叫法可能完全不同**。上游寫球場
  （`lc_2026_NPB_kyocera`），Dittobase 寫球隊（`lc-nbp-orix-buffaloes`）；
  上游叫都內（`lc_TokMun_koto`），Dittobase 叫蓋章拉力賽。還有上游把
  wimpole 拼成 whimpole、Dittobase 把 npb 拼成 nbp。這種靠規則接不起來，
  只能在 `tools/build-bg.mjs` 的 `DB_MANUAL` 一張一張指名。
  Serebii 那邊同樣的坑（30 週年上游叫 tpc30th、它叫 PokéXciting），
  用 `SEREBII_MANUAL`。

- **比對卡面圖是唯一可靠的查證方式**。名稱推論會錯得很難看：巴黎兩張的
  編號是交叉的，上游 01 對 Dittobase 的 `-2`；`lc_CR_2026_001` 其實是
  紐約時代廣場。兩邊的圖縮成 32×32 逐像素比，同一張差 0～0.4，
  不同張差 25 以上，中間沒有灰區。**但 `vfx: true` 的不能這樣比**，
  上游那張只是底層，跟實際卡面本來就不一樣。

- **比對只防「一張卡對到多筆」，不防「多張卡對到同一筆」**。
  `norm` 會去掉數字也去掉 `lc_`／`sb_` 前綴，所以 `lc_MLB_tampaBayRays`
  與 `…Rays2`、`lc_GOWA_fukuoka` 與 `sb_GOWA_fukuoka` 會撞在一起，
  後面那張默默拿到前面那張的清單。`resolveMatches` 改成撞到就兩張一起
  退回沒有資料，要哪一張得在人工對照裡指名。曾經因此有三張卡掛著
  別張卡的清單，其中 GO Fest 2025 那張少了 68 隻。

- **對照條目時要處理四件事**：重音（`Flabébé` 要先去重音）、
  `_NOEVOLVE` 後綴（上游清單不帶）、只有型態沒有本體的
  （酋雷姆用 `fNORMAL` 當本體）、以及叫法不同的裝扮（人工補別名）。

- **背卡的寶可夢一律寫到型態層級**（`d128.fPALDEA_COMBAT`），
  不要用「本體加註記」那種舊寫法。註記留給真的需要補一句說明的情況，
  型態與裝扮的名稱由圖鑑提供，不必自己維護。

- **背卡 id 的年份要斷開**。上游把年份黏在活動名後面，
  `lc_CitySafari2024_tainan` 要變成 `city-safari-2024-tainan`。
  少數檔名年份寫了兩次，重複的去掉。規則在 `tools/build-bg.mjs` 的 `makeId`。

- **GO 圖示非正方形**且各不相同。畫面一律 `object-fit: contain`、
  canvas 等比縮放，不可假設正方形。

- **本機開發不能用 `file://`**：ES modules 會被 CORS 擋，
  必須 `python3 -m http.server 8000`。

- **headless Chrome 的視埠下限是 500px**。用 `--window-size=430` 截圖
  看起來溢出其實是裁切，不是版面問題。要量真正的手機寬度得用 iframe。

- **`process.exit()` 在 Windows 上會炸**：fetch 的 keep-alive socket 還開著時
  強制結束會 assertion abort。腳本一律設 `process.exitCode`。

### 測試方式

```
node tools/check.mjs        # 不連外網
node tools/check.mjs --net  # 加驗圖片網址，含 240 張背卡逐一驗
```

涵蓋：三語 i18n key 一致性、條目欄位完整與 id 不重複、背卡引用與 id 回歸、
儲存往返、全部繪製函式（含 1478 筆詳情逐一繪製）、HTML 逸出。

DOM stub 在 `tools/check.mjs` 裡面，需要新的元素 id 時加進去就好。

改動介面後，除了 check 還要**實際起 server 用瀏覽器看**。
headless 截圖指令：
```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --window-size=1440,900 \
  --virtual-time-budget=12000 --screenshot=out.png http://localhost:8000/
```

### 檔案結構

```
index.html            骨架（114 行）
css/style.css         全部樣式，token 集中在 :root
js/godex.js           自動產生的圖鑑資料（不要手改）
js/extra.js           手動補的條目
js/costumes.js        裝扮譯名
js/dex.js             圖鑑單一入口
js/store.js           localStorage 讀寫、匯出匯入
js/backgrounds.js     背卡單一入口（合併骨架與手工）
js/bgdata.js          自動產生的背卡骨架（不要手改）
js/bgevents.js        手工維護的背卡
js/bgseries.js        收納夾譯名
js/imgchain.js        圖片備援鏈（dex 與 backgrounds 共用）
js/types.js           屬性顏色與名稱
js/i18n.js            繁中／日／英字典
js/ui.js              全部繪製函式
js/main.js            進入點、狀態、事件
js/share.js           雙欄分享圖（canvas）
img/bg/               背卡的本地備援圖（17 張，進 git）
img/extra/            上游沒有的裝扮圖（5 張，進 git）
tools/build-dex.mjs   產生圖鑑資料
tools/build-bg.mjs    產生背卡骨架
tools/check.mjs       自我檢查
project-index.md      檔案索引與依賴關係
progress.md           開發歷史
```

**三個檢視**（桌機在頂部列，手機在貼底的 bar）：圖鑑、交換表、背卡

### 目前規模

| 項目 | 數量 |
| --- | --- |
| 圖鑑條目 | 1464 |
| 　一般 | 893 |
| 　型態變化（含地區型 55） | 268 |
| 　裝扮 | 303 |
| 已實裝異色 | 1414 |
| 收納夾 / 背卡 / 收集格 | 23 / 240 / 1579 |
| 介面文字 | 三語各 107 個 key |
| 有 IV100 CP 的條目 | 1462 |

### 待辦

- 阿爾宙斯等 GO 實裝之後解除隱藏（刪掉 `HIDDEN_DEX` 裡的 493 重跑腳本）
- 之後轉私人 repo + Cloudflare Pages + 自有網域
  （轉私人後免費方案的 GitHub Pages 會停掉，兩件事要一起做）
