import type { TemperatureUnit } from '../../types.ts'

/** 單一選項。value 以字面型別收窄，避免傳入 'K' 這種未支援的單位。 */
export interface UnitOption {
  value: TemperatureUnit
  label: string
}

export interface UnitToggleProps {
  unit: TemperatureUnit
  onChange: (unit: TemperatureUnit) => void
}
