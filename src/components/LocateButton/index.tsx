/**
 * 「使用我的位置」按鈕。
 *
 * 兩個刻意的行為：
 *  - 定位一定要由使用者點擊觸發。若在一進頁面就自動定位，
 *    瀏覽器會立刻彈出權限詢問，使用者還不知道這應用要幹嘛就要做決定，
 *    這是行動版最常見的「一進來就嚇跑人」反模式。
 *  - 定位中停用按鈕並顯示轉圈，避免連點產生多次權限請求。
 */
import type { LocateButtonProps } from './types.ts'
import './index.less'

export default function LocateButton({ status, onClick }: LocateButtonProps) {
  const isLocating = status === 'locating'

  return (
    <button
      type="button"
      className="locate"
      onClick={onClick}
      disabled={isLocating}
      aria-busy={isLocating}
    >
      <span className="locate__icon" aria-hidden="true">
        {isLocating ? <span className="spinner spinner--sm" /> : '📍'}
      </span>
      {isLocating ? '定位中…' : '使用我的位置'}
    </button>
  )
}
