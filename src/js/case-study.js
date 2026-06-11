import gsap from 'gsap'

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

  if (reducedMotion) {
    reveals.forEach((el) => el.classList.add('is-inview'))
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

  return {
    destroy() {
      observers.forEach((o) => o.disconnect())
      audio.muteAll()
      videos.forEach((v) => v.pause())
    },
  }
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
      chip: plate.querySelector('.cs-plate-sound'),
    }))
    .filter((p) => p.media && p.video)
  if (!plates.length) return { muteAll() {} }

  const hoverable = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  plates.forEach((p) => { if (p.chip) p.chip.textContent = hoverable ? 'SOUND — HOVER' : 'SOUND — TAP' })

  const mute = (p) => {
    gsap.to(p.video, {
      volume: 0,
      duration: 0.3,
      ease: 'power1.out',
      onComplete: () => { p.video.muted = true },
    })
    p.chip?.classList.remove('is-live')
  }
  const unmute = (p) => {
    plates.forEach((o) => { if (o !== p && !o.video.muted) mute(o) })
    gsap.killTweensOf(p.video)
    p.video.muted = false
    p.video.volume = 0
    p.video.play().catch(() => { p.video.muted = true; p.video.play().catch(() => {}) })
    gsap.to(p.video, { volume: 1, duration: 0.35, ease: 'power1.in' })
    p.chip?.classList.add('is-live')
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
        p.chip?.classList.remove('is-live')
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
