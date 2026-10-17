/**
 * API 層：統一管理所有對外請求。
 *
 * 設計原則
 * 1. 元件與 Hook 不直接碰 fetch，也不認識 Open-Meteo 的欄位命名；
 *    這裡把原始回應「正規化」成應用內部自己的資料形狀（見 normalize*）。
 * 2. 錯誤在這裡就被分類（network / server / abort），上層只需決定「怎麼呈現」，
 *    不需要再判斷 HTTP 狀態碼或例外字串。
 * 3. 要換資料源（例如和風天氣、OpenWeatherMap）只需改這個檔案。
 *
 * 這個檔案同時是「外部資料」與「內部型別」的邊界：
 * Raw* 開頭的型別描述 API 真的會回傳什麼（而且全部可能缺值），
 * 正規化函式負責把它們轉換成型別安全的領域模型。
 */
import type {
  ApiErrorKind,
  CurrentWeather,
  DailyPoint,
  HourlyPoint,
  Place,
  WeatherData,
} from '../types.ts'

const GEOCODING_ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast'

/** 要求的天氣欄位，集中宣告方便對照官方文件。 */
const CURRENT_FIELDS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'is_day',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
  'wind_direction_10m',
  'pressure_msl',
]
const HOURLY_FIELDS = ['temperature_2m', 'weather_code', 'precipitation_probability']
const DAILY_FIELDS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'sunrise',
  'sunset',
  'precipitation_probability_max',
  'uv_index_max',
]

/**
 * 自訂錯誤類型，讓 UI 層可以區分「使用者問題」與「系統問題」，
 * 並決定要不要顯示「重試」按鈕。
 *
 * kind:
 *  - 'network' 連線層失敗（斷網、DNS、CORS、逾時）→ 可重試
 *  - 'server'  伺服器回應非 2xx → 可重試
 *  - 'abort'   主動取消（競態保護）→ 不是錯誤，呼叫端應靜默忽略
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null

  constructor(message: string, { kind = 'network', status = null, cause = null }: ApiErrorOptions = {}) {
    super(message, cause ? { cause } : undefined)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
  }
}

export interface ApiErrorOptions {
  kind?: ApiErrorKind
  status?: number | null
  cause?: unknown
}

/** 型別防護：讓 catch 區塊不必用 as 斷言就能取得 kind。 */
export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

/**
 * 開發／示範用的錯誤模擬開關。
 * 用法：在網址後面加上 ?sim=network 或 ?sim=server，即可穩定重現錯誤畫面
 * （面試演示時很方便，不需要真的去拔網路線）。
 */
function simulatedFailure(): ApiError | null {
  if (typeof window === 'undefined') return null
  const sim = new URLSearchParams(window.location.search).get('sim')
  if (sim === 'network') return new ApiError('模擬網路異常', { kind: 'network' })
  if (sim === 'server') return new ApiError('模擬伺服器錯誤（HTTP 503）', { kind: 'server', status: 503 })
  return null
}

export interface RequestOptions {
  signal?: AbortSignal
}

/** 共用的請求包裝：負責附上 signal、轉換錯誤、解析 JSON。 */
async function requestJson(url: string, { signal }: RequestOptions = {}): Promise<unknown> {
  const simulated = simulatedFailure()
  if (simulated) throw simulated

  let response: Response
  try {
    response = await fetch(url, { signal })
  } catch (error) {
    // fetch 只在「連線層」失敗時丟例外；abort 要跟真正的錯誤分開
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('請求已取消', { kind: 'abort', cause: error })
    }
    throw new ApiError('網路連線異常，請檢查網路後再試', { kind: 'network', cause: error })
  }

  if (!response.ok) {
    throw new ApiError(`伺服器回應錯誤（HTTP ${response.status}）`, {
      kind: 'server',
      status: response.status,
    })
  }

  return response.json()
}

/* ------------------------------------------------------------------ *
 * 原始回應型別（Open-Meteo 真的回傳的形狀）
 * ------------------------------------------------------------------ */

/** 陣列元素可能缺值，所以統一標成可為 null。 */
type RawNumberList = (number | null)[] | undefined
type RawStringList = (string | null)[] | undefined

