import {
  ExprNode,
  ParseError,
  add,
  callFn,
  differentiate,
  div,
  evaluate,
  fn,
  getVariables,
  isConstant,
  makeRational,
  mul,
  neg,
  nodeEquals,
  normalizeInput,
  num,
  parseExpr,
  pow,
  simplify,
  sub,
  substitute,
  symConst,
  toExactFraction,
  toLatex,
  vari,
} from './ast';
import {
  NumericalResult,
  SimpsonSample,
  integrateNumerical,
  simpsonComposite,
  verifyAntiderivative,
} from './numerical';
import {
  FactorizedPoly,
  Poly,
  extractPolynomial,
  factorPolynomial,
  polyDegree,
  polyDiv,
  polyEval,
  polyMul,
  polyPow,
  polyToExpr,
  solveLinearSystem,
  trimPoly,
} from './polynomial';
import { TaylorAntiderivative, computeTaylorAntiderivative } from './taylor';

export type IntegrationMethod =
  | 'auto'
  | 'basic'
  | 'substitution'
  | 'parts'
  | 'trig'
  | 'trig_sub'
  | 'partial_fractions'
  | 'numerical';

export const METHOD_LABELS: Record<IntegrationMethod, string> = {
  auto: 'تلقائي (أنسب طريقة)',
  basic: 'القواعد الأساسية والخطية',
  substitution: 'التكامل بالتعويض (u-Sub)',
  parts: 'التكامل بالتجزئة (LIATE)',
  trig: 'التكاملات المثلثية والزائدية',
  trig_sub: 'التعويض المثلثي وإتمام المربع',
  partial_fractions: 'الكسور الجزئية للدوال النسبية',
  numerical: 'التكامل العددي (سمبسون / غاوس)',
};

export interface SolutionStep {
  id: string;
  title: string;
  rule: string;
  explanation: string;
  latex: string;
  note?: string;
}

export interface BoundValue {
  raw: string;
  value: number | '-inf' | '+inf';
  latex: string;
  node?: ExprNode;
}

export interface IntegrationResult {
  ok: boolean;
  error?: string;
  isDefinite: boolean;
  variable: string;
  integrandText: string;
  integrandLatex: string;
  integralLatex: string;
  methodUsed: IntegrationMethod;
  methodLabel: string;
  antiderivative?: ExprNode;
  antiderivativeLatex?: string;
  definiteNumericValue?: number;
  definiteExactLatex?: string;
  numericalErrorEstimate?: number;
  simpsonData?: { h: number; n: number; samples: SimpsonSample[]; value: number };
  steps: SolutionStep[];
  warnings: string[];
  lowerBound?: BoundValue;
  upperBound?: BoundValue;
  nonElementary?: boolean;
  specialFunctionLatex?: string;
  taylorSeries?: TaylorAntiderivative;
}

export interface SolveIntegralRequest {
  expression: string;
  variable?: string;
  isDefinite: boolean;
  lowerBound?: string;
  upperBound?: string;
  method?: IntegrationMethod;
}

export function parseBound(raw: string): BoundValue {
  const trimmed = normalizeInput(raw).trim();
  if (!trimmed) {
    throw new ParseError('الرجاء إدخال حد التكامل.');
  }
  const lower = trimmed.toLowerCase();
  if (lower === 'inf' || lower === '+inf' || lower === 'oo' || lower === '+oo') {
    return { raw, value: '+inf', latex: '\\infty' };
  }
  if (lower === '-inf' || lower === '-oo') {
    return { raw, value: '-inf', latex: '-\\infty' };
  }
  const node = parseExpr(trimmed);
  const vars = getVariables(node);
  if (vars.size > 0) {
    throw new ParseError(`حد التكامل "${raw}" يجب أن يكون قيمة ثابتة بدون متغيرات.`);
  }
  const val = evaluate(node, {});
  if (!Number.isFinite(val)) {
    throw new ParseError(`تعذر حساب قيمة حد التكامل "${raw}".`);
  }
  return { raw, value: val, latex: toLatex(node), node };
}

function formatNumberClean(val: number): string {
  if (!Number.isFinite(val)) return 'غير معرف';
  if (Math.abs(val) < 1e-12) return '0';
  const frac = toExactFraction(val, 1000);
  if (frac && frac.d === 1) return String(frac.n);
  if (frac && frac.d <= 100) return `${frac.n}/${frac.d}`;
  return Number(val.toPrecision(8)).toString();
}

export function formatNumberToLatex(val: number): string {
  if (!Number.isFinite(val)) return '\\text{غير معرف}';
  if (Math.abs(val) < 1e-12) return '0';
  const frac = toExactFraction(val, 500);
  if (frac) {
    if (frac.d === 1) return String(frac.n);
    return frac.n < 0 ? `-\\frac{${Math.abs(frac.n)}}{${frac.d}}` : `\\frac{${frac.n}}{${frac.d}}`;
  }
  // Check clean multiples of pi, e, ln(2)
  const piRatio = toExactFraction(val / Math.PI, 48);
  if (piRatio && Math.abs(piRatio.n) > 0 && piRatio.d <= 24) {
    const sign = piRatio.n < 0 ? '-' : '';
    const an = Math.abs(piRatio.n);
    const numStr = an === 1 ? '\\pi' : `${an}\\pi`;
    return piRatio.d === 1 ? `${sign}${numStr}` : `${sign}\\frac{${numStr}}{${piRatio.d}}`;
  }
  return Number(val.toPrecision(8)).toString();
}

interface InternalSolveResult {
  expr: ExprNode;
  methodUsed: IntegrationMethod;
  steps: SolutionStep[];
}

function splitConstFactor(node: ExprNode, v: string): { c: ExprNode; rest: ExprNode; cVal: number } {
  if (isConstant(node, v)) {
    return { c: node, rest: num(1), cVal: evaluate(node, {}) };
  }
  if (node.type === 'neg') {
    const inner = splitConstFactor(node.arg, v);
    return { c: simplify(neg(inner.c)), rest: inner.rest, cVal: -inner.cVal };
  }
  if (node.type === 'mul') {
    const consts: ExprNode[] = [];
    const vars: ExprNode[] = [];
    for (const a of node.args) {
      if (isConstant(a, v)) consts.push(a);
      else vars.push(a);
    }
    const cNode = consts.length === 0 ? num(1) : consts.length === 1 ? consts[0] : simplify(mul(...consts));
    const rNode = vars.length === 0 ? num(1) : vars.length === 1 ? vars[0] : simplify(mul(...vars));
    return { c: cNode, rest: rNode, cVal: evaluate(cNode, {}) };
  }
  if (node.type === 'div') {
    if (isConstant(node.den, v)) {
      const inner = splitConstFactor(node.num, v);
      return {
        c: simplify(div(inner.c, node.den)),
        rest: inner.rest,
        cVal: inner.cVal / evaluate(node.den, {}),
      };
    }
    const innerNum = splitConstFactor(node.num, v);
    return {
      c: innerNum.c,
      rest: simplify(div(innerNum.rest, node.den)),
      cVal: innerNum.cVal,
    };
  }
  return { c: num(1), rest: node, cVal: 1 };
}

function isLinearInVar(node: ExprNode, v: string): { a: number; b: number } | null {
  const poly = extractPolynomial(node, v);
  if (!poly) return null;
  const deg = polyDegree(poly);
  if (deg === 1) return { a: poly[1], b: poly[0] ?? 0 };
  if (deg <= 0) return null;
  return null;
}

function nodeContainsVar(node: ExprNode, v: string): boolean {
  return !isConstant(node, v);
}

// Expand products of polynomials or polynomial powers if numerator/denominator or simple product
function tryExpandPolynomialExpr(node: ExprNode, v: string): ExprNode | null {
  const poly = extractPolynomial(node, v);
  if (!poly) return null;
  return polyToExpr(poly, v);
}

// Try to expand (a + b) * c or (a + b) / c into sum of simpler terms
function tryDistributeSum(node: ExprNode, v: string): ExprNode[] | null {
  if (node.type === 'add') return node.args;
  if (node.type === 'div' && node.num.type === 'add') {
    return node.num.args.map((t) => simplify(div(t, node.den)));
  }
  if (node.type === 'mul') {
    const addIdx = node.args.findIndex((a) => a.type === 'add');
    if (addIdx !== -1) {
      const sumNode = node.args[addIdx] as Extract<ExprNode, { type: 'add' }>;
      const others = node.args.filter((_, idx) => idx !== addIdx);
      return sumNode.args.map((term) => simplify(mul(term, ...others)));
    }
  }
  return null;
}

// Extract ax^2 + bx + c coefficients from node if it is quadratic in v
function extractQuadratic(node: ExprNode, v: string): { a: number; b: number; c: number } | null {
  const p = extractPolynomial(node, v);
  if (!p || polyDegree(p) !== 2) return null;
  return { a: p[2], b: p[1] ?? 0, c: p[0] ?? 0 };
}

