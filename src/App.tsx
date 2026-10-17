/**
 * App：應用程式的「殼」，負責組裝而不是畫版面。
 *
 * 這裡只做三件事：
 * 1. 把持久化偏好（上次的地點、溫度單位）接進狀態層；
 * 2. 呼叫 hooks 取得狀態與動作；
 * 3. 交給頁面層（pages/Home）去呈現。
 *
 * 版面與「什麼狀態顯示什麼」的判斷都在 pages/Home 裡，
 * 所以未來要加路由或第二個頁面時，這個檔案只會多一行切換，不會變長。
 */
import { useCallback, useEffect } from 'react'
import Home from './pages/Home/index.tsx'
import { useWeather } from './hooks/useWeather.ts'
import { usePersistentState } from './hooks/usePersistentState.ts'
import type { Place, TemperatureUnit } from './types.ts'

const LAST_PLACE_KEY = 'weather-app:last-place'
const UNIT_KEY = 'weather-app:unit'

export default function App() {
  const [savedPlace, setSavedPlace] = usePersistentState<Place | null>(LAST_PLACE_KEY, null)
  const [unit, setUnit] = usePersistentState<TemperatureUnit>(UNIT_KEY, 'C')

  const { status, place, result, error, selectPlace, retry } = useWeather(savedPlace)

  // 只記住「真的載入成功」的地點：若某個城市一直連不上，
  // 下次打開時不該又卡在同一個失敗的地方。
  useEffect(() => {
    if (result) setSavedPlace(result.place)
  }, [result, setSavedPlace])

  const handleSelectPlace = useCallback(
    (nextPlace: Place) => {
      selectPlace(nextPlace)
    },
    [selectPlace],
  )

  return (
    <Home
      status={status}
      place={place}
      result={result}
      error={error}
      unit={unit}
      onSelectPlace={handleSelectPlace}
      onUnitChange={setUnit}
      onRetry={retry}
    />
  )
}
