import {
  ExprNode,
  differentiate,
  div,
  evaluate,
  fn,
  getVariables,
  isConstant,
  mul,
  neg,
  num,
  parseExpr,
  pow,
  simplify,
  sub,
  substitute,
  toExactFraction,
  toLatex,
  vari,
} from './ast';
import { BoundValue, SolutionStep, formatNumberToLatex, parseBound } from './integrator';
import { extractPolynomial, polyDegree, polyDiv, polyEval, polyToExpr } from './polynomial';
import { evalJet } from './taylor';

export type LimitDirection = 'two-sided' | 'right' | 'left';

export interface LimitRequest {
  expression: string;
  variable?: string;
  target: string;
  direction?: LimitDirection;
}

export interface LimitResult {
  ok: boolean;
  error?: string;
  exists: boolean;
  isInfinite?: boolean;
  infinitySign?: '+inf' | '-inf';
  value?: number;
  valueLatex: string;
  leftLimitLatex?: string;
  rightLimitLatex?: string;
  variable: string;
  target: BoundValue;
  direction: LimitDirection;
  integrandText: string;
  exprLatex: string;
  limitLatex: string;
  methodLabel: string;
  steps: SolutionStep[];
  warnings: string[];
}

type SideProbe =
  | { kind: 'finite'; value: number }
  | { kind: 'inf'; sign: '+inf' | '-inf' }
  | { kind: 'oscillating' }
  | { kind: 'undefined' };

function formatExactLimitValue(val: number): string {
  if (!Number.isFinite(val)) return '\\text{غير معرف}';
  if (Math.abs(val) < 1e-11) return '0';

  const frac = toExactFraction(val, 600);
  if (frac) {
    if (frac.d === 1) return String(frac.n);
    return frac.n < 0 ? `-\\frac{${Math.abs(frac.n)}}{${frac.d}}` : `\\frac{${frac.n}}{${frac.d}}`;
  }

  // Check multiples of pi
  const piRatio = toExactFraction(val / Math.PI, 48);
  if (piRatio && Math.abs(piRatio.n) > 0 && piRatio.d <= 24) {
    const sign = piRatio.n < 0 ? '-' : '';
    const an = Math.abs(piRatio.n);
    const numStr = an === 1 ? '\\pi' : `${an}\\pi`;
    return piRatio.d === 1 ? `${sign}${numStr}` : `${sign}\\frac{${numStr}}{${piRatio.d}}`;
  }

  // Check powers/multiples of e: c * e^k
  for (let k = -4; k <= 6; k++) {
    if (k === 0) continue;
    const ratio = val / Math.exp(k);
    const f = toExactFraction(ratio, 36);
    if (f && Math.abs(f.n) > 0 && f.d <= 12) {
      const sign = f.n < 0 ? '-' : '';
      const an = Math.abs(f.n);
      const eTerm = k === 1 ? 'e' : `e^{${k}}`;
      const numStr = an === 1 ? eTerm : `${an}${eTerm}`;
      return f.d === 1 ? `${sign}${numStr}` : `${sign}\\frac{${numStr}}{${f.d}}`;
    }
  }

  // Check e^(p/q) for simple rational exponents
  if (val > 0) {
    const logVal = Math.log(val);
    const expFrac = toExactFraction(logVal, 24);
    if (expFrac && Math.abs(expFrac.n) > 0 && expFrac.d > 1 && expFrac.d <= 8) {
      const expTex =
        expFrac.n < 0
          ? `-\\frac{${Math.abs(expFrac.n)}}{${expFrac.d}}`
          : `\\frac{${expFrac.n}}{${expFrac.d}}`;
      return `e^{${expTex}}`;
    }
  }

  // Check sqrt(2), sqrt(3), sqrt(5) multiples
  for (const r of [2, 3, 5, 6, 7]) {
    const ratio = val / Math.sqrt(r);
    const f = toExactFraction(ratio, 36);
    if (f && Math.abs(f.n) > 0 && f.d <= 16) {
      const sign = f.n < 0 ? '-' : '';
      const an = Math.abs(f.n);
      const radStr = an === 1 ? `\\sqrt{${r}}` : `${an}\\sqrt{${r}}`;
      return f.d === 1 ? `${sign}${radStr}` : `${sign}\\frac{${radStr}}{${f.d}}`;
    }
  }

  // Check ln(2), ln(3)
  for (const r of [2, 3, 5]) {
    const ratio = val / Math.log(r);
    const f = toExactFraction(ratio, 24);
    if (f && Math.abs(f.n) > 0 && f.d <= 12) {
      const sign = f.n < 0 ? '-' : '';
      const an = Math.abs(f.n);
      const lnStr = an === 1 ? `\\ln(${r})` : `${an}\\ln(${r})`;
      return f.d === 1 ? `${sign}${lnStr}` : `${sign}\\frac{${lnStr}}{${f.d}}`;
    }
  }

  return Number(val.toPrecision(7)).toString();
}

function probeToLatex(p: SideProbe): string {
  switch (p.kind) {
    case 'finite':
      return formatExactLimitValue(p.value);
    case 'inf':
      return p.sign === '+inf' ? '+\\infty' : '-\\infty';
    case 'oscillating':
      return '\\text{غير موجودة (تذبذب)}';
    case 'undefined':
      return '\\text{غير معرفة}';
  }
}

function probesAgree(a: SideProbe, b: SideProbe): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'finite' && b.kind === 'finite') {
    const tol = Math.max(1e-3, 1e-2 * Math.max(Math.abs(a.value), Math.abs(b.value)));
    return Math.abs(a.value - b.value) <= tol;
  }
  if (a.kind === 'inf' && b.kind === 'inf') {
    return a.sign === b.sign;
  }
  return false;
}

