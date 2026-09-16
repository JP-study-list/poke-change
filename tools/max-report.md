# max-report.md — 可極巨化名單的比對報告

> 由 `tools/build-max.mjs` 產生，2026-09-16。
> 這一份是給人看的，程式只讀 `js/maxdata.js`。

## 結果

- Dittobase 解析到條目 **2390** 筆
- 其中標了極巨化或超極巨化且已實裝 **158** 筆
- 對到本站條目 **148** 個 id
- 對不上的 **0** 筆


## 交叉比對：game master

遊戲資料裡 Max Battle 叫 `BREAD`，超極巨化叫 `sourdough`。

### 極巨化

game master 的 `BREAD_POKEMON_SCALING_SETTINGS` 有 **58** 個物種，
但那是「視覺縮放要特別調」的清單，不是可極巨化的清單，所以只當佐證。

**只有 game master 有、Dittobase 沒有的 3 個**：`cryogonal`, `toxel`, `passimian`

這幾筆**照樣收進名單**（2026-09-16 改的）。第一版把它們當成還沒實裝而排除，
後來發現其中兩隻出現在 GO Fest 2025 那張 Max Battle 背卡的清單裡，
使用者也確認確實能極巨化。下次多出新的要回頭確認一次，
這份清單只有「需要特調縮放」的才在，不完整但裡面的是真的。

只靠 game master 才進名單的 **3** 個條目：`d615`, `d848`, `d766`


### 超極巨化

game master `allowedSourdoughPokemon` **31** 個物種，
Dittobase 標已實裝的 **17** 個。


只有 game master 有：`eevee`, `melmetal`, `corviknight`, `orbeetle`, `drednaw`, `coalossal`, `flapple`, `appletun`, `sandaconda`, `centiskorch`, `hatterene`, `alcremie`, `copperajah`, `urshifu`


## 名單

```
d1
d2
d3
d4
d5
d6
d7
d8
d9
d10
d11
d12
d25
d26
d52
d58
d59
d63
d64
d65
d66
d67
d68
d92
d93
d94
d98
d99
d106
d107
d111
d112
d113
d125
d126
d129
d130
d131
d133
d134
d135
d136
d138
d139
d140
d141
d143
d144
d145
d146
d163
d164
d196
d197
d215
d237
d242
d243
d244
d245
d249
d250
d280
d281
d282
d328
d329
d330
d349
d350
d363
d364
d365
d374
d375
d376
d377
d378
d379
d380
d381
d415
d416
d461
d464
d466
d467
d470
d471
d475
d480
d481
d482
d519
d520
d521
d524
d525
d526
d529
d530
d546
d547
d554
d555.fSTANDARD
d568
d569
d615
d633
d634
d635
d686
d687
d700
d761
d762
d763
d766
d810
d811
d812
d813
d814
d815
d816
d817
d818
d819
d820
d821
d822
d823
d831
d832
d848
d849.fAMPED
d849.fLOW_KEY
d850
d851
d856
d857
d858
d861
d870
d884
d891
d892.fRAPID_STRIKE
d892.fSINGLE_STRIKE
```
