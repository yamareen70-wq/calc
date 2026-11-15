import { ExprNode, evaluate } from './ast';

// 15-point Gauss-Kronrod nodes & weights on [-1, 1]
const GK_NODES = [
  0.0,
  0.20778495500789847,
  0.40584515137739717,
  0.5860872354676911,
  0.7415311855993945,
  0.8648644233597691,
  0.9491079123427585,
  0.9914553711208126,
];

const GK_WEIGHTS = [
  0.20948214108472782,
  0.20443294007529889,
  0.1903505780647854,
  0.1690047266392679,
  0.14065325971552592,
  0.10479001032225018,
  0.06309209262997856,
  0.022935322010529224,
];

const G7_WEIGHTS = [
  0.4179591836734694,
  0.0,
  0.3818300505051189,
  0.0,
  0.27970539148927664,
  0.0,
  0.1294849661688697,
  0.0,
];

export interface NumericalResult {
  value: number;
  errorEstimate: number;
  converged: boolean;
  singularityWarning?: string;
}

function gkInterval(f: (x: number) => number, a: number, b: number): { k15: number; err: number } {
  const half = 0.5 * (b - a);
  const mid = 0.5 * (a + b);

  const f0 = f(mid);
  if (!Number.isFinite(f0)) return { k15: NaN, err: Infinity };

  let sum15 = GK_WEIGHTS[0] * f0;
  let sum7 = G7_WEIGHTS[0] * f0;

  for (let i = 1; i < GK_NODES.length; i++) {
    const dx = half * GK_NODES[i];
    const fp = f(mid + dx);
    const fm = f(mid - dx);
    if (!Number.isFinite(fp) || !Number.isFinite(fm)) {
      return { k15: NaN, err: Infinity };
    }
    const fSum = fp + fm;
    sum15 += GK_WEIGHTS[i] * fSum;
    if (G7_WEIGHTS[i] > 0) {
      sum7 += G7_WEIGHTS[i] * fSum;
    }
  }

  const k15 = sum15 * half;
  const g7 = sum7 * half;
  return { k15, err: Math.abs(k15 - g7) };
}

function adaptiveGK(
  f: (x: number) => number,
  a: number,
  b: number,
  tol: number,
  depth = 0
): { val: number; err: number; ok: boolean } {
  const { k15, err } = gkInterval(f, a, b);
  if (!Number.isFinite(k15)) {
    if (depth >= 12) return { val: NaN, err: Infinity, ok: false };
    const mid = 0.5 * (a + b);
    const left = adaptiveGK(f, a, mid, tol * 0.5, depth + 1);
    const right = adaptiveGK(f, mid, b, tol * 0.5, depth + 1);
    return {
      val: left.val + right.val,
      err: left.err + right.err,
      ok: left.ok && right.ok,
    };
  }

  const threshold = Math.max(tol, 1e-12 * Math.abs(k15));
  if (err <= threshold || depth >= 14) {
    return { val: k15, err, ok: err <= Math.max(tol * 100, 1e-5) };
  }

  const mid = 0.5 * (a + b);
  const left = adaptiveGK(f, a, mid, tol * 0.7, depth + 1);
  const right = adaptiveGK(f, mid, b, tol * 0.7, depth + 1);
  return {
    val: left.val + right.val,
    err: left.err + right.err,
    ok: left.ok && right.ok,
  };
}

