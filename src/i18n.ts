import { CalcOperation } from './components/MathKeypad';
import { SolutionStep } from './math/integrator';
import { LimitDirection } from './math/limits';
import { MatrixOp } from './math/matrix';

export type AppLang = 'ar' | 'en';

export const LANG_STORAGE_KEY = 'calc_lang_v1';

export interface FieldLabelArgs {
  field: string | null;
  lang: AppLang;
}

export const UI_TEXT = {
  ar: {
    brandName: 'المتكامل',
    docTitle: 'المتكامل — آلة حاسبة رياضية وعلمية بالخطوات التفصيلية',
    pageH1: 'الة حاسبة احترافية',
    nav: {
      aria: 'التنقل الرئيسي',
      calculator: 'الحاسبة',
      examples: 'أمثلة جاهزة',
      rules: 'مرجع القواعد',
      history: 'السجل',
    },
    theme: {
      toLight: 'التبديل إلى الوضع الفاتح',
      toDark: 'التبديل إلى الوضع الداكن',
      lightLabel: 'الوضع الفاتح',
      darkLabel: 'الوضع الداكن',
    },
    langSwitch: {
      buttonLabel: 'English',
      aria: 'تبديل لغة الواجهة إلى الإنجليزية',
    },
    operations: {
      indef_integral: 'تكامل غير محدود',
      def_integral: 'تكامل محدود',
      limit: 'حساب النهاية',
      derivative: 'الاشتقاق',
      sum: 'المجموع المتسلسل Σ',
      prod: 'حاصل الضرب Π',
      matrix: 'حساب المصفوفات',
      evaluate: 'حساب وتقييم',
    } as Record<CalcOperation, string>,
    matrixOps: {
      det: 'المحدد det(A)',
      inv: 'المعكوس A⁻¹',
      transpose: 'المنقول Aᵀ',
      trace: 'الأثر tr(A)',
      rank: 'المرتبة rank(A)',
      rref: 'الاختزال الصفي RREF',
      eigen: 'القيم الذاتية λ',
      add: 'جمع A + B',
      sub: 'طرح A − B',
      mul: 'ضرب A × B',
      solve_ax_b: 'حل النظام AX = B',
    } as Record<MatrixOp, string>,
    keypad: {
      activeField: 'الخانة النشطة:',
      longPressHint: 'اضغط مطولاً على الدالة للمزيد',
      examplesBtn: 'أمثلة',
      examplesAria: 'إظهار أو إخفاء الأمثلة الجاهزة',
      moveLeft: 'تحريك المؤشر لليسار',
      moveLeftTitle: 'تحريك لليسار',
      moveRight: 'تحريك المؤشر لليمين',
      moveRightTitle: 'تحريك لليمين',
      backspaceAria: 'حذف رمز',
      backspaceTitle: 'حذف',
      clearAria: 'مسح الكل',
      clearTitle: 'مسح',
      opsGroupAria: 'أزرار العمليات الرياضية',
      angleAria: 'تبديل وحدة الزاوية بين الدرجات والراديان',
      groupMenuAria: (label: string) => `قائمة دوال ${label}`,
      evalLabel: 'حساب',
      opButtons: {
        indef_integral: { sub: 'غير محدود', aria: 'تكامل غير محدود' },
        def_integral: { sub: 'محدود', aria: 'تكامل محدود' },
        limit: { sub: 'نهاية', aria: 'حساب النهاية' },
        derivative: { sub: 'مشتقة', aria: 'حساب المشتقة' },
        sum: { sub: 'مجموع', aria: 'حساب المجموع المتسلسل' },
        prod: { sub: 'حاصل ضرب', aria: 'حساب حاصل الضرب المتسلسل' },
        matrix: { sub: 'مصفوفات', aria: 'حساب المصفوفات' },
        evaluate: { sub: 'تقييم', aria: 'حساب وتقييم مباشر' },
      } as Record<CalcOperation, { sub: string; aria: string }>,
    },
    display: {
      variableLabel: 'المتغير:',
      angleAria: 'تبديل وحدة الزاوية بين الدرجات والراديان',
      upperBoundAria: 'الحد العلوي (b)',
      lowerBoundAria: 'الحد السفلي (a)',
      exprSlotAria: 'شاشة إدخال المعادلة عبر الأزرار',
      limitTargetAria: 'قيمة الاقتراب (a)',
      limitDirAria: 'اتجاه النهاية',
      limitDirs: {
        'two-sided': 'ثنائية',
        right: 'يمين (+)',
        left: 'يسار (−)',
      } as Record<LimitDirection, string>,
      derivEvalAria: 'نقطة التعويض الاختيارية',
      optionalPlaceholder: 'اختياري',
      seriesUpperAria: 'الحد العلوي للمجموع أو الضرب',
      seriesLowerAria: 'الحد السفلي لبداية العداد',
      seriesTermAria: 'صيغة الحد العام',
      quickSeriesUpper: 'حد علوي سريع:',
      dimsA: 'أبعاد A:',
      dimsB: 'أبعاد B:',
      matrixCellAria: (target: 'A' | 'B', r: number, c: number) =>
        `المصفوفة ${target} صف ${r + 1} عمود ${c + 1}`,
      reduceRows: (t: 'A' | 'B') => `تقليل صفوف ${t}`,
      increaseRows: (t: 'A' | 'B') => `زيادة صفوف ${t}`,
      reduceCols: (t: 'A' | 'B') => `تقليل أعمدة ${t}`,
      increaseCols: (t: 'A' | 'B') => `زيادة أعمدة ${t}`,
      evalAtWord: 'عند',
      dneWord: 'غير موجودة',
      fallbackError: 'تعذر إتمام العملية',
    },
    result: {
      aria: 'النتيجة النهائية',
      errorHeading: 'تعذر إتمام العملية بهذه الصيغة',
      numAccuracy: 'دقة عددية',
      copyLatex: 'نسخ LaTeX',
      copiedLatex: 'تم نسخ LaTeX',
      definiteDecimalLabel: 'القيمة العشرية الدقيقة:',
      antiderivLabel: (v: string) => `المشتقة العكسية F(${v}):`,
      nonElemPart1:
        'هذا التكامل لا يملك صيغة أولية مغلقة وفق مبرهنة ليوفيل، لذلك تم تمثيله باستخدام',
      nonElemSpecialAndTaylor: 'الدالة الرياضية الخاصة ومفكوك متسلسلة القوى (تايلور)',
      nonElemTaylorOnly: 'مفكوك متسلسلة تايلور',
      nonElemPart2: '، مع إمكانية حساب أي قيمة عددية للمشتقة العكسية أو التحويل لتكامل محدود.',
      taylorPrefix: (v: string, x0: number) => `مفكوك متسلسلة تايلور حول ${v}₀ = ${x0}`,
      evalRangeFrom: (x0: number, v: string) => `تقييم عددي من x₀ = ${x0} إلى ${v} =`,
      calcDefiniteBtn: 'احسب القيمة العددية على فترة [a, b]',
      rightLimitLabel: (v: string, t: string) => `النهاية اليمنى (${v} → ${t}⁺):`,
      leftLimitLabel: (v: string, t: string) => `النهاية اليسرى (${v} → ${t}⁻):`,
      limitNumericLabel: 'القيمة العددية للنهاية:',
      seriesOutputLabel: (n: number) => `الناتج النهائي (${n} حداً):`,
      matrixScalarLabel: 'القيمة العددية الناتجة:',
      calcDecimalLabel: 'القيمة العشرية:',
      valueAtFunc: (v: string) => `قيمة الدالة عند ${v} =`,
      valueAtDeriv: (v: string) => `قيمة المشتقة عند ${v} =`,
    },
    graph: {
      aria: 'التمثيل البياني للدالة',
      title: 'التمثيل البياني للدالة',
      titleAreaSuffix: 'والمساحة المحصورة',
      titleLimitSuffix: 'ونقطة النهاية',
      subtitle: 'مرر المؤشر على المنحنى لمعاينة الإحداثيات الدقيقة',
      showFPrime: (v: string) => `إظهار f'(${v})`,
      showAntideriv: (v: string) => `إظهار F(${v})`,
      zoomIn: 'تكبير الرسم البياني',
      zoomOut: 'تصغير الرسم البياني',
      resetZoom: 'إعادة ضبط التكبير',
      undefinedText: 'غير معرف',
      legendCurve: (v: string) => `منحنى الدالة f(${v})`,
      legendArea: 'المساحة المحصورة على الفترة المحددة',
      legendLimit: 'نقطة اقتراب النهاية L',
      legendDeriv: (v: string) => `المشتقة f'(${v})`,
      legendAntideriv: (v: string) => `المشتقة العكسية F(${v})`,
    },
    steps: {
      aria: 'خطوات الحل التفصيلية',
      heading: 'خطوات الحل التفصيلية',
      stepCount: (n: number) => `(${n} خطوات)`,
      collapseAll: 'طي جميع الخطوات',
      expandAll: 'توسيع جميع الخطوات',
      simpsonTitle: 'جدول نقاط التقسيم لقاعدة سمبسون المركبة',
    },
    presets: {
      heading: 'أمثلة تطبيقية للتكامل والنهايات والمشتقات',
      showBtn: (n: number) => `إظهار الأمثلة (${n})`,
      hideBtn: 'إخفاء الأمثلة',
      filterAria: 'تصفية الأمثلة',
      allLabel: 'الكل',
      defTag: 'محدود',
      indefTag: 'غير محدود',
      limitTag: 'نهاية',
      derivTag: 'اشتقاق',
    },
    rules: {
      heading: 'مرجع القوانين الرياضية الأساسية',
    },
    history: {
      heading: 'سجل العمليات المحسوبة',
      clearBtn: 'مسح السجل',
      empty: 'لم تقم بحفظ عمليات بعد — اضغط زر الحساب (= ✓) لإضافة العمليات هنا تلقائياً.',
      deleteAria: (expr: string) => `حذف ${expr} من السجل`,
    },
    footer: 'المتكامل — حاسبة رياضية شاملة للتكامل والنهايات والمشتقات بالخطوات التفصيلية',
    pdf: {
      exportBtn: 'تصدير PDF',
      exportingBtn: 'جاري التصدير...',
      exportAria: 'تصدير المسألة إلى ملف PDF',
      withSolution: 'المسألة مع الحل والخطوات',
      withSolutionSub: 'ملف كامل يشمل النتيجة والرسم والخطوات',
      problemOnly: 'المسألة فقط (بدون الحل)',
      problemOnlySub: 'ورقة تمرين نظيفة بدون النتيجة النهائية',
      docHeaderSolution: 'المتكامل — ورقة حل رياضية مفصلة',
      docHeaderProblem: 'المتكامل — ورقة تمرين (بدون حل)',
      problemLabel: 'نص المسألة',
      workspaceLabel: 'مساحة الحل اليدوي',
      answerLabel: 'النتيجة النهائية',
      graphLabel: 'التمثيل البياني للدالة',
      stepsLabel: 'خطوات الحل التفصيلية',
      warningsLabel: 'تنبيهات وملاحظات',
      angleRad: 'نظام الزوايا: راديان (RAD)',
      angleDeg: 'نظام الزوايا: درجات (DEG)',
      evalAtNote: (v: string, x: string) => `عند ${v} = ${x}`,
      exportError: 'تعذر إنشاء ملف PDF، يرجى المحاولة مرة أخرى.',
    },
  },
  en: {
    brandName: 'Al-Mutakamil',
    docTitle: 'Al-Mutakamil — Professional Scientific & Calculus Calculator',
    pageH1: 'Professional Scientific Calculator',
    nav: {
      aria: 'Main navigation',
      calculator: 'Calculator',
      examples: 'Examples',
      rules: 'Formulas',
      history: 'History',
    },
    theme: {
      toLight: 'Switch to light mode',
      toDark: 'Switch to dark mode',
      lightLabel: 'Light',
      darkLabel: 'Dark',
    },
    langSwitch: {
      buttonLabel: 'العربية',
      aria: 'Switch interface language to Arabic',
    },
    operations: {
      indef_integral: 'Indefinite Integral',
      def_integral: 'Definite Integral',
      limit: 'Limit',
      derivative: 'Derivative',
      sum: 'Summation Σ',
      prod: 'Product Π',
      matrix: 'Matrix Algebra',
      evaluate: 'Evaluate',
    } as Record<CalcOperation, string>,
    matrixOps: {
      det: 'Determinant det(A)',
      inv: 'Inverse A⁻¹',
      transpose: 'Transpose Aᵀ',
      trace: 'Trace tr(A)',
      rank: 'Rank rank(A)',
      rref: 'Row Reduced RREF',
      eigen: 'Eigenvalues λ',
      add: 'Add A + B',
      sub: 'Subtract A − B',
      mul: 'Multiply A × B',
      solve_ax_b: 'Solve AX = B',
    } as Record<MatrixOp, string>,
    keypad: {
      activeField: 'Active slot:',
      longPressHint: 'Hold key for more functions',
      examplesBtn: 'Examples',
      examplesAria: 'Show or hide preset examples',
      moveLeft: 'Move cursor left',
      moveLeftTitle: 'Left',
      moveRight: 'Move cursor right',
      moveRightTitle: 'Right',
      backspaceAria: 'Delete character',
      backspaceTitle: 'Backspace',
      clearAria: 'Clear slot',
      clearTitle: 'Clear',
      opsGroupAria: 'Mathematical operation modes',
      angleAria: 'Toggle angle unit between degrees and radians',
      groupMenuAria: (label: string) => `${label} function variants`,
      evalLabel: 'Eval',
      opButtons: {
        indef_integral: { sub: 'Indef', aria: 'Indefinite Integral' },
        def_integral: { sub: 'Definite', aria: 'Definite Integral' },
        limit: { sub: 'Limit', aria: 'Calculate Limit' },
        derivative: { sub: 'Deriv', aria: 'Calculate Derivative' },
        sum: { sub: 'Sum', aria: 'Series Summation' },
        prod: { sub: 'Prod', aria: 'Series Product' },
        matrix: { sub: 'Matrix', aria: 'Matrix Operations' },
        evaluate: { sub: 'Result', aria: 'Direct Evaluation' },
      } as Record<CalcOperation, { sub: string; aria: string }>,
    },
    display: {
      variableLabel: 'Var:',
      angleAria: 'Toggle angle unit between degrees and radians',
      upperBoundAria: 'Upper bound (b)',
      lowerBoundAria: 'Lower bound (a)',
      exprSlotAria: 'Equation editor display slot',
      limitTargetAria: 'Limit target (a)',
      limitDirAria: 'Limit direction',
      limitDirs: {
        'two-sided': 'Two-sided',
        right: 'Right (+)',
        left: 'Left (−)',
      } as Record<LimitDirection, string>,
      derivEvalAria: 'Optional evaluation point',
      optionalPlaceholder: 'Optional',
      seriesUpperAria: 'Series upper bound',
      seriesLowerAria: 'Series lower index',
      seriesTermAria: 'General term expression',
      quickSeriesUpper: 'Quick upper:',
      dimsA: 'Dim A:',
      dimsB: 'Dim B:',
      matrixCellAria: (target: 'A' | 'B', r: number, c: number) =>
        `Matrix ${target} row ${r + 1} col ${c + 1}`,
      reduceRows: (t: 'A' | 'B') => `Decrease ${t} rows`,
      increaseRows: (t: 'A' | 'B') => `Increase ${t} rows`,
      reduceCols: (t: 'A' | 'B') => `Decrease ${t} columns`,
      increaseCols: (t: 'A' | 'B') => `Increase ${t} columns`,
      evalAtWord: 'at',
      dneWord: 'DNE',
      fallbackError: 'Unable to compute result',
    },
    result: {
      aria: 'Final result',
      errorHeading: 'Unable to evaluate this expression',
      numAccuracy: 'Numeric precision',
      copyLatex: 'Copy LaTeX',
      copiedLatex: 'Copied LaTeX',
      definiteDecimalLabel: 'Exact decimal value:',
      antiderivLabel: (v: string) => `Antiderivative F(${v}):`,
      nonElemPart1:
        'By Liouville’s theorem, this integral has no elementary closed form, so it is expressed using',
      nonElemSpecialAndTaylor: 'a special function and Taylor power series expansion',
      nonElemTaylorOnly: 'a Taylor power series expansion',
      nonElemPart2: ', allowing numerical antiderivative evaluation or definite integration.',
      taylorPrefix: (v: string, x0: number) => `Taylor series expansion around ${v}₀ = ${x0}`,
      evalRangeFrom: (x0: number, v: string) => `Evaluate numerically from x₀ = ${x0} to ${v} =`,
      calcDefiniteBtn: 'Evaluate definite integral on [a, b]',
      rightLimitLabel: (v: string, t: string) => `Right-hand limit (${v} → ${t}⁺):`,
      leftLimitLabel: (v: string, t: string) => `Left-hand limit (${v} → ${t}⁻):`,
      limitNumericLabel: 'Numeric limit value:',
      seriesOutputLabel: (n: number) => `Final result (${n} terms):`,
      matrixScalarLabel: 'Scalar output value:',
      calcDecimalLabel: 'Decimal value:',
      valueAtFunc: (v: string) => `Function value at ${v} =`,
      valueAtDeriv: (v: string) => `Derivative value at ${v} =`,
    },
    graph: {
      aria: 'Function graph plot',
      title: 'Function Graph',
      titleAreaSuffix: '& Shaded Area',
      titleLimitSuffix: '& Limit Point',
      subtitle: 'Hover over the curve to inspect exact coordinates',
      showFPrime: (v: string) => `Show f'(${v})`,
      showAntideriv: (v: string) => `Show F(${v})`,
      zoomIn: 'Zoom in graph',
      zoomOut: 'Zoom out graph',
      resetZoom: 'Reset graph zoom',
      undefinedText: 'Undefined',
      legendCurve: (v: string) => `Curve f(${v})`,
      legendArea: 'Signed area over [a, b]',
      legendLimit: 'Limit point L',
      legendDeriv: (v: string) => `Derivative f'(${v})`,
      legendAntideriv: (v: string) => `Antiderivative F(${v})`,
    },
    steps: {
      aria: 'Step-by-step solution',
      heading: 'Step-by-Step Solution',
      stepCount: (n: number) => `(${n} ${n === 1 ? 'step' : 'steps'})`,
      collapseAll: 'Collapse all',
      expandAll: 'Expand all',
      simpsonTitle: "Composite Simpson's Rule Sample Table",
    },
    presets: {
      heading: 'Applied Calculus, Limit & Derivative Examples',
      showBtn: (n: number) => `Show Examples (${n})`,
      hideBtn: 'Hide Examples',
      filterAria: 'Filter examples',
      allLabel: 'All',
      defTag: 'Definite',
      indefTag: 'Indefinite',
      limitTag: 'Limit',
      derivTag: 'Derivative',
    },
    rules: {
      heading: 'Essential Calculus & Math Rules Reference',
    },
    history: {
      heading: 'Calculation History',
      clearBtn: 'Clear History',
      empty: 'No saved calculations yet — press solve (= ✓) to add entries here automatically.',
      deleteAria: (expr: string) => `Delete ${expr} from history`,
    },
    footer: 'Al-Mutakamil — Scientific & Calculus Calculator with Step-by-Step Solutions',
    pdf: {
      exportBtn: 'Export PDF',
      exportingBtn: 'Exporting...',
      exportAria: 'Export problem to PDF file',
      withSolution: 'Problem + Solution & Steps',
      withSolutionSub: 'Complete sheet with answer, graph & steps',
      problemOnly: 'Problem Only (No Solution)',
      problemOnlySub: 'Clean practice sheet without the answer',
      docHeaderSolution: 'Al-Mutakamil — Detailed Solution Sheet',
      docHeaderProblem: 'Al-Mutakamil — Practice Worksheet (No Solution)',
      problemLabel: 'Problem Statement',
      workspaceLabel: 'Solution Workspace',
      answerLabel: 'Final Answer',
      graphLabel: 'Function Graph',
      stepsLabel: 'Step-by-Step Solution',
      warningsLabel: 'Notes & Warnings',
      angleRad: 'Angle Unit: Radians (RAD)',
      angleDeg: 'Angle Unit: Degrees (DEG)',
      evalAtNote: (v: string, x: string) => `at ${v} = ${x}`,
      exportError: 'Could not generate PDF file. Please try again.',
    },
  },
};

