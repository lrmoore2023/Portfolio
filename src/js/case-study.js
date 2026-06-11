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
        if (!v.src) v.src = v.dataset.src
        if (!reducedMotion) v.play().catch(() => {})
      } else if (!v.paused) {
        v.pause()
      }
    })
  }, { root: panel, rootMargin: '35% 0px' })
  videos.forEach((v) => vio.observe(v))
  observers.push(vio)

  return {
    destroy() {
      observers.forEach((o) => o.disconnect())
      videos.forEach((v) => v.pause())
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
