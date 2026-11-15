import { ArrowLeft, ArrowRight, Check, Delete } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AppLang, KEYPAD_ARIA_EN, KEYPAD_VARIANT_SUB_EN, UI_TEXT } from '../i18n';
import { AngleUnit } from '../math/ast';

export type CalcOperation =
  | 'indef_integral'
  | 'def_integral'
  | 'limit'
  | 'derivative'
  | 'sum'
  | 'prod'
  | 'matrix'
  | 'evaluate';

interface MathKeypadProps {
  lang: AppLang;
  variable: string;
  operation: CalcOperation;
  angleUnit: AngleUnit;
  activeFieldLabel: string;
  onSelectOperation: (op: CalcOperation) => void;
  onToggleAngleUnit: () => void;
  onInsert: (token: string, cursorOffset?: number) => void;
  onToggleSign: () => void;
  onMoveCursor: (delta: number) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSolve: () => void;
  onToggleExamples?: () => void;
}

interface SciVariantDef {
  id: string;
  label: string;
  sub?: string;
  insert: string;
  cursorOffset?: number;
  aria: string;
}

interface SciKeyDef {
  id: string;
  label: string;
  groupHint: string;
  insert: string;
  cursorOffset?: number;
  aria: string;
  textAccent?: 'blue' | 'purple';
  variants: SciVariantDef[];
}

interface NumOpKeyDef {
  id: string;
  label: string;
  insert: string;
  cursorOffset?: number;
  aria: string;
  kind: 'num' | 'op' | 'sign' | 'solve';
}

const LONG_PRESS_MS = 350;

