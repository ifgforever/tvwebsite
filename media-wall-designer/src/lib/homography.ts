/**
 * Perspective mapping for the photo overlay.
 *
 * Given the four wall corners the user marked on the photo, solve the
 * homography that maps the flat design rectangle onto that quad, and express it
 * as a CSS matrix3d so the browser composites the vector wall onto the room in
 * correct perspective. Visual only — no measurement is ever taken from it.
 */
export type Matrix3 = number[]; // row-major 3×3

export type Point = [number, number];

/** Solve H mapping (0,0)-(w,0)-(w,h)-(0,h) → the four destination points. */
export function homographyFromRect(w: number, h: number, dst: [Point, Point, Point, Point]): Matrix3 | null {
  const src: [Point, Point, Point, Point] = [[0, 0], [w, 0], [w, h], [0, h]];
  const a: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const solved = solve(a, b);
  if (!solved) return null;
  return [...solved, 1];
}

/** Gaussian elimination with partial pivoting. */
function solve(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    if (Math.abs(m[pivot][col]) < 1e-10) return null;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = m[r][col] / m[col][col];
      for (let c = col; c <= n; c++) m[r][c] -= f * m[col][c];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

/** CSS `matrix3d` is column-major 4×4; a 2-D homography drops into rows/cols 1,2,4. */
export function toMatrix3d(h: Matrix3): string {
  const [a, b, c, d, e, f, g, i] = h;
  const m = [
    a, d, 0, g,
    b, e, 0, i,
    0, 0, 1, 0,
    c, f, 0, 1,
  ];
  return `matrix3d(${m.map((n) => (Math.abs(n) < 1e-8 ? 0 : Number(n.toFixed(8)))).join(',')})`;
}

export function quadIsSane(pts: Point[]): boolean {
  if (pts.length !== 4) return false;
  const area = Math.abs(
    pts.reduce((sum, [x, y], i) => {
      const [nx, ny] = pts[(i + 1) % 4];
      return sum + (x * ny - nx * y);
    }, 0) / 2,
  );
  return area > 400;
}
