/**
 * 通用的 localStorage 狀態 Hook。
 *
 * 放在這裡的理由：應用有兩個需要「跨次開啟保留」的偏好設定
 * （上次查詢的地點、溫度單位），把它們的讀寫邏輯抽出來，
 * 元件就不需要各自處理 JSON 解析失敗、SSR 無 window 等細節。
 */
import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

/**
 * 刻意在這裡使用泛型：寫入時是什麼型別，讀回來就還是什麼型別。
 * 注意 localStorage 的內容可能是舊版本或被外部改過的，
 * 這裡只保證「形狀不對就退回預設值」，不做完整的執行期驗證
 * （真要嚴謹可以用 zod，但對兩個偏好設定來說是過度設計）。
 */
export function usePersistentState<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readStoredValue(key, initialValue))
  const keyRef = useRef(key)

  useEffect(() => {
    keyRef.current = key
  }, [key])

  useEffect(() => {
    try {
      if (value === null || value === undefined) {
        window.localStorage.removeItem(keyRef.current)
      } else {
        window.localStorage.setItem(keyRef.current, JSON.stringify(value))
      }
    } catch {
      // 無痕模式或儲存空間已滿：偏好設定寫不進去不該讓應用壞掉，靜默略過
    }
  }, [value])

  return [value, setValue]
}

function readStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    // 內容被外部改壞時，回退到預設值而不是讓整個應用掛掉
    return fallback
  }
}