export function getFieldLabel(field: string | null, lang: AppLang): string {
  if (!field) {
    return lang === 'ar' ? 'عرض رياضي طبيعي' : 'Natural Math Display';
  }
  if (field.startsWith('mat:')) {
    const [, target, r, c] = field.split(':');
    return lang === 'ar'
      ? `المصفوفة ${target} (${Number(r) + 1}, ${Number(c) + 1})`
      : `Matrix ${target} (${Number(r) + 1}, ${Number(c) + 1})`;
  }
  if (lang === 'ar') {
    switch (field) {
      case 'expr':
        return 'الدالة / المعادلة';
      case 'lower':
        return 'الحد السفلي (a)';
      case 'upper':
        return 'الحد العلوي (b)';
      case 'limitTarget':
        return 'قيمة الاقتراب (a)';
      case 'evalPointX':
        return 'نقطة التقييم العددي';
      case 'derivEvalAt':
        return 'نقطة التعويض الاختيارية';
      default:
        return 'الدالة / المعادلة';
    }
  }
  switch (field) {
    case 'expr':
      return 'Expression / Function';
    case 'lower':
      return 'Lower bound (a)';
    case 'upper':
      return 'Upper bound (b)';
    case 'limitTarget':
      return 'Limit target (a)';
    case 'evalPointX':
      return 'Evaluation point';
    case 'derivEvalAt':
      return 'Optional eval point';
    default:
      return 'Expression / Function';
  }
}

// Sub-labels and ARIA strings for MathKeypad in English
export const KEYPAD_VARIANT_SUB_EN: Record<string, string> = {
  مطلق: 'abs',
  تقريب: 'round',
  إشارة: 'sign',
  مقلوب: 'recip',
  مضروب: 'fact',
  دالة: 'fn',
  توافيق: 'comb',
  تباديل: 'perm',
  'عامل مشترك': 'GCD',
  'مضاعف مشترك': 'LCM',
  'باقي قسمة': 'rem',
  الأصغر: 'min',
  الأكبر: 'max',
  فاصلة: 'sep',
  'لوغاريتم b': 'base b',
};

export const KEYPAD_ARIA_EN: Record<string, string> = {
  pi: 'Pi constant',
  'pi-1': 'Pi',
  'pi-2': 'Pi over 2',
  'pi-3': 'Pi over 3',
  'pi-4': 'Pi over 4',
  'pi-6': 'Pi over 6',
  'pi-2x': 'Two Pi',
  sin: 'Sine function sin',
  'sin-base': 'Sine sin',
  'sin-inv': 'Inverse sine arcsin',
  'sin-hyp': 'Hyperbolic sine sinh',
  'sin-ahyp': 'Inverse hyperbolic sine asinh',
  'sin-sq': 'Sine squared',
  'sin-csc': 'Cosecant csc',
  'sin-csch': 'Hyperbolic cosecant csch',
  'sin-acsc': 'Inverse cosecant arccsc',
  cos: 'Cosine function cos',
  'cos-base': 'Cosine cos',
  'cos-inv': 'Inverse cosine arccos',
  'cos-hyp': 'Hyperbolic cosine cosh',
  'cos-ahyp': 'Inverse hyperbolic cosine acosh',
  'cos-sq': 'Cosine squared',
  'cos-sec': 'Secant sec',
  'cos-sech': 'Hyperbolic secant sech',
  'cos-asec': 'Inverse secant arcsec',
  tan: 'Tangent function tan',
  'tan-base': 'Tangent tan',
  'tan-inv': 'Inverse tangent arctan',
  'tan-hyp': 'Hyperbolic tangent tanh',
  'tan-ahyp': 'Inverse hyperbolic tangent atanh',
  'tan-sq': 'Tangent squared',
  'tan-cot': 'Cotangent cot',
  'tan-coth': 'Hyperbolic cotangent coth',
  'tan-acot': 'Inverse cotangent arccot',
  abs: 'Absolute value',
  'abs-base': 'Absolute value abs',
  'abs-floor': 'Floor function',
  'abs-ceil': 'Ceiling function',
  'abs-round': 'Round to nearest integer',
  'abs-sgn': 'Signum function sgn',
  'abs-inv': 'Reciprocal',
  e: "Euler's number e",
  'e-base': "Euler's number e",
  'e-var': 'Exponential e^x',
  'e-pow': 'Power of e',
  'e-neg': 'Negative exponential',
  'e-10': 'Power of 10',
  'e-2': 'Power of 2',
  sq: 'Square',
  'sq-2': 'Squared',
  'sq-3': 'Cubed',
  'sq-y': 'Exponentiation',
  'sq-p2': 'Parentheses squared',
  'sq-p3': 'Parentheses cubed',
  'sq-inv': 'Reciprocal',
  sqrt: 'Square root',
  'sqrt-2': 'Square root',
  'sqrt-3': 'Cube root',
  'sqrt-x': 'Square root of variable',
  'sqrt-inv': 'Reciprocal square root',
  ln: 'Natural logarithm',
  'ln-base': 'Natural logarithm ln',
  'ln-10': 'Common logarithm log10',
  'ln-2': 'Binary logarithm log2',
  'ln-b': 'Custom base logarithm',
  'ln-var': 'Natural log of variable',
  frac: 'Fraction',
  'frac-ab': 'Fraction a/b',
  'frac-rec': 'Reciprocal fraction',
  'frac-fact': 'Factorial / Gamma function',
  'frac-exp': 'Exponential exp',
  var: 'Variable',
  'var-x': 'Variable x',
  'var-k': 'Variable k',
  'var-t': 'Variable t',
  'var-u': 'Variable u',
  'var-y': 'Variable y',
  inf: 'Positive infinity',
  'inf-pos': 'Positive infinity',
  'inf-neg': 'Negative infinity',
  'inf-0': 'Zero',
  'inf-1': 'One',
  fact: 'Factorial !',
  'fact-bang': 'Factorial operator !',
  'fact-fn': 'Factorial function fact',
  comb: 'Combinations nCr',
  'comb-ncr': 'Combinations nCr',
  'comb-npr': 'Permutations nPr',
  gcd: 'Greatest common divisor gcd',
  'num-gcd': 'Greatest common divisor gcd',
  'num-lcm': 'Least common multiple lcm',
  mod: 'Modulo / remainder mod',
  'op-mod': 'Modulo mod',
  'op-min': 'Minimum min',
  'op-max': 'Maximum max',
  comma: 'Argument separator comma',
  'sep-comma': 'Comma separator',
  'sep-logb': 'Logarithm base b',
  '7': '7',
  '8': '8',
  '9': '9',
  lparen: 'Open parenthesis',
  rparen: 'Close parenthesis',
  '4': '4',
  '5': '5',
  '6': '6',
  mul: 'Multiply',
  div: 'Divide',
  '1': '1',
  '2': '2',
  '3': '3',
  plus: 'Add',
  minus: 'Subtract',
  '0': '0',
  dot: 'Decimal point',
  sign: 'Toggle sign',
  powop: 'Power',
  solve: 'Compute solution and steps',
};

