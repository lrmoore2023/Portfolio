// Verification sweep for the Research Radar case study.
//   node scripts/verify-radar.mjs
// Screenshots land in scripts/shots/; console errors and canvas counts
// are reported at the end.
import puppeteer from 'puppeteer-core'
import { mkdirSync, rmSync } from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.env.DEV_URL || 'http://localhost:5173'
const SHOTS = 'scripts/shots'

rmSync(SHOTS, { recursive: true, force: true })
mkdirSync(SHOTS, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--hide-scrollbars'],
})

const errors = []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function newPage(viewport, opts = {}) {
  const page = await browser.newPage()
  await page.setViewport(viewport)
  if (opts.reducedMotion) {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  }
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${opts.tag}] ${m.text()}`) })
  page.on('pageerror', (e) => errors.push(`[${opts.tag}] pageerror: ${e.message}`))
  await page.goto(BASE, { waitUntil: 'networkidle0' })
  await sleep(1800) // intro
  return page
}

async function openCase(page) {
  await page.evaluate(() => {
    document.querySelector('[data-case="case-research-radar"]').click()
  })
  await sleep(1800) // flip + refresh
}

async function sweepCase(page, tag, settle = 1500) {
  const panel = await page.evaluateHandle(() => document.querySelector('.pv-panel'))
  const stops = await page.evaluate(() => {
    const panel = document.querySelector('.pv-panel')
    const tops = [0]
    panel.querySelectorAll('.cs-section, .cs-end').forEach((s) => {
      tops.push(Math.max(0, s.offsetTop - innerHeight * 0.12))
    })
    return tops
  })
  for (let i = 0; i < stops.length; i++) {
    await page.evaluate((y) => { document.querySelector('.pv-panel').scrollTop = y }, stops[i])
    await sleep(settle)
    await page.screenshot({ path: `${SHOTS}/${tag}-case-${String(i).padStart(2, '0')}.png` })
  }
  await panel.dispose()
}

// ---------- desktop ----------
{
  const page = await newPage({ width: 1440, height: 900 }, { tag: 'desktop' })
  await page.evaluate(() => document.querySelector('#work').scrollIntoView())
  await sleep(1500)
  await page.evaluate(() => window.scrollBy(0, innerHeight * 1.2))
  await sleep(1500)
  await page.screenshot({ path: `${SHOTS}/desktop-card.png` })
  await openCase(page)
  await page.screenshot({ path: `${SHOTS}/desktop-case-hero.png` })
  await sweepCase(page, 'desktop', 1800)
  await page.close()
}

// ---------- wide desktop, top of case only ----------
{
  const page = await newPage({ width: 1920, height: 1080 }, { tag: 'wide' })
  await openCase(page)
  await sweepCase(page, 'wide', 1100)
  await page.close()
}

// ---------- mobile ----------
{
  const page = await newPage({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }, { tag: 'mobile' })
  await page.evaluate(() => document.querySelector('#work').scrollIntoView())
  await sleep(1200)
  await page.evaluate(() => window.scrollBy(0, innerHeight * 1.6))
  await sleep(1500)
  await page.screenshot({ path: `${SHOTS}/mobile-card.png` })
  await openCase(page)
  await sweepCase(page, 'mobile', 1500)
  await page.close()
}

// ---------- small mobile ----------
{
  const page = await newPage({ width: 375, height: 667, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }, { tag: 'mobile-sm' })
  await openCase(page)
  await sweepCase(page, 'mobile-sm', 1100)
  await page.close()
}

// ---------- reduced motion ----------
{
  const page = await newPage({ width: 1440, height: 900 }, { tag: 'reduced', reducedMotion: true })
  await openCase(page)
  await sweepCase(page, 'reduced', 700)
  await page.close()
}

// ---------- lifecycle: open/close x10, watch contexts ----------
{
  const page = await newPage({ width: 1440, height: 900 }, { tag: 'lifecycle' })
  for (let i = 0; i < 10; i++) {
    await openCase(page)
    // ride down to the radar so the WebGL context actually gets created
    await page.evaluate(() => {
      const panel = document.querySelector('.pv-panel')
      panel.scrollTop = panel.querySelector('.cs-radar-stage').offsetTop - 200
    })
    await sleep(900)
    await page.keyboard.press('Escape')
    await sleep(2400)
  }
  const counts = await page.evaluate(() => ({
    canvases: document.querySelectorAll('canvas').length,
    caseMountChildren: document.querySelector('.pv-case').children.length,
  }))
  console.log('after 10 open/close cycles:', JSON.stringify(counts))
  await page.close()
}

await browser.close()
console.log(errors.length ? `\nCONSOLE ERRORS (${errors.length}):\n${errors.join('\n')}` : '\nno console errors')
console.log('shots →', SHOTS)
