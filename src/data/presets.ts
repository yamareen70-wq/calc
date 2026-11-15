import { LimitDirection } from '../math/limits';

export type CalcMode = 'integral' | 'limit' | 'derivative';

export interface CalcPreset {
  id: string;
  mode: CalcMode;
  title: string;
  titleEn: string;
  category: string;
  categoryEn: string;
  expression: string;
  isDefinite?: boolean;
  lowerBound?: string;
  upperBound?: string;
  limitTarget?: string;
  limitDirection?: LimitDirection;
  latexPreview: string;
}

export const CALC_PRESETS: CalcPreset[] = [
  {
    id: 'int-basic-poly',
    mode: 'integral',
    title: 'كثير حدود خطي القوة',
    titleEn: 'Quadratic Polynomial Integral',
    category: 'التكامل',
    categoryEn: 'Integrals',
    expression: '3x^2 - 4x + 5',
    isDefinite: false,
    latexPreview: '\\int (3x^2 - 4x + 5)\\,dx',
  },
  {
    id: 'int-parts-xsin',
    mode: 'integral',
    title: 'تكامل محدود بالتجزئة',
    titleEn: 'Definite Integration by Parts',
    category: 'التكامل',
    categoryEn: 'Integrals',
    expression: 'x * sin(x)',
    isDefinite: true,
    lowerBound: '0',
    upperBound: 'pi',
    latexPreview: '\\int_{0}^{\\pi} x \\sin(x)\\,dx',
  },
  {
    id: 'int-sub-exp',
    mode: 'integral',
    title: 'تعويض أسي مركب',
    titleEn: 'Exponential u-Substitution',
    category: 'التكامل',
    categoryEn: 'Integrals',
    expression: 'x * e^(x^2)',
    isDefinite: false,
    latexPreview: '\\int x e^{x^2}\\,dx',
  },
  {
    id: 'int-pf-distinct',
    mode: 'integral',
    title: 'كسور جزئية (عوامل خطية)',
    titleEn: 'Partial Fractions (Linear Factors)',
    category: 'التكامل',
    categoryEn: 'Integrals',
    expression: '1 / (x^2 - 1)',
    isDefinite: false,
    latexPreview: '\\int \\frac{1}{x^2 - 1}\\,dx',
  },
  {
    id: 'int-gaussian-indef',
    mode: 'integral',
    title: 'تكامل غاوسي (دوال خاصة + تايلور)',
    titleEn: 'Gaussian Integral (Special Fn + Taylor)',
    category: 'التكامل',
    categoryEn: 'Integrals',
    expression: 'e^(-x^2)',
    isDefinite: false,
    latexPreview: '\\int e^{-x^2}\\,dx',
  },
  {
    id: 'lim-trig-sinx',
    mode: 'limit',
    title: 'نهاية مثلثية أساسية (0/0)',
    titleEn: 'Standard Trig Limit (0/0)',
    category: 'النهايات',
    categoryEn: 'Limits',
    expression: 'sin(3x) / x',
    limitTarget: '0',
    limitDirection: 'two-sided',
    latexPreview: '\\lim_{x \\to 0} \\frac{\\sin(3x)}{x}',
  },
  {
    id: 'lim-factor',
    mode: 'limit',
    title: 'تحليل واختزال العامل الصفري',
    titleEn: 'Factoring & Canceling Zero Factor',
    category: 'النهايات',
    categoryEn: 'Limits',
    expression: '(x^2 - 9) / (x - 3)',
    limitTarget: '3',
    limitDirection: 'two-sided',
    latexPreview: '\\lim_{x \\to 3} \\frac{x^2 - 9}{x - 3}',
  },
  {
    id: 'lim-conjugate',
    mode: 'limit',
    title: 'الضرب في المرافق الجذري',
    titleEn: 'Radical Conjugate Multiplication',
    category: 'النهايات',
    categoryEn: 'Limits',
    expression: '(sqrt(x + 4) - 2) / x',
    limitTarget: '0',
    limitDirection: 'two-sided',
    latexPreview: '\\lim_{x \\to 0} \\frac{\\sqrt{x+4} - 2}{x}',
  },
  {
    id: 'lim-euler',
    mode: 'limit',
    title: 'نهاية أويلر عند اللانهاية (1^∞)',
    titleEn: "Euler's Exponential Limit (1^∞)",
    category: 'النهايات',
    categoryEn: 'Limits',
    expression: '(1 + 2/x)^x',
    limitTarget: 'oo',
    limitDirection: 'two-sided',
    latexPreview: '\\lim_{x \\to +\\infty} \\left(1 + \\frac{2}{x}\\right)^x',
  },
  {
    id: 'lim-inf-rational',
    mode: 'limit',
    title: 'نهاية دالة كسرية عند اللانهاية',
    titleEn: 'Rational Function Limit at Infinity',
    category: 'النهايات',
    categoryEn: 'Limits',
    expression: '(3x^2 + 5x - 1) / (2x^2 - x + 7)',
    limitTarget: 'oo',
    limitDirection: 'two-sided',
    latexPreview: '\\lim_{x \\to +\\infty} \\frac{3x^2 + 5x - 1}{2x^2 - x + 7}',
  },
  {
    id: 'lim-jump-dne',
    mode: 'limit',
    title: 'فحص القفزة والنهاية الجانبية',
    titleEn: 'Jump Discontinuity & One-Sided Check',
    category: 'النهايات',
    categoryEn: 'Limits',
    expression: 'abs(x) / x',
    limitTarget: '0',
    limitDirection: 'two-sided',
    latexPreview: '\\lim_{x \\to 0} \\frac{|x|}{x}',
  },
  {
    id: 'deriv-chain',
    mode: 'derivative',
    title: 'اشتقاق دالة مركبة بالسلسلة',
    titleEn: 'Product & Chain Rule Derivative',
    category: 'المشتقات',
    categoryEn: 'Derivatives',
    expression: 'e^(2x) * cos(3x)',
    latexPreview: '\\frac{d}{dx}\\left(e^{2x}\\cos(3x)\\right)',
  },
];