const METHOD_MAP_EN: Record<string, string> = {
  // Integrator
  'تلقائي (أنسب طريقة)': 'Automatic (Best Method)',
  'القواعد الأساسية والخطية': 'Basic & Linearity Rules',
  'التكامل بالتعويض (u-Sub)': 'u-Substitution',
  'التكامل بالتجزئة (LIATE)': 'Integration by Parts (LIATE)',
  'التكاملات المثلثية والزائدية': 'Trigonometric & Hyperbolic Integrals',
  'التعويض المثلثي وإتمام المربع': 'Trig Substitution & Completing the Square',
  'الكسور الجزئية للدوال النسبية': 'Partial Fractions Decomposition',
  'التكامل العددي (سمبسون / غاوس)': "Numerical Integration (Simpson / Gauss-Kronrod)",
  'الدوال الخاصة ومتسلسلة القوى': 'Special Functions & Power Series',
  'متسلسلة تايلور والتكامل العددي': 'Taylor Series & Numerical Integration',
  // Limits
  'نهاية الثابت': 'Constant Limit',
  'النهاية عند اللانهاية (كثير حدود)': 'Limit at Infinity (Polynomial)',
  'النهاية عند اللانهاية (دالة كسرية)': 'Limit at Infinity (Rational Function)',
  'الضرب في المرافق عند اللانهاية': 'Conjugate Multiplication at Infinity',
  'النهاية الأسية (صيغة أويلر 1^∞)': 'Exponential Limit (Euler 1^∞ Form)',
  'قاعدة لوبيتال': "L'Hôpital's Rule",
  'النهاية عند اللانهاية': 'Limit at Infinity',
  'تحليل السلوك عند اللانهاية': 'Asymptotic Behavior Analysis',
  'التعويض المباشر': 'Direct Substitution',
  'التحليل واختزال العامل الصفري': 'Factoring & Cancellation',
  'الضرب في المرافق': 'Conjugate Multiplication',
  'متسلسلة تايلور': 'Taylor Series Expansion',
  'التحويل اللوغاريتمي ولوبيتال': "Logarithmic Transform & L'Hôpital's Rule",
  'النهاية اليمنى': 'Right-Hand Limit',
  'خط تقارب عمودي (النهاية اليمنى)': 'Vertical Asymptote (Right-Hand)',
  'تحليل النهاية اليمنى': 'Right-Hand Limit Analysis',
  'النهاية اليسرى': 'Left-Hand Limit',
  'خط تقارب عمودي (النهاية اليسرى)': 'Vertical Asymptote (Left-Hand)',
  'تحليل النهاية اليسرى': 'Left-Hand Limit Analysis',
  'تطابق النهايات الجانبية': 'One-Sided Limits Match',
  'خط تقارب عمودي': 'Vertical Asymptote',
  'اختلاف النهايتين الجانبيتين': 'One-Sided Limits Differ',
  'تحليل النهاية': 'Limit Analysis',
  'حساب النهايات': 'Limit Computation',
  // Derivatives & Evaluate
  'حساب رياضي مباشر': 'Direct Evaluation',
  'حساب رياضي مباشر (DEG)': 'Direct Evaluation (DEG)',
  'تبسيط وتقييم الدالة': 'Algebraic Simplification & Evaluation',
  'التفاضل والاشتقاق': 'Differentiation',
  'التفاضل والاشتقاق الرمزي': 'Symbolic Differentiation',
  // Series
  'حساب المجموع المتسلسل (Σ)': 'Finite Summation (Σ)',
  'حساب حاصل الضرب المتسلسل (Π)': 'Finite Product (Π)',
  'حساب المجموع المتسلسل (Σ) — متسلسلة لانهائية': 'Infinite Series Summation (Σ)',
  'حساب حاصل الضرب المتسلسل (Π) — متسلسلة لانهائية': 'Infinite Product Series (Π)',
  // Matrices
  'حساب المصفوفات — المحدد det(A)': 'Matrix Algebra — Determinant det(A)',
  'حساب المصفوفات — المعكوس A⁻¹': 'Matrix Algebra — Inverse A⁻¹',
  'حساب المصفوفات — المنقول Aᵀ': 'Matrix Algebra — Transpose Aᵀ',
  'حساب المصفوفات — الأثر tr(A)': 'Matrix Algebra — Trace tr(A)',
  'حساب المصفوفات — المرتبة rank(A)': 'Matrix Algebra — Rank rank(A)',
  'حساب المصفوفات — الاختزال الصفي RREF': 'Matrix Algebra — RREF',
  'حساب المصفوفات — القيم الذاتية λ': 'Matrix Algebra — Eigenvalues λ',
  'حساب المصفوفات — جمع A + B': 'Matrix Algebra — Addition A + B',
  'حساب المصفوفات — طرح A − B': 'Matrix Algebra — Subtraction A − B',
  'حساب المصفوفات — ضرب A × B': 'Matrix Algebra — Multiplication A × B',
  'حساب المصفوفات — حل النظام AX = B': 'Matrix Algebra — Solve AX = B',
};

export function localizeMethodLabel(label: string, lang: AppLang): string {
  if (lang === 'ar') return label;
  return METHOD_MAP_EN[label] ?? localizeMessage(label, 'en');
}

export function localizeLatex(latex: string, lang: AppLang): string {
  if (lang === 'ar' || !latex) return latex;
  return latex
    .replace(/\\text\{\s*غير معرف\s*\}/g, '\\text{Undefined}')
    .replace(/\\text\{\s*غير معرفة\s*\}/g, '\\text{Undefined}')
    .replace(/\\text\{\s*غير متقارب\s*\}/g, '\\text{Divergent}')
    .replace(/\\text\{\s*غير موجودة \(تذبذب\)\s*\}/g, '\\text{DNE (Oscillating)}')
    .replace(/\\text\{\s*غير موجودة \(DNE\)\s*\}/g, '\\text{DNE}')
    .replace(/\\text\{\s*نختار\s*\}/g, '\\text{Choose }')
    .replace(/\\text\{\s*الإشارة\s*\}/g, '\\text{Sign}')
    .replace(/\\text\{\s*\(اشتقاق\)\s*\}/g, '\\text{ (diff)}')
    .replace(/\\text\{\s*\(تكامل\)\s*\}/g, '\\text{ (int)}')
    .replace(/\\text\{\s*القيمة التكيفية الأدق:\s*\}/g, '\\text{Adaptive value: }');
}