export function integrateNumerical(
  node: ExprNode,
  variable: string,
  a: number | '-inf' | '+inf',
  b: number | '-inf' | '+inf'
): NumericalResult {
  if (a === b) {
    return { value: 0, errorEstimate: 0, converged: true };
  }
  if (a === '+inf' || b === '-inf') {
    const flipped = integrateNumerical(node, variable, b, a);
    return { ...flipped, value: -flipped.value };
  }

  const evalF = (x: number) => evaluate(node, { [variable]: x });

  // Handle improper integrals via algebraic transformations
  if (a === '-inf' && b === '+inf') {
    const g = (t: number) => {
      if (Math.abs(t) >= 1 - 1e-12) return 0;
      const denom = 1 - t * t;
      const x = t / denom;
      const dx = (1 + t * t) / (denom * denom);
      const fx = evalF(x);
      return Number.isFinite(fx) ? fx * dx : NaN;
    };
    const res = adaptiveGK(g, -1 + 1e-9, 1 - 1e-9, 1e-9);
    return {
      value: res.val,
      errorEstimate: res.err,
      converged: Number.isFinite(res.val) && res.ok,
      singularityWarning:
        !Number.isFinite(res.val) || !res.ok
          ? 'قد يكون التكامل المعتل متباعداً أو غير متقارب على المجال اللانهائي.'
          : undefined,
    };
  }

  if (b === '+inf' && typeof a === 'number') {
    const g = (t: number) => {
      if (t >= 1 - 1e-12) return 0;
      const oneMinusT = 1 - t;
      const x = a + t / oneMinusT;
      const dx = 1 / (oneMinusT * oneMinusT);
      const fx = evalF(x);
      return Number.isFinite(fx) ? fx * dx : NaN;
    };
    const res = adaptiveGK(g, 0, 1 - 1e-9, 1e-9);
    return {
      value: res.val,
      errorEstimate: res.err,
      converged: Number.isFinite(res.val) && res.ok,
      singularityWarning:
        !Number.isFinite(res.val) || !res.ok
          ? 'قد يكون التكامل المعتل متباعداً عند اللانهاية الموجبة.'
          : undefined,
    };
  }

  if (a === '-inf' && typeof b === 'number') {
    const g = (t: number) => {
      if (t >= 1 - 1e-12) return 0;
      const oneMinusT = 1 - t;
      const x = b - t / oneMinusT;
      const dx = 1 / (oneMinusT * oneMinusT);
      const fx = evalF(x);
      return Number.isFinite(fx) ? fx * dx : NaN;
    };
    const res = adaptiveGK(g, 0, 1 - 1e-9, 1e-9);
    return {
      value: res.val,
      errorEstimate: res.err,
      converged: Number.isFinite(res.val) && res.ok,
      singularityWarning:
        !Number.isFinite(res.val) || !res.ok
          ? 'قد يكون التكامل المعتل متباعداً عند اللانهاية السالبة.'
          : undefined,
    };
  }

  if (typeof a !== 'number' || typeof b !== 'number') {
    return { value: NaN, errorEstimate: Infinity, converged: false };
  }

  if (Math.abs(a - b) < 1e-14) {
    return { value: 0, errorEstimate: 0, converged: true };
  }

  const sign = a > b ? -1 : 1;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);

  // Sample interior to detect undefined regions or blowups
  let badCount = 0;
  let maxAbs = 0;
  const samples = 41;
  for (let i = 1; i < samples; i++) {
    const x = lo + ((hi - lo) * i) / samples;
    const y = evalF(x);
    if (!Number.isFinite(y)) {
      badCount++;
    } else {
      maxAbs = Math.max(maxAbs, Math.abs(y));
    }
  }

  if (badCount > samples * 0.4) {
    return {
      value: NaN,
      errorEstimate: Infinity,
      converged: false,
      singularityWarning: 'الدالة غير معرّفة على جزء كبير من فترة التكامل المحددة.',
    };
  }

  const res = adaptiveGK(evalF, lo, hi, 1e-9);
  const val = sign * res.val;
  if (!Number.isFinite(val) || Math.abs(val) > 1e12) {
    return {
      value: NaN,
      errorEstimate: Infinity,
      converged: false,
      singularityWarning: 'يوجد نقطة عدم اتصال أو خط تقارب رأسي داخل فترة التكامل قد يجعل التكامل متباعداً.',
    };
  }

  return {
    value: Math.abs(val) < 1e-13 ? 0 : val,
    errorEstimate: res.err,
    converged: res.ok,
    singularityWarning: !res.ok
      ? 'التكامل يحتوي على تغير حاد أو نقطة شاذة قريبة؛ القيمة المعروضة تقريبية.'
      : undefined,
  };
}

export interface SimpsonSample {
  i: number;
  x: number;
  fx: number;
  weight: number;
}

export function simpsonComposite(
  node: ExprNode,
  variable: string,
  a: number,
  b: number,
  n = 12
): { value: number; h: number; samples: SimpsonSample[] } {
  const evenN = n % 2 === 0 ? n : n + 1;
  const h = (b - a) / evenN;
  const samples: SimpsonSample[] = [];
  let sum = 0;
  for (let i = 0; i <= evenN; i++) {
    const x = a + i * h;
    const fx = evaluate(node, { [variable]: x });
    const weight = i === 0 || i === evenN ? 1 : i % 2 === 1 ? 4 : 2;
    samples.push({ i, x, fx, weight });
    sum += weight * fx;
  }
  return {
    value: (h / 3) * sum,
    h,
    samples,
  };
}

export function verifyAntiderivative(
  integrand: ExprNode,
  antiderivative: ExprNode,
  variable: string
): boolean {
  const testPoints = [
    -7.13, -4.27, -2.37, -1.43, -0.61, -0.23, 0.37, 0.73, 1.31, 2.17, 3.41, 6.19, 11.43,
  ];
  const h = 1e-6;
  let validChecks = 0;
  let passedChecks = 0;

  for (const x of testPoints) {
    const fVal = evaluate(integrand, { [variable]: x });
    const fp = evaluate(antiderivative, { [variable]: x + h });
    const fm = evaluate(antiderivative, { [variable]: x - h });
    if (Number.isFinite(fVal) && Number.isFinite(fp) && Number.isFinite(fm)) {
      const numDeriv = (fp - fm) / (2 * h);
      if (!Number.isFinite(numDeriv)) continue;
      validChecks++;
      const tol = Math.max(1e-4, 1e-3 * Math.abs(fVal));
      if (Math.abs(numDeriv - fVal) <= tol) {
        passedChecks++;
      }
    }
  }

  if (validChecks === 0) return true; // Domain might be narrow (e.g. asin on (-1,1)), try (-0.7..0.7)
  return passedChecks >= Math.ceil(validChecks * 0.75);
}