// ---------------------------------------------------------------------------
// 1. ELEMENTARY / DIRECT RULES
// ---------------------------------------------------------------------------
function tryElementary(node: ExprNode, v: string, depth = 0): InternalSolveResult | null {
  const s = simplify(node);
  const steps: SolutionStep[] = [];

  // Constant
  if (isConstant(s, v)) {
    const res = simplify(mul(s, vari(v)));
    steps.push({
      id: `const-${depth}`,
      title: 'قاعدة تكامل الثابت',
      rule: 'Constant Rule',
      explanation: 'تكامل أي مقدار ثابت بالنسبة للمتغير يساوي الثابت مضروباً في المتغير.',
      latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(res)}`,
    });
    return { expr: res, methodUsed: 'basic', steps };
  }

  // Pull constant factor out
  const { c, rest, cVal } = splitConstFactor(s, v);
  if (Math.abs(cVal - 1) > 1e-11 && !isConstant(rest, v)) {
    const inner = tryElementary(rest, v, depth + 1);
    if (inner) {
      const combined = simplify(mul(c, inner.expr));
      steps.push({
        id: `const-pull-${depth}`,
        title: 'إخراج العامل الثابت خارج التكامل',
        rule: 'Constant Multiple Rule',
        explanation: 'بما أن الثابت لا يعتمد على متغير التكامل، نخرجه أمام إشارة التكامل.',
        latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(c)} \\int ${toLatex(rest)}\\,d${v}`,
      });
      steps.push(...inner.steps);
      return { expr: combined, methodUsed: inner.methodUsed, steps };
    }
  }

  // x
  if (s.type === 'var' && s.name === v) {
    const res = simplify(div(pow(vari(v), num(2)), num(2)));
    steps.push({
      id: `var-pow1-${depth}`,
      title: 'قاعدة القوة الأساسية',
      rule: 'Power Rule',
      explanation: `نطبق قاعدة القوة $\\int ${v}^n\\,d${v} = \\frac{${v}^{n+1}}{n+1}$ حيث $n = 1$.`,
      latex: `\\int ${v}\\,d${v} = \\frac{${v}^{2}}{2}`,
    });
    return { expr: res, methodUsed: 'basic', steps };
  }

  // x^n (n constant)
  if (s.type === 'pow' && s.base.type === 'var' && s.base.name === v && isConstant(s.exp, v)) {
    const nVal = evaluate(s.exp, {});
    if (Math.abs(nVal + 1) < 1e-11) {
      const res = fn('ln', fn('abs', vari(v)));
      steps.push({
        id: `inv-x-${depth}`,
        title: 'تكامل مقلوب المتغير',
        rule: 'Logarithmic Rule',
        explanation: 'الحالة الخاصة لقاعدة القوة عندما يكون الأس $-1$ تعطي اللوغاريتم الطبيعي.',
        latex: `\\int ${v}^{-1}\\,d${v} = \\int \\frac{1}{${v}}\\,d${v} = \\ln\\left|${v}\\right|`,
      });
      return { expr: res, methodUsed: 'basic', steps };
    }
    const newExp = simplify(add(s.exp, num(1)));
    const res = simplify(div(pow(vari(v), newExp), newExp));
    steps.push({
      id: `pow-${depth}`,
      title: 'قاعدة القوة',
      rule: 'Power Rule',
      explanation: `نضيف 1 إلى الأس ثم نقسم على الأس الجديد.`,
      latex: `\\int ${toLatex(s)}\\,d${v} = \\frac{${v}^{${toLatex(newExp)}}}{${toLatex(newExp)}} = ${toLatex(res)}`,
    });
    return { expr: res, methodUsed: 'basic', steps };
  }

  // 1 / x or 1 / x^n
  if (s.type === 'div' && isConstant(s.num, v)) {
    const k = s.num;
    if (s.den.type === 'var' && s.den.name === v) {
      const res = simplify(mul(k, fn('ln', fn('abs', vari(v)))));
      steps.push({
        id: `div-x-${depth}`,
        title: 'القاعدة اللوغاريتمية',
        rule: 'Logarithmic Rule',
        explanation: 'تكامل مقلوب المتغير يعطي اللوغاريتم الطبيعي للقيمة المطلقة.',
        latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(res)}`,
      });
      return { expr: res, methodUsed: 'basic', steps };
    }
    if (s.den.type === 'pow' && s.den.base.type === 'var' && s.den.base.name === v && isConstant(s.den.exp, v)) {
      const nVal = evaluate(s.den.exp, {});
      if (Math.abs(nVal - 1) < 1e-11) {
        const res = simplify(mul(k, fn('ln', fn('abs', vari(v)))));
        return { expr: res, methodUsed: 'basic', steps: [{ id: `div-x1-${depth}`, title: 'القاعدة اللوغاريتمية', rule: 'Logarithmic Rule', explanation: 'تكامل $1/x$ يساوي $\\ln|x|$.', latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(res)}` }] };
      }
      const rewritten = simplify(mul(k, pow(vari(v), neg(s.den.exp))));
      const newExp = simplify(add(neg(s.den.exp), num(1)));
      const res = simplify(mul(k, div(pow(vari(v), newExp), newExp)));
      steps.push({
        id: `div-pow-${depth}`,
        title: 'تحويل المقام إلى أس سالب وتطبيق قاعدة القوة',
        rule: 'Negative Exponent + Power Rule',
        explanation: 'نرفع القوة من المقام إلى البسط بأس سالب ثم نطبق قاعدة القوة.',
        latex: `\\int ${toLatex(s)}\\,d${v} = \\int ${toLatex(rewritten)}\\,d${v} = ${toLatex(res)}`,
      });
      return { expr: res, methodUsed: 'basic', steps };
    }
    // 1 / sqrt(x)
    if (s.den.type === 'fn' && s.den.name === 'sqrt' && s.den.arg.type === 'var' && s.den.arg.name === v) {
      const res = simplify(mul(k, num(2), fn('sqrt', vari(v))));
      steps.push({
        id: `div-sqrt-${depth}`,
        title: 'تكامل مقلوب الجذر التربيعي',
        rule: 'Power Rule (n = -1/2)',
        explanation: 'نكتب $\\frac{1}{\\sqrt{x}} = x^{-1/2}$ ثم نطبق قاعدة القوة.',
        latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(res)}`,
      });
      return { expr: res, methodUsed: 'basic', steps };
    }
    // 1 / cos^2(x), 1 / sin^2(x), 1 / cosh^2(x), 1 / sinh^2(x)
    if (
      s.den.type === 'pow' &&
      s.den.exp.type === 'num' &&
      Math.abs(s.den.exp.value - 2) < 1e-11 &&
      s.den.base.type === 'fn'
    ) {
      const lin = isLinearInVar(s.den.base.arg, v);
      if (lin && Math.abs(lin.a) > 1e-12) {
        const aNode = makeRationalOrFloat(lin.a);
        const arg = s.den.base.arg;
        let core: ExprNode | null = null;
        if (s.den.base.name === 'cos') core = fn('tan', arg);
        else if (s.den.base.name === 'sin') core = neg(fn('cot', arg));
        else if (s.den.base.name === 'cosh') core = fn('tanh', arg);
        else if (s.den.base.name === 'sinh') core = neg(fn('coth', arg));
        if (core) {
          const res = simplify(mul(div(k, aNode), core));
          steps.push({
            id: `div-trig-sq-${depth}`,
            title: 'تكامل مقلوب مربع الدالة المثلثية',
            rule: 'Reciprocal Trig Square',
            explanation: 'مقلوب $\\cos^2$ هو $\\sec^2$ وتكامله $\\tan$، ومقلوب $\\sin^2$ هو $\\csc^2$ وتكامله $-\\cot$.',
            latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(res)}`,
          });
          return { expr: res, methodUsed: 'basic', steps };
        }
      }
    }
    // 1 / e^(ax + b)
    if (s.den.type === 'pow' && s.den.base.type === 'const' && s.den.base.name === 'e') {
      const lin = isLinearInVar(s.den.exp, v);
      if (lin && Math.abs(lin.a) > 1e-12) {
        const aNode = makeRationalOrFloat(lin.a);
        const res = simplify(neg(div(k, mul(aNode, s.den))));
        steps.push({
          id: `div-exp-lin-${depth}`,
          title: 'رفع الدالة الأسية من المقام بأس سالب',
          rule: 'Exponential Rule',
          explanation: 'نكتب $\\frac{1}{e^{u}} = e^{-u}$ ثم نكامل الدالة الأسية.',
          latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(res)}`,
        });
        return { expr: res, methodUsed: 'basic', steps };
      }
    }
  }

  // sqrt(x)
  if (s.type === 'fn' && s.name === 'sqrt' && s.arg.type === 'var' && s.arg.name === v) {
    const res = simplify(mul(makeRational(2, 3), pow(vari(v), makeRational(3, 2))));
    steps.push({
      id: `sqrt-x-${depth}`,
      title: 'تحويل الجذر إلى أس نسبي',
      rule: 'Power Rule (n = 1/2)',
      explanation: 'نحول الجذر التربيعي إلى $x^{1/2}$ ثم نطبق قاعدة القوة.',
      latex: `\\int \\sqrt{${v}}\\,d${v} = \\int ${v}^{1/2}\\,d${v} = \\frac{2}{3}${v}^{3/2}`,
    });
    return { expr: res, methodUsed: 'basic', steps };
  }

  // a^x or e^x
  if (s.type === 'pow' && isConstant(s.base, v) && s.exp.type === 'var' && s.exp.name === v) {
    if (s.base.type === 'const' && s.base.name === 'e') {
      steps.push({
        id: `exp-e-${depth}`,
        title: 'تكامل الدالة الأسية الطبيعية',
        rule: 'Exponential Rule',
        explanation: 'تكامل $e^x$ يساوي الدالة نفسها.',
        latex: `\\int e^{${v}}\\,d${v} = e^{${v}}`,
      });
      return { expr: s, methodUsed: 'basic', steps };
    }
    const res = simplify(div(s, fn('ln', s.base)));
    steps.push({
      id: `exp-a-${depth}`,
      title: 'تكامل الدالة الأسية ذات الأساس العام',
      rule: 'General Exponential Rule',
      explanation: 'تكامل $a^x$ يساوي $\\frac{a^x}{\\ln(a)}$.',
      latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(res)}`,
    });
    return { expr: res, methodUsed: 'basic', steps };
  }

  // Elementary trig / hyperbolic functions of bare variable v
  if (s.type === 'fn' && s.arg.type === 'var' && s.arg.name === v) {
    const x = vari(v);
    const matchDirect = (): { res: ExprNode; rule: string; expl: string; method?: IntegrationMethod } | null => {
      switch (s.name) {
        case 'sin':
          return { res: neg(fn('cos', x)), rule: 'Basic Trig', expl: 'تكامل دالة الجيب يساوي سالب جيب التمام.' };
        case 'cos':
          return { res: fn('sin', x), rule: 'Basic Trig', expl: 'تكامل دالة جيب التمام يساوي الجيب.' };
        case 'tan':
          return {
            res: neg(fn('ln', fn('abs', fn('cos', x)))),
            rule: 'Trig / Substitution',
            expl: 'بكتابة $\\tan(x) = \\frac{\\sin(x)}{\\cos(x)}$ وتعويض $u = \\cos(x)$ نحصل على $-\\ln|\\cos(x)|$.',
          };
        case 'cot':
          return {
            res: fn('ln', fn('abs', fn('sin', x))),
            rule: 'Trig / Substitution',
            expl: 'بكتابة $\\cot(x) = \\frac{\\cos(x)}{\\sin(x)}$ وتعويض $u = \\sin(x)$ نحصل على $\\ln|\\sin(x)|$.',
          };
        case 'sec':
          return {
            res: fn('ln', fn('abs', add(fn('sec', x), fn('tan', x)))),
            rule: 'Secant Integral',
            expl: 'بضرب البسط والمقام في $(\\sec x + \\tan x)$ وتعويض $u = \\sec x + \\tan x$.',
          };
        case 'csc':
          return {
            res: neg(fn('ln', fn('abs', add(fn('csc', x), fn('cot', x))))),
            rule: 'Cosecant Integral',
            expl: 'بضرب البسط والمقام في $(\\csc x + \\cot x)$ نحصل على $-\\ln|\\csc x + \\cot x|$.',
          };
        case 'sinh':
          return { res: fn('cosh', x), rule: 'Hyperbolic Rule', expl: 'تكامل الجيب الزائدي $\\sinh(x)$ يساوي $\\cosh(x)$.' , method: 'trig' };
        case 'cosh':
          return { res: fn('sinh', x), rule: 'Hyperbolic Rule', expl: 'تكامل جيب التمام الزائدي $\\cosh(x)$ يساوي $\\sinh(x)$.' , method: 'trig' };
        case 'tanh':
          return { res: fn('ln', fn('cosh', x)), rule: 'Hyperbolic Rule', expl: 'بكتابة $\\tanh(x) = \\frac{\\sinh(x)}{\\cosh(x)}$ نحصل على $\\ln(\\cosh(x))$.' , method: 'trig' };
        case 'coth':
          return { res: fn('ln', fn('abs', fn('sinh', x))), rule: 'Hyperbolic Rule', expl: 'بكتابة $\\coth(x) = \\frac{\\cosh(x)}{\\sinh(x)}$ نحصل على $\\ln|\\sinh(x)|$.' , method: 'trig' };
        case 'sech':
          return { res: fn('atan', fn('sinh', x)), rule: 'Hyperbolic Rule', expl: 'تكامل $\\operatorname{sech}(x)$ يساوي $\\arctan(\\sinh(x))$.' , method: 'trig' };
        case 'cbrt':
          return {
            res: mul(div(num(3), num(4)), pow(x, div(num(4), num(3)))),
            rule: 'Power Rule (Cube Root)',
            expl: 'نكتب $\\sqrt[3]{x} = x^{1/3}$ ثم نطبق قاعدة القوة لنحصل على $\\frac{3}{4} x^{4/3}$.',
          };
        case 'log2':
          return {
            res: div(sub(mul(x, fn('ln', x)), x), fn('ln', num(2))),
            rule: 'Logarithm Integration',
            expl: 'بتحويل الأساس $\\log_2(x) = \\frac{\\ln(x)}{\\ln(2)}$ نحصل على $\\frac{x\\ln(x) - x}{\\ln(2)}$.',
          };
        case 'asinh':
          return {
            res: sub(mul(x, fn('asinh', x)), fn('sqrt', add(pow(x, num(2)), num(1)))),
            rule: 'Inverse Hyperbolic IBP',
            expl: 'بالتكامل بالتجزئة مع $u = \\sinh^{-1}(x)$ و $dv = dx$ نحصل على $x\\sinh^{-1}(x) - \\sqrt{x^2 + 1}$.',
            method: 'parts',
          };
        case 'acosh':
          return {
            res: sub(mul(x, fn('acosh', x)), fn('sqrt', sub(pow(x, num(2)), num(1)))),
            rule: 'Inverse Hyperbolic IBP',
            expl: 'بالتكامل بالتجزئة مع $u = \\cosh^{-1}(x)$ و $dv = dx$ نحصل على $x\\cosh^{-1}(x) - \\sqrt{x^2 - 1}$.',
            method: 'parts',
          };
        case 'atanh':
          return {
            res: add(
              mul(x, fn('atanh', x)),
              mul(div(num(1), num(2)), fn('ln', fn('abs', sub(num(1), pow(x, num(2))))))
            ),
            rule: 'Inverse Hyperbolic IBP',
            expl: 'بالتكامل بالتجزئة مع $u = \\tanh^{-1}(x)$ و $dv = dx$ نحصل على $x\\tanh^{-1}(x) + \\frac{1}{2}\\ln|1 - x^2|$.',
            method: 'parts',
          };
        default:
          return null;
      }
    };
    const m = matchDirect();
    if (m) {
      const res = simplify(m.res);
      steps.push({
        id: `fn-direct-${s.name}-${depth}`,
        title: `تكامل الدالة ${s.name}`,
        rule: m.rule,
        explanation: m.expl,
        latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(res)}`,
      });
      return { expr: res, methodUsed: m.method ?? 'basic', steps };
    }
  }

  // sec^2(x), csc^2(x), sech^2(x), csch^2(x)
  if (
    s.type === 'pow' &&
    s.exp.type === 'num' &&
    Math.abs(s.exp.value - 2) < 1e-11 &&
    s.base.type === 'fn' &&
    s.base.arg.type === 'var' &&
    s.base.arg.name === v
  ) {
    const x = vari(v);
    let res: ExprNode | null = null;
    let expl = '';
    if (s.base.name === 'sec') {
      res = fn('tan', x);
      expl = 'مشتقة $\\tan(x)$ هي $\\sec^2(x)$، لذا فالتكامل هو $\\tan(x)$.';
    } else if (s.base.name === 'csc') {
      res = neg(fn('cot', x));
      expl = 'مشتقة $-\\cot(x)$ هي $\\csc^2(x)$.';
    } else if (s.base.name === 'sech') {
      res = fn('tanh', x);
      expl = 'مشتقة $\\tanh(x)$ هي $\\operatorname{sech}^2(x)$.';
    } else if (s.base.name === 'csch') {
      res = neg(fn('coth', x));
      expl = 'مشتقة $-\\coth(x)$ هي $\\operatorname{csch}^2(x)$.';
    }
    if (res) {
      steps.push({
        id: `sq-trig-${depth}`,
        title: 'قاعدة التكامل المثلثي التربيعي المباشر',
        rule: 'Direct Trig Derivative',
        explanation: expl,
        latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(res)}`,
      });
      return { expr: simplify(res), methodUsed: 'basic', steps };
    }
  }

  // sec(x)*tan(x) or csc(x)*cot(x)
  if (s.type === 'mul' && s.args.length === 2) {
    const [a, b] = s.args;
    if (a.type === 'fn' && b.type === 'fn' && nodeEquals(a.arg, b.arg) && a.arg.type === 'var' && a.arg.name === v) {
      const names = new Set([a.name, b.name]);
      if (names.has('sec') && names.has('tan')) {
        const res = fn('sec', vari(v));
        steps.push({
          id: `sec-tan-${depth}`,
          title: 'تكامل القاطع في الظل',
          rule: 'Direct Trig Rule',
          explanation: 'مشتقة $\\sec(x)$ هي $\\sec(x)\\tan(x)$.',
          latex: `\\int \\sec(${v})\\tan(${v})\\,d${v} = \\sec(${v})`,
        });
        return { expr: res, methodUsed: 'basic', steps };
      }
      if (names.has('csc') && names.has('cot')) {
        const res = neg(fn('csc', vari(v)));
        steps.push({
          id: `csc-cot-${depth}`,
          title: 'تكامل قاطع التمام في ظل التمام',
          rule: 'Direct Trig Rule',
          explanation: 'مشتقة $-\\csc(x)$ هي $\\csc(x)\\cot(x)$.',
          latex: `\\int \\csc(${v})\\cot(${v})\\,d${v} = -\\csc(${v})`,
        });
        return { expr: res, methodUsed: 'basic', steps };
      }
    }
  }

  // Inverse trig forms: 1/(x^2 + a^2) or 1/(a^2 + x^2), 1/sqrt(a^2 - x^2), 1/(x^2 - a^2)
  if (s.type === 'div' && isConstant(s.num, v)) {
    const k = s.num;
    // 1 / (x^2 + a^2) or 1 / (c2 * x^2 + c0)
    const qDen = extractPolynomial(s.den, v);
    if (qDen && polyDegree(qDen) === 2 && Math.abs(qDen[1]) < 1e-10) {
      const c2 = qDen[2];
      const c0 = qDen[0];
      if (c2 > 0 && c0 > 0) {
        // k / (c2 x^2 + c0) = (k/c2) / (x^2 + a^2) where a = sqrt(c0/c2)
        const aSq = c0 / c2;
        const a = Math.sqrt(aSq);
        const aNode = Number.isInteger(a) ? num(a) : simplify(fn('sqrt', makeRationalOrFloat(aSq)));
        const factor = simplify(div(k, mul(num(c2), aNode)));
        const res = simplify(mul(factor, fn('atan', simplify(div(vari(v), aNode)))));
        steps.push({
          id: `atan-form-${depth}`,
          title: 'تكامل دالة معكوس الظل (arctan)',
          rule: 'Inverse Tangent Formula',
          explanation: `نطبق القاعدة القياسية $\\int \\frac{1}{${v}^2 + a^2}\\,d${v} = \\frac{1}{a}\\arctan\\left(\\frac{${v}}{a}\\right)$ حيث $a = ${toLatex(aNode)}$.`,
          latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(res)}`,
        });
        return { expr: res, methodUsed: 'basic', steps };
      }
    }

    // 1 / sqrt(a^2 - b^2 x^2) -> arcsin
    if (s.den.type === 'fn' && s.den.name === 'sqrt') {
      const innerP = extractPolynomial(s.den.arg, v);
      if (innerP && polyDegree(innerP) === 2 && Math.abs(innerP[1]) < 1e-10) {
        const c2 = innerP[2];
        const c0 = innerP[0];
        if (c2 < 0 && c0 > 0) {
          const b = Math.sqrt(-c2);
          const a = Math.sqrt(c0);
          const bNode = Number.isInteger(b) ? num(b) : simplify(fn('sqrt', makeRationalOrFloat(-c2)));
          const aNode = Number.isInteger(a) ? num(a) : simplify(fn('sqrt', makeRationalOrFloat(c0)));
          const factor = simplify(div(k, bNode));
          const argNode = simplify(div(mul(bNode, vari(v)), aNode));
          const res = simplify(mul(factor, fn('asin', argNode)));
          steps.push({
            id: `asin-form-${depth}`,
            title: 'تكامل دالة معكوس الجيب (arcsin)',
            rule: 'Inverse Sine Formula',
            explanation: `نطبق القاعدة $\\int \\frac{1}{\\sqrt{a^2 - b^2 ${v}^2}}\\,d${v} = \\frac{1}{b}\\arcsin\\left(\\frac{b${v}}{a}\\right)$.`,
            latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(res)}`,
          });
          return { expr: res, methodUsed: 'basic', steps };
        }
      }
    }
  }

  // abs(x)
  if (s.type === 'fn' && s.name === 'abs' && s.arg.type === 'var' && s.arg.name === v) {
    const x = vari(v);
    const res = simplify(div(mul(x, fn('abs', x)), num(2)));
    steps.push({
      id: `abs-x-${depth}`,
      title: 'تكامل دالة القيمة المطلقة',
      rule: 'Absolute Value Integral',
      explanation: 'بقسمة المجال إلى $x \\ge 0$ و $x < 0$ نحصل على صيغة موحدة للقيمة المطلقة.',
      latex: `\\int \\left|${v}\\right|\\,d${v} = \\frac{${v}\\left|${v}\\right|}{2}`,
    });
    return { expr: res, methodUsed: 'basic', steps };
  }

  // 1 / (x * sqrt(±x^2 ± a^2))
  if (s.type === 'div' && isConstant(s.num, v) && s.den.type === 'mul' && s.den.args.length === 2) {
    const k = s.num;
    const [d1, d2] = s.den.args;
    const varPart = d1.type === 'var' && d1.name === v ? d1 : d2.type === 'var' && d2.name === v ? d2 : null;
    const sqrtPart = varPart === d1 ? d2 : varPart === d2 ? d1 : null;
    if (varPart && sqrtPart && sqrtPart.type === 'fn' && sqrtPart.name === 'sqrt') {
      const q = extractQuadratic(sqrtPart.arg, v);
      if (q && Math.abs(q.b) < 1e-10) {
        const x = vari(v);
        if (q.a > 0 && q.c < 0 && Math.abs(q.a - 1) < 1e-10) {
          const a = Math.sqrt(-q.c);
          const aNode = Number.isInteger(a) ? num(a) : simplify(fn('sqrt', makeRationalOrFloat(-q.c)));
          const res = simplify(mul(div(k, aNode), fn('asec', div(fn('abs', x), aNode))));
          steps.push({
            id: `asec-form-${depth}`,
            title: 'تكامل دالة معكوس القاطع (arcsec)',
            rule: 'Inverse Secant Formula',
            explanation: `نطبق القاعدة القياسية $\\int \\frac{1}{${v}\\sqrt{${v}^2 - a^2}}\\,d${v} = \\frac{1}{a}\\operatorname{arcsec}\\left(\\frac{|${v}|}{a}\\right)$.`,
            latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(res)}`,
          });
          return { expr: res, methodUsed: 'basic', steps };
        }
        if (q.c > 0 && Math.abs(Math.abs(q.a) - 1) < 1e-10) {
          const a = Math.sqrt(q.c);
          const aNode = Number.isInteger(a) ? num(a) : simplify(fn('sqrt', makeRationalOrFloat(q.c)));
          const res = simplify(mul(neg(div(k, aNode)), fn('ln', fn('abs', div(add(aNode, sqrtPart), x)))));
          steps.push({
            id: `x-sqrt-log-${depth}`,
            title: 'تكامل الكسر الجذري الخاص',
            rule: 'Standard Radical Integral',
            explanation: 'بالتعويض $x = \\frac{1}{t}$ أو التعويض المثلثي نحصل على الصيغة اللوغاريتمية المباشرة.',
            latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(res)}`,
          });
          return { expr: res, methodUsed: 'trig_sub', steps };
        }
      }
    }
  }

  // 1 / (a + b * e^(k x))
  if (s.type === 'div' && isConstant(s.num, v) && s.den.type === 'add' && s.den.args.length === 2) {
    const constTerm = s.den.args.find((t) => isConstant(t, v));
    const otherTerm = constTerm ? s.den.args.find((t) => t !== constTerm) : null;
    if (constTerm && otherTerm) {
      const aVal = evaluate(constTerm, {});
      const { cVal: bVal, rest } = splitConstFactor(otherTerm, v);
      if (
        rest.type === 'pow' &&
        rest.base.type === 'const' &&
        rest.base.name === 'e' &&
        Math.abs(aVal) > 1e-12 &&
        Math.abs(bVal) > 1e-12
      ) {
        const lin = isLinearInVar(rest.exp, v);
        if (lin && Math.abs(lin.a) > 1e-12) {
          const kNum = s.num;
          const aNode = makeRationalOrFloat(aVal);
          const kNode = makeRationalOrFloat(lin.a);
          // ∫ 1 / (a + b e^(kx)) dx = x/a - 1/(a k) ln|a + b e^(kx)|
          const res = simplify(
            mul(
              kNum,
              sub(div(vari(v), aNode), div(fn('ln', fn('abs', s.den)), mul(aNode, kNode)))
            )
          );
          steps.push({
            id: `exp-denom-${depth}`,
            title: 'مكاملة المقام الأسي بالضرب في الأسي السالب',
            rule: 'Exponential Rational Substitution',
            explanation: 'نضرب البسط والمقام في $e^{-kx}$ ثم نعوض $u = a e^{-kx} + b$.',
            latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(res)}`,
          });
          return { expr: res, methodUsed: 'substitution', steps };
        }
      }
    }
  }

  // 1 / (1 ± cos(ax)) or 1 / (1 ± sin(ax))
  if (s.type === 'div' && isConstant(s.num, v) && s.den.type === 'add' && s.den.args.length === 2) {
    const oneTerm = s.den.args.find((t) => isConstant(t, v) && Math.abs(evaluate(t, {}) - 1) < 1e-11);
    const trigTerm = oneTerm ? s.den.args.find((t) => t !== oneTerm) : null;
    if (oneTerm && trigTerm) {
      const { cVal: sgn, rest: trigFn } = splitConstFactor(trigTerm, v);
      if (
        Math.abs(Math.abs(sgn) - 1) < 1e-11 &&
        trigFn.type === 'fn' &&
        (trigFn.name === 'cos' || trigFn.name === 'sin')
      ) {
        const lin = isLinearInVar(trigFn.arg, v);
        if (lin && Math.abs(lin.a) > 1e-12) {
          const aNode = makeRationalOrFloat(lin.a);
          const u = trigFn.arg;
          let core: ExprNode;
          if (trigFn.name === 'cos') {
            // ∫ 1/(1 + cos u) du = tan(u/2) or -cot(u) + csc(u), ∫ 1/(1 - cos u) du = -cot(u) - csc(u)
            core =
              sgn > 0
                ? sub(fn('csc', u), fn('cot', u))
                : neg(add(fn('cot', u), fn('csc', u)));
          } else {
            core =
              sgn > 0
                ? sub(fn('tan', u), fn('sec', u))
                : add(fn('tan', u), fn('sec', u));
          }
          const res = simplify(mul(div(s.num, aNode), core));
          steps.push({
            id: `trig-conj-${depth}`,
            title: 'الضرب في المرافق المثلثي',
            rule: 'Trigonometric Conjugate',
            explanation: 'نضرب البسط والمقام في المرافق لتحويل المقام إلى $\\sin^2$ أو $\\cos^2$ ثم نكامل مباشرة.',
            latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(res)}`,
          });
          return { expr: res, methodUsed: 'trig', steps };
        }
      }
    }
  }

  return null;
}

