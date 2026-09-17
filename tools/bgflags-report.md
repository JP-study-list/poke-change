# bgflags-report.md — 背卡旗標的產生報告

> 由 `tools/build-bgflags.mjs` 產生，2026-09-17。
> 這一份是給人看的，程式只讀 `js/bgflags.js`。

## 結果

- Bulbapedia 解析到背景 **77** 張、寶可夢格 **1247** 個
- 帶標記且對到我們的卡：**12** 張、**107** 個標記
- 對不上的卡 **0** 張
- 對不上的條目 **15** 筆


### 對不到條目

多半是資料源的粒度不同：Bulbapedia 標的是一般型態，
而我們這張卡的清單（來自 Dittobase）記的是裝扮版。
裝扮本來就勾不到這些條件，所以這幾筆對結果沒有影響。

```
go-fest-2025-osaka / 812GMax Rillaboom（gmax）：這張卡的清單裡沒有這個編號
go-fest-2025-jerseycity / 815GMax Cinderace（gmax）：這張卡的清單裡沒有這個編號
go-fest-2025-paris / 818GMax Inteleon（gmax）：這張卡的清單裡沒有這個編號
team-leader-red / 33 Nidorino（purified）：卡上只有裝扮版（d33.cJAN_2020_NOEVOLVE），裝扮勾不到這個條件
team-leader-red / 202 Wobbuffet（purified）：卡上只有裝扮版（d202.cJAN_2020_NOEVOLVE），裝扮勾不到這個條件
team-leader-yellow / 33 Nidorino（purified）：卡上只有裝扮版（d33.cJAN_2020_NOEVOLVE），裝扮勾不到這個條件
team-leader-yellow / 202 Wobbuffet（purified）：卡上只有裝扮版（d202.cJAN_2020_NOEVOLVE），裝扮勾不到這個條件
team-leader-blue / 33 Nidorino（purified）：卡上只有裝扮版（d33.cJAN_2020_NOEVOLVE），裝扮勾不到這個條件
team-leader-blue / 202 Wobbuffet（purified）：卡上只有裝扮版（d202.cJAN_2020_NOEVOLVE），裝扮勾不到這個條件
season19-delightful-days / 812GMax Rillaboom（gmax）：這張卡的清單裡沒有這個編號
season19-delightful-days / 815GMax Cinderace（gmax）：這張卡的清單裡沒有這個編號
season19-delightful-days / 818GMax Inteleon（gmax）：這張卡的清單裡沒有這個編號
go-fest-2025-eternatus / 131GMax Lapras（gmax）：這張卡的清單裡沒有這個編號
go-fest-2025-eternatus / 143GMax Snorlax（gmax）：這張卡的清單裡沒有這個編號
gowa-2025-global / 861GMax Grimmsnarl（gmax）：這張卡的清單裡沒有這個編號
```

## 名單

### community-2026

- 淨化：`d37`, `d37.fALOLA`, `d633`
- 極巨化：`d810`, `d813`, `d816`

### go-fest-2025-eternatus

- 極巨化：`d1`, `d4`, `d7`, `d10`, `d66`, `d92`, `d98`, `d113`, `d138`, `d140`, `d144`, `d145`, `d146`, `d213`, `d243`, `d244`, `d245`, `d302`, `d320`, `d374`, `d380`, `d381`, `d519`, `d529`, `d554`, `d568`, `d615`, `d766`, `d810`, `d813`, `d816`, `d819`, `d821`, `d831`, `d849.fAMPED`, `d849.fLOW_KEY`, `d856`, `d870`
- 超極巨化：`d3`, `d6`, `d9`, `d12`, `d68`, `d94`, `d99`, `d812`, `d815`, `d818`, `d849.fAMPED`

### gowa-2025-global

- 淨化：`d249`, `d250`, `d488`, `d491`

### gt26-gold

- 淨化：`d250`

### gt26-silver

- 淨化：`d249`

### lc-gowa-fukuoka

- 極巨化：`d849.fAMPED`, `d849.fLOW_KEY`
- 超極巨化：`d849.fAMPED`

### nagasaki-2025

- 淨化：`d488`, `d491`
- 超極巨化：`d861`

### sb-gowa-fukuoka

- 極巨化：`d849.fAMPED`, `d849.fLOW_KEY`
- 超極巨化：`d849.fAMPED`

### season20-tales-of-transformation

- 淨化：`d731`

### team-leader-blue

- 淨化：`d1`, `d4`, `d7`, `d252`, `d255`, `d258`
- 極巨化：`d1`, `d4`, `d7`, `d810`, `d813`, `d816`

### team-leader-red

- 淨化：`d1`, `d4`, `d7`, `d252`, `d255`, `d258`
- 極巨化：`d1`, `d4`, `d7`, `d810`, `d813`, `d816`

### team-leader-yellow

- 淨化：`d1`, `d4`, `d7`, `d252`, `d255`, `d258`
- 極巨化：`d1`, `d4`, `d7`, `d810`, `d813`, `d816`
