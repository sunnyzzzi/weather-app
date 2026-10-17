/**
 * 首頁的「熱門城市」捷徑。
 *
 * 取捨：這裡直接寫死座標，而不是先跳一次地理編碼 API 再查天氣。
 * 理由是一鍵直達不該有兩段等待；代價是這份清單需要手動維護，
 * 而且名稱固定不隨介面語言變化——對「捷徑」這個用途而言可以接受。
 * 使用者要查清單以外的地點，走搜尋即可。
 */
import type { Place } from '../types.ts'

/** 捷徑不需要人口欄位（那只用於候選去重），統一填 0。 */
export const POPULAR_PLACES: Place[] = [
  { id: 'hk', name: '香港', region: '中國香港', latitude: 22.2783, longitude: 114.1747, population: 0 },
  { id: 'taipei', name: '台北', region: '中國台灣', latitude: 25.033, longitude: 121.5654, population: 0 },
  { id: 'tokyo', name: '東京', region: '日本', latitude: 35.6895, longitude: 139.6917, population: 0 },
  { id: 'singapore', name: '新加坡', region: '新加坡', latitude: 1.3521, longitude: 103.8198, population: 0 },
  { id: 'london', name: '倫敦', region: '英國', latitude: 51.5074, longitude: -0.1278, population: 0 },
  { id: 'newyork', name: '紐約', region: '美國', latitude: 40.7128, longitude: -74.006, population: 0 },
]
