/**
 * 當前天氣卡：整個頁面的視覺主角。
 *
 * 這個元件是純展示元件（presentational）：只接收 place / data / unit，
 * 不做任何請求，所有換算都走 utils 裡的純函式，因此很容易單獨預覽與測試。
 */
import {
  convertTemperature,
  describeUvIndex,
  describeWeather,
  describeWindDirection,
  describeWindSpeed,
  formatTime,
  weatherGroup,
} from '../../utils/weatherCodes.ts'
import type { CurrentWeatherProps, MetricProps } from './types.ts'
import './index.less'

export default function CurrentWeather({ place, data, unit }: CurrentWeatherProps) {
  const { current, daily, observedAt } = data
  const today = daily[0] ?? null
  const weather = describeWeather(current.weatherCode, { isDay: current.isDay })
  const uv = describeUvIndex(today?.uvIndex)
  const windDirection = describeWindDirection(current.windDirection)

  return (
    <section className={`card current current--${weatherGroup(current.weatherCode)}`}>
      <header className="current__head">
        <div>
          <h1 className="current__place">{place.name}</h1>
          {place.region && <p className="current__region">{place.region}</p>}
        </div>
        {observedAt && <p className="current__updated">當地時間 {formatTime(observedAt)} 更新</p>}
      </header>

      <div className="current__main">
        <div className="current__icon" aria-hidden="true">
          {weather.icon}
        </div>
        <div className="current__reading">
          <p className="current__temperature">{convertTemperature(current.temperature, unit)}</p>
          <p className="current__label">{weather.label}</p>
          <p className="current__range">
            最高 {convertTemperature(today?.temperatureMax, unit)} · 最低{' '}
            {convertTemperature(today?.temperatureMin, unit)} · 體感{' '}
            {convertTemperature(current.apparentTemperature, unit)}
          </p>
        </div>
      </div>

      <dl className="metrics">
        <Metric label="相對濕度" value={current.humidity == null ? '—' : `${current.humidity}%`} icon="💧" />
        <Metric
          label="風"
          value={
            current.windSpeed == null
              ? '—'
              : `${windDirection}風 ${Math.round(current.windSpeed)} km/h（${describeWindSpeed(current.windSpeed)}）`
          }
          icon="🌬️"
        />
        <Metric label="降雨量" value={current.precipitation == null ? '—' : `${current.precipitation} mm`} icon="🌧️" />
        <Metric
          label="降雨機率"
          value={today?.precipitationProbability == null ? '—' : `${today.precipitationProbability}%`}
          icon="☔"
        />
        <Metric label="紫外線指數" value={`${today?.uvIndex ?? '—'}（${uv.label}）`} icon="🔆" />
        <Metric label="氣壓" value={current.pressure == null ? '—' : `${Math.round(current.pressure)} hPa`} icon="🧭" />
        <Metric label="日出" value={formatTime(today?.sunrise) || '—'} icon="🌅" />
        <Metric label="日落" value={formatTime(today?.sunset) || '—'} icon="🌇" />
      </dl>
    </section>
  )
}

function Metric({ icon, label, value }: MetricProps) {
  return (
    <div className="metric">
      <dt className="metric__label">
        <span aria-hidden="true">{icon}</span> {label}
      </dt>
      <dd className="metric__value">{value}</dd>
    </div>
  )
}
