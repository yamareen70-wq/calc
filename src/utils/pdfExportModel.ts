import { CalcOperation } from '../components/MathKeypad';
import {
  AppLang,
  UI_TEXT,
  localizeLatex,
  localizeMessage,
  localizeMethodLabel,
  localizeStep,
} from '../i18n';
import { AngleUnit, parseExpr, toLatex } from '../math/ast';
import { DerivativeResult } from '../math/derivatives';
import { IntegrationResult, SolutionStep, parseBound } from '../math/integrator';
import { LimitDirection, LimitResult } from '../math/limits';
import {
  MatrixOp,
  MatrixResult,
  isBinaryMatrixOp,
  rawMatrixToLatex,
} from '../math/matrix';
import { SimpsonSample } from '../math/numerical';
import { SeriesResult } from '../math/summation';

export interface PdfExportInput {
  lang: AppLang;
  includeSolution: boolean;
  operation: CalcOperation;
  angleUnit: AngleUnit;
  variable: string;
  expression: string;
  lowerBound: string;
  upperBound: string;
  limitTarget: string;
  limitDirection: LimitDirection;
  derivEvalAt: string;
  matrixOp: MatrixOp;
  matrixA: string[][];
  matrixB: string[][];
  integralResult: IntegrationResult;
  limitResult: LimitResult;
  derivResult: DerivativeResult;
  seriesResult: SeriesResult;
  matrixResult: MatrixResult;
  graphDataUrl?: string | null;
}

export interface PdfSolutionSection {
  methodLabel: string;
  answerLatex: string;
  decimalLabel?: string;
  decimalValue?: string;
  antiderivativeLatex?: string;
  oneSidedLimits?: Array<{ label: string; latex: string }>;
  taylorSummary?: { label: string; latex: string };
  warnings: string[];
  steps: SolutionStep[];
  simpsonData?: { h: number; n: number; samples: SimpsonSample[]; value: number };
}

export interface PdfDocumentData {
  lang: AppLang;
  dir: 'rtl' | 'ltr';
  includeSolution: boolean;
  filename: string;
  headerTitle: string;
  operationLabel: string;
  angleBadge: string;
  dateLabel: string;
  problemLabel: string;
  problemLatex: string;
  problemNote?: string;
  workspaceLabel: string;
  graphDataUrl: string | null;
  graphLegend: string[];
  solution: PdfSolutionSection | null;
}

function safeExprLatex(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '\\square';
  try {
    return toLatex(parseExpr(trimmed));
  } catch {
    return trimmed;
  }
}

function safeBoundLatex(raw: string, fallback: string): string {
  const src = raw.trim() || fallback;
  try {
    return parseBound(src).latex;
  } catch {
    return safeExprLatex(src);
  }
}

export function buildProblemLatex(input: PdfExportInput): string {
  const v = (input.variable || 'x').trim() || 'x';
  const expr = safeExprLatex(input.expression);

  if (input.operation === 'indef_integral') {
    if (input.integralResult.ok && !input.integralResult.isDefinite) {
      return input.integralResult.integralLatex;
    }
    return `\\int \\left(${expr}\\right)\\,d${v}`;
  }

  if (input.operation === 'def_integral') {
    if (input.integralResult.ok && input.integralResult.isDefinite) {
      return input.integralResult.integralLatex;
    }
    const lo = safeBoundLatex(input.lowerBound, '0');
    const hi = safeBoundLatex(input.upperBound, '1');
    return `\\int_{${lo}}^{${hi}} \\left(${expr}\\right)\\,d${v}`;
  }

  if (input.operation === 'limit') {
    if (input.limitResult.ok) {
      return input.limitResult.limitLatex;
    }
    const tgt = safeBoundLatex(input.limitTarget, '0');
    const dirSup =
      input.limitDirection === 'right'
        ? '^{+}'
        : input.limitDirection === 'left'
          ? '^{-}'
          : '';
    return `\\lim_{${v} \\to ${tgt}${dirSup}} \\left(${expr}\\right)`;
  }

  if (input.operation === 'derivative') {
    const baseLatex = input.derivResult.ok && !input.derivResult.isEvaluationOnly
      ? input.derivResult.exprLatex
      : expr;
    const base = `\\frac{d}{d${v}}\\left(${baseLatex}\\right)`;
    if (input.derivEvalAt.trim()) {
      return `\\left.${base}\\right|_{${v}=${safeExprLatex(input.derivEvalAt)}}`;
    }
    return base;
  }

  if (input.operation === 'evaluate') {
    const baseLatex = input.derivResult.ok && input.derivResult.isEvaluationOnly
      ? input.derivResult.exprLatex
      : expr;
    if (input.derivEvalAt.trim()) {
      return `${baseLatex} \\quad \\left(${v} = ${safeExprLatex(input.derivEvalAt)}\\right)`;
    }
    return baseLatex;
  }

  if (input.operation === 'sum' || input.operation === 'prod') {
    if (input.seriesResult.ok && input.seriesResult.kind === input.operation) {
      return input.seriesResult.seriesLatex;
    }
    const sym = input.operation === 'sum' ? '\\sum' : '\\prod';
    const lo = safeBoundLatex(input.lowerBound, '1');
    const hi = safeBoundLatex(input.upperBound, '5');
    return `${sym}_{${v}=${lo}}^{${hi}} \\left(${expr}\\right)`;
  }

  // Matrix
  if (input.matrixResult.ok && input.matrixResult.op === input.matrixOp) {
    return input.matrixResult.exprLatex;
  }
  const aLatex = rawMatrixToLatex(input.matrixA);
  const bLatex = rawMatrixToLatex(input.matrixB);
  switch (input.matrixOp) {
    case 'det':
      return `\\det${aLatex}`;
    case 'inv':
      return `${aLatex}^{-1}`;
    case 'transpose':
      return `${aLatex}^{T}`;
    case 'trace':
      return `\\operatorname{tr}${aLatex}`;
    case 'rank':
      return `\\operatorname{rank}${aLatex}`;
    case 'rref':
      return `\\operatorname{rref}${aLatex}`;
    case 'eigen':
      return `\\operatorname{eig}${aLatex}`;
    case 'add':
      return `${aLatex} + ${bLatex}`;
    case 'sub':
      return `${aLatex} - ${bLatex}`;
    case 'mul':
      return `${aLatex} \\times ${bLatex}`;
    case 'solve_ax_b':
      return `${aLatex} X = ${bLatex}`;
  }
}

