'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Pause, Play } from 'lucide-react';
import { useAutomaticMotion } from './automatic-motion';

const vertexShader = `
  out vec2 fragCoord;
  uniform vec2 u_resolution;
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
    fragCoord = (position.xy + 1.0) * 0.5 * u_resolution;
  }
`;

// Adapted from the supplied dot-field shader with continuous waves between cells.
const fragmentShader = `
  precision highp float;
  in vec2 fragCoord;
  out vec4 fragColor;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec3 u_colors[3];
  uniform float u_ratio;
  float random(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
  void main() {
    float spacing = 22.0 * u_ratio;
    vec2 cell = floor(fragCoord / spacing);
    vec2 local = fract(fragCoord / spacing);
    float seed = random(cell);
    float size = mix(0.12, 0.34, step(0.82, seed));
    float dotMask = (1.0 - step(size, local.x)) * (1.0 - step(size, local.y));
    float distanceFromCenter = distance(cell, u_resolution / spacing * 0.5);
    float wave = 0.5 + 0.5 * sin(distanceFromCenter * 0.32 - u_time * 2.0 + seed * 2.0);
    float drift = 0.5 + 0.5 * sin(cell.x * 0.19 + cell.y * 0.24 - u_time * 1.1);
    float opacity = mix(0.12, 0.78, wave * drift);
    vec3 color = u_colors[int(floor(seed * 3.0))];
    fragColor = vec4(color, dotMask * opacity);
  }
`;

export function AuthPixelBackground() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const syncMotion = useRef<(() => void) | null>(null);
  const motion = useRef({ allowed: false, paused: true });
  const pathname = usePathname();
  const { allowed, paused } = useAutomaticMotion();

  useEffect(() => {
    motion.current = { allowed, paused };
    syncMotion.current?.();
  }, [allowed, paused]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let active = true;
    let dispose: (() => void) | undefined;
    void import('three').then(THREE => {
      if (!active) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ canvas: element, alpha: true, antialias: false });
      } catch {
        element.dataset.renderer = 'fallback';
        return;
      }
      const signup = pathname === '/sign-up';
      const uniforms = {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2() },
        u_ratio: { value: 1 },
        u_colors: { value: (signup ? ['#ff3994', '#b49aff', '#315dff'] : ['#ffe029', '#315dff', '#7aafff']).map(color => new THREE.Color(color)) },
      };
      const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, glslVersion: THREE.GLSL3, transparent: true, depthTest: false, depthWrite: false });
      const geometry = new THREE.PlaneGeometry(2, 2);
      const scene = new THREE.Scene();
      scene.add(new THREE.Mesh(geometry, material));
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      let frame = 0;
      let previousTime = performance.now();
      let renderedTime = 0;

      function draw() {
        renderer.render(scene, camera);
        element!.dataset.renderer = 'webgl';
        element!.dataset.drawn = 'true';
      }
      function resize() {
        const bounds = element!.getBoundingClientRect();
        const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
        renderer.setPixelRatio(ratio);
        renderer.setSize(bounds.width, bounds.height, false);
        uniforms.u_ratio.value = ratio;
        renderer.getDrawingBufferSize(uniforms.u_resolution.value);
        draw();
      }
      function animate(time: number) {
        frame = 0;
        uniforms.u_time.value += Math.min(time - previousTime, 100) / 1000;
        previousTime = time;
        if (time - renderedTime >= 1000 / 30) {
          draw();
          renderedTime = time;
        }
        frame = requestAnimationFrame(animate);
      }
      function sync() {
        cancelAnimationFrame(frame);
        frame = 0;
        if (active && motion.current.allowed && !motion.current.paused && !document.hidden) {
          previousTime = performance.now();
          frame = requestAnimationFrame(animate);
        }
      }
      const observer = new ResizeObserver(resize);
      dispose = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        document.removeEventListener('visibilitychange', sync);
        syncMotion.current = null;
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      };
      observer.observe(element);
      document.addEventListener('visibilitychange', sync);
      syncMotion.current = sync;
      resize();
      sync();
    }).catch(() => {
      dispose?.();
      dispose = undefined;
      if (active) element.dataset.renderer = 'fallback';
    });
    return () => { active = false; dispose?.(); };
  }, [pathname]);

  return <canvas ref={canvas} id="auth-pixel-background" className="auth-pixel-background" aria-hidden="true" />;
}

export function AuthPixelMotionControl() {
  const { ready, allowed, paused, toggle } = useAutomaticMotion();
  if (!ready || !allowed) return null;
  return <button type="button" className="auth-pixel-motion" onClick={toggle} aria-controls="auth-pixel-background" aria-label={paused ? 'Resume background motion' : 'Pause background motion'} title={paused ? 'Resume background motion' : 'Pause background motion'}>
    {paused ? <Play size={17} aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}
  </button>;
}
