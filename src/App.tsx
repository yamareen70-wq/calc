import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  FileDown,
  FileText,
  History,
  Languages,
  Moon,
  Sparkles,
  Sun,
  Trash2,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { GraphPayload, IntegralGraph, renderLightGraphDataUrl } from './components/IntegralGraph';
import { MathBlock } from './components/MathDisplay';
import { CalcOperation, MathKeypad } from './components/MathKeypad';
import { DisplaySlotField, NaturalDisplay } from './components/NaturalDisplay';
import { PdfExportSheet } from './components/PdfExportSheet';
import { StepsPanel } from './components/StepsPanel';
import { generatePdfFromContainer } from './utils/generatePdf';
import { PdfDocumentData, buildPdfExportData } from './utils/pdfExportModel';
import {
  CALC_PRESETS,
  CalcMode,
  CalcPreset,
  MATH_RULES_REFERENCE,
} from './data/presets';
import {
  AppLang,
  LANG_STORAGE_KEY,
  UI_TEXT,
  getFieldLabel,
  localizeLatex,
  localizeMessage,
  localizeMethodLabel,
} from './i18n';
import { AngleUnit, getVariables, parseExpr } from './math/ast';
import { DerivativeResult, solveDerivativeOrCalc } from './math/derivatives';
import {
  IntegrationResult,
  parseBound,
  solveIntegral,
} from './math/integrator';
import { LimitDirection, LimitResult, solveLimit } from './math/limits';
import {
  MatrixOp,
  MatrixResult,
  isBinaryMatrixOp,
  solveMatrix,
} from './math/matrix';
import { integrateNumerical } from './math/numerical';
import { SeriesResult, solveSeries } from './math/summation';

type ActiveField = DisplaySlotField | 'evalPointX';

type ResultCategory = 'integral' | 'limit' | 'derivative' | 'series' | 'matrix';

interface HistoryItem {
  id: string;
  operation: CalcOperation;
  angleUnit?: AngleUnit;
  expression: string;
  variable: string;
  lowerBound: string;
  upperBound: string;
  limitTarget: string;
  limitDirection: LimitDirection;
  matrixOp?: MatrixOp;
  matrixA?: string[][];
  matrixB?: string[][];
  resultLatex: string;
  methodLabel: string;
  timestamp: number;
}

const HISTORY_STORAGE_KEY = 'math_calc_history_v3';

function resizeMatrixGrid(mat: string[][], rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => mat[r]?.[c] ?? (r === c ? '1' : '0'))
  );
}

function presetToOperation(preset: CalcPreset): CalcOperation {
  if (preset.mode === 'integral') {
    return preset.isDefinite ? 'def_integral' : 'indef_integral';
  }
  if (preset.mode === 'limit') return 'limit';
  return 'derivative';
}

function operationToCategory(op: CalcOperation): ResultCategory {
  if (op === 'indef_integral' || op === 'def_integral') return 'integral';
  if (op === 'limit') return 'limit';
  if (op === 'sum' || op === 'prod') return 'series';
  if (op === 'matrix') return 'matrix';
  return 'derivative';
}

