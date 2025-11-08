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
    let rotX = 0, rotY = 0, velocityX = 0, velocityY = 0;
    const baseRotY = 0.002;
    const mouse = { x: 0, y: 0, active: false };

    for (let i = 0; i < POINTS; i++) {
      const theta = Math.acos(2 * Math.random() - 1);
      const phi = 2 * Math.PI * Math.random();
      const r = RADIUS * Math.cbrt(Math.random());
      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(theta);
      points.push({ x, y, z, offsetX: 0, offsetY: 0 });
    }

    const project = (p, ry, rx) => {
      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);
      let x = p.x * cosY + p.z * sinY;
      let z = p.z * cosY - p.x * sinY;
      let y = p.y;
      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);
      let y2 = y * cosX - z * sinX;
      let z2 = z * cosX + y * sinX;
      const depth = 500;
      const scale = depth / (depth + z2);
      return { px: width / 2 + x * scale, py: height / 2 + y2 * scale, scale };
    };

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const pulse = Math.sin(t * 0.04) * 0.3 + 0.7;
      rotY += baseRotY + velocityY;
      rotX += velocityX;
      velocityX *= 0.96;
      velocityY *= 0.96;

      for (let i = 0; i < POINTS; i++) {
        const p = points[i];
        const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
        const wave = Math.sin(dist / 10 - t * 0.1);
        const amp = wave * 6 * pulse;
        const pr = project({ x: p.x, y: p.y, z: p.z + amp }, rotY, rotX);
        const alpha = 0.25 + 0.75 * (1 - dist / RADIUS);
        const size = 1.2 * pr.scale;

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

    requestAnimationFrame(draw);
  }, [dimensions]);

  return (
    <div ref={containerRef} style={{ width: "100%", maxWidth: `${maxWidth}px` }}>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{
          display: "block",
          cursor: "grab",
          width: "100%",
          height: "auto",
          filter: "blur(0.4px) brightness(1.1)",
        }}
      />
    </div>
  );
}
