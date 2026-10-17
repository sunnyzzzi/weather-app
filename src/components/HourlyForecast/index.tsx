/**
 * 未來 24 小時預報：橫向捲動的時序列。
 *
 * 這裡用「橫向捲動」而不是把所有 24 格塞進版面，
 * 是因為時序資料天生就是線性的，讓使用者自己滑比自動抽稀更直覺。
 */
import { convertTemperature, describeWeather, formatHour } from '../../utils/weatherCodes.ts'
import type { HourlyForecastProps } from './types.ts'
import './index.less'

export default function HourlyForecast({ hours, unit }: HourlyForecastProps) {
  if (!hours?.length) return null

  return (
    <section className="card section">
      <h2 className="section__title">未來 24 小時</h2>
      <ul className="hourly" tabIndex={0} aria-label="未來 24 小時預報，可橫向捲動">
        {hours.map((hour, index) => {
          // API 只提供「當前」是否為白天，逐時資料用鐘點粗略判斷日夜（6:00–18:59 視為白天）
          const hourOfDay = Number(hour.time.slice(11, 13))
          const weather = describeWeather(hour.weatherCode, { isDay: hourOfDay >= 6 && hourOfDay < 19 })
          const timeLabel = index === 0 ? '現在' : formatHour(hour.time)

          return (
            <li
              className="hourly__item"
              key={hour.time}
              // 用 aria-label 而不是在其中再放一個視覺隱藏的文字節點：
              // 視覺隱藏元素通常是 position:absolute，在橫向捲動容器裡
              // 它的包含塊會落到容器外，因而逃過裁切、把整頁撐寬
              // （這個問題就是這樣被瀏覽器實測抓出來的）。
              aria-label={`${timeLabel}，${weather.label}，${convertTemperature(hour.temperature, unit)}`}
            >
              <p className="hourly__time">{timeLabel}</p>
              <p className="hourly__icon" aria-hidden="true">
                {weather.icon}
              </p>
              <p className="hourly__temp">{convertTemperature(hour.temperature, unit)}</p>
              <p className="hourly__rain">
                {hour.precipitationProbability == null || hour.precipitationProbability === 0
                  ? '\u00a0'
                  : `💧${hour.precipitationProbability}%`}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
