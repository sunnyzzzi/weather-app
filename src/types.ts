/**
 * 應用內共用的資料型別。
 *
 * 為什麼集中放在這裡？
 * 這些形狀是「層與層之間的契約」——API 層產出、Hook 層搬運、元件層消費。
 * 集中宣告後，任何一層改動資料形狀，編譯器會直接指出所有需要跟著改的地方，
 * 而不是等到畫面出現 undefined 才被發現。
 *
 * 注意：這裡的命名是「應用自己的語言」（temperature、humidity），
 * 不是 Open-Meteo 的欄位名（temperature_2m、relative_humidity_2m）。
 * 正規化發生在 api/weatherApi.ts，這是換資料源時唯一需要改的地方。
 */

/** 一個地點（搜尋候選、已選地點、熱門城市共用）。 */
export interface Place {
  id: string
  name: string
  /** 行政區 · 國家，例如「廣東 · 中國」；可能為空字串 */
  region: string
  latitude: number
  longitude: number
  /** 人口：作為相關度的替代指標，決定去重時保留哪一筆 */
  population: number
}

/** 溫度單位。 */
export type TemperatureUnit = 'C' | 'F'

/** 當前天氣觀測值。每個欄位都可能缺值（API 不一定回傳），故允許 null。 */
export interface CurrentWeather {
  temperature: number | null
  apparentTemperature: number | null
  humidity: number | null
  precipitation: number | null
  /** WMO 天氣碼 */
  weatherCode: number | null
  windSpeed: number | null
  /** 風向方位角（0–360） */
  windDirection: number | null
  pressure: number | null
  isDay: boolean
}

/** 逐時預報的單一時間點。 */
export interface HourlyPoint {
  /** ISO 當地時間，例如 "2026-10-13T14:00" */
  time: string
  temperature: number | null
  weatherCode: number | null
  precipitationProbability: number | null
}

/** 逐日預報的單一天。 */
export interface DailyPoint {
  /** ISO 日期，例如 "2026-10-13" */
  date: string
  weatherCode: number | null
  temperatureMax: number | null
  temperatureMin: number | null
  /** ISO 當地時間 */
  sunrise: string | null
  sunset: string | null
  precipitationProbability: number | null
  uvIndex: number | null
}

/** 一次成功的天氣查詢結果。 */
export interface WeatherData {
  timezone: string | null
  /** 觀測時間（該地點的當地時間，ISO 字串） */
  observedAt: string | null
  units: {
    temperature: string
    windSpeed: string
  }
  current: CurrentWeather
  hourly: HourlyPoint[]
  daily: DailyPoint[]
}

/** 錯誤分類。'abort' 是主動取消（競態保護），不算錯誤。 */
export type ApiErrorKind = 'network' | 'server' | 'abort'

/** 天氣狀態機的狀態。 */
export type WeatherStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * 一次「載入成功」的結果。
 * 資料與它所屬的地點綁在一起——這是刻意的：換地點失敗時，
 * 畫面要能明確說出「現在顯示的是哪個地點的資料」。
 */
export interface WeatherResult {
  place: Place
  data: WeatherData
}

/** 天氣狀態機的完整狀態。 */
export interface WeatherState {
  status: WeatherStatus
  /** 使用者「要求」查詢的地點 */
  place: Place | null
  /** 最近一次成功載入的結果（失敗時保留，讓畫面仍有內容可讀） */
  result: WeatherResult | null
  error: Error | null
  /** 遞增值：讓「重試同一個地點」也能觸發副作用 */
  attempt: number
}

/** useWeather 對外暴露的 API。 */
export interface UseWeather extends WeatherState {
  selectPlace: (place: Place) => void
  retry: () => void
  clear: () => void
}

/** 搜尋狀態：'empty' 與 'error' 分開，因為使用者的下一步完全不同。 */
export type SearchStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error'

export interface SearchState {
  status: SearchStatus
  results: Place[]
  error: Error | null
}

export interface UsePlaceSearch {
  keyword: string
  searchState: SearchState
  /** 使用者打字 */
  updateKeyword: (value: string) => void
  /** 程式化填入（選中地點後回填），不會觸發搜尋 */
  fillKeyword: (value: string) => void
  resetSearch: () => void
}
