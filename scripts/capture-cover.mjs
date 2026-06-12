// Renders the project-03 cover loop offline: drives the ?radar-cover dev
// harness frame by frame (the scene is deterministic and periodic, so a
// 12s capture is a seamless loop), then encodes with ffmpeg.
//
//   node scripts/capture-cover.mjs
//
// Outputs: public/projects/research-radar/{cover.mp4, cover-poster.webp, radar-poster.webp}
import puppeteer from 'puppeteer-core'
import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.env.DEV_URL || 'http://localhost:5173'
const FPS = 30
const LOOP = 12
const W = 1600
const H = 900
const OUT = 'public/projects/research-radar'
const TMP = 'scripts/.cover-frames'

mkdirSync(OUT, { recursive: true })
rmSync(TMP, { recursive: true, force: true })
mkdirSync(TMP, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--hide-scrollbars'],
})
const page = await browser.newPage()
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 })
page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()) })

await page.goto(`${BASE}/?radar-cover`, { waitUntil: 'networkidle0' })
await page.waitForFunction('typeof window.__radarSeek === "function"', { timeout: 15000 })

const total = FPS * LOOP
for (let i = 0; i < total; i++) {
  const dataUrl = await page.evaluate((t) => {
    window.__radarSeek(t)
    return document.querySelector('canvas').toDataURL('image/png')
  }, i / FPS)
  writeFileSync(join(TMP, `frame_${String(i).padStart(4, '0')}.png`), Buffer.from(dataUrl.split(',')[1], 'base64'))
  if (i % 60 === 0) console.log(`frame ${i}/${total}`)
}
await browser.close()

console.log('encoding…')
execSync(`ffmpeg -y -framerate ${FPS} -i ${TMP}/frame_%04d.png -an -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p -movflags +faststart ${OUT}/cover.mp4`, { stdio: 'inherit' })
// poster = the loop's first frame, so the video starts where the poster left off
execSync(`ffmpeg -y -i ${TMP}/frame_0000.png -q:v 80 ${OUT}/cover-poster.webp`, { stdio: 'inherit' })
// in-case fallback still — a resolved mid-loop moment with clusters formed
execSync(`ffmpeg -y -i ${TMP}/frame_0300.png -q:v 80 ${OUT}/radar-poster.webp`, { stdio: 'inherit' })

rmSync(TMP, { recursive: true, force: true })
console.log('done →', OUT)
