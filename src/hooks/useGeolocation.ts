/**
 * 狀態層：定位流程的小型狀態機，與 useWeather 同一套寫法。
 *
 * 為什麼定位也要一個狀態機，而不是在按鈕的 onClick 裡直接 await？
 * 因為「定位中」必須反映到畫面上（按鈕要轉圈、要停用），
 * 而那個畫面狀態屬於 React，不該活在事件處理函式的閉包裡。
 *
 *   idle ──locate()──▶ locating ──成功──▶ idle（回傳 Place）
 *                          │
 *                          └──失敗──▶ error（保留錯誤，可重試）
 *
 * 注意：這裡不持有座標，只「產生」地點並交給呼叫端。
 * 定位成功的 Place 會被交給 useWeather.selectPlace，
 * 兩個狀態機各管一件事，不互相污染。
 */
import { useCallback, useReducer } from 'react'
import {
  createCurrentLocationPlace,
  getCurrentCoordinates,
  isGeolocationError,
} from '../api/geolocation.ts'
import type { GeolocationStatus, Place, UseGeolocation } from '../types.ts'

export type GeolocationAction =
  | { type: 'LOCATE_START' }
  | { type: 'LOCATE_SUCCESS' }
  | { type: 'LOCATE_ERROR'; error: Error }
  | { type: 'RESET' }

export interface GeolocationState {
  status: GeolocationStatus
  error: Error | null
}

export const initialGeolocationState: GeolocationState = {
  status: 'idle',
  error: null,
}

export function geolocationReducer(
  state: GeolocationState,
  action: GeolocationAction,
): GeolocationState {
  switch (action.type) {
    case 'LOCATE_START':
      // 上一次的錯誤在重新定位時就失效了，先清掉再開始
      return { status: 'locating', error: null }

    case 'LOCATE_SUCCESS':
      return initialGeolocationState

    case 'LOCATE_ERROR':
      return { status: 'error', error: action.error }

    case 'RESET':
      return initialGeolocationState

    default:
      return state
  }
}

export function useGeolocation(): UseGeolocation {
  const [state, dispatch] = useReducer(geolocationReducer, initialGeolocationState)

  const locate = useCallback(async (): Promise<Place | null> => {
    dispatch({ type: 'LOCATE_START' })
    try {
      const coordinates = await getCurrentCoordinates()
      dispatch({ type: 'LOCATE_SUCCESS' })
      return createCurrentLocationPlace(coordinates)
    } catch (error: unknown) {
      dispatch({
        type: 'LOCATE_ERROR',
        error: error instanceof Error ? error : new Error(String(error)),
      })
      return null
    }
  }, [])

  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  // 權限被拒／環境不支援時，再按重試也不會變好，UI 就不該給那個按鈕
  const canRetry = state.error ? !isGeolocationError(state.error) || state.error.retryable : false

  return { status: state.status, error: state.error, canRetry, locate, reset }
}
