import React from 'react'
import ReactDOM from 'react-dom/client'
// 全域樣式必須先於元件樣式載入：CSS 同特異性時後載入者勝出，
// 若反過來，全域基礎類別會覆蓋掉元件的局部調整。
import './styles/global.less'
import App from './App.tsx'

const rootElement = document.getElementById('root')
if (!rootElement) {
  // 與其讓 createRoot(null) 在執行期噴出難懂的錯誤，不如在這裡說清楚
  throw new Error('找不到 #root 掛載點，請檢查 index.html')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
