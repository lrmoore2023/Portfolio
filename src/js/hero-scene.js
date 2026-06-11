import * as THREE from 'three'

// Hero WebGL: a fullscreen domain-warped noise shader — slow tonal "ink wash"
// clouds in the paper greys, with a soft lens distortion that follows the
// cursor. Quiet atmosphere behind the typography rather than competing texture.
export function initHeroScene(reducedMotion) {
  const canvas = document.querySelector('.hero-canvas')
  if (!canvas) return

  const isTouch = window.matchMedia('(pointer: coarse)').matches

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uMouseStrength: { value: isTouch ? 0 : 1 },
    uPaper: { value: new THREE.Color('#F5F3F4') },
    uShade: { value: new THREE.Color('#E2DEDF') },
    uDeep: { value: new THREE.Color('#C9C4C6') },
    uInk: { value: new THREE.Color('#141412') },
  }

  const material = new THREE.ShaderMaterial({
    uniforms,
    depthTest: false,
    depthWrite: false,
    vertexShader: /* glsl */ `
      void main() { gl_Position = vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uTime;
      uniform vec2 uRes;
      uniform vec2 uMouse;
      uniform float uMouseStrength;
      uniform vec3 uPaper;
      uniform vec3 uShade;
      uniform vec3 uDeep;
      uniform vec3 uInk;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p = rot * p * 2.02;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        float aspect = uRes.x / uRes.y;
        vec2 uv = gl_FragCoord.xy / uRes;
        vec2 p = vec2(uv.x * aspect, uv.y) * 1.7;

        // soft lens warp around the cursor
        vec2 m = vec2(uMouse.x * aspect, uMouse.y) * 1.7;
        vec2 dm = p - m;
        float md = length(dm);
        p -= dm * exp(-md * md * 3.5) * 0.28 * uMouseStrength;

        float t = uTime * 0.045;

        // iq-style domain warping for slow marbled drift
        vec2 q = vec2(
          fbm(p + t),
          fbm(p + vec2(5.2, 1.3) - t * 0.6));
        vec2 r = vec2(
          fbm(p + 2.6 * q + vec2(1.7, 9.2) + t * 1.2),
          fbm(p + 2.6 * q + vec2(8.3, 2.8) - t * 0.4));
        float f = fbm(p + 2.4 * r);

        vec3 col = mix(uPaper, uShade, smoothstep(0.25, 0.85, f));
        col = mix(col, uDeep, smoothstep(0.62, 0.95, f) * 0.55);
        // a whisper of ink in the densest folds
        col = mix(col, uInk, smoothstep(0.78, 1.0, f * length(r)) * 0.06);
        // gentle edge vignette
        float vig = smoothstep(0.0, 0.45, uv.x) * smoothstep(1.0, 0.55, uv.x)
                  * smoothstep(0.0, 0.45, uv.y) * smoothstep(1.0, 0.55, uv.y);
        col = mix(col * 0.985, col, vig);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })

  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material))

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas.parentElement
    renderer.setSize(w, h, false)
    uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio())
  }
  resize()
  window.addEventListener('resize', resize)

  // cursor in uv space (y up), lerped for weight
  const target = new THREE.Vector2(0.5, 0.5)
  if (!isTouch) {
    window.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect()
      target.set(
        e.clientX / rect.width,
        1 - (e.clientY - rect.top) / rect.height,
      )
    })
  }

  const clock = new THREE.Clock()
  let running = true

  function frame() {
    uniforms.uTime.value = clock.getElapsedTime()
    uniforms.uMouse.value.lerp(target, 0.06)
    renderer.render(scene, camera)
  }

  if (reducedMotion) {
    // single static frame, no animation loop
    uniforms.uTime.value = 30
    renderer.render(scene, camera)
    return
  }

  renderer.setAnimationLoop(() => { if (running) frame() })

  // pause when the hero is offscreen (rAF already pauses on hidden tabs)
  const io = new IntersectionObserver(([entry]) => { running = entry.isIntersecting })
  io.observe(canvas)
}