function probeOneSidedLimit(node: ExprNode, v: string, a: number, side: 'right' | 'left'): SideProbe {
  const sgn = side === 'right' ? 1 : -1;
  const deltas = [1e-2, 1e-3, 1e-4, 1e-5, 1e-6, 1e-7, 1e-8];
  const vals: number[] = [];

  for (const d of deltas) {
    const y = evaluate(node, { [v]: a + sgn * d });
    if (Number.isFinite(y)) {
      vals.push(y);
    }
  }

  if (vals.length === 0) {
    // Check if overflow occurred (e.g. e^(1/x) as x -> 0+)
    const bigProbe = evaluate(node, { [v]: a + sgn * 1e-2 });
    const midProbe = evaluate(node, { [v]: a + sgn * 1e-1 });
    if (Number.isFinite(midProbe) && !Number.isFinite(bigProbe) && Math.abs(midProbe) > 10) {
      return { kind: 'inf', sign: midProbe > 0 ? '+inf' : '-inf' };
    }
    return { kind: 'undefined' };
  }

  // Check dense points around 1e-4 to catch rapid oscillation like sin(1/x)
  const dense: number[] = [];
  for (const d of [1.13e-4, 1.47e-4, 1.91e-4, 2.37e-4, 3.11e-4]) {
    const y = evaluate(node, { [v]: a + sgn * d });
    if (Number.isFinite(y)) dense.push(y);
  }

  if (vals.length >= 3) {
    const last = vals[vals.length - 1];
    const prev = vals[vals.length - 2];
    const prev2 = vals[vals.length - 3];

    // Check monotonic divergence to infinity
    if (
      Math.abs(last) > 1e4 &&
      Math.abs(last) > Math.abs(prev) * 2 &&
      Math.abs(prev) > Math.abs(prev2) * 1.5 &&
      Math.sign(last) === Math.sign(prev)
    ) {
      return { kind: 'inf', sign: last > 0 ? '+inf' : '-inf' };
    }

    // Check convergence
    const diff1 = Math.abs(last - prev);
    const diff2 = Math.abs(prev - prev2);
    const scale = Math.max(1, Math.abs(last));
    if (diff1 < 1e-3 * scale && diff2 < 1e-2 * scale) {
      const denseSpread =
        dense.length >= 3 ? Math.max(...dense) - Math.min(...dense) : 0;
      if (denseSpread > 5e-2 * scale && diff1 < 1e-3 * scale) {
        return { kind: 'oscillating' };
      }
      // Richardson extrapolation on last 2 deltas (factor 10)
      const richardson = last + (last - prev) / 9;
      const best = Math.abs(richardson - last) < 1e-4 * scale ? richardson : last;
      return { kind: 'finite', value: Math.abs(best) < 1e-11 ? 0 : best };
    }

    // Oscillating check
    const spread = Math.max(...vals.slice(-4)) - Math.min(...vals.slice(-4));
    if (spread > 1e-2 && Math.max(...vals.slice(-4).map(Math.abs)) < 1e4) {
      return { kind: 'oscillating' };
    }
  }

  return { kind: 'oscillating' };
}

function probeInfinityLimit(node: ExprNode, v: string, sign: '+inf' | '-inf'): SideProbe {
  const dir = sign === '+inf' ? 1 : -1;
  const pts = [30, 100, 500, 2500, 15000, 100000].map((m) => m * dir);
  const vals: number[] = [];

  for (const x of pts) {
    const y = evaluate(node, { [v]: x });
    if (Number.isFinite(y)) vals.push(y);
  }

  if (vals.length === 0) return { kind: 'undefined' };

  // Dense spread around x = 500..505 to catch sin(x), cos(x)
  const dense: number[] = [];
  for (const offset of [0, 0.73, 1.57, 2.41, 3.14]) {
    const y = evaluate(node, { [v]: dir * (500 + offset) });
    if (Number.isFinite(y)) dense.push(y);
  }
  if (dense.length >= 3) {
    const dSpread = Math.max(...dense) - Math.min(...dense);
    const maxAbs = Math.max(...dense.map(Math.abs));
    if (dSpread > 5e-2 && maxAbs < 1e4) {
      return { kind: 'oscillating' };
    }
  }

  if (vals.length >= 3) {
    const last = vals[vals.length - 1];
    const prev = vals[vals.length - 2];
    const prev2 = vals[vals.length - 3];

    if (
      Math.abs(last) > 500 &&
      Math.abs(last) > Math.abs(prev) * 1.3 &&
      Math.abs(prev) > Math.abs(prev2) * 1.2 &&
      Math.sign(last) === Math.sign(prev)
    ) {
      return { kind: 'inf', sign: last > 0 ? '+inf' : '-inf' };
    }

    const scale = Math.max(1, Math.abs(last));
    if (Math.abs(last - prev) < 1e-3 * scale && Math.abs(prev - prev2) < 1e-2 * scale) {
      return { kind: 'finite', value: Math.abs(last) < 1e-11 ? 0 : last };
    }
  }

  return { kind: 'oscillating' };
}

function buildLimitPrefixLatex(v: string, target: BoundValue, direction: LimitDirection): string {
  if (target.value === '+inf') return `\\lim_{${v} \\to +\\infty}`;
  if (target.value === '-inf') return `\\lim_{${v} \\to -\\infty}`;
  if (direction === 'right') return `\\lim_{${v} \\to ${target.latex}^+}`;
  if (direction === 'left') return `\\lim_{${v} \\to ${target.latex}^-}`;
  return `\\lim_{${v} \\to ${target.latex}}`;
}

// Helper to rewrite node as N / D if it's div or negative-power product
function splitAsFraction(node: ExprNode): { num: ExprNode; den: ExprNode } | null {
  const s = simplify(node);
  if (s.type === 'div') return { num: s.num, den: s.den };
  if (s.type === 'pow' && s.exp.type === 'num' && s.exp.value < 0) {
    const posExp = num(-s.exp.value);
    return { num: num(1), den: s.exp.value === -1 ? s.base : pow(s.base, posExp) };
  }
  if (s.type === 'mul') {
    const top: ExprNode[] = [];
    const bot: ExprNode[] = [];
    for (const f of s.args) {
      if (f.type === 'div') {
        top.push(f.num);
        bot.push(f.den);
      } else if (f.type === 'pow' && f.exp.type === 'num' && f.exp.value < 0) {
        bot.push(f.exp.value === -1 ? f.base : pow(f.base, num(-f.exp.value)));
      } else {
        top.push(f);
      }
    }
    if (bot.length > 0) {
      return {
        num: top.length === 0 ? num(1) : top.length === 1 ? top[0] : mul(...top),
        den: bot.length === 1 ? bot[0] : mul(...bot),
      };
    }
  }
  return null;
}

// Extract conjugate expression for sqrt(A) - B or A - sqrt(B) or sqrt(A) - sqrt(B)
function makeConjugate(node: ExprNode): { conjugate: ExprNode; rationalized: ExprNode } | null {
  const s = simplify(node);
  if (s.type !== 'add' || s.args.length !== 2) return null;
  const [t1, t2] = s.args;
  const hasSqrt1 = containsSqrt(t1);
  const hasSqrt2 = containsSqrt(t2);
  if (!hasSqrt1 && !hasSqrt2) return null;

  // Conjugate of (t1 + t2) is (t1 - t2), and (t1 + t2)(t1 - t2) = t1^2 - t2^2
  const conj = simplify(sub(t1, t2));
  const sq = (t: ExprNode): ExprNode => {
    if (t.type === 'fn' && t.name === 'sqrt') return t.arg;
    if (t.type === 'neg' && t.arg.type === 'fn' && t.arg.name === 'sqrt') return t.arg.arg;
    return pow(t, num(2));
  };
  const rationalized = simplify(sub(sq(t1), sq(t2)));
  return { conjugate: conj, rationalized };
}

function containsSqrt(node: ExprNode): boolean {
  if (node.type === 'fn' && node.name === 'sqrt') return true;
  if (node.type === 'neg') return containsSqrt(node.arg);
  if (node.type === 'mul' || node.type === 'add') return node.args.some(containsSqrt);
  return false;
}

