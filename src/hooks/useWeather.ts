/**
 * 狀態層：以 useReducer 實作明確的天氣狀態機。
 *
 * 為什麼用狀態機而不是多個 useState？
 * 天氣資料的狀態是「互斥」的：idle / loading / success / error 同時只會有一個成立。
 * 用四個 useState 就可能出現 loading && error 這種不合法組合；
 * 用單一 reducer 讓不合法狀態在結構上無法表達（make illegal states unrepresentable）。
 *
 * 狀態流轉：
 *   idle ──selectPlace──▶ loading ──成功──▶ success
 *                            │                  │
 *                            └──失敗──▶ error ◀─┘（重試回到 loading）
 *
 * 型別設計：action 用「可辨識聯合」（discriminated union），
 * 因此 switch 的每個分支都能把對應的欄位收窄到正確型別，
 * 例如 LOAD_SUCCESS 分支裡 action.data 一定是 WeatherData。
 */
import { useCallback, useEffect, useReducer, useRef } from 'react'
import { fetchWeather, isApiError } from '../api/weatherApi.ts'
import type { Place, UseWeather, WeatherData, WeatherState } from '../types.ts'

export type WeatherAction =
  | { type: 'SELECT_PLACE'; place: Place }
  | { type: 'RETRY' }
  | { type: 'LOAD_SUCCESS'; data: WeatherData }
  | { type: 'LOAD_ERROR'; error: Error }
  | { type: 'CLEAR' }

export function createInitialState(initialPlace: Place | null = null): WeatherState {
  return {
    status: initialPlace ? 'loading' : 'idle',
    place: initialPlace,
    result: null,
    error: null,
    attempt: initialPlace ? 1 : 0,
  }
}

export function weatherReducer(state: WeatherState, action: WeatherAction): WeatherState {
  switch (action.type) {
    case 'SELECT_PLACE':
      // 刻意「不清掉」上一次的結果。天氣應用最常見的失敗場景是
      // 「已看到香港、想切到東京、但當下斷網」——此時清空畫面會讓使用者
      // 連原本看得到的資訊也失去。保留結果並記下它屬於哪個地點，
      // 由 UI 用橫幅明確標示「正在顯示的其實是香港的資料」。
      return {
        status: 'loading',
        place: action.place,
        result: state.result,
        error: null,
        attempt: state.attempt + 1,
      }

    case 'RETRY':
      if (!state.place) return state
      return { ...state, status: 'loading', error: null, attempt: state.attempt + 1 }

    case 'LOAD_SUCCESS':
      // 把資料與「它所屬的地點」綁在一起，避免畫面標題與內容錯位
      return {
        ...state,
        status: 'success',
        result: state.place ? { place: state.place, data: action.data } : state.result,
        error: null,
      }

    case 'LOAD_ERROR':
      // 保留 state.result：失敗時底下的舊資料仍可讀，由 UI 決定要不要顯示橫幅
      return { ...state, status: 'error', error: action.error }

    case 'CLEAR':
      return createInitialState(null)

    default:
      return state
  }
}

/** @param initialPlace 上次查詢的地點（從 localStorage 還原） */
export function useWeather(initialPlace: Place | null = null): UseWeather {
  const [state, dispatch] = useReducer(weatherReducer, initialPlace, createInitialState)
  const abortRef = useRef<AbortController | null>(null)

  const { place, attempt } = state

  // 副作用由 state 驅動：place / attempt 一變就重新抓資料。
  // 這樣「換地點」與「重試」走的是同一條路徑，不必維護第二份邏輯。
  useEffect(() => {
    if (!place) return undefined

    // 競態保護：發新請求前先取消舊的。
    // 用戶快速切換城市時，只有最後一次請求的結果會被採用，
    // 慢回來的舊回應不會覆蓋新畫面。
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    let cancelled = false

    fetchWeather(place, { signal: controller.signal })
      .then((data) => {
        if (cancelled) return
        dispatch({ type: 'LOAD_SUCCESS', data })
      })
      .catch((error: unknown) => {
        // 被自己取消的請求不是錯誤，靜默忽略。
        // 注意：API 層會把原生的 AbortError 包成 ApiError({ kind: 'abort' })，
        // 所以這裡判斷的是 kind 而不是 error.name。
        if (cancelled) return
        if (isApiError(error) && error.kind === 'abort') return
        dispatch({ type: 'LOAD_ERROR', error: error instanceof Error ? error : new Error(String(error)) })
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [place, attempt])

  const selectPlace = useCallback((nextPlace: Place) => {
    dispatch({ type: 'SELECT_PLACE', place: nextPlace })
  }, [])

  const retry = useCallback(() => dispatch({ type: 'RETRY' }), [])

  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), [])

  return { ...state, selectPlace, retry, clear }
}
