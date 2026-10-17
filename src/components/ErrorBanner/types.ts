import type { Place } from '../../types.ts'

export interface ErrorBannerProps {
  error: Error | null
  /** 使用者要求載入的地點 */
  requestedPlace: Place | null
  /** 畫面上實際顯示的資料屬於哪個地點 */
  dataPlace: Place | null
  onRetry?: () => void
}