export function buildPdfFilename(operation: CalcOperation, includeSolution: boolean): string {
  const modeSlug = includeSolution ? 'solution' : 'problem';
  return `al-mutakamil-${operation}-${modeSlug}.pdf`;
}

export function buildPdfExportData(input: PdfExportInput, dateStr?: string): PdfDocumentData {
  const { lang, includeSolution, operation, angleUnit } = input;
  const t = UI_TEXT[lang];
  const tp = t.pdf;

  const problemLatex = localizeLatex(buildProblemLatex(input), lang);

  let problemNote: string | undefined;
  if (operation === 'matrix') {
    const rA = input.matrixA.length;
    const cA = input.matrixA[0]?.length ?? 0;
    const baseOpLabel = t.matrixOps[input.matrixOp];
    if (isBinaryMatrixOp(input.matrixOp)) {
      const rB = input.matrixB.length;
      const cB = input.matrixB[0]?.length ?? 0;
      problemNote = `${baseOpLabel} · A (${rA}×${cA}) , B (${rB}×${cB})`;
    } else {
      problemNote = `${baseOpLabel} · A (${rA}×${cA})`;
    }
  } else if (
    (operation === 'derivative' || operation === 'evaluate') &&
    input.derivEvalAt.trim()
  ) {
    problemNote = tp.evalAtNote(input.variable, input.derivEvalAt.trim());
  }

  const graphLegend: string[] = [];
  if (includeSolution && input.graphDataUrl) {
    if (operation === 'indef_integral' || operation === 'def_integral') {
      graphLegend.push(t.graph.legendCurve(input.integralResult.variable));
      if (input.integralResult.isDefinite) {
        graphLegend.push(t.graph.legendArea);
      }
    } else if (operation === 'limit') {
      graphLegend.push(t.graph.legendCurve(input.limitResult.variable));
      if (input.limitResult.exists) {
        graphLegend.push(t.graph.legendLimit);
      }
    } else if (operation === 'derivative' || operation === 'evaluate') {
      graphLegend.push(t.graph.legendCurve(input.derivResult.variable));
    }
  }

  let solution: PdfSolutionSection | null = null;
  if (includeSolution) {
    if (operation === 'indef_integral' || operation === 'def_integral') {
      const r = input.integralResult;
      if (r.ok) {
        solution = {
          methodLabel: localizeMethodLabel(r.methodLabel, lang),
          answerLatex: localizeLatex(
            r.isDefinite
              ? `${r.integralLatex} = ${r.definiteExactLatex ?? Number((r.definiteNumericValue ?? 0).toPrecision(8))}`
              : `${r.integralLatex} = ${r.antiderivativeLatex ?? ''}`,
            lang
          ),
          decimalLabel:
            r.isDefinite && r.definiteNumericValue !== undefined
              ? t.result.definiteDecimalLabel
              : undefined,
          decimalValue:
            r.isDefinite && r.definiteNumericValue !== undefined
              ? String(Number(r.definiteNumericValue.toPrecision(10)))
              : undefined,
          antiderivativeLatex:
            r.isDefinite && r.antiderivativeLatex
              ? `F(${r.variable}) = ${r.antiderivativeLatex}`
              : undefined,
          taylorSummary:
            !r.isDefinite && r.nonElementary && r.specialFunctionLatex && r.taylorSeries
              ? {
                  label: t.result.taylorPrefix(r.variable, r.taylorSeries.x0),
                  latex: `\\int ${r.integrandLatex}\\,d${r.variable} \\approx ${r.taylorSeries.antiderivLatex}`,
                }
              : undefined,
          warnings: r.warnings.map((w) => localizeMessage(w, lang)),
          steps: r.steps.map((s) => localizeStep(s, lang)),
          simpsonData: r.simpsonData,
        };
      }
    } else if (operation === 'limit') {
      const r = input.limitResult;
      if (r.ok) {
        const oneSided: Array<{ label: string; latex: string }> = [];
        if (r.rightLimitLatex) {
          oneSided.push({
            label: t.result.rightLimitLabel(r.variable, r.target.latex),
            latex: localizeLatex(r.rightLimitLatex, lang),
          });
        }
        if (r.leftLimitLatex) {
          oneSided.push({
            label: t.result.leftLimitLabel(r.variable, r.target.latex),
            latex: localizeLatex(r.leftLimitLatex, lang),
          });
        }
        solution = {
          methodLabel: localizeMethodLabel(r.methodLabel, lang),
          answerLatex: localizeLatex(`${r.limitLatex} = ${r.valueLatex}`, lang),
          decimalLabel:
            r.exists && r.value !== undefined ? t.result.limitNumericLabel : undefined,
          decimalValue:
            r.exists && r.value !== undefined ? String(Number(r.value.toPrecision(9))) : undefined,
          oneSidedLimits: oneSided.length > 0 ? oneSided : undefined,
          warnings: r.warnings.map((w) => localizeMessage(w, lang)),
          steps: r.steps.map((s) => localizeStep(s, lang)),
        };
      }
    } else if (operation === 'sum' || operation === 'prod') {
      const r = input.seriesResult;
      if (r.ok) {
        solution = {
          methodLabel: localizeMethodLabel(r.methodLabel, lang),
          answerLatex: localizeLatex(`${r.seriesLatex} = ${r.valueLatex}`, lang),
          decimalLabel:
            r.value !== undefined ? t.result.seriesOutputLabel(r.termCount) : undefined,
          decimalValue:
            r.value !== undefined ? String(Number(r.value.toPrecision(10))) : undefined,
          warnings: r.warnings.map((w) => localizeMessage(w, lang)),
          steps: r.steps.map((s) => localizeStep(s, lang)),
        };
      }
    } else if (operation === 'matrix') {
      const r = input.matrixResult;
      if (r.ok) {
        solution = {
          methodLabel: localizeMethodLabel(r.methodLabel, lang),
          answerLatex: localizeLatex(`${r.exprLatex} = ${r.resultLatex}`, lang),
          decimalLabel:
            r.scalarValue !== undefined ? t.result.matrixScalarLabel : undefined,
          decimalValue:
            r.scalarValue !== undefined ? String(Number(r.scalarValue.toPrecision(10))) : undefined,
          warnings: r.warnings.map((w) => localizeMessage(w, lang)),
          steps: r.steps.map((s) => localizeStep(s, lang)),
        };
      }
    } else {
      const r = input.derivResult;
      if (r.ok) {
        const answerLatex = r.isEvaluationOnly
          ? r.isPureNumeric
            ? `${r.exprLatex} = ${r.derivativeLatex}`
            : `f(${r.variable}) = ${r.derivativeLatex}`
          : `\\frac{d}{d${r.variable}}\\left(${r.exprLatex}\\right) = ${r.derivativeLatex}`;

        let decimalLabel: string | undefined;
        let decimalValue: string | undefined;
        if (r.isPureNumeric && r.numericValue !== undefined) {
          decimalLabel = t.result.calcDecimalLabel;
          decimalValue = String(Number(r.numericValue.toPrecision(10)));
        } else if (r.evalSlope !== undefined) {
          const base = r.isEvaluationOnly
            ? t.result.valueAtFunc(r.variable)
            : t.result.valueAtDeriv(r.variable);
          decimalLabel = `${base} ${input.derivEvalAt}`.trim() + ':';
          decimalValue = String(Number(r.evalSlope.toPrecision(9)));
        }

        solution = {
          methodLabel: localizeMethodLabel(r.methodLabel, lang),
          answerLatex: localizeLatex(answerLatex, lang),
          decimalLabel,
          decimalValue,
          warnings: r.warnings.map((w) => localizeMessage(w, lang)),
          steps: r.steps.map((s) => localizeStep(s, lang)),
        };
      }
    }
  }

  const formattedDate =
    dateStr ??
    new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  return {
    lang,
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    includeSolution,
    filename: buildPdfFilename(operation, includeSolution),
    headerTitle: includeSolution ? tp.docHeaderSolution : tp.docHeaderProblem,
    operationLabel: t.operations[operation],
    angleBadge: angleUnit === 'deg' ? tp.angleDeg : tp.angleRad,
    dateLabel: formattedDate,
    problemLabel: tp.problemLabel,
    problemLatex,
    problemNote,
    workspaceLabel: tp.workspaceLabel,
    graphDataUrl: includeSolution ? (input.graphDataUrl ?? null) : null,
    graphLegend,
    solution,
  };
}