const EXACT_STEP_TITLES_EN: Record<string, string> = {
  // Integrator
  'قاعدة تكامل الثابت': 'Constant Integration Rule',
  'إخراج العامل الثابت خارج التكامل': 'Factor Out Constant Multiplier',
  'قاعدة القوة الأساسية': 'Basic Power Rule',
  'تكامل مقلوب المتغير': 'Reciprocal Integration Rule',
  'قاعدة القوة': 'Power Rule',
  'القاعدة اللوغاريتمية': 'Logarithmic Rule',
  'تحويل المقام إلى أس سالب وتطبيق قاعدة القوة': 'Rewrite Denominator with Negative Exponent & Apply Power Rule',
  'تكامل مقلوب الجذر التربيعي': 'Integral of Reciprocal Square Root',
  'تكامل مقلوب مربع الدالة المثلثية': 'Integral of Reciprocal Squared Trig Function',
  'رفع الدالة الأسية من المقام بأس سالب': 'Rewrite Exponential Denominator with Negative Exponent',
  'تحويل الجذر إلى أس نسبي': 'Rewrite Radical as Fractional Exponent',
  'تكامل الدالة الأسية الطبيعية': 'Natural Exponential Integral',
  'تكامل الدالة الأسية ذات الأساس العام': 'General Exponential Integral',
  'قاعدة التكامل المثلثي التربيعي المباشر': 'Direct Squared Trig Integration Rule',
  'تكامل القاطع في الظل': 'Integral of Secant Times Tangent',
  'تكامل قاطع التمام في ظل التمام': 'Integral of Cosecant Times Cotangent',
  'تكامل دالة معكوس الظل (arctan)': 'Inverse Tangent (arctan) Rule',
  'تكامل دالة معكوس الجيب (arcsin)': 'Inverse Sine (arcsin) Rule',
  'تكامل دالة القيمة المطلقة': 'Absolute Value Integral',
  'تكامل دالة معكوس القاطع (arcsec)': 'Inverse Secant (arcsec) Rule',
  'تكامل الكسر الجذري الخاص': 'Special Radical Fraction Integral',
  'مكاملة المقام الأسي بالضرب في الأسي السالب': 'Multiply by Negative Exponential & Substitute',
  'الضرب في المرافق المثلثي': 'Multiply by Trigonometric Conjugate',
  'اختيار التعويض المناسب (u-Substitution)': 'Choose Substitution (u-Substitution)',
  'إعادة كتابة التكامل بدلالة المتغير u': 'Rewrite Integral in Terms of u',
  'الرجوع إلى المتغير الأصلي': 'Substitute Back Original Variable',
  'إخراج الثابت قبل التجزئة': 'Factor Out Constant Before Integration by Parts',
  'تطبيق التكامل بالتجزئة (u و dv)': 'Apply Integration by Parts (u & dv)',
  'تطبيق صيغة التجزئة': 'Apply Integration by Parts Formula',
  'تجميع ناتج التكامل بالتجزئة': 'Combine Integration by Parts Terms',
  'التكامل بالتجزئة الدوري لدالة مثلثية للوغاريتم': 'Tabular/Cyclic Integration by Parts for Trig of Logarithm',
  'التكامل بالتجزئة الدوري (المرة الأولى)': 'Cyclic Integration by Parts (First Pass)',
  'التجزئة الثانية وحل المعادلة لـ I': 'Second Pass & Solve Equation for I',
  'اختيار u و dv وفق قاعدة LIATE': 'Choose u and dv via LIATE Priority',
  'التكامل بالجدول (التجزئة المتكررة)': 'Tabular Integration (Repeated Parts)',
  'جمع نواتج الأقطار': 'Sum Alternating Diagonal Products',
  'اختيار u و dv (قاعدة LIATE)': 'Choose u and dv (LIATE Rule)',
  'تطبيق صيغة التكامل بالتجزئة': 'Apply Integration by Parts Formula',
  'الناتج بعد التبسيط': 'Simplified Result',
  'فصل عامل جيب واستخدام المتطابقة الفيثاغورية': 'Split Sine Factor & Apply Pythagorean Identity',
  'المكاملة والرجوع إلى cos': 'Integrate and Substitute Back cos',
  'فصل عامل جيب التمام واستخدام المتطابقة الفيثاغورية': 'Split Cosine Factor & Apply Pythagorean Identity',
  'المكاملة والرجوع إلى sin': 'Integrate and Substitute Back sin',
  'تطبيق متطابقة نصف الزاوية': 'Apply Half-Angle Identity',
  'تطبيق متطابقة ضعف ونصف الزاوية': 'Apply Double & Half-Angle Identities',
  'تخفيض الدرجة بمتطابقة نصف الزاوية مرتين': 'Power Reduction via Repeated Half-Angle Identity',
  'استخدام متطابقة الظل والقاطع': 'Apply Tangent-Secant Identity',
  'استخدام متطابقة ظل التمام وقاطع التمام': 'Apply Cotangent-Cosecant Identity',
  'فصل sec² واستخدام المتطابقة sec² = 1 + tan²': 'Factor Out sec² and Apply sec² = 1 + tan²',
  'فصل csc² واستخدام المتطابقة csc² = 1 + cot²': 'Factor Out csc² and Apply csc² = 1 + cot²',
  'تكامل القاطع التكعيبي بالتجزئة الدورية': 'Cyclic Integration by Parts for sec³',
  'تكامل قاطع التمام التكعيبي بالتجزئة الدورية': 'Cyclic Integration by Parts for csc³',
  'متطابقة نصف الزاوية الزائدية': 'Hyperbolic Half-Angle Identity',
  'تحويل جداء الدوال المثلثية إلى مجموع': 'Product-to-Sum Trigonometric Identity',
  'إخراج العامل الثابت': 'Factor Out Constant',
  'إتمام المربع تحت الجذر': 'Complete the Square Inside Radical',
  'التعويض المثلثي بالجيب (x = (a/k) sin θ)': 'Sine Trig Substitution (x = (a/k) sin θ)',
  'تكامل الدالة المثلثية الناتجة ثم الرجوع للمثلث القائم': 'Integrate Resulting Trig Form & Return via Reference Triangle',
  'التعويض المثلثي بالظل (x = (a/k) tan θ)': 'Tangent Trig Substitution (x = (a/k) tan θ)',
  'مكاملة sec³θ والرجوع إلى المتغير الأصلي': 'Integrate sec³θ & Return to Original Variable',
  'التعويض المثلثي بالقاطع (x = (a/k) sec θ)': 'Secant Trig Substitution (x = (a/k) sec θ)',
  'إتمام المربع في المقام الجذري': 'Complete the Square in Radical Denominator',
  'التعويض المثلثي للمقام الجذري': 'Trig Substitution for Radical Denominator',
  'إتمام المربع في المقام التربيعي غير القابل للتحليل': 'Complete the Square for Irreducible Quadratic Denominator',
  'تفكيك البسط ومكاملة اللوغاريتم ومعكوس الظل': 'Split Numerator into Log & Arctan Terms',
  'التعويض المثلثي للمقام المربع (x = a tan θ)': 'Trig Substitution for Squared Quadratic Denominator',
  'التعويض المثلثي x = (a/k) sin θ': 'Trig Substitution x = (a/k) sin θ',
  'القسمة المطولة لكثيرات الحدود': 'Polynomial Long Division',
  'تكامل الكسر ذي المقام الخطي': 'Integral with Linear Denominator',
  'تحليل المقام إلى عوامله الأولية': 'Factor Denominator into Linear & Irreducible Quadratic Factors',
  'تفكيك الكسر إلى كسور جزئية وإيجاد الثوابت': 'Partial Fraction Decomposition & Solve Coefficients',
  'مكاملة كل كسر جزئي على حدة': 'Integrate Each Partial Fraction Term',
  'تطبيق خاصية خطية التكامل': 'Apply Linearity of Integration',
  'فك الأقواس وتبسيط كثير الحدود': 'Expand Parentheses & Simplify Polynomial',
  'تقسيم فترة التكامل (قاعدة سمبسون المركبة n = 8)': "Partition Interval (Composite Simpson's Rule n = 8)",
  'حساب المجموع الموزون (أوزان 1, 4, 2, ..., 1)': 'Compute Weighted Sum (Weights 1, 4, 2, ..., 1)',
  'القيمة العددية الدقيقة (غاوس-كرونرود 15 نقطة)': 'High-Precision Numerical Value (15-Point Gauss-Kronrod)',
  'التعبير باستخدام الدوال الرياضية الخاصة': 'Express via Special Mathematical Functions',
  'تحليل الدالة وعدم وجود صيغة أولية مغلقة': 'Non-Elementary Analysis (Liouville Theorem)',
  'مكاملة متسلسلة القوى حداً بحد': 'Integrate Power Series Term by Term',
  'إضافة ثابت التكامل غير المحدود (+ C)': 'Add Constant of Integration (+ C)',
  'تطبيق المبرهنة الأساسية للتفاضل والتكامل': 'Apply Fundamental Theorem of Calculus',
  'حساب القيمة النهائية للتكامل المحدود': 'Evaluate Definite Integral Difference F(b) − F(a)',
  'التحقق العددي على كامل فترة التكامل': 'Numerical Verification Across Integration Interval',
  'الانتقال إلى التكامل العددي عالي الدقة': 'Fallback to High-Precision Numerical Integration',
  'التقريب بقاعدة سمبسون المركبة (n = 8)': "Composite Simpson's Rule Approximation (n = 8)",
  // Limits
  'نهاية المقدار الثابت': 'Limit of a Constant',
  'تحديد الحد الرئيسي لكثير الحدود عند اللانهاية': 'Identify Leading Polynomial Term at Infinity',
  'درجة المقام أكبر من درجة البسط': 'Denominator Degree Exceeds Numerator Degree',
  'تساوي درجة البسط والمقام': 'Numerator & Denominator Degrees Match',
  'درجة البسط أكبر من درجة المقام': 'Numerator Degree Exceeds Denominator Degree',
  'الضرب في المرافق لمعالجة حالة (∞ − ∞)': 'Multiply by Conjugate for (∞ − ∞) Form',
  'القسمة على أعلى قوة وتبسيط الناتج': 'Divide by Highest Power & Simplify',
  'معالجة الصيغة الأسية غير المعينة (1^∞)': 'Transform Indeterminate Form (1^∞)',
  'تطبيق قاعدة لوبيتال عند اللانهاية': "Apply L'Hôpital's Rule at Infinity",
  'تحليل التقارب المقارب عند اللانهاية': 'Asymptotic Convergence Analysis at Infinity',
  'تباعد الدالة عند اللانهاية': 'Function Diverges at Infinity',
  'تذبذب الدالة وعدم وجود نهاية عند اللانهاية': 'Function Oscillates at Infinity (Limit DNE)',
  'التعويض المباشر في الدالة': 'Direct Substitution',
  'التحليل واختزال العامل الصفري': 'Factor & Cancel Zero Factor',
  'الضرب في مرافق البسط الجذري': 'Multiply by Numerator Radical Conjugate',
  'الضرب في مرافق المقام الجذري': 'Multiply by Denominator Radical Conjugate',
  'تطبيق قاعدة لوبيتال (صيغة 0/0)': "Apply L'Hôpital's Rule (0/0 Form)",
  'تطبيق قاعدة لوبيتال (صيغة ∞/∞)': "Apply L'Hôpital's Rule (∞/∞ Form)",
  'التحويل اللوغاريتمي للصيغة الأسية غير المعينة': 'Logarithmic Transform for Exponential Form',
  'إيجاد قيمة L برفع الناتج للأساس e': 'Exponentiate to Recover Limit Value L',
  'تباعد النهاية اليمنى نحو اللانهاية': 'Right-Hand Limit Diverges to Infinity',
  'النهاية اليمنى غير موجودة': 'Right-Hand Limit Does Not Exist',
  'تباعد النهاية اليسرى نحو اللانهاية': 'Left-Hand Limit Diverges to Infinity',
  'النهاية اليسرى غير موجودة': 'Left-Hand Limit Does Not Exist',
  'تساوي النهايتين اليمنى واليسرى': 'One-Sided Limits Are Equal',
  'اتفاق النهايتين الجانبيتين نحو اللانهاية': 'Both One-Sided Limits Approach Same Infinity',
  'فحص النهاية اليمنى والنهاية اليسرى': 'Compare Right & Left One-Sided Limits',
  'استنتاج عدم وجود النهاية الكلية': 'Conclude Two-Sided Limit Does Not Exist',
  // Derivatives & Evaluate
  'مشتقة المقدار الثابت': 'Constant Derivative Rule',
  'مشتقة المتغير': 'Identity Derivative Rule',
  'تطبيق خطية الاشتقاق على المجموع والفرق': 'Sum & Difference Differentiation Rule',
  'تطبيق قاعدة ضرب دالتين': 'Product Rule',
  'إخراج الثابت وتطبيق قاعدة الاشتقاق': 'Constant Multiple Rule',
  'مشتقة دالة مقسومة على ثابت': 'Constant Divisor Rule',
  'تطبيق قاعدة قسمة دالتين': 'Quotient Rule',
  'تطبيق قاعدة القوة وقاعدة السلسلة': 'Power & Chain Rule',
  'مشتقة الدالة الأسية': 'Exponential & Chain Rule',
  'الاشتقاق اللوغاريتمي للدالة الأسية المتغيرة': 'Logarithmic Differentiation',
  'حساب المشتقة الأولى': 'Compute First Derivative',
  'حساب القيمة الدقيقة والعددية': 'Compute Exact & Numeric Value',
  'تبسيط الصيغة الجبرية للدالة': 'Simplify Algebraic Expression',
  'المشتقة الأولى بعد التبسيط': 'Simplified First Derivative',
  // Series
  'تحليل المتسلسلة اللانهائية وفحص التقارب': 'Analyze Infinite Series Convergence',
  'القيمة التقاربية النهائية': 'Convergent Limit Value',
  'فترة فارغة (الحد العلوي أصغر من السفلي)': 'Empty Range (Upper Bound < Lower Bound)',
  'حساب المجموع النهائي': 'Compute Final Sum',
  'حساب ناتج الضرب النهائي': 'Compute Final Product',
  // Matrices
  'تطبيق قانون محدد المصفوفة 2×2': 'Apply 2×2 Determinant Formula',
  'اختزال غاوس إلى الشكل المثلثي العلوي': 'Gaussian Elimination to Upper Triangular Form',
  'جمع عناصر القطر الرئيسي': 'Sum Main Diagonal Entries',
  'تبديل الصفوف والأعمدة': 'Swap Rows and Columns',
  'الاختزال الصفي المختصر (Gauss-Jordan)': 'Gauss-Jordan Elimination (RREF)',
  'عد الصفوف غير الصفرية (المحاور)': 'Count Non-Zero Pivot Rows',
  'التحقق من قابلية العكس': 'Verify Invertibility (det ≠ 0)',
  'تطبيق طريقة غاوس-جوردان [A | I] → [I | A⁻¹]': 'Gauss-Jordan Inversion [A | I] → [I | A⁻¹]',
  'القيمة الذاتية لمصفوفة 1×1': '1×1 Matrix Eigenvalue',
  'بناء المعادلة المميزة': 'Construct Characteristic Polynomial',
  'حل جذور المعادلة المميزة': 'Solve Characteristic Roots',
  'جمع العناصر المتناظرة': 'Add Corresponding Elements',
  'طرح العناصر المتناظرة': 'Subtract Corresponding Elements',
  'ضرب الصفوف في الأعمدة': 'Multiply Rows by Columns',
  'إيجاد معكوس مصفوفة المعاملات A⁻¹': 'Compute Coefficient Matrix Inverse A⁻¹',
  'حساب متجه المجاهيل X = A⁻¹B': 'Compute Solution X = A⁻¹B',
};

