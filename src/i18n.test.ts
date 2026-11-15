import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KEYPAD_ARIA_EN,
  KEYPAD_VARIANT_SUB_EN,
  UI_TEXT,
  getFieldLabel,
  localizeLatex,
  localizeMessage,
  localizeMethodLabel,
  localizeStep,
} from './i18n';
import { CALC_PRESETS, MATH_RULES_REFERENCE } from './data/presets';
import { parseExpr } from './math/ast';
import { solveIntegral, SolutionStep } from './math/integrator';
import { solveLimit } from './math/limits';
import { solveDerivativeOrCalc } from './math/derivatives';
import { solveSeries } from './math/summation';
import { MatrixOp, solveMatrix } from './math/matrix';

const HAS_ARABIC = /[\u0600-\u06FF]/;

function assertNoArabic(text: string | undefined, context: string) {
  if (!text) return;
  assert.equal(
    HAS_ARABIC.test(text),
    false,
    `Leaked Arabic in [${context}]: ${text}`
  );
}

function assertStepsLocalized(steps: SolutionStep[], context: string) {
  for (let i = 0; i < steps.length; i++) {
    const loc = localizeStep(steps[i], 'en');
    assertNoArabic(loc.title, `${context}.step[${i}].title`);
    assertNoArabic(loc.explanation, `${context}.step[${i}].explanation`);
    assertNoArabic(loc.latex, `${context}.step[${i}].latex`);
    assertNoArabic(loc.note, `${context}.step[${i}].note`);
  }
}

test('Presets and Rules metadata have clean English translations', () => {
  for (const p of CALC_PRESETS) {
    assert.ok(p.titleEn.trim().length > 0, `Missing titleEn for ${p.id}`);
    assert.ok(p.categoryEn.trim().length > 0, `Missing categoryEn for ${p.id}`);
    assertNoArabic(p.titleEn, `preset.${p.id}.titleEn`);
    assertNoArabic(p.categoryEn, `preset.${p.id}.categoryEn`);
  }
  for (let i = 0; i < MATH_RULES_REFERENCE.length; i++) {
    const r = MATH_RULES_REFERENCE[i];
    assert.ok(r.titleEn.trim().length > 0, `Missing rule[${i}].titleEn`);
    assert.ok(r.noteEn.trim().length > 0, `Missing rule[${i}].noteEn`);
    assertNoArabic(r.titleEn, `rule[${i}].titleEn`);
    assertNoArabic(r.noteEn, `rule[${i}].noteEn`);
  }
});

test('UI_TEXT.en and keypad maps contain no leaked Arabic outside langSwitch.buttonLabel', () => {
  assert.equal(UI_TEXT.en.langSwitch.buttonLabel, 'العربية');

  const checkObj = (val: unknown, path: string) => {
    if (path === 'UI_TEXT.en.langSwitch.buttonLabel') return;
    if (typeof val === 'string') {
      assertNoArabic(val, path);
    } else if (typeof val === 'function') {
      const sample =
        val.length === 1
          ? val('x')
          : val('A', 0, 0);
      assertNoArabic(String(sample), `${path}()`);
    } else if (val && typeof val === 'object') {
      for (const [k, v] of Object.entries(val)) {
        checkObj(v, `${path}.${k}`);
      }
    }
  };

  checkObj(UI_TEXT.en, 'UI_TEXT.en');
  checkObj(KEYPAD_ARIA_EN, 'KEYPAD_ARIA_EN');
  checkObj(KEYPAD_VARIANT_SUB_EN, 'KEYPAD_VARIANT_SUB_EN');

  for (const f of [null, 'expr', 'lower', 'upper', 'limitTarget', 'evalPointX', 'derivEvalAt', 'mat:A:0:1']) {
    assertNoArabic(getFieldLabel(f, 'en'), `getFieldLabel(${String(f)})`);
  }
});

test('All CALC_PRESETS localize completely into English', () => {
  for (const preset of CALC_PRESETS) {
    if (preset.mode === 'integral') {
      const res = solveIntegral({
        expression: preset.expression,
        isDefinite: Boolean(preset.isDefinite),
        lowerBound: preset.lowerBound,
        upperBound: preset.upperBound,
      });
      assert.equal(res.ok, true, `Preset ${preset.id} failed`);
      assertNoArabic(localizeMethodLabel(res.methodLabel, 'en'), `${preset.id}.methodLabel`);
      assertNoArabic(localizeLatex(res.antiderivativeLatex ?? '', 'en'), `${preset.id}.antiderivLatex`);
      assertNoArabic(localizeLatex(res.definiteExactLatex ?? '', 'en'), `${preset.id}.defExactLatex`);
      res.warnings.forEach((w, idx) =>
        assertNoArabic(localizeMessage(w, 'en'), `${preset.id}.warning[${idx}]`)
      );
      assertStepsLocalized(res.steps, preset.id);
    } else if (preset.mode === 'limit') {
      const res = solveLimit({
        expression: preset.expression,
        target: preset.limitTarget ?? '0',
        direction: preset.limitDirection ?? 'two-sided',
      });
      assert.equal(res.ok, true, `Preset ${preset.id} failed`);
      assertNoArabic(localizeMethodLabel(res.methodLabel, 'en'), `${preset.id}.methodLabel`);
      assertNoArabic(localizeLatex(res.valueLatex, 'en'), `${preset.id}.valueLatex`);
      assertNoArabic(localizeLatex(res.leftLimitLatex ?? '', 'en'), `${preset.id}.leftLimitLatex`);
      assertNoArabic(localizeLatex(res.rightLimitLatex ?? '', 'en'), `${preset.id}.rightLimitLatex`);
      res.warnings.forEach((w, idx) =>
        assertNoArabic(localizeMessage(w, 'en'), `${preset.id}.warning[${idx}]`)
      );
      assertStepsLocalized(res.steps, preset.id);
    } else {
      const res = solveDerivativeOrCalc({ expression: preset.expression });
      assert.equal(res.ok, true, `Preset ${preset.id} failed`);
      assertNoArabic(localizeMethodLabel(res.methodLabel, 'en'), `${preset.id}.methodLabel`);
      assertNoArabic(localizeLatex(res.derivativeLatex, 'en'), `${preset.id}.derivativeLatex`);
      assertStepsLocalized(res.steps, preset.id);
    }
  }
});

