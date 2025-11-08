// src/components/Globe.jsx
import { useEffect, useRef, useState } from "react";

export function Globe({ maxWidth = 512, maxHeight = 512 }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: maxWidth, height: maxHeight });

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const size = Math.min(rect.width, maxWidth, maxHeight);
      setDimensions({ width: size, height: size });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [maxWidth, maxHeight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = dimensions;
    const POINTS = 1000;
    const RADIUS = Math.min(width, height) * 0.44;
    const COLOR = "#2563EB";
    const points = [];
    let t = 0;
    let rotX = 0, rotY = 0;
    const baseRotY = 0.002;

    for (let i = 0; i < POINTS; i++) {
      const theta = Math.acos(2 * Math.random() - 1);
      const phi = 2 * Math.PI * Math.random();
      const r = RADIUS * Math.cbrt(Math.random());
      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(theta);
      points.push({ x, y, z });
    }

    const project = (p, rotY, rotX) => {
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      let x = p.x * cosY + p.z * sinY;
      let z = p.z * cosY - p.x * sinY;
      let y = p.y;
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      let y2 = y * cosX - z * sinX;
      let z2 = z * cosX + y * sinX;
      const depth = 500;
      const scale = depth / (depth + z2);
      const px = width / 2 + x * scale;
      const py = height / 2 + y2 * scale;
      return { px, py, scale, z: z2 };
    };

    function draw() {
      ctx.clearRect(0, 0, width, height);
      rotY += baseRotY;
      const pulse = Math.sin(t * 0.04) * 0.3 + 0.7;

      for (let i = 0; i < POINTS; i++) {
        const p = points[i];
        const pr = project(p, rotY, rotX);
        const alpha = 0.25 + 0.75 * (1 - Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z) / RADIUS);
        const size = 1.2 * pr.scale * pulse;
        ctx.beginPath();
        ctx.fillStyle = COLOR;
        ctx.globalAlpha = alpha * pr.scale;
        ctx.arc(pr.px, pr.py, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      t += 1;
      requestAnimationFrame(draw);
    }

    draw();
  }, [dimensions]);

  return (
    <div ref={containerRef} style={{ width: "100%", maxWidth: `${maxWidth}px` }}>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ display: "block", width: "100%", height: "auto" }}
      />
    </div>
  );
}