export interface MathRuleItem {
  title: string;
  titleEn: string;
  latex: string;
  note: string;
  noteEn: string;
}

export const MATH_RULES_REFERENCE: MathRuleItem[] = [
  {
    title: 'قاعدة القوة في التكامل',
    titleEn: 'Power Rule for Integration',
    latex: '\\int x^n\\,dx = \\frac{x^{n+1}}{n+1} + C \\quad (n \\neq -1)',
    note: 'تُطبق على القوى الحقيقية والجذور والأسس السالبة عدا -1',
    noteEn: 'Applies to real powers, radicals, and negative exponents except -1.',
  },
  {
    title: 'المبرهنة الأساسية للتكامل المحدود',
    titleEn: 'Fundamental Theorem of Calculus',
    latex: '\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)',
    note: 'تحسب المساحة الموقعة تحت المنحنى بين الحدين a و b',
    noteEn: 'Computes the signed area under the curve between limits a and b.',
  },
  {
    title: 'النهاية المثلثية القياسية',
    titleEn: 'Standard Trigonometric Limit',
    latex: '\\lim_{x \\to 0} \\frac{\\sin(kx)}{x} = k',
    note: 'تُستخدم مع متطابقات نصف الزاوية وقاعدة لوبيتال لحل حالات 0/0',
    noteEn: "Used alongside half-angle identities and L'Hôpital's rule for 0/0 forms.",
  },
  {
    title: 'نهاية أويلر الأساسية',
    titleEn: "Euler's Exponential Limit",
    latex: '\\lim_{x \\to \\infty} \\left(1 + \\frac{a}{x}\\right)^{bx} = e^{ab}',
    note: 'الحالة القياسية لمعالجة الصيغ الأسية غير المعينة من الشكل 1^∞',
    noteEn: 'Standard identity for resolving 1^∞ indeterminate exponential limits.',
  },
  {
    title: 'قاعدة لوبيتال للنهايات',
    titleEn: "L'Hôpital's Rule",
    latex: "\\lim_{x \\to a} \\frac{f(x)}{g(x)} = \\lim_{x \\to a} \\frac{f'(x)}{g'(x)}",
    note: 'تُطبق عند ظهور الصيغ غير المعينة 0/0 أو ∞/∞ مع قابلية الاشتقاق',
    noteEn: 'Applied when evaluating differentiable 0/0 or ∞/∞ indeterminate forms.',
  },
  {
    title: 'قاعدة السلسلة في الاشتقاق',
    titleEn: 'Chain Rule for Differentiation',
    latex: "\\frac{d}{dx}f(g(x)) = f'(g(x)) \\cdot g'(x)",
    note: 'الأساس في اشتقاق الدوال المركبة والأسية والمثلثية',
    noteEn: 'Foundation for differentiating composite, exponential, and trig functions.',
  },
];
