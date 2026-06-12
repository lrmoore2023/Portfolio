import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { initRadarCase } from './case-radar.js'

// Long-form case-study mode for the project overlay. Rich content is authored
// as an inert <template> in index.html and cloned into .pv-case when a project
// card declares data-case. Reveals and video playback are driven by
// IntersectionObservers rooted to the overlay panel — the overlay is
// display:none while closed, so the page-level ScrollTrigger reveals in
// reveals.js can never reach in here (and .line/[data-reveal] must not be
// used inside case markup for the same reason).
export function initCaseStudy(panel, reducedMotion) {
  const reveals = panel.querySelectorAll('.cs-reveal')
  const videos = panel.querySelectorAll('video.cs-video')
  const observers = []

  // .cs-wipe frames share the reveal observer — is-inview drives their
  // clip-path wipe the same way it drives the fade-ups
  const wipes = panel.querySelectorAll('.cs-wipe')
  if (reducedMotion) {
    reveals.forEach((el) => el.classList.add('is-inview'))
    wipes.forEach((el) => el.classList.add('is-inview'))
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-inview')
          io.unobserve(e.target)
        }
      })
    }, { root: panel, rootMargin: '0px 0px -10% 0px' })
    reveals.forEach((el) => io.observe(el))
    wipes.forEach((el) => io.observe(el))
    observers.push(io)
  }

  // src is assigned on first approach (preload="none" + data-src keeps the
  // main page free of case media), and playback runs only while visible
  const vio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target
      if (e.isIntersecting) {
        if (!v.src) {
          v.src = v.dataset.src
          // postcards open on near-identical frames — stagger their loop
          // phase so the gallery doesn't read as five synced starts
          const offset = parseFloat(v.dataset.offset)
          if (offset) v.addEventListener('loadedmetadata', () => { v.currentTime = offset }, { once: true })
        }
        if (!reducedMotion) v.play().catch(() => {})
      } else if (!v.paused) {
        v.pause()
      }
    })
  }, { root: panel, rootMargin: '35% 0px' })
  videos.forEach((v) => vio.observe(v))
  observers.push(vio)

  const audio = initPlateAudio(panel)
  const rules = initCaseRules(panel, reducedMotion)
  rules.push(...initDrift(panel, reducedMotion))
  rules.push(...initStats(panel, reducedMotion, observers))
  const radar = initRadarCase(panel, reducedMotion, observers)
  initWayfinder(panel, observers)

  // reading progress line, scaled to the panel's own scroll
  const progress = document.querySelector('.pv-progress')
  const onScroll = progress && (() => {
    const max = panel.scrollHeight - panel.clientHeight
    progress.style.transform = `scaleX(${max > 0 ? panel.scrollTop / max : 0})`
  })
  if (onScroll) {
    panel.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
  }

  return {
    // called once the open Flip settles — the hero collapses to ~0 while the
    // cover is mid-flight, so rule positions measured at init are stale
    refresh() {
      ScrollTrigger.refresh()
    },
    destroy() {
      observers.forEach((o) => o.disconnect())
      rules.forEach((t) => { t.scrollTrigger?.kill(); t.kill() })
      radar.destroy()
      if (onScroll) {
        panel.removeEventListener('scroll', onScroll)
        progress.style.transform = 'scaleX(0)'
      }
      const wf = document.querySelector('.pv-wayfinder')
      if (wf) { wf.classList.remove('is-visible'); wf.textContent = '' }
      audio.muteAll()
      videos.forEach((v) => v.pause())
    },
  }
}

// Scroll parallax for the process-media plates: the drift layer is scaled up
// 6% in CSS and rides a few percent vertically as its frame crosses the panel
function initDrift(panel, reducedMotion) {
  if (reducedMotion) return []
  const tweens = []
  panel.querySelectorAll('.cs-drift').forEach((drift) => {
    tweens.push(gsap.fromTo(drift, { yPercent: -3.5 }, {
      yPercent: 3.5,
      ease: 'none',
      scrollTrigger: {
        scroller: panel,
        trigger: drift.closest('.cs-frame'),
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    }))
  })
  return tweens
}

// Stats odometer: the 01s roll up from 00 through a mask, the generations
// counter spins from 0 — once, when the row enters view
function initStats(panel, reducedMotion, observers) {
  const stats = panel.querySelector('.cs-stats')
  if (!stats || reducedMotion) return []

  stats.querySelectorAll('[data-roll]').forEach((el) => {
    const final = el.textContent.trim()
    el.classList.add('cs-odo')
    el.innerHTML = `<span class="cs-odo-strip"><span>${'0'.repeat(final.length)}</span><span>${final}</span></span>`
  })
  const counters = stats.querySelectorAll('[data-countup]')
  counters.forEach((counter) => {
    // reserve the final width so the trailing S never drifts mid-count
    counter.style.minWidth = `${counter.offsetWidth}px`
    counter.textContent = '0'
  })

  const tweens = []
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return
      io.disconnect()
      stats.querySelectorAll('.cs-odo-strip').forEach((strip, i) => {
        tweens.push(gsap.to(strip, { yPercent: -50, duration: 1, ease: 'power4.inOut', delay: 0.2 + i * 0.15 }))
      })
      counters.forEach((counter) => {
        const state = { v: 0 }
        tweens.push(gsap.to(state, {
          v: parseInt(counter.dataset.countup, 10),
          duration: 1.3,
          ease: 'power2.out',
          delay: 0.25,
          onUpdate: () => { counter.textContent = Math.floor(state.v) },
        }))
      })
    })
  }, { root: panel, threshold: 0.4 })
  io.observe(stats)
  observers.push(io)
  return tweens
}

