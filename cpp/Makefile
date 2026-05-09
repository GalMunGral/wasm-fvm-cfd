CXX = em++
CXXFLAGS = -O2 -std=c++17
LDFLAGS = \
	-s WASM=1 \
	-s EXPORTED_FUNCTIONS='["_init","_step","_get_u_ptr","_get_v_ptr","_get_rows","_get_cols","_set_nu","_set_wall"]' \
	-s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","HEAPF64"]' \
	-s ALLOW_MEMORY_GROWTH=1 \
	-s MODULARIZE=1 \
	-s EXPORT_NAME=createSolverModule

OUT = ../public/solver.js

all: $(OUT)

$(OUT): main.cpp grid.hpp solver.hpp
	$(CXX) $(CXXFLAGS) main.cpp -o $(OUT) $(LDFLAGS)

clean:
	rm -f $(OUT) ../solver.wasm
