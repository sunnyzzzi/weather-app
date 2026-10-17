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
import { useCallback, useEffect, useRef } from 'react'
import Home from './pages/Home/index.tsx'
import { useWeather } from './hooks/useWeather.ts'
import { useGeolocation } from './hooks/useGeolocation.ts'
import { usePersistentState } from './hooks/usePersistentState.ts'
import { canLocateSilently, CURRENT_LOCATION_ID } from './api/geolocation.ts'
import type { SearchBarHandle } from './components/SearchBar/types.ts'
import type { Place, TemperatureUnit } from './types.ts'

const LAST_PLACE_KEY = 'weather-app:last-place'
const UNIT_KEY = 'weather-app:unit'
/** 記住「上次看的是目前位置」這件事（只存布林值，不存座標） */
const PREFER_CURRENT_KEY = 'weather-app:prefer-current-location'

export default function App() {
  const [savedPlace, setSavedPlace] = usePersistentState<Place | null>(LAST_PLACE_KEY, null)
  const [unit, setUnit] = usePersistentState<TemperatureUnit>(UNIT_KEY, 'C')
  const [preferCurrentLocation, setPreferCurrentLocation] = usePersistentState<boolean>(
    PREFER_CURRENT_KEY,
    false,
  )

  // 還原上次的地點，但「目前位置」不還原座標：座標是會變的，
  // 套用舊座標會顯示錯誤地點的天氣，而使用者不會察覺。
  const restoredPlace = savedPlace && savedPlace.id !== CURRENT_LOCATION_ID ? savedPlace : null

  const { status, place, result, error, selectPlace, retry } = useWeather(restoredPlace)
  const {
    status: locateStatus,
    error: locateError,
    canRetry,
    locate,
    reset: resetLocate,
  } = useGeolocation()

  // 只記住「真的載入成功」的地點：若某個城市一直連不上，
  // 下次打開時不該又卡在同一個失敗的地方。
  //
  // 「目前位置」改成只記一個旗標（不記座標）：
  // 座標會過期，但「使用者上次想看的是目前位置」這個意圖不會。
  useEffect(() => {
    if (!result) return
    const isCurrentLocation = result.place.id === CURRENT_LOCATION_ID
    setPreferCurrentLocation(isCurrentLocation)
    if (!isCurrentLocation) setSavedPlace(result.place)
  }, [result, setSavedPlace, setPreferCurrentLocation])

  const handleSelectPlace = useCallback(
    (nextPlace: Place) => {
      selectPlace(nextPlace)
    },
    [selectPlace],
  )

  const searchBarRef = useRef<SearchBarHandle>(null)

  // 定位成功後，把座標包成的 Place 交給既有的天氣狀態機，
  // 後面的載入、競態保護、錯誤降級全部沿用同一條路徑。
  const handleLocate = useCallback(() => {
    void locate().then((locatedPlace) => {
      if (!locatedPlace) return
      selectPlace(locatedPlace)
      // 順手清掉搜尋框：留著上一次的關鍵字（或回填的地名）會讓人以為
      // 畫面上顯示的仍是那個地點的天氣，而不是「目前位置」。
      searchBarRef.current?.clear()
    })
  }, [locate, selectPlace])

  /*
   * 重新整理後若「上次看的是目前位置」，就自動補一次定位。
   *
   * 兩個前提，缺一不可：
   *  1. 權限必須已經是 granted —— 這時 getCurrentPosition 不會彈出詢問框，
   *     等於是把使用者已經做過的決定再執行一次，不算打擾；
   *  2. 失敗要靜默 —— 自動行為失敗不該主動彈錯誤打斷使用者，
   *     畫面維持在已還原的城市就好，使用者想重試可以自己按按鈕。
   */
  const autoLocateAttemptedRef = useRef(false)
  useEffect(() => {
    if (autoLocateAttemptedRef.current) return
    autoLocateAttemptedRef.current = true
    if (!preferCurrentLocation) return

    void canLocateSilently().then((allowed) => {
      if (!allowed) return
      void locate().then((locatedPlace) => {
        if (locatedPlace) {
          selectPlace(locatedPlace)
          return
        }
        resetLocate()
      })
    })
  }, [preferCurrentLocation, locate, resetLocate, selectPlace])

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
      searchBarRef={searchBarRef}
    />
  )
}
