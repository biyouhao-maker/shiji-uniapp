import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    uni(),
  ],
  // 相对路径，兼容 GitHub Pages 子目录部署（/shiji-uniapp/）
  base: './',
})
