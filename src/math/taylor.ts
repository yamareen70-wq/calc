import { ExprNode, evaluate, toExactFraction } from './ast';

type Jet = number[]; // [c0, c1, ..., cN] representing sum c_k h^k

function jetConst(c: number, n: number): Jet {
  const j = new Array(n + 1).fill(0);
  j[0] = c;
  return j;
}

function jetAdd(a: Jet, b: Jet): Jet {
  return a.map((v, i) => v + b[i]);
}

function jetSub(a: Jet, b: Jet): Jet {
  return a.map((v, i) => v - b[i]);
}

function jetNeg(a: Jet): Jet {
  return a.map((v) => -v);
}

function jetMul(a: Jet, b: Jet): Jet {
  const n = a.length - 1;
  const res = new Array(n + 1).fill(0);
  for (let i = 0; i <= n; i++) {
    for (let j = 0; i + j <= n; j++) {
      res[i + j] += a[i] * b[j];
    }
  }
  return res;
}

function jetDiv(a: Jet, b: Jet): Jet {
  const n = a.length - 1;
  if (Math.abs(b[0]) < 1e-13) return new Array(n + 1).fill(NaN);
  const res = new Array(n + 1).fill(0);
  for (let k = 0; k <= n; k++) {
    let s = a[k];
    for (let j = 1; j <= k; j++) {
      s -= b[j] * res[k - j];
    }
    res[k] = s / b[0];
  }
  return res;
}

function jetExp(u: Jet): Jet {
  const n = u.length - 1;
  const res = new Array(n + 1).fill(0);
  res[0] = Math.exp(u[0]);
  if (!Number.isFinite(res[0])) return new Array(n + 1).fill(NaN);
  for (let k = 1; k <= n; k++) {
    let s = 0;
    for (let j = 1; j <= k; j++) {
      s += j * u[j] * res[k - j];
    }
    res[k] = s / k;
  }
  return res;
}

function jetLn(u: Jet): Jet {
  const n = u.length - 1;
  if (u[0] <= 1e-13) return new Array(n + 1).fill(NaN);
  const res = new Array(n + 1).fill(0);
  res[0] = Math.log(u[0]);
  for (let k = 1; k <= n; k++) {
    let s = k * u[k];
    for (let j = 1; j < k; j++) {
      s -= j * res[j] * u[k - j];
    }
    res[k] = s / (k * u[0]);
  }
  return res;
}

function jetSinCos(u: Jet): { sin: Jet; cos: Jet } {
  const n = u.length - 1;
  const s = new Array(n + 1).fill(0);
  const c = new Array(n + 1).fill(0);
  s[0] = Math.sin(u[0]);
  c[0] = Math.cos(u[0]);
  for (let k = 1; k <= n; k++) {
    let ss = 0;
    let cc = 0;
    for (let j = 1; j <= k; j++) {
      ss += j * u[j] * c[k - j];
      cc -= j * u[j] * s[k - j];
    }
    s[k] = ss / k;
    c[k] = cc / k;
  }
  return { sin: s, cos: c };
}

function jetSinhCosh(u: Jet): { sinh: Jet; cosh: Jet } {
  const n = u.length - 1;
  const sh = new Array(n + 1).fill(0);
  const ch = new Array(n + 1).fill(0);
  sh[0] = Math.sinh(u[0]);
  ch[0] = Math.cosh(u[0]);
  for (let k = 1; k <= n; k++) {
    let ssh = 0;
    let cch = 0;
    for (let j = 1; j <= k; j++) {
      ssh += j * u[j] * ch[k - j];
      cch += j * u[j] * sh[k - j];
    }
    sh[k] = ssh / k;
    ch[k] = cch / k;
  }
  return { sinh: sh, cosh: ch };
}

function jetPowConst(u: Jet, alpha: number): Jet {
  const n = u.length - 1;
  if (Number.isInteger(alpha) && alpha >= 0 && alpha <= 12) {
    let acc = jetConst(1, n);
    for (let i = 0; i < alpha; i++) acc = jetMul(acc, u);
    return acc;
  }
  if (u[0] <= 1e-13) {
    // Handle u(x0) < 0 with integer negative power
    if (Number.isInteger(alpha) && alpha < 0 && Math.abs(u[0]) > 1e-13) {
      let pos = jetConst(1, n);
      for (let i = 0; i < -alpha; i++) pos = jetMul(pos, u);
      return jetDiv(jetConst(1, n), pos);
    }
    return new Array(n + 1).fill(NaN);
  }
  // u^alpha = exp(alpha * ln(u))
  return jetExp(jetLn(u).map((v) => v * alpha));
}

function jetPow(base: Jet, exp: Jet): Jet {
  const isConstExp = exp.slice(1).every((c) => Math.abs(c) < 1e-13);
  if (isConstExp) {
    return jetPowConst(base, exp[0]);
  }
  return jetExp(jetMul(exp, jetLn(base)));
}

function jetDeriv(u: Jet): Jet {
  const n = u.length - 1;
  const d = new Array(n + 1).fill(0);
  for (let k = 0; k < n; k++) {
    d[k] = (k + 1) * u[k + 1];
  }
  return d;
}

