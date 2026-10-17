import type { Place } from '../../types.ts'

export interface SearchBarProps {
  /** 使用者選中某個候選地點。搜尋過程（防抖、候選、錯誤）都由元件自己負責。 */
  onSelect: (place: Place) => void
  /** 是否自動聚焦；目前未使用，保留給未來「一進頁面就讓使用者輸入」的情境 */
  autoFocus?: boolean
}

/**
 * 外層可以對搜尋列下的命令（透過 ref 取得）。
 *
 * 為什麼不是把 keyword 提升到 App？
 * 因為「防抖、候選、選取」這整組互動是搜尋列自己的事，提升上去會讓 App
 * 被迫認識搜尋的中間狀態。這裡只開一個最小的洞：外層能要求清空，
 * 但仍然看不到也改不到搜尋列內部的任何狀態。
 */
export interface SearchBarHandle {
  /** 清空輸入框與候選清單 */
  clear: () => void
}