function solveLimitInternal(
  expr: ExprNode,
  v: string,
  target: BoundValue,
  direction: LimitDirection,
  depth = 0
): Omit<LimitResult, 'ok' | 'integrandText' | 'exprLatex' | 'limitLatex' | 'variable' | 'target' | 'direction' | 'warnings'> {
  const s = simplify(expr);
  const prefix = buildLimitPrefixLatex(v, target, direction);
  const steps: SolutionStep[] = [];

  // Constant expression
  if (isConstant(s, v)) {
    const val = evaluate(s, {});
    const valTex = formatExactLimitValue(val);
    steps.push({
      id: `lim-const-${depth}`,
      title: 'نهاية المقدار الثابت',
      rule: 'Constant Limit Rule',
      explanation: 'نهاية أي ثابت تساوي الثابت نفسه مهما كانت قيمة الاقتراب.',
      latex: `${prefix} ${toLatex(s)} = ${valTex}`,
    });
    return {
      exists: true,
      value: val,
      valueLatex: valTex,
      methodLabel: 'نهاية الثابت',
      steps,
    };
  }

  // -------------------------------------------------------------------------
  // CASE 1: LIMITS AT INFINITY (x -> +oo or -oo)
  // -------------------------------------------------------------------------
  if (target.value === '+inf' || target.value === '-inf') {
    const infSign = target.value;
    const infTex = infSign === '+inf' ? '+\\infty' : '-\\infty';
    const probe = probeInfinityLimit(s, v, infSign);

    // 1a. Polynomial P(x)
    const poly = extractPolynomial(s, v);
    if (poly && polyDegree(poly) >= 1) {
      const deg = polyDegree(poly);
      const lead = poly[deg];
      const leadSign = lead >= 0 ? 1 : -1;
      const xPowSign = infSign === '+inf' ? 1 : deg % 2 === 0 ? 1 : -1;
      const resSign: '+inf' | '-inf' = leadSign * xPowSign > 0 ? '+inf' : '-inf';
      const leadTerm = simplify(mul(num(lead), pow(vari(v), num(deg))));
      steps.push({
        id: `lim-poly-inf-${depth}`,
        title: 'تحديد الحد الرئيسي لكثير الحدود عند اللانهاية',
        rule: 'Leading Term Dominance',
        explanation: `عندما يؤول $${v}$ إلى $${infTex}$ يهيمن الحد ذو الأس الأعلى $${toLatex(leadTerm)}$ على سلوك كثير الحدود.`,
        latex: `${prefix} \\left(${toLatex(s)}\\right) = ${prefix} ${toLatex(leadTerm)} = ${resSign === '+inf' ? '+\\infty' : '-\\infty'}`,
      });
      return {
        exists: false,
        isInfinite: true,
        infinitySign: resSign,
        valueLatex: resSign === '+inf' ? '+\\infty' : '-\\infty',
        methodLabel: 'النهاية عند اللانهاية (كثير حدود)',
        steps,
      };
    }

    // 1b. Rational P(x)/Q(x) at infinity
    const frac = splitAsFraction(s);
    if (frac) {
      const pNum = extractPolynomial(frac.num, v);
      const pDen = extractPolynomial(frac.den, v);
      if (pNum && pDen && polyDegree(pDen) >= 0) {
        const dN = polyDegree(pNum);
        const dD = polyDegree(pDen);
        const maxD = Math.max(dN, dD);
        const leadN = dN >= 0 ? pNum[dN] : 0;
        const leadD = pDen[dD];

        steps.push({
          id: `lim-rat-inf-div-${depth}`,
          title: `قسمة البسط والمقام على أعلى قوة (${v}^{${maxD}})`,
          rule: 'Highest Power Division',
          explanation: `درجة البسط هي $${dN}$ ودرجة المقام هي $${dD}$، لذا نقسم كل حد في البسط والمقام على $${v}^{${maxD}}$؛ فتنعدم جميع الحدود ذات الأس السالب عند اللانهاية.`,
          latex: `${prefix} \\frac{${toLatex(frac.num)}}{${toLatex(frac.den)}} = ${prefix} \\frac{${toLatex(simplify(mul(num(leadN), pow(vari(v), num(dN)))))}${dN > 0 ? ' + \\cdots' : ''}}{${toLatex(simplify(mul(num(leadD), pow(vari(v), num(dD)))))}${dD > 0 ? ' + \\cdots' : ''}}`,
        });

        if (dN < dD) {
          steps.push({
            id: `lim-rat-inf-res-${depth}`,
            title: 'درجة المقام أكبر من درجة البسط',
            rule: 'Degree Comparison (deg N < deg D)',
            explanation: 'بما أن درجة المقام أكبر من درجة البسط، فإن قيمة الكسر تؤول إلى الصفر.',
            latex: `${prefix} ${toLatex(s)} = 0`,
          });
          return {
            exists: true,
            value: 0,
            valueLatex: '0',
            methodLabel: 'النهاية عند اللانهاية (دالة كسرية)',
            steps,
          };
        }

        if (dN === dD) {
          const ratio = leadN / leadD;
          const ratioTex = formatExactLimitValue(ratio);
          steps.push({
            id: `lim-rat-inf-res-${depth}`,
            title: 'تساوي درجة البسط والمقام',
            rule: 'Ratio of Leading Coefficients',
            explanation: 'بما أن درجتي البسط والمقام متساويتان، فإن النهاية تساوي نسبة المعاملين الرئيسيين.',
            latex: `${prefix} ${toLatex(s)} = \\frac{${formatNumberToLatex(leadN)}}{${formatNumberToLatex(leadD)}} = ${ratioTex}`,
          });
          return {
            exists: true,
            value: ratio,
            valueLatex: ratioTex,
            methodLabel: 'النهاية عند اللانهاية (دالة كسرية)',
            steps,
          };
        }

        const diffDeg = dN - dD;
        const coeffSign = leadN / leadD >= 0 ? 1 : -1;
        const powSign = infSign === '+inf' ? 1 : diffDeg % 2 === 0 ? 1 : -1;
        const resSign: '+inf' | '-inf' = coeffSign * powSign > 0 ? '+inf' : '-inf';
        const resTex = resSign === '+inf' ? '+\\infty' : '-\\infty';
        steps.push({
          id: `lim-rat-inf-res-${depth}`,
          title: 'درجة البسط أكبر من درجة المقام',
          rule: 'Degree Comparison (deg N > deg D)',
          explanation: 'بما أن درجة البسط أكبر، فإن النهاية تبتعد إلى اللانهاية حسب إشارة المعاملين وزوجية فرق الدرجتين.',
          latex: `${prefix} ${toLatex(s)} = ${resTex}`,
        });
        return {
          exists: false,
          isInfinite: true,
          infinitySign: resSign,
          valueLatex: resTex,
          methodLabel: 'النهاية عند اللانهاية (دالة كسرية)',
          steps,
        };
      }
    }

    // 1c. Radical Difference (oo - oo) e.g. sqrt(x^2 + bx + c) - x
    if (s.type === 'add' && containsSqrt(s)) {
      const conj = makeConjugate(s);
      if (conj) {
        steps.push({
          id: `lim-inf-conj-${depth}`,
          title: 'الضرب في المرافق لمعالجة حالة (∞ − ∞)',
          rule: 'Conjugate Rationalization',
          explanation: 'نضرب البسط والمقام في المرافق لإلغاء الجذر التربيعي في البسط ثم نقسم على أعلى قوة للمتغير.',
          latex: `${prefix} \\left(${toLatex(s)}\\right) = ${prefix} \\frac{${toLatex(conj.rationalized)}}{${toLatex(conj.conjugate)}}`,
        });
        if (probe.kind === 'finite') {
          const valTex = formatExactLimitValue(probe.value);
          steps.push({
            id: `lim-inf-conj-res-${depth}`,
            title: 'القسمة على أعلى قوة وتبسيط الناتج',
            rule: 'Asymptotic Simplification',
            explanation: `بعد اختصار الحدود المتشابهة والقسمة على $|${v}|$ نحصل على القيمة الدقيقة للنهاية.`,
            latex: `= ${valTex}`,
          });
          return {
            exists: true,
            value: probe.value,
            valueLatex: valTex,
            methodLabel: 'الضرب في المرافق عند اللانهاية',
            steps,
          };
        }
      }
    }

    // 1d. Exponential indeterminate 1^oo at infinity e.g. (1 + a/x)^(bx)
    if (s.type === 'pow' && !isConstant(s.base, v) && !isConstant(s.exp, v) && probe.kind === 'finite' && probe.value > 0) {
      const baseProbe = probeInfinityLimit(s.base, v, infSign);
      const expProbe = probeInfinityLimit(s.exp, v, infSign);
      if (baseProbe.kind === 'finite' && Math.abs(baseProbe.value - 1) < 1e-3 && expProbe.kind === 'inf') {
        const lnVal = Math.log(probe.value);
        const valTex = formatExactLimitValue(probe.value);
        const lnTex = formatExactLimitValue(lnVal);
        steps.push({
          id: `lim-euler-inf-${depth}`,
          title: 'معالجة الصيغة الأسية غير المعينة (1^∞)',
          rule: 'Logarithmic / Euler Transform',
          explanation: 'نأخذ اللوغاريتم الطبيعي للطرفين لتحويل الصيغة $1^{\\infty}$ إلى صيغة $\\frac{0}{0}$، فنحسب نهاية الأس في اللوغاريتم ثم نرفع الناتج للأساس $e$.',
          latex: `\\ln L = ${prefix} \\left(${toLatex(s.exp)}\\right)\\ln\\left(${toLatex(s.base)}\\right) = ${lnTex} \\implies L = e^{${lnTex}} = ${valTex}`,
        });
        return {
          exists: true,
          value: probe.value,
          valueLatex: valTex,
          methodLabel: 'النهاية الأسية (صيغة أويلر 1^∞)',
          steps,
        };
      }
    }

    // 1e. L'Hôpital at infinity for oo/oo or 0/0 quotients
    if (frac && depth < 3) {
      const nProbe = probeInfinityLimit(frac.num, v, infSign);
      const dProbe = probeInfinityLimit(frac.den, v, infSign);
      const isIndet =
        (nProbe.kind === 'inf' && dProbe.kind === 'inf') ||
        (nProbe.kind === 'finite' && Math.abs(nProbe.value) < 1e-4 && dProbe.kind === 'finite' && Math.abs(dProbe.value) < 1e-4);
      if (isIndet) {
        const dN = simplify(differentiate(frac.num, v));
        const dD = simplify(differentiate(frac.den, v));
        if (!(dD.type === 'num' && Math.abs(dD.value) < 1e-12)) {
          const nextExpr = simplify(div(dN, dD));
          const subRes = solveLimitInternal(nextExpr, v, target, direction, depth + 1);
          if (subRes.exists || subRes.isInfinite) {
            steps.push({
              id: `lim-lhop-inf-${depth}`,
              title: "تطبيق قاعدة لوبيتال عند اللانهاية",
              rule: "L'Hôpital's Rule",
              explanation: `النهاية على الصورة غير المعينة (${nProbe.kind === 'inf' ? '\\infty/\\infty' : '0/0'})، فنشتق البسط والمقام بالنسبة إلى $${v}$.`,
              latex: `${prefix} \\frac{${toLatex(frac.num)}}{${toLatex(frac.den)}} = ${prefix} \\frac{${toLatex(dN)}}{${toLatex(dD)}}`,
            });
            steps.push(...subRes.steps);
            return { ...subRes, methodLabel: "قاعدة لوبيتال", steps };
          }
        }
      }
    }

    // 1f. General convergence / divergence / oscillation probe at infinity
    if (probe.kind === 'finite') {
      const valTex = formatExactLimitValue(probe.value);
      steps.push({
        id: `lim-inf-conv-${depth}`,
        title: 'تحليل التقارب المقارب عند اللانهاية',
        rule: 'Asymptotic Convergence',
        explanation: `بتتبع سلوك الدالة لقيم كبيرة جداً من $${v} \\to ${infTex}$، تقترب الدالة بشكل مستقر نحو القيمة الحدية.`,
        latex: `${prefix} ${toLatex(s)} = ${valTex}`,
      });
      return {
        exists: true,
        value: probe.value,
        valueLatex: valTex,
        methodLabel: 'النهاية عند اللانهاية',
        steps,
      };
    }

    if (probe.kind === 'inf') {
      const infOut = probe.sign === '+inf' ? '+\\infty' : '-\\infty';
      steps.push({
        id: `lim-inf-div-${depth}`,
        title: 'تباعد الدالة عند اللانهاية',
        rule: 'Infinite Divergence',
        explanation: `مع تزايد $|${v}|$ نحو اللانهاية، تنمو قيمة الدالة بلا حدود باتجاه $${infOut}$.`,
        latex: `${prefix} ${toLatex(s)} = ${infOut}`,
      });
      return {
        exists: false,
        isInfinite: true,
        infinitySign: probe.sign,
        valueLatex: infOut,
        methodLabel: 'النهاية عند اللانهاية',
        steps,
      };
    }

    steps.push({
      id: `lim-inf-osc-${depth}`,
      title: 'تذبذب الدالة وعدم وجود نهاية عند اللانهاية',
      rule: 'Oscillatory Non-Existence',
      explanation: `تستمر الدالة بالتذبذب دون الاستقرار عند قيمة محددة عندما يؤول $${v}$ إلى $${infTex}$، لذلك النهاية غير موجودة.`,
      latex: `${prefix} ${toLatex(s)} \\text{ غير موجودة (تذبذب)}`,
    });
    return {
      exists: false,
      valueLatex: '\\text{غير موجودة (تذبذب)}',
      methodLabel: 'تحليل السلوك عند اللانهاية',
      steps,
    };
  }

  // -------------------------------------------------------------------------
  // CASE 2: FINITE POINT (x -> a, a+, or a-)
  // -------------------------------------------------------------------------
  const a = target.value;
  const aNode = target.node ?? num(a);

  // One-sided numerical verification probes (used both for safety & side comparison)
  const rightProbe = direction === 'left' ? null : probeOneSidedLimit(s, v, a, 'right');
  const leftProbe = direction === 'right' ? null : probeOneSidedLimit(s, v, a, 'left');

  // 2a. Direct substitution check (ensure continuous match with neighborhood probes!)
  const directVal = evaluate(s, { [v]: a });
  if (Number.isFinite(directVal)) {
    const cleanDirect = Math.abs(directVal) < 1e-11 ? 0 : directVal;
    const rightMatches =
      !rightProbe || (rightProbe.kind === 'finite' && Math.abs(rightProbe.value - cleanDirect) < Math.max(1e-3, 1e-2 * Math.abs(cleanDirect)));
    const leftMatches =
      !leftProbe || (leftProbe.kind === 'finite' && Math.abs(leftProbe.value - cleanDirect) < Math.max(1e-3, 1e-2 * Math.abs(cleanDirect)));

    if (rightMatches && leftMatches) {
      const subNode = simplify(substitute(s, v, aNode));
      const exactTex = formatExactLimitValue(cleanDirect);
      const subTex = toLatex(subNode);
      steps.push({
        id: `lim-direct-${depth}`,
        title: 'التعويض المباشر في الدالة',
        rule: 'Direct Substitution',
        explanation: `الدالة متصلة عند $${v} = ${target.latex}$؛ نعوض مباشرة بالقيمة $${target.latex}$ مكان $${v}$.`,
        latex:
          subTex !== exactTex
            ? `${prefix} ${toLatex(s)} = ${subTex} = ${exactTex}`
            : `${prefix} ${toLatex(s)} = ${exactTex}`,
      });
      return {
        exists: true,
        value: cleanDirect,
        valueLatex: exactTex,
        methodLabel: 'التعويض المباشر',
        steps,
      };
    }
  }

  // 2b. Check Indeterminate 0/0 or oo/oo Fraction Forms
  const frac = splitAsFraction(s);
  if (frac) {
    const nAtA = evaluate(frac.num, { [v]: a });
    const dAtA = evaluate(frac.den, { [v]: a });
    const isZeroOverZero =
      Number.isFinite(nAtA) && Number.isFinite(dAtA) && Math.abs(nAtA) < 1e-9 && Math.abs(dAtA) < 1e-9;

    if (isZeroOverZero) {
      // (i) Rational polynomial factoring: divide out (x - a)
      const pNum = extractPolynomial(frac.num, v);
      const pDen = extractPolynomial(frac.den, v);
      if (pNum && pDen && polyDegree(pNum) >= 1 && polyDegree(pDen) >= 1) {
        let curN = pNum;
        let curD = pDen;
        let factorPower = 0;
        const divisor = [-a, 1]; // x - a
        while (Math.abs(polyEval(curN, a)) < 1e-8 && Math.abs(polyEval(curD, a)) < 1e-8 && polyDegree(curN) >= 1 && polyDegree(curD) >= 1) {
          const qN = polyDiv(curN, divisor);
          const qD = polyDiv(curD, divisor);
          if (polyDegree(qN.remainder) >= 0 && Math.abs(qN.remainder[0] ?? 0) > 1e-6) break;
          if (polyDegree(qD.remainder) >= 0 && Math.abs(qD.remainder[0] ?? 0) > 1e-6) break;
          curN = qN.quotient;
          curD = qD.quotient;
          factorPower++;
        }
        if (factorPower > 0) {
          const redNum = polyToExpr(curN, v);
          const redDen = polyToExpr(curD, v);
          const factorNode = simplify(sub(vari(v), aNode));
          const factorTex = factorPower === 1 ? `(${toLatex(factorNode)})` : `(${toLatex(factorNode)})^{${factorPower}}`;
          const reducedExpr = simplify(div(redNum, redDen));
          steps.push({
            id: `lim-factor-${depth}`,
            title: 'التحليل واختزال العامل الصفري',
            rule: 'Factoring & Cancellation (0/0)',
            explanation: `بالتعويض المباشر نحصل على الصيغة غير المعينة $\\frac{0}{0}$، فنحلل البسط والمقام ونختزل العامل الصفري $${factorTex}$.`,
            latex: `${prefix} \\frac{${toLatex(frac.num)}}{${toLatex(frac.den)}} = ${prefix} \\frac{${factorTex}\\left(${toLatex(redNum)}\\right)}{${factorTex}\\left(${toLatex(redDen)}\\right)} = ${prefix} ${toLatex(reducedExpr)}`,
          });
          const subRes = solveLimitInternal(reducedExpr, v, target, direction, depth + 1);
          steps.push(...subRes.steps);
          return { ...subRes, methodLabel: 'التحليل واختزال العامل الصفري', steps };
        }
      }

      // (ii) Radical Conjugate Rationalization (0/0)
      if (containsSqrt(frac.num) && !containsSqrt(frac.den)) {
        const conj = makeConjugate(frac.num);
        if (conj) {
          const newDen = simplify(mul(frac.den, conj.conjugate));
          const conjExpr = simplify(div(conj.rationalized, newDen));
          steps.push({
            id: `lim-conj-num-${depth}`,
            title: 'الضرب في مرافق البسط الجذري',
            rule: 'Conjugate Multiplication (0/0)',
            explanation: 'بما أن التعويض يعطي $\\frac{0}{0}$ مع وجود جذر تربيعي في البسط، نضرب البسط والمقام في مرافق البسط لتبسيط الجذر.',
            latex: `${prefix} \\frac{${toLatex(frac.num)}}{${toLatex(frac.den)}} = ${prefix} \\frac{${toLatex(conj.rationalized)}}{\\left(${toLatex(frac.den)}\\right)\\left(${toLatex(conj.conjugate)}\\right)}`,
          });
          // Try cancelling polynomial (x-a) if rationalized num and original den are polynomials
          const pRat = extractPolynomial(conj.rationalized, v);
          const pOrigDen = extractPolynomial(frac.den, v);
          if (pRat && pOrigDen && Math.abs(polyEval(pRat, a)) < 1e-8 && Math.abs(polyEval(pOrigDen, a)) < 1e-8) {
            const qN = polyDiv(pRat, [-a, 1]);
            const qD = polyDiv(pOrigDen, [-a, 1]);
            if ((polyDegree(qN.remainder) < 0 || Math.abs(qN.remainder[0]) < 1e-6) && (polyDegree(qD.remainder) < 0 || Math.abs(qD.remainder[0]) < 1e-6)) {
              const simplifiedAfterCancel = simplify(
                div(polyToExpr(qN.quotient, v), mul(polyToExpr(qD.quotient, v), conj.conjugate))
              );
              const subRes = solveLimitInternal(simplifiedAfterCancel, v, target, direction, depth + 1);
              steps.push(...subRes.steps);
              return { ...subRes, methodLabel: 'الضرب في المرافق', steps };
            }
          }
          if (depth < 2) {
            const subRes = solveLimitInternal(conjExpr, v, target, direction, depth + 1);
            if (subRes.exists) {
              steps.push(...subRes.steps);
              return { ...subRes, methodLabel: 'الضرب في المرافق', steps };
            }
          }
        }
      }

      if (containsSqrt(frac.den) && !containsSqrt(frac.num)) {
        const conj = makeConjugate(frac.den);
        if (conj) {
          const newNum = simplify(mul(frac.num, conj.conjugate));
          const conjExpr = simplify(div(newNum, conj.rationalized));
          steps.push({
            id: `lim-conj-den-${depth}`,
            title: 'الضرب في مرافق المقام الجذري',
            rule: 'Conjugate Multiplication (0/0)',
            explanation: 'نضرب البسط والمقام في مرافق المقام الجذري لإزالة الجذر والتخلص من الصيغة $\\frac{0}{0}$.',
            latex: `${prefix} \\frac{${toLatex(frac.num)}}{${toLatex(frac.den)}} = ${prefix} \\frac{\\left(${toLatex(frac.num)}\\right)\\left(${toLatex(conj.conjugate)}\\right)}{${toLatex(conj.rationalized)}}`,
          });
          if (depth < 2) {
            const subRes = solveLimitInternal(conjExpr, v, target, direction, depth + 1);
            if (subRes.exists) {
              steps.push(...subRes.steps);
              return { ...subRes, methodLabel: 'الضرب في المرافق', steps };
            }
          }
        }
      }

      // (iii) L'Hôpital's Rule for 0/0 (up to 4 recursive derivatives)
      if (depth < 4) {
        const dN = simplify(differentiate(frac.num, v));
        const dD = simplify(differentiate(frac.den, v));
        if (!(dD.type === 'num' && Math.abs(dD.value) < 1e-12)) {
          const nextExpr = simplify(div(dN, dD));
          const subRes = solveLimitInternal(nextExpr, v, target, direction, depth + 1);
          // Cross-verify against probe if available so cyclic L'Hôpital never misleads
          const targetProbe = direction === 'left' ? leftProbe : rightProbe;
          const agrees =
            !targetProbe ||
            (subRes.exists && targetProbe.kind === 'finite' && Math.abs((subRes.value ?? 0) - targetProbe.value) < Math.max(1e-2, 5e-2 * Math.abs(targetProbe.value))) ||
            (subRes.isInfinite && targetProbe.kind === 'inf' && subRes.infinitySign === targetProbe.sign);
          if ((subRes.exists || subRes.isInfinite) && agrees) {
            steps.push({
              id: `lim-lhop-zero-${depth}`,
              title: "تطبيق قاعدة لوبيتال (صيغة 0/0)",
              rule: "L'Hôpital's Rule",
              explanation: `التعويض المباشر يعطي الصيغة غير المعينة $\\frac{0}{0}$، لذا نشتق كلاً من البسط والمقام بالنسبة للمتغير $${v}$.`,
              latex: `${prefix} \\frac{${toLatex(frac.num)}}{${toLatex(frac.den)}} = ${prefix} \\frac{${toLatex(dN)}}{${toLatex(dD)}}`,
            });
            steps.push(...subRes.steps);
            return { ...subRes, methodLabel: "قاعدة لوبيتال", steps };
          }
        }
      }

      // (iv) Taylor Power Series Expansion at x = a for tricky 0/0 expressions
      const numJet = evalJet(frac.num, v, a, 8);
      const denJet = evalJet(frac.den, v, a, 8);
      if (numJet.every(Number.isFinite) && denJet.every(Number.isFinite)) {
        const k = numJet.findIndex((c) => Math.abs(c) > 1e-10);
        const m = denJet.findIndex((c) => Math.abs(c) > 1e-10);
        if (k >= 0 && m >= 0) {
          const varShift = Math.abs(a) < 1e-12 ? v : `(${v} - ${target.latex})`;
          const numTerm = `${formatExactLimitValue(numJet[k])}${k === 1 ? varShift : `${varShift}^{${k}}`}`;
          const denTerm = `${formatExactLimitValue(denJet[m])}${m === 1 ? varShift : `${varShift}^{${m}}`}`;

          if (k > m) {
            steps.push({
              id: `lim-taylor-zero-${depth}`,
              title: `التحليل بمتسلسلة تايلور حول ${v} = ${target.latex}`,
              rule: 'Taylor Series Leading Term',
              explanation: `بنشر البسط والمقام حول $${v} = ${target.latex}$ نجد أن أقل قوة في البسط ($${k}$) أكبر من أقل قوة في المقام ($${m}$)، فتؤول النسبة إلى الصفر.`,
              latex: `${prefix} \\frac{${numTerm} + \\cdots}{${denTerm} + \\cdots} = 0`,
            });
            return {
              exists: true,
              value: 0,
              valueLatex: '0',
              methodLabel: 'متسلسلة تايلور',
              steps,
            };
          }
          if (k === m) {
            const val = numJet[k] / denJet[m];
            const valTex = formatExactLimitValue(val);
            steps.push({
              id: `lim-taylor-eq-${depth}`,
              title: `التحليل بمتسلسلة تايلور حول ${v} = ${target.latex}`,
              rule: 'Taylor Series Leading Coefficient Ratio',
              explanation: `بنشر البسط والمقام بمتسلسلة تايلور حول $${v} = ${target.latex}$ تتساوى أقل درجة ($${k}$) في البسط والمقام، وتساوي النهاية نسبة المعاملين الرئيسيين.`,
              latex: `${prefix} \\frac{${numTerm} + \\cdots}{${denTerm} + \\cdots} = \\frac{${formatExactLimitValue(numJet[k])}}{${formatExactLimitValue(denJet[m])}} = ${valTex}`,
            });
            return {
              exists: true,
              value: val,
              valueLatex: valTex,
              methodLabel: 'متسلسلة تايلور',
              steps,
            };
          }
        }
      }
    }

    // Check oo/oo at finite point a (e.g. ln(x)/(1/x) or tan(x)/cot(pi/2-x))
    const rN = probeOneSidedLimit(frac.num, v, a, direction === 'left' ? 'left' : 'right');
    const rD = probeOneSidedLimit(frac.den, v, a, direction === 'left' ? 'left' : 'right');
    if (rN.kind === 'inf' && rD.kind === 'inf' && depth < 3) {
      const dN = simplify(differentiate(frac.num, v));
      const dD = simplify(differentiate(frac.den, v));
      if (!(dD.type === 'num' && Math.abs(dD.value) < 1e-12)) {
        const nextExpr = simplify(div(dN, dD));
        const subRes = solveLimitInternal(nextExpr, v, target, direction, depth + 1);
        if (subRes.exists || subRes.isInfinite) {
          steps.push({
            id: `lim-lhop-infpt-${depth}`,
            title: "تطبيق قاعدة لوبيتال (صيغة ∞/∞)",
            rule: "L'Hôpital's Rule",
            explanation: 'كل من البسط والمقام يؤول إلى اللانهاية، فنطبق قاعدة لوبيتال باشتقاق البسط والمقام.',
            latex: `${prefix} \\frac{${toLatex(frac.num)}}{${toLatex(frac.den)}} = ${prefix} \\frac{${toLatex(dN)}}{${toLatex(dD)}}`,
          });
          steps.push(...subRes.steps);
          return { ...subRes, methodLabel: "قاعدة لوبيتال", steps };
        }
      }
    }
  }

  // 2c. Exponential Indeterminate Forms (1^oo, 0^0, oo^0) at finite a
  if (s.type === 'pow' && !isConstant(s.base, v) && !isConstant(s.exp, v) && depth < 2) {
    const side = direction === 'left' ? 'left' : 'right';
    const bP = probeOneSidedLimit(s.base, v, a, side);
    const eP = probeOneSidedLimit(s.exp, v, a, side);
    const isOneInf = bP.kind === 'finite' && Math.abs(bP.value - 1) < 1e-4 && eP.kind === 'inf';
    const isZeroZero = bP.kind === 'finite' && Math.abs(bP.value) < 1e-4 && eP.kind === 'finite' && Math.abs(eP.value) < 1e-4;
    const isInfZero = bP.kind === 'inf' && eP.kind === 'finite' && Math.abs(eP.value) < 1e-4;

    if (isOneInf || isZeroZero || isInfZero) {
      const lnQuot = simplify(div(fn('ln', s.base), div(num(1), s.exp)));
      const lnRes = solveLimitInternal(lnQuot, v, target, direction, depth + 1);
      if (lnRes.exists && lnRes.value !== undefined) {
        const finalVal = Math.exp(lnRes.value);
        const finalTex = formatExactLimitValue(finalVal);
        steps.push({
          id: `lim-exp-indet-${depth}`,
          title: 'التحويل اللوغاريتمي للصيغة الأسية غير المعينة',
          rule: 'Logarithmic Transform',
          explanation: 'نفرض $L = \\lim f(x)^{g(x)}$ ثم نأخذ اللوغاريتم الطبيعي للطرفين لتحويل القوة إلى حاصل ضرب ثم إلى كسر لتطبيق قاعدة لوبيتال.',
          latex: `\\ln L = ${prefix} ${toLatex(s.exp)} \\cdot \\ln\\left(${toLatex(s.base)}\\right) = ${prefix} ${toLatex(lnQuot)}`,
        });
        steps.push(...lnRes.steps);
        steps.push({
          id: `lim-exp-back-${depth}`,
          title: 'إيجاد قيمة L برفع الناتج للأساس e',
          rule: 'Inverse Logarithm',
          explanation: `بعد إيجاد $\\ln L = ${lnRes.valueLatex}$ نأخذ الأس الطبيعي للطرفين.`,
          latex: `L = e^{${lnRes.valueLatex}} = ${finalTex}`,
        });
        return {
          exists: true,
          value: finalVal,
          valueLatex: finalTex,
          methodLabel: 'التحويل اللوغاريتمي ولوبيتال',
          steps,
        };
      }
    }
  }

  // 2d. One-Sided & Discontinuity / Vertical Asymptote Final Analysis
  if (direction === 'right' && rightProbe) {
    const rTex = probeToLatex(rightProbe);
    if (rightProbe.kind === 'finite') {
      steps.push({
        id: `lim-right-${depth}`,
        title: `حساب النهاية اليمنى (${v} → ${target.latex}⁺)`,
        rule: 'Right-Hand Limit',
        explanation: `بتتبع قيم الدالة عند الاقتراب من $${target.latex}$ من جهة اليمين ($${v} > ${target.latex}$)، تقترب الدالة من القيمة المحددة.`,
        latex: `\\lim_{${v} \\to ${target.latex}^+} ${toLatex(s)} = ${rTex}`,
      });
      return {
        exists: true,
        value: rightProbe.value,
        valueLatex: rTex,
        rightLimitLatex: rTex,
        methodLabel: 'النهاية اليمنى',
        steps,
      };
    }
    if (rightProbe.kind === 'inf') {
      steps.push({
        id: `lim-right-inf-${depth}`,
        title: `تباعد النهاية اليمنى نحو اللانهاية`,
        rule: 'Vertical Asymptote (Right)',
        explanation: `عند الاقتراب من $${target.latex}$ من اليمين تنمو الدالة بلا حدود باتجاه $${rTex}$.`,
        latex: `\\lim_{${v} \\to ${target.latex}^+} ${toLatex(s)} = ${rTex}`,
      });
      return {
        exists: false,
        isInfinite: true,
        infinitySign: rightProbe.sign,
        valueLatex: rTex,
        rightLimitLatex: rTex,
        methodLabel: 'خط تقارب عمودي (النهاية اليمنى)',
        steps,
      };
    }
    steps.push({
      id: `lim-right-dne-${depth}`,
      title: 'النهاية اليمنى غير موجودة',
      rule: 'One-Sided Non-Existence',
      explanation:
        rightProbe.kind === 'oscillating'
          ? 'تتذبذب الدالة بسرعة متزايدة عند الاقتراب من اليمين دون استقرار على قيمة.'
          : 'الدالة غير معرفة في جوار اليمين على مجموعة الأعداد الحقيقية.',
      latex: `\\lim_{${v} \\to ${target.latex}^+} ${toLatex(s)} = ${rTex}`,
    });
    return {
      exists: false,
      valueLatex: rTex,
      rightLimitLatex: rTex,
      methodLabel: 'تحليل النهاية اليمنى',
      steps,
    };
  }

  if (direction === 'left' && leftProbe) {
    const lTex = probeToLatex(leftProbe);
    if (leftProbe.kind === 'finite') {
      steps.push({
        id: `lim-left-${depth}`,
        title: `حساب النهاية اليسرى (${v} → ${target.latex}⁻)`,
        rule: 'Left-Hand Limit',
        explanation: `بتتبع قيم الدالة عند الاقتراب من $${target.latex}$ من جهة اليسار ($${v} < ${target.latex}$)، تقترب الدالة من القيمة المحددة.`,
        latex: `\\lim_{${v} \\to ${target.latex}^-} ${toLatex(s)} = ${lTex}`,
      });
      return {
        exists: true,
        value: leftProbe.value,
        valueLatex: lTex,
        leftLimitLatex: lTex,
        methodLabel: 'النهاية اليسرى',
        steps,
      };
    }
    if (leftProbe.kind === 'inf') {
      steps.push({
        id: `lim-left-inf-${depth}`,
        title: 'تباعد النهاية اليسرى نحو اللانهاية',
        rule: 'Vertical Asymptote (Left)',
        explanation: `عند الاقتراب من $${target.latex}$ من اليسار تنمو الدالة بلا حدود باتجاه $${lTex}$.`,
        latex: `\\lim_{${v} \\to ${target.latex}^-} ${toLatex(s)} = ${lTex}`,
      });
      return {
        exists: false,
        isInfinite: true,
        infinitySign: leftProbe.sign,
        valueLatex: lTex,
        leftLimitLatex: lTex,
        methodLabel: 'خط تقارب عمودي (النهاية اليسرى)',
        steps,
      };
    }
    steps.push({
      id: `lim-left-dne-${depth}`,
      title: 'النهاية اليسرى غير موجودة',
      rule: 'One-Sided Non-Existence',
      explanation:
        leftProbe.kind === 'oscillating'
          ? 'تتذبذب الدالة بسرعة متزايدة عند الاقتراب من اليسار دون استقرار على قيمة.'
          : 'الدالة غير معرفة في جوار اليسار على مجموعة الأعداد الحقيقية.',
      latex: `\\lim_{${v} \\to ${target.latex}^-} ${toLatex(s)} = ${lTex}`,
    });
    return {
      exists: false,
      valueLatex: lTex,
      leftLimitLatex: lTex,
      methodLabel: 'تحليل النهاية اليسرى',
      steps,
    };
  }

  // Two-sided comparison
  if (rightProbe && leftProbe) {
    const rTex = probeToLatex(rightProbe);
    const lTex = probeToLatex(leftProbe);

    if (probesAgree(rightProbe, leftProbe)) {
      if (rightProbe.kind === 'finite') {
        const valTex = formatExactLimitValue(rightProbe.value);
        steps.push({
          id: `lim-both-finite-${depth}`,
          title: 'تساوي النهايتين اليمنى واليسرى',
          rule: 'Two-Sided Limit Existence',
          explanation: 'بحساب النهاية من اليمين ومن اليسار نجد أنهما متساويتان، وبالتالي النهاية موجودة.',
          latex: `\\lim_{${v} \\to ${target.latex}^+} ${toLatex(s)} = \\lim_{${v} \\to ${target.latex}^-} ${toLatex(s)} = ${valTex}`,
        });
        return {
          exists: true,
          value: rightProbe.value,
          valueLatex: valTex,
          leftLimitLatex: lTex,
          rightLimitLatex: rTex,
          methodLabel: 'تطابق النهايات الجانبية',
          steps,
        };
      }
      if (rightProbe.kind === 'inf') {
        steps.push({
          id: `lim-both-inf-${depth}`,
          title: 'اتفاق النهايتين الجانبيتين نحو اللانهاية',
          rule: 'Infinite Limit (Vertical Asymptote)',
          explanation: `من اليمين واليسار تتجه الدالة معاً نحو $${rTex}$ (خط تقارب عمودي عند $${v} = ${target.latex}$).`,
          latex: `\\lim_{${v} \\to ${target.latex}^+} ${toLatex(s)} = \\lim_{${v} \\to ${target.latex}^-} ${toLatex(s)} = ${rTex}`,
        });
        return {
          exists: false,
          isInfinite: true,
          infinitySign: rightProbe.sign,
          valueLatex: rTex,
          leftLimitLatex: lTex,
          rightLimitLatex: rTex,
          methodLabel: 'خط تقارب عمودي',
          steps,
        };
      }
    }

    steps.push({
      id: `lim-dne-sides-${depth}`,
      title: 'فحص النهاية اليمنى والنهاية اليسرى',
      rule: 'One-Sided Comparison',
      explanation: `نقارن بين سلوك الدالة من اليمين ($${rTex}$) ومن اليسار ($${lTex}$).`,
      latex: `\\lim_{${v} \\to ${target.latex}^+} ${toLatex(s)} = ${rTex}, \\qquad \\lim_{${v} \\to ${target.latex}^-} ${toLatex(s)} = ${lTex}`,
    });
    steps.push({
      id: `lim-dne-final-${depth}`,
      title: 'استنتاج عدم وجود النهاية الكلية',
      rule: 'Limit Does Not Exist (DNE)',
      explanation: 'بما أن النهاية من اليمين لا تساوي النهاية من اليسار (أو إحداهما غير موجودة)، فإن النهاية الكلية غير موجودة.',
      latex: `${prefix} ${toLatex(s)} \\text{ غير موجودة (DNE)}`,
    });
    return {
      exists: false,
      valueLatex: '\\text{غير موجودة (DNE)}',
      leftLimitLatex: lTex,
      rightLimitLatex: rTex,
      methodLabel: 'اختلاف النهايتين الجانبيتين',
      steps,
    };
  }

  return {
    exists: false,
    valueLatex: '\\text{غير موجودة (DNE)}',
    methodLabel: 'تحليل النهاية',
    steps,
  };
}

