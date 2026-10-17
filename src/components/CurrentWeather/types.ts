import type { Place, TemperatureUnit, WeatherData } from '../../types.ts'

export interface CurrentWeatherProps {
  place: Place
  data: WeatherData
  unit: TemperatureUnit
}

/** 卡片下方那排觀測值（濕度、風、紫外線…）的單一項目。 */
export interface MetricProps {
  icon: string
  label: string
  /** 缺值時由呼叫端以 '—' 呈現，元件本身不處理單位的語系差異 */
  value: string
}
