import {
  ExprNode,
  add,
  div,
  evaluate,
  isConstant,
  makeRational,
  mul,
  neg,
  num,
  pow,
  simplify,
  toExactFraction,
  vari,
} from './ast';

export type Poly = number[]; // index i = coefficient of x^i

export function trimPoly(p: Poly): Poly {
  const res = [...p];
  while (res.length > 0 && Math.abs(res[res.length - 1]) < 1e-10) {
    res.pop();
  }
  return res.length === 0 ? [0] : res;
}

export function polyDegree(p: Poly): number {
  const t = trimPoly(p);
  if (t.length === 1 && Math.abs(t[0]) < 1e-10) return -1;
  return t.length - 1;
}

export function polyAdd(a: Poly, b: Poly): Poly {
  const len = Math.max(a.length, b.length);
  const res = new Array(len).fill(0);
  for (let i = 0; i < len; i++) {
    res[i] = (a[i] ?? 0) + (b[i] ?? 0);
  }
  return trimPoly(res);
}

export function polySub(a: Poly, b: Poly): Poly {
  const len = Math.max(a.length, b.length);
  const res = new Array(len).fill(0);
  for (let i = 0; i < len; i++) {
    res[i] = (a[i] ?? 0) - (b[i] ?? 0);
  }
  return trimPoly(res);
}

export function polyMul(a: Poly, b: Poly): Poly {
  const res = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      res[i + j] += a[i] * b[j];
    }
  }
  return trimPoly(res);
}

export function polyPow(a: Poly, n: number): Poly {
  if (n === 0) return [1];
  let res: Poly = [1];
  for (let i = 0; i < n; i++) {
    res = polyMul(res, a);
  }
  return res;
}

export function polyEval(p: Poly, x: number): number {
  let acc = 0;
  for (let i = p.length - 1; i >= 0; i--) {
    acc = acc * x + p[i];
  }
  return acc;
}

export function polyDiv(numP: Poly, denP: Poly): { quotient: Poly; remainder: Poly } {
  let rem = trimPoly(numP);
  const d = trimPoly(denP);
  const dDeg = polyDegree(d);
  if (dDeg < 0) throw new Error('Division by zero polynomial');

  const nDeg = polyDegree(rem);
  if (nDeg < dDeg) {
    return { quotient: [0], remainder: rem };
  }

  const quot = new Array(nDeg - dDeg + 1).fill(0);
  const leadD = d[dDeg];

  for (let k = nDeg - dDeg; k >= 0; k--) {
    const currDeg = k + dDeg;
    const coeff = (rem[currDeg] ?? 0) / leadD;
    quot[k] = coeff;
    for (let j = 0; j <= dDeg; j++) {
      rem[k + j] = (rem[k + j] ?? 0) - coeff * d[j];
    }
  }
  return { quotient: trimPoly(quot), remainder: trimPoly(rem) };
}

export function extractPolynomial(node: ExprNode, v = 'x'): Poly | null {
  if (isConstant(node, v)) {
    const val = evaluate(node, {});
    if (!Number.isFinite(val)) return null;
    return [val];
  }
  switch (node.type) {
    case 'var':
      return node.name === v ? [0, 1] : null;
    case 'neg': {
      const inner = extractPolynomial(node.arg, v);
      return inner ? inner.map((c) => -c) : null;
    }
    case 'add': {
      let acc: Poly = [0];
      for (const a of node.args) {
        const p = extractPolynomial(a, v);
        if (!p) return null;
        acc = polyAdd(acc, p);
      }
      return acc;
    }
    case 'mul': {
      let acc: Poly = [1];
      for (const a of node.args) {
        const p = extractPolynomial(a, v);
        if (!p) return null;
        acc = polyMul(acc, p);
      }
      return acc;
    }
    case 'div': {
      if (!isConstant(node.den, v)) return null;
      const d = evaluate(node.den, {});
      if (!Number.isFinite(d) || Math.abs(d) < 1e-12) return null;
      const p = extractPolynomial(node.num, v);
      return p ? p.map((c) => c / d) : null;
    }
    case 'pow': {
      if (!isConstant(node.exp, v)) return null;
      const eVal = evaluate(node.exp, {});
      if (!Number.isInteger(eVal) || eVal < 0 || eVal > 10) return null;
      const baseP = extractPolynomial(node.base, v);
      if (!baseP) return null;
      return polyPow(baseP, eVal);
    }
    default:
      return null;
  }
}

export function polyToExpr(p: Poly, v = 'x'): ExprNode {
  const t = trimPoly(p);
  const terms: ExprNode[] = [];
  for (let deg = t.length - 1; deg >= 0; deg--) {
    const c = t[deg];
    if (Math.abs(c) < 1e-10) continue;
    const frac = toExactFraction(c);
    const cNode = frac ? makeRational(frac.n, frac.d) : num(c);
    if (deg === 0) {
      terms.push(cNode);
    } else if (deg === 1) {
      terms.push(Math.abs(c - 1) < 1e-10 ? vari(v) : Math.abs(c + 1) < 1e-10 ? neg(vari(v)) : mul(cNode, vari(v)));
    } else {
      const xp = pow(vari(v), num(deg));
      terms.push(Math.abs(c - 1) < 1e-10 ? xp : Math.abs(c + 1) < 1e-10 ? neg(xp) : mul(cNode, xp));
    }
  }
  if (terms.length === 0) return num(0);
  if (terms.length === 1) return simplify(terms[0]);
  return simplify(add(...terms));
}

