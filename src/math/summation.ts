import {
  AngleUnit,
  ExprNode,
  evaluate,
  parseExpr,
  substitute,
  toLatex,
  num,
} from './ast';
import { BoundValue, SolutionStep, formatNumberToLatex, parseBound } from './integrator';

export type SeriesKind = 'sum' | 'prod';

export interface SeriesRequest {
  kind: SeriesKind;
  expression: string;
  variable?: string;
  lowerBound: string;
  upperBound: string;
  angleUnit?: AngleUnit;
}

export interface SeriesResult {
  ok: boolean;
  error?: string;
  kind: SeriesKind;
  variable: string;
  exprLatex: string;
  seriesLatex: string;
  value?: number;
  valueLatex: string;
  isInfinite: boolean;
  termCount: number;
  methodLabel: string;
  steps: SolutionStep[];
  warnings: string[];
}

export function solveSeries(req: SeriesRequest): SeriesResult {
  const variable = (req.variable?.trim() || 'k').toLowerCase();
  const kind: SeriesKind = req.kind;
  const sym = kind === 'sum' ? '\\sum' : '\\prod';
  const methodLabel = kind === 'sum' ? 'حساب المجموع المتسلسل (Σ)' : 'حساب حاصل الضرب المتسلسل (Π)';
  const angleUnit: AngleUnit = req.angleUnit === 'deg' ? 'deg' : 'rad';
  const evalOpts = { angleUnit };
  const warnings: string[] = [];

  let expr: ExprNode;
  try {
    expr = parseExpr(req.expression);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'تعذر قراءة صيغة الحد العام.',
      kind,
      variable,
      exprLatex: req.expression,
      seriesLatex: '',
      valueLatex: '',
      isInfinite: false,
      termCount: 0,
      methodLabel,
      steps: [],
      warnings,
    };
  }

  const exprLatex = toLatex(expr);

  let loBound: BoundValue;
  let hiBound: BoundValue;
  try {
    loBound = parseBound(req.lowerBound || '1');
    hiBound = parseBound(req.upperBound || '5');
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'حدود المجموع غير صالحة.',
      kind,
      variable,
      exprLatex,
      seriesLatex: `${sym} ${exprLatex}`,
      valueLatex: '',
      isInfinite: false,
      termCount: 0,
      methodLabel,
      steps: [],
      warnings,
    };
  }

  if (typeof loBound.value !== 'number') {
    return {
      ok: false,
      error: 'الحد السفلي يجب أن يكون عدداً صحيحاً منتهياً.',
      kind,
      variable,
      exprLatex,
      seriesLatex: `${sym}_{${variable}=${loBound.latex}}^{${hiBound.latex}} ${exprLatex}`,
      valueLatex: '',
      isInfinite: true,
      termCount: 0,
      methodLabel,
      steps: [],
      warnings,
    };
  }

  const startVal = Math.round(loBound.value);
  if (Math.abs(loBound.value - startVal) > 1e-9) {
    return {
      ok: false,
      error: 'يجب أن يكون الحد السفلي عدداً صحيحاً.',
      kind,
      variable,
      exprLatex,
      seriesLatex: `${sym}_{${variable}=${loBound.latex}}^{${hiBound.latex}} ${exprLatex}`,
      valueLatex: '',
      isInfinite: false,
      termCount: 0,
      methodLabel,
      steps: [],
      warnings,
    };
  }

  const seriesLatex = `${sym}_{${variable}=${startVal}}^{${hiBound.latex}} \\left(${exprLatex}\\right)`;

  // Infinite series (+oo)
  if (typeof hiBound.value !== 'number') {
    if (hiBound.value === '-inf') {
      return {
        ok: false,
        error: 'الحد العلوي لا يمكن أن يكون −∞.',
        kind,
        variable,
        exprLatex,
        seriesLatex,
        valueLatex: '',
        isInfinite: true,
        termCount: 0,
        methodLabel,
        steps: [],
        warnings,
      };
    }

    const MAX_INF_TERMS = 4000;
    let acc = kind === 'sum' ? 0 : 1;
    let lastTerm = 0;
    let prevAcc = acc;
    let converged = false;
    let usedTerms = 0;
    const previewTerms: string[] = [];

    for (let k = startVal; k < startVal + MAX_INF_TERMS; k++) {
      const term = evaluate(expr, { [variable]: k }, evalOpts);
      if (!Number.isFinite(term)) {
        return {
          ok: false,
          error: `الحد غير معرف عند ${variable} = ${k}.`,
          kind,
          variable,
          exprLatex,
          seriesLatex,
          valueLatex: '',
          isInfinite: true,
          termCount: usedTerms,
          methodLabel,
          steps: [],
          warnings,
        };
      }
      if (usedTerms < 3) {
        previewTerms.push(formatNumberToLatex(term));
      }
      if (kind === 'sum') acc += term;
      else acc *= term;
      usedTerms++;
      lastTerm = term;

      if (usedTerms > 25) {
        const diff = Math.abs(acc - prevAcc);
        const rel = diff / Math.max(1, Math.abs(acc));
        if (kind === 'sum' && Math.abs(term) < 1e-13 && rel < 1e-12) {
          converged = true;
          break;
        }
        if (kind === 'prod' && Math.abs(term - 1) < 1e-13 && rel < 1e-12) {
          converged = true;
          break;
        }
      }
      prevAcc = acc;
      if (!Number.isFinite(acc)) break;
    }

    if (!Number.isFinite(acc) || (kind === 'sum' && !converged && Math.abs(lastTerm) > 1e-3)) {
      return {
        ok: false,
        error: 'المتسلسلة اللانهائية متباعدة أو بطيئة التقارب جداً (لا تنتهي إلى قيمة محددة).',
        kind,
        variable,
        exprLatex,
        seriesLatex,
        valueLatex: '',
        isInfinite: true,
        termCount: usedTerms,
        methodLabel,
        steps: [],
        warnings,
      };
    }

    if (!converged) {
      warnings.push(`تم تقريب المتسلسلة اللانهائية عبر جمع ${usedTerms} حداً.`);
    }

    const valTex = formatNumberToLatex(acc);
    const opSep = kind === 'sum' ? ' + ' : ' \\cdot ';
    return {
      ok: true,
      kind,
      variable,
      exprLatex,
      seriesLatex,
      value: acc,
      valueLatex: valTex,
      isInfinite: true,
      termCount: usedTerms,
      methodLabel: `${methodLabel} — متسلسلة لانهائية`,
      steps: [
        {
          id: 'series-inf-setup',
          title: 'تحليل المتسلسلة اللانهائية وفحص التقارب',
          rule: 'Infinite Series Convergence',
          explanation: `نحسب الحدود الابتدائية للمتسلسلة بدءاً من ${variable} = ${startVal} ونرصد تقارب المجموع الجزئي.`,
          latex: `${seriesLatex} = ${previewTerms.join(opSep)}${opSep}\\dots`,
        },
        {
          id: 'series-inf-result',
          title: 'القيمة التقاربية النهائية',
          rule: 'Partial Sum Convergence',
          explanation: `بعد ${usedTerms} حداً تتقارب القيمة نحو الناتج التالي:`,
          latex: `${seriesLatex} \\approx ${valTex}`,
        },
      ],
      warnings,
    };
  }

  // Finite sum / product
  const endVal = Math.round(hiBound.value);
  if (Math.abs(hiBound.value - endVal) > 1e-9) {
    return {
      ok: false,
      error: 'يجب أن يكون الحد العلوي عدداً صحيحاً.',
      kind,
      variable,
      exprLatex,
      seriesLatex,
      valueLatex: '',
      isInfinite: false,
      termCount: 0,
      methodLabel,
      steps: [],
      warnings,
    };
  }

  if (endVal < startVal) {
    // Empty sum = 0, empty product = 1
    const emptyVal = kind === 'sum' ? 0 : 1;
    const valTex = String(emptyVal);
    return {
      ok: true,
      kind,
      variable,
      exprLatex,
      seriesLatex,
      value: emptyVal,
      valueLatex: valTex,
      isInfinite: false,
      termCount: 0,
      methodLabel,
      steps: [
        {
          id: 'series-empty',
          title: 'فترة فارغة (الحد العلوي أصغر من السفلي)',
          rule: 'Empty Range Convention',
          explanation:
            kind === 'sum'
              ? 'المجموع على فترة فارغة يساوي المحايد الجمعي (0).'
              : 'حاصل الضرب على فترة فارغة يساوي المحايد الضربي (1).',
          latex: `${seriesLatex} = ${valTex}`,
        },
      ],
      warnings,
    };
  }

  const count = endVal - startVal + 1;
  if (count > 100000) {
    return {
      ok: false,
      error: 'عدد الحدود كبير جداً (الحد الأقصى 100,000 حد).',
      kind,
      variable,
      exprLatex,
      seriesLatex,
      valueLatex: '',
      isInfinite: false,
      termCount: count,
      methodLabel,
      steps: [],
      warnings,
    };
  }

  let acc = kind === 'sum' ? 0 : 1;
  const termSamples: string[] = [];
  const exprSamples: string[] = [];
  for (let k = startVal; k <= endVal; k++) {
    const val = evaluate(expr, { [variable]: k }, evalOpts);
    if (!Number.isFinite(val)) {
      return {
        ok: false,
        error: `الحد غير معرف رياضياً عند ${variable} = ${k}.`,
        kind,
        variable,
        exprLatex,
        seriesLatex,
        valueLatex: '',
        isInfinite: false,
        termCount: count,
        methodLabel,
        steps: [],
        warnings,
      };
    }
    if (kind === 'sum') acc += val;
    else acc *= val;

    if (count <= 7 || k - startVal < 3 || k === endVal) {
      termSamples.push(formatNumberToLatex(val));
      exprSamples.push(toLatex(substitute(expr, variable, num(k))));
    }
  }

  const cleanAcc = Math.abs(acc) < 1e-12 ? 0 : acc;
  const valTex = formatNumberToLatex(cleanAcc);
  const opSep = kind === 'sum' ? ' + ' : ' \\times ';
  const expandedLine =
    count <= 7
      ? termSamples.join(opSep)
      : `${termSamples.slice(0, 3).join(opSep)}${opSep}\\dots${opSep}${termSamples[termSamples.length - 1]}`;
  const symbolicLine =
    count <= 5 ? `${exprSamples.join(opSep)} = ` : '';

  return {
    ok: true,
    kind,
    variable,
    exprLatex,
    seriesLatex,
    value: cleanAcc,
    valueLatex: valTex,
    isInfinite: false,
    termCount: count,
    methodLabel,
    steps: [
      {
        id: 'series-expand',
        title: `فك ${kind === 'sum' ? 'حدود المجموع' : 'عوامل حاصل الضرب'} (${count} ${count <= 10 ? 'حدود' : 'حداً'})`,
        rule: kind === 'sum' ? 'Finite Summation Expansion' : 'Finite Product Expansion',
        explanation: `نعوض عن ${variable} بالأعداد الصحيحة من ${startVal} إلى ${endVal} في الحد العام.`,
        latex: `${seriesLatex} = ${symbolicLine}${expandedLine}`,
      },
      {
        id: 'series-total',
        title: kind === 'sum' ? 'حساب المجموع النهائي' : 'حساب ناتج الضرب النهائي',
        rule: 'Exact Evaluation',
        explanation: kind === 'sum' ? 'نجمع جميع القيم الناتجة.' : 'نضرب جميع القيم الناتجة.',
        latex: `${seriesLatex} = ${valTex}`,
      },
    ],
    warnings,
  };
}