const EXACT_EXPLANATIONS_EN: Record<string, string> = {
  // Integrator
  'تكامل أي مقدار ثابت بالنسبة للمتغير يساوي الثابت مضروباً في المتغير.':
    'The integral of a constant with respect to the variable equals the constant multiplied by the variable.',
  'بما أن الثابت لا يعتمد على متغير التكامل، نخرجه أمام إشارة التكامل.':
    'Since the constant factor is independent of the integration variable, move it outside the integral.',
  'الحالة الخاصة لقاعدة القوة عندما يكون الأس $-1$ تعطي اللوغاريتم الطبيعي.':
    'For exponent $-1$, the power rule yields the natural logarithm.',
  'نضيف 1 إلى الأس ثم نقسم على الأس الجديد.':
    'Increment the exponent by $1$ and divide by the new exponent.',
  'تكامل مقلوب المتغير يعطي اللوغاريتم الطبيعي للقيمة المطلقة.':
    'Integrating the reciprocal of the variable gives the natural logarithm of its absolute value.',
  'تكامل $1/x$ يساوي $\\ln|x|$.': 'The integral of $1/x$ is $\\ln|x|$.',
  'نرفع القوة من المقام إلى البسط بأس سالب ثم نطبق قاعدة القوة.':
    'Move the denominator power to the numerator with a negative exponent and apply the power rule.',
  'نكتب $\\frac{1}{\\sqrt{x}} = x^{-1/2}$ ثم نطبق قاعدة القوة.':
    'Rewrite $\\frac{1}{\\sqrt{x}} = x^{-1/2}$ and apply the power rule.',
  'مقلوب $\\cos^2$ هو $\\sec^2$ وتكامله $\\tan$، ومقلوب $\\sin^2$ هو $\\csc^2$ وتكامله $-\\cot$.':
    'The reciprocal of $\\cos^2$ is $\\sec^2$ (integral $\\tan$), and the reciprocal of $\\sin^2$ is $\\csc^2$ (integral $-\\cot$).',
  'نكتب $\\frac{1}{e^{u}} = e^{-u}$ ثم نكامل الدالة الأسية.':
    'Rewrite $\\frac{1}{e^{u}} = e^{-u}$ and integrate the exponential function.',
  'نحول الجذر التربيعي إلى $x^{1/2}$ ثم نطبق قاعدة القوة.':
    'Rewrite the square root as $x^{1/2}$ and apply the power rule.',
  'تكامل $e^x$ يساوي الدالة نفسها.': 'The integral of $e^x$ is $e^x$.',
  'تكامل $a^x$ يساوي $\\frac{a^x}{\\ln(a)}$.': 'The integral of $a^x$ is $\\frac{a^x}{\\ln(a)}$.',
  'تكامل دالة الجيب يساوي سالب جيب التمام.': 'The integral of sine is negative cosine.',
  'تكامل دالة جيب التمام يساوي الجيب.': 'The integral of cosine is sine.',
  'بكتابة $\\tan(x) = \\frac{\\sin(x)}{\\cos(x)}$ وتعويض $u = \\cos(x)$ نحصل على $-\\ln|\\cos(x)|$.':
    'Writing $\\tan(x) = \\frac{\\sin(x)}{\\cos(x)}$ and substituting $u = \\cos(x)$ gives $-\\ln|\\cos(x)|$.',
  'بكتابة $\\cot(x) = \\frac{\\cos(x)}{\\sin(x)}$ وتعويض $u = \\sin(x)$ نحصل على $\\ln|\\sin(x)|$.':
    'Writing $\\cot(x) = \\frac{\\cos(x)}{\\sin(x)}$ and substituting $u = \\sin(x)$ gives $\\ln|\\sin(x)|$.',
  'بضرب البسط والمقام في $(\\sec x + \\tan x)$ وتعويض $u = \\sec x + \\tan x$.':
    'Multiply numerator and denominator by $(\\sec x + \\tan x)$ and substitute $u = \\sec x + \\tan x$.',
  'بضرب البسط والمقام في $(\\csc x + \\cot x)$ نحصل على $-\\ln|\\csc x + \\cot x|$.':
    'Multiplying numerator and denominator by $(\\csc x + \\cot x)$ yields $-\\ln|\\csc x + \\cot x|$.',
  'تكامل الجيب الزائدي $\\sinh(x)$ يساوي $\\cosh(x)$.':
    'The integral of hyperbolic sine $\\sinh(x)$ is $\\cosh(x)$.',
  'تكامل جيب التمام الزائدي $\\cosh(x)$ يساوي $\\sinh(x)$.':
    'The integral of hyperbolic cosine $\\cosh(x)$ is $\\sinh(x)$.',
  'بكتابة $\\tanh(x) = \\frac{\\sinh(x)}{\\cosh(x)}$ نحصل على $\\ln(\\cosh(x))$.':
    'Writing $\\tanh(x) = \\frac{\\sinh(x)}{\\cosh(x)}$ yields $\\ln(\\cosh(x))$.',
  'بكتابة $\\coth(x) = \\frac{\\cosh(x)}{\\sinh(x)}$ نحصل على $\\ln|\\sinh(x)|$.':
    'Writing $\\coth(x) = \\frac{\\cosh(x)}{\\sinh(x)}$ yields $\\ln|\\sinh(x)|$.',
  'تكامل $\\operatorname{sech}(x)$ يساوي $\\arctan(\\sinh(x))$.':
    'The integral of $\\operatorname{sech}(x)$ is $\\arctan(\\sinh(x))$.',
  'نكتب $\\sqrt[3]{x} = x^{1/3}$ ثم نطبق قاعدة القوة لنحصل على $\\frac{3}{4} x^{4/3}$.':
    'Rewrite $\\sqrt[3]{x} = x^{1/3}$ and apply the power rule to get $\\frac{3}{4} x^{4/3}$.',
  'بتحويل الأساس $\\log_2(x) = \\frac{\\ln(x)}{\\ln(2)}$ نحصل على $\\frac{x\\ln(x) - x}{\\ln(2)}$.':
    'Convert base $\\log_2(x) = \\frac{\\ln(x)}{\\ln(2)}$ to obtain $\\frac{x\\ln(x) - x}{\\ln(2)}$.',
  'بالتكامل بالتجزئة مع $u = \\sinh^{-1}(x)$ و $dv = dx$ نحصل على $x\\sinh^{-1}(x) - \\sqrt{x^2 + 1}$.':
    'Integrate by parts with $u = \\sinh^{-1}(x)$ and $dv = dx$ to get $x\\sinh^{-1}(x) - \\sqrt{x^2 + 1}$.',
  'بالتكامل بالتجزئة مع $u = \\cosh^{-1}(x)$ و $dv = dx$ نحصل على $x\\cosh^{-1}(x) - \\sqrt{x^2 - 1}$.':
    'Integrate by parts with $u = \\cosh^{-1}(x)$ and $dv = dx$ to get $x\\cosh^{-1}(x) - \\sqrt{x^2 - 1}$.',
  'بالتكامل بالتجزئة مع $u = \\tanh^{-1}(x)$ و $dv = dx$ نحصل على $x\\tanh^{-1}(x) + \\frac{1}{2}\\ln|1 - x^2|$.':
    'Integrate by parts with $u = \\tanh^{-1}(x)$ and $dv = dx$ to get $x\\tanh^{-1}(x) + \\frac{1}{2}\\ln|1 - x^2|$.',
  'مشتقة $\\tan(x)$ هي $\\sec^2(x)$، لذا فالتكامل هو $\\tan(x)$.':
    'The derivative of $\\tan(x)$ is $\\sec^2(x)$, so the antiderivative is $\\tan(x)$.',
  'مشتقة $-\\cot(x)$ هي $\\csc^2(x)$.': 'The derivative of $-\\cot(x)$ is $\\csc^2(x)$.',
  'مشتقة $\\tanh(x)$ هي $\\operatorname{sech}^2(x)$.':
    'The derivative of $\\tanh(x)$ is $\\operatorname{sech}^2(x)$.',
  'مشتقة $-\\coth(x)$ هي $\\operatorname{csch}^2(x)$.':
    'The derivative of $-\\coth(x)$ is $\\operatorname{csch}^2(x)$.',
  'مشتقة $\\sec(x)$ هي $\\sec(x)\\tan(x)$.': 'The derivative of $\\sec(x)$ is $\\sec(x)\\tan(x)$.',
  'مشتقة $-\\csc(x)$ هي $\\csc(x)\\cot(x)$.': 'The derivative of $-\\csc(x)$ is $\\csc(x)\\cot(x)$.',
  'بقسمة المجال إلى $x \\ge 0$ و $x < 0$ نحصل على صيغة موحدة للقيمة المطلقة.':
    'Splitting the domain into $x \\ge 0$ and $x < 0$ yields a unified antiderivative formula.',
  'بالتعويض $x = \\frac{1}{t}$ أو التعويض المثلثي نحصل على الصيغة اللوغاريتمية المباشرة.':
    'Using the substitution $x = \\frac{1}{t}$ or trig substitution yields the direct logarithmic form.',
  'نضرب البسط والمقام في $e^{-kx}$ ثم نعوض $u = a e^{-kx} + b$.':
    'Multiply numerator and denominator by $e^{-kx}$ and substitute $u = a e^{-kx} + b$.',
  'نضرب البسط والمقام في المرافق لتحويل المقام إلى $\\sin^2$ أو $\\cos^2$ ثم نكامل مباشرة.':
    'Multiply numerator and denominator by the conjugate to turn the denominator into $\\sin^2$ or $\\cos^2$, then integrate directly.',
  'نخرج المعامل الثابت خارج التكامل ثم نطبق التكامل بالتجزئة.':
    'Move the constant multiplier outside the integral and apply integration by parts.',
  'نعوض في القانون العام للتكامل بالتجزئة.': 'Substitute into the integration by parts formula.',
  'نجمع الحد $uv$ مع ناتج التكامل المتبقي.': 'Combine $uv$ with the remaining integral term.',
  'بتطبيق التكامل بالتجزئة مرتين (أو التعويض $u = \\ln x$ ثم التجزئة) يعود التكامل الأصلي ونحل المعادلة.':
    'Applying integration by parts twice (or $u = \\ln x$ then parts) recovers the original integral to solve algebraically.',
  'عند ضرب دالة أسية في دالة مثلثية، نطبق التكامل بالتجزئة مرتين حتى يعود التكامل الأصلي $I$ في الطرف الأيمن.':
    'When multiplying an exponential by a trig function, apply integration by parts twice until the original integral $I$ reappears.',
  'بعد تطبيق التجزئة مرتين، ننقل الحد المحتوي على $I$ إلى الطرف الأيسر ونقسم على المعامل.':
    'After two passes, move the $I$ term to the left-hand side and divide by the coefficient.',
  'نشتق عمود $u$ حتى الصفر ونكامل عمود $dv$ بالتوازي مع تناوب الإشارات $(+, -, +, \\dots)$.':
    'Differentiate the $u$ column down to zero and integrate the $dv$ column in parallel with alternating signs $(+, -, +, \\dots)$.',
  'نجمع حواصل الضرب القطرية بالإشارات المناسبة.':
    'Sum the diagonal products with their corresponding alternating signs.',
  'نعوض في القانون ثم نكامل الحد المتبقي $\\int v\\,du$.':
    'Substitute into the formula and evaluate the remaining integral $\\int v\\,du$.',
  'نرتب الحدود للحصول على المشتقة العكسية النهائية.':
    'Simplify and arrange the terms for the final antiderivative.',
  'نكامل كثير الحدود بدلالة $w$ ثم نعيد التعويض.': 'Integrate the polynomial in $w$ and substitute back.',
  'بما أن الأس زوجي، نستخدم $\\sin^2(\\theta) = \\frac{1 - \\cos(2\\theta)}{2}$.':
    'Since the power is even, apply $\\sin^2(\\theta) = \\frac{1 - \\cos(2\\theta)}{2}$.',
  'بما أن الأس زوجي، نستخدم $\\cos^2(\\theta) = \\frac{1 + \\cos(2\\theta)}{2}$.':
    'Since the power is even, apply $\\cos^2(\\theta) = \\frac{1 + \\cos(2\\theta)}{2}$.',
  'نستخدم $\\sin^2(u)\\cos^2(u) = \\frac{1}{4}\\sin^2(2u) = \\frac{1 - \\cos(4u)}{8}$.':
    'Apply $\\sin^2(u)\\cos^2(u) = \\frac{1}{4}\\sin^2(2u) = \\frac{1 - \\cos(4u)}{8}$.',
  'نخفض $\\sin^4(u) = \\left(\\frac{1 - \\cos(2u)}{2}\\right)^2 = \\frac{3}{8} - \\frac{1}{2}\\cos(2u) + \\frac{1}{8}\\cos(4u)$.':
    'Reduce power: $\\sin^4(u) = \\left(\\frac{1 - \\cos(2u)}{2}\\right)^2 = \\frac{3}{8} - \\frac{1}{2}\\cos(2u) + \\frac{1}{8}\\cos(4u)$.',
  'نخفض $\\cos^4(u) = \\left(\\frac{1 + \\cos(2u)}{2}\\right)^2 = \\frac{3}{8} + \\frac{1}{2}\\cos(2u) + \\frac{1}{8}\\cos(4u)$.':
    'Reduce power: $\\cos^4(u) = \\left(\\frac{1 + \\cos(2u)}{2}\\right)^2 = \\frac{3}{8} + \\frac{1}{2}\\cos(2u) + \\frac{1}{8}\\cos(4u)$.',
  'نستبدل $\\tan^2$ بـ $\\sec^2 - 1$ لتسهيل التعويض $w = \\tan$.':
    'Replace $\\tan^2$ with $\\sec^2 - 1$ to enable substitution $w = \\tan$.',
  'نستبدل $\\cot^2$ بـ $\\csc^2 - 1$ لتسهيل التكامل.':
    'Replace $\\cot^2$ with $\\csc^2 - 1$ to simplify the integral.',
  'نفصل $\\sec^2$ لمشتقة الظل ونحول الباقي بدلالة $\\tan$.':
    'Split off $\\sec^2$ as the derivative of $\\tan$ and convert the rest using $\\sec^2 = 1 + \\tan^2$.',
  'نفصل $\\csc^2$ لمشتقة ظل التمام ونحول الباقي بدلالة $\\cot$.':
    'Split off $\\csc^2$ as the derivative of $-\\cot$ and convert the rest using $\\csc^2 = 1 + \\cot^2$.',
  'نكامل $\\sec^3(u) = \\sec(u)\\cdot\\sec^2(u)$ بالتجزئة مع $u = \\sec$, $dv = \\sec^2$.':
    'Integrate $\\sec^3(u) = \\sec(u)\\cdot\\sec^2(u)$ by parts with $u = \\sec$, $dv = \\sec^2$.',
  'نكامل $\\csc^3(u)$ بالتجزئة الدورية المماثلة لـ $\\sec^3(u)$.':
    'Integrate $\\csc^3(u)$ via cyclic integration by parts analogous to $\\sec^3(u)$.',
  'نحول $\\sinh^2$ إلى $\\frac{\\cosh(2u) - 1}{2}$ ثم نكامل مباشرة.':
    'Rewrite $\\sinh^2$ as $\\frac{\\cosh(2u) - 1}{2}$ and integrate directly.',
  'نحول $\\cosh^2$ إلى $\\frac{\\cosh(2u) + 1}{2}$ ثم نكامل مباشرة.':
    'Rewrite $\\cosh^2$ as $\\frac{\\cosh(2u) + 1}{2}$ and integrate directly.',
  'نخرج الثابت قبل تطبيق التعويض المثلثي.':
    'Factor out the constant before applying trigonometric substitution.',
  'نستخدم صيغة $\\int\\sec^3\\theta\\,d\\theta$ ثم نعوض من المثلث القائم.':
    'Apply the standard formula for $\\int\\sec^3\\theta\\,d\\theta$ and substitute back via the right triangle.',
  'باستخدام التعويض المثلثي المناسب نحصل على تكامل $\\sec\\theta$ الذي يساوي اللوغاريتم الطبيعي.':
    'Using the matching trig substitution yields $\\int\\sec\\theta\\,d\\theta$, which integrates to a natural logarithm.',
  'نفصل البسط إلى جزء مشتقة المقام (يعطي $\\ln$) وثابت (يعطي $\\arctan$).':
    'Split the numerator into a derivative-of-denominator part ($\\ln$) and a constant part ($\\arctan$).',
  'بما أن درجة البسط أكبر من أو تساوي درجة المقام، نجري القسمة المطولة أولاً.':
    'Since the numerator degree is greater than or equal to the denominator degree, perform polynomial long division first.',
  'مقام الكسر من الدرجة الأولى، لذا تكامله يعطي اللوغاريتم الطبيعي.':
    'The denominator is linear, so integrating yields a natural logarithm.',
  'نحلل المقام إلى عوامل خطية وعوامل تربيعية غير قابلة للتحليل.':
    'Factor the denominator into linear and irreducible quadratic factors.',
  'نفرض الكسور الجزئية بثوابت مجهولة، ثم نوحد المقامات ونحل نظام المعادلات لإيجاد الثوابت.':
    'Set up partial fractions with unknown coefficients, clear denominators, and solve the linear system.',
  'نكامل كل كسر جزئي باستخدام قواعد اللوغاريتم الطبيعي والقوى ومعكوس الظل.':
    'Integrate each partial fraction using logarithmic, power, and inverse tangent rules.',
  'نفصل التكامل إلى مجموع وتطرح تكاملات الحدود المنفصلة لتسهيل الحل.':
    'Split the integral into a sum/difference of simpler term integrals.',
  'نفك الأقواس لتحويل المقدار إلى مجموع حدود جبرية بسيطة.':
    'Expand parentheses into a sum of elementary algebraic terms.',
  'نطبق صيغة سمبسون ثم نُدقق النتيجة باستخدام تكامل غاوس-كرونرود التكيفي ذي الـ 15 نقطة.':
    "Apply composite Simpson's formula and verify with 15-point adaptive Gauss-Kronrod quadrature.",
  'تُحسب القيمة العددية النهائية بدقة عالية مع تقدير للخطأ العددي.':
    'Compute the high-precision numerical value along with an error estimate.',
  'هذه الدالة متصلة وقابلة للتكامل، لكنها لا تملك مشتقة عكسية في صورة دوال أولية مغلقة؛ لذلك نستخدم مفكوك متسلسلة القوى (تايلور) والتكامل العددي المباشر.':
    'This function is integrable, yet has no elementary closed-form antiderivative; we use a Taylor power series expansion and direct numerical quadrature.',
  'نكامل كل حد من حدود المتسلسلة باستخدام قاعدة القوة لإيجاد صيغة تقريب تحليلية عالية الدقة.':
    'Integrate each power series term using the power rule to obtain an accurate analytical approximation.',
  'الدالة غير متصلة أو غير معرفة عند نقاط الاختبار؛ يمكنك تحديد فترة معرفة في وضع "تكامل محدود" لحسابها عددياً.':
    'The function is discontinuous or undefined at sample points; specify a valid interval in Definite Integral mode to evaluate numerically.',
  'لأن مشتقة أي ثابت تساوي صفراً، نضيف ثابت التكامل الاختياري $C$ في النتيجة النهائية.':
    'Since the derivative of any constant is zero, append the arbitrary constant of integration $C$.',
  'نحسب الفرق بين القيمتين للحصول على النتيجة الدقيقة.':
    'Evaluate the difference $F(b) - F(a)$ for the exact result.',
  'نحسب القيمة العددية المباشرة لتجنب انقطاع الدالة المشتقة العكسية داخل الفترة.':
    'Compute the direct numerical integral to avoid branch-cut discontinuities in the antiderivative.',
  'هذه الدالة لا تملك مشتقة عكسية أولية بسيطة، لذا تم استخدام التكامل العددي (قاعدة سمبسون وغاوس-كرونرود التكيفية).':
    "This integrand lacks a simple elementary antiderivative, so adaptive numerical integration (Simpson's rule and Gauss-Kronrod) was used.",
  // Non-elementary descriptions
  'وفق مبرهنة ليوفيل لا توجد مشتقة عكسية أولية لهذا التكامل الغاوسي، ويُعرَّف تحليلياً بدالة الخطأ الخاصة $\\operatorname{erf}$ وبمتسلسلة القوى.':
    'By Liouville’s theorem, this Gaussian integral has no elementary antiderivative and is defined analytically via the error function $\\operatorname{erf}$ and power series.',
  'لا توجد مشتقة عكسية أولية مغلقة، ويُعبَّر عن التكامل بدالة الخطأ التخيلية $\\operatorname{erfi}$ وبمتسلسلة تايلور.':
    'No closed-form elementary antiderivative exists; the integral is expressed via the imaginary error function $\\operatorname{erfi}$ and Taylor series.',
  'يُعرَّف تكامل $\\frac{\\sin(x)}{x}$ تحليلياً بدالة التكامل الجيبي الخاصة $\\operatorname{Si}$ مع مفكوك متسلسلة القوى.':
    'The integral of $\\frac{\\sin(x)}{x}$ is defined analytically by the sine integral function $\\operatorname{Si}$ and power series.',
  'يُعرَّف تكامل $\\frac{\\cos(x)}{x}$ تحليلياً بدالة التكامل التجيبية الخاصة $\\operatorname{Ci}$.':
    'The integral of $\\frac{\\cos(x)}{x}$ is defined analytically by the cosine integral function $\\operatorname{Ci}$.',
  'يُعرَّف تكامل $\\frac{e^x}{x}$ تحليلياً بالدالة الأسية التكاملية الخاصة $\\operatorname{Ei}$.':
    'The integral of $\\frac{e^x}{x}$ is defined analytically by the exponential integral function $\\operatorname{Ei}$.',
  'يُعرَّف تكامل $\\frac{1}{\\ln(x)}$ تحليلياً بدالة التكامل اللوغاريتمي الخاصة $\\operatorname{li}$.':
    'The integral of $\\frac{1}{\\ln(x)}$ is defined analytically by the logarithmic integral function $\\operatorname{li}$.',
  'يُعرَّف تكامل فرينل الجيبي $\\int \\sin(x^2)\\,dx$ بدالة فرينل الخاصة $S(x)$ وبمتسلسلة القوى.':
    'The Fresnel sine integral $\\int \\sin(x^2)\\,dx$ is defined via the Fresnel function $S(x)$ and power series.',
  'يُعرَّف تكامل فرينل التجيبي $\\int \\cos(x^2)\\,dx$ بدالة فرينل الخاصة $C(x)$ وبمتسلسلة القوى.':
    'The Fresnel cosine integral $\\int \\cos(x^2)\\,dx$ is defined via the Fresnel function $C(x)$ and power series.',
  // Limits
  'نهاية أي ثابت تساوي الثابت نفسه مهما كانت قيمة الاقتراب.':
    'The limit of any constant equals the constant itself regardless of the limit point.',
  'بما أن درجة المقام أكبر من درجة البسط، فإن قيمة الكسر تؤول إلى الصفر.':
    'Since the denominator degree exceeds the numerator degree, the fraction approaches $0$.',
  'بما أن درجتي البسط والمقام متساويتان، فإن النهاية تساوي نسبة المعاملين الرئيسيين.':
    'Since the numerator and denominator have equal degrees, the limit equals the ratio of their leading coefficients.',
  'بما أن درجة البسط أكبر، فإن النهاية تبتعد إلى اللانهاية حسب إشارة المعاملين وزوجية فرق الدرجتين.':
    'Since the numerator degree is larger, the expression diverges to infinity according to the sign ratio and degree parity.',
  'نضرب البسط والمقام في المرافق لإلغاء الجذر التربيعي في البسط ثم نقسم على أعلى قوة للمتغير.':
    'Multiply numerator and denominator by the conjugate to eliminate the radical, then divide by the highest power.',
  'نأخذ اللوغاريتم الطبيعي للطرفين لتحويل الصيغة $1^{\\infty}$ إلى صيغة $\\frac{0}{0}$، فنحسب نهاية الأس في اللوغاريتم ثم نرفع الناتج للأساس $e$.':
    'Take the natural logarithm to convert $1^{\\infty}$ into a $\\frac{0}{0}$ form, evaluate the exponent limit, and exponentiate base $e$.',
  'بما أن التعويض يعطي $\\frac{0}{0}$ مع وجود جذر تربيعي في البسط، نضرب البسط والمقام في مرافق البسط لتبسيط الجذر.':
    'Since substitution yields $\\frac{0}{0}$ with a square root in the numerator, multiply by the numerator conjugate to simplify.',
  'نضرب البسط والمقام في مرافق المقام الجذري لإزالة الجذر والتخلص من الصيغة $\\frac{0}{0}$.':
    'Multiply numerator and denominator by the denominator radical conjugate to eliminate the indeterminate $\\frac{0}{0}$ form.',
  'كل من البسط والمقام يؤول إلى اللانهاية، فنطبق قاعدة لوبيتال باشتقاق البسط والمقام.':
    "Both numerator and denominator approach infinity; apply L'Hôpital's rule by differentiating numerator and denominator.",
  'نفرض $L = \\lim f(x)^{g(x)}$ ثم نأخذ اللوغاريتم الطبيعي للطرفين لتحويل القوة إلى حاصل ضرب ثم إلى كسر لتطبيق قاعدة لوبيتال.':
    "Let $L = \\lim f(x)^{g(x)}$, take the natural logarithm to rewrite the exponent as a quotient, and apply L'Hôpital's rule.",
  'تتذبذب الدالة بسرعة متزايدة عند الاقتراب من اليمين دون استقرار على قيمة.':
    'The function oscillates increasingly rapidly from the right without settling to a value.',
  'الدالة غير معرفة في جوار اليمين على مجموعة الأعداد الحقيقية.':
    'The function is undefined on the real right-hand neighborhood.',
  'تتذبذب الدالة بسرعة متزايدة عند الاقتراب من اليسار دون استقرار على قيمة.':
    'The function oscillates increasingly rapidly from the left without settling to a value.',
  'الدالة غير معرفة في جوار اليسار على مجموعة الأعداد الحقيقية.':
    'The function is undefined on the real left-hand neighborhood.',
  'بحساب النهاية من اليمين ومن اليسار نجد أنهما متساويتان، وبالتالي النهاية موجودة.':
    'Both the right-hand and left-hand limits exist and match, so the two-sided limit exists.',
  'بما أن النهاية من اليمين لا تساوي النهاية من اليسار (أو إحداهما غير موجودة)، فإن النهاية الكلية غير موجودة.':
    'Because the right-hand and left-hand limits differ (or one does not exist), the overall limit does not exist.',
  // Derivatives & Evaluate
  'مشتقة أي مقدار ثابت تساوي صفراً.': 'The derivative of any constant is zero.',
  'نشتق كل حد في المقدار على حدة ثم نجمع النواتج.':
    'Differentiate each term individually and sum the results.',
  'مشتقة حاصل الضرب تساوي مشتقة الأول في الثاني زائد الأول في مشتقة الثاني.':
    "The product rule states $(u\\cdot v)' = u'v + uv'$.",
  'نُبقي العامل الثابت مضروباً في مشتقة الدالة.':
    'Keep the constant factor multiplied by the derivative of the function.',
  'نشتق البسط مع بقاء المقام الثابت كما هو.':
    'Differentiate the numerator while keeping the constant denominator unchanged.',
  'نطبق قانون القسمة: (مشتقة البسط × المقام − البسط × مشتقة المقام) على مربع المقام.':
    "Apply the quotient rule: $(u'v - uv') / v^2$.",
  'ننزل الأس أمام الدالة ونطرح من الأس 1، ثم نضرب في مشتقة الدالة الداخلية.':
    'Bring down the exponent, subtract $1$ from it, and multiply by the derivative of the inner function.',
  'مشتقة $a^{u(x)}$ هي $a^{u(x)} \\ln(a) \\cdot u\'(x)$.':
    "The derivative of $a^{u(x)}$ is $a^{u(x)} \\ln(a) \\cdot u'(x)$.",
  'لأن الأساس والأس يعتمدان على المتغير، نطبق قاعدة مشتقة $u(x)^{w(x)}$.':
    'Since both base and exponent depend on the variable, apply logarithmic differentiation for $u(x)^{w(x)}$.',
  'نطبق قواعد التفاضل القياسية على التعبير.':
    'Apply standard differentiation rules to the expression.',
  'نحسب قيمة التعبير الرياضي بدقة مع اعتماد نظام الدرجات (DEG) للدوال المثلثية.':
    'Evaluate the expression accurately using Degrees (DEG) mode for trigonometric functions.',
  'نحسب قيمة التعبير الرياضي بدقة باستخدام الدوال والثوابت القياسية.':
    'Evaluate the expression accurately using standard functions and constants.',
  'نبسط الحدود الناتجة للوصول إلى الصيغة النهائية للمشتقة.':
    'Simplify the resulting terms to obtain the final derivative.',
  // Series
  'المجموع على فترة فارغة يساوي المحايد الجمعي (0).':
    'An empty sum equals the additive identity ($0$).',
  'حاصل الضرب على فترة فارغة يساوي المحايد الضربي (1).':
    'An empty product equals the multiplicative identity ($1$).',
  'نجمع جميع القيم الناتجة.': 'Sum all evaluated terms.',
  'نضرب جميع القيم الناتجة.': 'Multiply all evaluated factors.',
  // Matrices
  'نطرح حاصل ضرب القطر الثانوي من حاصل ضرب القطر الرئيسي: ad − bc.':
    'Subtract the anti-diagonal product from the main diagonal product: $ad - bc$.',
  'نحول المصفوفة إلى الشكل المثلثي عبر العمليات الصفية ونضرب عناصر القطر الرئيسي.':
    'Reduce the matrix to upper triangular form via row operations and multiply the diagonal pivots.',
  'أثر المصفوفة المربعة هو مجموع عناصر قطرها الرئيسي.':
    'The trace of a square matrix is the sum of its main diagonal entries.',
  'نطبق العمليات الصفية الأولية لجعل كل محور مساوياً لـ 1 وتصفير ما فوقه وتحته.':
    'Apply elementary row operations to scale each pivot to $1$ and eliminate entries above and below.',
  'مرتبة المصفوفة تساوي عدد الصفوف غير الصفرية في صيغة الاختزال المختصرة.':
    'The rank equals the number of non-zero pivot rows in RREF.',
  'المصفوفة قابلة للعكس لأن محددها لا يساوي صفراً.':
    'The matrix is invertible because its determinant is non-zero.',
  'نختزل المصفوفة الموسعة للوصول إلى مصفوفة الوحدة في الطرف الأيسر فينتج المعكوس في الطرف الأيمن.':
    'Row-reduce the augmented matrix $[A \\mid I]$ until the left block becomes $I$, yielding $A^{-1}$ on the right.',
  'القيمة الذاتية هي العنصر الوحيد في المصفوفة.':
    'The sole entry of a $1\\times 1$ matrix is its eigenvalue.',
  'نستخدم الأثر والمحدد لتشكيل معادلة الدرجة الثانية للمصفوفة 2×2.':
    'Use the trace and determinant to form the quadratic characteristic polynomial.',
  'نحل المعادلة باستخدام القانون العام لإيجاد القيم الذاتية.':
    'Solve the characteristic quadratic via the quadratic formula to obtain eigenvalues.',
  'نطبق العملية على كل عنصر في المصفوفة A مع نظيره في المصفوفة B.':
    'Apply the operation elementwise between corresponding entries of $A$ and $B$.',
  'بما أن det(A) ≠ 0، نحسب المعكوس A⁻¹ ثم نضربه في مصفوفة الثوابت B.':
    'Since $\\det(A) \\neq 0$, compute the inverse $A^{-1}$ and multiply by $B$.',
  'نضرب المعكوس في المصفوفة B للحصول على قيم المجاهيل.':
    'Multiply $A^{-1}$ by $B$ to obtain the unknown vector $X$.',
};

