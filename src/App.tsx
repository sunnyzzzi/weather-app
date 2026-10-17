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
import { useGeolocation } from './hooks/useGeolocation.ts'
import { usePersistentState } from './hooks/usePersistentState.ts'
import { CURRENT_LOCATION_ID } from './api/geolocation.ts'
import type { Place, TemperatureUnit } from './types.ts'

const LAST_PLACE_KEY = 'weather-app:last-place'
const UNIT_KEY = 'weather-app:unit'

export default function App() {
  const [savedPlace, setSavedPlace] = usePersistentState<Place | null>(LAST_PLACE_KEY, null)
  const [unit, setUnit] = usePersistentState<TemperatureUnit>(UNIT_KEY, 'C')

  // 還原上次的地點，但「目前位置」不還原：座標是會變的，
  // 套用舊座標會顯示錯誤地點的天氣，而使用者不會察覺。
  const restoredPlace = savedPlace && savedPlace.id !== CURRENT_LOCATION_ID ? savedPlace : null

  const { status, place, result, error, selectPlace, retry } = useWeather(restoredPlace)
  const { status: locateStatus, error: locateError, canRetry, locate } = useGeolocation()

  // 只記住「真的載入成功」的地點：若某個城市一直連不上，
  // 下次打開時不該又卡在同一個失敗的地方。
  // 「目前位置」同樣不寫入——除了上面的理由，自動重新定位還會在
  // 沒有使用者手勢的情況下彈出權限詢問，那是很差的體驗。
  useEffect(() => {
    if (!result) return
    if (result.place.id === CURRENT_LOCATION_ID) return
    setSavedPlace(result.place)
  }, [result, setSavedPlace])

  const handleSelectPlace = useCallback(
    (nextPlace: Place) => {
      selectPlace(nextPlace)
    },
    [selectPlace],
  )

  // 定位成功後，把座標包成的 Place 交給既有的天氣狀態機，
  // 後面的載入、競態保護、錯誤降級全部沿用同一條路徑。
  const handleLocate = useCallback(() => {
    void locate().then((locatedPlace) => {
      if (locatedPlace) selectPlace(locatedPlace)
    })
  }, [locate, selectPlace])

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
      locateStatus={locateStatus}
      locateError={locateError}
      canRetryLocate={canRetry}
      onLocate={handleLocate}
    />
  )
}
