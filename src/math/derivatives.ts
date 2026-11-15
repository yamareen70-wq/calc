import {
  AngleUnit,
  ExprNode,
  differentiate,
  evaluate,
  getVariables,
  isConstant,
  parseExpr,
  simplify,
  toLatex,
} from './ast';
import { SolutionStep, formatNumberToLatex, parseBound } from './integrator';

export interface DerivativeRequest {
  expression: string;
  variable?: string;
  evalAt?: string;
  evaluateOnly?: boolean;
  angleUnit?: AngleUnit;
}

export interface DerivativeResult {
  ok: boolean;
  error?: string;
  isPureNumeric: boolean;
  isEvaluationOnly: boolean;
  variable: string;
  integrandText: string;
  exprLatex: string;
  derivative?: ExprNode;
  derivativeLatex: string;
  numericValue?: number;
  numericLatex?: string;
  evalPointLatex?: string;
  evalSlope?: number;
  methodLabel: string;
  steps: SolutionStep[];
  warnings: string[];
}

function describeRule(node: ExprNode, v: string): { title: string; rule: string; explanation: string } {
  const s = simplify(node);
  if (isConstant(s, v)) {
    return {
      title: 'مشتقة المقدار الثابت',
      rule: 'Constant Rule',
      explanation: 'مشتقة أي مقدار ثابت تساوي صفراً.',
    };
  }
  if (s.type === 'var' && s.name === v) {
    return {
      title: 'مشتقة المتغير',
      rule: 'Identity Derivative',
      explanation: `مشتقة $${v}$ بالنسبة لنفسه تساوي $1$.`,
    };
  }
  if (s.type === 'add') {
    return {
      title: 'تطبيق خطية الاشتقاق على المجموع والفرق',
      rule: 'Sum & Difference Rule',
      explanation: 'نشتق كل حد في المقدار على حدة ثم نجمع النواتج.',
    };
  }
  if (s.type === 'mul') {
    const varFactors = s.args.filter((a) => !isConstant(a, v));
    if (varFactors.length >= 2) {
      return {
        title: 'تطبيق قاعدة ضرب دالتين',
        rule: "Product Rule (u·v)' = u'v + uv'",
        explanation: 'مشتقة حاصل الضرب تساوي مشتقة الأول في الثاني زائد الأول في مشتقة الثاني.',
      };
    }
    return {
      title: 'إخراج الثابت وتطبيق قاعدة الاشتقاق',
      rule: 'Constant Multiple Rule',
      explanation: 'نُبقي العامل الثابت مضروباً في مشتقة الدالة.',
    };
  }
  if (s.type === 'div') {
    if (isConstant(s.den, v)) {
      return {
        title: 'مشتقة دالة مقسومة على ثابت',
        rule: 'Constant Divisor Rule',
        explanation: 'نشتق البسط مع بقاء المقام الثابت كما هو.',
      };
    }
    return {
      title: 'تطبيق قاعدة قسمة دالتين',
      rule: "Quotient Rule (u/v)' = (u'v − uv')/v²",
      explanation: 'نطبق قانون القسمة: (مشتقة البسط × المقام − البسط × مشتقة المقام) على مربع المقام.',
    };
  }
  if (s.type === 'pow') {
    if (isConstant(s.exp, v)) {
      return {
        title: 'تطبيق قاعدة القوة وقاعدة السلسلة',
        rule: 'Power & Chain Rule',
        explanation: 'ننزل الأس أمام الدالة ونطرح من الأس 1، ثم نضرب في مشتقة الدالة الداخلية.',
      };
    }
    if (isConstant(s.base, v)) {
      return {
        title: 'مشتقة الدالة الأسية',
        rule: 'Exponential & Chain Rule',
        explanation: 'مشتقة $a^{u(x)}$ هي $a^{u(x)} \\ln(a) \\cdot u\'(x)$.',
      };
    }
    return {
      title: 'الاشتقاق اللوغاريتمي للدالة الأسية المتغيرة',
      rule: 'Logarithmic Differentiation',
      explanation: 'لأن الأساس والأس يعتمدان على المتغير، نطبق قاعدة مشتقة $u(x)^{w(x)}$.',
    };
  }
  if (s.type === 'fn') {
    return {
      title: `اشتقاق الدالة ${s.name} مع قاعدة السلسلة`,
      rule: 'Function & Chain Rule',
      explanation: `نطبق قاعدة مشتقة الدالة $${s.name}$ مضروبةً في مشتقة المقدار الداخلي.`,
    };
  }
  return {
    title: 'حساب المشتقة الأولى',
    rule: 'Differentiation',
    explanation: 'نطبق قواعد التفاضل القياسية على التعبير.',
  };
}

