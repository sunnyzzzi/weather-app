/**
 * Home 頁面專屬的型別。
 *
 * 分層原則：跨層共用的領域型別（Place、WeatherData…）放在 src/types.ts；
 * 只有某個頁面或元件自己會用到的型別，就放在它自己的目錄下。
 * 這樣 src/types.ts 不會隨著功能增加而無限膨脹，
 * 元件目錄也能自成一個可搬動的單元。
 */
import type { RefObject } from 'react'
import type { SearchBarHandle } from '../../components/SearchBar/types.ts'
import type {
  GeolocationStatus,
  Place,
  TemperatureUnit,
  WeatherResult,
  WeatherStatus,
} from '../../types.ts'

/** Home 頁面對外需要的全部輸入：頁面本身不持有任何應用狀態。 */
export interface HomeProps {
  /** 狀態機目前所處的狀態 */
  status: WeatherStatus
  /** 使用者「要求」查詢的地點 */
  place: Place | null
  /** 最近一次成功載入的結果；null 表示目前沒有任何資料可顯示 */
  result: WeatherResult | null
  /** 最近一次的錯誤；成功時為 null */
  error: Error | null
  /** 目前的溫度單位（使用者偏好） */
  unit: TemperatureUnit
  /** 使用者選中一個地點（搜尋候選或熱門捷徑） */
  onSelectPlace: (place: Place) => void
  /** 定位流程的狀態（'locating' 時按鈕轉圈、停用） */
  locateStatus: GeolocationStatus
  /** 定位失敗的錯誤；null 表示沒有錯誤可顯示 */
  locateError: Error | null
  /** 定位錯誤值不值得給「重試」（權限被拒時不值得） */
  canRetryLocate: boolean
  /** 使用者按下「使用我的位置」（同時也是定位失敗後的「重試」） */
  onLocate: () => void
  /**
   * 搜尋列的命令式把手。定位成功後要由外層清掉輸入框，
   * 但搜尋狀態仍歸搜尋列自己管，所以這裡只傳 ref 而不是把 keyword 提升上來。
   */
  searchBarRef: RefObject<SearchBarHandle>
  /** 使用者切換 °C / °F */
  onUnitChange: (unit: TemperatureUnit) => void
  /** 使用者按下「重試」 */
  onRetry: () => void
}
