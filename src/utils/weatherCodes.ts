/**
 * 工具層：把「原始數字」翻譯成人看得懂的內容。
 *
 * 這些函式都是純函式（不讀取任何外部狀態），所以好測試、也好在元件間共用。
 * 天氣碼採用 WMO 標準（Open-Meteo 直接回傳 WMO code）。
 */
import type { TemperatureUnit } from '../types.ts'

interface WeatherDescription {
  label: string
  icon: string
  nightIcon: string
}

/** WMO 天氣碼 → 繁體中文描述 + 圖示。 */
const WEATHER_CODES: Record<number, WeatherDescription> = {
  0: { label: '天晴', icon: '☀️', nightIcon: '🌙' },
  1: { label: '大致晴朗', icon: '🌤️', nightIcon: '🌙' },
  2: { label: '局部多雲', icon: '⛅', nightIcon: '☁️' },
  3: { label: '陰天', icon: '☁️', nightIcon: '☁️' },
  45: { label: '有霧', icon: '🌫️', nightIcon: '🌫️' },
  48: { label: '霧凇', icon: '🌫️', nightIcon: '🌫️' },
  51: { label: '毛毛雨', icon: '🌦️', nightIcon: '🌦️' },
  53: { label: '細雨', icon: '🌦️', nightIcon: '🌦️' },
  55: { label: '濃毛毛雨', icon: '🌧️', nightIcon: '🌧️' },
  56: { label: '凍毛毛雨', icon: '🌧️', nightIcon: '🌧️' },
  57: { label: '濃凍毛毛雨', icon: '🌧️', nightIcon: '🌧️' },
  61: { label: '小雨', icon: '🌦️', nightIcon: '🌦️' },
  63: { label: '中雨', icon: '🌧️', nightIcon: '🌧️' },
  65: { label: '大雨', icon: '🌧️', nightIcon: '🌧️' },
  66: { label: '凍雨', icon: '🌧️', nightIcon: '🌧️' },
  67: { label: '強凍雨', icon: '🌧️', nightIcon: '🌧️' },
  71: { label: '小雪', icon: '🌨️', nightIcon: '🌨️' },
  73: { label: '中雪', icon: '🌨️', nightIcon: '🌨️' },
  75: { label: '大雪', icon: '❄️', nightIcon: '❄️' },
  77: { label: '雪粒', icon: '🌨️', nightIcon: '🌨️' },
  80: { label: '陣雨', icon: '🌦️', nightIcon: '🌦️' },
  81: { label: '強陣雨', icon: '🌧️', nightIcon: '🌧️' },
  82: { label: '暴雨', icon: '⛈️', nightIcon: '⛈️' },
  85: { label: '陣雪', icon: '🌨️', nightIcon: '🌨️' },
  86: { label: '強陣雪', icon: '❄️', nightIcon: '❄️' },
  95: { label: '雷雨', icon: '⛈️', nightIcon: '⛈️' },
  96: { label: '雷雨夾冰雹', icon: '⛈️', nightIcon: '⛈️' },
  99: { label: '強雷雨夾冰雹', icon: '⛈️', nightIcon: '⛈️' },
}

const UNKNOWN_WEATHER: WeatherDescription = { label: '未知天氣', icon: '❓', nightIcon: '❓' }

export interface WeatherInfo {
  label: string
  icon: string
}

export interface DescribeWeatherOptions {
  isDay?: boolean
}

export function describeWeather(
  code: number | null | undefined,
  { isDay = true }: DescribeWeatherOptions = {},
): WeatherInfo {
  const entry = (code == null ? undefined : WEATHER_CODES[code]) ?? UNKNOWN_WEATHER
  return {
    label: entry.label,
    icon: isDay ? entry.icon : entry.nightIcon,
  }
}

