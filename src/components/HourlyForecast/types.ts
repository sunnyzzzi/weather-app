import type { HourlyPoint, TemperatureUnit } from '../../types.ts'

export interface HourlyForecastProps {
  hours: HourlyPoint[]
  unit: TemperatureUnit
}
