/**
 * 搜尋層：關鍵字 → 候選地點清單。
 *
 * 這個 Hook 負責三件容易被忽略的事：
 * 1. 防抖（debounce）：輸入「香港」不該發出三次請求；
 * 2. 競態保護（AbortController）：快速輸入時只採用最後一次的結果；
 * 3. 區分「搜尋失敗」與「搜尋成功但無結果」——這兩者的使用者下一步完全不同。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { isApiError, searchPlaces } from '../api/weatherApi.ts'
import type { SearchState, UsePlaceSearch } from '../types.ts'

const DEBOUNCE_MS = 300

const IDLE_STATE: SearchState = { status: 'idle', results: [], error: null }

export interface UsePlaceSearchOptions {
  onError?: (error: Error) => void
}

export function usePlaceSearch({ onError }: UsePlaceSearchOptions = {}): UsePlaceSearch {
  const [keyword, setKeyword] = useState('')
  const [searchState, setSearchState] = useState<SearchState>(IDLE_STATE)

  const abortRef = useRef<AbortController | null>(null)
  /**
   * 選中候選地點後，我們會把「完整名稱」填回輸入框（讓使用者知道選了什麼）。
   * 但那是一次「程式化填入」，不是使用者打字，不該再觸發一次搜尋——
   * 否則「香港，香港」這種組合字串會立刻搜尋失敗。
   */
  const skipNextSearchRef = useRef(false)
  // 用 ref 保存 callback：避免呼叫端傳入行內函式時，
  // 每次 render 都讓下面的 debounce effect 重跑（那會讓防抖失效）。
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false
      // 使用者已經選定地點了，這一輪搜尋就此結束：清掉候選，
      // 否則下次聚焦輸入框時會看到與目前輸入內容不相符的舊清單。
      setSearchState(IDLE_STATE)
      return undefined
    }

    const trimmed = keyword.trim()
    if (!trimmed) {
      abortRef.current?.abort()
      setSearchState(IDLE_STATE)
      return undefined
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setSearchState((prev) => ({ status: 'loading', results: prev.results, error: null }))

      try {
        const results = await searchPlaces(trimmed, { signal: controller.signal })
        setSearchState({
          status: results.length > 0 ? 'success' : 'empty',
          results,
          error: null,
        })
      } catch (error) {
        if (isApiError(error) && error.kind === 'abort') return
        const normalized = error instanceof Error ? error : new Error(String(error))
        setSearchState({ status: 'error', results: [], error: normalized })
        onErrorRef.current?.(normalized)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [keyword])

  /** 使用者打字 */
  const updateKeyword = useCallback((value: string) => setKeyword(value), [])

  /** 程式化填入（選中地點後回填），不會觸發搜尋 */
  const fillKeyword = useCallback((value: string) => {
    skipNextSearchRef.current = true
    setKeyword(value)
  }, [])

  /** 清空輸入與結果 */
  const resetSearch = useCallback(() => {
    skipNextSearchRef.current = false
    abortRef.current?.abort()
    setKeyword('')
    setSearchState(IDLE_STATE)
  }, [])

  return { keyword, searchState, updateKeyword, fillKeyword, resetSearch }
}
