#!/usr/bin/env node
/**
 * Generate PWA PNG icons from public/icon.svg and public/icon-maskable.svg.
 * Requires: npm install (sharp is a devDependency after first run, or use npx).
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')

async function main() {
  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch {
    console.error('Install sharp first: npm install --save-dev sharp')
    process.exit(1)
  }

  const jobs = [
    { input: 'icon.svg', output: 'icon-192.png', size: 192 },
    { input: 'icon.svg', output: 'icon-512.png', size: 512 },
    { input: 'icon-maskable.svg', output: 'icon-maskable-512.png', size: 512, fallback: 'icon.svg' },
    { input: 'icon.svg', output: 'apple-touch-icon.png', size: 180 },
    { input: 'icon.svg', output: 'og-image.png', size: 1200, height: 630 },
  ]

  for (const job of jobs) {
    let inputPath = join(publicDir, job.input)
    if (!existsSync(inputPath) && job.fallback) {
      inputPath = join(publicDir, job.fallback)
    }
    const outPath = join(publicDir, job.output)
    const w = job.size
    const h = job.height ?? job.size
    await sharp(readFileSync(inputPath))
      .resize(w, h, { fit: 'contain', background: '#0A0A0A' })
      .png()
      .toFile(outPath)
    console.log(`Wrote ${job.output} (${w}x${h})`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