function makeRationalOrFloat(val: number): ExprNode {
  const f = toExactFraction(val, 500);
  return f ? makeRational(f.n, f.d) : num(val);
}

// ---------------------------------------------------------------------------
// 2. U-SUBSTITUTION
// ---------------------------------------------------------------------------
function collectSubstitutionCandidates(node: ExprNode, v: string): ExprNode[] {
  const candidates: ExprNode[] = [];
  const addCand = (c: ExprNode) => {
    const sc = simplify(c);
    if (isConstant(sc, v)) return;
    if (sc.type === 'var' && sc.name === v) return;
    if (!candidates.some((ex) => nodeEquals(ex, sc))) {
      candidates.push(sc);
    }
  };

  const walk = (n: ExprNode) => {
    switch (n.type) {
      case 'fn':
        addCand(n.arg);
        if (n.name === 'ln' || n.name === 'sin' || n.name === 'cos' || n.name === 'tan' || n.name === 'sec' || n.name === 'atan' || n.name === 'asin') {
          addCand(n);
        }
        if (n.name === 'sqrt') {
          addCand(n);
          addCand(n.arg);
        }
        walk(n.arg);
        break;
      case 'pow':
        addCand(n.base);
        addCand(n.exp);
        if (n.base.type === 'const' && n.base.name === 'e') {
          addCand(n);
        }
        walk(n.base);
        walk(n.exp);
        break;
      case 'div':
        addCand(n.den);
        walk(n.num);
        walk(n.den);
        break;
      case 'neg':
        walk(n.arg);
        break;
      case 'add':
      case 'mul':
        n.args.forEach(walk);
        break;
      case 'call':
        n.args.forEach(walk);
        break;
    }
  };
  walk(node);
  return candidates;
}

// Check if expr can be rewritten cleanly as k * h(u) * du/dx
function tryMatchUSub(
  integrand: ExprNode,
  uExpr: ExprNode,
  v: string,
  uVar = 'u'
): { integrandInU: ExprNode; duExpr: ExprNode } | null {
  const du = differentiate(uExpr, v);
  if (du.type === 'num' && Math.abs(du.value) < 1e-12) return null;

  // Case A: uExpr is linear (ax + b), so x = (u - b) / a and dx = du / a
  const lin = isLinearInVar(uExpr, v);
  if (lin && Math.abs(lin.a) > 1e-12) {
    const aNode = makeRationalOrFloat(lin.a);
    const bNode = makeRationalOrFloat(lin.b);
    const xInU = simplify(div(sub(vari(uVar), bNode), aNode));
    const transformed = simplify(div(substitute(integrand, v, xInU), aNode));
    if (!nodeContainsVar(transformed, v)) {
      return { integrandInU: transformed, duExpr: du };
    }
  }

  // Case B: integrand is f'(u)/u or similar direct quotient with du
  // Test numerically whether ratio R(x) = integrand(x) / du(x) can be expressed purely as g(u(x))!
  // Symbolic structural replacement first:
  const quotient = simplify(div(integrand, du));

  // Direct replacement of uExpr -> vari(uVar) in quotient AST
  const replaced = simplify(replaceSubExpr(quotient, uExpr, vari(uVar)));
  if (!nodeContainsVar(replaced, v)) {
    return { integrandInU: replaced, duExpr: du };
  }

  // Also check if quotient is a rational/power/elementary function of u via symbolic matching of common structures:
  // e.g. integrand = x * sqrt(x^2 + 1), u = x^2 + 1 => du = 2x => quotient = (x * sqrt(x^2+1)) / (2x) = sqrt(u)/2
  // Handle polynomial factor cancellation between num and den of quotient:
  const cancelled = cancelCommonFactors(quotient, v);
  const replacedCancelled = simplify(replaceSubExpr(cancelled, uExpr, vari(uVar)));
  if (!nodeContainsVar(replacedCancelled, v)) {
    return { integrandInU: replacedCancelled, duExpr: du };
  }

  // Special case: u = sqrt(ax + b) => x = (u^2 - b)/a, dx = 2u/a du
  if (uExpr.type === 'fn' && uExpr.name === 'sqrt') {
    const innerLin = isLinearInVar(uExpr.arg, v);
    if (innerLin && Math.abs(innerLin.a) > 1e-12) {
      const aNode = makeRationalOrFloat(innerLin.a);
      const bNode = makeRationalOrFloat(innerLin.b);
      const xInU = simplify(div(sub(pow(vari(uVar), num(2)), bNode), aNode));
      const dxFactor = simplify(div(mul(num(2), vari(uVar)), aNode));
      const preReplaced = replaceSubExpr(integrand, uExpr, vari(uVar));
      const replacedAll = simplify(mul(substitute(preReplaced, v, xInU), dxFactor));
      const cleaned = simplify(
        replaceSubExpr(
          replaceSubExpr(replacedAll, fn('sqrt', simplify(add(mul(aNode, xInU), bNode))), vari(uVar)),
          fn('sqrt', pow(vari(uVar), num(2))),
          vari(uVar)
        )
      );
      if (!nodeContainsVar(cleaned, v)) {
        return { integrandInU: cleaned, duExpr: du };
      }
    }
  }

  // Special case: u = a*x^2 + b, quotient has x^k residual -> x^2 = (u - b)/a
  const uPoly = extractPolynomial(uExpr, v);
  if (uPoly && polyDegree(uPoly) === 2 && Math.abs(uPoly[1]) < 1e-10) {
    const a = uPoly[2];
    const b = uPoly[0];
    const cNode = cancelCommonFactors(quotient, v);
    const step1 = replaceSubExpr(cNode, uExpr, vari(uVar));
    const x2Expr = simplify(div(sub(vari(uVar), makeRationalOrFloat(b)), makeRationalOrFloat(a)));
    const step2 = simplify(replaceEvenPowersOfX(step1, v, x2Expr));
    if (!nodeContainsVar(step2, v)) {
      return { integrandInU: step2, duExpr: du };
    }
  }

  return null;
}

function replaceEvenPowersOfX(node: ExprNode, v: string, xSqReplacement: ExprNode): ExprNode {
  switch (node.type) {
    case 'pow':
      if (node.base.type === 'var' && node.base.name === v && node.exp.type === 'num' && Number.isInteger(node.exp.value) && node.exp.value >= 2 && node.exp.value % 2 === 0) {
        const k = node.exp.value / 2;
        return k === 1 ? xSqReplacement : pow(xSqReplacement, num(k));
      }
      return pow(replaceEvenPowersOfX(node.base, v, xSqReplacement), replaceEvenPowersOfX(node.exp, v, xSqReplacement));
    case 'neg':
      return neg(replaceEvenPowersOfX(node.arg, v, xSqReplacement));
    case 'fn':
      return fn(node.name, replaceEvenPowersOfX(node.arg, v, xSqReplacement));
    case 'call':
      return callFn(node.name, node.args.map((a) => replaceEvenPowersOfX(a, v, xSqReplacement)));
    case 'add':
      return add(...node.args.map((a) => replaceEvenPowersOfX(a, v, xSqReplacement)));
    case 'mul':
      return mul(...node.args.map((a) => replaceEvenPowersOfX(a, v, xSqReplacement)));
    case 'div':
      return div(
        replaceEvenPowersOfX(node.num, v, xSqReplacement),
        replaceEvenPowersOfX(node.den, v, xSqReplacement)
      );
    default:
      return node;
  }
}

function replaceSubExpr(node: ExprNode, target: ExprNode, replacement: ExprNode): ExprNode {
  if (nodeEquals(node, target)) return replacement;
  switch (node.type) {
    case 'neg':
      return neg(replaceSubExpr(node.arg, target, replacement));
    case 'fn':
      return fn(node.name, replaceSubExpr(node.arg, target, replacement));
    case 'call':
      return callFn(node.name, node.args.map((a) => replaceSubExpr(a, target, replacement)));
    case 'add':
      return add(...node.args.map((a) => replaceSubExpr(a, target, replacement)));
    case 'mul':
      return mul(...node.args.map((a) => replaceSubExpr(a, target, replacement)));
    case 'div':
      return div(
        replaceSubExpr(node.num, target, replacement),
        replaceSubExpr(node.den, target, replacement)
      );
    case 'pow':
      return pow(
        replaceSubExpr(node.base, target, replacement),
        replaceSubExpr(node.exp, target, replacement)
      );
    default:
      return node;
  }
}

function flattenMulFactors(node: ExprNode): ExprNode[] {
  const s = simplify(node);
  if (s.type === 'mul') return s.args;
  if (s.type === 'neg') return [num(-1), ...flattenMulFactors(s.arg)];
  return [s];
}

function cancelCommonFactors(node: ExprNode, v: string): ExprNode {
  const s = simplify(node);
  if (s.type !== 'div') return s;

  // Try exact polynomial division first if both num and den are polynomials
  const pNum = extractPolynomial(s.num, v);
  const pDen = extractPolynomial(s.den, v);
  if (pNum && pDen && polyDegree(pDen) >= 0) {
    const { quotient, remainder } = polyDiv(pNum, pDen);
    if (polyDegree(remainder) < 0) {
      return polyToExpr(quotient, v);
    }
  }

  // Factor cancellation on mul factors
  const numFactors = flattenMulFactors(s.num);
  const denFactors = flattenMulFactors(s.den);

  const numPowerMap: { base: ExprNode; exp: number; raw?: ExprNode }[] = [];
  let numCoeff = 1;
  for (const f of numFactors) {
    if (f.type === 'num') {
      numCoeff *= f.value;
    } else if (f.type === 'pow' && f.exp.type === 'num') {
      numPowerMap.push({ base: f.base, exp: f.exp.value });
    } else {
      numPowerMap.push({ base: f, exp: 1 });
    }
  }

  const denRemain: ExprNode[] = [];
  let denCoeff = 1;
  for (const f of denFactors) {
    if (f.type === 'num') {
      denCoeff *= f.value;
      continue;
    }
    const base = f.type === 'pow' && f.exp.type === 'num' ? f.base : f;
    const exp = f.type === 'pow' && f.exp.type === 'num' ? f.exp.value : 1;
    const match = numPowerMap.find((nf) => nodeEquals(nf.base, base));
    if (match) {
      if (match.exp >= exp) {
        match.exp -= exp;
      } else {
        const remExp = exp - match.exp;
        match.exp = 0;
        denRemain.push(remExp === 1 ? base : pow(base, num(remExp)));
      }
    } else {
      denRemain.push(f);
    }
  }

  const numRemain: ExprNode[] = [];
  for (const nf of numPowerMap) {
    if (Math.abs(nf.exp) < 1e-11) continue;
    numRemain.push(Math.abs(nf.exp - 1) < 1e-11 ? nf.base : pow(nf.base, num(nf.exp)));
  }

  const ratio = numCoeff / denCoeff;
  const frac = toExactFraction(ratio, 1000);
  const cNum = frac ? num(frac.n) : num(ratio);
  const cDen = frac && frac.d > 1 ? num(frac.d) : null;

  const topArgs = [...(Math.abs(ratio - 1) < 1e-11 && !cDen ? [] : [cNum]), ...numRemain];
  const botArgs = [...(cDen ? [cDen] : []), ...denRemain];

  const top = topArgs.length === 0 ? num(1) : topArgs.length === 1 ? topArgs[0] : mul(...topArgs);
  if (botArgs.length === 0) return simplify(top);
  const bot = botArgs.length === 1 ? botArgs[0] : mul(...botArgs);
  return simplify(div(top, bot));
}

function trySubstitution(node: ExprNode, v: string, depth = 0): InternalSolveResult | null {
  if (depth > 2) return null;
  const s = simplify(node);
  const candidates = collectSubstitutionCandidates(s, v);

  // Sort candidates: prefer non-linear u first if product is present, or linear inside fn
  candidates.sort((a, b) => {
    const da = extractPolynomial(a, v);
    const db = extractPolynomial(b, v);
    const scoreA = a.type === 'fn' ? 3 : da && polyDegree(da) >= 2 ? 2 : 1;
    const scoreB = b.type === 'fn' ? 3 : db && polyDegree(db) >= 2 ? 2 : 1;
    return scoreB - scoreA;
  });

  for (const uExpr of candidates) {
    const matched = tryMatchUSub(s, uExpr, v, 'u');
    if (!matched) continue;
    const { integrandInU, duExpr } = matched;

    // Solve integral in 'u'
    const inner = solveRecursive(integrandInU, 'u', 'auto', depth + 1);
    if (!inner) continue;

    const backSub = simplify(substitute(inner.expr, 'u', uExpr));
    // Verify derivative matches!
    if (!verifyAntiderivative(s, backSub, v)) continue;

    const steps: SolutionStep[] = [
      {
        id: `usub-choose-${depth}`,
        title: 'اختيار التعويض المناسب (u-Substitution)',
        rule: 'U-Substitution Setup',
        explanation: `نختار $u = ${toLatex(uExpr)}$ ومنه نشتق لإيجاد $du$ بدلالة $d${v}$.`,
        latex: `u = ${toLatex(uExpr)}, \\quad du = \\left(${toLatex(duExpr)}\\right) d${v} \\implies d${v} = \\frac{du}{${toLatex(duExpr)}}`,
      },
      {
        id: `usub-transform-${depth}`,
        title: 'إعادة كتابة التكامل بدلالة المتغير u',
        rule: 'Change of Variables',
        explanation: 'نعوض عن $u$ و $d${v}$ في التكامل الأصلي فنحصل على تكامل أبسط.',
        latex: `\\int ${toLatex(s)}\\,d${v} = \\int ${toLatex(integrandInU)}\\,du`,
      },
      ...inner.steps,
      {
        id: `usub-back-${depth}`,
        title: 'الرجوع إلى المتغير الأصلي',
        rule: 'Back-Substitution',
        explanation: `نعوض عن كل $u$ بقيمتها الأصلية $u = ${toLatex(uExpr)}$.`,
        latex: `${toLatex(inner.expr)} \\Big|_{u = ${toLatex(uExpr)}} = ${toLatex(backSub)}`,
      },
    ];

    return { expr: backSub, methodUsed: 'substitution', steps };
  }

  return null;
}

