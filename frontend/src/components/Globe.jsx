// src/components/Globe.jsx
import { useEffect, useRef, useState } from "react";

export function Globe({ maxWidth = 700, maxHeight = 700 }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: maxWidth, height: maxHeight });

  // Handle resize and responsive sizing
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

  // Draw globe points (no mouse interaction)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = dimensions;
    const POINTS = 900;
    const RADIUS = Math.min(width, height) * 0.44;
    const COLOR = "#2563EB";
    const points = [];

    // Generate points inside sphere
    for (let i = 0; i < POINTS; i++) {
      const theta = Math.acos(2 * Math.random() - 1);
      const phi = 2 * Math.PI * Math.random();
      const r = RADIUS * Math.cbrt(Math.random());
      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(theta);
      points.push({ x, y, z });
    }

    let t = 0;
    let rotY = 0;
    const baseRotY = 0.002; // steady rotation speed

    // Project 3D points into 2D
    const project = (p, rotY, rotX) => {
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const x = p.x * cosY + p.z * sinY;
      const z = p.z * cosY - p.x * sinY;
      const y = p.y;

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const y2 = y * cosX - z * sinX;
      const z2 = z * cosX + y * sinX;

      const depth = 500;
      const scale = depth / (depth + z2);
      const px = width / 2 + x * scale;
      const py = height / 2 + y2 * scale;
      return { px, py, scale, z: z2 };
    };

    // Draw animation loop
    function draw() {
      ctx.clearRect(0, 0, width, height);
      rotY += baseRotY;
      const rotX = Math.sin(t * 0.002) * 0.2; // gentle oscillation
      const pulse = Math.sin(t * 0.02) * 0.15 + 0.85;

      for (let i = 0; i < POINTS; i++) {
        const p = points[i];
        const pr = project(p, rotY, rotX);
        const alpha = 0.15 + 0.65 * (1 - Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z) / RADIUS);
        const size = 1.1 * pr.scale * pulse;
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
