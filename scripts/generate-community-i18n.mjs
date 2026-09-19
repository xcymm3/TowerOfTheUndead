import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const localizedRoot = process.argv[2]
if (!localizedRoot) throw new Error('Usage: node scripts/generate-community-i18n.mjs <ADChinese repository>')
const require = createRequire(path.join(root, 'vendor/antimatter/package.json'))
const { parse } = require('@babel/parser')
const sourceRoot = path.join(root, 'vendor/antimatter/src/core/secret-formula')
const targetRoot = path.join(localizedRoot, 'src/core/secret-formula')
const ignoredKeys = new Set(['start', 'end', 'loc', 'extra', 'leadingComments', 'trailingComments', 'innerComments'])

function filesBelow(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name)
    return entry.isDirectory() ? filesBelow(full) : entry.name.endsWith('.js') ? [full] : []
  })
}

function collect(node, key = 'root', output = new Map()) {
  if (!node || typeof node !== 'object') return output
  if (node.type === 'ImportDeclaration') return output
  if (node.type === 'StringLiteral') output.set(key, { type: 'string', value: node.value })
  if (node.type === 'TemplateLiteral') output.set(key, {
    type: 'template',
    value: node.quasis.map(quasi => quasi.value.cooked ?? quasi.value.raw)
  })
  for (const [childKey, value] of Object.entries(node)) {
    if (ignoredKeys.has(childKey) || childKey === 'quasis') continue
    if (Array.isArray(value)) value.forEach((child, index) => collect(child, `${key}.${childKey}[${index}]`, output))
    else if (value && typeof value === 'object' && value.type) collect(value, `${key}.${childKey}`, output)
  }
  return output
}

const exact = new Map()
const templates = new Map()
let comparedFiles = 0
for (const sourceFile of filesBelow(sourceRoot)) {
  const relative = path.relative(sourceRoot, sourceFile)
  const targetFile = path.join(targetRoot, relative)
  if (!fs.existsSync(targetFile)) continue
  const options = { sourceType: 'module', plugins: ['optionalChaining', 'objectRestSpread'] }
  const source = collect(parse(fs.readFileSync(sourceFile, 'utf8'), options))
  const target = collect(parse(fs.readFileSync(targetFile, 'utf8'), options))
  comparedFiles++
  for (const [key, sourceEntry] of source) {
    const targetEntry = target.get(key)
    if (!targetEntry || targetEntry.type !== sourceEntry.type) continue
    if (sourceEntry.type === 'string') {
      if (/[A-Za-z]{2,}/.test(sourceEntry.value) && /[\u3400-\u9fff]/.test(targetEntry.value)) {
        exact.set(sourceEntry.value, targetEntry.value)
      }
      continue
    }
    if (sourceEntry.value.length !== targetEntry.value.length ||
      !sourceEntry.value.some(part => /[A-Za-z]{2,}/.test(part)) ||
      !targetEntry.value.some(part => /[\u3400-\u9fff]/.test(part))) continue
    templates.set(JSON.stringify(sourceEntry.value), { source: sourceEntry.value, target: targetEntry.value })
  }
}

const header = `// Generated from aquamarine309/ADChinese localization (MIT, see THIRD_PARTY_NOTICES.md).\n` +
  `// Source code and gameplay are not copied; this file contains display strings only.\n`
const output = `${header}export const communityExact = ${JSON.stringify(Object.fromEntries(exact), null, 2)};\n\n` +
  `export const communityTemplates = ${JSON.stringify([...templates.values()], null, 2)};\n`
const outputFile = path.join(root, 'runtime/i18n/locales/zh-CN-community.js')
fs.writeFileSync(outputFile, output)
console.log(`Generated ${exact.size} exact and ${templates.size} template translations from ${comparedFiles} files.`)
