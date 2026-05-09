import { createPlot } from "./visualize";

interface SolverModule {
  _init(): void;
  _step(): void;
  _get_u_ptr(): number;
  _get_v_ptr(): number;
  _get_rows(): number;
  _get_cols(): number;
  HEAPF64: Float64Array;
}

declare const createSolverModule: () => Promise<SolverModule>;

const Umax = 1;

async function main() {
  const Module = await createSolverModule();
  Module._init();

  const nx = Module._get_cols() - 2;
  const ny = Module._get_rows() - 2;
  const size = (ny + 2) * (nx + 2);

  const uPtr = Module._get_u_ptr();
  const vPtr = Module._get_v_ptr();
  const u = Module.HEAPF64.subarray(uPtr / 8, uPtr / 8 + size);
  const v = Module.HEAPF64.subarray(vPtr / 8, vPtr / 8 + size);

  const visualize = createPlot(nx, ny, Umax);

  function advance() {
    Module._step();
    visualize(u, v);
    requestAnimationFrame(advance);
  }

  requestAnimationFrame(advance);
}

main();
