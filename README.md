# 天氣應用程式（Frontend Take-Home）

一個以 React 18 + TypeScript + Vite 實作的天氣應用程式：搜尋地點、查看即時天氣與未來預報，
並完整處理載入中與錯誤狀態。source 全數為 `.ts` / `.tsx`，`npm run build` 會先做型別檢查。

資料來源為 [Open-Meteo](https://open-meteo.com/) —— **完全免費、不需要 API Key**，
reviewer 取得專案後可直接啟動，無需註冊任何服務。

---

## 快速開始

需求：Node.js 18 以上

```bash
npm install
npm run dev      # 開啟 http://localhost:5173
```

其他指令：

```bash
npm run typecheck  # 只做型別檢查（tsc --noEmit），不產出檔案
npm run build      # 先型別檢查，再產出正式版到 dist/
npm run preview    # 預覽正式版建置結果
```

---

## 功能

| 功能     | 說明                                                                   |
| -------- | ---------------------------------------------------------------------- |
| 搜尋地點 | 300ms 防抖 + 鍵盤上下鍵／Enter 操作，候選清單自動去重                  |
| 即時天氣 | 溫度、體感、天氣狀況、濕度、風向風速、降雨、紫外線、氣壓、日出日落     |
| 天氣預報 | 未來 24 小時逐時（可橫向捲動）＋ 未來 7 天逐日（含溫度範圍長條圖）     |
| 載入狀態 | 骨架畫面（Skeleton）＋切換地點時的載入提示（黃色 spinner），版面不跳動 |
| 錯誤狀態 | 分「有舊資料」與「無資料」兩種呈現，皆可一鍵重試                       |
| 我的位置 | 「使用我的位置」按鈕，用 `navigator.geolocation` 取座標直接查天氣       |
| 其他     | °C / °F 切換、記住上次查詢的地點、熱門城市捷徑、響應式版面             |

時間顯示一律使用**該地點的當地時間**（由 API 的 `timezone=auto` 處理）。

---

## 專案結構

```
src/
├── types.ts                  # 層與層之間的契約：Place / WeatherData / WeatherState…
├── api/
│   └── weatherApi.ts         # 對外請求 + 回應正規化 + 錯誤分類（唯一認識 Open-Meteo 的地方）
├── hooks/
│   ├── useWeather.ts         # 天氣狀態機（useReducer）+ 競態保護
│   ├── usePlaceSearch.ts     # 搜尋防抖 + 競態保護 + 程式化回填防重觸發
│   └── usePersistentState.ts # localStorage 偏好持久化（泛型）
├── pages/
│   └── Home/                 # 頁面層：版面與「什麼狀態顯示什麼」的判斷
│       ├── index.tsx
│       ├── index.less        # 頁面骨架與首頁專屬的空狀態 / 熱門捷徑樣式
│       └── types.ts          # 只屬於這個頁面的型別（HomeProps）
├── components/
│   ├── SearchBar/            # 每個元件都是一個自足的目錄：
│   │   ├── index.tsx         #   邏輯與結構
│   │   ├── index.less        #   只屬於自己的樣式（刪元件時一起消失，不留孤兒規則）
│   │   └── types.ts          #   只屬於自己的型別（props）
│   ├── CurrentWeather/       # 即時天氣卡（純展示）
│   ├── HourlyForecast/       # 未來 24 小時
│   ├── DailyForecast/        # 未來 7 天
│   ├── StatusMessage/        # 全頁狀態訊息（無資料時）
│   ├── ErrorBanner/          # 錯誤橫幅（有舊資料時）
│   ├── WeatherSkeleton/      # 載入骨架（無 props，故不設 types.ts）
│   └── UnitToggle/           # 溫度單位切換
├── data/
│   └── popularPlaces.ts      # 首頁熱門城市捷徑
├── utils/
│   └── weatherCodes.ts       # WMO 天氣碼、風向、紫外線分級、時間與溫度格式化（純函式）
├── styles/
│   └── global.less           # 只放真正全域的東西：設計代幣、重置、card/button/spinner
├── App.tsx                   # 應用的殼：偏好持久化 + 狀態組裝，把畫面交給 pages/Home
├── main.tsx                  # 入口：先載入 global.less 再載入 App（全域先於元件）
└── vite-env.d.ts
```

型別與樣式的分層原則：

- `src/types.ts` 只收**跨層共用**的領域型別（Place、WeatherData、WeatherState…）；
  元件與頁面「自己才會用到」的型別放在自己的 `types.ts` —— 共用型別檔不會無限膨脹。
- 樣式同理：`styles/global.less` 只放設計代幣與基礎類別，
  元件樣式在自己的 `index.less`、頁面版面在 `pages/Home/index.less`。
  顏色一律走 CSS 變數（`--accent` 等），所以各別 `.less` 不需要 import 變數檔，
  也不會讓 `:root` 被重複輸出。
- `types.ts` 描述「應用自己的語言」（`temperature` / `humidity`），
  Open-Meteo 的原始欄位名（`temperature_2m`）只出現在 `api/weatherApi.ts` 的 `Raw*` 型別裡，
  正規化就在那一個檔案的邊界上完成。

---

## 設計重點（詳細推導見 [SOLUTION.md](./SOLUTION.md)）

- **分層**：`api`（請求與正規化）→ `hooks`（狀態與競態）→ `components`（只負責呈現）。
  元件不認識 Open-Meteo，換資料源只需改 `api/weatherApi.ts`。
- **狀態機**：天氣狀態是互斥的（idle / loading / success / error），
  用單一 `useReducer` 表達，避免 `loading && error` 這類不合法組合。
- **錯誤處理三層**：API 層分類錯誤（`network` / `server` / `abort`）→
  狀態層保留舊資料 → UI 層決定「全頁錯誤」還是「橫幅 + 舊資料仍可讀」。
- **競態保護**：搜尋與天氣請求都使用 `AbortController`；
  快速切換地點時只有最後一次請求的結果會被採用。

---

## 示範錯誤狀態

不需要真的拔網路線，在網址加上查詢參數即可穩定重現：

| 網址            | 效果               |
| --------------- | ------------------ |
| `/?sim=network` | 模擬網路連線異常   |
| `/?sim=server`  | 模擬伺服器回應 503 |

---

## 已知限制與後續方向

- 資料為即時查詢，重新整理後才更新，沒有輪詢或快取（作業範圍刻意如此）。
- 定位只顯示「目前位置」與座標，不做反向地理編碼：Open-Meteo 沒有反向 geocoding 接口，
  反查得再接一個第三方服務，等於多一個可能失敗的外部請求（還要額外說明隱私授權）。
  取捨後選擇零新增依賴，地名讓位給「座標 + 目前位置」這個說得清楚的說法。
- 「目前位置」只把「上次看的是目前位置」這個**意圖**寫進 localStorage，不寫座標：
  座標會過期（人會移動），但意圖不會。重新整理時先用 Permissions API 確認權限是否已授權，
  是就靜默補一次定位（不會彈框），否則回到上次搜尋的城市——
  自動行為一律不在沒有使用者手勢時要求權限。
- 未加入單元測試。純函式（`utils/weatherCodes.ts`）與 reducer（`weatherReducer`）已刻意寫成
  無副作用且可獨立呼叫，補上 Vitest 測試的成本很低。
- 熱門城市清單為寫死的座標，需手動維護。
