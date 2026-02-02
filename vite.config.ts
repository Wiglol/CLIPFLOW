import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function resolveBase() {
  // GitHub Pages: https://<user>.github.io/<repo>/
  const explicit = process.env.VITE_BASE
  if (explicit) return explicit

  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
  if (process.env.GITHUB_ACTIONS && repo) return `/${repo}/`
  return '/'
}

export default defineConfig({
  base: resolveBase(),
  plugins: [react()],
})