// ---------------------------------------------------------------------------
// 3. INTEGRATION BY PARTS (LIATE + TABULAR + CYCLIC)
// ---------------------------------------------------------------------------
function liateRank(node: ExprNode, v: string): number {
  if (node.type === 'fn') {
    if (node.name === 'ln' || node.name === 'log10') return 5; // L
    if (['asin', 'acos', 'atan', 'acsc', 'asec', 'acot'].includes(node.name)) return 4; // I
    if (['sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'sinh', 'cosh'].includes(node.name)) return 2; // T
  }
  if (node.type === 'pow') {
    if (node.base.type === 'const' || isConstant(node.base, v)) return 1; // E
    if (node.base.type === 'fn' && (node.base.name === 'ln' || node.base.name === 'log10')) return 5;
  }
  if (extractPolynomial(node, v)) return 3; // A
  return 0;
}

function tryIntegrationByParts(node: ExprNode, v: string, depth = 0): InternalSolveResult | null {
  if (depth > 3) return null;
  const s = simplify(node);

  // Pull constant factor out first
  const { c, rest, cVal } = splitConstFactor(s, v);
  if (Math.abs(cVal - 1) > 1e-11 && !isConstant(rest, v)) {
    const inner = tryIntegrationByParts(rest, v, depth + 1);
    if (inner) {
      return {
        expr: simplify(mul(c, inner.expr)),
        methodUsed: 'parts',
        steps: [
          {
            id: `ibp-const-${depth}`,
            title: 'إخراج الثابت قبل التجزئة',
            rule: 'Constant Multiple',
            explanation: 'نخرج المعامل الثابت خارج التكامل ثم نطبق التكامل بالتجزئة.',
            latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(c)} \\int ${toLatex(rest)}\\,d${v}`,
          },
          ...inner.steps,
        ],
      };
    }
  }

  // Case 1: Single L or I function (dv = 1 dx) e.g. ln(x), atan(x), asin(x), acos(x), ln(x)^n
  if (
    (s.type === 'fn' && ['ln', 'log10', 'asin', 'acos', 'atan'].includes(s.name)) ||
    (s.type === 'pow' &&
      s.base.type === 'fn' &&
      s.base.name === 'ln' &&
      s.exp.type === 'num' &&
      Number.isInteger(s.exp.value) &&
      s.exp.value >= 2 &&
      s.exp.value <= 5)
  ) {
    const uNode = s;
    const duNode = differentiate(uNode, v);
    const vNode = vari(v);
    const vdu = simplify(mul(vNode, duNode));
    const remIntegral = solveRecursive(vdu, v, 'auto', depth + 1);
    if (remIntegral) {
      const result = simplify(sub(mul(uNode, vNode), remIntegral.expr));
      const steps: SolutionStep[] = [
        {
          id: `ibp-single-setup-${depth}`,
          title: 'تطبيق التكامل بالتجزئة (u و dv)',
          rule: 'Integration by Parts (LIATE)',
          explanation: 'نختار الدالة نفسها كـ $u$ (لأنها لوغاريتمية أو مثلثية عكسية) ونأخذ $dv = d' + v + '$.',
          latex: `u = ${toLatex(uNode)} \\implies du = ${toLatex(duNode)}\\,d${v}, \\qquad dv = d${v} \\implies v = ${v}`,
        },
        {
          id: `ibp-single-formula-${depth}`,
          title: 'تطبيق صيغة التجزئة',
          rule: '∫u dv = uv − ∫v du',
          explanation: 'نعوض في القانون العام للتكامل بالتجزئة.',
          latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(simplify(mul(uNode, vNode)))} - \\int ${toLatex(vdu)}\\,d${v}`,
        },
        ...remIntegral.steps,
        {
          id: `ibp-single-done-${depth}`,
          title: 'تجميع ناتج التكامل بالتجزئة',
          rule: 'Final Assembly',
          explanation: 'نجمع الحد $uv$ مع ناتج التكامل المتبقي.',
          latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(result)}`,
        },
      ];
      return { expr: result, methodUsed: 'parts', steps };
    }
  }

  // Case 1b: sin(ln(x)) or cos(ln(x))
  if (
    s.type === 'fn' &&
    (s.name === 'sin' || s.name === 'cos') &&
    s.arg.type === 'fn' &&
    s.arg.name === 'ln' &&
    s.arg.arg.type === 'var' &&
    s.arg.arg.name === v
  ) {
    const x = vari(v);
    const lnx = s.arg;
    const res =
      s.name === 'sin'
        ? simplify(div(mul(x, sub(fn('sin', lnx), fn('cos', lnx))), num(2)))
        : simplify(div(mul(x, add(fn('sin', lnx), fn('cos', lnx))), num(2)));
    return {
      expr: res,
      methodUsed: 'parts',
      steps: [
        {
          id: `ibp-sinln-${depth}`,
          title: 'التكامل بالتجزئة الدوري لدالة مثلثية للوغاريتم',
          rule: 'Cyclic Integration by Parts',
          explanation: 'بتطبيق التكامل بالتجزئة مرتين (أو التعويض $u = \\ln x$ ثم التجزئة) يعود التكامل الأصلي ونحل المعادلة.',
          latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(res)}`,
        },
      ],
    };
  }

  // Case 2: Product of two (or more) factors — including quotient A / B treated as A * B^(-1)
  const productFactors: ExprNode[] | null =
    s.type === 'mul' && s.args.length >= 2
      ? s.args
      : s.type === 'div' && nodeContainsVar(s.num, v) && nodeContainsVar(s.den, v)
        ? [s.num, div(num(1), s.den)]
        : null;

  if (productFactors && productFactors.length >= 2) {
    // Check Cyclic: e^(ax) * sin(bx) or e^(ax) * cos(bx)
    if (productFactors.length === 2) {
      const [f1, f2] = productFactors;
      const expFactor =
        f1.type === 'pow' && f1.base.type === 'const' && f1.base.name === 'e'
          ? f1
          : f2.type === 'pow' && f2.base.type === 'const' && f2.base.name === 'e'
            ? f2
            : null;
      const trigFactor = expFactor === f1 ? f2 : expFactor === f2 ? f1 : null;
      if (
        expFactor &&
        trigFactor &&
        trigFactor.type === 'fn' &&
        (trigFactor.name === 'sin' || trigFactor.name === 'cos')
      ) {
        const linExp = isLinearInVar(expFactor.exp, v);
        const linTrig = isLinearInVar(trigFactor.arg, v);
        if (linExp && linTrig && Math.abs(linExp.b) < 1e-10 && Math.abs(linTrig.b) < 1e-10) {
          const a = linExp.a;
          const b = linTrig.a;
          const denom = a * a + b * b;
          const aNode = makeRationalOrFloat(a);
          const bNode = makeRationalOrFloat(b);
          const denomNode = makeRationalOrFloat(denom);
          const eax = expFactor;
          const bx = trigFactor.arg;

          // ∫ e^(ax) sin(bx) dx = e^(ax)/(a^2+b^2) * (a sin(bx) - b cos(bx))
          // ∫ e^(ax) cos(bx) dx = e^(ax)/(a^2+b^2) * (a cos(bx) + b sin(bx))
          const innerExpr =
            trigFactor.name === 'sin'
              ? sub(mul(aNode, fn('sin', bx)), mul(bNode, fn('cos', bx)))
              : add(mul(aNode, fn('cos', bx)), mul(bNode, fn('sin', bx)));
          const res = simplify(div(mul(eax, innerExpr), denomNode));

          const steps: SolutionStep[] = [
            {
              id: `ibp-cyclic-1-${depth}`,
              title: 'التكامل بالتجزئة الدوري (المرة الأولى)',
              rule: 'Cyclic Integration by Parts',
              explanation:
                'عند ضرب دالة أسية في دالة مثلثية، نطبق التكامل بالتجزئة مرتين حتى يعود التكامل الأصلي $I$ في الطرف الأيمن.',
              latex: `I = \\int ${toLatex(s)}\\,d${v}, \\quad \\text{نختار } u = ${toLatex(trigFactor)},\\; dv = ${toLatex(eax)}\\,d${v}`,
            },
            {
              id: `ibp-cyclic-2-${depth}`,
              title: 'التجزئة الثانية وحل المعادلة لـ I',
              rule: 'Solving for I',
              explanation: 'بعد تطبيق التجزئة مرتين، ننقل الحد المحتوي على $I$ إلى الطرف الأيسر ونقسم على المعامل.',
              latex: `\\left(1 + \\frac{${toLatex(pow(bNode, num(2)))}}{${toLatex(pow(aNode, num(2)))}}\\right) I = \\dots \\implies I = ${toLatex(res)}`,
            },
          ];
          return { expr: res, methodUsed: 'parts', steps };
        }
      }
    }

    // Standard LIATE split into u and dv
    const sorted = [...productFactors].sort((a, b) => liateRank(b, v) - liateRank(a, v));
    const uNode = sorted[0];
    const dvNode = sorted.length === 2 ? sorted[1] : simplify(mul(...sorted.slice(1)));

    // Tabular Integration by Parts when u is polynomial of degree <= 4 and dv is easily repeatable (e^(ax), sin(ax), cos(ax), sinh(ax), cosh(ax))
    const uPoly = extractPolynomial(uNode, v);
    if (uPoly && polyDegree(uPoly) >= 1 && polyDegree(uPoly) <= 4 && isRepeatedlyIntegrable(dvNode, v)) {
      const deg = polyDegree(uPoly);
      let currU: ExprNode = uNode;
      let currV: ExprNode = dvNode;
      const terms: ExprNode[] = [];
      const tableRows: string[] = [];

      let failed = false;
      for (let stepIdx = 0; stepIdx <= deg; stepIdx++) {
        const integratedV = integrateEasyUnit(currV, v);
        if (!integratedV) {
          failed = true;
          break;
        }
        currV = integratedV;
        const sign = stepIdx % 2 === 0 ? 1 : -1;
        const prod = simplify(mul(num(sign), currU, currV));
        terms.push(prod);
        tableRows.push(`${sign > 0 ? '+' : '-'} & ${toLatex(currU)} & ${toLatex(currV)}`);
        currU = differentiate(currU, v);
      }

      if (!failed) {
        const res = simplify(terms.length === 1 ? terms[0] : add(...terms));
        const steps: SolutionStep[] = [
          {
            id: `ibp-tab-setup-${depth}`,
            title: 'اختيار u و dv وفق قاعدة LIATE',
            rule: 'LIATE Priority Rule',
            explanation: `نختار كثير الحدود $u = ${toLatex(uNode)}$ (لأنه ينعدم بالاشتقاق بعد ${deg + 1} خطوات) والدالة $dv = ${toLatex(dvNode)}\\,d${v}$.`,
            latex: `u = ${toLatex(uNode)}, \\qquad dv = ${toLatex(dvNode)}\\,d${v}`,
          },
          {
            id: `ibp-tab-table-${depth}`,
            title: 'التكامل بالجدول (التجزئة المتكررة)',
            rule: 'Tabular Integration by Parts',
            explanation: 'نشتق عمود $u$ حتى الصفر ونكامل عمود $dv$ بالتوازي مع تناوب الإشارات $(+, -, +, \\dots)$.',
            latex: `\\begin{array}{c|c|c} \\text{الإشارة} & u \\text{ (اشتقاق)} & v \\text{ (تكامل)} \\\\ \\hline ${tableRows.join(' \\\\ ')} \\end{array}`,
          },
          {
            id: `ibp-tab-sum-${depth}`,
            title: 'جمع نواتج الأقطار',
            rule: 'Tabular Summation',
            explanation: 'نجمع حواصل الضرب القطرية بالإشارات المناسبة.',
            latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(res)}`,
          },
        ];
        return { expr: res, methodUsed: 'parts', steps };
      }
    }

    // Single step IBP: u = sorted[0], dv = rest
    const vIntegral = solveRecursive(dvNode, v, 'basic', depth + 1) ?? trySubstitution(dvNode, v, depth + 1);
    if (vIntegral) {
      const duNode = differentiate(uNode, v);
      const vNode = vIntegral.expr;
      const vdu = simplify(mul(vNode, duNode));
      const rem = solveRecursive(vdu, v, 'auto', depth + 1);
      if (rem) {
        const res = simplify(sub(mul(uNode, vNode), rem.expr));
        if (verifyAntiderivative(s, res, v)) {
          const steps: SolutionStep[] = [
            {
              id: `ibp-setup-${depth}`,
              title: 'اختيار u و dv (قاعدة LIATE)',
              rule: 'Integration by Parts',
              explanation: `حسب أولوية LIATE نختار $u = ${toLatex(uNode)}$ و $dv = ${toLatex(dvNode)}\\,d${v}$.`,
              latex: `u = ${toLatex(uNode)} \\implies du = ${toLatex(duNode)}\\,d${v}, \\qquad dv = ${toLatex(dvNode)}\\,d${v} \\implies v = ${toLatex(vNode)}`,
            },
            {
              id: `ibp-apply-${depth}`,
              title: 'تطبيق صيغة التكامل بالتجزئة',
              rule: '∫u dv = uv − ∫v du',
              explanation: 'نعوض في القانون ثم نكامل الحد المتبقي $\\int v\\,du$.',
              latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(simplify(mul(uNode, vNode)))} - \\int ${toLatex(vdu)}\\,d${v}`,
            },
            ...rem.steps,
            {
              id: `ibp-final-${depth}`,
              title: 'الناتج بعد التبسيط',
              rule: 'Simplification',
              explanation: 'نرتب الحدود للحصول على المشتقة العكسية النهائية.',
              latex: `= ${toLatex(res)}`,
            },
          ];
          return { expr: res, methodUsed: 'parts', steps };
        }
      }
    }
  }

  return null;
}

function isRepeatedlyIntegrable(node: ExprNode, v: string): boolean {
  if (node.type === 'pow' && node.base.type === 'const' && node.base.name === 'e' && isLinearInVar(node.exp, v)) {
    return true;
  }
  if (node.type === 'fn' && ['sin', 'cos', 'sinh', 'cosh'].includes(node.name) && isLinearInVar(node.arg, v)) {
    return true;
  }
  return false;
}

function integrateEasyUnit(node: ExprNode, v: string): ExprNode | null {
  const r = tryElementary(node, v, 99) ?? trySubstitution(node, v, 2);
  return r ? r.expr : null;
}

// ---------------------------------------------------------------------------
// 4. TRIGONOMETRIC & HYPERBOLIC INTEGRALS
// ---------------------------------------------------------------------------
function extractSinCosPowers(node: ExprNode, v: string): {
  coeff: number;
  arg: ExprNode;
  sinPow: number;
  cosPow: number;
} | null {
  const { cVal, rest } = splitConstFactor(node, v);
  const factors = rest.type === 'mul' ? rest.args : [rest];
  let sinPow = 0;
  let cosPow = 0;
  let arg: ExprNode | null = null;

  for (const f of factors) {
    let fnNode: ExprNode = f;
    let p = 1;
    if (f.type === 'pow' && f.exp.type === 'num' && Number.isInteger(f.exp.value) && f.exp.value > 0) {
      fnNode = f.base;
      p = f.exp.value;
    }
    if (fnNode.type !== 'fn' || (fnNode.name !== 'sin' && fnNode.name !== 'cos')) return null;
    if (!isLinearInVar(fnNode.arg, v)) return null;
    if (arg && !nodeEquals(arg, fnNode.arg)) return null;
    arg = fnNode.arg;
    if (fnNode.name === 'sin') sinPow += p;
    else cosPow += p;
  }

  if (!arg || (sinPow === 0 && cosPow === 0)) return null;
  return { coeff: cVal, arg, sinPow, cosPow };
}