test('Diverse integrals (trig-sub, tabular IBP, non-elementary, numerical, improper) localize without Arabic', () => {
  const cases = [
    { expression: 'sqrt(9 - x^2)', isDefinite: false },
    { expression: '1 / (x^2 + 4)^2', isDefinite: false },
    { expression: 'sqrt(x^2 - 4)', isDefinite: false },
    { expression: 'x^3 * e^x', isDefinite: false },
    { expression: 'e^x * sin(x)', isDefinite: false },
    { expression: 'sin(x)/x', isDefinite: false },
    { expression: 'cos(x)/x', isDefinite: false },
    { expression: 'e^x/x', isDefinite: false },
    { expression: '1/ln(x)', isDefinite: false },
    { expression: 'sin(x^2)', isDefinite: false },
    { expression: 'cos(x^2)', isDefinite: false },
    { expression: 'sin(x^3)', isDefinite: true, lowerBound: '0', upperBound: '1' },
    { expression: 'e^(-x)', isDefinite: true, lowerBound: '0', upperBound: '+oo' },
    { expression: '1/x', isDefinite: true, lowerBound: '-1', upperBound: '1' },
    { expression: '1/(x-1)', isDefinite: false },
    { expression: 'tan(x)^3', isDefinite: false },
    { expression: 'sec(x)^3', isDefinite: false },
    { expression: 'sinh(x)^2', isDefinite: false },
    { expression: 'sin(2x) * cos(3x)', isDefinite: false },
  ];

  for (const c of cases) {
    const res = solveIntegral(c);
    assertNoArabic(localizeMethodLabel(res.methodLabel, 'en'), `int(${c.expression}).method`);
    assertNoArabic(localizeMessage(res.error ?? '', 'en'), `int(${c.expression}).error`);
    assertNoArabic(localizeLatex(res.antiderivativeLatex ?? '', 'en'), `int(${c.expression}).anti`);
    assertNoArabic(localizeLatex(res.definiteExactLatex ?? '', 'en'), `int(${c.expression}).def`);
    res.warnings.forEach((w, idx) =>
      assertNoArabic(localizeMessage(w, 'en'), `int(${c.expression}).warn[${idx}]`)
    );
    assertStepsLocalized(res.steps, `int(${c.expression})`);
  }
});

