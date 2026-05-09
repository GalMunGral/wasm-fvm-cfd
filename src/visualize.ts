import { interpolateInferno } from "d3-scale-chromatic";
import { rgb } from "d3-color";

const cellSize = 5;

export function createPlot(nx: number, ny: number, Umax: number) {
  const canvas = document.querySelector("canvas#plot") as HTMLCanvasElement;
  canvas.width = nx * cellSize;
  canvas.height = ny * cellSize;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(canvas.width, canvas.height);
  const pixels = imageData.data;

  return function visualize(u: Float64Array, v: Float64Array) {
    const cols = nx + 2;
    const scale = Math.sqrt(2) * cellSize / Umax;

    for (let j = 0; j < ny; ++j) {
      for (let i = 0; i < nx; ++i) {
        const up = (u[(j + 1) * cols + (i + 1)] + u[(j + 1) * cols + (i + 2)]) / 2;
        const vp = (v[(j + 1) * cols + (i + 1)] + v[(j + 2) * cols + (i + 1)]) / 2;
        const speed = Math.sqrt(up * up + vp * vp);
        const { r, g, b } = rgb(interpolateInferno(speed / Umax))!;
        const px = i * cellSize;
        const py = (ny - 1 - j) * cellSize;
        for (let dy = 0; dy < cellSize; ++dy) {
          for (let dx = 0; dx < cellSize; ++dx) {
            const idx = ((py + dy) * canvas.width + px + dx) * 4;
            pixels[idx] = r;
            pixels[idx + 1] = g;
            pixels[idx + 2] = b;
            pixels[idx + 3] = 255;
          }
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);

    ctx.strokeStyle = "#ffffffcc";
    ctx.lineWidth = 1;
    for (let j = 0; j < ny; ++j) {
      for (let i = 0; i < nx; ++i) {
        const x = (i + 0.5) * cellSize;
        const y = (ny - 0.5 - j) * cellSize;
        const up = (u[(j + 1) * cols + (i + 1)] + u[(j + 1) * cols + (i + 2)]) / 2;
        const vp = (v[(j + 1) * cols + (i + 1)] + v[(j + 2) * cols + (i + 1)]) / 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + up * scale, y - vp * scale);
        ctx.stroke();
      }
    }
  };
}