function tryTrigIntegrals(node: ExprNode, v: string, depth = 0): InternalSolveResult | null {
  const s = simplify(node);

  // 1) sin^n(ax+b) * cos^m(ax+b)
  const sc = extractSinCosPowers(s, v);
  if (sc && (sc.sinPow >= 2 || sc.cosPow >= 2 || (sc.sinPow >= 1 && sc.cosPow >= 1))) {
    const lin = isLinearInVar(sc.arg, v);
    if (lin && Math.abs(lin.a) > 1e-12) {
      const aNode = makeRationalOrFloat(lin.a);
      const coeffNode = makeRationalOrFloat(sc.coeff);
      const u = sc.arg;
      const steps: SolutionStep[] = [];

      // Odd sin power -> save sin(u), convert sin^2 = 1 - cos^2, sub w = cos(u)
      if (sc.sinPow % 2 === 1 && sc.sinPow >= 1) {
        const k = (sc.sinPow - 1) / 2;
        const w = vari('w');
        // -coeff/a * (1 - w^2)^k * w^m dw
        const polyW = polyMul(
          polyPow([1, 0, -1], k),
          new Array(sc.cosPow).fill(0).concat([1])
        );
        const scaledPoly = polyW.map((c) => (-sc.coeff / lin.a) * c);
        const integrandW = polyToExpr(scaledPoly, 'w');
        const intW = solveRecursive(integrandW, 'w', 'auto', depth + 1);
        if (intW) {
          const finalExpr = simplify(substitute(intW.expr, 'w', fn('cos', u)));
          steps.push({
            id: `trig-odd-sin-${depth}`,
            title: 'فصل عامل جيب واستخدام المتطابقة الفيثاغورية',
            rule: 'Odd Power of Sine',
            explanation: `أس $\\sin$ فردي (${sc.sinPow})؛ نفصل $\\sin(${toLatex(u)})$ للمشتقة ونحول الباقي باستخدام $\\sin^2 = 1 - \\cos^2$.`,
            latex: `w = \\cos\\left(${toLatex(u)}\\right), \\quad dw = -${toLatex(aNode)}\\sin\\left(${toLatex(u)}\\right)d${v} \\implies \\int ${toLatex(integrandW)}\\,dw`,
          });
          steps.push({
            id: `trig-odd-sin-done-${depth}`,
            title: 'المكاملة والرجوع إلى cos',
            rule: 'Back-Substitution',
            explanation: 'نكامل كثير الحدود بدلالة $w$ ثم نعيد التعويض $w = \\cos(' + toLatex(u) + ')$.',
            latex: `= ${toLatex(finalExpr)}`,
          });
          return { expr: finalExpr, methodUsed: 'trig', steps };
        }
      }

      // Odd cos power -> save cos(u), convert cos^2 = 1 - sin^2, sub w = sin(u)
      if (sc.cosPow % 2 === 1 && sc.cosPow >= 1) {
        const k = (sc.cosPow - 1) / 2;
        const polyW = polyMul(
          polyPow([1, 0, -1], k),
          new Array(sc.sinPow).fill(0).concat([1])
        );
        const scaledPoly = polyW.map((c) => (sc.coeff / lin.a) * c);
        const integrandW = polyToExpr(scaledPoly, 'w');
        const intW = solveRecursive(integrandW, 'w', 'auto', depth + 1);
        if (intW) {
          const finalExpr = simplify(substitute(intW.expr, 'w', fn('sin', u)));
          steps.push({
            id: `trig-odd-cos-${depth}`,
            title: 'فصل عامل جيب التمام واستخدام المتطابقة الفيثاغورية',
            rule: 'Odd Power of Cosine',
            explanation: `أس $\\cos$ فردي (${sc.cosPow})؛ نفصل $\\cos(${toLatex(u)})$ للمشتقة ونحول الباقي باستخدام $\\cos^2 = 1 - \\sin^2$.`,
            latex: `w = \\sin\\left(${toLatex(u)}\\right), \\quad dw = ${toLatex(aNode)}\\cos\\left(${toLatex(u)}\\right)d${v} \\implies \\int ${toLatex(integrandW)}\\,dw`,
          });
          steps.push({
            id: `trig-odd-cos-done-${depth}`,
            title: 'المكاملة والرجوع إلى sin',
            rule: 'Back-Substitution',
            explanation: 'نكامل كثير الحدود بدلالة $w$ ثم نعيد التعويض.',
            latex: `= ${toLatex(finalExpr)}`,
          });
          return { expr: finalExpr, methodUsed: 'trig', steps };
        }
      }

      // Both even -> half-angle reduction for common powers (sin^2, cos^2, sin^4, cos^4, sin^2*cos^2)
      const twoU = simplify(mul(num(2), u));
      if (sc.sinPow === 2 && sc.cosPow === 0) {
        const reduced = simplify(mul(coeffNode, div(sub(num(1), fn('cos', twoU)), num(2))));
        const solved = solveRecursive(reduced, v, 'auto', depth + 1);
        if (solved) {
          steps.push({
            id: `trig-half-sin2-${depth}`,
            title: 'تطبيق متطابقة نصف الزاوية',
            rule: 'Half-Angle Identity',
            explanation: 'بما أن الأس زوجي، نستخدم $\\sin^2(\\theta) = \\frac{1 - \\cos(2\\theta)}{2}$.',
            latex: `\\int ${toLatex(s)}\\,d${v} = \\int ${toLatex(reduced)}\\,d${v}`,
          });
          steps.push(...solved.steps);
          return { expr: solved.expr, methodUsed: 'trig', steps };
        }
      }
      if (sc.cosPow === 2 && sc.sinPow === 0) {
        const reduced = simplify(mul(coeffNode, div(add(num(1), fn('cos', twoU)), num(2))));
        const solved = solveRecursive(reduced, v, 'auto', depth + 1);
        if (solved) {
          steps.push({
            id: `trig-half-cos2-${depth}`,
            title: 'تطبيق متطابقة نصف الزاوية',
            rule: 'Half-Angle Identity',
            explanation: 'بما أن الأس زوجي، نستخدم $\\cos^2(\\theta) = \\frac{1 + \\cos(2\\theta)}{2}$.',
            latex: `\\int ${toLatex(s)}\\,d${v} = \\int ${toLatex(reduced)}\\,d${v}`,
          });
          steps.push(...solved.steps);
          return { expr: solved.expr, methodUsed: 'trig', steps };
        }
      }
      if (sc.sinPow === 2 && sc.cosPow === 2) {
        // sin^2(u) cos^2(u) = (1 - cos(4u)) / 8
        const fourU = simplify(mul(num(4), u));
        const reduced = simplify(mul(coeffNode, div(sub(num(1), fn('cos', fourU)), num(8))));
        const solved = solveRecursive(reduced, v, 'auto', depth + 1);
        if (solved) {
          steps.push({
            id: `trig-half-s2c2-${depth}`,
            title: 'تطبيق متطابقة ضعف ونصف الزاوية',
            rule: 'Double & Half-Angle Identity',
            explanation: 'نستخدم $\\sin^2(u)\\cos^2(u) = \\frac{1}{4}\\sin^2(2u) = \\frac{1 - \\cos(4u)}{8}$.',
            latex: `\\int ${toLatex(s)}\\,d${v} = \\int ${toLatex(reduced)}\\,d${v}`,
          });
          steps.push(...solved.steps);
          return { expr: solved.expr, methodUsed: 'trig', steps };
        }
      }
      if (sc.sinPow === 4 && sc.cosPow === 0) {
        // (1 - cos(2u))^2 / 4 = (3/8 - 1/2 cos(2u) + 1/8 cos(4u))
        const fourU = simplify(mul(num(4), u));
        const reduced = simplify(
          mul(
            coeffNode,
            add(
              makeRational(3, 8),
              mul(makeRational(-1, 2), fn('cos', twoU)),
              mul(makeRational(1, 8), fn('cos', fourU))
            )
          )
        );
        const solved = solveRecursive(reduced, v, 'auto', depth + 1);
        if (solved) {
          steps.push({
            id: `trig-sin4-${depth}`,
            title: 'تخفيض الدرجة بمتطابقة نصف الزاوية مرتين',
            rule: 'Power Reduction Formula',
            explanation: 'نخفض $\\sin^4(u) = \\left(\\frac{1 - \\cos(2u)}{2}\\right)^2 = \\frac{3}{8} - \\frac{1}{2}\\cos(2u) + \\frac{1}{8}\\cos(4u)$.',
            latex: `\\int ${toLatex(s)}\\,d${v} = \\int ${toLatex(reduced)}\\,d${v}`,
          });
          steps.push(...solved.steps);
          return { expr: solved.expr, methodUsed: 'trig', steps };
        }
      }
      if (sc.cosPow === 4 && sc.sinPow === 0) {
        const fourU = simplify(mul(num(4), u));
        const reduced = simplify(
          mul(
            coeffNode,
            add(
              makeRational(3, 8),
              mul(makeRational(1, 2), fn('cos', twoU)),
              mul(makeRational(1, 8), fn('cos', fourU))
            )
          )
        );
        const solved = solveRecursive(reduced, v, 'auto', depth + 1);
        if (solved) {
          steps.push({
            id: `trig-cos4-${depth}`,
            title: 'تخفيض الدرجة بمتطابقة نصف الزاوية مرتين',
            rule: 'Power Reduction Formula',
            explanation: 'نخفض $\\cos^4(u) = \\left(\\frac{1 + \\cos(2u)}{2}\\right)^2 = \\frac{3}{8} + \\frac{1}{2}\\cos(2u) + \\frac{1}{8}\\cos(4u)$.',
            latex: `\\int ${toLatex(s)}\\,d${v} = \\int ${toLatex(reduced)}\\,d${v}`,
          });
          steps.push(...solved.steps);
          return { expr: solved.expr, methodUsed: 'trig', steps };
        }
      }
    }
  }

  // 2) tan^n(x) or sec^3(x) or tan^n(x) * sec^m(x)
  if (s.type === 'pow' && s.exp.type === 'num' && Number.isInteger(s.exp.value) && s.base.type === 'fn') {
    const n = s.exp.value;
    const arg = s.base.arg;
    const lin = isLinearInVar(arg, v);
    if (lin && s.base.name === 'tan' && n >= 2) {
      // tan^n(u) = tan^(n-2)(u) * (sec^2(u) - 1)
      const rewritten = simplify(
        sub(
          mul(pow(fn('tan', arg), num(n - 2)), pow(fn('sec', arg), num(2))),
          pow(fn('tan', arg), num(n - 2))
        )
      );
      const solved = solveRecursive(rewritten, v, 'auto', depth + 1);
      if (solved) {
        return {
          expr: solved.expr,
          methodUsed: 'trig',
          steps: [
            {
              id: `trig-tan-pow-${depth}`,
              title: 'استخدام متطابقة الظل والقاطع',
              rule: 'tan²(u) = sec²(u) − 1',
              explanation: 'نستبدل $\\tan^2$ بـ $\\sec^2 - 1$ لتسهيل التعويض $w = \\tan$.',
              latex: `\\int ${toLatex(s)}\\,d${v} = \\int ${toLatex(rewritten)}\\,d${v}`,
            },
            ...solved.steps,
          ],
        };
      }
    }
    if (lin && s.base.name === 'cot' && n >= 2) {
      const rewritten = simplify(
        sub(
          mul(pow(fn('cot', arg), num(n - 2)), pow(fn('csc', arg), num(2))),
          pow(fn('cot', arg), num(n - 2))
        )
      );
      const solved = solveRecursive(rewritten, v, 'auto', depth + 1);
      if (solved) {
        return {
          expr: solved.expr,
          methodUsed: 'trig',
          steps: [
            {
              id: `trig-cot-pow-${depth}`,
              title: 'استخدام متطابقة ظل التمام وقاطع التمام',
              rule: 'cot²(u) = csc²(u) − 1',
              explanation: 'نستبدل $\\cot^2$ بـ $\\csc^2 - 1$ لتسهيل التكامل.',
              latex: `\\int ${toLatex(s)}\\,d${v} = \\int ${toLatex(rewritten)}\\,d${v}`,
            },
            ...solved.steps,
          ],
        };
      }
    }
    if (lin && s.base.name === 'sec' && n >= 4 && n % 2 === 0) {
      // sec^(2k) = (1 + tan^2)^(k-1) * sec^2
      const k = n / 2 - 1;
      const expanded = simplify(mul(pow(add(num(1), pow(fn('tan', arg), num(2))), num(k)), pow(fn('sec', arg), num(2))));
      const solved = trySubstitution(expanded, v, depth + 1);
      if (solved) {
        return {
          expr: solved.expr,
          methodUsed: 'trig',
          steps: [
            {
              id: `trig-sec-even-${depth}`,
              title: 'فصل sec² واستخدام المتطابقة sec² = 1 + tan²',
              rule: 'Even Power of Secant',
              explanation: 'نفصل $\\sec^2$ لمشتقة الظل ونحول الباقي بدلالة $\\tan$.',
              latex: `\\int ${toLatex(s)}\\,d${v} = \\int ${toLatex(expanded)}\\,d${v}`,
            },
            ...solved.steps,
          ],
        };
      }
    }
    if (lin && s.base.name === 'csc' && n >= 4 && n % 2 === 0) {
      const k = n / 2 - 1;
      const expanded = simplify(mul(pow(add(num(1), pow(fn('cot', arg), num(2))), num(k)), pow(fn('csc', arg), num(2))));
      const solved = trySubstitution(expanded, v, depth + 1);
      if (solved) {
        return {
          expr: solved.expr,
          methodUsed: 'trig',
          steps: [
            {
              id: `trig-csc-even-${depth}`,
              title: 'فصل csc² واستخدام المتطابقة csc² = 1 + cot²',
              rule: 'Even Power of Cosecant',
              explanation: 'نفصل $\\csc^2$ لمشتقة ظل التمام ونحول الباقي بدلالة $\\cot$.',
              latex: `\\int ${toLatex(s)}\\,d${v} = \\int ${toLatex(expanded)}\\,d${v}`,
            },
            ...solved.steps,
          ],
        };
      }
    }
    if (lin && s.base.name === 'sec' && n === 3) {
      const aNode = makeRationalOrFloat(lin.a);
      const res = simplify(
        div(
          add(mul(fn('sec', arg), fn('tan', arg)), fn('ln', fn('abs', add(fn('sec', arg), fn('tan', arg))))),
          mul(num(2), aNode)
        )
      );
      return {
        expr: res,
        methodUsed: 'trig',
        steps: [
          {
            id: `trig-sec3-${depth}`,
            title: 'تكامل القاطع التكعيبي بالتجزئة الدورية',
            rule: 'Reduction Formula for sec³',
            explanation: 'نكامل $\\sec^3(u) = \\sec(u)\\cdot\\sec^2(u)$ بالتجزئة مع $u = \\sec$, $dv = \\sec^2$.',
            latex: `\\int \\sec^3(${toLatex(arg)})\\,d${v} = ${toLatex(res)}`,
          },
        ],
      };
    }
    if (lin && s.base.name === 'csc' && n === 3) {
      const aNode = makeRationalOrFloat(lin.a);
      const res = simplify(
        neg(
          div(
            add(mul(fn('csc', arg), fn('cot', arg)), fn('ln', fn('abs', add(fn('csc', arg), fn('cot', arg))))),
            mul(num(2), aNode)
          )
        )
      );
      return {
        expr: res,
        methodUsed: 'trig',
        steps: [
          {
            id: `trig-csc3-${depth}`,
            title: 'تكامل قاطع التمام التكعيبي بالتجزئة الدورية',
            rule: 'Reduction Formula for csc³',
            explanation: 'نكامل $\\csc^3(u)$ بالتجزئة الدورية المماثلة لـ $\\sec^3(u)$.',
            latex: `\\int \\csc^3(${toLatex(arg)})\\,d${v} = ${toLatex(res)}`,
          },
        ],
      };
    }
    if (lin && s.base.name === 'sinh' && n === 2) {
      const twoU = simplify(mul(num(2), arg));
      const rewritten = simplify(div(sub(fn('cosh', twoU), num(1)), num(2)));
      const solved = solveRecursive(rewritten, v, 'auto', depth + 1);
      if (solved) {
        return {
          expr: solved.expr,
          methodUsed: 'trig',
          steps: [
            {
              id: `hyp-sinh2-${depth}`,
              title: 'متطابقة نصف الزاوية الزائدية',
              rule: 'sinh²(u) = (cosh(2u) − 1)/2',
              explanation: 'نحول $\\sinh^2$ إلى $\\frac{\\cosh(2u) - 1}{2}$ ثم نكامل مباشرة.',
              latex: `\\int ${toLatex(s)}\\,d${v} = \\int ${toLatex(rewritten)}\\,d${v}`,
            },
            ...solved.steps,
          ],
        };
      }
    }
    if (lin && s.base.name === 'cosh' && n === 2) {
      const twoU = simplify(mul(num(2), arg));
      const rewritten = simplify(div(add(fn('cosh', twoU), num(1)), num(2)));
      const solved = solveRecursive(rewritten, v, 'auto', depth + 1);
      if (solved) {
        return {
          expr: solved.expr,
          methodUsed: 'trig',
          steps: [
            {
              id: `hyp-cosh2-${depth}`,
              title: 'متطابقة نصف الزاوية الزائدية',
              rule: 'cosh²(u) = (cosh(2u) + 1)/2',
              explanation: 'نحول $\\cosh^2$ إلى $\\frac{\\cosh(2u) + 1}{2}$ ثم نكامل مباشرة.',
              latex: `\\int ${toLatex(s)}\\,d${v} = \\int ${toLatex(rewritten)}\\,d${v}`,
            },
            ...solved.steps,
          ],
        };
      }
    }
  }

  // 3) Product-to-sum: sin(ax)cos(bx), sin(ax)sin(bx), cos(ax)cos(bx) with a != b
  if (s.type === 'mul' && s.args.length === 2) {
    const [f1, f2] = s.args;
    if (
      f1.type === 'fn' &&
      f2.type === 'fn' &&
      (f1.name === 'sin' || f1.name === 'cos') &&
      (f2.name === 'sin' || f2.name === 'cos')
    ) {
      const l1 = isLinearInVar(f1.arg, v);
      const l2 = isLinearInVar(f2.arg, v);
      if (l1 && l2 && Math.abs(l1.b) < 1e-10 && Math.abs(l2.b) < 1e-10 && Math.abs(l1.a - l2.a) > 1e-10) {
        const a = l1.a;
        const b = l2.a;
        const sumArg = simplify(mul(makeRationalOrFloat(a + b), vari(v)));
        const diffArg = simplify(mul(makeRationalOrFloat(a - b), vari(v)));
        let rewritten: ExprNode;
        let ruleText: string;

        if (f1.name === 'sin' && f2.name === 'cos') {
          rewritten = simplify(div(add(fn('sin', sumArg), fn('sin', diffArg)), num(2)));
          ruleText = '\\sin(A)\\cos(B) = \\frac{1}{2}[\\sin(A+B) + \\sin(A-B)]';
        } else if (f1.name === 'cos' && f2.name === 'sin') {
          rewritten = simplify(div(sub(fn('sin', sumArg), fn('sin', diffArg)), num(2)));
          ruleText = '\\cos(A)\\sin(B) = \\frac{1}{2}[\\sin(A+B) - \\sin(A-B)]';
        } else if (f1.name === 'sin' && f2.name === 'sin') {
          rewritten = simplify(div(sub(fn('cos', diffArg), fn('cos', sumArg)), num(2)));
          ruleText = '\\sin(A)\\sin(B) = \\frac{1}{2}[\\cos(A-B) - \\cos(A+B)]';
        } else {
          rewritten = simplify(div(add(fn('cos', diffArg), fn('cos', sumArg)), num(2)));
          ruleText = '\\cos(A)\\cos(B) = \\frac{1}{2}[\\cos(A-B) + \\cos(A+B)]';
        }

        const solved = solveRecursive(rewritten, v, 'auto', depth + 1);
        if (solved) {
          return {
            expr: solved.expr,
            methodUsed: 'trig',
            steps: [
              {
                id: `trig-p2s-${depth}`,
                title: 'تحويل جداء الدوال المثلثية إلى مجموع',
                rule: 'Product-to-Sum Identity',
                explanation: `نطبق متطابقة التحويل من جداء إلى مجموع: $${ruleText}$.`,
                latex: `\\int ${toLatex(s)}\\,d${v} = \\int ${toLatex(rewritten)}\\,d${v}`,
              },
              ...solved.steps,
            ],
          };
        }
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// 5. TRIGONOMETRIC SUBSTITUTION & COMPLETING THE SQUARE
// ---------------------------------------------------------------------------
function tryTrigSubstitution(node: ExprNode, v: string, depth = 0): InternalSolveResult | null {
  const s = simplify(node);
  const { c, rest, cVal } = splitConstFactor(s, v);

  // Pull constant factor
  if (Math.abs(cVal - 1) > 1e-11 && !isConstant(rest, v)) {
    const inner = tryTrigSubstitution(rest, v, depth + 1);
    if (inner) {
      return {
        expr: simplify(mul(c, inner.expr)),
        methodUsed: 'trig_sub',
        steps: [
          {
            id: `tsub-const-${depth}`,
            title: 'إخراج العامل الثابت',
            rule: 'Constant Multiple',
            explanation: 'نخرج الثابت قبل تطبيق التعويض المثلثي.',
            latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(c)} \\int ${toLatex(rest)}\\,d${v}`,
          },
          ...inner.steps,
        ],
      };
    }
  }

  const x = vari(v);

  // Pattern A: sqrt(a^2 - x^2) or sqrt(a^2 + x^2) or sqrt(x^2 - a^2) in numerator
  if (s.type === 'fn' && s.name === 'sqrt') {
    const q = extractQuadratic(s.arg, v);
    if (q) {
      const aCoeff = q.a;
      const bCoeff = q.b;
      const cCoeff = q.c;
      // Completing the square if b != 0: a x^2 + b x + c = a(x + b/(2a))^2 + (c - b^2/(4a))
      if (Math.abs(bCoeff) > 1e-10) {
        const shift = bCoeff / (2 * aCoeff);
        const uNode = simplify(add(x, makeRationalOrFloat(shift)));
        const remConst = cCoeff - (bCoeff * bCoeff) / (4 * aCoeff);
        const sqExpr = simplify(add(mul(makeRationalOrFloat(aCoeff), pow(vari('w'), num(2))), makeRationalOrFloat(remConst)));
        const innerRes = tryTrigSubstitution(fn('sqrt', sqExpr), 'w', depth + 1);
        if (innerRes) {
          const finalExpr = simplify(substitute(innerRes.expr, 'w', uNode));
          return {
            expr: finalExpr,
            methodUsed: 'trig_sub',
            steps: [
              {
                id: `tsub-comp-sq-${depth}`,
                title: 'إتمام المربع تحت الجذر',
                rule: 'Completing the Square',
                explanation: `نتمم المربع داخل الجذر لنكتب $w = ${toLatex(uNode)}$ وتصبح الصيغة قياسية.`,
                latex: `${toLatex(s.arg)} = ${toLatex(substitute(sqExpr, 'w', uNode))}`,
              },
              ...innerRes.steps,
              {
                id: `tsub-comp-back-${depth}`,
                title: 'الرجوع إلى المتغير الأصلي',
                rule: 'Back-Substitution',
                explanation: `نعوض $w = ${toLatex(uNode)}$.`,
                latex: `= ${toLatex(finalExpr)}`,
              },
            ],
          };
        }
      }

      // Case b == 0:
      if (Math.abs(bCoeff) < 1e-10) {
        // sqrt(a^2 - k^2 x^2) where aCoeff < 0, cCoeff > 0
        if (aCoeff < 0 && cCoeff > 0) {
          const k = Math.sqrt(-aCoeff);
          const a = Math.sqrt(cCoeff);
          const aNode = Number.isInteger(a) ? num(a) : simplify(fn('sqrt', makeRationalOrFloat(cCoeff)));
          const kNode = Number.isInteger(k) ? num(k) : simplify(fn('sqrt', makeRationalOrFloat(-aCoeff)));
          const kx = Math.abs(k - 1) < 1e-10 ? x : mul(kNode, x);
          const aSq = makeRationalOrFloat(cCoeff);
          // ∫ sqrt(a^2 - (kx)^2) dx = 1/(2k) * [ kx * sqrt(a^2 - k^2 x^2) + a^2 * arcsin(kx / a) ]
          const res = simplify(
            div(
              add(mul(kx, s), mul(aSq, fn('asin', simplify(div(kx, aNode))))),
              mul(num(2), kNode)
            )
          );
          return {
            expr: res,
            methodUsed: 'trig_sub',
            steps: [
              {
                id: `tsub-sin-${depth}`,
                title: 'التعويض المثلثي بالجيب (x = (a/k) sin θ)',
                rule: 'Trig Substitution: √(a² − x²)',
                explanation: `لإزالة الجذر $\\sqrt{${toLatex(aSq)} - ${toLatex(pow(kx, num(2)))}}$ نضع $${toLatex(kx)} = ${toLatex(aNode)}\\sin\\theta$.`,
                latex: `${toLatex(kx)} = ${toLatex(aNode)}\\sin\\theta \\implies d${v} = \\frac{${toLatex(aNode)}}{${toLatex(kNode)}}\\cos\\theta\\,d\\theta, \\quad \\sqrt{\\dots} = ${toLatex(aNode)}\\cos\\theta`,
              },
              {
                id: `tsub-sin-int-${depth}`,
                title: 'تكامل الدالة المثلثية الناتجة ثم الرجوع للمثلث القائم',
                rule: 'Back-Substitution via Right Triangle',
                explanation: 'نكامل $\\cos^2\\theta = \\frac{1 + \\cos(2\\theta)}{2}$ ونستبدل $\\theta = \\arcsin\\left(\\frac{' + toLatex(kx) + '}{' + toLatex(aNode) + '}\\right)$ و $\\cos\\theta = \\frac{\\sqrt{\\dots}}{' + toLatex(aNode) + '}$.',
                latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(res)}`,
              },
            ],
          };
        }

        // sqrt(k^2 x^2 + a^2) where aCoeff > 0, cCoeff > 0
        if (aCoeff > 0 && cCoeff > 0) {
          const k = Math.sqrt(aCoeff);
          const a = Math.sqrt(cCoeff);
          const kNode = Number.isInteger(k) ? num(k) : simplify(fn('sqrt', makeRationalOrFloat(aCoeff)));
          const aNode = Number.isInteger(a) ? num(a) : simplify(fn('sqrt', makeRationalOrFloat(cCoeff)));
          const kx = Math.abs(k - 1) < 1e-10 ? x : mul(kNode, x);
          const aSq = makeRationalOrFloat(cCoeff);
          // ∫ sqrt((kx)^2 + a^2) dx = 1/(2k) * [ kx * sqrt(...) + a^2 * ln(kx + sqrt(...)) ]
          const res = simplify(
            div(add(mul(kx, s), mul(aSq, fn('ln', add(kx, s)))), mul(num(2), kNode))
          );
          return {
            expr: res,
            methodUsed: 'trig_sub',
            steps: [
              {
                id: `tsub-tan-${depth}`,
                title: 'التعويض المثلثي بالظل (x = (a/k) tan θ)',
                rule: 'Trig Substitution: √(x² + a²)',
                explanation: `نضع $${toLatex(kx)} = ${toLatex(aNode)}\\tan\\theta$ فيتحول الجذر إلى $${toLatex(aNode)}\\sec\\theta$.`,
                latex: `${toLatex(kx)} = ${toLatex(aNode)}\\tan\\theta, \\quad \\int ${toLatex(s)}\\,d${v} \\to \\frac{${toLatex(aSq)}}{${toLatex(kNode)}} \\int \\sec^3\\theta\\,d\\theta`,
              },
              {
                id: `tsub-tan-done-${depth}`,
                title: 'مكاملة sec³θ والرجوع إلى المتغير الأصلي',
                rule: 'Back-Substitution',
                explanation: 'نستخدم صيغة $\\int\\sec^3\\theta\\,d\\theta$ ثم نعوض من المثلث القائم.',
                latex: `= ${toLatex(res)}`,
              },
            ],
          };
        }

        // sqrt(k^2 x^2 - a^2) where aCoeff > 0, cCoeff < 0
        if (aCoeff > 0 && cCoeff < 0) {
          const k = Math.sqrt(aCoeff);
          const aSqVal = -cCoeff;
          const a = Math.sqrt(aSqVal);
          const kNode = Number.isInteger(k) ? num(k) : simplify(fn('sqrt', makeRationalOrFloat(aCoeff)));
          const aNode = Number.isInteger(a) ? num(a) : simplify(fn('sqrt', makeRationalOrFloat(aSqVal)));
          const kx = Math.abs(k - 1) < 1e-10 ? x : mul(kNode, x);
          const aSq = makeRationalOrFloat(aSqVal);
          const res = simplify(
            div(sub(mul(kx, s), mul(aSq, fn('ln', fn('abs', add(kx, s))))), mul(num(2), kNode))
          );
          return {
            expr: res,
            methodUsed: 'trig_sub',
            steps: [
              {
                id: `tsub-sec-${depth}`,
                title: 'التعويض المثلثي بالقاطع (x = (a/k) sec θ)',
                rule: 'Trig Substitution: √(x² − a²)',
                explanation: `نضع $${toLatex(kx)} = ${toLatex(aNode)}\\sec\\theta$ فيصبح الجذر $${toLatex(aNode)}\\tan\\theta$.`,
                latex: `${toLatex(kx)} = ${toLatex(aNode)}\\sec\\theta \\implies \\int ${toLatex(s)}\\,d${v} = ${toLatex(res)}`,
              },
            ],
          };
        }
      }
    }
  }

  // Pattern B: 1 / sqrt(a x^2 + b x + c)
  if (s.type === 'div' && isConstant(s.num, v) && s.den.type === 'fn' && s.den.name === 'sqrt') {
    const q = extractQuadratic(s.den.arg, v);
    if (q) {
      const kNum = s.num;
      if (Math.abs(q.b) > 1e-10) {
        const shift = q.b / (2 * q.a);
        const uNode = simplify(add(x, makeRationalOrFloat(shift)));
        const remConst = q.c - (q.b * q.b) / (4 * q.a);
        const sqExpr = simplify(add(mul(makeRationalOrFloat(q.a), pow(vari('w'), num(2))), makeRationalOrFloat(remConst)));
        const innerRes = tryTrigSubstitution(div(kNum, fn('sqrt', sqExpr)), 'w', depth + 1);
        if (innerRes) {
          const finalExpr = simplify(substitute(innerRes.expr, 'w', uNode));
          return {
            expr: finalExpr,
            methodUsed: 'trig_sub',
            steps: [
              {
                id: `tsub-div-comp-${depth}`,
                title: 'إتمام المربع في المقام الجذري',
                rule: 'Completing the Square',
                explanation: `نكتب التعبير داخل الجذر بصورة مربع كامل بإزاحة $w = ${toLatex(uNode)}$.`,
                latex: `${toLatex(s.den.arg)} = ${toLatex(substitute(sqExpr, 'w', uNode))}`,
              },
              ...innerRes.steps,
            ],
          };
        }
      }
      // 1 / sqrt(k^2 x^2 ± a^2)
      if (Math.abs(q.b) < 1e-10 && q.a > 0) {
        const k = Math.sqrt(q.a);
        const kNode = Number.isInteger(k) ? num(k) : simplify(fn('sqrt', makeRationalOrFloat(q.a)));
        const kx = Math.abs(k - 1) < 1e-10 ? x : mul(kNode, x);
        const res = simplify(mul(div(kNum, kNode), fn('ln', fn('abs', add(kx, s.den)))));
        return {
          expr: res,
          methodUsed: 'trig_sub',
          steps: [
            {
              id: `tsub-div-tansec-${depth}`,
              title: 'التعويض المثلثي للمقام الجذري',
              rule: q.c > 0 ? 'x = (a/k) tan θ' : 'x = (a/k) sec θ',
              explanation: 'باستخدام التعويض المثلثي المناسب نحصل على تكامل $\\sec\\theta$ الذي يساوي اللوغاريتم الطبيعي.',
              latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(res)}`,
            },
          ],
        };
      }
    }
  }

  // Pattern C: 1 / (x^2 + bx + c) irreducible quadratic -> Completing the square + arctan!
  if (s.type === 'div') {
    const pNum = extractPolynomial(s.num, v);
    const qDen = extractQuadratic(s.den, v);
    if (pNum && qDen && polyDegree(pNum) <= 1) {
      const disc = qDen.b * qDen.b - 4 * qDen.a * qDen.c;
      if (disc < -1e-9 && Math.abs(qDen.b) > 1e-10) {
        // Complete the square: a x^2 + b x + c = a[(x + b/(2a))^2 + m^2]
        const a = qDen.a;
        const shift = qDen.b / (2 * a);
        const mSq = (4 * a * qDen.c - qDen.b * qDen.b) / (4 * a * a);
        const m = Math.sqrt(mSq);
        const mNode = Number.isInteger(m) ? num(m) : simplify(fn('sqrt', makeRationalOrFloat(mSq)));
        const uNode = simplify(add(x, makeRationalOrFloat(shift)));

        // Numerator = p1 * x + p0 = p1 * (u - shift) + p0 = p1 * u + (p0 - p1 * shift)
        const p1 = pNum[1] ?? 0;
        const p0 = pNum[0] ?? 0;
        const cRem = p0 - p1 * shift;
        const terms: ExprNode[] = [];
        if (Math.abs(p1) > 1e-10) {
          terms.push(
            simplify(
              mul(
                makeRationalOrFloat(p1 / (2 * a)),
                fn('ln', add(pow(uNode, num(2)), makeRationalOrFloat(mSq)))
              )
            )
          );
        }
        if (Math.abs(cRem) > 1e-10) {
          terms.push(
            simplify(
              mul(
                div(makeRationalOrFloat(cRem / a), mNode),
                fn('atan', simplify(div(uNode, mNode)))
              )
            )
          );
        }
        const res = simplify(terms.length === 1 ? terms[0] : add(...terms));
        return {
          expr: res,
          methodUsed: 'trig_sub',
          steps: [
            {
              id: `comp-sq-rat-${depth}`,
              title: 'إتمام المربع في المقام التربيعي غير القابل للتحليل',
              rule: 'Completing the Square',
              explanation: `المميز سالب ($\\Delta < 0$)؛ نكتب المقام على صورة مجموع مربعين بإزاحة $w = ${toLatex(uNode)}$.`,
              latex: `${toLatex(s.den)} = ${toLatex(simplify(mul(makeRationalOrFloat(a), add(pow(uNode, num(2)), makeRationalOrFloat(mSq)))))}`,
            },
            {
              id: `comp-sq-solve-${depth}`,
              title: 'تفكيك البسط ومكاملة اللوغاريتم ومعكوس الظل',
              rule: 'ln + arctan Integration',
              explanation: 'نفصل البسط إلى جزء مشتقة المقام (يعطي $\\ln$) وثابت (يعطي $\\arctan$).',
              latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(res)}`,
            },
          ],
        };
      }
    }
  }

  // Pattern D: x^2 / sqrt(a^2 - x^2) or 1 / (x^2 + a^2)^2 or 1 / (a^2 - x^2)^(3/2)
  if (s.type === 'div') {
    // 1 / (x^2 + a^2)^2
    if (
      isConstant(s.num, v) &&
      s.den.type === 'pow' &&
      s.den.exp.type === 'num' &&
      Math.abs(s.den.exp.value - 2) < 1e-10
    ) {
      const q = extractQuadratic(s.den.base, v);
      if (q && Math.abs(q.b) < 1e-10 && q.a > 0 && q.c > 0) {
        const k = s.num;
        const a2 = q.c / q.a;
        const a = Math.sqrt(a2);
        const aNode = Number.isInteger(a) ? num(a) : simplify(fn('sqrt', makeRationalOrFloat(a2)));
        const factor = simplify(div(k, makeRationalOrFloat(q.a * q.a)));
        // ∫ 1/(x^2 + a^2)^2 dx = 1/(2a^2) * [ x/(x^2+a^2) + 1/a * atan(x/a) ]
        const baseQuad = add(pow(x, num(2)), makeRationalOrFloat(a2));
        const res = simplify(
          mul(
            factor,
            div(
              add(div(x, baseQuad), div(fn('atan', simplify(div(x, aNode))), aNode)),
              makeRationalOrFloat(2 * a2)
            )
          )
        );
        return {
          expr: res,
          methodUsed: 'trig_sub',
          steps: [
            {
              id: `tsub-sq-den-${depth}`,
              title: 'التعويض المثلثي للمقام المربع (x = a tan θ)',
              rule: 'Trig Substitution: 1/(x²+a²)²',
              explanation: `نضع $${v} = ${toLatex(aNode)}\\tan\\theta$ فيتحول التكامل إلى $\\int \\cos^2\\theta\\,d\\theta$.`,
              latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(res)}`,
            },
          ],
        };
      }
    }

    // (p(x)) / sqrt(a^2 - x^2) where p(x) = x^2
    if (s.den.type === 'fn' && s.den.name === 'sqrt') {
      const pNum = extractPolynomial(s.num, v);
      const qDen = extractQuadratic(s.den.arg, v);
      if (pNum && polyDegree(pNum) === 2 && Math.abs(pNum[0]) < 1e-10 && Math.abs(pNum[1]) < 1e-10 && qDen && Math.abs(qDen.b) < 1e-10 && qDen.a < 0 && qDen.c > 0) {
        // c_num * x^2 / sqrt(a^2 - k^2 x^2)
        const cNum = pNum[2];
        const a = Math.sqrt(qDen.c);
        const k = Math.sqrt(-qDen.a);
        const aNode = Number.isInteger(a) ? num(a) : simplify(fn('sqrt', makeRationalOrFloat(qDen.c)));
        const kNode = Number.isInteger(k) ? num(k) : simplify(fn('sqrt', makeRationalOrFloat(-qDen.a)));
        // For k=1: x^2 / sqrt(a^2 - x^2) -> a^2/2 * arcsin(x/a) - x/2 * sqrt(a^2 - x^2)
        const res = simplify(
          mul(
            makeRationalOrFloat(cNum / (k * k * k)),
            div(
              sub(
                mul(makeRationalOrFloat(qDen.c), fn('asin', simplify(div(mul(kNode, x), aNode)))),
                mul(kNode, x, s.den)
              ),
              num(2)
            )
          )
        );
        return {
          expr: res,
          methodUsed: 'trig_sub',
          steps: [
            {
              id: `tsub-x2-sqrt-${depth}`,
              title: 'التعويض المثلثي x = (a/k) sin θ',
              rule: 'Trig Substitution',
              explanation: `نعوض $${v} = \\frac{${toLatex(aNode)}}{${toLatex(kNode)}}\\sin\\theta$ فيختصر الجذر مع $d${v}$ وتبقى $\\int \\sin^2\\theta\\,d\\theta$.`,
              latex: `\\int ${toLatex(s)}\\,d${v} = ${toLatex(res)}`,
            },
          ],
        };
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// 6. PARTIAL FRACTIONS FOR RATIONAL FUNCTIONS P(x) / Q(x)
// ---------------------------------------------------------------------------
function tryPartialFractions(node: ExprNode, v: string, depth = 0): InternalSolveResult | null {
  const s = simplify(node);
  if (s.type !== 'div') return null;

  const pNum = extractPolynomial(s.num, v);
  const pDen = extractPolynomial(s.den, v);
  if (!pNum || !pDen) return null;

  const degN = polyDegree(pNum);
  const degD = polyDegree(pDen);
  if (degD <= 0) return null;

  // If denominator is degree 1, simple u-sub / ln
  if (degD === 1) {
    const { quotient, remainder } = polyDiv(pNum, pDen);
    const steps: SolutionStep[] = [];
    const terms: ExprNode[] = [];

    if (polyDegree(quotient) >= 0) {
      const qExpr = polyToExpr(quotient, v);
      const qInt = tryElementary(qExpr, v, depth + 1);
      if (qInt) {
        terms.push(qInt.expr);
        steps.push({
          id: `pf-longdiv1-${depth}`,
          title: 'القسمة المطولة لكثيرات الحدود',
          rule: 'Polynomial Long Division',
          explanation: 'بما أن درجة البسط أكبر من أو تساوي درجة المقام، نجري القسمة المطولة أولاً.',
          latex: `${toLatex(s)} = ${toLatex(qExpr)} + \\frac{${toLatex(polyToExpr(remainder, v))}}{${toLatex(s.den)}}`,
        });
      }
    }

    if (polyDegree(remainder) >= 0) {
      const r0 = remainder[0];
      const a = pDen[1];
      const coeff = makeRationalOrFloat(r0 / a);
      const remTerm = simplify(mul(coeff, fn('ln', fn('abs', s.den))));
      terms.push(remTerm);
      steps.push({
        id: `pf-deg1-${depth}`,
        title: 'تكامل الكسر ذي المقام الخطي',
        rule: 'Linear Denominator Log Rule',
        explanation: 'مقام الكسر من الدرجة الأولى، لذا تكامله يعطي اللوغاريتم الطبيعي.',
        latex: `\\int \\frac{${toLatex(polyToExpr(remainder, v))}}{${toLatex(s.den)}}\\,d${v} = ${toLatex(remTerm)}`,
      });
    }

    const total = simplify(terms.length === 1 ? terms[0] : add(...terms));
    return { expr: total, methodUsed: 'partial_fractions', steps };
  }

  // Degree >= 2
  const steps: SolutionStep[] = [];
  const totalTerms: ExprNode[] = [];
  let remPoly = pNum;

  if (degN >= degD) {
    const { quotient, remainder } = polyDiv(pNum, pDen);
    remPoly = remainder;
    const qExpr = polyToExpr(quotient, v);
    const qInt = tryElementary(qExpr, v, depth + 1);
    if (qInt) totalTerms.push(qInt.expr);
    steps.push({
      id: `pf-longdiv-${depth}`,
      title: 'القسمة المطولة لكثيرات الحدود',
      rule: 'Polynomial Long Division',
      explanation: `درجة البسط (${degN}) $\\ge$ درجة المقام (${degD})؛ نقسم البسط على المقام للحصول على كثير حدود زائد كسر فعلي.`,
      latex: `${toLatex(s)} = ${toLatex(qExpr)} + \\frac{${toLatex(polyToExpr(remPoly, v))}}{${toLatex(s.den)}}`,
    });
    if (polyDegree(remPoly) < 0) {
      const res = simplify(totalTerms[0] ?? num(0));
      return { expr: res, methodUsed: 'partial_fractions', steps };
    }
  }

  const fact = factorPolynomial(pDen);
  if (!fact) {
    return null;
  }

  // Check if single irreducible quadratic factor with multiplicity 1 -> delegate to completing the square
  if (fact.factors.length === 1 && fact.factors[0].kind === 'quad' && fact.factors[0].multiplicity === 1) {
    return tryTrigSubstitution(s, v, depth);
  }

  // Build factored denominator poly representations
  const lead = fact.leadCoeff;
  // Scale remPoly by 1/lead so denominator is monic
  const monicRem = remPoly.map((c) => c / lead);

  interface BasisTerm {
    kind: 'linear' | 'quad-x' | 'quad-1';
    root?: number;
    p?: number;
    q?: number;
    power: number;
    polyWithout: Poly;
    label: string;
    denomLatex: string;
  }

  const factorPolys: { factor: typeof fact.factors[number]; fullPoly: Poly }[] = fact.factors.map((f) => {
    if (f.kind === 'linear') {
      return { factor: f, fullPoly: polyPow([-f.root, 1], f.multiplicity) };
    }
    return { factor: f, fullPoly: polyPow([f.q, f.p, 1], f.multiplicity) };
  });

  const basis: BasisTerm[] = [];
  let varIdx = 0;
  const coeffNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  for (let fi = 0; fi < factorPolys.length; fi++) {
    const { factor } = factorPolys[fi];
    // Product of all OTHER factors
    let othersPoly: Poly = [1];
    for (let fj = 0; fj < factorPolys.length; fj++) {
      if (fi !== fj) othersPoly = polyMul(othersPoly, factorPolys[fj].fullPoly);
    }

    if (factor.kind === 'linear') {
      const basePoly: Poly = [-factor.root, 1];
      const baseLatex = toLatex(polyToExpr(basePoly, v));
      for (let m = 1; m <= factor.multiplicity; m++) {
        const remFactorPower = polyPow(basePoly, factor.multiplicity - m);
        basis.push({
          kind: 'linear',
          root: factor.root,
          power: m,
          polyWithout: polyMul(othersPoly, remFactorPower),
          label: coeffNames[varIdx++] ?? `C_{${varIdx}}`,
          denomLatex: m === 1 ? baseLatex : `\\left(${baseLatex}\\right)^{${m}}`,
        });
      }
    } else {
      const basePoly: Poly = [factor.q, factor.p, 1];
      const baseLatex = toLatex(polyToExpr(basePoly, v));
      for (let m = 1; m <= factor.multiplicity; m++) {
        const remFactorPower = polyPow(basePoly, factor.multiplicity - m);
        const without = polyMul(othersPoly, remFactorPower);
        const lblX = coeffNames[varIdx++] ?? `C_{${varIdx}}`;
        const lblC = coeffNames[varIdx++] ?? `C_{${varIdx}}`;
        basis.push({
          kind: 'quad-x',
          p: factor.p,
          q: factor.q,
          power: m,
          polyWithout: polyMul(without, [0, 1]),
          label: lblX,
          denomLatex: m === 1 ? baseLatex : `\\left(${baseLatex}\\right)^{${m}}`,
        });
        basis.push({
          kind: 'quad-1',
          p: factor.p,
          q: factor.q,
          power: m,
          polyWithout: without,
          label: lblC,
          denomLatex: m === 1 ? baseLatex : `\\left(${baseLatex}\\right)^{${m}}`,
        });
      }
    }
  }

  const N = basis.length;
  const A: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  const bVec: number[] = new Array(N).fill(0);

  for (let row = 0; row < N; row++) {
    bVec[row] = monicRem[row] ?? 0;
    for (let col = 0; col < N; col++) {
      A[row][col] = basis[col].polyWithout[row] ?? 0;
    }
  }

  const coeffs = solveLinearSystem(A, bVec);
  if (!coeffs) return null;

  // Format factorization step
  const factLatexParts = factorPolys.map(({ factor }) => {
    if (factor.kind === 'linear') {
      const l = toLatex(polyToExpr([-factor.root, 1], v));
      return factor.multiplicity === 1 ? `\\left(${l}\\right)` : `\\left(${l}\\right)^{${factor.multiplicity}}`;
    }
    const q = toLatex(polyToExpr([factor.q, factor.p, 1], v));
    return factor.multiplicity === 1 ? `\\left(${q}\\right)` : `\\left(${q}\\right)^{${factor.multiplicity}}`;
  });
  const leadStr = Math.abs(lead - 1) < 1e-10 ? '' : formatNumberToLatex(lead);

  steps.push({
    id: `pf-factor-${depth}`,
    title: 'تحليل المقام إلى عوامله الأولية',
    rule: 'Denominator Factorization',
    explanation: 'نحلل المقام إلى عوامل خطية وعوامل تربيعية غير قابلة للتحليل.',
    latex: `${toLatex(s.den)} = ${leadStr}${factLatexParts.join('')}`,
  });

  // Template + solved constants
  const templateParts: string[] = [];
  const resolvedTermsLatex: string[] = [];
  const integratedTerms: ExprNode[] = [];

  for (let i = 0; i < basis.length; i++) {
    const bTerm = basis[i];
    if (bTerm.kind === 'linear') {
      templateParts.push(`\\frac{${bTerm.label}}{${bTerm.denomLatex}}`);
      const cVal = coeffs[i];
      if (Math.abs(cVal) < 1e-10) continue;
      const cNode = makeRationalOrFloat(cVal);
      const linExpr = polyToExpr([-bTerm.root!, 1], v);
      resolvedTermsLatex.push(`\\frac{${formatNumberToLatex(cVal)}}{${bTerm.denomLatex}}`);
      if (bTerm.power === 1) {
        integratedTerms.push(simplify(mul(cNode, fn('ln', fn('abs', linExpr)))));
      } else {
        const newPow = 1 - bTerm.power;
        integratedTerms.push(simplify(div(cNode, mul(num(newPow), pow(linExpr, num(bTerm.power - 1))))));
      }
    } else if (bTerm.kind === 'quad-x') {
      const nextTerm = basis[i + 1];
      templateParts.push(`\\frac{${bTerm.label}${v} + ${nextTerm.label}}{${bTerm.denomLatex}}`);
      const B = coeffs[i];
      const C = coeffs[i + 1];
      i++; // consume pair
      if (Math.abs(B) < 1e-10 && Math.abs(C) < 1e-10) continue;

      const numPoly = polyToExpr([C, B], v);
      const denPoly = polyToExpr([bTerm.q!, bTerm.p!, 1], v);
      resolvedTermsLatex.push(`\\frac{${toLatex(numPoly)}}{${bTerm.denomLatex}}`);

      if (bTerm.power === 1) {
        // Integrate (Bx + C) / (x^2 + px + q)
        const p = bTerm.p!;
        const q = bTerm.q!;
        // Derivative of denom is 2x + p -> B/2 * (2x + p) + (C - B*p/2)
        const lnCoeff = B / 2;
        const atanConst = C - (B * p) / 2;
        if (Math.abs(lnCoeff) > 1e-10) {
          integratedTerms.push(simplify(mul(makeRationalOrFloat(lnCoeff), fn('ln', denPoly))));
        }
        if (Math.abs(atanConst) > 1e-10) {
          const mSq = q - (p * p) / 4;
          const m = Math.sqrt(mSq);
          const mNode = Number.isInteger(m) ? num(m) : simplify(fn('sqrt', makeRationalOrFloat(mSq)));
          const shifted = simplify(add(vari(v), makeRationalOrFloat(p / 2)));
          integratedTerms.push(
            simplify(
              mul(
                div(makeRationalOrFloat(atanConst), mNode),
                fn('atan', simplify(div(shifted, mNode)))
              )
            )
          );
        }
      } else {
        // Fallback for repeated irreducible quadratic (e.g. 1/(x^2+a^2)^2)
        const subQuad = tryTrigSubstitution(div(numPoly, pow(denPoly, num(bTerm.power))), v, depth + 1);
        if (!subQuad) return null;
        integratedTerms.push(subQuad.expr);
      }
    }
  }

  const coeffAssignments = basis
    .map((b, idx) => `${b.label} = ${formatNumberToLatex(coeffs[idx])}`)
    .join(',\\; ');

  steps.push({
    id: `pf-setup-${depth}`,
    title: 'تفكيك الكسر إلى كسور جزئية وإيجاد الثوابت',
    rule: 'Partial Fraction Decomposition',
    explanation: 'نفرض الكسور الجزئية بثوابت مجهولة، ثم نوحد المقامات ونحل نظام المعادلات لإيجاد الثوابت.',
    latex: `\\frac{${toLatex(polyToExpr(remPoly, v))}}{${toLatex(s.den)}} = ${templateParts.join(' + ')} \\implies ${coeffAssignments}`,
  });

  const combinedIntegral = simplify(
    [...totalTerms, ...integratedTerms].length === 0
      ? num(0)
      : [...totalTerms, ...integratedTerms].length === 1
        ? [...totalTerms, ...integratedTerms][0]
        : add(...totalTerms, ...integratedTerms)
  );

  steps.push({
    id: `pf-integrate-${depth}`,
    title: 'مكاملة كل كسر جزئي على حدة',
    rule: 'Term-by-Term Integration',
    explanation: 'نكامل كل كسر جزئي باستخدام قواعد اللوغاريتم الطبيعي والقوى ومعكوس الظل.',
    latex: `\\int \\left(${resolvedTermsLatex.join(' + ')}\\right) d${v} = ${toLatex(combinedIntegral)}`,
  });

  return { expr: combinedIntegral, methodUsed: 'partial_fractions', steps };
}

// ---------------------------------------------------------------------------
// ORCHESTRATOR: solveRecursive
// ---------------------------------------------------------------------------
function solveRecursive(
  node: ExprNode,
  v: string,
  preferredMethod: IntegrationMethod,
  depth = 0
): InternalSolveResult | null {
  if (depth > 4) return null;
  const s = simplify(node);

  // If sum or distributable sum (and not a rational function suited for partial fractions directly), try linearity
  const distributed = tryDistributeSum(s, v);
  if (distributed && distributed.length > 1) {
    // Check if splitting makes sense (don't split a rational function's numerator before partial fractions if preferred is partial_fractions or if single irreducible denominator is better, EXCEPT polynomial / monomial)
    const isPolyOverPoly = s.type === 'div' && extractPolynomial(s.num, v) && extractPolynomial(s.den, v);
    const denDeg = isPolyOverPoly ? polyDegree(extractPolynomial((s as Extract<ExprNode, { type: 'div' }>).den, v)!) : 0;
    const shouldNotSplit =
      (preferredMethod === 'partial_fractions' && isPolyOverPoly && denDeg >= 2) ||
      (isPolyOverPoly && denDeg >= 2 && s.num.type === 'add');

    if (!shouldNotSplit) {
      const subResults: InternalSolveResult[] = [];
      let allOk = true;
      for (const term of distributed) {
        const r = solveRecursive(term, v, preferredMethod, depth + 1);
        if (!r) {
          allOk = false;
          break;
        }
        subResults.push(r);
      }
      if (allOk) {
        const summed = simplify(add(...subResults.map((r) => r.expr)));
        const usedMethods = new Set(subResults.map((r) => r.methodUsed));
        const primaryMethod: IntegrationMethod =
          preferredMethod !== 'auto'
            ? preferredMethod
            : usedMethods.size === 1
              ? subResults[0].methodUsed
              : usedMethods.has('parts')
                ? 'parts'
                : usedMethods.has('substitution')
                  ? 'substitution'
                  : 'basic';

        const steps: SolutionStep[] = [
          {
            id: `lin-${depth}`,
            title: 'تطبيق خاصية خطية التكامل',
            rule: 'Linearity of Integration',
            explanation: 'نفصل التكامل إلى مجموع وتطرح تكاملات الحدود المنفصلة لتسهيل الحل.',
            latex: `\\int ${toLatex(s)}\\,d${v} = ${distributed.map((d) => `\\int ${toLatex(d)}\\,d${v}`).join(' + ').replace(/\+\s*\\int\s*-/g, '- \\int ')}`,
          },
          ...subResults.flatMap((r) => r.steps),
        ];
        return { expr: summed, methodUsed: primaryMethod, steps };
      }
    }
  }

  // If product of polynomials like (x+1)(x-2) or (2x+1)^2, try expanding polynomial
  const expandedPoly = tryExpandPolynomialExpr(s, v);
  if (expandedPoly && !nodeEquals(expandedPoly, s) && (preferredMethod === 'auto' || preferredMethod === 'basic')) {
    const polyInt = solveRecursive(expandedPoly, v, 'basic', depth + 1);
    if (polyInt) {
      return {
        expr: polyInt.expr,
        methodUsed: 'basic',
        steps: [
          {
            id: `expand-poly-${depth}`,
            title: 'فك الأقواس وتبسيط كثير الحدود',
            rule: 'Algebraic Expansion',
            explanation: 'نفك الأقواس لتحويل المقدار إلى مجموع حدود جبرية بسيطة.',
            latex: `\\int ${toLatex(s)}\\,d${v} = \\int \\left(${toLatex(expandedPoly)}\\right) d${v}`,
          },
          ...polyInt.steps,
        ],
      };
    }
  }

  // Build strategy order based on preferredMethod
  type Strategy = () => InternalSolveResult | null;
  const strategies: Record<Exclude<IntegrationMethod, 'auto' | 'numerical'>, Strategy> = {
    basic: () => tryElementary(s, v, depth),
    substitution: () => trySubstitution(s, v, depth),
    trig: () => tryTrigIntegrals(s, v, depth),
    partial_fractions: () => tryPartialFractions(s, v, depth),
    trig_sub: () => tryTrigSubstitution(s, v, depth),
    parts: () => tryIntegrationByParts(s, v, depth),
  };

  const order: Array<Exclude<IntegrationMethod, 'auto' | 'numerical'>> =
    preferredMethod !== 'auto' && preferredMethod !== 'numerical'
      ? [
          preferredMethod,
          ...(['basic', 'substitution', 'trig', 'partial_fractions', 'trig_sub', 'parts'] as const).filter(
            (m) => m !== preferredMethod
          ),
        ]
      : ['basic', 'partial_fractions', 'trig', 'substitution', 'trig_sub', 'parts'];

  for (const key of order) {
    const res = strategies[key]();
    if (res && verifyAntiderivative(s, res.expr, v)) {
      return res;
    }
  }

  return null;
}

// Evaluate antiderivative limit at finite or infinite bound
function evalAntiderivativeAtBound(
  antideriv: ExprNode,
  v: string,
  bound: BoundValue
): { value: number; latex: string } {
  if (bound.value === '+inf') {
    const probes = [100, 1000, 10000];
    const vals = probes.map((p) => evaluate(antideriv, { [v]: p }));
    if (vals.every(Number.isFinite) && Math.abs(vals[2] - vals[1]) < 1e-4) {
      const clean = Math.abs(vals[2]) < 1e-10 ? 0 : vals[2];
      return { value: clean, latex: formatNumberToLatex(clean) };
    }
    return { value: NaN, latex: '\\lim_{' + v + ' \\to \\infty} F(' + v + ')' };
  }
  if (bound.value === '-inf') {
    const probes = [-100, -1000, -10000];
    const vals = probes.map((p) => evaluate(antideriv, { [v]: p }));
    if (vals.every(Number.isFinite) && Math.abs(vals[2] - vals[1]) < 1e-4) {
      const clean = Math.abs(vals[2]) < 1e-10 ? 0 : vals[2];
      return { value: clean, latex: formatNumberToLatex(clean) };
    }
    return { value: NaN, latex: '\\lim_{' + v + ' \\to -\\infty} F(' + v + ')' };
  }

  let val = evaluate(antideriv, { [v]: bound.value });
  // One-sided limit fallback if exact bound hits log(0) or division by zero
  if (!Number.isFinite(val)) {
    const eps = 1e-9;
    const right = evaluate(antideriv, { [v]: bound.value + eps });
    const left = evaluate(antideriv, { [v]: bound.value - eps });
    if (Number.isFinite(right)) val = right;
    else if (Number.isFinite(left)) val = left;
  }
  const clean = Math.abs(val) < 1e-12 ? 0 : val;
  const subExpr = simplify(substitute(antideriv, v, bound.node ?? num(bound.value)));
  return { value: clean, latex: toLatex(subExpr) };
}

function detectSpecialFunctionIntegral(
  rawExpr: string,
  v: string
): { latex: string; rule: string; explanation: string } | null {
  const s = rawExpr.toLowerCase().replace(/\s+/g, '').replaceAll(v.toLowerCase(), 'x');
  if (s === 'e^(-x^2)' || s === 'exp(-x^2)' || s === 'e^(-(x^2))') {
    return {
      latex: `\\frac{\\sqrt{\\pi}}{2}\\operatorname{erf}\\left(${v}\\right) + C`,
      rule: 'Gaussian Error Function (erf)',
      explanation:
        'وفق مبرهنة ليوفيل لا توجد مشتقة عكسية أولية لهذا التكامل الغاوسي، ويُعرَّف تحليلياً بدالة الخطأ الخاصة $\\operatorname{erf}$ وبمتسلسلة القوى.',
    };
  }
  if (s === 'e^(x^2)' || s === 'exp(x^2)') {
    return {
      latex: `\\frac{\\sqrt{\\pi}}{2}\\operatorname{erfi}\\left(${v}\\right) + C`,
      rule: 'Imaginary Error Function (erfi)',
      explanation:
        'لا توجد مشتقة عكسية أولية مغلقة، ويُعبَّر عن التكامل بدالة الخطأ التخيلية $\\operatorname{erfi}$ وبمتسلسلة تايلور.',
    };
  }
  if (s === 'sin(x)/x') {
    return {
      latex: `\\operatorname{Si}\\left(${v}\\right) + C`,
      rule: 'Sine Integral (Si)',
      explanation:
        'يُعرَّف تكامل $\\frac{\\sin(x)}{x}$ تحليلياً بدالة التكامل الجيبي الخاصة $\\operatorname{Si}$ مع مفكوك متسلسلة القوى.',
    };
  }
  if (s === 'cos(x)/x') {
    return {
      latex: `\\operatorname{Ci}\\left(${v}\\right) + C`,
      rule: 'Cosine Integral (Ci)',
      explanation:
        'يُعرَّف تكامل $\\frac{\\cos(x)}{x}$ تحليلياً بدالة التكامل التجيبية الخاصة $\\operatorname{Ci}$.',
    };
  }
  if (s === 'e^x/x' || s === 'exp(x)/x') {
    return {
      latex: `\\operatorname{Ei}\\left(${v}\\right) + C`,
      rule: 'Exponential Integral (Ei)',
      explanation:
        'يُعرَّف تكامل $\\frac{e^x}{x}$ تحليلياً بالدالة الأسية التكاملية الخاصة $\\operatorname{Ei}$.',
    };
  }
  if (s === '1/ln(x)' || s === '1/log(x)') {
    return {
      latex: `\\operatorname{li}\\left(${v}\\right) + C`,
      rule: 'Logarithmic Integral (li)',
      explanation:
        'يُعرَّف تكامل $\\frac{1}{\\ln(x)}$ تحليلياً بدالة التكامل اللوغاريتمي الخاصة $\\operatorname{li}$.',
    };
  }
  if (s === 'sin(x^2)') {
    return {
      latex: `\\sqrt{\\frac{\\pi}{2}}\\,S\\!\\left(\\sqrt{\\frac{2}{\\pi}}\\,${v}\\right) + C`,
      rule: 'Fresnel Sine Integral (S)',
      explanation:
        'يُعرَّف تكامل فرينل الجيبي $\\int \\sin(x^2)\\,dx$ بدالة فرينل الخاصة $S(x)$ وبمتسلسلة القوى.',
    };
  }
  if (s === 'cos(x^2)') {
    return {
      latex: `\\sqrt{\\frac{\\pi}{2}}\\,C\\!\\left(\\sqrt{\\frac{2}{\\pi}}\\,${v}\\right) + C`,
      rule: 'Fresnel Cosine Integral (C)',
      explanation:
        'يُعرَّف تكامل فرينل التجيبي $\\int \\cos(x^2)\\,dx$ بدالة فرينل الخاصة $C(x)$ وبمتسلسلة القوى.',
    };
  }
  return null;
}

export function solveIntegral(req: SolveIntegralRequest): IntegrationResult {
  const variable = (req.variable?.trim() || 'x').toLowerCase();
  const preferredMethod: IntegrationMethod = req.method ?? 'auto';
  const warnings: string[] = [];

  let integrand: ExprNode;
  try {
    integrand = parseExpr(req.expression);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'تعذر قراءة التعبير الرياضي.',
      isDefinite: req.isDefinite,
      variable,
      integrandText: req.expression,
      integrandLatex: req.expression,
      integralLatex: '',
      methodUsed: preferredMethod,
      methodLabel: METHOD_LABELS[preferredMethod],
      steps: [],
      warnings: [],
    };
  }

  const vars = getVariables(integrand);
  if (vars.size > 1 || (vars.size === 1 && !vars.has(variable))) {
    const otherVars = [...vars].filter((x) => x !== variable);
    if (otherVars.length > 0 && !vars.has(variable)) {
      warnings.push(`التعبير لا يحتوي على المتغير ${variable}، لذا يُعامل كقيمة ثابتة بالنسبة لـ ${variable}.`);
    } else if (otherVars.length > 0) {
      warnings.push(`تم اعتبار الرموز (${otherVars.join(', ')}) ثوابت بالنسبة لمتغير التكامل ${variable}.`);
    }
  }

  const integrandLatex = toLatex(integrand);
  let lowerBound: BoundValue | undefined;
  let upperBound: BoundValue | undefined;

  if (req.isDefinite) {
    try {
      lowerBound = parseBound(req.lowerBound ?? '0');
      upperBound = parseBound(req.upperBound ?? '1');
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'حدود التكامل غير صالحة.',
        isDefinite: true,
        variable,
        integrandText: req.expression,
        integrandLatex,
        integralLatex: `\\int ${integrandLatex}\\,d${variable}`,
        methodUsed: preferredMethod,
        methodLabel: METHOD_LABELS[preferredMethod],
        steps: [],
        warnings,
      };
    }
  }

  const integralLatex = req.isDefinite
    ? `\\int_{${lowerBound!.latex}}^{${upperBound!.latex}} ${integrandLatex}\\,d${variable}`
    : `\\int ${integrandLatex}\\,d${variable}`;

  // Pure Numerical Mode requested on Definite Integral
  if (req.isDefinite && preferredMethod === 'numerical') {
    const numRes = integrateNumerical(integrand, variable, lowerBound!.value, upperBound!.value);
    if (numRes.singularityWarning) warnings.push(numRes.singularityWarning);

    const steps: SolutionStep[] = [];
    let simpsonData: IntegrationResult['simpsonData'];

    if (typeof lowerBound!.value === 'number' && typeof upperBound!.value === 'number') {
      const simp = simpsonComposite(integrand, variable, lowerBound!.value, upperBound!.value, 8);
      simpsonData = { h: simp.h, n: 8, samples: simp.samples, value: simp.value };
      steps.push({
        id: 'num-simpson-setup',
        title: 'تقسيم فترة التكامل (قاعدة سمبسون المركبة n = 8)',
        rule: "Composite Simpson's Rule",
        explanation: `نقسم الفترة $[${lowerBound!.latex}, ${upperBound!.latex}]$ إلى $n = 8$ فترات جزئية متساوية عرض كل منها $\\Delta ${variable} = h$.`,
        latex: `h = \\frac{b - a}{n} = \\frac{${formatNumberToLatex(upperBound!.value)} - ${formatNumberToLatex(lowerBound!.value)}}{8} = ${formatNumberClean(simp.h)}`,
      });
      steps.push({
        id: 'num-simpson-sum',
        title: 'حساب المجموع الموزون (أوزان 1, 4, 2, ..., 1)',
        rule: 'Simpson Weighted Sum',
        explanation: 'نطبق صيغة سمبسون ثم نُدقق النتيجة باستخدام تكامل غاوس-كرونرود التكيفي ذي الـ 15 نقطة.',
        latex: `S_8 = \\frac{h}{3}\\left[f(x_0) + 4f(x_1) + 2f(x_2) + \\dots + f(x_8)\\right] \\approx ${formatNumberClean(simp.value)}`,
      });
    }

    steps.push({
      id: 'num-gk-final',
      title: 'القيمة العددية الدقيقة (غاوس-كرونرود 15 نقطة)',
      rule: 'Adaptive Gauss-Kronrod Quadrature',
      explanation: 'تُحسب القيمة العددية النهائية بدقة عالية مع تقدير للخطأ العددي.',
      latex: `${integralLatex} \\approx ${Number.isFinite(numRes.value) ? Number(numRes.value.toPrecision(10)) : '\\text{غير متقارب}'}`,
    });

    return {
      ok: Number.isFinite(numRes.value),
      error: Number.isFinite(numRes.value) ? undefined : numRes.singularityWarning || 'تعذر تقريب التكامل عددياً.',
      isDefinite: true,
      variable,
      integrandText: req.expression,
      integrandLatex,
      integralLatex,
      methodUsed: 'numerical',
      methodLabel: METHOD_LABELS.numerical,
      definiteNumericValue: numRes.value,
      definiteExactLatex: formatNumberToLatex(numRes.value),
      numericalErrorEstimate: numRes.errorEstimate,
      simpsonData,
      steps,
      warnings,
      lowerBound,
      upperBound,
    };
  }

  // Try symbolic integration
  const symbolic = preferredMethod === 'numerical' ? null : solveRecursive(integrand, variable, preferredMethod, 0);

  // Indefinite Integral Case
  if (!req.isDefinite) {
    if (!symbolic) {
      const special = detectSpecialFunctionIntegral(req.expression, variable);
      const taylor = computeTaylorAntiderivative(integrand, variable, 9);

      if (special || taylor) {
        const steps: SolutionStep[] = [];
        if (special) {
          steps.push({
            id: 'non-elem-special',
            title: 'التعبير باستخدام الدوال الرياضية الخاصة',
            rule: special.rule,
            explanation: special.explanation,
            latex: `${integralLatex} = ${special.latex}`,
          });
        } else {
          steps.push({
            id: 'non-elem-liouville',
            title: 'تحليل الدالة وعدم وجود صيغة أولية مغلقة',
            rule: "Liouville's Theorem",
            explanation:
              'هذه الدالة متصلة وقابلة للتكامل، لكنها لا تملك مشتقة عكسية في صورة دوال أولية مغلقة؛ لذلك نستخدم مفكوك متسلسلة القوى (تايلور) والتكامل العددي المباشر.',
            latex: `F(${variable}) = \\int_{${taylor!.x0}}^{${variable}} ${integrandLatex}\\,dt + C`,
          });
        }

        if (taylor) {
          steps.push({
            id: 'non-elem-taylor-f',
            title: `نشر الدالة بمتسلسلة تايلور حول x₀ = ${taylor.x0}`,
            rule: 'Taylor Series Expansion',
            explanation: `نحسب المشتقات المتتالية عند المركز $${variable}_0 = ${taylor.x0}$ لتمثيل الدالة على هيئة كثير حدود متسلسل.`,
            latex: `${integrandLatex} = ${taylor.integrandLatex}`,
          });
          steps.push({
            id: 'non-elem-taylor-int',
            title: 'مكاملة متسلسلة القوى حداً بحد',
            rule: 'Term-by-Term Power Series Integration',
            explanation: 'نكامل كل حد من حدود المتسلسلة باستخدام قاعدة القوة لإيجاد صيغة تقريب تحليلية عالية الدقة.',
            latex: `${integralLatex} \\approx ${taylor.antiderivLatex}`,
          });
        }

        const primaryLatex = special ? special.latex : taylor!.antiderivLatex;
        return {
          ok: true,
          nonElementary: true,
          isDefinite: false,
          variable,
          integrandText: req.expression,
          integrandLatex,
          integralLatex,
          methodUsed: preferredMethod === 'auto' ? 'numerical' : preferredMethod,
          methodLabel: special ? 'الدوال الخاصة ومتسلسلة القوى' : 'متسلسلة تايلور والتكامل العددي',
          antiderivativeLatex: primaryLatex,
          specialFunctionLatex: special?.latex,
          taylorSeries: taylor ?? undefined,
          steps,
          warnings,
        };
      }

      return {
        ok: false,
        nonElementary: true,
        error:
          'الدالة غير متصلة أو غير معرفة عند نقاط الاختبار؛ يمكنك تحديد فترة معرفة في وضع "تكامل محدود" لحسابها عددياً.',
        isDefinite: false,
        variable,
        integrandText: req.expression,
        integrandLatex,
        integralLatex,
        methodUsed: preferredMethod,
        methodLabel: METHOD_LABELS[preferredMethod],
        steps: [],
        warnings,
      };
    }

    const antiLatex = toLatex(symbolic.expr);
    const steps = [...symbolic.steps];
    steps.push({
      id: 'indef-constant-c',
      title: 'إضافة ثابت التكامل غير المحدود (+ C)',
      rule: 'Constant of Integration',
      explanation: 'لأن مشتقة أي ثابت تساوي صفراً، نضيف ثابت التكامل الاختياري $C$ في النتيجة النهائية.',
      latex: `${integralLatex} = ${antiLatex} + C`,
    });

    return {
      ok: true,
      isDefinite: false,
      variable,
      integrandText: req.expression,
      integrandLatex,
      integralLatex,
      methodUsed: symbolic.methodUsed,
      methodLabel: METHOD_LABELS[symbolic.methodUsed],
      antiderivative: symbolic.expr,
      antiderivativeLatex: `${antiLatex} + C`,
      steps,
      warnings,
    };
  }

  // Definite Integral Case (with symbolic antiderivative OR numerical fallback)
  const numCheck: NumericalResult = integrateNumerical(
    integrand,
    variable,
    lowerBound!.value,
    upperBound!.value
  );
  if (numCheck.singularityWarning) warnings.push(numCheck.singularityWarning);

  if (symbolic) {
    const F = symbolic.expr;
    const Fb = evalAntiderivativeAtBound(F, variable, upperBound!);
    const Fa = evalAntiderivativeAtBound(F, variable, lowerBound!);
    const symDiff = Fb.value - Fa.value;

    // Cross-validate F(b) - F(a) against adaptive Gauss-Kronrod
    const agreesWithNumeric =
      Number.isFinite(symDiff) &&
      Number.isFinite(numCheck.value) &&
      Math.abs(symDiff - numCheck.value) <= Math.max(1e-3, 1e-2 * Math.abs(numCheck.value));

    if (agreesWithNumeric) {
      const steps: SolutionStep[] = [
        ...symbolic.steps,
        {
          id: 'ftc-bounds',
          title: 'تطبيق المبرهنة الأساسية للتفاضل والتكامل',
          rule: 'Fundamental Theorem of Calculus',
          explanation: `نعوض بحدي التكامل العلوي $b = ${upperBound!.latex}$ والسفلي $a = ${lowerBound!.latex}$ في المشتقة العكسية $F(${variable})$.`,
          latex: `\\Big[ ${toLatex(F)} \\Big]_{${lowerBound!.latex}}^{${upperBound!.latex}} = F\\left(${upperBound!.latex}\\right) - F\\left(${lowerBound!.latex}\\right)`,
        },
        {
          id: 'ftc-eval',
          title: 'حساب القيمة النهائية للتكامل المحدود',
          rule: 'Definite Evaluation',
          explanation: 'نحسب الفرق بين القيمتين للحصول على النتيجة الدقيقة.',
          latex: `= \\left(${Fb.latex}\\right) - \\left(${Fa.latex}\\right) = ${formatNumberToLatex(symDiff)} \\approx ${Number(symDiff.toPrecision(8))}`,
        },
      ];

      return {
        ok: true,
        isDefinite: true,
        variable,
        integrandText: req.expression,
        integrandLatex,
        integralLatex,
        methodUsed: symbolic.methodUsed,
        methodLabel: METHOD_LABELS[symbolic.methodUsed],
        antiderivative: F,
        antiderivativeLatex: toLatex(F),
        definiteNumericValue: symDiff,
        definiteExactLatex: formatNumberToLatex(symDiff),
        numericalErrorEstimate: numCheck.errorEstimate,
        steps,
        warnings,
        lowerBound,
        upperBound,
      };
    }

    // If symbolic F(b) - F(a) disagrees (e.g., branch cut or singularity inside [a, b]), trust numerical check if converged
    if (Number.isFinite(numCheck.value) && numCheck.converged) {
      warnings.push('تنبيه: توجد نقطة تفرع أو تغير إشارة داخل الفترة؛ تم التحقق عددياً لضمان دقة النتيجة.');
      const steps: SolutionStep[] = [
        ...symbolic.steps,
        {
          id: 'num-branch-verify',
          title: 'التحقق العددي على كامل فترة التكامل',
          rule: 'Adaptive Quadrature Verification',
          explanation: 'نحسب القيمة العددية المباشرة لتجنب انقطاع الدالة المشتقة العكسية داخل الفترة.',
          latex: `${integralLatex} \\approx ${Number(numCheck.value.toPrecision(10))}`,
        },
      ];
      return {
        ok: true,
        isDefinite: true,
        variable,
        integrandText: req.expression,
        integrandLatex,
        integralLatex,
        methodUsed: symbolic.methodUsed,
        methodLabel: METHOD_LABELS[symbolic.methodUsed],
        antiderivative: F,
        antiderivativeLatex: toLatex(F),
        definiteNumericValue: numCheck.value,
        definiteExactLatex: formatNumberToLatex(numCheck.value),
        numericalErrorEstimate: numCheck.errorEstimate,
        steps,
        warnings,
        lowerBound,
        upperBound,
      };
    }
  }

  // Fallback to Numerical Quadrature for definite integrals without elementary antiderivatives (e.g. e^(-x^2), sin(x)/x)
  if (Number.isFinite(numCheck.value)) {
    const specialNote = detectSpecialFunctionIntegral(req.expression, variable)?.explanation;
    const steps: SolutionStep[] = [
      {
        id: 'non-elem-note',
        title: 'الانتقال إلى التكامل العددي عالي الدقة',
        rule: 'Numerical Quadrature Fallback',
        explanation:
          specialNote ??
          'هذه الدالة لا تملك مشتقة عكسية أولية بسيطة، لذا تم استخدام التكامل العددي (قاعدة سمبسون وغاوس-كرونرود التكيفية).',
        latex: `${integralLatex} \\approx ${Number(numCheck.value.toPrecision(10))}`,
      },
    ];

    let simpsonData: IntegrationResult['simpsonData'];
    if (typeof lowerBound!.value === 'number' && typeof upperBound!.value === 'number') {
      const simp = simpsonComposite(integrand, variable, lowerBound!.value, upperBound!.value, 8);
      simpsonData = { h: simp.h, n: 8, samples: simp.samples, value: simp.value };
      steps.push({
        id: 'non-elem-simp',
        title: 'التقريب بقاعدة سمبسون المركبة (n = 8)',
        rule: "Simpson's Rule",
        explanation: `عرض الفترة الجزئية $h = ${formatNumberClean(simp.h)}$ والمجموع الموزون لقيم الدالة.`,
        latex: `S_8 \\approx ${formatNumberClean(simp.value)} \\quad (\\text{القيمة التكيفية الأدق: } ${Number(numCheck.value.toPrecision(9))})`,
      });
    }

    return {
      ok: true,
      isDefinite: true,
      nonElementary: true,
      variable,
      integrandText: req.expression,
      integrandLatex,
      integralLatex,
      methodUsed: 'numerical',
      methodLabel: METHOD_LABELS.numerical,
      definiteNumericValue: numCheck.value,
      definiteExactLatex: formatNumberToLatex(numCheck.value),
      numericalErrorEstimate: numCheck.errorEstimate,
      simpsonData,
      steps,
      warnings,
      lowerBound,
      upperBound,
    };
  }

  return {
    ok: false,
    error: numCheck.singularityWarning ?? 'تعذر حساب التكامل المحدود؛ تأكد من أن الدالة متصلة ومعرفة على فترة التكامل.',
    isDefinite: true,
    variable,
    integrandText: req.expression,
    integrandLatex,
    integralLatex,
    methodUsed: preferredMethod,
    methodLabel: METHOD_LABELS[preferredMethod],
    steps: [],
    warnings,
    lowerBound,
    upperBound,
  };
}