test('Limits, derivatives, evaluation, and series localize completely without Arabic', () => {
  const limitCases = [
    { expression: '5', target: '2', direction: 'two-sided' as const },
    { expression: 'sin(x)', target: '+oo', direction: 'two-sided' as const },
    { expression: 'sqrt(x^2 + x) - x', target: '+oo', direction: 'two-sided' as const },
    { expression: '(e^x - 1)/x', target: '0', direction: 'two-sided' as const },
    { expression: '(x - sin(x))/x^3', target: '0', direction: 'two-sided' as const },
    { expression: '1/x', target: '0', direction: 'right' as const },
    { expression: '1/x', target: '0', direction: 'left' as const },
    { expression: 'x^x', target: '0', direction: 'right' as const },
    { expression: '1/x^2', target: '0', direction: 'two-sided' as const },
    { expression: 'sqrt(x)', target: '0', direction: 'left' as const },
    { expression: 'sin(1/x)', target: '0', direction: 'right' as const },
  ];
  for (const lc of limitCases) {
    const res = solveLimit(lc);
    assertNoArabic(localizeMethodLabel(res.methodLabel, 'en'), `lim(${lc.expression}).method`);
    assertNoArabic(localizeMessage(res.error ?? '', 'en'), `lim(${lc.expression}).error`);
    assertNoArabic(localizeLatex(res.valueLatex, 'en'), `lim(${lc.expression}).val`);
    assertNoArabic(localizeLatex(res.leftLimitLatex ?? '', 'en'), `lim(${lc.expression}).left`);
    assertNoArabic(localizeLatex(res.rightLimitLatex ?? '', 'en'), `lim(${lc.expression}).right`);
    assertStepsLocalized(res.steps, `lim(${lc.expression})`);
  }

  const derivCases = [
    { expression: 'sin(30)', evaluateOnly: true, angleUnit: 'deg' as const },
    { expression: 'x^3 + 2*x', evalAt: '2' },
    { expression: 'x^x', variable: 'x' },
    { expression: 'sin(x)/x', evalAt: '0' },
    { expression: 'ln(x)', angleUnit: 'deg' as const },
  ];
  for (const dc of derivCases) {
    const res = solveDerivativeOrCalc(dc);
    assertNoArabic(localizeMethodLabel(res.methodLabel, 'en'), `deriv(${dc.expression}).method`);
    assertNoArabic(localizeMessage(res.error ?? '', 'en'), `deriv(${dc.expression}).error`);
    assertNoArabic(localizeLatex(res.derivativeLatex, 'en'), `deriv(${dc.expression}).latex`);
    res.warnings.forEach((w, idx) =>
      assertNoArabic(localizeMessage(w, 'en'), `deriv(${dc.expression}).warn[${idx}]`)
    );
    assertStepsLocalized(res.steps, `deriv(${dc.expression})`);
  }

  const seriesCases = [
    { kind: 'sum' as const, expression: 'k^2', lowerBound: '1', upperBound: '5' },
    { kind: 'prod' as const, expression: 'k', lowerBound: '1', upperBound: '4' },
    { kind: 'sum' as const, expression: '1 / 2^k', lowerBound: '1', upperBound: '+oo' },
    { kind: 'sum' as const, expression: 'k', lowerBound: '5', upperBound: '2' },
    { kind: 'sum' as const, expression: '1/k', lowerBound: '1', upperBound: '+oo' },
    { kind: 'sum' as const, expression: '1/(k-2)', lowerBound: '1', upperBound: '3' },
  ];
  for (const sc of seriesCases) {
    const res = solveSeries(sc);
    assertNoArabic(localizeMethodLabel(res.methodLabel, 'en'), `series(${sc.expression}).method`);
    assertNoArabic(localizeMessage(res.error ?? '', 'en'), `series(${sc.expression}).error`);
    assertNoArabic(localizeLatex(res.valueLatex, 'en'), `series(${sc.expression}).val`);
    res.warnings.forEach((w, idx) =>
      assertNoArabic(localizeMessage(w, 'en'), `series(${sc.expression}).warn[${idx}]`)
    );
    assertStepsLocalized(res.steps, `series(${sc.expression})`);
  }
});

test('Matrix operations and errors localize completely without Arabic', () => {
  const matA2 = [
    ['2', '1'],
    ['1', '3'],
  ];
  const matB2 = [
    ['1', '4'],
    ['2', '0'],
  ];
  const matSingular = [
    ['1', '2'],
    ['2', '4'],
  ];
  const mat3 = [
    ['1', '2', '0'],
    ['0', '1', '1'],
    ['1', '0', '1'],
  ];

  const ops: MatrixOp[] = [
    'det',
    'inv',
    'transpose',
    'trace',
    'rank',
    'rref',
    'eigen',
    'add',
    'sub',
    'mul',
    'solve_ax_b',
  ];

  for (const op of ops) {
    const res = solveMatrix({ op, matrixA: matA2, matrixB: matB2 });
    assert.equal(res.ok, true, `Matrix op ${op} failed`);
    assertNoArabic(localizeMethodLabel(res.methodLabel, 'en'), `mat.${op}.method`);
    assertNoArabic(localizeLatex(res.resultLatex, 'en'), `mat.${op}.result`);
    assertStepsLocalized(res.steps, `mat.${op}`);
  }

  // Also check 3x3 Gaussian det + error cases
  const det3 = solveMatrix({ op: 'det', matrixA: mat3 });
  assertStepsLocalized(det3.steps, 'mat.det3');

  const singularInv = solveMatrix({ op: 'inv', matrixA: matSingular });
  assert.equal(singularInv.ok, false);
  assertNoArabic(localizeMessage(singularInv.error ?? '', 'en'), 'mat.singularInv.error');

  const singularSolve = solveMatrix({ op: 'solve_ax_b', matrixA: matSingular, matrixB: [['1'], ['2']] });
  assert.equal(singularSolve.ok, false);
  assertNoArabic(localizeMessage(singularSolve.error ?? '', 'en'), 'mat.singularSolve.error');

  const dimErr = solveMatrix({ op: 'add', matrixA: matA2, matrixB: [['1']] });
  assert.equal(dimErr.ok, false);
  assertNoArabic(localizeMessage(dimErr.error ?? '', 'en'), 'mat.dimErr.error');
});

test('parseExpr errors localize completely without Arabic', () => {
  const badInputs = ['', '|x|', '(x+1))', '(x+1', 'log(2,3,4)', 'x + @', 'sin()', 'gcd(4)', 'x +'];
  for (const raw of badInputs) {
    assert.throws(() => parseExpr(raw), (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      const loc = localizeMessage(msg, 'en');
      assertNoArabic(loc, `parseExpr(${raw})`);
      return true;
    });
  }
});
