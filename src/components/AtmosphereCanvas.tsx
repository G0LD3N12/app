import React, { useEffect, useRef } from 'react';

export const AtmosphereCanvas: React.FC = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let isFocused = true;
    let isHidden = document.hidden;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    const handleResize = () => {
      // 0.5x resolution for ultra-high performance & low power
      canvas.width = Math.max(1, Math.floor(window.innerWidth / 2));
      canvas.height = Math.max(1, Math.floor(window.innerHeight / 2));
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const onFocus = () => {
      isFocused = true;
      startLoop();
    };
    const onBlur = () => {
      isFocused = false;
      cancelAnimationFrame(animId);
    };
    const onVisibilityChange = () => {
      isHidden = document.hidden;
      if (isHidden) {
        cancelAnimationFrame(animId);
      } else if (isFocused) {
        startLoop();
      }
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Aurora blob simulation
    let t = 0;
    const render = () => {
      if (!isFocused || isHidden) return;
      t += 0.003;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Blob 1: Top-right ambient drift
      const x1 = w * 0.75 + Math.sin(t * 0.7) * (w * 0.12);
      const y1 = h * 0.2 + Math.cos(t * 0.5) * (h * 0.1);
      const r1 = Math.max(w, h) * 0.55;
      const g1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, r1);
      g1.addColorStop(0, 'rgba(229, 184, 66, 0.45)');
      g1.addColorStop(0.5, 'rgba(229, 184, 66, 0.1)');
      g1.addColorStop(1, 'rgba(229, 184, 66, 0)');

      ctx.fillStyle = g1;
      ctx.beginPath();
      ctx.arc(x1, y1, r1, 0, Math.PI * 2);
      ctx.fill();

      // Blob 2: Bottom-left gentle counter-drift
      const x2 = w * 0.2 + Math.cos(t * 0.6) * (w * 0.1);
      const y2 = h * 0.8 + Math.sin(t * 0.4) * (h * 0.12);
      const r2 = Math.max(w, h) * 0.45;
      const g2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, r2);
      g2.addColorStop(0, 'rgba(200, 160, 60, 0.28)');
      g2.addColorStop(0.6, 'rgba(200, 160, 60, 0.05)');
      g2.addColorStop(1, 'rgba(200, 160, 60, 0)');

      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(x2, y2, r2, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    const startLoop = () => {
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(render);
    };

    startLoop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="app-atmosphere-canvas"
      aria-hidden="true"
    />
  );
});