/** 風向角度 → 中文方位。 */
export function describeWindDirection(degrees: number | null | undefined): string {
  if (degrees == null || Number.isNaN(degrees)) return ''
  const directions = ['北', '東北', '東', '東南', '南', '西南', '西', '西北']
  // 每 45 度一個方位；加半格再取整，讓邊界角度歸到最近的方位
  const index = Math.round((((degrees % 360) + 360) % 360) / 45) % 8
  return directions[index] ?? ''
}

/** 蒲福風級，比單純的 km/h 數字更有體感。 */
export function describeWindSpeed(kmh: number | null | undefined): string {
  if (kmh == null) return ''
  const scale = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117]
  const level = scale.findIndex((upper) => kmh < upper)
  return `${level === -1 ? 12 : level} 級`
}

export type UvLevel = 'low' | 'moderate' | 'high' | 'very-high' | 'extreme'

export interface UvDescription {
  label: string
  level: UvLevel
}

/** 紫外線指數分級（香港天文台常用的 0–11+ 制）。 */
export function describeUvIndex(value: number | null | undefined): UvDescription {
  if (value == null) return { label: '—', level: 'low' }
  if (value < 3) return { label: '低', level: 'low' }
  if (value < 6) return { label: '中等', level: 'moderate' }
  if (value < 8) return { label: '高', level: 'high' }
  if (value < 11) return { label: '甚高', level: 'very-high' }
  return { label: '極高', level: 'extreme' }
}

/* ------------------------- 時間與數字格式化 ------------------------- */

/** ISO 時間 "2026-10-13T14:00" → "14:00" */
export function formatHour(isoTime: string | null | undefined): string {
  return isoTime ? isoTime.slice(11, 16) : ''
}

export interface WeekdayOptions {
  today?: string
  tomorrow?: string
}

/** ISO 日期 "2026-10-13" → "週二"；今天與明天另外標示。 */
export function formatWeekday(isoDate: string, { today, tomorrow }: WeekdayOptions = {}): string {
  if (isoDate === today) return '今天'
  if (isoDate === tomorrow) return '明天'
  const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
  const date = new Date(`${isoDate}T00:00:00`)
  return Number.isNaN(date.getTime()) ? isoDate : (weekdays[date.getDay()] ?? isoDate)
}

/** ISO 日期字串 "2026-10-13" → "10/13" */
export function formatDate(isoDate: string | null | undefined): string {
  return isoDate ? `${isoDate.slice(5, 7)}/${isoDate.slice(8, 10)}` : ''
}

/** ISO 時間 → "14:00"（日出日落用） */
export function formatTime(isoDateTime: string | null | undefined): string {
  return isoDateTime ? isoDateTime.slice(11, 16) : ''
}

/** 取「該地點的今天」日期字串（配合 API 回傳的當地時間，避免時區偏移）。 */
export function todayFrom(observedAt: string | null | undefined): string {
  return observedAt ? observedAt.slice(0, 10) : new Date().toISOString().slice(0, 10)
}

/**
 * 依日期字串加一天，回傳 YYYY-MM-DD。
 * 刻意使用 UTC 運算：若用本地時間 `new Date('2026-10-13T00:00:00')`，
 * 在 UTC+8 會因時區偏移而回退一天，日期就會算錯。
 */
export function addDays(isoDate: string, days: number): string {
  const [year = 1970, month = 1, day = 1] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** 溫度單位換算與取整。 */
export function convertTemperature(celsius: number | null | undefined, unit: TemperatureUnit): string {
  if (celsius == null) return '—'
  const value = unit === 'F' ? celsius * 1.8 + 32 : celsius
  return `${Math.round(value)}°`
}

/** 供 CSS class 使用的天氣分組（決定配色）。 */
export function weatherGroup(code: number | null | undefined): string {
  if (code == null) return 'unknown'
  if (code <= 1) return 'clear'
  if (code <= 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 67) return 'rain'
  if (code >= 71 && code <= 77) return 'snow'
  if (code >= 80 && code <= 82) return 'rain'
  if (code >= 85 && code <= 86) return 'snow'
  return 'storm'
}
