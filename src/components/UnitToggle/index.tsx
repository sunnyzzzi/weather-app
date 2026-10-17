/**
 * 溫度單位切換（°C / °F）。
 *
 * 單位是一個「使用者偏好」，不是「天氣資料」的一部分，
 * 所以它放在 App 層並持久化到 localStorage，與 useWeather 的狀態機完全解耦
 * ——切換單位不會引發任何網路請求。
 */
import type { UnitOption, UnitToggleProps } from './types.ts'
import './index.less'

/** as const satisfies：保留字面型別供推導，同時強制每個選項都符合 UnitOption。 */
const UNITS = [
  { value: 'C', label: '°C' },
  { value: 'F', label: '°F' },
] as const satisfies readonly UnitOption[]

export default function UnitToggle({ unit, onChange }: UnitToggleProps) {
  return (
    <div className="unit-toggle" role="radiogroup" aria-label="溫度單位">
      {UNITS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={unit === option.value}
          className={`unit-toggle__option${unit === option.value ? ' is-active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