export default function App() {
  const [lang, setLang] = useState<AppLang>(() => {
    if (typeof window === 'undefined') return 'ar';
    return localStorage.getItem(LANG_STORAGE_KEY) === 'en' ? 'en' : 'ar';
  });

  const t = UI_TEXT[lang];

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('integral_theme') === 'dark';
  });

  const [operation, setOperation] = useState<CalcOperation>('def_integral');
  const [angleUnit, setAngleUnit] = useState<AngleUnit>('rad');
  const [expression, setExpression] = useState('x * sin(x)');
  const [variable, setVariable] = useState('x');

  // Integral / Series bounds (method is ALWAYS automatic)
  const [lowerBound, setLowerBound] = useState('0');
  const [upperBound, setUpperBound] = useState('pi');

  // Limit inputs
  const [limitTarget, setLimitTarget] = useState('0');
  const [limitDirection, setLimitDirection] = useState<LimitDirection>('two-sided');

  // Optional point evaluation inputs
  const [evalPointX, setEvalPointX] = useState('1');
  const [derivEvalAt, setDerivEvalAt] = useState('');

  // Matrix inputs
  const [matrixOp, setMatrixOp] = useState<MatrixOp>('det');
  const [matrixA, setMatrixA] = useState<string[][]>([
    ['2', '1'],
    ['5', '3'],
  ]);
  const [matrixB, setMatrixB] = useState<string[][]>([
    ['1', '0'],
    ['0', '1'],
  ]);

  // Button-only input focus & cursor tracking (null = natural math preview mode)
  const [activeField, setActiveField] = useState<ActiveField | null>(null);
  const [lastField, setLastField] = useState<ActiveField>('expr');
  const [cursors, setCursors] = useState<Record<string, number>>({
    expr: 'x * sin(x)'.length,
    lower: 1,
    upper: 2,
    limitTarget: 1,
    evalPointX: 1,
    derivEvalAt: 0,
  });

  const [showPresets, setShowPresets] = useState(false);
  const [presetCategory, setPresetCategory] = useState<'all' | CalcMode>('all');
  const [copiedLatex, setCopiedLatex] = useState(false);
  const [showPdfMenu, setShowPdfMenu] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<PdfDocumentData | null>(null);

  const [integralResult, setIntegralResult] = useState<IntegrationResult>(() =>
    solveIntegral({
      expression: 'x * sin(x)',
      variable: 'x',
      isDefinite: true,
      lowerBound: '0',
      upperBound: 'pi',
      method: 'auto',
    })
  );

  const [limitResult, setLimitResult] = useState<LimitResult>(() =>
    solveLimit({
      expression: 'sin(3x) / x',
      variable: 'x',
      target: '0',
      direction: 'two-sided',
    })
  );

  const [derivResult, setDerivResult] = useState<DerivativeResult>(() =>
    solveDerivativeOrCalc({
      expression: 'e^(2x) * cos(3x)',
      variable: 'x',
      evalAt: '',
      evaluateOnly: false,
      angleUnit: 'rad',
    })
  );

  const [seriesResult, setSeriesResult] = useState<SeriesResult>(() =>
    solveSeries({
      kind: 'sum',
      expression: 'k^2',
      variable: 'k',
      lowerBound: '1',
      upperBound: '5',
      angleUnit: 'rad',
    })
  );

  const [matrixResult, setMatrixResult] = useState<MatrixResult>(() =>
    solveMatrix({
      op: 'det',
      matrixA: [
        ['2', '1'],
        ['5', '3'],
      ],
      matrixB: [
        ['1', '0'],
        ['0', '1'],
      ],
      angleUnit: 'rad',
    })
  );

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
    } catch {
      return [];
    }
  });

  const resultsTopRef = useRef<HTMLDivElement | null>(null);
  const examplesSectionRef = useRef<HTMLElement | null>(null);
  const pdfSheetRef = useRef<HTMLDivElement | null>(null);
  const pdfMenuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = UI_TEXT[lang].docTitle;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Ignore storage quota errors
    }
  }, [lang]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('integral_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('integral_theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Ignore storage quota errors
    }
  }, [history]);

  // Clicking anywhere outside the equation slots/keypad exits edit mode into natural math formatting
  useEffect(() => {
    const handlePointerDownOutside = (e: PointerEvent) => {
      if (activeField === null) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        target.closest('[data-lcd-slot="true"]') ||
        target.closest('[data-lcd-inline-control="true"]') ||
        target.closest('[data-testid="math-keypad"]') ||
        target.closest('#eval-point-x')
      ) {
        return;
      }
      setActiveField(null);
    };

    document.addEventListener('pointerdown', handlePointerDownOutside, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside, true);
    };
  }, [activeField]);

  useEffect(() => {
    if (!showPdfMenu) return;
    const handleOutside = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (pdfMenuContainerRef.current?.contains(target)) return;
      setShowPdfMenu(false);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPdfMenu(false);
    };
    document.addEventListener('pointerdown', handleOutside, true);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('pointerdown', handleOutside, true);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showPdfMenu]);

  const getFieldValue = (field: ActiveField): string => {
    if (field.startsWith('mat:')) {
      const [, target, rStr, cStr] = field.split(':');
      const r = Number(rStr);
      const c = Number(cStr);
      const grid = target === 'A' ? matrixA : matrixB;
      return grid[r]?.[c] ?? '';
    }
    switch (field) {
      case 'expr':
        return expression;
      case 'lower':
        return lowerBound;
      case 'upper':
        return upperBound;
      case 'limitTarget':
        return limitTarget;
      case 'evalPointX':
        return evalPointX;
      case 'derivEvalAt':
        return derivEvalAt;
      default:
        return '';
    }
  };

  const setFieldValue = (field: ActiveField, val: string) => {
    if (field.startsWith('mat:')) {
      const [, target, rStr, cStr] = field.split(':');
      const r = Number(rStr);
      const c = Number(cStr);
      const updater = (prev: string[][]) =>
        prev.map((row, ri) =>
          ri === r ? row.map((cell, ci) => (ci === c ? val : cell)) : row
        );
      if (target === 'A') setMatrixA(updater);
      else setMatrixB(updater);
      return;
    }
    switch (field) {
      case 'expr':
        setExpression(val);
        break;
      case 'lower':
        setLowerBound(val);
        break;
      case 'upper':
        setUpperBound(val);
        break;
      case 'limitTarget':
        setLimitTarget(val);
        break;
      case 'evalPointX':
        setEvalPointX(val);
        break;
      case 'derivEvalAt':
        setDerivEvalAt(val);
        break;
    }
  };

  const selectField = (field: ActiveField) => {
    setActiveField(field);
    setLastField(field);
    const len = getFieldValue(field).length;
    setCursors((prev) => ({
      ...prev,
      [field]: Math.min(prev[field] ?? len, len),
    }));
  };

  const resolveEditField = (): ActiveField => {
    if (activeField && isFieldValidForOp(activeField, operation)) return activeField;
    if (isFieldValidForOp(lastField, operation)) return lastField;
    return operation === 'matrix' ? 'mat:A:0:0' : 'expr';
  };

  const handleInsertToken = (token: string, cursorOffset = 0) => {
    const target = resolveEditField();
    const curVal = getFieldValue(target);
    const pos = Math.max(0, Math.min(cursors[target] ?? curVal.length, curVal.length));
    const nextVal = curVal.slice(0, pos) + token + curVal.slice(pos);
    const nextPos = Math.max(0, pos + token.length + cursorOffset);
    setFieldValue(target, nextVal);
    setCursors((prev) => ({ ...prev, [target]: nextPos }));
    setActiveField(target);
    setLastField(target);
  };

  const handleMoveCursor = (delta: number) => {
    const target = resolveEditField();
    const curVal = getFieldValue(target);
    const pos = cursors[target] ?? curVal.length;
    const nextPos = Math.max(0, Math.min(curVal.length, pos + delta));
    setCursors((prev) => ({ ...prev, [target]: nextPos }));
    setActiveField(target);
    setLastField(target);
  };

  const handleBackspace = () => {
    const target = resolveEditField();
    const curVal = getFieldValue(target);
    const pos = Math.max(0, Math.min(cursors[target] ?? curVal.length, curVal.length));
    setActiveField(target);
    setLastField(target);
    if (pos === 0) return;
    const nextVal = curVal.slice(0, pos - 1) + curVal.slice(pos);
    setFieldValue(target, nextVal);
    setCursors((prev) => ({ ...prev, [target]: pos - 1 }));
  };

  const handleClear = () => {
    const target = resolveEditField();
    setFieldValue(target, '');
    setCursors((prev) => ({ ...prev, [target]: 0 }));
    setActiveField(target);
    setLastField(target);
  };

  const handleToggleSign = () => {
    const target = resolveEditField();
    const curVal = getFieldValue(target);
    const pos = Math.max(0, Math.min(cursors[target] ?? curVal.length, curVal.length));
    setActiveField(target);
    setLastField(target);
    if (pos === 0 || curVal.length === 0) {
      if (curVal.startsWith('-')) {
        const nextVal = curVal.slice(1);
        setFieldValue(target, nextVal);
        setCursors((prev) => ({ ...prev, [target]: Math.max(0, pos - 1) }));
      } else {
        const nextVal = `-${curVal}`;
        setFieldValue(target, nextVal);
        setCursors((prev) => ({ ...prev, [target]: pos + 1 }));
      }
      return;
    }
    const nextVal = `${curVal.slice(0, pos)}-${curVal.slice(pos)}`;
    setFieldValue(target, nextVal);
    setCursors((prev) => ({ ...prev, [target]: pos + 1 }));
  };

  const handleToggleExamplesFromKeypad = () => {
    setShowPresets((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => {
          examplesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
      return next;
    });
  };

  const exprHasVars = useMemo(() => {
    try {
      return getVariables(parseExpr(expression)).size > 0;
    } catch {
      return true;
    }
  }, [expression]);

  // Interactive numerical evaluation F(x) for non-elementary indefinite integrals
  const nonElemEval = useMemo(() => {
    if (!integralResult.ok || !integralResult.nonElementary || integralResult.isDefinite) return null;
    const x0 = integralResult.taylorSeries?.x0 ?? 0;
    try {
      const bound = parseBound(evalPointX.trim() || String(x0 + 1));
      const node = parseExpr(integralResult.integrandText);
      const res = integrateNumerical(node, integralResult.variable, x0, bound.value);
      return { x0, xLatex: bound.latex, value: res.value, error: res.errorEstimate };
    } catch {
      return null;
    }
  }, [integralResult, evalPointX]);

  const pushHistory = (entry: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const full: HistoryItem = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    };
    setHistory((prev) => {
      const deduped = prev.filter(
        (item) =>
          !(
            item.operation === full.operation &&
            item.expression === full.expression &&
            item.lowerBound === full.lowerBound &&
            item.upperBound === full.upperBound &&
            item.limitTarget === full.limitTarget &&
            item.limitDirection === full.limitDirection &&
            item.variable === full.variable
          )
      );
      return [full, ...deduped].slice(0, 12);
    });
  };

  const executeSolve = (params: {
    targetOp: CalcOperation;
    angleUnit?: AngleUnit;
    expression: string;
    variable: string;
    lowerBound: string;
    upperBound: string;
    limitTarget: string;
    limitDirection: LimitDirection;
    derivEvalAt: string;
    matrixOp?: MatrixOp;
    matrixA?: string[][];
    matrixB?: string[][];
    saveToHistory?: boolean;
  }) => {
    const unit = params.angleUnit ?? angleUnit;

    if (params.targetOp === 'indef_integral' || params.targetOp === 'def_integral') {
      const isDef = params.targetOp === 'def_integral';
      const res = solveIntegral({
        expression: params.expression,
        variable: params.variable,
        isDefinite: isDef,
        lowerBound: params.lowerBound,
        upperBound: params.upperBound,
        method: 'auto', // ALWAYS AUTOMATIC
      });
      setIntegralResult(res);
      if (res.ok && params.saveToHistory !== false) {
        const resultLatex = res.isDefinite
          ? `${res.integralLatex} = ${res.definiteExactLatex ?? res.definiteNumericValue}`
          : `${res.integralLatex} = ${res.antiderivativeLatex ?? ''}`;
        pushHistory({
          operation: params.targetOp,
          angleUnit: unit,
          expression: params.expression,
          variable: params.variable,
          lowerBound: params.lowerBound,
          upperBound: params.upperBound,
          limitTarget: params.limitTarget,
          limitDirection: params.limitDirection,
          resultLatex,
          methodLabel: res.methodLabel,
        });
      }
      return;
    }

    if (params.targetOp === 'limit') {
      const res = solveLimit({
        expression: params.expression,
        variable: params.variable,
        target: params.limitTarget,
        direction: params.limitDirection,
      });
      setLimitResult(res);
      if (res.ok && params.saveToHistory !== false) {
        pushHistory({
          operation: 'limit',
          angleUnit: unit,
          expression: params.expression,
          variable: params.variable,
          lowerBound: params.lowerBound,
          upperBound: params.upperBound,
          limitTarget: params.limitTarget,
          limitDirection: params.limitDirection,
          resultLatex: `${res.limitLatex} = ${res.valueLatex}`,
          methodLabel: res.methodLabel,
        });
      }
      return;
    }

    if (params.targetOp === 'sum' || params.targetOp === 'prod') {
      const res = solveSeries({
        kind: params.targetOp,
        expression: params.expression,
        variable: params.variable,
        lowerBound: params.lowerBound,
        upperBound: params.upperBound,
        angleUnit: unit,
      });
      setSeriesResult(res);
      if (res.ok && params.saveToHistory !== false) {
        pushHistory({
          operation: params.targetOp,
          angleUnit: unit,
          expression: params.expression,
          variable: params.variable,
          lowerBound: params.lowerBound,
          upperBound: params.upperBound,
          limitTarget: params.limitTarget,
          limitDirection: params.limitDirection,
          resultLatex: `${res.seriesLatex} = ${res.valueLatex}`,
          methodLabel: res.methodLabel,
        });
      }
      return;
    }

    if (params.targetOp === 'matrix') {
      const mOp = params.matrixOp ?? matrixOp;
      const mA = params.matrixA ?? matrixA;
      const mB = params.matrixB ?? matrixB;
      const res = solveMatrix({
        op: mOp,
        matrixA: mA,
        matrixB: mB,
        angleUnit: unit,
      });
      setMatrixResult(res);
      if (res.ok && params.saveToHistory !== false) {
        pushHistory({
          operation: 'matrix',
          angleUnit: unit,
          expression: '',
          variable: params.variable,
          lowerBound: params.lowerBound,
          upperBound: params.upperBound,
          limitTarget: params.limitTarget,
          limitDirection: params.limitDirection,
          matrixOp: mOp,
          matrixA: mA.map((r) => [...r]),
          matrixB: mB.map((r) => [...r]),
          resultLatex: `${res.exprLatex} = ${res.resultLatex}`,
          methodLabel: res.methodLabel,
        });
      }
      return;
    }

    const evalOnly = params.targetOp === 'evaluate';
    const res = solveDerivativeOrCalc({
      expression: params.expression,
      variable: params.variable,
      evalAt: params.derivEvalAt,
      evaluateOnly: evalOnly,
      angleUnit: unit,
    });
    setDerivResult(res);
    if (res.ok && params.saveToHistory !== false) {
      const resultLatex = evalOnly
        ? res.isPureNumeric
          ? `${res.exprLatex} = ${res.derivativeLatex}`
          : `f(${res.variable}) = ${res.derivativeLatex}`
        : `\\frac{d}{d${res.variable}}\\left(${res.exprLatex}\\right) = ${res.derivativeLatex}`;
      pushHistory({
        operation: params.targetOp,
        angleUnit: unit,
        expression: params.expression,
        variable: params.variable,
        lowerBound: params.lowerBound,
        upperBound: params.upperBound,
        limitTarget: params.limitTarget,
        limitDirection: params.limitDirection,
        resultLatex,
        methodLabel: res.methodLabel,
      });
    }
  };

  const runCurrentSolve = (saveToHistory = true) => {
    executeSolve({
      targetOp: operation,
      angleUnit,
      expression,
      variable,
      lowerBound,
      upperBound,
      limitTarget,
      limitDirection,
      derivEvalAt,
      matrixOp,
      matrixA,
      matrixB,
      saveToHistory,
    });
    setActiveField(null);
  };

  const handleToggleAngleUnit = () => {
    const nextUnit: AngleUnit = angleUnit === 'rad' ? 'deg' : 'rad';
    setAngleUnit(nextUnit);
    if (operation === 'matrix' || expression.trim().length > 0) {
      executeSolve({
        targetOp: operation,
        angleUnit: nextUnit,
        expression,
        variable,
        lowerBound,
        upperBound,
        limitTarget,
        limitDirection,
        derivEvalAt,
        matrixOp,
        matrixA,
        matrixB,
        saveToHistory: false,
      });
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    runCurrentSolve(true);
  };

  const isFieldValidForOp = (field: ActiveField, op: CalcOperation): boolean => {
    if (op === 'matrix') {
      if (!field.startsWith('mat:')) return false;
      const [, target, rStr, cStr] = field.split(':');
      if (target === 'B' && !isBinaryMatrixOp(matrixOp)) return false;
      const grid = target === 'A' ? matrixA : matrixB;
      const r = Number(rStr);
      const c = Number(cStr);
      return r >= 0 && r < grid.length && c >= 0 && c < (grid[0]?.length ?? 0);
    }
    if (field === 'expr' || field === 'evalPointX') return true;
    if (field === 'lower' || field === 'upper') {
      return op === 'def_integral' || op === 'sum' || op === 'prod';
    }
    if (field === 'limitTarget') return op === 'limit';
    if (field === 'derivEvalAt') return op === 'derivative' || op === 'evaluate';
    return false;
  };

  const handleSelectOperationFromKeypad = (nextOp: CalcOperation) => {
    let nextLo = lowerBound;
    let nextHi = upperBound;
    let nextExpr = expression;
    let nextVar = variable;

    // Provide integer defaults when entering Sum / Prod from an integral with non-integer bounds (like 0..pi)
    if (nextOp === 'sum' || nextOp === 'prod') {
      const wasSeries = operation === 'sum' || operation === 'prod';
      if (!wasSeries) {
        if (nextHi === 'pi' || nextHi === '-oo') nextHi = '5';
        if (nextLo === '0') nextLo = '1';
        if (nextExpr === 'x * sin(x)') {
          nextExpr = nextOp === 'sum' ? 'k^2' : 'k';
          nextVar = 'k';
          setExpression(nextExpr);
          setVariable(nextVar);
        }
        setLowerBound(nextLo);
        setUpperBound(nextHi);
      }
    }

    setOperation(nextOp);

    if (nextOp === 'matrix') {
      setLastField('mat:A:0:0');
      setActiveField((prev) => (prev && prev.startsWith('mat:') ? prev : 'mat:A:0:0'));
      executeSolve({
        targetOp: 'matrix',
        angleUnit,
        expression: nextExpr,
        variable: nextVar,
        lowerBound: nextLo,
        upperBound: nextHi,
        limitTarget,
        limitDirection,
        derivEvalAt,
        matrixOp,
        matrixA,
        matrixB,
        saveToHistory: false,
      });
      return;
    }

    if (!isFieldValidForOp(lastField, nextOp)) {
      setLastField('expr');
    }
    if (activeField !== null && !isFieldValidForOp(activeField, nextOp)) {
      setActiveField('expr');
    }
    if (nextExpr.trim().length > 0) {
      executeSolve({
        targetOp: nextOp,
        angleUnit,
        expression: nextExpr,
        variable: nextVar,
        lowerBound: nextLo,
        upperBound: nextHi,
        limitTarget,
        limitDirection,
        derivEvalAt,
        saveToHistory: false,
      });
    }
  };

  const handleChangeMatrixOp = (nextMatOp: MatrixOp) => {
    setMatrixOp(nextMatOp);
    if (!isBinaryMatrixOp(nextMatOp) && activeField?.startsWith('mat:B:')) {
      setActiveField('mat:A:0:0');
      setLastField('mat:A:0:0');
    }
    executeSolve({
      targetOp: 'matrix',
      angleUnit,
      expression,
      variable,
      lowerBound,
      upperBound,
      limitTarget,
      limitDirection,
      derivEvalAt,
      matrixOp: nextMatOp,
      matrixA,
      matrixB,
      saveToHistory: false,
    });
  };

  const handleChangeMatrixDim = (target: 'A' | 'B', rows: number, cols: number) => {
    const nextA = target === 'A' ? resizeMatrixGrid(matrixA, rows, cols) : matrixA;
    const nextB = target === 'B' ? resizeMatrixGrid(matrixB, rows, cols) : matrixB;
    if (target === 'A') setMatrixA(nextA);
    else setMatrixB(nextB);

    if (activeField?.startsWith(`mat:${target}:`)) {
      const [, , rStr, cStr] = activeField.split(':');
      if (Number(rStr) >= rows || Number(cStr) >= cols) {
        const fallback: ActiveField = `mat:${target}:0:0`;
        setActiveField(fallback);
        setLastField(fallback);
      }
    }

    executeSolve({
      targetOp: 'matrix',
      angleUnit,
      expression,
      variable,
      lowerBound,
      upperBound,
      limitTarget,
      limitDirection,
      derivEvalAt,
      matrixOp,
      matrixA: nextA,
      matrixB: nextB,
      saveToHistory: false,
    });
  };

  const handleLoadPreset = (preset: CalcPreset) => {
    const nextOp = presetToOperation(preset);
    const nextLo = preset.lowerBound ?? '0';
    const nextHi = preset.upperBound ?? '1';
    const nextTarget = preset.limitTarget ?? '0';
    const nextDir = preset.limitDirection ?? 'two-sided';

    setOperation(nextOp);
    setExpression(preset.expression);
    setVariable('x');
    setLowerBound(nextLo);
    setUpperBound(nextHi);
    setLimitTarget(nextTarget);
    setLimitDirection(nextDir);
    setActiveField(null);
    setLastField('expr');
    setCursors((p) => ({
      ...p,
      expr: preset.expression.length,
      lower: nextLo.length,
      upper: nextHi.length,
      limitTarget: nextTarget.length,
    }));

    executeSolve({
      targetOp: nextOp,
      angleUnit,
      expression: preset.expression,
      variable: 'x',
      lowerBound: nextLo,
      upperBound: nextHi,
      limitTarget: nextTarget,
      limitDirection: nextDir,
      derivEvalAt,
      saveToHistory: true,
    });
    resultsTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const activeCategory = operationToCategory(operation);

  const activeResultOk =
    activeCategory === 'integral'
      ? integralResult.ok
      : activeCategory === 'limit'
        ? limitResult.ok
        : activeCategory === 'series'
          ? seriesResult.ok
          : activeCategory === 'matrix'
            ? matrixResult.ok
            : derivResult.ok;

  const activeResultError =
    activeCategory === 'integral'
      ? integralResult.error
      : activeCategory === 'limit'
        ? limitResult.error
        : activeCategory === 'series'
          ? seriesResult.error
          : activeCategory === 'matrix'
            ? matrixResult.error
            : derivResult.error;

  const handleCopyLatex = async () => {
    if (!activeResultOk) return;
    let text = '';
    if (activeCategory === 'integral') {
      text = integralResult.isDefinite
        ? `${integralResult.integralLatex} = ${integralResult.definiteExactLatex ?? integralResult.definiteNumericValue}`
        : `${integralResult.integralLatex} = ${integralResult.antiderivativeLatex ?? ''}`;
    } else if (activeCategory === 'limit') {
      text = `${limitResult.limitLatex} = ${limitResult.valueLatex}`;
    } else if (activeCategory === 'series') {
      text = `${seriesResult.seriesLatex} = ${seriesResult.valueLatex}`;
    } else if (activeCategory === 'matrix') {
      text = `${matrixResult.exprLatex} = ${matrixResult.resultLatex}`;
    } else {
      text = derivResult.isEvaluationOnly
        ? derivResult.isPureNumeric
          ? `${derivResult.exprLatex} = ${derivResult.derivativeLatex}`
          : `f(${derivResult.variable}) = ${derivResult.derivativeLatex}`
        : `\\frac{d}{d${derivResult.variable}}\\left(${derivResult.exprLatex}\\right) = ${derivResult.derivativeLatex}`;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLatex(true);
      setTimeout(() => setCopiedLatex(false), 2000);
    } catch {
      // Clipboard might be blocked in non-HTTPS contexts
    }
  };

  const presetFilterOptions: { id: 'all' | CalcMode; label: string }[] = useMemo(
    () => [
      { id: 'all', label: t.presets.allLabel },
      { id: 'integral', label: lang === 'ar' ? 'التكامل' : 'Integrals' },
      { id: 'limit', label: lang === 'ar' ? 'النهايات' : 'Limits' },
      { id: 'derivative', label: lang === 'ar' ? 'المشتقات' : 'Derivatives' },
    ],
    [lang, t.presets.allLabel]
  );

  const filteredPresets = useMemo(
    () =>
      presetCategory === 'all'
        ? CALC_PRESETS
        : CALC_PRESETS.filter((p) => p.mode === presetCategory),
    [presetCategory]
  );

  const activeGraphPayload: GraphPayload | null = useMemo(() => {
    if (activeCategory === 'integral' && integralResult.ok) {
      return { kind: 'integral', result: integralResult };
    }
    if (activeCategory === 'limit' && limitResult.ok) {
      return { kind: 'limit', result: limitResult };
    }
    if (activeCategory === 'derivative' && derivResult.ok && !derivResult.isPureNumeric) {
      return { kind: 'derivative', result: derivResult };
    }
    return null;
  }, [activeCategory, integralResult, limitResult, derivResult]);

  const handleExportPdf = async (includeSolution: boolean) => {
    if (isExportingPdf) return;
    setShowPdfMenu(false);
    setPdfError(null);
    setIsExportingPdf(true);

    try {
      const graphDataUrl =
        includeSolution && activeGraphPayload
          ? renderLightGraphDataUrl(activeGraphPayload)
          : null;

      const nextData = buildPdfExportData({
        lang,
        includeSolution,
        operation,
        angleUnit,
        variable,
        expression,
        lowerBound,
        upperBound,
        limitTarget,
        limitDirection,
        derivEvalAt,
        matrixOp,
        matrixA,
        matrixB,
        integralResult,
        limitResult,
        derivResult,
        seriesResult,
        matrixResult,
        graphDataUrl,
      });

      setPdfData(nextData);

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      if (!pdfSheetRef.current) {
        throw new Error('PDF container not ready');
      }

      await generatePdfFromContainer(pdfSheetRef.current, nextData.filename);
    } catch {
      setPdfError(t.pdf.exportError);
    } finally {
      setIsExportingPdf(false);
      setPdfData(null);
    }
  };

  const renderCursorText = (val: string, field: ActiveField) => {
    if (activeField !== field) return val || ' ';
    const pos = Math.max(0, Math.min(cursors[field] ?? val.length, val.length));
    return `${val.slice(0, pos)}|${val.slice(pos)}`;
  };

  const localizedActiveMethod = localizeMethodLabel(
    activeCategory === 'integral'
      ? integralResult.methodLabel
      : activeCategory === 'limit'
        ? limitResult.methodLabel
        : activeCategory === 'series'
          ? seriesResult.methodLabel
          : activeCategory === 'matrix'
            ? matrixResult.methodLabel
            : derivResult.methodLabel,
    lang
  );

  const localizedActiveError = activeResultError
    ? localizeMessage(activeResultError, lang)
    : undefined;

  const activeWarnings = (
    activeCategory === 'integral'
      ? integralResult.warnings
      : activeCategory === 'limit'
        ? limitResult.warnings
        : activeCategory === 'series'
          ? seriesResult.warnings
          : activeCategory === 'matrix'
            ? matrixResult.warnings
            : derivResult.warnings
  ).map((w) => localizeMessage(w, lang));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      {/* Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-2 px-4 py-3 sm:gap-8 sm:px-6">
          <a
            href="#calculator"
            className="whitespace-nowrap shrink-0 text-lg font-bold tracking-tight text-slate-900 sm:text-xl dark:text-white"
          >
            {t.brandName}
          </a>

          <nav
            aria-label={t.nav.aria}
            className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex dark:text-slate-300"
          >
            <a
              href="#calculator"
              className="whitespace-nowrap shrink-0 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
            >
              {t.nav.calculator}
            </a>
            <a
              href="#examples"
              onClick={() => setShowPresets(true)}
              className="whitespace-nowrap shrink-0 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
            >
              {t.nav.examples}
            </a>
            <a
              href="#rules"
              className="whitespace-nowrap shrink-0 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
            >
              {t.nav.rules}
            </a>
            <a
              href="#history"
              className="whitespace-nowrap shrink-0 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
            >
              {t.nav.history}
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              data-testid="lang-toggle"
              onClick={() => setLang((prev) => (prev === 'ar' ? 'en' : 'ar'))}
              aria-label={t.langSwitch.aria}
              className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 sm:px-3 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Languages className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <span>{t.langSwitch.buttonLabel}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDark((d) => !d)}
              aria-label={isDark ? t.theme.toLight : t.theme.toDark}
              className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100 sm:px-3.5 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {isDark ? (
                <>
                  <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
                  <span>{t.theme.lightLabel}</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-slate-600" aria-hidden="true" />
                  <span>{t.theme.darkLabel}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1360px] px-4 py-5 sm:px-6 lg:py-6">
        {/* Compact Page Title */}
        <section className="mb-4 sm:mb-5">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
            {t.pageH1}
          </h1>
        </section>

        {/* Main Asymmetric Split Console */}
        <div
          id="calculator"
          className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12"
        >
          {/* Docked HiPER-Style Scientific Calculator Chassis (5 cols on desktop) */}
          <aside className="lg:col-span-5">
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-slate-300 shadow-md dark:border-slate-700"
            >
              {/* Upper Unified Natural-Display LCD Screen (edit directly inside equation slots) */}
              <NaturalDisplay
                lang={lang}
                operation={operation}
                operationLabel={t.operations[operation]}
                angleUnit={angleUnit}
                variable={variable}
                expression={expression}
                lowerBound={lowerBound}
                upperBound={upperBound}
                limitTarget={limitTarget}
                limitDirection={limitDirection}
                derivEvalAt={derivEvalAt}
                exprHasVars={exprHasVars}
                matrixOp={matrixOp}
                matrixA={matrixA}
                matrixB={matrixB}
                activeField={activeField}
                cursors={cursors}
                answerSummary={
                  !activeResultOk
                    ? null
                    : activeCategory === 'integral'
                      ? integralResult.isDefinite &&
                        integralResult.definiteNumericValue !== undefined
                        ? `= ${Number(integralResult.definiteNumericValue.toPrecision(9))}`
                        : `= ${localizedActiveMethod}`
                      : activeCategory === 'limit'
                        ? `= ${
                            limitResult.exists && limitResult.value !== undefined
                              ? Number(limitResult.value.toPrecision(8))
                              : limitResult.isInfinite
                                ? limitResult.infinitySign === '-inf'
                                  ? '−∞'
                                  : '+∞'
                                : t.display.dneWord
                          }`
                        : activeCategory === 'series'
                          ? seriesResult.value !== undefined
                            ? `= ${Number(seriesResult.value.toPrecision(9))}`
                            : `= ${localizedActiveMethod}`
                          : activeCategory === 'matrix'
                            ? matrixResult.scalarValue !== undefined
                              ? `= ${Number(matrixResult.scalarValue.toPrecision(9))}`
                              : `= ${localizedActiveMethod}`
                            : derivResult.isPureNumeric && derivResult.numericValue !== undefined
                              ? `= ${Number(derivResult.numericValue.toPrecision(9))}`
                              : derivResult.evalSlope !== undefined
                                ? `= ${Number(derivResult.evalSlope.toPrecision(8))}`
                                : `= ${localizedActiveMethod}`
                }
                answerError={activeResultOk ? null : (localizedActiveError ?? t.display.fallbackError)}
                onSelectField={(field: DisplaySlotField) => selectField(field)}
                onToggleAngleUnit={handleToggleAngleUnit}
                onChangeVariable={setVariable}
                onChangeLimitDirection={setLimitDirection}
                onQuickLimitTarget={(val) => {
                  setLimitTarget(val);
                  setCursors((p) => ({ ...p, limitTarget: val.length }));
                }}
                onQuickSeriesUpper={(val) => {
                  setUpperBound(val);
                  setCursors((p) => ({ ...p, upper: val.length }));
                }}
                onChangeMatrixOp={handleChangeMatrixOp}
                onChangeMatrixDim={handleChangeMatrixDim}
              />

              {/* Lower Dark Graphite Scientific Keypad */}
              <MathKeypad
                lang={lang}
                variable={variable}
                operation={operation}
                angleUnit={angleUnit}
                activeFieldLabel={getFieldLabel(activeField, lang)}
                onSelectOperation={handleSelectOperationFromKeypad}
                onToggleAngleUnit={handleToggleAngleUnit}
                onInsert={handleInsertToken}
                onToggleSign={handleToggleSign}
                onMoveCursor={handleMoveCursor}
                onBackspace={handleBackspace}
                onClear={handleClear}
                onSolve={() => runCurrentSolve(true)}
                onToggleExamples={handleToggleExamplesFromKeypad}
              />
            </form>
          </aside>

          {/* Solution Output, Graph & Detailed Steps (7 cols on desktop) */}
          <div ref={resultsTopRef} className="space-y-5 lg:col-span-7">
            {!activeResultOk ? (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50/70 p-5 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400"
                      aria-hidden="true"
                    />
                    <div className="space-y-2">
                      <h2 className="text-base font-semibold">{t.result.errorHeading}</h2>
                      <p className="text-sm leading-relaxed">{localizedActiveError}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isExportingPdf}
                    data-testid="export-pdf-problem-only-alert"
                    onClick={() => handleExportPdf(false)}
                    className="inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-800 transition-colors hover:bg-rose-100/60 disabled:opacity-60 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-200 dark:hover:bg-rose-950"
                  >
                    <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{isExportingPdf ? t.pdf.exportingBtn : t.pdf.problemOnly}</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Final Answer Card */}
                <section
                  aria-label={t.result.aria}
                  data-testid="integral-result-card"
                  className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-blue-700 dark:text-blue-400">
                        {localizedActiveMethod}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{t.operations[operation]}</span>
                      {activeCategory === 'integral' &&
                        integralResult.isDefinite &&
                        integralResult.numericalErrorEstimate !== undefined && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>
                              {t.result.numAccuracy}{' '}
                              <span dir="ltr" className="inline-block font-mono tabular-nums">
                                ±{integralResult.numericalErrorEstimate.toExponential(1)}
                              </span>
                            </span>
                          </>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div ref={pdfMenuContainerRef} className="relative">
                        <button
                          type="button"
                          disabled={isExportingPdf}
                          aria-haspopup="menu"
                          aria-expanded={showPdfMenu}
                          aria-label={t.pdf.exportAria}
                          data-testid="export-pdf-btn"
                          onClick={() => setShowPdfMenu((v) => !v)}
                          className="inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-60 dark:border-blue-800/80 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/70"
                        >
                          <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{isExportingPdf ? t.pdf.exportingBtn : t.pdf.exportBtn}</span>
                          <ChevronDown className="h-3.5 w-3.5 opacity-80" aria-hidden="true" />
                        </button>

                        {showPdfMenu && (
                          <div
                            role="menu"
                            aria-label={t.pdf.exportAria}
                            data-testid="export-pdf-menu"
                            className="start-0 sm:start-auto sm:end-0 absolute top-full z-40 mt-1.5 w-64 max-w-[calc(100vw-2.5rem)] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              data-testid="export-pdf-with-solution"
                              onClick={() => handleExportPdf(true)}
                              className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-start transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <CheckCircle2
                                className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
                                aria-hidden="true"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                  {t.pdf.withSolution}
                                </div>
                                <div className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                                  {t.pdf.withSolutionSub}
                                </div>
                              </div>
                            </button>

                            <button
                              type="button"
                              role="menuitem"
                              data-testid="export-pdf-problem-only"
                              onClick={() => handleExportPdf(false)}
                              className="mt-0.5 flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-start transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <FileText
                                className="mt-0.5 h-4 w-4 shrink-0 text-slate-600 dark:text-slate-300"
                                aria-hidden="true"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                  {t.pdf.problemOnly}
                                </div>
                                <div className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                                  {t.pdf.problemOnlySub}
                                </div>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyLatex}
                        className="inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        {copiedLatex ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                            <span>{t.result.copiedLatex}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{t.result.copyLatex}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {pdfError && (
                    <div
                      role="status"
                      className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
                    >
                      {pdfError}
                    </div>
                  )}

                  {/* Primary KaTeX Solution Box */}
                  <div className="overflow-x-auto rounded-lg border border-slate-200/80 bg-slate-50/70 px-4 py-5 text-slate-950 dark:border-slate-800 dark:bg-slate-950/70 dark:text-white">
                    {activeCategory === 'integral' && (
                      <MathBlock
                        latex={localizeLatex(
                          integralResult.isDefinite
                            ? `${integralResult.integralLatex} = ${integralResult.definiteExactLatex ?? Number((integralResult.definiteNumericValue ?? 0).toPrecision(8))}`
                            : `${integralResult.integralLatex} = ${integralResult.antiderivativeLatex ?? ''}`,
                          lang
                        )}
                        displayMode={true}
                        className="text-lg sm:text-xl"
                      />
                    )}
                    {activeCategory === 'limit' && (
                      <MathBlock
                        latex={localizeLatex(
                          `${limitResult.limitLatex} = ${limitResult.valueLatex}`,
                          lang
                        )}
                        displayMode={true}
                        className="text-lg sm:text-xl"
                      />
                    )}
                    {activeCategory === 'series' && (
                      <MathBlock
                        latex={localizeLatex(
                          `${seriesResult.seriesLatex} = ${seriesResult.valueLatex}`,
                          lang
                        )}
                        displayMode={true}
                        className="text-lg sm:text-xl"
                      />
                    )}
                    {activeCategory === 'matrix' && (
                      <MathBlock
                        latex={localizeLatex(
                          `${matrixResult.exprLatex} = ${matrixResult.resultLatex}`,
                          lang
                        )}
                        displayMode={true}
                        className="text-lg sm:text-xl"
                      />
                    )}
                    {activeCategory === 'derivative' && (
                      <MathBlock
                        latex={localizeLatex(
                          derivResult.isEvaluationOnly
                            ? derivResult.isPureNumeric
                              ? `${derivResult.exprLatex} = ${derivResult.derivativeLatex}`
                              : `f(${derivResult.variable}) = ${derivResult.derivativeLatex}`
                            : `\\frac{d}{d${derivResult.variable}}\\left(${derivResult.exprLatex}\\right) = ${derivResult.derivativeLatex}`,
                          lang
                        )}
                        displayMode={true}
                        className="text-lg sm:text-xl"
                      />
                    )}
                  </div>

                  {/* Definite Integral Numeric Output */}
                  {activeCategory === 'integral' &&
                    integralResult.isDefinite &&
                    integralResult.definiteNumericValue !== undefined && (
                      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4 border-t border-slate-100 pt-3.5 dark:border-slate-800">
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {t.result.definiteDecimalLabel}
                        </div>
                        <div
                          dir="ltr"
                          data-testid="definite-numeric-output"
                          className="font-mono text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-400"
                        >
                          {Number(integralResult.definiteNumericValue.toPrecision(10))}
                        </div>
                      </div>
                    )}

                  {activeCategory === 'integral' &&
                    integralResult.antiderivativeLatex &&
                    integralResult.isDefinite && (
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <span>{t.result.antiderivLabel(integralResult.variable)}</span>
                        <div className="overflow-x-auto">
                          <MathBlock
                            latex={`F(${integralResult.variable}) = ${integralResult.antiderivativeLatex}`}
                            displayMode={false}
                          />
                        </div>
                      </div>
                    )}

                  {/* Non-Elementary Indefinite Integral Panel */}
                  {activeCategory === 'integral' &&
                    integralResult.nonElementary &&
                    !integralResult.isDefinite && (
                      <div
                        data-testid="non-elementary-panel"
                        className="mt-4 space-y-3 rounded-lg border border-blue-200/80 bg-blue-50/40 p-3.5 dark:border-blue-900/60 dark:bg-blue-950/20"
                      >
                        <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                          {t.result.nonElemPart1}{' '}
                          {integralResult.specialFunctionLatex
                            ? t.result.nonElemSpecialAndTaylor
                            : t.result.nonElemTaylorOnly}
                          {t.result.nonElemPart2}
                        </p>

                        {integralResult.specialFunctionLatex && integralResult.taylorSeries && (
                          <div className="overflow-x-auto rounded-md border border-slate-200/80 bg-white px-3 py-2 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                            <div className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                              {t.result.taylorPrefix(integralResult.variable, integralResult.taylorSeries.x0)}
                            </div>
                            <MathBlock
                              latex={`\\int ${integralResult.integrandLatex}\\,d${integralResult.variable} \\approx ${integralResult.taylorSeries.antiderivLatex}`}
                              displayMode={true}
                            />
                          </div>
                        )}

                        <div className="flex flex-col gap-3 border-t border-blue-200/70 pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-blue-900/50">
                          <div className="flex flex-wrap items-center gap-2">
                            <label
                              htmlFor="eval-point-x"
                              className="text-xs font-medium text-slate-700 dark:text-slate-300"
                            >
                              {t.result.evalRangeFrom(
                                integralResult.taylorSeries?.x0 ?? 0,
                                integralResult.variable
                              )}
                            </label>
                            <input
                              id="eval-point-x"
                              type="text"
                              readOnly
                              inputMode="none"
                              dir="ltr"
                              value={
                                activeField === 'evalPointX'
                                  ? renderCursorText(evalPointX, 'evalPointX')
                                  : evalPointX
                              }
                              onClick={() => selectField('evalPointX')}
                              onFocus={() => selectField('evalPointX')}
                              className={`w-20 cursor-pointer rounded-md border px-2 py-1 font-mono text-xs focus:outline-none ${
                                activeField === 'evalPointX'
                                  ? 'border-blue-600 bg-blue-50/40 text-slate-950 dark:border-blue-500 dark:bg-blue-950/30 dark:text-white'
                                  : 'border-slate-300 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white'
                              }`}
                            />
                            {nonElemEval && Number.isFinite(nonElemEval.value) && (
                              <span
                                dir="ltr"
                                data-testid="nonelem-eval-output"
                                className="font-mono text-sm font-semibold tabular-nums text-blue-700 dark:text-blue-400"
                              >
                                F({evalPointX || nonElemEval.x0 + 1}) ≈{' '}
                                {Number(nonElemEval.value.toPrecision(8))}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const nextLo =
                                lowerBound || String(integralResult.taylorSeries?.x0 ?? 0);
                              const nextHi = upperBound || evalPointX || '1';
                              setOperation('def_integral');
                              setLowerBound(nextLo);
                              setUpperBound(nextHi);
                              executeSolve({
                                targetOp: 'def_integral',
                                angleUnit,
                                expression,
                                variable,
                                lowerBound: nextLo,
                                upperBound: nextHi,
                                limitTarget,
                                limitDirection,
                                derivEvalAt,
                                saveToHistory: true,
                              });
                            }}
                            className="min-h-[38px] whitespace-nowrap shrink-0 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                          >
                            {t.result.calcDefiniteBtn}
                          </button>
                        </div>
                      </div>
                    )}

                  {/* Limit One-Sided Comparison Summary */}
                  {activeCategory === 'limit' &&
                    (limitResult.leftLimitLatex || limitResult.rightLimitLatex) && (
                      <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3.5 sm:grid-cols-2 dark:border-slate-800">
                        {limitResult.rightLimitLatex && (
                          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950/60">
                            <div className="mb-1 text-slate-500 dark:text-slate-400">
                              {t.result.rightLimitLabel(limitResult.variable, limitResult.target.latex)}
                            </div>
                            <MathBlock latex={localizeLatex(limitResult.rightLimitLatex, lang)} displayMode={false} />
                          </div>
                        )}
                        {limitResult.leftLimitLatex && (
                          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950/60">
                            <div className="mb-1 text-slate-500 dark:text-slate-400">
                              {t.result.leftLimitLabel(limitResult.variable, limitResult.target.latex)}
                            </div>
                            <MathBlock latex={localizeLatex(limitResult.leftLimitLatex, lang)} displayMode={false} />
                          </div>
                        )}
                      </div>
                    )}

                  {activeCategory === 'limit' &&
                    limitResult.exists &&
                    limitResult.value !== undefined && (
                      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4 border-t border-slate-100 pt-3.5 dark:border-slate-800">
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {t.result.limitNumericLabel}
                        </div>
                        <div
                          dir="ltr"
                          data-testid="limit-numeric-output"
                          className="font-mono text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-400"
                        >
                          {Number(limitResult.value.toPrecision(9))}
                        </div>
                      </div>
                    )}

                  {activeCategory === 'series' && seriesResult.value !== undefined && (
                    <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4 border-t border-slate-100 pt-3.5 dark:border-slate-800">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {t.result.seriesOutputLabel(seriesResult.termCount)}
                      </div>
                      <div
                        dir="ltr"
                        data-testid="series-numeric-output"
                        className="font-mono text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-400"
                      >
                        {Number(seriesResult.value.toPrecision(10))}
                      </div>
                    </div>
                  )}

                  {activeCategory === 'matrix' && matrixResult.scalarValue !== undefined && (
                    <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4 border-t border-slate-100 pt-3.5 dark:border-slate-800">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {t.result.matrixScalarLabel}
                      </div>
                      <div
                        dir="ltr"
                        data-testid="matrix-scalar-output"
                        className="font-mono text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-400"
                      >
                        {Number(matrixResult.scalarValue.toPrecision(10))}
                      </div>
                    </div>
                  )}

                  {activeCategory === 'derivative' && derivResult.isPureNumeric && derivResult.numericValue !== undefined && (
                    <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4 border-t border-slate-100 pt-3.5 dark:border-slate-800">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {t.result.calcDecimalLabel}
                      </div>
                      <div
                        dir="ltr"
                        data-testid="calc-numeric-output"
                        className="font-mono text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-400"
                      >
                        {Number(derivResult.numericValue.toPrecision(10))}
                      </div>
                    </div>
                  )}

                  {activeCategory === 'derivative' && derivResult.evalSlope !== undefined && (
                    <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4 border-t border-slate-100 pt-3.5 dark:border-slate-800">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {derivResult.isEvaluationOnly
                          ? t.result.valueAtFunc(derivResult.variable)
                          : t.result.valueAtDeriv(derivResult.variable)}{' '}
                        <span dir="ltr" className="font-mono">
                          {derivEvalAt}
                        </span>
                        :
                      </div>
                      <div
                        dir="ltr"
                        className="font-mono text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-400"
                      >
                        {Number(derivResult.evalSlope.toPrecision(9))}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {activeWarnings.length > 0 && (
                    <div className="mt-4 space-y-1.5 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                      {activeWarnings.map((w, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Interactive Function Graph */}
                {activeGraphPayload && (
                  <IntegralGraph lang={lang} payload={activeGraphPayload} isDark={isDark} />
                )}

                {/* Detailed Step-by-Step Solution */}
                <StepsPanel
                  lang={lang}
                  steps={
                    activeCategory === 'integral'
                      ? integralResult.steps
                      : activeCategory === 'limit'
                        ? limitResult.steps
                        : activeCategory === 'series'
                          ? seriesResult.steps
                          : activeCategory === 'matrix'
                            ? matrixResult.steps
                            : derivResult.steps
                  }
                  simpsonData={activeCategory === 'integral' ? integralResult.simpsonData : undefined}
                />
              </>
            )}
          </div>
        </div>

        {/* Collapsible Curated Presets Grid (hidden by default) */}
        <section
          id="examples"
          ref={examplesSectionRef}
          className="mt-10 border-t border-slate-200 pt-6 dark:border-slate-800"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
                {t.presets.heading}
              </h2>
            </div>

            <button
              type="button"
              aria-expanded={showPresets}
              aria-controls="examples-panel"
              data-testid="toggle-examples-btn"
              onClick={() => setShowPresets((prev) => !prev)}
              className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span>{showPresets ? t.presets.hideBtn : t.presets.showBtn(CALC_PRESETS.length)}</span>
              {showPresets ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {showPresets && (
            <div id="examples-panel" className="mt-5 space-y-5">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.presets.filterAria}>
                {presetFilterOptions.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setPresetCategory(cat.id)}
                    className={`min-h-[36px] whitespace-nowrap shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      presetCategory === cat.id
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleLoadPreset(preset)}
                    className="flex flex-col items-stretch justify-between rounded-xl border border-slate-200 bg-white p-4 text-start transition-colors hover:border-blue-400 hover:bg-blue-50/30 focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500 dark:hover:bg-slate-800/70"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-blue-700 dark:text-blue-400">
                        {lang === 'ar' ? preset.category : preset.categoryEn}
                      </span>
                      <span>
                        {preset.mode === 'integral'
                          ? preset.isDefinite
                            ? t.presets.defTag
                            : t.presets.indefTag
                          : preset.mode === 'limit'
                            ? t.presets.limitTag
                            : t.presets.derivTag}
                      </span>
                    </div>
                    <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {lang === 'ar' ? preset.title : preset.titleEn}
                    </div>
                    <div className="overflow-x-auto rounded-lg bg-slate-50 px-3 py-2 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
                      <MathBlock latex={preset.latexPreview} displayMode={true} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Quick Reference Rules */}
        <section id="rules" className="mt-12 border-t border-slate-200 pt-8 dark:border-slate-800">
          <div className="mb-5 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {t.rules.heading}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {MATH_RULES_REFERENCE.map((rule) => (
              <div
                key={rule.title}
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {lang === 'ar' ? rule.title : rule.titleEn}
                </h3>
                <div className="mb-2.5 overflow-x-auto rounded-lg bg-slate-50 px-3 py-2.5 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
                  <MathBlock latex={rule.latex} displayMode={true} />
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {lang === 'ar' ? rule.note : rule.noteEn}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Saved Calculation History */}
        <section id="history" className="mt-12 border-t border-slate-200 pt-8 dark:border-slate-800">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {t.history.heading}
              </h2>
            </div>

            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setHistory([])}
                className="min-h-[36px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t.history.clearBtn}
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
              {t.history.empty}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <button
                    type="button"
                    onClick={() => {
                      const nextUnit = item.angleUnit ?? angleUnit;
                      setOperation(item.operation);
                      setAngleUnit(nextUnit);
                      setExpression(item.expression);
                      setVariable(item.variable);
                      setLowerBound(item.lowerBound);
                      setUpperBound(item.upperBound);
                      setLimitTarget(item.limitTarget);
                      setLimitDirection(item.limitDirection);
                      if (item.matrixOp) setMatrixOp(item.matrixOp);
                      if (item.matrixA) setMatrixA(item.matrixA);
                      if (item.matrixB) setMatrixB(item.matrixB);
                      setActiveField(null);
                      setLastField(item.operation === 'matrix' ? 'mat:A:0:0' : 'expr');
                      setCursors((p) => ({ ...p, expr: item.expression.length }));
                      executeSolve({
                        targetOp: item.operation,
                        angleUnit: nextUnit,
                        expression: item.expression,
                        variable: item.variable,
                        lowerBound: item.lowerBound,
                        upperBound: item.upperBound,
                        limitTarget: item.limitTarget,
                        limitDirection: item.limitDirection,
                        derivEvalAt,
                        matrixOp: item.matrixOp,
                        matrixA: item.matrixA,
                        matrixB: item.matrixB,
                        saveToHistory: false,
                      });
                      resultsTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="min-w-0 flex-1 overflow-x-auto text-start focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    <div className="mb-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {t.operations[item.operation]} · {localizeMethodLabel(item.methodLabel, lang)}
                    </div>
                    <MathBlock latex={localizeLatex(item.resultLatex, lang)} displayMode={false} />
                  </button>

                  <button
                    type="button"
                    aria-label={t.history.deleteAria(item.expression || t.operations[item.operation])}
                    onClick={() => setHistory((prev) => prev.filter((h) => h.id !== item.id))}
                    className="inline-flex min-h-[38px] min-w-[38px] shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="mt-12 border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        {t.footer}
      </footer>

      <PdfExportSheet ref={pdfSheetRef} data={pdfData} />
    </div>
  );
}
