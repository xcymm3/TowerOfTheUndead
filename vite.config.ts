import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  build: { copyPublicDir: false },
  plugins: [react(), {
    name: 'ship-game-assets-only',
    apply: 'build',
    closeBundle() {
      const reference = path.join(root, 'public/reference')
      fs.cpSync(path.join(root, 'public'), path.join(root, 'dist'), {
        recursive: true,
        filter: source => source !== reference && !source.startsWith(reference + path.sep),
      })
      fs.copyFileSync(path.join(root, 'vendor/antimatter/LICENSE'), path.join(root, 'dist/AntimatterDimensions-LICENSE.txt'))
    },
  }],
})