function translateStepTitle(title: string, lang: AppLang): string {
  if (lang === 'ar') return title;
  if (EXACT_STEP_TITLES_EN[title]) return EXACT_STEP_TITLES_EN[title];

  let m: RegExpMatchArray | null;
  if ((m = title.match(/^تكامل الدالة (.+)$/))) {
    return `Integrate ${m[1]}`;
  }
  if ((m = title.match(/^اشتقاق الدالة (.+) مع قاعدة السلسلة$/))) {
    return `Differentiate ${m[1]} via Chain Rule`;
  }
  if ((m = title.match(/^التعويض عند (.+)$/))) {
    return `Evaluate at ${m[1]}`;
  }
  if ((m = title.match(/^حساب ميل المماس عند (.+)$/))) {
    return `Evaluate Slope at ${m[1]}`;
  }
  if ((m = title.match(/^نشر الدالة بمتسلسلة تايلور حول x₀ = (.+)$/))) {
    return `Taylor Series Expansion around x₀ = ${m[1]}`;
  }
  if ((m = title.match(/^قسمة البسط والمقام على أعلى قوة \((.+)\)$/))) {
    return `Divide Numerator & Denominator by Highest Power (${m[1]})`;
  }
  if ((m = title.match(/^التحليل بمتسلسلة تايلور حول (.+)$/))) {
    return `Taylor Series Analysis around ${m[1]}`;
  }
  if ((m = title.match(/^حساب النهاية اليمنى \((.+)\)$/))) {
    return `Compute Right-Hand Limit (${m[1]})`;
  }
  if ((m = title.match(/^حساب النهاية اليسرى \((.+)\)$/))) {
    return `Compute Left-Hand Limit (${m[1]})`;
  }
  if ((m = title.match(/^فك حدود المجموع \((.+)\)$/))) {
    const count = m[1].match(/\d+/)?.[0] ?? '';
    return `Expand Sum Terms (${count} terms)`;
  }
  if ((m = title.match(/^فك عوامل حاصل الضرب \((.+)\)$/))) {
    const count = m[1].match(/\d+/)?.[0] ?? '';
    return `Expand Product Factors (${count} factors)`;
  }
  return title;
}

