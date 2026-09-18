import assert from 'node:assert/strict'
import { siteSmoke } from './site-smoke.mjs'
const base = process.env.PAGES_BASE_URL
assert.ok(base && new URL(base).protocol === 'https:', 'PAGES_BASE_URL must specify the published HTTPS site')
await siteSmoke(base)