export function solveLimit(req: LimitRequest): LimitResult {
  const variable = (req.variable?.trim() || 'x').toLowerCase();
  const warnings: string[] = [];
  let target: BoundValue;

  try {
    target = parseBound(req.target || '0');
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'قيمة الاقتراب غير صالحة.',
      exists: false,
      valueLatex: '',
      variable,
      target: { raw: req.target, value: 0, latex: req.target },
      direction: req.direction ?? 'two-sided',
      integrandText: req.expression,
      exprLatex: req.expression,
      limitLatex: '',
      methodLabel: 'حساب النهايات',
      steps: [],
      warnings,
    };
  }

  const direction: LimitDirection =
    target.value === '+inf' || target.value === '-inf'
      ? 'two-sided'
      : req.direction ?? 'two-sided';

  let expr: ExprNode;
  try {
    expr = parseExpr(req.expression);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'تعذر قراءة التعبير الرياضي.',
      exists: false,
      valueLatex: '',
      variable,
      target,
      direction,
      integrandText: req.expression,
      exprLatex: req.expression,
      limitLatex: '',
      methodLabel: 'حساب النهايات',
      steps: [],
      warnings,
    };
  }

  const vars = getVariables(expr);
  if (vars.size > 1 || (vars.size === 1 && !vars.has(variable))) {
    const others = [...vars].filter((x) => x !== variable);
    if (others.length > 0) {
      warnings.push(`تم اعتبار الرموز (${others.join(', ')}) ثوابت بالنسبة للمتغير ${variable}.`);
    }
  }

  const exprLatex = toLatex(expr);
  const limitLatex = `${buildLimitPrefixLatex(variable, target, direction)} ${exprLatex}`;
  const solved = solveLimitInternal(expr, variable, target, direction, 0);

  return {
    ok: true,
    ...solved,
    variable,
    target,
    direction,
    integrandText: req.expression,
    exprLatex,
    limitLatex,
    warnings,
  };
}