export interface LinearFactor {
  kind: 'linear';
  root: number; // factor is (x - root)
  multiplicity: number;
}

export interface QuadFactor {
  kind: 'quad';
  // factor is (x^2 + p x + q) with p^2 - 4q < 0
  p: number;
  q: number;
  multiplicity: number;
}

export type PolyFactor = LinearFactor | QuadFactor;

export interface FactorizedPoly {
  leadCoeff: number;
  factors: PolyFactor[];
}

function findRationalRoot(p: Poly): number | null {
  const deg = polyDegree(p);
  if (deg <= 0) return null;
  // Scale to integer coeffs if possible
  let scale = 1;
  for (const c of p) {
    const f = toExactFraction(c);
    if (!f) return null;
    scale = (scale * f.d) / gcdLocal(scale, f.d);
  }
  const intCoeffs = p.map((c) => Math.round(c * scale));
  if (intCoeffs[0] === 0) return 0;

  const a0 = Math.abs(intCoeffs[0]);
  const an = Math.abs(intCoeffs[deg]);
  const divs = (n: number) => {
    const out: number[] = [];
    for (let i = 1; i * i <= n; i++) {
      if (n % i === 0) {
        out.push(i);
        if (i * i !== n) out.push(n / i);
      }
    }
    return out;
  };
  const pDivs = divs(a0);
  const qDivs = divs(an);
  for (const numD of pDivs) {
    for (const denD of qDivs) {
      for (const sgn of [1, -1]) {
        const cand = (sgn * numD) / denD;
        if (Math.abs(polyEval(p, cand)) < 1e-8) {
          return cand;
        }
      }
    }
  }
  return null;
}

function gcdLocal(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function factorPolynomial(poly: Poly): FactorizedPoly | null {
  let p = trimPoly(poly);
  const deg = polyDegree(p);
  if (deg <= 0) return null;

  const leadCoeff = p[deg];
  // Normalize monic
  p = p.map((c) => c / leadCoeff);

  const linearRoots: number[] = [];
  const quads: { p: number; q: number }[] = [];

  while (polyDegree(p) > 2) {
    const root = findRationalRoot(p);
    if (root !== null) {
      linearRoots.push(root);
      p = polyDiv(p, [-root, 1]).quotient;
      continue;
    }
    // Check biquadratic: x^4 + b x^2 + c
    if (polyDegree(p) === 4 && Math.abs(p[1]) < 1e-9 && Math.abs(p[3]) < 1e-9) {
      const b = p[2];
      const c = p[0];
      const disc = b * b - 4 * c;
      if (disc >= -1e-9) {
        const r1 = (-b + Math.sqrt(Math.max(0, disc))) / 2;
        const r2 = (-b - Math.sqrt(Math.max(0, disc))) / 2;
        if (r1 >= 0) {
          linearRoots.push(Math.sqrt(r1), -Math.sqrt(r1));
        } else {
          quads.push({ p: 0, q: -r1 });
        }
        if (r2 >= 0) {
          linearRoots.push(Math.sqrt(r2), -Math.sqrt(r2));
        } else {
          quads.push({ p: 0, q: -r2 });
        }
        p = [1];
        break;
      }
      // x^4 + c = (x^2 - sqrt(2c)x + sqrt(c))(x^2 + sqrt(2c)x + sqrt(c)) for c > 0
      if (Math.abs(b) < 1e-9 && c > 0) {
        const sc = Math.sqrt(c);
        const k = Math.sqrt(2 * sc);
        quads.push({ p: -k, q: sc }, { p: k, q: sc });
        p = [1];
        break;
      }
    }
    return null;
  }

  if (polyDegree(p) === 2) {
    const b = p[1];
    const c = p[0];
    const disc = b * b - 4 * c;
    if (disc >= -1e-9) {
      const sd = Math.sqrt(Math.max(0, disc));
      const r1 = (-b + sd) / 2;
      const r2 = (-b - sd) / 2;
      linearRoots.push(r1, r2);
    } else {
      quads.push({ p: b, q: c });
    }
  } else if (polyDegree(p) === 1) {
    linearRoots.push(-p[0]);
  }

  const factors: PolyFactor[] = [];
  for (const r of linearRoots) {
    const existing = factors.find((f) => f.kind === 'linear' && Math.abs(f.root - r) < 1e-7) as
      | LinearFactor
      | undefined;
    if (existing) {
      existing.multiplicity++;
    } else {
      factors.push({ kind: 'linear', root: Math.abs(r) < 1e-10 ? 0 : r, multiplicity: 1 });
    }
  }
  for (const qd of quads) {
    const existing = factors.find(
      (f) => f.kind === 'quad' && Math.abs(f.p - qd.p) < 1e-7 && Math.abs(f.q - qd.q) < 1e-7
    ) as QuadFactor | undefined;
    if (existing) {
      existing.multiplicity++;
    } else {
      factors.push({ kind: 'quad', p: qd.p, q: qd.q, multiplicity: 1 });
    }
  }

  return { leadCoeff, factors };
}

export function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) {
        pivot = row;
      }
    }
    if (Math.abs(M[pivot][col]) < 1e-11) return null;
    [M[col], M[pivot]] = [M[pivot], M[col]];

    const divVal = M[col][col];
    for (let j = col; j <= n; j++) M[col][j] /= divVal;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col];
      for (let j = col; j <= n; j++) {
        M[row][j] -= factor * M[col][j];
      }
    }
  }

  return M.map((row) => (Math.abs(row[n]) < 1e-11 ? 0 : row[n]));
}
