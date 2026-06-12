import * as THREE from 'three'

// The radar — the signature visual of the Research Radar case study.
// A field of faint paper-grey particles (the unread literature) swept by a
// slow lighthouse beam. Most particles recede when the beam touches them —
// the system's character is rejection. A scripted few catch: they rise to
// full paper, scale with their score, drift into loose clusters and link to
// a neighbour with a hairline. Four kinds carry barely-different sprites
// (circle paper, square repo, diamond model, bar dataset). Strictly duotone.
//
// Everything is driven by one clock and every envelope is periodic with a
// common LOOP, so t and t+LOOP render identical frames — that's what makes
// the pre-rendered cover a seamless loop, and what makes seek(t) exact for
// offline frame capture. All randomness comes from a seeded PRNG: the scene
// is fully deterministic.
//
// Unlike the hero scene this one is disposable: the overlay creates a fresh
// WebGL context on every open, so destroy() must actually free the GPU.

const LOOP = 12          // master period, seconds
const SWEEP = 6          // beam revolutions per LOOP: LOOP / SWEEP
const ATTACK = 0.5
const HOLD = 6.5
const RELEASE = 2.5

const INK = '#121211'
const PAPER = '#F5F3F4'

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const smooth = (x) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c) }

// caught-particle envelope: rise, hold, release — back to zero inside LOOP
function envelope(u) {
  if (u < ATTACK) return smooth(u / ATTACK)
  if (u < ATTACK + HOLD) return 1
  if (u < ATTACK + HOLD + RELEASE) return 1 - smooth((u - ATTACK - HOLD) / RELEASE)
  return 0
}