export function MathKeypad({
  lang,
  variable,
  operation,
  angleUnit,
  activeFieldLabel,
  onSelectOperation,
  onToggleAngleUnit,
  onInsert,
  onToggleSign,
  onMoveCursor,
  onBackspace,
  onClear,
  onSolve,
  onToggleExamples,
}: MathKeypadProps) {
  const t = UI_TEXT[lang].keypad;
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);

  const holdTimerRef = useRef<number | null>(null);
  const suppressClickIdRef = useRef<string | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const opButtons: { id: CalcOperation; label: string; sub: string; aria: string }[] = [
    { id: 'indef_integral', label: `∫ d${variable}`, ...t.opButtons.indef_integral },
    { id: 'def_integral', label: '∫ₐᵇ', ...t.opButtons.def_integral },
    { id: 'limit', label: 'lim', ...t.opButtons.limit },
    { id: 'derivative', label: `d/d${variable}`, ...t.opButtons.derivative },
    { id: 'sum', label: 'Σ', ...t.opButtons.sum },
    { id: 'prod', label: 'Π', ...t.opButtons.prod },
    { id: 'matrix', label: '[ A ]', ...t.opButtons.matrix },
    { id: 'evaluate', label: t.evalLabel, ...t.opButtons.evaluate },
  ];

  // 3 rows x 6 columns (17 grouped scientific keys + 1 RAD/DEG toggle)
  const sciKeys: SciKeyDef[] = [
    // Row 1: Constants, Trig & Integer/Absolute Families
    {
      id: 'pi',
      label: 'π',
      groupHint: 'π/2  2π',
      insert: 'pi',
      aria: 'باي',
      variants: [
        { id: 'pi-1', label: 'π', insert: 'pi', aria: 'باي' },
        { id: 'pi-2', label: 'π/2', insert: 'pi/2', aria: 'باي على اثنين' },
        { id: 'pi-3', label: 'π/3', insert: 'pi/3', aria: 'باي على ثلاثة' },
        { id: 'pi-4', label: 'π/4', insert: 'pi/4', aria: 'باي على أربعة' },
        { id: 'pi-6', label: 'π/6', insert: 'pi/6', aria: 'باي على ستة' },
        { id: 'pi-2x', label: '2π', insert: '2*pi', aria: 'اثنان باي' },
      ],
    },
    {
      id: 'sin',
      label: 'sin',
      groupHint: 'sin⁻¹ sinh',
      insert: 'sin()',
      cursorOffset: -1,
      aria: 'جيب sin',
      variants: [
        { id: 'sin-base', label: 'sin', insert: 'sin()', cursorOffset: -1, aria: 'جيب sin' },
        { id: 'sin-inv', label: 'sin⁻¹', insert: 'arcsin()', cursorOffset: -1, aria: 'معكوس الجيب arcsin' },
        { id: 'sin-hyp', label: 'sinh', insert: 'sinh()', cursorOffset: -1, aria: 'جيب زائدي sinh' },
        { id: 'sin-ahyp', label: 'sinh⁻¹', insert: 'asinh()', cursorOffset: -1, aria: 'معكوس الجيب الزائدي asinh' },
        { id: 'sin-sq', label: 'sin²', insert: 'sin^2()', cursorOffset: -1, aria: 'جيب تربيع' },
        { id: 'sin-csc', label: 'csc', insert: 'csc()', cursorOffset: -1, aria: 'قاطع التمام csc' },
        { id: 'sin-csch', label: 'csch', insert: 'csch()', cursorOffset: -1, aria: 'قاطع تمام زائدي csch' },
        { id: 'sin-acsc', label: 'csc⁻¹', insert: 'arccsc()', cursorOffset: -1, aria: 'معكوس قاطع التمام arccsc' },
      ],
    },
    {
      id: 'cos',
      label: 'cos',
      groupHint: 'cos⁻¹ cosh',
      insert: 'cos()',
      cursorOffset: -1,
      aria: 'جيب التمام cos',
      variants: [
        { id: 'cos-base', label: 'cos', insert: 'cos()', cursorOffset: -1, aria: 'جيب التمام cos' },
        { id: 'cos-inv', label: 'cos⁻¹', insert: 'arccos()', cursorOffset: -1, aria: 'معكوس جيب التمام arccos' },
        { id: 'cos-hyp', label: 'cosh', insert: 'cosh()', cursorOffset: -1, aria: 'جيب تمام زائدي cosh' },
        { id: 'cos-ahyp', label: 'cosh⁻¹', insert: 'acosh()', cursorOffset: -1, aria: 'معكوس جيب التمام الزائدي acosh' },
        { id: 'cos-sq', label: 'cos²', insert: 'cos^2()', cursorOffset: -1, aria: 'جيب تمام تربيع' },
        { id: 'cos-sec', label: 'sec', insert: 'sec()', cursorOffset: -1, aria: 'القاطع sec' },
        { id: 'cos-sech', label: 'sech', insert: 'sech()', cursorOffset: -1, aria: 'قاطع زائدي sech' },
        { id: 'cos-asec', label: 'sec⁻¹', insert: 'arcsec()', cursorOffset: -1, aria: 'معكوس القاطع arcsec' },
      ],
    },
    {
      id: 'tan',
      label: 'tan',
      groupHint: 'tan⁻¹ cot',
      insert: 'tan()',
      cursorOffset: -1,
      aria: 'الظل tan',
      variants: [
        { id: 'tan-base', label: 'tan', insert: 'tan()', cursorOffset: -1, aria: 'الظل tan' },
        { id: 'tan-inv', label: 'tan⁻¹', insert: 'arctan()', cursorOffset: -1, aria: 'معكوس الظل arctan' },
        { id: 'tan-hyp', label: 'tanh', insert: 'tanh()', cursorOffset: -1, aria: 'ظل زائدي tanh' },
        { id: 'tan-ahyp', label: 'tanh⁻¹', insert: 'atanh()', cursorOffset: -1, aria: 'معكوس الظل الزائدي atanh' },
        { id: 'tan-sq', label: 'tan²', insert: 'tan^2()', cursorOffset: -1, aria: 'ظل تربيع' },
        { id: 'tan-cot', label: 'cot', insert: 'cot()', cursorOffset: -1, aria: 'ظل التمام cot' },
        { id: 'tan-coth', label: 'coth', insert: 'coth()', cursorOffset: -1, aria: 'ظل تمام زائدي coth' },
        { id: 'tan-acot', label: 'cot⁻¹', insert: 'arccot()', cursorOffset: -1, aria: 'معكوس ظل التمام arccot' },
      ],
    },
    {
      id: 'abs',
      label: '| x |',
      groupHint: '⌊x⌋ ⌈x⌉',
      insert: 'abs()',
      cursorOffset: -1,
      aria: 'القيمة المطلقة',
      variants: [
        { id: 'abs-base', label: '| x |', sub: 'مطلق', insert: 'abs()', cursorOffset: -1, aria: 'القيمة المطلقة' },
        { id: 'abs-floor', label: '⌊ x ⌋', sub: 'floor', insert: 'floor()', cursorOffset: -1, aria: 'أكبر عدد صحيح floor' },
        { id: 'abs-ceil', label: '⌈ x ⌉', sub: 'ceil', insert: 'ceil()', cursorOffset: -1, aria: 'أصغر عدد صحيح ceil' },
        { id: 'abs-round', label: 'round', sub: 'تقريب', insert: 'round()', cursorOffset: -1, aria: 'التقريب لأقرب عدد صحيح' },
        { id: 'abs-sgn', label: 'sgn', sub: 'إشارة', insert: 'sgn()', cursorOffset: -1, aria: 'دالة الإشارة sgn' },
        { id: 'abs-inv', label: `${variable}⁻¹`, sub: 'مقلوب', insert: `1/${variable}`, aria: `مقلوب ${variable}` },
      ],
    },
    {
      id: 'e',
      label: 'e',
      groupHint: 'eˣ  10ˣ',
      insert: 'e',
      aria: 'العدد النيبيري e',
      textAccent: 'purple',
      variants: [
        { id: 'e-base', label: 'e', insert: 'e', aria: 'العدد النيبيري e' },
        { id: 'e-var', label: `e^${variable}`, insert: `e^(${variable})`, aria: `الدالة الأسية e أس ${variable}` },
        { id: 'e-pow', label: 'e^( )', insert: 'e^()', cursorOffset: -1, aria: 'أس أساسه e' },
        { id: 'e-neg', label: `e^-${variable}`, insert: `e^(-${variable})`, aria: `e أس سالب ${variable}` },
        { id: 'e-10', label: '10^( )', insert: '10^()', cursorOffset: -1, aria: 'أساس عشري 10' },
        { id: 'e-2', label: '2^( )', insert: '2^()', cursorOffset: -1, aria: 'أساس ثنائي 2' },
      ],
    },

    // Row 2: Powers, Roots, Logarithms, Fractions/Factorial, Variables & Infinity
    {
      id: 'sq',
      label: `${variable}²`,
      groupHint: 'x³  xʸ',
      insert: `${variable}^2`,
      aria: `${variable} تربيع`,
      variants: [
        { id: 'sq-2', label: `${variable}²`, insert: `${variable}^2`, aria: `${variable} تربيع` },
        { id: 'sq-3', label: `${variable}³`, insert: `${variable}^3`, aria: `${variable} تكعيب` },
        { id: 'sq-y', label: 'xʸ', insert: '^()', cursorOffset: -1, aria: 'أس بقوسين' },
        { id: 'sq-p2', label: '( )²', insert: '()^2', cursorOffset: -3, aria: 'قوس تربيع' },
        { id: 'sq-p3', label: '( )³', insert: '()^3', cursorOffset: -3, aria: 'قوس تكعيب' },
        { id: 'sq-inv', label: `${variable}⁻¹`, insert: `1/${variable}`, aria: `مقلوب ${variable}` },
      ],
    },
    {
      id: 'sqrt',
      label: '√x',
      groupHint: '∛x 1/√x',
      insert: 'sqrt()',
      cursorOffset: -1,
      aria: 'الجذر التربيعي',
      variants: [
        { id: 'sqrt-2', label: '√( )', insert: 'sqrt()', cursorOffset: -1, aria: 'الجذر التربيعي' },
        { id: 'sqrt-3', label: '∛( )', insert: 'cbrt()', cursorOffset: -1, aria: 'الجذر التكعيبي' },
        { id: 'sqrt-x', label: `√${variable}`, insert: `sqrt(${variable})`, aria: `الجذر التربيعي لـ ${variable}` },
        { id: 'sqrt-inv', label: '1/√( )', insert: '1/sqrt()', cursorOffset: -1, aria: 'مقلوب الجذر التربيعي' },
      ],
    },
    {
      id: 'ln',
      label: 'ln',
      groupHint: 'log₁₀ log₂',
      insert: 'ln()',
      cursorOffset: -1,
      aria: 'اللوغاريتم الطبيعي',
      variants: [
        { id: 'ln-base', label: 'ln', insert: 'ln()', cursorOffset: -1, aria: 'اللوغاريتم الطبيعي' },
        { id: 'ln-10', label: 'log₁₀', insert: 'log10()', cursorOffset: -1, aria: 'لوغاريتم عشري' },
        { id: 'ln-2', label: 'log₂', insert: 'log2()', cursorOffset: -1, aria: 'لوغاريتم ثنائي' },
        { id: 'ln-b', label: 'log_b', insert: 'log(,)', cursorOffset: -2, aria: 'لوغاريتم لأساس مخصص' },
        { id: 'ln-var', label: `ln(${variable})`, insert: `ln(${variable})`, aria: `لوغاريتم ${variable}` },
      ],
    },
    {
      id: 'frac',
      label: 'a/b',
      groupHint: '1/x  n!',
      insert: '()/()',
      cursorOffset: -4,
      aria: 'كسر بسط ومقام',
      variants: [
        { id: 'frac-ab', label: 'a/b', insert: '()/()', cursorOffset: -4, aria: 'كسر بسط ومقام' },
        { id: 'frac-rec', label: '1/( )', insert: '1/()', cursorOffset: -1, aria: 'مقلوب تعبير' },
        { id: 'frac-fact', label: 'n!', sub: 'مضروب', insert: 'fact()', cursorOffset: -1, aria: 'المضروب ودالة غاما' },
        { id: 'frac-exp', label: 'exp( )', insert: 'exp()', cursorOffset: -1, aria: 'الدالة الأسية exp' },
      ],
    },
    {
      id: 'var',
      label: variable.toUpperCase(),
      groupHint: 'k  t  u',
      insert: variable,
      aria: `المتغير ${variable}`,
      textAccent: 'blue',
      variants: [
        { id: 'var-x', label: 'x', insert: 'x', aria: 'المتغير x' },
        { id: 'var-k', label: 'k', insert: 'k', aria: 'المتغير k' },
        { id: 'var-t', label: 't', insert: 't', aria: 'المتغير t' },
        { id: 'var-u', label: 'u', insert: 'u', aria: 'المتغير u' },
        { id: 'var-y', label: 'y', insert: 'y', aria: 'المتغير y' },
      ],
    },
    {
      id: 'inf',
      label: '+∞',
      groupHint: '−∞  0  1',
      insert: 'oo',
      aria: 'موجب ما لا نهاية',
      textAccent: 'blue',
      variants: [
        { id: 'inf-pos', label: '+∞', insert: 'oo', aria: 'موجب ما لا نهاية' },
        { id: 'inf-neg', label: '−∞', insert: '-oo', aria: 'سالب ما لا نهاية' },
        { id: 'inf-0', label: '0', insert: '0', aria: 'الصفر' },
        { id: 'inf-1', label: '1', insert: '1', aria: 'الواحد' },
      ],
    },

    // Row 3 (Cols 1-5): Factorial, Combinatorics, GCD/LCM, Mod/Min/Max, Comma/log_b
    {
      id: 'fact',
      label: 'n!',
      groupHint: 'fact  !',
      insert: '!',
      aria: 'المضروب !',
      variants: [
        { id: 'fact-bang', label: 'n!', sub: 'مضروب', insert: '!', aria: 'رمز المضروب !' },
        { id: 'fact-fn', label: 'fact( )', sub: 'دالة', insert: 'fact()', cursorOffset: -1, aria: 'دالة المضروب fact' },
      ],
    },
    {
      id: 'comb',
      label: 'nCr',
      groupHint: 'nCr  nPr',
      insert: 'nCr(,)',
      cursorOffset: -2,
      aria: 'التوافيق nCr',
      variants: [
        { id: 'comb-ncr', label: 'nCr', sub: 'توافيق', insert: 'nCr(,)', cursorOffset: -2, aria: 'التوافيق nCr' },
        { id: 'comb-npr', label: 'nPr', sub: 'تباديل', insert: 'nPr(,)', cursorOffset: -2, aria: 'التباديل nPr' },
      ],
    },
    {
      id: 'gcd',
      label: 'gcd',
      groupHint: 'gcd  lcm',
      insert: 'gcd(,)',
      cursorOffset: -2,
      aria: 'العامل المشترك الأكبر gcd',
      variants: [
        { id: 'num-gcd', label: 'gcd', sub: 'عامل مشترك', insert: 'gcd(,)', cursorOffset: -2, aria: 'العامل المشترك الأكبر gcd' },
        { id: 'num-lcm', label: 'lcm', sub: 'مضاعف مشترك', insert: 'lcm(,)', cursorOffset: -2, aria: 'المضاعف المشترك الأصغر lcm' },
      ],
    },
    {
      id: 'mod',
      label: 'mod',
      groupHint: 'min  max',
      insert: 'mod(,)',
      cursorOffset: -2,
      aria: 'باقي القسمة mod',
      variants: [
        { id: 'op-mod', label: 'mod', sub: 'باقي قسمة', insert: 'mod(,)', cursorOffset: -2, aria: 'باقي القسمة mod' },
        { id: 'op-min', label: 'min', sub: 'الأصغر', insert: 'min(,)', cursorOffset: -2, aria: 'القيمة الصغرى min' },
        { id: 'op-max', label: 'max', sub: 'الأكبر', insert: 'max(,)', cursorOffset: -2, aria: 'القيمة الكبرى max' },
      ],
    },
    {
      id: 'comma',
      label: ',',
      groupHint: 'log_b( )',
      insert: ',',
      aria: 'فاصلة بين المعاملات',
      variants: [
        { id: 'sep-comma', label: ',', sub: 'فاصلة', insert: ',', aria: 'فاصلة' },
        { id: 'sep-logb', label: 'log_b', sub: 'لوغاريتم b', insert: 'log(,)', cursorOffset: -2, aria: 'لوغاريتم للأساس b' },
      ],
    },
  ];

  // 4 rows x 5 columns of HiPER-style deep black numbers & slate-gray operators
  const numOpKeys: NumOpKeyDef[] = [
    { id: '7', label: '7', insert: '7', aria: 'الرقم 7', kind: 'num' },
    { id: '8', label: '8', insert: '8', aria: 'الرقم 8', kind: 'num' },
    { id: '9', label: '9', insert: '9', aria: 'الرقم 9', kind: 'num' },
    { id: 'lparen', label: '(', insert: '(', aria: 'قوس مفتوح', kind: 'op' },
    { id: 'rparen', label: ')', insert: ')', aria: 'قوس مغلق', kind: 'op' },

    { id: '4', label: '4', insert: '4', aria: 'الرقم 4', kind: 'num' },
    { id: '5', label: '5', insert: '5', aria: 'الرقم 5', kind: 'num' },
    { id: '6', label: '6', insert: '6', aria: 'الرقم 6', kind: 'num' },
    { id: 'mul', label: '×', insert: '*', aria: 'ضرب', kind: 'op' },
    { id: 'div', label: '÷', insert: '/', aria: 'قسمة', kind: 'op' },

    { id: '1', label: '1', insert: '1', aria: 'الرقم 1', kind: 'num' },
    { id: '2', label: '2', insert: '2', aria: 'الرقم 2', kind: 'num' },
    { id: '3', label: '3', insert: '3', aria: 'الرقم 3', kind: 'num' },
    { id: 'plus', label: '+', insert: '+', aria: 'جمع', kind: 'op' },
    { id: 'minus', label: '−', insert: '-', aria: 'طرح', kind: 'op' },

    { id: '0', label: '0', insert: '0', aria: 'الرقم 0', kind: 'num' },
    { id: 'dot', label: '.', insert: '.', aria: 'فاصلة عشرية', kind: 'num' },
    { id: 'sign', label: '+/−', insert: '-', aria: 'تبديل الإشارة', kind: 'sign' },
    { id: 'powop', label: '^', insert: '^', aria: 'أس', kind: 'op' },
    { id: 'solve', label: '✓', insert: '', aria: 'احسب النتيجة والخطوات', kind: 'solve' },
  ];

  const clearHoldTimer = () => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearHoldTimer();
  }, []);

  // Close group popover when clicking outside or pressing Escape
  useEffect(() => {
    if (!openGroupId) return;

    const handleDocPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-grouped-popover="true"]')) return;
      if (target.closest(`[data-group-trigger="${openGroupId}"]`)) return;
      setOpenGroupId(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenGroupId(null);
      }
    };

    document.addEventListener('pointerdown', handleDocPointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleDocPointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openGroupId]);

  const handleVariantSelect = (variant: SciVariantDef) => {
    onInsert(variant.insert, variant.cursorOffset ?? 0);
    setOpenGroupId(null);
  };

  const handleSciPointerDown = (key: SciKeyDef, button: number) => {
    if (button !== 0) return;
    clearHoldTimer();
    suppressClickIdRef.current = null;
    holdTimerRef.current = window.setTimeout(() => {
      suppressClickIdRef.current = key.id;
      setOpenGroupId(key.id);
      holdTimerRef.current = null;
    }, LONG_PRESS_MS);
  };

  const handleSciPointerUp = (clientX: number, clientY: number) => {
    clearHoldTimer();
    if (openGroupId) {
      const el = document.elementFromPoint(clientX, clientY);
      const variantEl = el?.closest('[data-variant-id]') as HTMLElement | null;
      const variantId = variantEl?.getAttribute('data-variant-id');
      if (variantId) {
        const group = sciKeys.find((k) => k.id === openGroupId);
        const matched = group?.variants.find((v) => v.id === variantId);
        if (matched) {
          handleVariantSelect(matched);
        }
      }
    }
  };

  const handleSciClick = (key: SciKeyDef) => {
    clearHoldTimer();
    if (suppressClickIdRef.current === key.id) {
      suppressClickIdRef.current = null;
      return;
    }
    setOpenGroupId(null);
    onInsert(key.insert, key.cursorOffset ?? 0);
  };

  const handleNumOpClick = (key: NumOpKeyDef) => {
    setOpenGroupId(null);
    if (key.kind === 'solve') {
      onSolve();
      return;
    }
    if (key.kind === 'sign') {
      onToggleSign();
      return;
    }
    onInsert(key.insert, key.cursorOffset ?? 0);
  };

  return (
    <div
      data-testid="math-keypad"
      className="select-none space-y-2 rounded-b-xl border border-t-0 border-slate-700 bg-[#2c3036] p-2.5 text-white shadow-sm sm:p-3 dark:border-slate-800 dark:bg-[#1e2126]"
    >
      {/* Active target indicator + Long-press hint */}
      <div className="flex items-center justify-between gap-2 px-0.5 text-[11px] text-slate-300">
        <span className="truncate">
          {t.activeField}{' '}
          <strong className="font-semibold text-emerald-300">{activeFieldLabel}</strong>
        </span>
        <span className="shrink-0 text-[10px] text-slate-400">
          {t.longPressHint}
        </span>
      </div>

      {/* Row 1: Utility / Navigation Deck */}
      <div dir="ltr" className="grid grid-cols-5 gap-1.5">
        <button
          type="button"
          aria-label={t.examplesAria}
          onClick={() => {
            setOpenGroupId(null);
            onToggleExamples?.();
          }}
          className="min-h-[38px] rounded-[5px] border-b-2 border-slate-400 bg-[#d5dae0] px-1 text-[11px] font-bold text-[#181a1f] transition-colors hover:bg-[#e4e8ec] focus-visible:outline-2 focus-visible:outline-blue-400"
        >
          {t.examplesBtn}
        </button>

        <button
          type="button"
          aria-label={t.moveLeft}
          title={t.moveLeftTitle}
          onClick={() => {
            setOpenGroupId(null);
            onMoveCursor(-1);
          }}
          className="flex min-h-[38px] items-center justify-center rounded-[5px] border-b-2 border-slate-400 bg-[#d5dae0] text-[#181a1f] transition-colors hover:bg-[#e4e8ec] focus-visible:outline-2 focus-visible:outline-blue-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          aria-label={t.moveRight}
          title={t.moveRightTitle}
          onClick={() => {
            setOpenGroupId(null);
            onMoveCursor(1);
          }}
          className="flex min-h-[38px] items-center justify-center rounded-[5px] border-b-2 border-slate-400 bg-[#d5dae0] text-[#181a1f] transition-colors hover:bg-[#e4e8ec] focus-visible:outline-2 focus-visible:outline-blue-400"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          aria-label={t.backspaceAria}
          title={t.backspaceTitle}
          onClick={() => {
            setOpenGroupId(null);
            onBackspace();
          }}
          className="flex min-h-[38px] items-center justify-center rounded-[5px] border-b-2 border-amber-700 bg-[#f59e0b] text-[#181a1f] transition-colors hover:bg-[#fbbf24] focus-visible:outline-2 focus-visible:outline-amber-300"
        >
          <Delete className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          aria-label={t.clearAria}
          title={t.clearTitle}
          onClick={() => {
            setOpenGroupId(null);
            onClear();
          }}
          className="min-h-[38px] rounded-[5px] border-b-2 border-amber-700 bg-[#f59e0b] font-mono text-xs font-extrabold text-[#181a1f] transition-colors hover:bg-[#fbbf24] focus-visible:outline-2 focus-visible:outline-amber-300"
        >
          AC
        </button>
      </div>

      {/* Row 2: Core Calculus, Series & Matrix Operations inside Keypad */}
      <div
        dir="ltr"
        role="group"
        aria-label={t.opsGroupAria}
        className="grid grid-cols-4 gap-1.5 pt-0.5"
      >
        {opButtons.map((op) => {
          const active = operation === op.id;
          return (
            <button
              key={op.id}
              type="button"
              aria-label={op.aria}
              aria-pressed={active}
              onClick={() => {
                setOpenGroupId(null);
                onSelectOperation(op.id);
              }}
              className={`flex min-h-[42px] flex-col items-center justify-center rounded-[5px] border-b-2 px-1 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-blue-400 ${
                active
                  ? 'border-blue-900 bg-[#0284c7] text-white ring-1 ring-sky-300'
                  : 'border-slate-400 bg-[#e2e5ea] text-[#181a1f] hover:bg-white'
              }`}
            >
              <span className="font-mono text-xs font-bold leading-none sm:text-sm">
                {op.label}
              </span>
              <span
                className={`mt-0.5 text-[10px] leading-none ${
                  active ? 'text-sky-100' : 'text-slate-600'
                }`}
              >
                {op.sub}
              </span>
            </button>
          );
        })}
      </div>

      {/* Rows 3-4: 6-Column Grouped Silver Scientific Keys with Accurate Group Sub-labels Above */}
      <div dir="ltr" className="grid grid-cols-6 gap-x-1.5 gap-y-1.5 pt-0.5">
        {sciKeys.map((k, idx) => {
          const col = idx % 6;
          const isOpen = openGroupId === k.id;
          const alignClass =
            col <= 1 ? 'left-0' : col >= 4 ? 'right-0' : 'left-1/2 -translate-x-1/2';
          const gridCols =
            k.variants.length >= 8
              ? 'grid-cols-4'
              : k.variants.length <= 4
                ? 'grid-cols-2'
                : 'grid-cols-3';
          const keyAria = lang === 'ar' ? k.aria : (KEYPAD_ARIA_EN[k.id] ?? k.aria);

          return (
            <div key={k.id} className="relative flex flex-col items-center">
              <span className="mb-0.5 block w-full truncate text-center font-mono text-[8px] tracking-tighter leading-tight text-slate-300/95 sm:text-[9.5px] sm:tracking-normal">
                {k.groupHint}
              </span>

              <button
                type="button"
                data-group-trigger={k.id}
                data-testid={`sci-key-${k.id}`}
                aria-label={keyAria}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onPointerDown={(e) => handleSciPointerDown(k, e.button)}
                onPointerUp={(e) => handleSciPointerUp(e.clientX, e.clientY)}
                onPointerCancel={clearHoldTimer}
                onContextMenu={(e) => {
                  e.preventDefault();
                  clearHoldTimer();
                  setOpenGroupId((prev) => (prev === k.id ? null : k.id));
                }}
                onClick={() => handleSciClick(k)}
                className={`relative min-h-[40px] w-full rounded-[5px] border-b-2 px-0.5 font-mono text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-400 sm:text-[13px] ${
                  isOpen
                    ? 'border-sky-800 bg-sky-100 text-[#0c4a6e] ring-2 ring-sky-400'
                    : `border-slate-400 bg-[#e2e5ea] hover:bg-white ${
                        k.textAccent === 'blue'
                          ? 'font-bold text-[#0369a1]'
                          : k.textAccent === 'purple'
                            ? 'italic text-[#6d28d9]'
                            : 'text-[#181a1f]'
                      }`
                }`}
              >
                <span>{k.label}</span>
                {/* Subtle bottom-right corner dot indicating grouped long-press menu */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-1 bottom-1 h-1 w-1 rounded-full bg-slate-500/70"
                />
              </button>

              {isOpen && (
                <div
                  ref={popoverRef}
                  role="menu"
                  aria-label={t.groupMenuAria(k.label)}
                  data-grouped-popover="true"
                  data-testid={`group-popover-${k.id}`}
                  className={`absolute bottom-full z-40 mb-1.5 ${alignClass} w-max min-w-[144px] rounded-lg border border-slate-500 bg-[#1a1d23] p-1.5 shadow-xl`}
                >
                  <div className={`grid ${gridCols} gap-1`}>
                    {k.variants.map((v) => {
                      const vSub = v.sub
                        ? lang === 'ar'
                          ? v.sub
                          : (KEYPAD_VARIANT_SUB_EN[v.sub] ?? v.sub)
                        : undefined;
                      const vAria = lang === 'ar' ? v.aria : (KEYPAD_ARIA_EN[v.id] ?? v.aria);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          role="menuitem"
                          data-variant-id={v.id}
                          data-testid={`variant-${v.id}`}
                          aria-label={vAria}
                          onClick={() => handleVariantSelect(v)}
                          className="flex min-h-[38px] min-w-[50px] flex-col items-center justify-center whitespace-nowrap rounded bg-[#e2e5ea] px-1.5 py-0.5 font-mono text-xs font-semibold text-[#181a1f] transition-colors hover:bg-sky-100 hover:text-[#0369a1] focus-visible:outline-2 focus-visible:outline-sky-400"
                        >
                          <span className="leading-tight">{v.label}</span>
                          {vSub && (
                            <span className="text-[9px] font-normal leading-none text-slate-600">
                              {vSub}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Row 3 Col 6: Interactive RAD / DEG Angle Unit Key */}
        <div className="relative flex flex-col items-center">
          <span className="mb-0.5 block w-full truncate text-center font-mono text-[8px] tracking-tighter leading-tight text-slate-300/95 sm:text-[9.5px] sm:tracking-normal">
            DEG  RAD
          </span>
          <button
            type="button"
            data-testid="keypad-angle-toggle"
            aria-label={t.angleAria}
            aria-pressed={angleUnit === 'deg'}
            onClick={() => {
              setOpenGroupId(null);
              onToggleAngleUnit();
            }}
            className={`min-h-[40px] w-full rounded-[5px] border-b-2 px-0.5 font-mono text-xs font-extrabold transition-colors focus-visible:outline-2 focus-visible:outline-blue-400 sm:text-[13px] ${
              angleUnit === 'deg'
                ? 'border-amber-800 bg-amber-300 text-[#181a1f] hover:bg-amber-200'
                : 'border-slate-400 bg-[#d5dae0] text-[#0369a1] hover:bg-white'
            }`}
          >
            {angleUnit.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Rows 5-8: 5-Column Deep Black Numeric Keys & Slate-Gray Operator Keys */}
      <div dir="ltr" className="grid grid-cols-5 gap-1.5 pt-1.5">
        {numOpKeys.map((k) => {
          const isSolve = k.kind === 'solve';
          const isOp = k.kind === 'op';
          const numAria = lang === 'ar' ? k.aria : (KEYPAD_ARIA_EN[k.id] ?? k.aria);
          return (
            <button
              key={k.id}
              type="button"
              data-testid={isSolve ? 'keypad-equals-btn' : undefined}
              aria-label={numAria}
              onClick={() => handleNumOpClick(k)}
              className={`flex min-h-[44px] w-full items-center justify-center rounded-[5px] border-b-2 font-mono font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-blue-400 ${
                isSolve
                  ? 'border-emerald-900 bg-[#059669] text-white hover:bg-[#047857]'
                  : isOp
                    ? 'border-slate-800 bg-[#6b7280] text-lg text-white hover:bg-[#7b8290]'
                    : 'border-black bg-[#16181d] text-lg text-white hover:bg-[#23262e]'
              }`}
            >
              {isSolve ? (
                <span className="inline-flex items-center gap-1 text-base font-bold">
                  <Check className="h-5 w-5 stroke-[2.5]" aria-hidden="true" />
                  <span>=</span>
                </span>
              ) : (
                k.label
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