interface RawGeocodingResult {
  id?: number
  name?: string
  admin1?: string
  country?: string
  country_code?: string
  latitude?: number
  longitude?: number
  population?: number
}

interface RawGeocodingResponse {
  results?: RawGeocodingResult[]
}

interface RawForecastResponse {
  timezone?: string
  current?: {
    time?: string
    temperature_2m?: number | null
    relative_humidity_2m?: number | null
    apparent_temperature?: number | null
    is_day?: number | null
    precipitation?: number | null
    weather_code?: number | null
    wind_speed_10m?: number | null
    wind_direction_10m?: number | null
    pressure_msl?: number | null
  }
  current_units?: {
    temperature_2m?: string
    wind_speed_10m?: string
  }
  hourly?: {
    time?: RawStringList
    temperature_2m?: RawNumberList
    weather_code?: RawNumberList
    precipitation_probability?: RawNumberList
  }
  daily?: {
    time?: RawStringList
    weather_code?: RawNumberList
    temperature_2m_max?: RawNumberList
    temperature_2m_min?: RawNumberList
    sunrise?: RawStringList
    sunset?: RawStringList
    precipitation_probability_max?: RawNumberList
    uv_index_max?: RawNumberList
  }
}

/* ------------------------------------------------------------------ *
 * 地理編碼：關鍵字 → 候選地點
 * ------------------------------------------------------------------ */

/**
 * GeoNames 對同一地點可能有多筆記錄（城市 PPLC 與行政區 PCLS），需去重。
 *
 * 地區欄位的來源有兩個層次：以中文查詢時，部分地區（例如香港）沒有
 * `admin1` / `country` 的中文名稱，但一定有 `country_code`，
 * 因此以國家代碼對照表作為退路，避免候選清單只顯示一個孤立的地名。
 */
const COUNTRY_NAMES: Record<string, string> = {
  HK: '中國香港',
  MO: '中國澳門',
  TW: '中國台灣',
  CN: '中國',
  JP: '日本',
  KR: '韓國',
  SG: '新加坡',
  MY: '馬來西亞',
  TH: '泰國',
  GB: '英國',
  US: '美國',
  CA: '加拿大',
  AU: '澳洲',
  FR: '法國',
  DE: '德國',
}

function buildRegion(raw: RawGeocodingResult): string {
  const code = raw.country_code ? raw.country_code.toUpperCase() : null
  // 國名優先用本地對照表：以中文查詢時 API 回傳的國名是簡體（例如「中国」），
  // 與本應用的繁體介面不一致；而且部分地區（香港）根本沒有回傳國名。
  const country = (code ? COUNTRY_NAMES[code] : undefined) ?? raw.country ?? ''
  return [raw.admin1, country].filter(Boolean).join(' · ')
}

function normalizePlace(raw: RawGeocodingResult): Place {
  return {
    id: String(raw.id ?? `${raw.name ?? ''}-${raw.latitude ?? ''}-${raw.longitude ?? ''}`),
    name: raw.name ?? '',
    region: buildRegion(raw),
    latitude: raw.latitude ?? 0,
    longitude: raw.longitude ?? 0,
    // 人口可作為「相關度」的替代指標，用來決定去重時保留哪一筆
    population: raw.population ?? 0,
  }
}

function dedupePlaces(places: Place[]): Place[] {
  const best = new Map<string, Place>()
  for (const place of places) {
    const key = `${place.name}|${place.region}`
    const kept = best.get(key)
    if (!kept || place.population > kept.population) best.set(key, place)
  }
  return [...best.values()]
}

export interface SearchPlacesOptions {
  signal?: AbortSignal
  count?: number
}

/** 依關鍵字搜尋地點，回傳正規化後的候選清單。 */
export async function searchPlaces(
  keyword: string,
  { signal, count = 8 }: SearchPlacesOptions = {},
): Promise<Place[]> {
  const trimmed = keyword.trim()
  if (!trimmed) return []

  const url =
    `${GEOCODING_ENDPOINT}?name=${encodeURIComponent(trimmed)}` +
    `&count=${count}&language=zh&format=json`

  const data = (await requestJson(url, { signal })) as RawGeocodingResponse
  const results = Array.isArray(data?.results) ? data.results : []
  return dedupePlaces(results.map(normalizePlace))
}

