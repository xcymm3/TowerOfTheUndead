import fs from 'node:fs'
import path from 'node:path'

export const outputDir = path.resolve(process.env.TEST_OUTPUT_DIR || 'test-results')
fs.mkdirSync(outputDir, { recursive: true })
export const outputPath = name => path.join(outputDir, name)
