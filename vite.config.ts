import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 純客戶端渲染（CSR）應用，不需要 SSR / 約定式路由，故不引入 Next.js。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
})