function jetIntegrate(u: Jet, c0 = 0): Jet {
  const n = u.length - 1;
  const out = new Array(n + 1).fill(0);
  out[0] = c0;
  for (let k = 1; k <= n; k++) {
    out[k] = u[k - 1] / k;
  }
  return out;
}

export function evalJet(node: ExprNode, variable: string, x0: number, order: number): Jet {
  const nanJet = () => new Array(order + 1).fill(NaN);
  switch (node.type) {
    case 'num':
      return jetConst(node.value, order);
    case 'const':
      return jetConst(node.name === 'pi' ? Math.PI : Math.E, order);
    case 'var': {
      if (node.name !== variable) return nanJet();
      const j = jetConst(x0, order);
      if (order >= 1) j[1] = 1;
      return j;
    }
    case 'neg':
      return jetNeg(evalJet(node.arg, variable, x0, order));
    case 'add': {
      let acc = jetConst(0, order);
      for (const a of node.args) {
        acc = jetAdd(acc, evalJet(a, variable, x0, order));
      }
      return acc;
    }
    case 'mul': {
      let acc = jetConst(1, order);
      for (const a of node.args) {
        acc = jetMul(acc, evalJet(a, variable, x0, order));
      }
      return acc;
    }
    case 'div':
      return jetDiv(
        evalJet(node.num, variable, x0, order),
        evalJet(node.den, variable, x0, order)
      );
    case 'pow':
      return jetPow(
        evalJet(node.base, variable, x0, order),
        evalJet(node.exp, variable, x0, order)
      );
    case 'fn': {
      const u = evalJet(node.arg, variable, x0, order);
      if (u.some((v) => !Number.isFinite(v))) return nanJet();
      switch (node.name) {
        case 'exp':
          return jetExp(u);
        case 'ln':
          return jetLn(u);
        case 'log10':
          return jetLn(u).map((v) => v / Math.LN10);
        case 'log2':
          return jetLn(u).map((v) => v / Math.LN2);
        case 'sqrt':
          return jetPowConst(u, 0.5);
        case 'cbrt':
          if (u[0] <= 0) return nanJet();
          return jetPowConst(u, 1 / 3);
        case 'abs':
          if (Math.abs(u[0]) < 1e-12) return nanJet();
          return u[0] >= 0 ? u : jetNeg(u);
        case 'floor':
          if (Math.abs(u[0] - Math.round(u[0])) < 1e-9) return nanJet();
          return jetConst(Math.floor(u[0]), order);
        case 'ceil':
          if (Math.abs(u[0] - Math.round(u[0])) < 1e-9) return nanJet();
          return jetConst(Math.ceil(u[0]), order);
        case 'round':
          return jetConst(Math.round(u[0]), order);
        case 'sgn':
          if (Math.abs(u[0]) < 1e-9) return nanJet();
          return jetConst(u[0] > 0 ? 1 : -1, order);
        case 'sin':
          return jetSinCos(u).sin;
        case 'cos':
          return jetSinCos(u).cos;
        case 'tan': {
          const { sin, cos } = jetSinCos(u);
          return jetDiv(sin, cos);
        }
        case 'sec':
          return jetDiv(jetConst(1, order), jetSinCos(u).cos);
        case 'csc':
          return jetDiv(jetConst(1, order), jetSinCos(u).sin);
        case 'cot': {
          const { sin, cos } = jetSinCos(u);
          return jetDiv(cos, sin);
        }
        case 'sinh':
          return jetSinhCosh(u).sinh;
        case 'cosh':
          return jetSinhCosh(u).cosh;
        case 'tanh': {
          const { sinh, cosh } = jetSinhCosh(u);
          return jetDiv(sinh, cosh);
        }
        case 'sech':
          return jetDiv(jetConst(1, order), jetSinhCosh(u).cosh);
        case 'csch':
          return jetDiv(jetConst(1, order), jetSinhCosh(u).sinh);
        case 'coth': {
          const { sinh, cosh } = jetSinhCosh(u);
          return jetDiv(cosh, sinh);
        }
        case 'atan': {
          const uExt = evalJet(node.arg, variable, x0, order + 1);
          const duExt = jetDeriv(uExt);
          const denomExt = jetAdd(jetConst(1, order + 1), jetMul(uExt, uExt));
          const integ = jetIntegrate(jetDiv(duExt, denomExt), Math.atan(u[0]));
          return integ.slice(0, order + 1);
        }
        case 'asin': {
          if (Math.abs(u[0]) >= 1 - 1e-9) return nanJet();
          const uExt = evalJet(node.arg, variable, x0, order + 1);
          const duExt = jetDeriv(uExt);
          const denomExt = jetPowConst(jetSub(jetConst(1, order + 1), jetMul(uExt, uExt)), 0.5);
          const integ = jetIntegrate(jetDiv(duExt, denomExt), Math.asin(u[0]));
          return integ.slice(0, order + 1);
        }
        case 'acos': {
          if (Math.abs(u[0]) >= 1 - 1e-9) return nanJet();
          const uExt = evalJet(node.arg, variable, x0, order + 1);
          const duExt = jetDeriv(uExt);
          const denomExt = jetPowConst(jetSub(jetConst(1, order + 1), jetMul(uExt, uExt)), 0.5);
          const integ = jetIntegrate(jetNeg(jetDiv(duExt, denomExt)), Math.acos(u[0]));
          return integ.slice(0, order + 1);
        }
        case 'asinh': {
          const uExt = evalJet(node.arg, variable, x0, order + 1);
          const duExt = jetDeriv(uExt);
          const denomExt = jetPowConst(jetAdd(jetMul(uExt, uExt), jetConst(1, order + 1)), 0.5);
          const integ = jetIntegrate(jetDiv(duExt, denomExt), Math.asinh(u[0]));
          return integ.slice(0, order + 1);
        }
        case 'acosh': {
          if (u[0] <= 1 + 1e-9) return nanJet();
          const uExt = evalJet(node.arg, variable, x0, order + 1);
          const duExt = jetDeriv(uExt);
          const denomExt = jetPowConst(jetSub(jetMul(uExt, uExt), jetConst(1, order + 1)), 0.5);
          const integ = jetIntegrate(jetDiv(duExt, denomExt), Math.acosh(u[0]));
          return integ.slice(0, order + 1);
        }
        case 'atanh': {
          if (Math.abs(u[0]) >= 1 - 1e-9) return nanJet();
          const uExt = evalJet(node.arg, variable, x0, order + 1);
          const duExt = jetDeriv(uExt);
          const denomExt = jetSub(jetConst(1, order + 1), jetMul(uExt, uExt));
          const integ = jetIntegrate(jetDiv(duExt, denomExt), Math.atanh(u[0]));
          return integ.slice(0, order + 1);
        }
        default:
          return nanJet();
      }
    }
    case 'call':
      return nanJet();
  }
}

