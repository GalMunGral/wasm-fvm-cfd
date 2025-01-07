function idx(i: int, N: int) {
  if (i < 0) i += N;
  if (i < 0 || i > N) {
    throw "Out of range";
  }
  return i;
}

const ADD = (a: float, b: float) => a + b;
const SUB = (a: float, b: float) => a - b;
const MUL = (a: float, b: float) => a * b;
const DIV = (a: float, b: float) => a / b;

class Tensor {
  public readonly dim: int;
  public readonly size: int;
  private data: Float32Array;

  constructor(public readonly shape: int[], initialValue: float = 0) {
    let size = 1;
    for (const s of shape) {
      size *= s;
    }
    this.size = size;
    this.dim = this.shape.length;
    this.data = new Float32Array(size);
    this.data.fill(initialValue);
  }

  public get(indices: int[], n: int = 1): Float32Array {
    if (indices.length !== this.dim) {
      throw `Dimension mismatch: ${indices.length} != ${this.dim}`;
    }
    let idx = 0;
    for (let k = 0; k < this.dim; ++k) {
      idx = idx * this.shape[k] + indices[k];
    }
    return this.data.slice(idx, idx + n);
  }

  public set(indices: int[], values: Float32Array): void {
    if (indices.length !== this.dim) {
      throw `Dimension mismatch: ${indices.length} != ${this.dim} - 1`;
    }
    let idx = 0;
    for (let k = 0; k < indices.length; ++k) {
      idx = idx * this.shape[k] + indices[k];
    }
    this.data.set(values, idx);
  }
}

export class TensorView {
  public static of(shape: int[], initialValue: float = 0) {
    const tensor = new Tensor(shape, initialValue);
    return new TensorView(
      tensor,
      shape.map((s) => [0, s])
    );
  }

  constructor(
    private readonly tensor: Tensor,
    private readonly ranges: [int, int][]
  ) {}

  public get dim(): int {
    return this.tensor.dim;
  }

  public get shape(): int[] {
    return this.ranges.map(([start, end]) => end - start);
  }

  public get(...indices: int[]): float {
    return this.tensor.get(
      indices.map((offset, k) => this.ranges[k][0] + offset)
    )[0];
  }

  public getl(...indices: int[]): {
    set: (value: float) => void;
  } {
    return {
      set: (value: float) => {
        this.tensor.set(
          indices.map((offset, k) => this.ranges[k][0] + offset),
          new Float32Array([value])
        );
      },
    };
  }

  public slice(...indices: (int | [int, int] | [int] | [])[]): TensorView {
    if (indices.length > this.dim) {
      throw `Dimension mismatch: ${indices.length} > ${this.dim}`;
    }
    const ranges: [int, int][] = [];
    for (let k = 0; k < this.dim; ++k) {
      const [start, end] = this.ranges[k];
      const N = end - start;
      if (k < indices.length) {
        const I = indices[k];
        if (typeof I == "number") {
          ranges.push([start + idx(I, N), start + idx(I, N) + 1]);
        } else if (I.length === 2) {
          ranges.push([start + idx(I[0], N), start + idx(I[1], N)]);
        } else if (I.length === 1) {
          ranges.push([start + idx(I[0], N), end]);
        } else {
          ranges.push([start, end]);
        }
      } else {
        ranges.push([start, end]);
      }
    }
    return new TensorView(this.tensor, ranges);
  }

  public set(value: float | TensorView) {
    const that =
      typeof value === "number" ? TensorView.of(this.shape, value) : value;
    this.traverse(that, (thisIndices, thatIndices, N) => {
      const values = that.tensor.get(thatIndices, N);
      this.tensor.set(thisIndices, values);
    });
  }

  public add(value: float | TensorView) {
    return this.vectorOp(ADD, value);
  }

  public sub(value: float | TensorView) {
    return this.vectorOp(SUB, value);
  }

  public mul(value: float | TensorView) {
    return this.vectorOp(MUL, value);
  }

  public div(value: float | TensorView) {
    return this.vectorOp(DIV, value);
  }

  private vectorOp(
    op: (a: float, b: float) => float,
    value: float | TensorView
  ): TensorView {
    const that =
      typeof value === "number" ? TensorView.of(this.shape, value) : value;

    const result = TensorView.of(this.shape);

    this.traverse(that, (thisIndices, thatIndices, N, indices) => {
      const thisValues = this.tensor.get(thisIndices, N);
      const thatValues = that.tensor.get(thatIndices, N);
      const values = new Float32Array(N);
      for (let i = 0; i < N; ++i) {
        values[i] = op(thisValues[i], thatValues[i]);
      }
      result.tensor.set(indices, values);
    });

    return result;
  }

  private traverse(
    that: TensorView,
    fn: (thisIndices: int[], thatIndices: int[], N: int, indices: int[]) => void
  ) {
    if (that.dim !== this.dim) {
      throw `Dimension mismatch: ${that.dim} != ${this.dim}`;
    }

    const dim = this.dim;
    const thisShape = this.shape;
    const thatShape = that.shape;

    for (let i = 0; i < dim; ++i) {
      if (thatShape[i] !== thisShape[i]) {
        throw `Dimension mismatch (${i})`;
      }
    }

    const thisRanges = this.ranges;
    const thatRanges = that.ranges;

    function traverse(offsets: int[]) {
      const k = offsets.length;
      const N = thisShape[k];
      if (k === dim - 1) {
        const indices = [...offsets, 0];
        const thisIndices = [
          ...offsets.map((offset, i) => thisRanges[i][0] + offset),
          thisRanges[k][0],
        ];
        const thatIndices = [
          ...offsets.map((offset, i) => thatRanges[i][0] + offset),
          thatRanges[k][0],
        ];
        fn(thisIndices, thatIndices, N, indices);
        return;
      }
      for (let i = 0; i < N; ++i) {
        traverse([...offsets, i]);
      }
    }

    traverse([]);
  }

  public copy() {
    const res = TensorView.of(this.shape);
    res.set(this);
    return res;
  }

  public toString() {
    const dim = this.dim;
    const ranges = this.ranges;
    const tensor = this.tensor;

    function toString(indices: int[]): string {
      const k = indices.length;
      const [start, end] = ranges[k];

      if (k === dim - 1) {
        let s = " ".repeat(k) + "[";
        for (let i = start; i < end; ++i) {
          if (i > start) s += ", ";
          s += tensor.get([...indices, i]);
        }
        s += "]";
        return s;
      }

      let s = " ".repeat(k) + "[\n";
      for (let i = start; i < end; ++i) {
        if (i > start) s += ",\n";
        s += toString([...indices, i]);
      }
      s += "\n";
      s += " ".repeat(k) + "]";
      return s;
    }

    return toString([]);
  }
}

export class Scalar {
  public static from(value: float) {
    return new Scalar(value);
  }
  private constructor(public value: float) {}
  public add(view: TensorView) {
    return this.cast(view).add(view);
  }
  public sub(view: TensorView) {
    return this.cast(view).sub(view);
  }
  public mul(view: TensorView) {
    return this.cast(view).mul(view);
  }
  public div(view: TensorView) {
    return this.cast(view).div(view);
  }
  private cast(view: TensorView) {
    return TensorView.of(view.shape, this.value);
  }
}
