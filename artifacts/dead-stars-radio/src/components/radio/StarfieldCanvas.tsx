import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  phase: number;
  speed: number;
  r: number;
  g: number;
  b: number;
}

function generateStars(count: number, w: number, h: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const roll = Math.random();
    // 70% tiny, 22% small, 8% medium
    const radius = roll < 0.70 ? 0.4 + Math.random() * 0.4
                 : roll < 0.92 ? 0.8 + Math.random() * 0.6
                 :               1.4 + Math.random() * 0.8;

    // Color: mostly blue-white, some warm gold (like the reference)
    const colorRoll = Math.random();
    let r: number, g: number, b: number;
    if (colorRoll < 0.62) {
      // cool blue-white
      r = 200 + Math.floor(Math.random() * 55);
      g = 210 + Math.floor(Math.random() * 45);
      b = 255;
    } else if (colorRoll < 0.82) {
      // pure white
      const v = 230 + Math.floor(Math.random() * 25);
      r = v; g = v; b = v;
    } else {
      // warm gold — matches the site's amber accent
      r = 255;
      g = 180 + Math.floor(Math.random() * 60);
      b = 40 + Math.floor(Math.random() * 60);
    }

    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      radius,
      opacity: 0.25 + Math.random() * 0.75,
      phase: Math.random() * Math.PI * 2,
      speed: 0.0003 + Math.random() * 0.001,
      r, g, b,
    });
  }
  return stars;
}

export function StarfieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      starsRef.current = generateStars(220, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 1;

      for (const star of starsRef.current) {
        // Gentle twinkling via sine wave
        const twinkle = 0.5 + 0.5 * Math.sin(t * star.speed * 60 + star.phase);
        const alpha = star.opacity * (0.4 + 0.6 * twinkle);

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${star.r},${star.g},${star.b},${alpha.toFixed(3)})`;
        ctx.fill();

        // Soft glow on brighter stars
        if (star.radius > 1.1 && twinkle > 0.7) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius * 3, 0, Math.PI * 2);
          const grad = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.radius * 3);
          grad.addColorStop(0, `rgba(${star.r},${star.g},${star.b},${(alpha * 0.25).toFixed(3)})`);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.fill();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