export interface TaylorAntiderivative {
  x0: number;
  integrandCoeffs: number[];
  antiderivCoeffs: number[]; // coefficient k corresponds to (x - x0)^k
  integrandLatex: string;
  antiderivLatex: string;
}

function formatCoeffLatex(val: number): { sign: '+' | '-'; absStr: string } {
  const sign = val < 0 ? '-' : '+';
  const a = Math.abs(val);
  const frac = toExactFraction(a, 5000);
  if (frac && frac.d === 1) {
    return { sign, absStr: frac.n === 1 ? '' : String(frac.n) };
  }
  if (frac && frac.d <= 2000) {
    return { sign, absStr: `\\frac{${frac.n}}{${frac.d}}` };
  }
  return { sign, absStr: Number(a.toPrecision(5)).toString() };
}

function seriesToLatex(coeffs: number[], variable: string, x0: number, isAntideriv: boolean): string {
  const varTerm =
    Math.abs(x0) < 1e-12
      ? variable
      : x0 > 0
        ? `\\left(${variable} - ${x0}\\right)`
        : `\\left(${variable} + ${Math.abs(x0)}\\right)`;

  const parts: string[] = [];
  for (let k = 0; k < coeffs.length; k++) {
    const c = coeffs[k];
    if (Math.abs(c) < 1e-11) continue;
    const { sign, absStr } = formatCoeffLatex(c);
    let termBody = '';
    if (k === 0) {
      termBody = absStr || '1';
    } else if (k === 1) {
      termBody = `${absStr}${varTerm}`;
    } else {
      termBody = `${absStr}${varTerm}^{${k}}`;
    }
    if (parts.length === 0) {
      parts.push(sign === '-' ? `-${termBody}` : termBody);
    } else {
      parts.push(`${sign} ${termBody}`);
    }
    if (parts.length >= 6) break;
  }

  if (parts.length === 0) return isAntideriv ? 'C' : '0';
  return isAntideriv ? `${parts.join(' ')} + \\cdots + C` : `${parts.join(' ')} + \\cdots`;
}

export function computeTaylorAntiderivative(
  node: ExprNode,
  variable: string,
  order = 9
): TaylorAntiderivative | null {
  const candidates = [0, 1, 2, -1, 0.5, 1.5];
  for (const x0 of candidates) {
    const y0 = evaluate(node, { [variable]: x0 });
    if (!Number.isFinite(y0)) continue;
    const jet = evalJet(node, variable, x0, order);
    if (jet.some((v) => !Number.isFinite(v) || Math.abs(v) > 1e8)) continue;

    // Antiderivative coeffs: k -> jet[k-1] / k
    const antiCoeffs = new Array(jet.length + 1).fill(0);
    for (let k = 0; k < jet.length; k++) {
      antiCoeffs[k + 1] = jet[k] / (k + 1);
    }
    const nonZeroCount = antiCoeffs.filter((v) => Math.abs(v) > 1e-11).length;
    if (nonZeroCount === 0) continue;

    return {
      x0,
      integrandCoeffs: jet,
      antiderivCoeffs: antiCoeffs,
      integrandLatex: seriesToLatex(jet, variable, x0, false),
      antiderivLatex: seriesToLatex(antiCoeffs, variable, x0, true),
    };
  }
  return null;
}
