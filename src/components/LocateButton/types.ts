/**
 * LocateButton 元件專屬型別。
 * 只描述這個按鈕需要的輸入，不引用外層的任何狀態。
 */
import type { GeolocationStatus } from '../../types.ts'

export interface LocateButtonProps {
  /** 定位流程目前的狀態：'locating' 時按鈕轉圈並停用 */
  status: GeolocationStatus
  /** 使用者按下按鈕（定位中的重複點擊由 disabled 擋掉） */
  onClick: () => void
}
