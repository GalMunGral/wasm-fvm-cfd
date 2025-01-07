import { interpolateInferno, interpolatePlasma } from "d3-scale-chromatic";
import { Scalar, TensorView } from "./tensor";

const nx = 25;
const ny = 25;
const nu = 0.1;
const lx = 1;
const ly = 1;
const dx = lx / nx;
const dy = ly / ny;

const Umax = 5;

const dt1 = 0.5 / nu / (1 / dx / dx + 1 / dy / dy);
const dt2 = (2 * nu) / Umax / Umax;
const dt = Math.min(dt1, dt2);

const p = TensorView.of([ny + 2, nx + 2], 0);
const u = TensorView.of([ny + 2, nx + 2], 0);
const v = TensorView.of([ny + 2, nx + 2], 0);
const ut = TensorView.of([ny + 2, nx + 2], 0);
const vt = TensorView.of([ny + 2, nx + 2], 0);
const divut = TensorView.of([ny + 2, nx + 2], 0);

const Ae = TensorView.of([ny + 2, nx + 2], 1 / dx / dx);
const Aw = TensorView.of([ny + 2, nx + 2], 1 / dx / dx);
const An = TensorView.of([ny + 2, nx + 2], 1 / dy / dy);
const As = TensorView.of([ny + 2, nx + 2], 1 / dy / dy);
Aw.slice([1, -1], 1).set(0);
Ae.slice([1, -1], -2).set(0);
An.slice(-2, [1, -1]).set(0);
As.slice(1, [1, -1]).set(0);
const Ap = Ae.add(Aw).add(An).add(As).mul(-1);

const tol = 1e-3;
const maxit = 10;
const beta = 1.25;

function poissonSOR(p: TensorView, S: TensorView, dx: float, dy: float) {
  let it = 0;
  let err = 1e10;
  while (err > tol && it < maxit) {
    const pk = p.copy();
    let errsq = 0;
    for (let i = 1; i <= nx; ++i) {
      for (let j = 1; j <= ny; ++j) {
        const ap = Ap.get(j, i);
        const an = An.get(j, i);
        const as = As.get(j, i);
        const aw = Aw.get(j, i);
        const ae = Ae.get(j, i);
        const pe = p.get(j, i + 1);
        const pw = p.get(j, i - 1);
        const pn = p.get(j + 1, i);
        const ps = p.get(j - 1, i);
        const result = S.get(j, i) - (ae * pe + aw * pw + an * pn + as * ps);
        p.getl(j, i).set((beta * result) / ap + (1 - beta) * pk.get(j, i));
        errsq += (p.get(j, i) - pk.get(j, i)) ** 2;
      }
    }
    err = Math.sqrt(errsq / nx / ny);
    ++it;
  }
  // console.log(err);
}

const plot = document.querySelector("svg#plot") as SVGElement;
const glyphs = Array(ny)
  .fill(0)
  .map(() => Array(nx).fill(null));
const cells = Array(ny)
  .fill(0)
  .map(() => Array(nx).fill(null));

const width = 256;
const height = 256;
const xStep = width / nx;
const yStep = height / ny;
plot.setAttribute("viewBox", `${0} ${0} ${width} ${height}`);
plot.style.height = "90vh";

for (let j = 0; j < ny; ++j) {
  for (let i = 0; i < nx; ++i) {
    const cell = document.createElementNS("http://www.w3.org/2000/svg", "rect");
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
    glyph.setAttribute("stroke", "#ffffff88");
    plot.appendChild(glyph);
    glyphs[j][i] = glyph;
  }
}

function visualize() {
  const up = u
    .slice([1, -1], [1, -1])
    .add(u.slice([1, -1], [2]))
    .div(2);

  const vp = v
    .slice([1, -1], [1, -1])
    .add(v.slice([2], [1, -1]))
    .div(2);

  const scale = 5;
  for (let j = 0; j < ny; ++j) {
    for (let i = 0; i < nx; ++i) {
      const x = (i + 0.5) * xStep;
      const y = (j + 0.5) * yStep;
      const u = up.get(j, i);
      const v = vp.get(j, i);
      const xStart = x - (u / 2) * scale;
      const yStart = y - (v / 2) * scale;
      const xEnd = x + (u / 2) * scale;
      const yEnd = y + (v / 2) * scale;
      const speed = Math.sqrt(u * u + v * v);
      cells[j][i].setAttribute("fill", interpolateInferno(speed / Umax));
      glyphs[j][i].setAttribute(
        "d",
        `M ${xStart} ${height - yStart} L ${xEnd} ${height - yEnd}`
      );
    }
  }
}