function translateStepExplanation(expl: string, lang: AppLang): string {
  if (lang === 'ar') return expl;
  if (EXACT_EXPLANATIONS_EN[expl]) return EXACT_EXPLANATIONS_EN[expl];

  let m: RegExpMatchArray | null;
  if ((m = expl.match(/^نطبق قاعدة القوة (.+) حيث \$n = 1\$\.$/))) {
    return `Apply the power rule ${m[1]} with $n = 1$.`;
  }
  if ((m = expl.match(/^نطبق القاعدة القياسية (.+) حيث (.+)\.$/))) {
    return `Apply the standard rule ${m[1]} where ${m[2]}.`;
  }
  if ((m = expl.match(/^نطبق القاعدة (.+)\.$/))) {
    return `Apply the rule ${m[1]}.`;
  }
  if ((m = expl.match(/^نختار \$u = (.+)\$ ومنه نشتق لإيجاد \$du\$ بدلالة (.+)\.$/))) {
    return `Choose $u = ${m[1]}$ and differentiate to express $du$ in terms of ${m[2]}.`;
  }
  if ((m = expl.match(/^نعوض عن \$u\$ و \$d.+\$ في التكامل الأصلي فنحصل على تكامل أبسط\.$/))) {
    return 'Substitute $u$ and the differential into the original integral to simplify it.';
  }
  if ((m = expl.match(/^نعوض عن كل \$u\$ بقيمتها الأصلية \$u = (.+)\$\.$/))) {
    return `Substitute back $u = ${m[1]}$.`;
  }
  if ((m = expl.match(/^نختار الدالة نفسها كـ \$u\$ .+ ونأخذ \$dv = (.+)\$\.$/))) {
    return `Choose the function as $u$ and set $dv = ${m[1]}$.`;
  }
  if ((m = expl.match(/^نختار كثير الحدود \$u = (.+)\$ \(لأنه ينعدم بالاشتقاق بعد (\d+) خطوات\) والدالة \$dv = (.+)\$\.$/))) {
    return `Choose polynomial $u = ${m[1]}$ (vanishes after ${m[2]} derivatives) and $dv = ${m[3]}$.`;
  }
  if ((m = expl.match(/^حسب أولوية LIATE نختار \$u = (.+)\$ و \$dv = (.+)\$\.$/))) {
    return `By LIATE priority, choose $u = ${m[1]}$ and $dv = ${m[2]}$.`;
  }
  if ((m = expl.match(/^أس \$\\sin\$ فردي \((\d+)\)؛ نفصل (.+) للمشتقة ونحول الباقي باستخدام (.+)\.$/))) {
    return `Odd power of $\\sin$ (${m[1]}); factor out ${m[2]} and convert the rest via ${m[3]}.`;
  }
  if ((m = expl.match(/^أس \$\\cos\$ فردي \((\d+)\)؛ نفصل (.+) للمشتقة ونحول الباقي باستخدام (.+)\.$/))) {
    return `Odd power of $\\cos$ (${m[1]}); factor out ${m[2]} and convert the rest via ${m[3]}.`;
  }
  if ((m = expl.match(/^نكامل كثير الحدود بدلالة \$w\$ ثم نعيد التعويض \$w = (.+)\$\.$/))) {
    return `Integrate the polynomial in $w$ and substitute back $w = ${m[1]}$.`;
  }
  if ((m = expl.match(/^نطبق متطابقة التحويل من جداء إلى مجموع: (.+)\.$/))) {
    return `Apply product-to-sum identity: ${m[1]}.`;
  }
  if ((m = expl.match(/^نتمم المربع داخل الجذر لنكتب \$w = (.+)\$ وتصبح الصيغة قياسية\.$/))) {
    return `Complete the square inside the radical with $w = ${m[1]}$ to match a standard form.`;
  }
  if ((m = expl.match(/^نعوض \$w = (.+)\$\.$/))) {
    return `Substitute back $w = ${m[1]}$.`;
  }
  if ((m = expl.match(/^لإزالة الجذر (.+) نضع (.+)\.$/))) {
    return `To eliminate the radical ${m[1]}, set ${m[2]}.`;
  }
  if ((m = expl.match(/^نكامل (.+) ونستبدل (.+) و (.+)\.$/))) {
    return `Integrate ${m[1]} and substitute back ${m[2]} and ${m[3]}.`;
  }
  if ((m = expl.match(/^نضع (.+) فيتحول الجذر إلى (.+)\.$/))) {
    return `Set ${m[1]} so the radical simplifies to ${m[2]}.`;
  }
  if ((m = expl.match(/^نضع (.+) فيصبح الجذر (.+)\.$/))) {
    return `Set ${m[1]} so the radical becomes ${m[2]}.`;
  }
  if ((m = expl.match(/^نكتب التعبير داخل الجذر بصورة مربع كامل بإزاحة \$w = (.+)\$\.$/))) {
    return `Write the quadratic inside the radical as a completed square via $w = ${m[1]}$.`;
  }
  if ((m = expl.match(/^المميز سالب \(\$\\Delta < 0\$\)؛ نكتب المقام على صورة مجموع مربعين بإزاحة \$w = (.+)\$\.$/))) {
    return `Negative discriminant ($\\Delta < 0$); express the denominator as a sum of squares via $w = ${m[1]}$.`;
  }
  if ((m = expl.match(/^نضع (.+) فيتحول التكامل إلى (.+)\.$/))) {
    return `Substitute ${m[1]} to transform the integral into ${m[2]}.`;
  }
  if ((m = expl.match(/^نعوض (.+) فيختصر الجذر مع (.+) وتبقى (.+)\.$/))) {
    return `Substitute ${m[1]} so the radical cancels with ${m[2]}, leaving ${m[3]}.`;
  }
  if ((m = expl.match(/^درجة البسط \((\d+)\) \$\\ge\$ درجة المقام \((\d+)\)؛ نقسم البسط على المقام للحصول على كثير حدود زائد كسر فعلي\.$/))) {
    return `Numerator degree (${m[1]}) $\\ge$ denominator degree (${m[2]}); divide to get a polynomial plus a proper fraction.`;
  }
  if ((m = expl.match(/^نقسم الفترة (.+) إلى \$n = 8\$ فترات جزئية متساوية عرض كل منها (.+)\.$/))) {
    return `Partition interval ${m[1]} into $n = 8$ equal subintervals of width ${m[2]}.`;
  }
  if ((m = expl.match(/^نحسب المشتقات المتتالية عند المركز (.+) لتمثيل الدالة على هيئة كثير حدود متسلسل\.$/))) {
    return `Evaluate successive derivatives at ${m[1]} to construct the Taylor polynomial.`;
  }
  if ((m = expl.match(/^نعوض بحدي التكامل العلوي (.+) والسفلي (.+) في المشتقة العكسية (.+)\.$/))) {
    return `Evaluate the antiderivative ${m[3]} at upper bound ${m[1]} and lower bound ${m[2]}.`;
  }
  if ((m = expl.match(/^عرض الفترة الجزئية \$h = (.+)\$ والمجموع الموزون لقيم الدالة\.$/))) {
    return `Step width $h = ${m[1]}$ and weighted sum of sampled function values.`;
  }
  // Limits dynamic
  if ((m = expl.match(/^عندما يؤول (.+) إلى (.+) يهيمن الحد ذو الأس الأعلى (.+) على سلوك كثير الحدود\.$/))) {
    return `As ${m[1]} approaches ${m[2]}, the highest-degree term ${m[3]} dominates the polynomial.`;
  }
  if ((m = expl.match(/^درجة البسط هي (.+) ودرجة المقام هي (.+)، لذا نقسم كل حد في البسط والمقام على (.+)؛ فتنعدم جميع الحدود ذات الأس السالب عند اللانهاية\.$/))) {
    return `Numerator degree is ${m[1]} and denominator degree is ${m[2]}; dividing every term by ${m[3]} causes negative-power terms to vanish at infinity.`;
  }
  if ((m = expl.match(/^بعد اختصار الحدود المتشابهة والقسمة على (.+) نحصل على القيمة الدقيقة للنهاية\.$/))) {
    return `After canceling like terms and dividing by ${m[1]}, we obtain the exact limit.`;
  }
  if ((m = expl.match(/^النهاية على الصورة غير المعينة \((.+)\)، فنشتق البسط والمقام بالنسبة إلى (.+)\.$/))) {
    return `Indeterminate form (${m[1]}); differentiate numerator and denominator with respect to ${m[2]}.`;
  }
  if ((m = expl.match(/^بتتبع سلوك الدالة لقيم كبيرة جداً من (.+)، تقترب الدالة بشكل مستقر نحو القيمة الحدية\.$/))) {
    return `Tracking values for large ${m[1]}, the function steadily converges to the limit value.`;
  }
  if ((m = expl.match(/^مع تزايد (.+) نحو اللانهاية، تنمو قيمة الدالة بلا حدود باتجاه (.+)\.$/))) {
    return `As ${m[1]} grows without bound, the function diverges toward ${m[2]}.`;
  }
  if ((m = expl.match(/^تستمر الدالة بالتذبذب دون الاستقرار عند قيمة محددة عندما يؤول (.+) إلى (.+)، لذلك النهاية غير موجودة\.$/))) {
    return `The function oscillates indefinitely as ${m[1]} approaches ${m[2]}, so the limit does not exist.`;
  }
  if ((m = expl.match(/^الدالة متصلة عند (.+)؛ نعوض مباشرة بالقيمة (.+) مكان (.+)\.$/))) {
    return `The function is continuous at ${m[1]}; directly substitute ${m[2]} for ${m[3]}.`;
  }
  if ((m = expl.match(/^بالتعويض المباشر نحصل على الصيغة غير المعينة (.+)، فنحلل البسط والمقام ونختزل العامل الصفري (.+)\.$/))) {
    return `Direct substitution yields ${m[1]}; factor numerator and denominator and cancel the zero factor ${m[2]}.`;
  }
  if ((m = expl.match(/^التعويض المباشر يعطي الصيغة غير المعينة (.+)، لذا نشتق كلاً من البسط والمقام بالنسبة للمتغير (.+)\.$/))) {
    return `Direct substitution gives ${m[1]}; differentiate numerator and denominator with respect to ${m[2]}.`;
  }
  if ((m = expl.match(/^بنشر البسط والمقام حول (.+) نجد أن أقل قوة في البسط \((.+)\) أكبر من أقل قوة في المقام \((.+)\)، فتؤول النسبة إلى الصفر\.$/))) {
    return `Expanding around ${m[1]}, the lowest numerator power (${m[2]}) exceeds that of the denominator (${m[3]}), so the limit is $0$.`;
  }
  if ((m = expl.match(/^بنشر البسط والمقام بمتسلسلة تايلور حول (.+) تتساوى أقل درجة \((.+)\) في البسط والمقام، وتساوي النهاية نسبة المعاملين الرئيسيين\.$/))) {
    return `Expanding around ${m[1]}, both have equal lowest degree (${m[2]}), so the limit equals the ratio of leading terms.`;
  }
  if ((m = expl.match(/^بعد إيجاد (.+) نأخذ الأس الطبيعي للطرفين\.$/))) {
    return `After finding ${m[1]}, exponentiate both sides base $e$.`;
  }
  if ((m = expl.match(/^بتتبع قيم الدالة عند الاقتراب من (.+) من جهة اليمين \((.+)\)، تقترب الدالة من القيمة المحددة\.$/))) {
    return `Evaluating the function as it approaches ${m[1]} from the right (${m[2]}), it converges to this limit.`;
  }
  if ((m = expl.match(/^عند الاقتراب من (.+) من اليمين تنمو الدالة بلا حدود باتجاه (.+)\.$/))) {
    return `Approaching ${m[1]} from the right, the function diverges toward ${m[2]}.`;
  }
  if ((m = expl.match(/^بتتبع قيم الدالة عند الاقتراب من (.+) من جهة اليسار \((.+)\)، تقترب الدالة من القيمة المحددة\.$/))) {
    return `Evaluating the function as it approaches ${m[1]} from the left (${m[2]}), it converges to this limit.`;
  }
  if ((m = expl.match(/^عند الاقتراب من (.+) من اليسار تنمو الدالة بلا حدود باتجاه (.+)\.$/))) {
    return `Approaching ${m[1]} from the left, the function diverges toward ${m[2]}.`;
  }
  if ((m = expl.match(/^من اليمين واليسار تتجه الدالة معاً نحو (.+) \(خط تقارب عمودي عند (.+)\)\.$/))) {
    return `From both sides the function approaches ${m[1]} (vertical asymptote at ${m[2]}).`;
  }
  if ((m = expl.match(/^نقارن بين سلوك الدالة من اليمين \((.+)\) ومن اليسار \((.+)\)\.$/))) {
    return `Compare right-hand behavior (${m[1]}) and left-hand behavior (${m[2]}).`;
  }
  // Derivatives dynamic
  if ((m = expl.match(/^مشتقة (.+) بالنسبة لنفسه تساوي \$1\$\.$/))) {
    return `The derivative of ${m[1]} with respect to itself is $1$.`;
  }
  if ((m = expl.match(/^نطبق قاعدة مشتقة الدالة (.+) مضروبةً في مشتقة المقدار الداخلي\.$/))) {
    return `Apply the derivative rule for ${m[1]} multiplied by the inner derivative.`;
  }
  if ((m = expl.match(/^نرتب ونبسط التعبير الجبري للدالة (.+)\.$/))) {
    return `Arrange and simplify the algebraic expression ${m[1]}.`;
  }
  if ((m = expl.match(/^نعوض بقيمة (.+) في الدالة للحصول على القيمة العددية\.$/))) {
    return `Substitute ${m[1]} into the function to compute the numeric value.`;
  }
  if ((m = expl.match(/^نعوض بقيمة (.+) في دالة المشتقة (.+)\.$/))) {
    return `Substitute ${m[1]} into the derivative ${m[2]}.`;
  }
  // Series dynamic
  if ((m = expl.match(/^نحسب الحدود الابتدائية للمتسلسلة بدءاً من (.+) ونرصد تقارب المجموع الجزئي\.$/))) {
    return `Evaluate initial terms starting at ${m[1]} and monitor partial convergence.`;
  }
  if ((m = expl.match(/^بعد (\d+) حداً تتقارب القيمة نحو الناتج التالي:$/))) {
    return `After ${m[1]} terms, the partial value converges toward:`;
  }
  if ((m = expl.match(/^نعوض عن (.+) بالأعداد الصحيحة من (.+) إلى (.+) في الحد العام\.$/))) {
    return `Substitute integer values for ${m[1]} from ${m[2]} to ${m[3]} into the general term.`;
  }
  // Matrices dynamic
  if ((m = expl.match(/^نبدل كل صف بالعمود المقابل له لتصبح الأبعاد (.+)\.$/))) {
    return `Swap each row with its corresponding column to obtain dimensions ${m[1]}.`;
  }
  if ((m = expl.match(/^نضرب كل صف من A \((.+)\) في كل عمود من B \((.+)\) لنحصل على مصفوفة (.+)\.$/))) {
    return `Multiply each row of A (${m[1]}) by each column of B (${m[2]}) to produce a ${m[3]} matrix.`;
  }
  return expl;
}

