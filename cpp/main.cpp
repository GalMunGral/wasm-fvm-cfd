#include <emscripten.h>
#include <cmath>
#include "grid.hpp"
#include "solver.hpp"

static const int nx = 100;
static const int ny = 100;
static const double lx = 1;
static const double ly = 1;
static const double dx = lx / nx;
static const double dy = ly / ny;
static const double tol = 1e-3;
static const int maxit = 10;
static const double beta = 1.25;
static const double Umax = 1;

static double nu = 0.01;
static double dt;
static WallParams walls[4] = {};

static Grid Ae(ny + 2, nx + 2, 1.0 / dx / dx);
static Grid Aw(ny + 2, nx + 2, 1.0 / dx / dx);
static Grid An(ny + 2, nx + 2, 1.0 / dy / dy);
static Grid As(ny + 2, nx + 2, 1.0 / dy / dy);
static Grid Ap(ny + 2, nx + 2, 0);

static Grid p(ny + 2, nx + 2, 0);
static Grid u(ny + 2, nx + 2, 0);
static Grid v(ny + 2, nx + 2, 0);
static Grid ut(ny + 2, nx + 2, 0);
static Grid vt(ny + 2, nx + 2, 0);
static Grid divut(ny + 2, nx + 2, 0);

static double t = 0;

static double compute_dt() {
    return std::min(
        0.5 / nu / (1.0 / dx / dx + 1.0 / dy / dy),
        2.0 * nu / Umax / Umax
    );
}

extern "C" {

EMSCRIPTEN_KEEPALIVE void init() {
    dt = compute_dt();
    for (int j = 1; j <= ny; ++j) Aw.at(j, 1) = 0;
    for (int j = 1; j <= ny; ++j) Ae.at(j, nx) = 0;
    for (int i = 1; i <= nx; ++i) An.at(ny, i) = 0;
    for (int i = 1; i <= nx; ++i) As.at(1, i) = 0;
    int n = (ny + 2) * (nx + 2);
    double* ap = Ap.data_ptr();
    double* ae = Ae.data_ptr();
    double* aw = Aw.data_ptr();
    double* an = An.data_ptr();
    double* as = As.data_ptr();
    for (int i = 0; i < n; ++i) ap[i] = -(ae[i] + aw[i] + an[i] + as[i]);
}

EMSCRIPTEN_KEEPALIVE void step() {
    advance(u, v, ut, vt, p, divut,
            Ap, Ae, Aw, An, As,
            nx, ny, dx, dy, nu, dt,
            tol, maxit, beta, t, Umax, walls);
}

EMSCRIPTEN_KEEPALIVE void set_nu(double new_nu) {
    nu = new_nu;
    dt = compute_dt();
}

EMSCRIPTEN_KEEPALIVE void set_wall(int i, double k, double omega, double phase, double amp) {
    walls[i] = WallParams{k, omega, phase, amp};
}

EMSCRIPTEN_KEEPALIVE double* get_u_ptr() { return u.data_ptr(); }
EMSCRIPTEN_KEEPALIVE double* get_v_ptr() { return v.data_ptr(); }
EMSCRIPTEN_KEEPALIVE int get_rows() { return ny + 2; }
EMSCRIPTEN_KEEPALIVE int get_cols() { return nx + 2; }

}