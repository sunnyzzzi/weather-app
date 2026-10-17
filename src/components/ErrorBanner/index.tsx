/**
 * 錯誤橫幅：當「畫面上已有可讀資料」但新的一次請求失敗時顯示。
 *
 * 這是刻意的設計取捨：寧可讓使用者繼續讀稍微過期的天氣，
 * 也不要把整頁清空成錯誤畫面（清空會伴隨明顯的閃爍與資訊損失）。
 * 為了不讓「標題是東京、內容是香港」造成誤解，
 * 橫幅必須明確說出目前顯示的資料屬於哪個地點。
 */
import type { ErrorBannerProps } from './types.ts'
import './index.less'

export default function ErrorBanner({ error, requestedPlace, dataPlace, onRetry }: ErrorBannerProps) {
  if (!error) return null

  const isOtherPlace = Boolean(requestedPlace && dataPlace && requestedPlace.id !== dataPlace.id)
  const hint = isOtherPlace
    ? `「${requestedPlace?.name}」載入失敗，以下仍顯示「${dataPlace?.name}」的資料。`
    : '以下顯示的是上一次成功載入的資料。'

  return (
    <div className="banner" role="alert">
      <span className="banner__icon" aria-hidden="true">
        ⚠️
      </span>
      <div className="banner__text">
        <strong className="banner__title">{error.message}</strong>
        <span className="banner__hint">{hint}</span>
      </div>
      {onRetry && (
        <button type="button" className="button button--ghost" onClick={onRetry}>
          重試
        </button>
      )}
    </div>
  )
}
