/**
 * Home 頁面：整個應用目前唯一的頁面。
 *
 * 頁面層負責「把狀態翻譯成畫面」——也就是 header / main / footer 的版面，
 * 以及「什麼狀態下該出現哪一塊」的判斷。它自己不發請求、不持有應用狀態，
 * 全部由 props 傳入，因此換成其他頁面（例如多城市的 Compare 頁）時，
 * 底下的元件與 hooks 可以整組沿用。
 *
 * 為什麼要拆出這一層，而不是讓 App.tsx 直接寫完？
 * 因為 App 的角色是「應用的殼」：偏好持久化、狀態機組裝、未來可能還有路由。
 * 把版面留在 App 裡，App 會同時是容器又是頁面，兩件事的修改原因不同卻綁在一起。
 */
import SearchBar from '../../components/SearchBar/index.tsx'
import CurrentWeather from '../../components/CurrentWeather/index.tsx'
import HourlyForecast from '../../components/HourlyForecast/index.tsx'
import DailyForecast from '../../components/DailyForecast/index.tsx'
import StatusMessage from '../../components/StatusMessage/index.tsx'
import ErrorBanner from '../../components/ErrorBanner/index.tsx'
import WeatherSkeleton from '../../components/WeatherSkeleton/index.tsx'
import UnitToggle from '../../components/UnitToggle/index.tsx'
import LocateButton from '../../components/LocateButton/index.tsx'
import { POPULAR_PLACES } from '../../data/popularPlaces.ts'
import type { HomeProps } from './types.ts'
import './index.less'

export default function Home({
  status,
  place,
  result,
  error,
  unit,
  onSelectPlace,
  onUnitChange,
  onRetry,
  locateStatus,
  locateError,
  canRetryLocate,
  onLocate,
}: HomeProps) {
  const hasData = Boolean(result)
  const isRefreshing = status === 'loading' && hasData
  // 有舊資料時，錯誤降級為橫幅；沒有任何資料才佔滿整頁
  const showFullPageError = status === 'error' && !hasData
  const showSkeleton = status === 'loading' && !hasData

  return (
    <div className="app">
      <div className="app__glow" aria-hidden="true" />

      <header className="app__header">
        <div className="app__brand">
          <span className="app__logo" aria-hidden="true">
            🌤️
          </span>
          <div>
            <h1 className="app__title">天氣</h1>
            <p className="app__subtitle">搜尋地點，查看即時天氣與未來預報</p>
          </div>
        </div>
        <UnitToggle unit={unit} onChange={onUnitChange} />
      </header>

      <main className="app__main">
        <div className="app__search">
          <div className="app__search-row">
            <SearchBar onSelect={onSelectPlace} />
            <LocateButton status={locateStatus} onClick={onLocate} />
          </div>

          {/*
            定位失敗是「附加動作失敗」，不是「天氣載入失敗」：
            底下可能已經有別的地點資料在讀，所以用一條輕量提示，
            不佔滿整頁、也不會蓋掉主要內容。
          */}
          {locateError && (
            <p className="app__locate-error" role="alert">
              <span aria-hidden="true">📍</span>
              <span>{locateError.message}</span>
              {canRetryLocate && (
                <button type="button" className="app__locate-retry" onClick={onLocate}>
                  重試
                </button>
              )}
            </p>
          )}
        </div>

        {isRefreshing && (
          <p className="app__refreshing" role="status">
            <span className="spinner spinner--sm" aria-hidden="true" />
            正在載入「{place?.name}」的天氣…
          </p>
        )}

        {status === 'error' && hasData && (
          <ErrorBanner
            error={error}
            requestedPlace={place}
            dataPlace={result?.place ?? null}
            onRetry={onRetry}
          />
        )}

        {showFullPageError && (
          <StatusMessage
            tone="error"
            icon="⚠️"
            title={error?.message ?? '載入失敗'}
            description="可能是網路連線問題，也可能是服務暫時無法回應。請稍後再試一次。"
            actionLabel="重試"
            onAction={onRetry}
          />
        )}

        {showSkeleton && <WeatherSkeleton />}

        {!hasData && status === 'idle' && (
          <section className="card intro">
            <h2 className="intro__title">出發前，先看看天氣吧</h2>
            <p className="intro__text">選個地點，看看那裡現在怎麼樣：</p>
            <div className="chips">
              {POPULAR_PLACES.map((popular) => (
                <button
                  key={popular.id}
                  type="button"
                  className="chip"
                  onClick={() => onSelectPlace(popular)}
                >
                  {popular.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {result && (
          <div className="app__content" data-status={status}>
            <CurrentWeather place={result.place} data={result.data} unit={unit} />
            <HourlyForecast hours={result.data.hourly} unit={unit} />
            <DailyForecast days={result.data.daily} unit={unit} observedAt={result.data.observedAt} />
          </div>
        )}
      </main>

      <footer className="app__footer">
        <p>
          天氣資料來源：<a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>
          （免費、無需 API Key）。時間為該地點當地時間。
        </p>
      </footer>
    </div>
  )
}
