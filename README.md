# Interactive Navier–Stokes Simulation

**Live demo:** https://hwenchi.github.io/wasm-fvm-cfd/

## Rhetorical Design

### Purpose

Scientific results are typically communicated through static artifacts — figures, papers, videos — which an audience receives passively. This project explores what becomes possible when the computation itself is embedded in the communication. A student or museum visitor who can adjust viscosity and watch the flow respond has access to something a diagram cannot provide: direct, embodied experience of how a physical parameter shapes a system's behavior. WebAssembly makes this possible by enabling non-trivial numerical computation to run live in the browser — a threshold the previous JavaScript implementation of this solver could not cross.

### Strategy

The controls are the exhibit. Rather than illustrating results the author already computed, the simulation runs fresh for each visitor and responds to their input. The physics is kept approachable — a fluid in a box, a handful of parameters — so that the interactivity itself remains legible rather than being overwhelmed by complexity.

### Technical Challenges

#### Finite Volume Method Solver

The simulation models incompressible viscous flow governed by the Navier–Stokes equations:

```math
\int_D \frac{\partial\vec{u}}{\partial t}\ \mathrm{d}V = \int_D \left(-\nabla\cdot(\vec{u}\vec{u}) + \nu\nabla^2\vec{u} - \nabla p\right)\mathrm{d}V
```

Applying the Leibniz rule and the divergence theorem to each control volume $`D`$:

```math
\frac{\mathrm{d}}{\mathrm{d}t}\int_D \vec{u}\ \mathrm{d}V = \int_{\partial D} \left(-\vec{u}\vec{u} + \nu\nabla\vec{u}\right)\mathrm{d}S - \int_D \nabla p\ \mathrm{d}V
```

Each time step proceeds in three stages:

1. Advance velocity explicitly, ignoring pressure:
```math
\vec{v}^{(n+1)} = \vec{u}^{(n)} + \Delta t \frac{1}{\Delta x \Delta y}\int_{\partial D} \left(-\vec{u}^{(n)}\vec{u}^{(n)} + \nu\nabla\vec{u}^{(n)}\right)\mathrm{d}S
```

2. Solve for the pressure that enforces incompressibility:
```math
\nabla^2 p^{(n+1)} = \frac{\nabla\cdot\vec{v}^{(n+1)}}{\Delta t}
```

3. Project back onto the divergence-free subspace:
```math
\vec{u}^{(n+1)} = \vec{v}^{(n+1)} - \Delta t\,\nabla p^{(n+1)}
```

#### Zero-Copy Memory Handoff

The C++ solver allocates all grids as static globals. JavaScript reads velocity data directly from WASM linear memory via `HEAPF64.subarray()` using the raw pointer returned by the solver — no serialization, no copies across the boundary each frame.