export function solveDerivativeOrCalc(req: DerivativeRequest): DerivativeResult {
  const variable = (req.variable?.trim() || 'x').toLowerCase();
  const angleUnit: AngleUnit = req.angleUnit === 'deg' ? 'deg' : 'rad';
  const evalOpts = { angleUnit };
  const warnings: string[] = [];
  const evaluateOnly = Boolean(req.evaluateOnly);

  let expr: ExprNode;
  try {
    expr = parseExpr(req.expression);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'تعذر قراءة التعبير الرياضي.',
      isPureNumeric: false,
      isEvaluationOnly: evaluateOnly,
      variable,
      integrandText: req.expression,
      exprLatex: req.expression,
      derivativeLatex: '',
      methodLabel: evaluateOnly ? 'حساب رياضي مباشر' : 'التفاضل والاشتقاق',
      steps: [],
      warnings,
    };
  }

  const vars = getVariables(expr);
  const exprLatex = toLatex(expr);
  const s = simplify(expr);

  // General evaluation mode (حساب)
  if (evaluateOnly) {
    if (vars.size === 0) {
      const val = evaluate(s, {}, evalOpts);
      const valTex = formatNumberToLatex(val);
      return {
        ok: Number.isFinite(val),
        error: Number.isFinite(val) ? undefined : 'القيمة غير معرفة رياضياً (مثل القسمة على صفر أو معاملات غير صالحة).',
        isPureNumeric: true,
        isEvaluationOnly: true,
        variable,
        integrandText: req.expression,
        exprLatex,
        derivativeLatex: valTex,
        numericValue: val,
        numericLatex: valTex,
        methodLabel: angleUnit === 'deg' ? 'حساب رياضي مباشر (DEG)' : 'حساب رياضي مباشر',
        steps: [
          {
            id: 'calc-eval',
            title: 'حساب القيمة الدقيقة والعددية',
            rule: angleUnit === 'deg' ? 'Evaluation (Degrees Mode)' : 'Arithmetic & Function Evaluation',
            explanation:
              angleUnit === 'deg'
                ? 'نحسب قيمة التعبير الرياضي بدقة مع اعتماد نظام الدرجات (DEG) للدوال المثلثية.'
                : 'نحسب قيمة التعبير الرياضي بدقة باستخدام الدوال والثوابت القياسية.',
            latex: `${exprLatex} = ${valTex}`,
          },
        ],
        warnings,
      };
    }

    const simplifiedLatex = toLatex(s);
    const steps: SolutionStep[] = [
      {
        id: 'calc-simp',
        title: 'تبسيط الصيغة الجبرية للدالة',
        rule: 'Algebraic Simplification',
        explanation: `نرتب ونبسط التعبير الجبري للدالة $f(${variable})$.`,
        latex: `f(${variable}) = ${simplifiedLatex}`,
      },
    ];

    let evalSlope: number | undefined;
    let evalPointLatex: string | undefined;

    if (req.evalAt && req.evalAt.trim().length > 0) {
      try {
        const b = parseBound(req.evalAt);
        if (typeof b.value === 'number' && Number.isFinite(b.value)) {
          const val = evaluate(s, { [variable]: b.value }, evalOpts);
          if (Number.isFinite(val)) {
            evalSlope = Math.abs(val) < 1e-12 ? 0 : val;
            evalPointLatex = b.latex;
            steps.push({
              id: 'calc-point',
              title: `التعويض عند ${variable} = ${b.latex}`,
              rule: angleUnit === 'deg' ? 'Point Substitution (DEG)' : 'Point Substitution',
              explanation: `نعوض بقيمة $${variable} = ${b.latex}$ في الدالة للحصول على القيمة العددية.`,
              latex: `f\\left(${b.latex}\\right) = ${formatNumberToLatex(evalSlope)}`,
            });
          }
        }
      } catch {
        // Ignore invalid optional point
      }
    }

    return {
      ok: true,
      isPureNumeric: false,
      isEvaluationOnly: true,
      variable,
      integrandText: req.expression,
      exprLatex,
      derivativeLatex: simplifiedLatex,
      evalSlope,
      evalPointLatex,
      methodLabel: 'تبسيط وتقييم الدالة',
      steps,
      warnings,
    };
  }

  // Derivative mode (d/dx)
  if (angleUnit === 'deg') {
    warnings.push('الاشتقاق الرمزي يعتمد قياس الراديان (RAD) رياضياً؛ يمكنك استخدام وضع "حساب" للتقييم بالدرجات (DEG).');
  }
  if (vars.size > 1 || (vars.size === 1 && !vars.has(variable))) {
    const others = [...vars].filter((x) => x !== variable);
    if (others.length > 0) {
      warnings.push(`تم اعتبار الرموز (${others.join(', ')}) ثوابت بالنسبة للمتغير ${variable}.`);
    }
  }

  const deriv = simplify(differentiate(s, variable));
  const derivLatex = toLatex(deriv);
  const meta = describeRule(s, variable);

  const steps: SolutionStep[] = [
    {
      id: 'deriv-setup',
      title: meta.title,
      rule: meta.rule,
      explanation: meta.explanation,
      latex: `\\frac{d}{d${variable}}\\left(${exprLatex}\\right)`,
    },
    {
      id: 'deriv-final',
      title: 'المشتقة الأولى بعد التبسيط',
      rule: 'Simplified Derivative',
      explanation: 'نبسط الحدود الناتجة للوصول إلى الصيغة النهائية للمشتقة.',
      latex: `f'(${variable}) = ${derivLatex}`,
    },
  ];

  let evalSlope: number | undefined;
  let evalPointLatex: string | undefined;

  if (req.evalAt && req.evalAt.trim().length > 0) {
    try {
      const b = parseBound(req.evalAt);
      if (typeof b.value === 'number' && Number.isFinite(b.value)) {
        const slope = evaluate(deriv, { [variable]: b.value });
        if (Number.isFinite(slope)) {
          evalSlope = Math.abs(slope) < 1e-12 ? 0 : slope;
          evalPointLatex = b.latex;
          steps.push({
            id: 'deriv-eval-point',
            title: `حساب ميل المماس عند ${variable} = ${b.latex}`,
            rule: 'Point Evaluation',
            explanation: `نعوض بقيمة $${variable} = ${b.latex}$ في دالة المشتقة $f'(${variable})$.`,
            latex: `f'\\left(${b.latex}\\right) = ${formatNumberToLatex(evalSlope)}`,
          });
        }
      }
    } catch {
      // Ignore invalid optional evaluation point
    }
  }

  return {
    ok: true,
    isPureNumeric: false,
    isEvaluationOnly: false,
    variable,
    integrandText: req.expression,
    exprLatex,
    derivative: deriv,
    derivativeLatex: derivLatex,
    evalSlope,
    evalPointLatex,
    methodLabel: 'التفاضل والاشتقاق الرمزي',
    steps,
    warnings,
  };
}