/* ------------------------------------------------------------------ *
 * 天氣預報：座標 → 當前 + 逐時 + 逐日
 * ------------------------------------------------------------------ */

/** 把 Open-Meteo 的平行陣列轉成「以時間為軸」的物件陣列，讓元件不必再對索引。 */
function zipHourly(hourly: RawForecastResponse['hourly']): HourlyPoint[] {
  if (!hourly?.time) return []
  return hourly.time.map((time, index): HourlyPoint => {
    if (time == null) {
      return { time: '', temperature: null, weatherCode: null, precipitationProbability: null }
    }
    return {
      time,
      temperature: hourly.temperature_2m?.[index] ?? null,
      weatherCode: hourly.weather_code?.[index] ?? null,
      precipitationProbability: hourly.precipitation_probability?.[index] ?? null,
    }
  })
}

function zipDaily(daily: RawForecastResponse['daily']): DailyPoint[] {
  if (!daily?.time) return []
  return daily.time.map((date, index): DailyPoint => {
    if (date == null) {
      return {
        date: '',
        weatherCode: null,
        temperatureMax: null,
        temperatureMin: null,
        sunrise: null,
        sunset: null,
        precipitationProbability: null,
        uvIndex: null,
      }
    }
    return {
      date,
      weatherCode: daily.weather_code?.[index] ?? null,
      temperatureMax: daily.temperature_2m_max?.[index] ?? null,
      temperatureMin: daily.temperature_2m_min?.[index] ?? null,
      sunrise: daily.sunrise?.[index] ?? null,
      sunset: daily.sunset?.[index] ?? null,
      precipitationProbability: daily.precipitation_probability_max?.[index] ?? null,
      uvIndex: daily.uv_index_max?.[index] ?? null,
    }
  })
}

/**
 * 取得某地點的天氣資料（當前 + 未來 24 小時 + 未來 7 天）。
 * `timezone=auto` 讓伺服器回傳「該地點的當地時間」，避免自己換算時區出錯。
 */
export async function fetchWeather(
  place: Pick<Place, 'latitude' | 'longitude'>,
  { signal }: RequestOptions = {},
): Promise<WeatherData> {
  const url =
    `${FORECAST_ENDPOINT}?latitude=${place.latitude}&longitude=${place.longitude}` +
    `&current=${CURRENT_FIELDS.join(',')}` +
    `&hourly=${HOURLY_FIELDS.join(',')}` +
    `&daily=${DAILY_FIELDS.join(',')}` +
    `&timezone=auto&forecast_days=7`

  const data = (await requestJson(url, { signal })) as RawForecastResponse
  const current = data.current ?? {}
  const currentHour = current.time ? current.time.slice(0, 13) : null

  const hourly = zipHourly(data.hourly)
  // 只取「從現在起算」的 24 小時，避免顯示已過去的時段
  const startIndex = currentHour
    ? Math.max(
        hourly.findIndex((h) => h.time.slice(0, 13) === currentHour),
        0,
      )
    : 0

  const currentWeather: CurrentWeather = {
    temperature: current.temperature_2m ?? null,
    apparentTemperature: current.apparent_temperature ?? null,
    humidity: current.relative_humidity_2m ?? null,
    precipitation: current.precipitation ?? null,
    weatherCode: current.weather_code ?? null,
    windSpeed: current.wind_speed_10m ?? null,
    windDirection: current.wind_direction_10m ?? null,
    pressure: current.pressure_msl ?? null,
    isDay: current.is_day === 1,
  }

  return {
    timezone: data.timezone ?? null,
    observedAt: current.time ?? null,
    units: {
      temperature: data.current_units?.temperature_2m ?? '°C',
      windSpeed: data.current_units?.wind_speed_10m ?? 'km/h',
    },
    current: currentWeather,
    hourly: hourly.slice(startIndex, startIndex + 24),
    daily: zipDaily(data.daily),
  }
}
