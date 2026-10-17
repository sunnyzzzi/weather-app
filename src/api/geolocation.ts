/**
 * API 層：瀏覽器定位（navigator.geolocation）。
 *
 * 為什麼這個也要放進 api/？
 * 因為它和 Open-Meteo 一樣是「應用程式之外的世界」：會失敗、會逾時、會被使用者拒絕，
 * 而且失敗時丟出的是瀏覽器自己定義的錯誤碼。把這些收在這裡，
 * Hook 層與元件層就只需要處理「已經分類好的錯誤」，不必認識 GeolocationPositionError。
 *
 * 這裡刻意不做「反向地理編碼」（座標 → 城市名）：
 * Open-Meteo 只有正向 geocoding（名字 → 座標），要反查就得再接一個第三方服務，
 * 等於多一個可能失敗的網路請求，也要多處理一份隱私授權說明。
 * 取捨結果：地名就顯示「目前位置」，座標放在副標，零新增依賴。
 */
import type { Coordinates, GeolocationErrorKind, Place } from '../types.ts'

/**
 * 「目前位置」在地點清單裡的固定 id。
 * 固定值的用途有兩個：React key 穩定，以及讓持久化邏輯能認出它（見 App.tsx）。
 */
export const CURRENT_LOCATION_ID = 'current-location'

/**
 * 定位專屬的錯誤型別，與 ApiError 平行的設計：
 * 一樣帶 kind 讓 UI 分流呈現，另外帶 retryable 讓 UI 決定要不要顯示「重試」。
 */
export class GeolocationError extends Error {
  readonly kind: GeolocationErrorKind
  readonly retryable: boolean

  constructor(message: string, kind: GeolocationErrorKind, retryable: boolean) {
    super(message)
    this.name = 'GeolocationError'
    this.kind = kind
    this.retryable = retryable
  }
}

/** 型別防護：讓 catch 區塊不必用 as 斷言就能取得 kind。 */
export function isGeolocationError(value: unknown): value is GeolocationError {
  return value instanceof GeolocationError
}

/** 定位功能在這個環境下能不能用（瀏覽器是否支援 + 是否處於安全上下文）。 */
export function isGeolocationAvailable(): boolean {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return false
  // geolocation 只在安全上下文（HTTPS 或 localhost）可用；
  // 用手機開 http://192.168.x.x 預覽時會直接不給用，必須提前說清楚原因。
  if (typeof window !== 'undefined' && !window.isSecureContext) return false
  return true
}

/**
 * 把瀏覽器的錯誤碼翻成應用自己的錯誤。
 * 錯誤碼是數字常數（1/2/3），直接寫值並加註解，避免依賴 DOM 常數的型別宣告差異。
 */
function toGeolocationError(error: GeolocationPositionError): GeolocationError {
  switch (error.code) {
    case 1: // PERMISSION_DENIED
      return new GeolocationError(
        '你封鎖了定位權限，請在瀏覽器的網站設定中允許定位後再試一次',
        'permission',
        false,
      )
    case 2: // POSITION_UNAVAILABLE
      return new GeolocationError('暫時抓不到你的位置，請稍後再試', 'unavailable', true)
    case 3: // TIMEOUT
      return new GeolocationError('定位逾時，請再試一次', 'timeout', true)
    default:
      return new GeolocationError('定位失敗，請稍後再試', 'unavailable', true)
  }
}

export interface GeolocationRequestOptions {
  /** 逾時（毫秒）。定位可能卡很久（室內、GPS 冷啟動），一定要設上限 */
  timeout?: number
  /** 可接受多舊的快取座標；設 60 秒可讓連續兩次定位瞬間完成 */
  maximumAge?: number
}

/**
 * 取得目前位置的座標。
 *
 * 兩個刻意的选择：
 *  - enableHighAccuracy: false —— 天氣預報的精度需求是「城市等級」，
 *    用 WiFi/基地台定位就夠了，開 GPS 只會更慢更耗電；
 *  - 包成 Promise —— 讓呼叫端能 await，而不是把成功/失敗的 callback 散在各處。
 */
export function getCurrentCoordinates({
  timeout = 10_000,
  maximumAge = 60_000,
}: GeolocationRequestOptions = {}): Promise<Coordinates> {
  if (!isGeolocationAvailable()) {
    const blockedByContext =
      typeof window !== 'undefined' && !window.isSecureContext && Boolean(navigator?.geolocation)
    return Promise.reject(
      new GeolocationError(
        blockedByContext
          ? '定位功能需要在 HTTPS 或 localhost 下才能使用'
          : '這個瀏覽器不支援定位功能',
        'unsupported',
        false,
      ),
    )
  }

  return new Promise<Coordinates>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      (error) => reject(toGeolocationError(error)),
      { timeout, maximumAge, enableHighAccuracy: false },
    )
  })
}

/** 座標轉成人讀得懂的文字，例如「22.28°N, 114.16°E」。 */
export function formatCoordinates({ latitude, longitude }: Coordinates): string {
  const format = (value: number, positive: string, negative: string): string =>
    `${Math.abs(value).toFixed(2)}°${value >= 0 ? positive : negative}`
  return `${format(latitude, 'N', 'S')}, ${format(longitude, 'E', 'W')}`
}

/**
 * 把座標包成一個 Place，直接送進既有的天氣查詢流程。
 *
 * 這是「定位功能幾乎不用改動既有程式碼」的關鍵：
 * fetchWeather 只認緯經度，狀態機只認 Place，所以定位只是「另一種產生 Place 的方式」。
 */
export function createCurrentLocationPlace(coordinates: Coordinates): Place {
  return {
    id: CURRENT_LOCATION_ID,
    name: '目前位置',
    region: formatCoordinates(coordinates),
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    population: 0,
  }
}