export function createRadarScene(canvas, { interactive = true, seed = 7, capture = false } = {}) {
  let renderer
  try {
    // preserveDrawingBuffer only for the offline cover render, where the
    // capture script reads frames back with toDataURL
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: capture })
  } catch {
    return null
  }
  const coarse = window.matchMedia('(pointer: coarse)').matches
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.25 : 1.5))
  renderer.setClearColor(new THREE.Color(INK))

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10)
  camera.position.z = 1

  const N = coarse ? 450 : 1100
  const CAUGHT_PER_SWEEP = 9
  const CLUSTERS = 4

  // ---------- background: ink ground, fog, rings, beam ----------
  const bgUniforms = {
    uSweep: { value: 0 },
    uAspect: { value: 1 },
    uParallax: { value: new THREE.Vector2(0, 0) },
    uPaper: { value: new THREE.Color(PAPER) },
  }
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: bgUniforms,
      depthTest: false,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform float uSweep;
        uniform float uAspect;
        uniform vec2 uParallax;
        uniform vec3 uPaper;
        varying vec2 vUv;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
        }

        void main() {
          vec2 p = vec2((vUv.x * 2.0 - 1.0) * uAspect, vUv.y * 2.0 - 1.0) - uParallax;
          float r = length(p);
          float ang = atan(p.y, p.x);

          vec3 ink = vec3(0.0706, 0.0706, 0.0667);
          vec3 col = ink;

          // faint mottled fog, brightest near the origin
          float fog = noise(p * 2.4) * 0.5 + noise(p * 6.0) * 0.25;
          col += uPaper * fog * 0.048 * exp(-r * 1.0);

          // two hairline range rings
          float px = fwidth(r) * 1.2;
          col += uPaper * 0.05 * (1.0 - smoothstep(px, px * 2.2, abs(r - 0.48)));
          col += uPaper * 0.05 * (1.0 - smoothstep(px, px * 2.2, abs(r - 0.92)));

          // the beam: a soft luminance wake trailing the arm
          float d = mod(uSweep - ang, 6.28318530718);
          float wake = exp(-d * 2.2) * exp(-r * 0.85);
          col += uPaper * wake * 0.075;
          // the arm itself — a thin leading edge
          float arm = exp(-d * d * 900.0) * smoothstep(0.02, 0.15, r) * exp(-r * 0.45);
          col += uPaper * arm * 0.14;

          // vignette to pure ink so the band edges dissolve seamlessly
          float vig = smoothstep(1.45, 0.55, r / max(uAspect, 1.0));
          col = mix(ink, col, vig);

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  )
  bg.renderOrder = 0
  scene.add(bg)

  // ---------- particles ----------
  const positions = new Float32Array(N * 3)
  const alphas = new Float32Array(N)
  const sizes = new Float32Array(N)
  const kinds = new Float32Array(N)

  // static per-particle model, regenerated deterministically per aspect
  const P = []
  let aspect = 1
  let centroids = []

  function buildField() {
    const rnd = mulberry32(seed)
    P.length = 0
    centroids = []
    for (let c = 0; c < CLUSTERS; c++) {
      const a = rnd() * Math.PI * 2
      const r = 0.30 + rnd() * 0.34
      centroids.push([Math.cos(a) * r * aspect * 0.8, Math.sin(a) * r * 0.8])
    }
    const caughtTotal = CAUGHT_PER_SWEEP * (LOOP / SWEEP)
    for (let i = 0; i < N; i++) {
      // radial-biased scatter over the full frame
      const ang = rnd() * Math.PI * 2
      const rad = Math.sqrt(rnd()) * 1.35
      const x = Math.cos(ang) * rad * aspect
      const y = Math.sin(ang) * rad
      const caught = i < caughtTotal
      const theta = Math.atan2(y, x) // beam angle at which this particle sits
      const sweepIndex = i % (LOOP / SWEEP)
      // beam angle grows linearly; it crosses theta once per revolution
      const tCatch = ((theta + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * SWEEP + sweepIndex * SWEEP
      P.push({
        x, y, theta,
        kind: Math.floor(rnd() * 4),
        score: rnd(),
        base: 0.12 + rnd() * 0.16,
        wobblePhase: rnd() * Math.PI * 2,
        wobbleAmp: 0.004 + rnd() * 0.008,
        caught,
        tCatch,
        cluster: i % CLUSTERS,
        jx: (rnd() - 0.5) * 0.17 * aspect,
        jy: (rnd() - 0.5) * 0.17,
      })
      kinds[i] = P[i].kind
    }
  }

  const ptGeo = new THREE.BufferGeometry()
  ptGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  ptGeo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))
  ptGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  ptGeo.setAttribute('aKind', new THREE.BufferAttribute(kinds, 1))

  const ptUniforms = {
    uPaper: { value: new THREE.Color(PAPER) },
    uMouse: { value: new THREE.Vector2(99, 99) },
    uMouseStrength: { value: interactive && !coarse ? 1 : 0 },
    uParallax: { value: bgUniforms.uParallax.value },
    uDpr: { value: renderer.getPixelRatio() },
  }
  const points = new THREE.Points(ptGeo, new THREE.ShaderMaterial({
    uniforms: ptUniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    vertexShader: /* glsl */ `
      attribute float aAlpha;
      attribute float aSize;
      attribute float aKind;
      uniform vec2 uMouse;
      uniform float uMouseStrength;
      uniform vec2 uParallax;
      uniform float uDpr;
      varying float vAlpha;
      varying float vKind;
      void main() {
        vec3 p = position + vec3(uParallax, 0.0);
        // holding a lamp over the field — points near the cursor lift
        float md = distance(p.xy, uMouse);
        vAlpha = min(1.0, aAlpha + exp(-md * md * 7.0) * 0.30 * uMouseStrength);
        vKind = aKind;
        gl_PointSize = aSize * uDpr;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 uPaper;
      varying float vAlpha;
      varying float vKind;
      void main() {
        vec2 q = gl_PointCoord * 2.0 - 1.0;
        float m;
        if (vKind < 0.5)      m = 1.0 - smoothstep(0.7, 1.0, length(q));          // paper — circle
        else if (vKind < 1.5) m = 1.0 - smoothstep(0.62, 0.8, max(abs(q.x), abs(q.y))); // repo — square
        else if (vKind < 2.5) m = 1.0 - smoothstep(0.7, 0.9, abs(q.x) + abs(q.y));      // model — diamond
        else                  m = (1.0 - smoothstep(0.55, 0.8, abs(q.x))) * (1.0 - smoothstep(0.22, 0.42, abs(q.y))); // dataset — bar
        if (m * vAlpha < 0.004) discard;
        gl_FragColor = vec4(uPaper, m * vAlpha);
      }
    `,
  }))
  points.renderOrder = 2
  points.frustumCulled = false
  scene.add(points)

  // ---------- constellation hairlines between caught neighbours ----------
  const caughtTotal = CAUGHT_PER_SWEEP * (LOOP / SWEEP)
  const MAX_LINES = caughtTotal
  const linePos = new Float32Array(MAX_LINES * 2 * 3)
  const lineAlpha = new Float32Array(MAX_LINES * 2)
  const lnGeo = new THREE.BufferGeometry()
  lnGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3))
  lnGeo.setAttribute('aAlpha', new THREE.BufferAttribute(lineAlpha, 1))
  const lines = new THREE.LineSegments(lnGeo, new THREE.ShaderMaterial({
    uniforms: { uPaper: { value: new THREE.Color(PAPER) }, uParallax: ptUniforms.uParallax },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    vertexShader: /* glsl */ `
      attribute float aAlpha;
      uniform vec2 uParallax;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position + vec3(uParallax, 0.0), 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 uPaper;
      varying float vAlpha;
      void main() { gl_FragColor = vec4(uPaper, vAlpha); }
    `,
  }))
  lines.renderOrder = 1
  lines.frustumCulled = false
  scene.add(lines)

  // pair each caught particle to its nearest caught cluster-mate (≤2 links
  // per node) — constellation, not network-graph spaghetti
  let pairs = []
  function buildPairs() {
    pairs = []
    const links = new Map()
    for (let c = 0; c < CLUSTERS; c++) {
      const members = []
      for (let i = 0; i < caughtTotal; i++) if (P[i].cluster === c) members.push(i)
      members.forEach((i) => {
        let best = -1
        let bd = Infinity
        members.forEach((j) => {
          if (j === i || (links.get(j) || 0) >= 2) return
          const dx = P[i].jx - P[j].jx
          const dy = P[i].jy - P[j].jy
          const d = dx * dx + dy * dy
          if (d < bd && !pairs.some(([a, b]) => (a === j && b === i))) { bd = d; best = j }
        })
        if (best >= 0 && (links.get(i) || 0) < 2) {
          pairs.push([i, best])
          links.set(i, (links.get(i) || 0) + 1)
          links.set(best, (links.get(best) || 0) + 1)
        }
      })
    }
  }

  // ---------- per-frame model (CPU: ~1k particles is nothing, and it
  // keeps line endpoints exactly on their particles) ----------
  let progress = 0.6        // scroll-driven epoch, lerped
  let progressTarget = 0.6
  const px = [] // computed positions, reused by the line pass
  const py = []

  function update(t) {
    const beam = ((t % SWEEP) / SWEEP) * Math.PI * 2
    bgUniforms.uSweep.value = beam
    progress += (progressTarget - progress) * 0.05
    // scroll tightens the constellations: jitter radius shrinks with progress
    const spread = 1.45 - 0.6 * progress

    for (let i = 0; i < N; i++) {
      const o = P[i]
      // periodic wander so the field never freezes
      const wob = (t / LOOP) * Math.PI * 2 + o.wobblePhase
      let x = o.x + Math.cos(wob) * o.wobbleAmp
      let y = o.y + Math.sin(wob * 1.0) * o.wobbleAmp

      // how recently did the beam pass this point in its current revolution?
      const tHit = (((o.theta + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)) * SWEEP
      const since = (t - tHit + LOOP * 2) % SWEEP
      const glow = Math.exp(-since * 6.0)          // brief lift at the pass
      const dip = 0.45 * Math.exp(-since / 0.9)    // ...then most recede

      let alpha = o.base * (1 - dip) + glow * 0.22
      let size = (1.8 + o.score * 1.6)

      if (o.caught) {
        const u = (t - o.tCatch + LOOP * 2) % LOOP
        const e = envelope(u)
        // full arrival at e=1 — anything less leaves cluster-mates strewn
        // along their travel paths and the hairlines read as spaghetti
        x += (centroids[o.cluster][0] + o.jx * spread - x) * e
        y += (centroids[o.cluster][1] + o.jy * spread - y) * e
        alpha = alpha * (1 - e) + e * (0.75 + o.score * 0.25)
        size *= 1 + 1.4 * e * (0.6 + o.score * 0.7)
        // a small bloom right after the catch
        size *= 1 + 0.8 * Math.exp(-((u - 0.55) * (u - 0.55)) / 0.06)
        px[i] = x; py[i] = y
      }

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      alphas[i] = alpha
      sizes[i] = size
    }
    ptGeo.attributes.position.needsUpdate = true
    ptGeo.attributes.aAlpha.needsUpdate = true
    ptGeo.attributes.aSize.needsUpdate = true

    let li = 0
    pairs.forEach(([i, j]) => {
      const ei = envelope((t - P[i].tCatch + LOOP * 2) % LOOP)
      const ej = envelope((t - P[j].tCatch + LOOP * 2) % LOOP)
      // a hairline appears only once both ends have settled into the
      // cluster — mid-drift links read as spaghetti, not constellations
      const a = Math.max(0, Math.min(ei, ej) - 0.75) / 0.25 * 0.20
      linePos[li * 6] = px[i]; linePos[li * 6 + 1] = py[i]; linePos[li * 6 + 2] = 0
      linePos[li * 6 + 3] = px[j]; linePos[li * 6 + 4] = py[j]; linePos[li * 6 + 5] = 0
      lineAlpha[li * 2] = a
      lineAlpha[li * 2 + 1] = a
      li++
    })
    lnGeo.setDrawRange(0, li * 2)
    lnGeo.attributes.position.needsUpdate = true
    lnGeo.attributes.aAlpha.needsUpdate = true
  }

  // ---------- sizing ----------
  const host = canvas.parentElement
  function resize() {
    const w = host.clientWidth
    const h = host.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    const nextAspect = w / h
    if (Math.abs(nextAspect - aspect) > 0.001) {
      aspect = nextAspect
      camera.left = -aspect
      camera.right = aspect
      camera.updateProjectionMatrix()
      bgUniforms.uAspect.value = aspect
      buildField()
      buildPairs()
    }
  }
  aspect = 0 // force first build
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(host)

  // ---------- cursor: parallax + lamp, fine pointers only ----------
  const parallaxTarget = new THREE.Vector2(0, 0)
  const mouseTarget = new THREE.Vector2(99, 99)
  function onPointer(e) {
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    mouseTarget.set(nx * aspect, ny)
    parallaxTarget.set(nx * 0.025, ny * 0.025)
  }
  if (interactive && !coarse) window.addEventListener('pointermove', onPointer)

  // ---------- loop ----------
  const clock = new THREE.Clock()
  let timeBase = 0

  function frame() {
    const t = (timeBase + clock.getElapsedTime()) % LOOP
    ptUniforms.uMouse.value.lerp(mouseTarget, 0.06)
    bgUniforms.uParallax.value.lerp(parallaxTarget, 0.05)
    update(t)
    renderer.render(scene, camera)
  }

  let firstFrame = null

  return {
    setRunning(on) {
      renderer.setAnimationLoop(on ? () => {
        frame()
        if (firstFrame) { firstFrame(); firstFrame = null }
      } : null)
    },
    onFirstFrame(cb) { firstFrame = cb },
    setProgress(p) { progressTarget = Math.min(1, Math.max(0, p)) },
    // render the exact frame at time t — deterministic, for offline capture
    seek(t) {
      progress = progressTarget
      ptUniforms.uMouse.value.copy(mouseTarget)
      bgUniforms.uParallax.value.copy(parallaxTarget)
      update(t % LOOP)
      renderer.render(scene, camera)
    },
    resize,
    destroy() {
      renderer.setAnimationLoop(null)
      ro.disconnect()
      if (interactive && !coarse) window.removeEventListener('pointermove', onPointer)
      ptGeo.dispose()
      lnGeo.dispose()
      bg.geometry.dispose()
      bg.material.dispose()
      points.material.dispose()
      lines.material.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
