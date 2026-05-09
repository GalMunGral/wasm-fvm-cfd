#pragma once
#include <vector>
#include <stdexcept>

class Grid {
public:
    int rows, cols;

    Grid(int rows, int cols, double init = 0)
        : rows(rows), cols(cols), data(rows * cols, init) {}

    double& at(int i, int j) {
        return data[index(i, j)];
    }

    const double& at(int i, int j) const {
        return data[index(i, j)];
    }

    double* data_ptr() { return data.data(); }

private:
    std::vector<double> data;

    int index(int i, int j) const {
        if (i < 0) i += rows;
        if (j < 0) j += cols;
        return i * cols + j;
    }
};