// Section wayfinder — the active kicker rotates at the overlay's left edge
function initWayfinder(panel, observers) {
  const wf = document.querySelector('.pv-wayfinder')
  if (!wf) return
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return
      const kicker = e.target.querySelector('.cs-kicker')
      if (kicker) {
        wf.textContent = kicker.textContent
        wf.classList.add('is-visible')
      }
    })
  }, { root: panel, rootMargin: '-40% 0px -50% 0px' })
  panel.querySelectorAll('.cs-section').forEach((s) => io.observe(s))
  observers.push(io)
}

// Divider rules draw left-to-right scrubbed to the panel's own scroll — the
// same language as initRules on the page, but the scroller here is .pv-panel.
// Reduced motion keeps the static CSS borders.
function initCaseRules(panel, reducedMotion) {
  if (reducedMotion) return []

  const tweens = []
  const draw = (host, span, edge) => {
    tweens.push(gsap.fromTo(span, { scaleX: 0 }, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        scroller: panel,
        trigger: host,
        start: `${edge} 96%`,
        end: () => {
          // clamp the end to what this edge can reach at max scroll so
          // rules near the document bottom don't stall half-drawn
          const panelRect = panel.getBoundingClientRect()
          const docY = host.getBoundingClientRect()[edge] - panelRect.top + panel.scrollTop
          const maxScroll = panel.scrollHeight - panel.clientHeight
          const reachable = (docY - maxScroll) / panel.clientHeight
          const pct = Math.min(0.9, Math.max(0.45, reachable + 0.03)) * 100
          return `${edge} ${pct}%`
        },
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    }))
  }

  panel.querySelectorAll(
    '.cs-head, .cs-stat, .cs-plate-meta, .cs-pipeline li, .cs-detail, .cs-end',
  ).forEach((host) => {
    host.classList.add('has-rule')
    const span = document.createElement('span')
    span.className = 'rule'
    span.setAttribute('aria-hidden', 'true')
    host.appendChild(span)
    draw(host, span, 'top')

    if (host.matches('.cs-pipeline li:last-child')) {
      host.classList.add('has-rule-bottom')
      const bottom = document.createElement('span')
      bottom.className = 'rule rule--bottom'
      bottom.setAttribute('aria-hidden', 'true')
      host.appendChild(bottom)
      draw(host, bottom, 'bottom')
    }
  })

  return tweens
}

// Postcard audio: the plate loops carry their soundtrack. Hover unmutes on
// fine pointers (with a short volume ramp); on touch, tapping a plate toggles
// it. Only one plate is ever audible at a time. Browsers allow unmuting here
// because the overlay itself can only be opened by a user gesture.
function initPlateAudio(panel) {
  const plates = [...panel.querySelectorAll('.cs-plate')]
    .map((plate) => ({
      media: plate.querySelector('.cs-plate-media'),
      video: plate.querySelector('video.cs-video'),
    }))
    .filter((p) => p.media && p.video)
  if (!plates.length) return { muteAll() {} }

  const hoverable = window.matchMedia('(hover: hover) and (pointer: fine)').matches

  const mute = (p) => {
    gsap.to(p.video, {
      volume: 0,
      duration: 0.3,
      ease: 'power1.out',
      onComplete: () => { p.video.muted = true },
    })
  }
  const unmute = (p) => {
    plates.forEach((o) => { if (o !== p && !o.video.muted) mute(o) })
    gsap.killTweensOf(p.video)
    p.video.muted = false
    p.video.volume = 0
    p.video.play().catch(() => { p.video.muted = true; p.video.play().catch(() => {}) })
    gsap.to(p.video, { volume: 0.55, duration: 0.35, ease: 'power1.in' })
  }

  plates.forEach((p) => {
    if (hoverable) {
      p.media.addEventListener('pointerenter', () => unmute(p))
      p.media.addEventListener('pointerleave', () => mute(p))
    } else {
      p.media.addEventListener('click', () => (p.video.muted ? unmute(p) : mute(p)))
    }
  })

  return {
    muteAll() {
      plates.forEach((p) => {
        gsap.killTweensOf(p.video)
        p.video.muted = true
        p.video.volume = 1
      })
    },
  }
}

// Cover videos in the work grid: same lazy-src + play-while-visible contract,
// but against the page viewport. The element survives being re-parented into
// the overlay (it is the same node GSAP Flip flies fullscreen).
export function initCoverVideos(reducedMotion) {
  const vids = document.querySelectorAll('video.cover-video')
  if (!vids.length) return
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target
      if (e.isIntersecting) {
        if (!v.src) v.src = v.dataset.src
        if (!reducedMotion) v.play().catch(() => {})
      } else if (!v.paused) {
        v.pause()
      }
    })
  }, { rootMargin: '25% 0px' })
  vids.forEach((v) => io.observe(v))
}
