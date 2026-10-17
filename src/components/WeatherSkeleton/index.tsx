/**
 * 載入骨架（Skeleton）。
 *
 * 用骨架而不是轉圈圈：骨架的形狀與最終內容一致，
 * 資料到位時版面不會跳動（layout shift），感知等待時間也比較短。
 *
 * 這個元件沒有 props，因此目錄下不需要 types.ts
 * （共用的領域型別放 src/types.ts，只有「自己會用到」的型別才放元件目錄）。
 */
import './index.less'

export default function WeatherSkeleton() {
  return (
    <div className="skeleton" aria-busy="true" aria-live="polite">
      <span className="sr-only">天氣資料載入中…</span>
      <div className="card skeleton__hero">
        <div className="skeleton__line skeleton__line--lg" />
        <div className="skeleton__line skeleton__line--md" />
        <div className="skeleton__line skeleton__line--sm" />
      </div>
      <div className="card skeleton__block" />
      <div className="card skeleton__block" />
    </div>
  )
}
