#pragma once
#include <cmath>
#include "grid.hpp"

struct WallParams {
    double k, omega, phase, amp;
};

void poissonSOR(Grid& p, const Grid& S,
                const Grid& Ap, const Grid& Ae, const Grid& Aw,
                const Grid& An, const Grid& As,
                int nx, int ny, double tol, int maxit, double beta) {
    int it = 0;
    double err = 1e10;
    while (err > tol && it < maxit) {
        Grid pk = p;
        double errsq = 0;
        for (int i = 1; i <= nx; ++i) {
            for (int j = 1; j <= ny; ++j) {
                double ap = Ap.at(j, i);
                double an = An.at(j, i);
                double as = As.at(j, i);
                double aw = Aw.at(j, i);
                double ae = Ae.at(j, i);
                double pe = p.at(j, i + 1);
                double pw = p.at(j, i - 1);
                double pn = p.at(j + 1, i);
                double ps = p.at(j - 1, i);
                double result = S.at(j, i) - (ae * pe + aw * pw + an * pn + as * ps);
                p.at(j, i) = (beta * result) / ap + (1 - beta) * pk.at(j, i);
                errsq += (p.at(j, i) - pk.at(j, i)) * (p.at(j, i) - pk.at(j, i));
            }
        }
        err = std::sqrt(errsq / nx / ny);
        ++it;
    }
}

void advance(
    Grid& u, Grid& v, Grid& ut, Grid& vt, Grid& p, Grid& divut,
    const Grid& Ap, const Grid& Ae, const Grid& Aw, const Grid& An, const Grid& As,
    int nx, int ny, double dx, double dy, double nu, double dt,
    double tol, int maxit, double beta, double& t, double Umax,
    const WallParams walls[4]
) {
    for (int i = 0; i < u.rows; ++i) u.at(i, 1) = 0;
    for (int i = 0; i < u.rows; ++i) u.at(i, -1) = 0;
    for (int j = 0; j < u.cols; ++j) {
        double x = (double)j / nx;
        u.at(-1, j) = 2 * walls[0].amp * Umax * std::sin(walls[0].k * x + walls[0].omega * t + walls[0].phase) - u.at(-2, j);
        u.at(0, j)  = 2 * walls[1].amp * Umax * std::sin(walls[1].k * x + walls[1].omega * t + walls[1].phase) - u.at(1, j);
    }

    for (int j = 0; j < v.cols; ++j) v.at(-1, j) = 0;
    for (int j = 0; j < v.cols; ++j) v.at(1, j) = 0;
    for (int i = 0; i < v.rows; ++i) {
        double y = (double)i / ny;
        v.at(i, 0)  = 2 * walls[2].amp * Umax * std::sin(walls[2].k * y + walls[2].omega * t + walls[2].phase) - v.at(i, 1);
        v.at(i, -1) = 2 * walls[3].amp * Umax * std::sin(walls[3].k * y + walls[3].omega * t + walls[3].phase) - v.at(i, -2);
    }

    for (int i = 2; i <= nx; ++i) {
        for (int j = 1; j <= ny; ++j) {
            double ue = 0.5 * (u.at(j, i + 1) + u.at(j, i));
            double uw = 0.5 * (u.at(j, i) + u.at(j, i - 1));
            double un = 0.5 * (u.at(j + 1, i) + u.at(j, i));
            double us = 0.5 * (u.at(j, i) + u.at(j - 1, i));
            double vn = 0.5 * (v.at(j + 1, i - 1) + v.at(j + 1, i));
            double vs = 0.5 * (v.at(j, i - 1) + v.at(j, i));
            double convection = -(ue * ue - uw * uw) / dx - (un * vn - us * vs) / dy;
            double diffusion = nu * (
                (u.at(j, i - 1) - 2 * u.at(j, i) + u.at(j, i + 1)) / dx / dx +
                (u.at(j - 1, i) - 2 * u.at(j, i) + u.at(j + 1, i)) / dy / dy
            );
            ut.at(j, i) = u.at(j, i) + dt * (convection + diffusion);
        }
    }

    for (int i = 1; i <= nx; ++i) {
        for (int j = 2; j <= ny; ++j) {
            double ve = 0.5 * (v.at(j, i + 1) + v.at(j, i));
            double vw = 0.5 * (v.at(j, i) + v.at(j, i - 1));
            double ue = 0.5 * (u.at(j, i + 1) + u.at(j - 1, i + 1));
            double uw = 0.5 * (u.at(j, i) + u.at(j - 1, i));
            double vn = 0.5 * (v.at(j + 1, i) + v.at(j, i));
            double vs = 0.5 * (v.at(j, i) + v.at(j - 1, i));
            double convection = -(ue * ve - uw * vw) / dx - (vn * vn - vs * vs) / dy;
            double diffusion = nu * (
                (v.at(j, i - 1) - 2 * v.at(j, i) + v.at(j, i + 1)) / dx / dx +
                (v.at(j - 1, i) - 2 * v.at(j, i) + v.at(j + 1, i)) / dy / dy
            );
            vt.at(j, i) = v.at(j, i) + dt * (convection + diffusion);
        }
    }

    for (int i = 1; i <= nx; ++i) {
        for (int j = 1; j <= ny; ++j) {
            divut.at(j, i) = ((ut.at(j, i + 1) - ut.at(j, i)) / dx + (vt.at(j + 1, i) - vt.at(j, i)) / dy) / dt;
        }
    }

    poissonSOR(p, divut, Ap, Ae, Aw, An, As, nx, ny, tol, maxit, beta);

    for (int i = 2; i <= nx; ++i) {
        for (int j = 1; j <= ny; ++j) {
            u.at(j, i) = ut.at(j, i) - (p.at(j, i) - p.at(j, i - 1)) / dx * dt;
        }
    }
    for (int i = 1; i <= nx; ++i) {
        for (int j = 2; j <= ny; ++j) {
            v.at(j, i) = vt.at(j, i) - (p.at(j, i) - p.at(j - 1, i)) / dy * dt;
        }
    }

    t += dt;
}