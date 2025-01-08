import { TensorView } from "./tensor";
import { interpolateInferno } from "d3-scale-chromatic";

export function createPlot(nx: int, ny: int, Umax: float) {
  const plot = document.querySelector("svg#plot") as SVGElement;
  const glyphs = Array(ny)
    .fill(0)
    .map(() => Array(nx).fill(null));
  const cells = Array(ny)
    .fill(0)
    .map(() => Array(nx).fill(null));

  const width = 512;
  const height = 512;
  const xStep = width / nx;
  const yStep = height / ny;
  plot.setAttribute("viewBox", `${0} ${0} ${width} ${height}`);

  for (let j = 0; j < ny; ++j) {
    for (let i = 0; i < nx; ++i) {
      const cell = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect"
      );
      cell.setAttribute("x", String(i * xStep));
      cell.setAttribute("y", String(height - (j + 1) * yStep));
      cell.setAttribute("width", String(xStep));
      cell.setAttribute("height", String(yStep));
      plot.appendChild(cell);
      cells[j][i] = cell;
    }
  }

  for (let j = 0; j < ny; ++j) {
    for (let i = 0; i < nx; ++i) {
      const glyph = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      glyph.setAttribute("marker-end", "url(#head)");
      glyph.setAttribute("stroke-width", "1");
      glyph.setAttribute("stroke", "#ffffffcc");
      plot.appendChild(glyph);
      glyphs[j][i] = glyph;
    }
  }
  return function visualize(u: TensorView, v: TensorView) {
    const up = u
      .slice([1, -1], [1, -1])
      .add(u.slice([1, -1], [2]))
      .div(2);

    const vp = v
      .slice([1, -1], [1, -1])
      .add(v.slice([2], [1, -1]))
      .div(2);

    const scale = Math.sqrt(xStep * xStep + yStep * yStep) / Umax;

    for (let j = 0; j < ny; ++j) {
      for (let i = 0; i < nx; ++i) {
        const x = (i + 0.5) * xStep;
        const y = (j + 0.5) * yStep;
        const u = up.get(j, i);
        const v = vp.get(j, i);
        const xStart = x;
        const yStart = y;
        const xEnd = x + u * scale;
        const yEnd = y + v * scale;
        const speed = Math.sqrt(u * u + v * v);
        glyphs[j][i].setAttribute(
          "d",
          `M ${xStart} ${height - yStart} L ${xEnd} ${height - yEnd}`
        );
        cells[j][i].setAttribute(
          "fill",
          interpolateInferno(speed / (1 * Umax))
        );
      }
    }
  };
}