export function localizeStep(step: SolutionStep, lang: AppLang): SolutionStep {
  if (lang === 'ar') return step;
  return {
    ...step,
    title: translateStepTitle(step.title, 'en'),
    explanation: translateStepExplanation(step.explanation, 'en'),
    latex: localizeLatex(step.latex, 'en'),
  };
}

const EXACT_MESSAGES_EN: Record<string, string> = {
  // ast.ts ParseError
  'استخدم الدالة abs(...) بدلاً من علامة القيمة المطلقة |...|':
    'Use abs(...) instead of vertical bars |...| for absolute value.',
  'الرجاء إدخال دالة رياضية للمكاملة.': 'Please enter a mathematical expression.',
  'يوجد قوس إغلاق ")" إضافي غير متطابق.': 'Extra unmatched closing parenthesis ")".',
  'يوجد قوس مفتوح "(" بدون قوس إغلاق ")".': 'Missing closing parenthesis ")".',
  'الدالة log تقبل معاملًا واحدًا أو معاملين (الأساس، العدد).':
    'Function log accepts 1 argument or 2 arguments (base, value).',
  'بنية التعبير الرياضي غير مكتملة أو تحتوي على معامل مفقود.':
    'Incomplete mathematical expression or missing operand.',
  // integrator bounds & errors
  'الرجاء إدخال حد التكامل.': 'Please enter an integration bound.',
  'غير معرف': 'Undefined',
  'تعذر قراءة التعبير الرياضي.': 'Could not parse the mathematical expression.',
  'حدود التكامل غير صالحة.': 'Invalid integration bounds.',
  'تعذر تقريب التكامل عددياً.': 'Could not numerically approximate the integral.',
  'تعذر حساب التكامل المحدود؛ تأكد من أن الدالة متصلة ومعرفة على فترة التكامل.':
    'Could not evaluate definite integral; ensure the function is continuous on the interval.',
  'تنبيه: توجد نقطة تفرع أو تغير إشارة داخل الفترة؛ تم التحقق عددياً لضمان دقة النتيجة.':
    'Note: Sign change or branch point detected inside interval; verified numerically.',
  // numerical.ts
  'قد يكون التكامل المعتل متباعداً أو غير متقارب على المجال اللانهائي.':
    'The improper integral may be divergent or slow to converge over the infinite domain.',
  'قد يكون التكامل المعتل متباعداً عند اللانهاية الموجبة.':
    'The improper integral may diverge at positive infinity.',
  'قد يكون التكامل المعتل متباعداً عند اللانهاية السالبة.':
    'The improper integral may diverge at negative infinity.',
  'الدالة غير معرّفة على جزء كبير من فترة التكامل المحددة.':
    'The function is undefined over a significant part of the integration interval.',
  'يوجد نقطة عدم اتصال أو خط تقارب رأسي داخل فترة التكامل قد يجعل التكامل متباعداً.':
    'A discontinuity or vertical asymptote inside the interval may cause divergence.',
  'التكامل يحتوي على تغير حاد أو نقطة شاذة قريبة؛ القيمة المعروضة تقريبية.':
    'Sharp variation or nearby singularity detected; displayed value is approximate.',
  // limits.ts
  'قيمة الاقتراب غير صالحة.': 'Invalid limit target.',
  // derivatives.ts
  'القيمة غير معرفة رياضياً (مثل القسمة على صفر أو معاملات غير صالحة).':
    'Result is mathematically undefined (e.g., division by zero or invalid domain).',
  'الاشتقاق الرمزي يعتمد قياس الراديان (RAD) رياضياً؛ يمكنك استخدام وضع "حساب" للتقييم بالدرجات (DEG).':
    'Symbolic differentiation mathematically assumes Radians (RAD); use Evaluate mode for Degrees (DEG).',
  // summation.ts
  'تعذر قراءة صيغة الحد العام.': 'Could not parse the general term expression.',
  'حدود المجموع غير صالحة.': 'Invalid series bounds.',
  'الحد السفلي يجب أن يكون عدداً صحيحاً منتهياً.': 'Lower bound must be a finite integer.',
  'يجب أن يكون الحد السفلي عدداً صحيحاً.': 'Lower bound must be an integer.',
  'الحد العلوي لا يمكن أن يكون −∞.': 'Upper bound cannot be −∞.',
  'المتسلسلة اللانهائية متباعدة أو بطيئة التقارب جداً (لا تنتهي إلى قيمة محددة).':
    'Infinite series is divergent or converges too slowly to determine a finite sum.',
  'يجب أن يكون الحد العلوي عدداً صحيحاً.': 'Upper bound must be an integer.',
  'عدد الحدود كبير جداً (الحد الأقصى 100,000 حد).':
    'Number of terms is too large (maximum is 100,000 terms).',
  // matrix.ts
  'هذه العملية تتطلب إدخال المصفوفة B.': 'This operation requires matrix B.',
  'المصفوفة منفردة (المحدد = 0)، لذا لا يوجد لها معكوس ضربي.':
    'Matrix is singular (det = 0), so it has no multiplicative inverse.',
  'حساب القيم الذاتية التحليلي مدعوم حالياً للمصفوفات 1×1 و 2×2.':
    'Analytical eigenvalue computation is currently supported for 1×1 and 2×2 matrices.',
  'محدد مصفوفة المعاملات A يساوي صفراً، لذا لا يوجد حل وحيد للنظام.':
    'Coefficient matrix A has zero determinant, so no unique solution exists.',
};

export function localizeMessage(msg: string, lang: AppLang): string {
  if (lang === 'ar' || !msg) return msg;
  if (EXACT_MESSAGES_EN[msg]) return EXACT_MESSAGES_EN[msg];

  let m: RegExpMatchArray | null;
  // ast.ts regexes
  if ((m = msg.match(/^رمز غير معروف في التعبير الرياضي: "(.+)"$/))) {
    return `Unknown character in expression: "${m[1]}"`;
  }
  if ((m = msg.match(/^تعبير غير مكتمل بالقرب من "(.+)"\.$/))) {
    return `Incomplete expression near "${m[1]}".`;
  }
  if ((m = msg.match(/^الدالة "(.+)" تحتاج إلى معاملات داخل الأقواس\.$/))) {
    return `Function "${m[1]}" requires arguments inside parentheses.`;
  }
  if ((m = msg.match(/^أغلق القوس بعد الدالة "(.+)\("\.$/))) {
    return `Missing closing parenthesis after "${m[1]}(".`;
  }
  if ((m = msg.match(/^الرقم "(.+)" غير صالح\.$/))) {
    return `Invalid number "${m[1]}".`;
  }
  if ((m = msg.match(/^الدالة "(.+)" تحتاج إلى أقواس ومعاملات مثل (.+)\.$/))) {
    return `Function "${m[1]}" requires parentheses and arguments like ${m[2]}.`;
  }
  if ((m = msg.match(/^الدالة "(.+)" تتطلب معاملين بالضبط مفصولين بفاصلة\.$/))) {
    return `Function "${m[1]}" requires exactly 2 comma-separated arguments.`;
  }
  if ((m = msg.match(/^الدالة "(.+)" تتطلب معاملين على الأقل مفصولين بفاصلة\.$/))) {
    return `Function "${m[1]}" requires at least 2 comma-separated arguments.`;
  }
  if ((m = msg.match(/^الدالة "(.+)" تحتاج إلى معامل مثل (.+)\.$/))) {
    return `Function "${m[1]}" requires an argument like ${m[2]}.`;
  }
  // integrator bounds/warnings
  if ((m = msg.match(/^حد التكامل "(.+)" يجب أن يكون قيمة ثابتة بدون متغيرات\.$/))) {
    return `Bound "${m[1]}" must be a constant without variables.`;
  }
  if ((m = msg.match(/^تعذر حساب قيمة حد التكامل "(.+)"\.$/))) {
    return `Could not evaluate bound "${m[1]}".`;
  }
  if ((m = msg.match(/^التعبير لا يحتوي على المتغير (.+)، لذا يُعامل كقيمة ثابتة بالنسبة لـ (.+)\.$/))) {
    return `Expression does not contain "${m[1]}", so it is treated as constant with respect to ${m[2]}.`;
  }
  if ((m = msg.match(/^تم اعتبار الرموز \((.+)\) ثوابت بالنسبة لمتغير التكامل (.+)\.$/))) {
    return `Symbols (${m[1]}) are treated as constants with respect to integration variable ${m[2]}.`;
  }
  if ((m = msg.match(/^تم اعتبار الرموز \((.+)\) ثوابت بالنسبة للمتغير (.+)\.$/))) {
    return `Symbols (${m[1]}) are treated as constants with respect to ${m[2]}.`;
  }
  // summation regexes
  if ((m = msg.match(/^الحد غير معرف عند (.+)\.$/))) {
    return `Term is undefined at ${m[1]}.`;
  }
  if ((m = msg.match(/^الحد غير معرف رياضياً عند (.+)\.$/))) {
    return `Term is mathematically undefined at ${m[1]}.`;
  }
  if ((m = msg.match(/^تم تقريب المتسلسلة اللانهائية عبر جمع (\d+) حداً\.$/))) {
    return `Infinite series approximated using ${m[1]} terms.`;
  }
  // matrix regexes
  if ((m = msg.match(/^المصفوفة ([AB]) فارغة\.$/))) {
    return `Matrix ${m[1]} is empty.`;
  }
  if ((m = msg.match(/^قيمة الخلية \((\d+), (\d+)\) في المصفوفة ([AB]) غير معرفة رياضياً\.$/))) {
    return `Entry (${m[1]}, ${m[2]}) in Matrix ${m[3]} is mathematically undefined.`;
  }
  if ((m = msg.match(/^صيغة الخلية \((\d+), (\d+)\) في المصفوفة ([AB]) غير صالحة: (.*)$/))) {
    return `Invalid entry (${m[1]}, ${m[2]}) in Matrix ${m[3]}: ${localizeMessage(m[4], 'en')}`;
  }
  if ((m = msg.match(/^حساب المحدد يتطلب مصفوفة مربعة \(المصفوفة الحالية (.+)\)\.$/))) {
    return `Determinant requires a square matrix (current: ${m[1]}).`;
  }
  if ((m = msg.match(/^حساب الأثر يتطلب مصفوفة مربعة \(المصفوفة الحالية (.+)\)\.$/))) {
    return `Trace requires a square matrix (current: ${m[1]}).`;
  }
  if ((m = msg.match(/^المعكوس يتطلب مصفوفة مربعة \(المصفوفة الحالية (.+)\)\.$/))) {
    return `Inverse requires a square matrix (current: ${m[1]}).`;
  }
  if ((m = msg.match(/^القيم الذاتية تتطلب مصفوفة مربعة \(الحالية (.+)\)\.$/))) {
    return `Eigenvalues require a square matrix (current: ${m[1]}).`;
  }
  if ((m = msg.match(/^يتطلب (الجمع|الطرح) تطابق أبعاد المصفوفتين \((.+) مقابل (.+)\)\.$/))) {
    return `Matrix ${m[1] === 'الجمع' ? 'addition' : 'subtraction'} requires matching dimensions (${m[2]} vs ${m[3]}).`;
  }
  if ((m = msg.match(/^لضرب A × B يجب أن يساوي عدد أعمدة A \((\d+)\) عدد صفوف B \((\d+)\)\.$/))) {
    return `To multiply A × B, columns of A (${m[1]}) must equal rows of B (${m[2]}).`;
  }
  if ((m = msg.match(/^يتطلب حل النظام AX = B أن تكون المصفوفة A مربعة \(الحالية (.+)\)\.$/))) {
    return `Solving AX = B requires a square matrix A (current: ${m[1]}).`;
  }
  if ((m = msg.match(/^عدد صفوف المصفوفة B \((\d+)\) يجب أن يطابق عدد صفوف A \((\d+)\)\.$/))) {
    return `Rows of matrix B (${m[1]}) must match rows of matrix A (${m[2]}).`;
  }
  return msg;
}
