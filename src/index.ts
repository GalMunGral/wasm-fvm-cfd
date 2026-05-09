import { createPlot } from "./visualize";

interface SolverModule {
  _init(): void;
  _step(): void;
  _get_u_ptr(): number;
  _get_v_ptr(): number;
  _get_rows(): number;
  _get_cols(): number;
  _set_nu(nu: number): void;
  _set_wall(wall: number, k: number, omega: number, phase: number, amp: number): void;
  HEAPF64: Float64Array;
}

declare const createSolverModule: () => Promise<SolverModule>;

const Umax = 1;

const wallNames = ["Top", "Bottom", "Left", "Right"];
const wallDefaults = [
  { k: 6, omega: -9,  phase: 0.0, amp: 2 },
  { k: 4, omega: 11,  phase: 1.0, amp: 2 },
  { k: 5, omega: -7,  phase: 0.5, amp: 1 },
  { k: 3, omega: 13,  phase: 2.0, amp: 1 },
];

function wireSlider(input: HTMLInputElement, initialValue: number, onChange: (v: number) => void) {
  const span = input.nextElementSibling as HTMLSpanElement;
  input.value = String(initialValue);
  span.textContent = initialValue.toFixed(2);
  input.addEventListener("input", () => {
    const v = parseFloat(input.value);
    span.textContent = v.toFixed(2);
    onChange(v);
  });
}

function setupControls(Module: SolverModule) {
  const nuInput = document.getElementById("nu") as HTMLInputElement;
  wireSlider(nuInput, 0.01, (v) => Module._set_nu(v));

  const template = document.getElementById("wall-template") as HTMLTemplateElement;
  const container = document.getElementById("wall-controls")!;

  wallDefaults.forEach((d, i) => {
    const fragment = template.content.cloneNode(true) as DocumentFragment;

    (fragment.querySelector(".section-title") as HTMLElement).textContent = wallNames[i] + " wall";

    let { k, omega, phase, amp } = d;
    const update = () => Module._set_wall(i, k * Math.PI, omega, phase, amp);

    const inputs = fragment.querySelectorAll("input[type=range]");
    wireSlider(inputs[0] as HTMLInputElement, k,     (v) => { k     = v; update(); });
    wireSlider(inputs[1] as HTMLInputElement, omega, (v) => { omega = v; update(); });
    wireSlider(inputs[2] as HTMLInputElement, amp,   (v) => { amp   = v; update(); });

    container.appendChild(fragment);
  });
}

async function main() {
  const Module = await createSolverModule();
  Module._set_nu(0.01);
  for (let i = 0; i < wallDefaults.length; i++) {
    const d = wallDefaults[i];
    Module._set_wall(i, d.k * Math.PI, d.omega, d.phase, d.amp);
  }
  Module._init();

  const nx = Module._get_cols() - 2;
  const ny = Module._get_rows() - 2;
  const size = (ny + 2) * (nx + 2);

  const uPtr = Module._get_u_ptr();
  const vPtr = Module._get_v_ptr();
  const u = Module.HEAPF64.subarray(uPtr / 8, uPtr / 8 + size);
  const v = Module.HEAPF64.subarray(vPtr / 8, vPtr / 8 + size);

  const visualize = createPlot(nx, ny, Umax);
  setupControls(Module);

  function advance() {
    Module._step();
    visualize(u, v);
    requestAnimationFrame(advance);
  }

  requestAnimationFrame(advance);
}

main();