import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import { createRadarScene } from './radar-scene.js'

// Research Radar case widgets. Called for every case (like the other
// case-study initializers) — each piece feature-detects its hook element
// and no-ops when absent, so the McCartney path is untouched.
// All tweens/timelines/scrolltriggers created here are owned here and
// killed in destroy(); observers ride the shared case-study teardown.
export function initRadarCase(panel, reducedMotion, observers) {
  const tweens = []
  let scene = null
  let feedTimer = null

  // ---------- the radar band: lazy WebGL, paused offscreen ----------
  const stage = panel.querySelector('.cs-radar-stage')
  if (stage && !reducedMotion) {
    const canvas = stage.querySelector('.cs-radar-canvas')
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !scene) {
          scene = createRadarScene(canvas, {})
          if (!scene) { io.disconnect(); return } // WebGL failed — poster stays
          scene.onFirstFrame(() => stage.classList.add('is-live'))
        }
        scene?.setRunning(e.isIntersecting)
      })
    }, { root: panel, rootMargin: '50% 0px' })
    io.observe(stage)
    observers.push(io)

    // scrubbing the panel advances the field's epoch — clusters tighten
    const epoch = { p: 0 }
    tweens.push(gsap.to(epoch, {
      p: 1,
      ease: 'none',
      scrollTrigger: {
        scroller: panel,
        trigger: stage,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 0.4,
        invalidateOnRefresh: true,
      },
      onUpdate: () => scene?.setProgress(epoch.p),
    }))
  }

  // ---------- the firehose ticker: titles scrolling too fast to read ----------
  const tickerCol = panel.querySelector('.cs-ticker-col')
  if (tickerCol && !reducedMotion) {
    // duplicate the list so -50% is exactly one period — seamless wrap
    tickerCol.append(...[...tickerCol.children].map((li) => li.cloneNode(true)))
    tweens.push(gsap.to(tickerCol, { yPercent: -50, duration: 26, ease: 'none', repeat: -1 }))
  }

  // ---------- the pipeline: chips light and links draw, scrubbed ----------
  const flow = panel.querySelector('[data-flow]')
  if (flow && !reducedMotion) {
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        scroller: panel,
        trigger: flow,
        start: 'top 84%',
        end: 'top 30%',
        scrub: 0.5,
        invalidateOnRefresh: true,
      },
    })
    tl.fromTo(flow.querySelectorAll('.cs-flow-sources .cs-flow-chip'),
      { autoAlpha: 0.15 }, { autoAlpha: 1, stagger: 0.07, duration: 0.5 })
    tl.fromTo(flow.querySelector('.cs-flow-link.is-converge'),
      { scale: 0 }, { scale: 1, duration: 0.35 })
    ;[...flow.querySelector('.cs-flow-spine').children].forEach((el) => {
      if (el.classList.contains('cs-flow-link')) {
        tl.fromTo(el, { scale: 0 }, { scale: 1, duration: 0.3 })
      } else {
        tl.fromTo(el, { autoAlpha: 0.15 }, { autoAlpha: 1, duration: 0.35 })
      }
    })
    tweens.push(tl)
  }

  // ---------- the agent terminal: types its trace once, on entry ----------
  const term = panel.querySelector('[data-term]')
  if (term) {
    const lines = term.querySelectorAll('.cs-term-line')
    if (reducedMotion) {
      lines.forEach((l) => { l.textContent = l.dataset.text })
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return
          io.disconnect()
          const tl = gsap.timeline({ delay: 0.35 })
          lines.forEach((line) => {
            const text = line.dataset.text
            tl.call(() => {
              lines.forEach((l) => l.classList.remove('is-typing'))
              line.classList.add('is-typing')
            })
            if (line.classList.contains('is-user')) {
              // a human typing the question
              const state = { n: 0 }
              tl.to(state, {
                n: text.length,
                duration: text.length * 0.028,
                ease: 'none',
                onUpdate: () => { line.textContent = text.slice(0, Math.round(state.n)) },
              })
            } else if (line.classList.contains('is-answer')) {
              // the model streaming, word by word
              const words = text.split(' ')
              const state = { n: 0 }
              tl.to(state, {
                n: words.length,
                duration: words.length * 0.11,
                ease: 'none',
                onUpdate: () => { line.textContent = words.slice(0, Math.round(state.n)).join(' ') },
              })
            } else {
              // machine log lines just land
              tl.call(() => { line.textContent = text })
              tl.to({}, { duration: 0.1 })
            }
            tl.to({}, { duration: parseFloat(line.dataset.pause) || 0.15 })
          })
          // leave the caret alive on the trailing answer
          tweens.push(tl)
        })
      }, { root: panel, threshold: 0.35 })
      io.observe(term)
      observers.push(io)
    }
  }

  // ---------- the feed mock: re-sorts itself on a loop ----------
  const feedFig = panel.querySelector('[data-ui-feed]')
  if (feedFig && !reducedMotion) {
    const list = feedFig.querySelector('[data-feed]')
    const label = feedFig.querySelector('[data-sort-label]')
    const rows = [...list.children]
    const modes = [
      { label: 'IMPACT', val: (r) => -parseFloat(r.dataset.impact) },
      { label: 'NEWEST', val: (r) => parseFloat(r.dataset.fresh) },
      { label: 'STARS', val: (r) => parseFloat(r.dataset.stars) },
    ]
    let mi = 0
    const resort = () => {
      mi = (mi + 1) % modes.length
      const m = modes[mi]
      const state = Flip.getState(rows)
      rows.slice().sort((a, b) => m.val(a) - m.val(b)).forEach((r) => list.appendChild(r))
      label.textContent = m.label
      tweens.push(Flip.from(state, { duration: 0.7, ease: 'power3.inOut', stagger: 0.02 }))
      feedTimer = gsap.delayedCall(2.8, resort)
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !feedTimer) feedTimer = gsap.delayedCall(2.2, resort)
        else if (!e.isIntersecting && feedTimer) { feedTimer.kill(); feedTimer = null }
      })
    }, { root: panel, threshold: 0.45 })
    io.observe(feedFig)
    observers.push(io)
  }

  // ---------- the chat mock: status pills, then a streamed answer ----------
  const chatFig = panel.querySelector('[data-ui-chat]')
  if (chatFig) {
    const pills = chatFig.querySelectorAll('.cs-chat-pill')
    const answer = chatFig.querySelector('.cs-chat-a')
    const text = answer.dataset.text
    if (reducedMotion) {
      answer.textContent = text
    } else {
      const words = text.split(' ')
      const state = { n: 0 }
      const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 3.5 })
      tl.set(pills, { autoAlpha: 0.12 })
      tl.call(() => { answer.textContent = ''; answer.classList.add('is-typing') })
      pills.forEach((p, i) => tl.to(p, { autoAlpha: 1, duration: 0.25 }, 0.5 + i * 0.55))
      tl.fromTo(state, { n: 0 }, {
        n: words.length,
        duration: words.length * 0.12,
        ease: 'none',
        onUpdate: () => { answer.textContent = words.slice(0, Math.round(state.n)).join(' ') },
      }, '+=0.4')
      tl.call(() => answer.classList.remove('is-typing'))
      tweens.push(tl)
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { e.isIntersecting ? tl.play() : tl.pause() })
      }, { root: panel, threshold: 0.45 })
      io.observe(chatFig)
      observers.push(io)
    }
  }

  return {
    destroy() {
      feedTimer?.kill()
      tweens.forEach((t) => { t.scrollTrigger?.kill(); t.kill() })
      scene?.destroy()
      scene = null
    },
  }
}
