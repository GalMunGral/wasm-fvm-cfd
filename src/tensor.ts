function idx(i: int, N: int) {
  if (i < 0) i += N;
  if (i < 0 || i > N) {
    throw "Out of range";
  }
  return i;
}

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
    for (let i = 0; i < values.length; ++i) {
      this.data[idx + i] = values[i];
    }
  }
}

export class TensorView {
  public static of(shape: int[], initialValue: float) {
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

  public slice(...indices: (int | [int] | [int, int])[]): TensorView {
    if (indices.length > this.dim) {
      throw `Dimension mismatch: ${indices.length} > ${this.dim}`;
    }
    const ranges: [int, int][] = [];
    for (let i = 0; i < this.dim; ++i) {
      const [start, end] = this.ranges[i];
      const N = end - start;
      if (i < indices.length) {
        const I = indices[i];
        if (typeof I == "number") {
          ranges.push([start + idx(I, N), start + idx(I + 1, N)]);
        } else if (I.length === 2) {
          ranges.push([start + idx(I[0], N), start + idx(I[1], N)]);
        } else {
          ranges.push([start + idx(I[0], N), end]);
        }
      } else {
        ranges.push([start, end]);
      }
    }
    console.log(ranges);
    return new TensorView(this.tensor, ranges);
  }

  public set(value: float | TensorView) {
    if (typeof value === "number") {
      this.fill(value);
    } else {
      this.copy(value);
    }
  }

  private fill(value: float) {
    const dim = this.dim;
    const ranges = this.ranges;
    const tensor = this.tensor;
    function traverse(indices: int[]) {
      const k = indices.length;
      const [start, end] = ranges[k];
      if (k === dim - 1) {
        tensor.set(
          [...indices, start],
          new Float32Array(end - start).fill(value)
        );
        return;
      }
      for (let i = start; i < end; ++i) {
        traverse([...indices, i]);
      }
    }
    traverse([]);
  }

  private copy(that: TensorView) {
    if (that.dim !== this.dim) {
      throw `Dimension mismatch: ${that.dim} != ${this.dim}`;
    }

    const dim = this.dim;
    const dstRanges = this.ranges;
    const srcRanges = that.ranges;
    const dstShape = this.shape;
    const srcShape = that.shape;

    for (let i = 0; i < dim; ++i) {
      if (srcShape[i] !== dstShape[i]) {
        throw `Dimension mismatch (${i})`;
      }
    }

    const srcTensor = that.tensor;
    const dstTensor = this.tensor;

    function traverse(offsets: int[]) {
      const k = offsets.length;
      const N = dstShape[k];
      if (k === dim - 1) {
        const values = srcTensor.get(
          [
            ...offsets.map((offset, i) => srcRanges[i][0] + offset),
            srcRanges[k][0],
          ],
          N
        );
        dstTensor.set(
          [
            ...offsets.map((offset, i) => dstRanges[i][0] + offset),
            dstRanges[k][0],
          ],
          values
        );
        return;
      }
      for (let i = 0; i < N; ++i) {
        traverse([...offsets, i]);
      }
    }

    traverse([]);
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
