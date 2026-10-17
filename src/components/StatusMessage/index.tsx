/**
 * 全頁狀態訊息：用於「沒有任何資料可顯示」的場合（首次載入失敗、尚未搜尋）。
 * 有舊資料可顯示時不要用這個元件，改用 ErrorBanner，避免把已載入的內容清空。
 */
import type { StatusMessageProps } from './types.ts'
import './index.less'

export default function StatusMessage({
  icon = 'ℹ️',
  title,
  description,
  actionLabel,
  onAction,
  tone = 'neutral',
}: StatusMessageProps) {
  return (
    <div className={`status status--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <div className="status__icon" aria-hidden="true">
        {icon}
      </div>
      <h2 className="status__title">{title}</h2>
      {description && <p className="status__description">{description}</p>}
      {actionLabel && onAction && (
        <button type="button" className="button button--primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
