import type { DailyPoint, TemperatureUnit } from '../../types.ts'

export interface DailyForecastProps {
  days: DailyPoint[]
  unit: TemperatureUnit
  /** 觀測時間（該地點當地時間）；用來判斷哪一天是「今天」 */
  observedAt: string | null
}
