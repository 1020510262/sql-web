import fs from 'node:fs'
import path from 'node:path'

const projectRoot = path.resolve(new URL('.', import.meta.url).pathname, '..')
const source = path.join(projectRoot, 'node_modules', 'monaco-editor', 'min', 'vs')
const target = path.join(projectRoot, 'public', 'monaco', 'vs')

try {
  fs.mkdirSync(target, { recursive: true })
} catch (error) {
  if (error && error.code === 'EACCES') {
    console.warn(`Skipping Monaco copy. No write permission for ${target}`)
    process.exit(0)
  }
  throw error
}

try {
  fs.cpSync(source, target, { recursive: true })
  console.log(`Copied Monaco assets to ${target}`)
} catch (error) {
  if (error && error.code === 'EACCES') {
    console.warn(`Skipping Monaco copy. No write permission for ${target}`)
    process.exit(0)
  }
  throw error
}
