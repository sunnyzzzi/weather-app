import type { Place } from '../../types.ts'

export interface SearchBarProps {
  /** 使用者選中某個候選地點。搜尋過程（防抖、候選、錯誤）都由元件自己負責。 */
  onSelect: (place: Place) => void
  /** 是否自動聚焦；目前未使用，保留給未來「一進頁面就讓使用者輸入」的情境 */
  autoFocus?: boolean
}
