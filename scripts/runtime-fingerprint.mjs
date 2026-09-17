import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export function fingerprint(kind) {
  const files = ['vendor/source-manifest.json', 'scripts/runtime-fingerprint.mjs',
    `scripts/build-${kind}.mjs`]
  const walk = relative => {
    for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue
      const name = relative + '/' + entry.name
      if (entry.isDirectory()) walk(name)
      else files.push(name)
    }
  }
  walk('vendor/antimatter')
  if (kind === 'runtime') {
    walk('runtime')
    files.push('docs/反物质维度-映射参数索引.json', 'public/art/army-atlas.png')
  }
  const hash = crypto.createHash('sha256')
  for (const file of files.sort()) hash.update(file).update('\0').update(fs.readFileSync(path.join(root, file)))
  return hash.digest('hex')
}
const output = kind => path.join(root, 'public', kind === 'runtime' ? 'engine' : 'reference')
export function recordBuild(kind, input) {
  if (fingerprint(kind) !== input) throw new Error('构建期间源码发生变化，请重新构建：' + kind)
  fs.writeFileSync(path.join(output(kind), 'build-fingerprint.json'), JSON.stringify({ input }))
}
export function isBuildCurrent(kind) {
  try {
    return fs.existsSync(path.join(output(kind), 'index.html')) &&
      JSON.parse(fs.readFileSync(path.join(output(kind), 'build-fingerprint.json'), 'utf8')).input === fingerprint(kind)
  } catch { return false }
}