let t = 0;

function step() {
  const Ut = Math.sin(1 * t) * Umax;
  const Ub = Math.sin(2 * t) * Umax;
  const Vl = Math.sin(3 * t) * Umax;
  const Vr = Math.sin(4 * t) * Umax;

  u.slice([], 1).set(0);
  u.slice([], -1).set(0);
  u.slice(-1, []).set(Scalar.from(2 * Ut).sub(u.slice(-2, [])));
  u.slice(0, []).set(Scalar.from(2 * Ub).sub(u.slice(1, [])));

  v.slice(-1, []).set(0);
  v.slice(1, []).set(0);
  v.slice([], 0).set(Scalar.from(2 * Vl).sub(v.slice([], 1)));
  v.slice([], -1).set(Scalar.from(2 * Vr).sub(v.slice([], -2)));

  for (let i = 2; i <= nx; ++i) {
    for (let j = 1; j <= ny; ++j) {
      const ue = 0.5 * (u.get(j, i + 1) + u.get(j, i));
      const uw = 0.5 * (u.get(j, i) + u.get(j, i - 1));
      const un = 0.5 * (u.get(j + 1, i) + u.get(j, i));
      const us = 0.5 * (u.get(j, i) + u.get(j - 1, i));
      const vn = 0.5 * (v.get(j + 1, i - 1) + v.get(j + 1, i));
      const vs = 0.5 * (v.get(j, i - 1) + v.get(j, i));
      const convection = -(ue * ue - uw * uw) / dx - (un * vn - us * vs) / dy;
      const diffusion =
        nu *
        ((u.get(j, i - 1) - 2 * u.get(j, i) + u.get(j, i + 1)) / dx / dx +
          (u.get(j - 1, i) - 2 * u.get(j, i) + u.get(j + 1, i)) / dy / dy);

      ut.getl(j, i).set(u.get(j, i) + dt * (convection + diffusion));
    }
  }

  for (let i = 1; i <= nx; ++i) {
    for (let j = 2; j <= ny; ++j) {
      const ve = 0.5 * (v.get(j, i + 1) + v.get(j, i));
      const vw = 0.5 * (v.get(j, i) + v.get(j, i - 1));
      const ue = 0.5 * (u.get(j, i + 1) + u.get(j - 1, i + 1));
      const uw = 0.5 * (u.get(j, i) + u.get(j - 1, i));
      const vn = 0.5 * (v.get(j + 1, i) + v.get(j, i));
      const vs = 0.5 * (v.get(j, i) + v.get(j - 1, i));
      const convection = -(ue * ve - uw * vw) / dx - (vn * vn - vs * vs) / dy;
      const diffusion =
        nu *
        ((v.get(j, i - 1) - 2 * v.get(j, i) + v.get(j, i + 1)) / dx / dx +
          (v.get(j - 1, i) - 2 * v.get(j, i) + v.get(j + 1, i)) / dy / dy);

      vt.getl(j, i).set(v.get(j, i) + dt * (convection + diffusion));
    }
  }

  divut.slice([1, -1], [1, -1]).set(
    ut
      .slice([1, -1], [2])
      .sub(ut.slice([1, -1], [1, -1]))
      .div(dx)
      .add(
        vt
          .slice([2], [1, -1])
          .sub(vt.slice([1, -1], [1, -1]))
          .div(dy)
      )
  );

  poissonSOR(p, divut.div(dt), dx, dy);

  u.slice([1, -1], [2, -1]).set(
    ut.slice([1, -1], [2, -1]).sub(
      p
        .slice([1, -1], [2, -1])
        .sub(p.slice([1, -1], [1, -2]))
        .div(dx)
        .mul(dt)
    )
  );
  v.slice([2, -1], [1, -1]).set(
    vt.slice([2, -1], [1, -1]).sub(
      p
        .slice([2, -1], [1, -1])
        .sub(p.slice([1, -2], [1, -1]))
        .div(dy)
        .mul(dt)
    )
  );
  t += dt;

  visualize();
  requestAnimationFrame(step);
}

requestAnimationFrame(step);
