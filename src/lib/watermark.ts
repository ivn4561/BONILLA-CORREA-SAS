/** Dibuja la marca de agua en diagonal, repetida, directamente sobre el canvas del documento. */
export function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number, lines: string[], scale = 1) {
  ctx.save();
  const fontSize = Math.max(11, Math.round(14 * scale));
  ctx.font = `600 ${fontSize}px Montserrat, Arial, sans-serif`;
  // Dos tonos (letra oscura con contorno claro): legible tanto sobre páginas claras como oscuras.
  ctx.fillStyle = "rgba(26, 39, 68, 0.16)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = Math.max(2, fontSize / 5);
  ctx.lineJoin = "round";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const stepX = 360 * scale;
  const stepY = 170 * scale;
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 6);
  const span = Math.hypot(width, height);
  for (let y = -span; y < span; y += stepY) {
    for (let x = -span; x < span; x += stepX) {
      const offset = (Math.round(y / stepY) % 2) * (stepX / 2);
      lines.forEach((line, i) => {
        ctx.strokeText(line, x + offset, y + i * (fontSize + 4));
        ctx.fillText(line, x + offset, y + i * (fontSize + 4));
      });
    }
  }
  ctx.restore();
}

/** Misma marca como imagen SVG repetible (para Word/Excel renderizados en HTML). */
export function watermarkDataUrl(lines: string[]): string {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const texts = lines.map((l, i) => `<text x="180" y="${80 + i * 18}" text-anchor="middle">${esc(l)}</text>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="170"><g transform="rotate(-30 180 85)" font-family="Arial, sans-serif" font-size="13" font-weight="600" fill="rgba(26,39,68,0.16)" stroke="rgba(255,255,255,0.22)" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${texts}</g></svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}
