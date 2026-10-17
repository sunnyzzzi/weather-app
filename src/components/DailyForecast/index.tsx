/**
 * 未來 7 天預報。
 *
 * 溫度範圍用「長條」呈現而非只寫兩個數字：
 * 一週之內的相對高低一眼可見，這是純文字做不到的資訊。
 * 長條的左右位置是相對「本週最低 / 最高」計算，所以同一張圖內可比較。
 */
import {
  addDays,
  convertTemperature,
  describeWeather,
  formatDate,
  formatWeekday,
  todayFrom,
} from '../../utils/weatherCodes.ts'
import type { DailyForecastProps } from './types.ts'
import './index.less'

export default function DailyForecast({ days, unit, observedAt }: DailyForecastProps) {
  if (!days?.length) return null

  const today = todayFrom(observedAt)
  const tomorrow = addDays(today, 1)

  // 缺值的日子不參與全域尺度的計算，否則長條會被 null 拉歪
  const lows = days.map((day) => day.temperatureMin).filter((value): value is number => value != null)
  const highs = days.map((day) => day.temperatureMax).filter((value): value is number => value != null)
  const weekMin = lows.length ? Math.min(...lows) : 0
  const weekMax = highs.length ? Math.max(...highs) : weekMin + 1
  const span = Math.max(weekMax - weekMin, 1) // 防止除以零

  return (
    <section className="card section">
      <h2 className="section__title">未來 7 天</h2>
      <ul className="daily">
        {days.map((day) => {
          const weather = describeWeather(day.weatherCode, { isDay: true })
          const min = day.temperatureMin ?? weekMin
          const max = day.temperatureMax ?? min
          const left = ((min - weekMin) / span) * 100
          const width = ((max - min) / span) * 100

          return (
            <li className="daily__row" key={day.date}>
              <div className="daily__when">
                <span className="daily__weekday">{formatWeekday(day.date, { today, tomorrow })}</span>
                <span className="daily__date">{formatDate(day.date)}</span>
              </div>

              <div className="daily__condition">
                <span className="daily__icon" aria-hidden="true">
                  {weather.icon}
                </span>
                <span className="daily__label">{weather.label}</span>
              </div>

              <div className="daily__rain">
                {day.precipitationProbability ? `💧${day.precipitationProbability}%` : ''}
              </div>

              <div className="daily__range">
                <span className="daily__temp daily__temp--min">{convertTemperature(day.temperatureMin, unit)}</span>
                <span className="daily__track" aria-hidden="true">
                  <span
                    className="daily__bar"
                    style={{ left: `${left}%`, width: `${Math.max(width, 6)}%` }}
                  />
                </span>
                <span className="daily__temp daily__temp--max">{convertTemperature(day.temperatureMax, unit)}</span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
