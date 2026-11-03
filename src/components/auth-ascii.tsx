'use client';

import { useEffect, useRef } from 'react';
import { useAutomaticMotion } from './automatic-motion';

const COLS = 57;
const ROWS = 29;
const palette = ' .:01+X#@';

/** An original code-built planet: no video, external SDK or image readback. */
function glyphs(phase: number) {
  const rows: string[] = [];
  for (let y = 0; y < ROWS; y++) {
    let row = '';
    for (let x = 0; x < COLS; x++) {
      const nx = (x - 28) / 23;
      const ny = (y - 14) / 12.4;
      const r = nx * nx + ny * ny;
      if (r > 1) { row += (x * 7 + y * 13) % 107 === 0 ? '+' : ' '; continue; }
      const depth = Math.sqrt(1 - r);
      const longitude = Math.atan2(nx, depth) + phase;
      const latitude = Math.asin(ny);
      const land = Math.sin(longitude * 3 + Math.cos(latitude * 4))
        + Math.cos(latitude * 6 - longitude * 2) * .6 > .55;
      const light = Math.max(0, depth * .8 - nx * .35 - ny * .2);
      const value = land ? 4 + Math.floor(light * 4) : 1 + Math.floor(light * 2);
      row += palette[Math.min(value, palette.length - 1)];
    }
    rows.push(row);
  }
  return rows;
}

const still = glyphs(.5).join('\n');

export function AuthAscii() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { ready, paused } = useAutomaticMotion();
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let started = 0;
    let last = -100;
    let finished = reduced.matches || !ready || paused;
    const paint = (phase: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      const scale = Math.min(devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(width * scale) || canvas.height !== Math.round(height * scale)) {
        canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
      }
      context.setTransform(scale, 0, 0, scale, 0, 0);
      context.clearRect(0, 0, width, height);
      const step = Math.min(width / COLS, height / (ROWS * 1.7));
      const rowHeight = step * 1.7;
      const left = (width - step * COLS) / 2;
      const top = (height - rowHeight * ROWS) / 2;
      context.font = `600 ${step * 1.55}px monospace`;
      context.textBaseline = 'top';
      const grid = glyphs(phase);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const char = grid[y][x];
        if (char === ' ') continue;
        context.fillStyle = char === '@' || char === '#' ? '#d6ff00' : char === '+' ? '#8ea9ff' : '#f4f2ec';
        context.fillText(char, left + x * step, top + y * rowHeight);
      }
      canvas.dataset.drawn = 'true';
    };
    const tick = (now: number) => {
      if (document.hidden || reduced.matches || finished) return;
      if (!started) started = now;
      const age = now - started;
      if (age - last > 85) { paint(.5 + Math.min(age / 4200, 1) * .7); last = age; }
      if (age < 4200) frame = requestAnimationFrame(tick);
      else finished = true;
    };
    const stop = () => { cancelAnimationFrame(frame); finished = true; paint(1.2); };
    const visibility = () => { if (document.hidden) stop(); };
    const observer = new ResizeObserver(() => paint(finished ? 1.2 : .5));
    observer.observe(canvas);
    const viewport = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) stop(); });
    viewport.observe(canvas);
    paint(.5);
    if (!finished && !document.hidden && canvas.clientWidth > 0) frame = requestAnimationFrame(tick);
    reduced.addEventListener('change', stop);
    document.addEventListener('visibilitychange', visibility);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); viewport.disconnect(); reduced.removeEventListener('change', stop); document.removeEventListener('visibilitychange', visibility); };
  }, [ready, paused]);
  return <div className="auth-ascii" aria-hidden="true"><pre>{still}</pre><canvas ref={canvasRef} /><span className="ascii-coordinate">COORD / MEC</span><span className="ascii-signal">● SIGNAL FOUND</span></div>;
}
