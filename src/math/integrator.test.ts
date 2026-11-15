import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, parseExpr } from './ast';
import { solveIntegral } from './integrator';

function assertClose(actual: number, expected: number, tol = 1e-4, msg = '') {
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `${msg} Expected ${expected}, got ${actual} (diff=${Math.abs(actual - expected)})`
  );
}

test('Basic power rule and linearity', () => {
  const res = solveIntegral({ expression: '3x^2 - 4x + 5', isDefinite: false });
  assert.equal(res.ok, true);
  assert.ok(res.antiderivative);
  assert.ok(res.steps.length >= 2);
  // Antiderivative at x=2 minus at x=0 should equal [x^3 - 2x^2 + 5x]_0^2 = 8 - 8 + 10 = 10
  const val2 = evaluate(res.antiderivative!, { x: 2 });
  const val0 = evaluate(res.antiderivative!, { x: 0 });
  assertClose(val2 - val0, 10, 1e-6);
});

test('Polynomial expansion (x+1)(x-2)', () => {
  const res = solveIntegral({ expression: '(x+1)(x-2)', isDefinite: true, lowerBound: '0', upperBound: '3' });
  assert.equal(res.ok, true);
  assertClose(res.definiteNumericValue!, 3 * 3 * 3 / 3 - 3 * 3 / 2 - 2 * 3, 1e-5); // 9 - 4.5 - 6 = -1.5
});

test('U-Substitution: x * e^(x^2)', () => {
  const res = solveIntegral({ expression: 'x * e^(x^2)', isDefinite: false, method: 'substitution' });
  assert.equal(res.ok, true);
  assert.equal(res.methodUsed, 'substitution');
  assert.ok(res.antiderivative);
  const diff = evaluate(res.antiderivative!, { x: 1 }) - evaluate(res.antiderivative!, { x: 0 });
  assertClose(diff, 0.5 * (Math.E - 1), 1e-5);
});

test('U-Substitution: sin(2x + 1)', () => {
  const res = solveIntegral({ expression: 'sin(2x + 1)', isDefinite: false });
  assert.equal(res.ok, true);
  assert.ok(res.antiderivative);
  const diff = evaluate(res.antiderivative!, { x: 1 }) - evaluate(res.antiderivative!, { x: 0 });
  assertClose(diff, 0.5 * (Math.cos(1) - Math.cos(3)), 1e-5);
});

test('Integration by Parts: x * sin(x)', () => {
  const res = solveIntegral({ expression: 'x * sin(x)', isDefinite: true, lowerBound: '0', upperBound: 'pi' });
  assert.equal(res.ok, true);
  assert.equal(res.methodUsed, 'parts');
  assertClose(res.definiteNumericValue!, Math.PI, 1e-5);
});

test('Integration by Parts (Tabular): x^2 * e^x', () => {
  const res = solveIntegral({ expression: 'x^2 * e^x', isDefinite: false, method: 'parts' });
  assert.equal(res.ok, true);
  assert.equal(res.methodUsed, 'parts');
  const diff = evaluate(res.antiderivative!, { x: 1 }) - evaluate(res.antiderivative!, { x: 0 });
  assertClose(diff, Math.E - 2, 1e-5);
});

test('Integration by Parts (Cyclic): e^x * sin(x)', () => {
  const res = solveIntegral({ expression: 'e^x * sin(x)', isDefinite: false, method: 'parts' });
  assert.equal(res.ok, true);
  const diff = evaluate(res.antiderivative!, { x: Math.PI }) - evaluate(res.antiderivative!, { x: 0 });
  assertClose(diff, 0.5 * (Math.exp(Math.PI) + 1), 1e-5);
});

test('Integration by Parts (Single Log/Inverse Trig): ln(x) and arctan(x)', () => {
  const rLn = solveIntegral({ expression: 'ln(x)', isDefinite: true, lowerBound: '1', upperBound: 'e' });
  assert.equal(rLn.ok, true);
  assertClose(rLn.definiteNumericValue!, 1, 1e-5);

  const rAtan = solveIntegral({ expression: 'arctan(x)', isDefinite: true, lowerBound: '0', upperBound: '1' });
  assert.equal(rAtan.ok, true);
  assertClose(rAtan.definiteNumericValue!, Math.PI / 4 - 0.5 * Math.log(2), 1e-5);
});

test('Trigonometric Integrals: sin^2(x), cos^3(x), sin(3x)*cos(2x)', () => {
  const r1 = solveIntegral({ expression: 'sin^2(x)', isDefinite: true, lowerBound: '0', upperBound: 'pi' });
  assert.equal(r1.ok, true);
  assert.equal(r1.methodUsed, 'trig');
  assertClose(r1.definiteNumericValue!, Math.PI / 2, 1e-5);

  const r2 = solveIntegral({ expression: 'cos^3(x)', isDefinite: true, lowerBound: '0', upperBound: 'pi/2' });
  assert.equal(r2.ok, true);
  assert.equal(r2.methodUsed, 'trig');
  assertClose(r2.definiteNumericValue!, 2 / 3, 1e-5);

  const r3 = solveIntegral({ expression: 'sin(3x)*cos(2x)', isDefinite: true, lowerBound: '0', upperBound: 'pi' });
  assert.equal(r3.ok, true);
  assertClose(r3.definiteNumericValue!, 6 / 5, 1e-5);
});

test('Trig Substitution & Completing the Square: sqrt(4 - x^2) and 1/(x^2 + 4x + 8)', () => {
  const r1 = solveIntegral({
    expression: 'sqrt(4 - x^2)',
    isDefinite: true,
    lowerBound: '0',
    upperBound: '2',
    method: 'trig_sub',
  });
  assert.equal(r1.ok, true);
  assertClose(r1.definiteNumericValue!, Math.PI, 1e-5);

  const r2 = solveIntegral({
    expression: '1 / (x^2 + 4x + 8)',
    isDefinite: true,
    lowerBound: '-2',
    upperBound: '0',
  });
  assert.equal(r2.ok, true);
  assertClose(r2.definiteNumericValue!, Math.PI / 8, 1e-5);
});

test('Partial Fractions: distinct linear, repeated linear, improper degree, and irreducible quad', () => {
  const r1 = solveIntegral({ expression: '1 / (x^2 - 1)', isDefinite: true, lowerBound: '2', upperBound: '3' });
  assert.equal(r1.ok, true);
  assert.equal(r1.methodUsed, 'partial_fractions');
  assertClose(r1.definiteNumericValue!, 0.5 * Math.log(3 / 2), 1e-5);

  const r2 = solveIntegral({ expression: '1 / (x * (x + 1)^2)', isDefinite: true, lowerBound: '1', upperBound: '2' });
  assert.equal(r2.ok, true);
  assert.equal(r2.methodUsed, 'partial_fractions');
  assertClose(r2.definiteNumericValue!, Math.log(4 / 3) - 1 / 6, 1e-5);

  const r3 = solveIntegral({ expression: 'x^3 / (x^2 + 1)', isDefinite: true, lowerBound: '0', upperBound: '1' });
  assert.equal(r3.ok, true);
  assertClose(r3.definiteNumericValue!, 0.5 - 0.5 * Math.log(2), 1e-5);

  const r4 = solveIntegral({ expression: '1 / (x^3 + x)', isDefinite: true, lowerBound: '1', upperBound: '2' });
  assert.equal(r4.ok, true);
  assertClose(r4.definiteNumericValue!, 0.5 * Math.log(8 / 5), 1e-5);
});

test('Improper & Numerical Integrals: e^(-x) on [0, inf) and e^(-x^2) on [0, 1]', () => {
  const rImp = solveIntegral({ expression: 'e^(-x)', isDefinite: true, lowerBound: '0', upperBound: 'oo' });
  assert.equal(rImp.ok, true);
  assertClose(rImp.definiteNumericValue!, 1, 1e-4);

  const rNum = solveIntegral({ expression: 'e^(-x^2)', isDefinite: true, lowerBound: '0', upperBound: '1' });
  assert.equal(rNum.ok, true);
  assert.equal(rNum.methodUsed, 'numerical');
  assertClose(rNum.definiteNumericValue!, 0.74682413, 1e-5);

  const rSimp = solveIntegral({
    expression: 'sin(x)/x',
    isDefinite: true,
    lowerBound: '0.0001',
    upperBound: 'pi',
    method: 'numerical',
  });
  assert.equal(rSimp.ok, true);
  assert.ok(rSimp.simpsonData);
  assertClose(rSimp.definiteNumericValue!, 1.851837, 1e-3);
});

test('Syntax error handling and non-elementary indefinite (Special Functions + Taylor)', () => {
  const bad = solveIntegral({ expression: 'sin(x', isDefinite: false });
  assert.equal(bad.ok, false);
  assert.ok(bad.error && bad.error.length > 0);

  const nonElem = solveIntegral({ expression: 'e^(-x^2)', isDefinite: false });
  assert.equal(nonElem.ok, true);
  assert.equal(nonElem.nonElementary, true);
  assert.ok(nonElem.specialFunctionLatex?.includes('erf'));
  assert.ok(nonElem.taylorSeries);
  assert.ok(nonElem.steps.length >= 2);
});

test('Expanded symbolic: quotient IBP, sqrt u-sub, trig/exp/abs/reciprocal forms', () => {
  // ln(x)/x^2 -> -ln(x)/x - 1/x
  const r1 = solveIntegral({ expression: 'ln(x)/x^2', isDefinite: false });
  assert.equal(r1.ok, true);
  assert.ok(r1.antiderivative);
  assertClose(evaluate(r1.antiderivative!, { x: 2 }) - evaluate(r1.antiderivative!, { x: 1 }), -Math.LN2 / 2 + 0.5, 1e-4);

  // sqrt(x) * ln(x)
  const r2 = solveIntegral({ expression: 'sqrt(x) * ln(x)', isDefinite: false });
  assert.equal(r2.ok, true);
  assert.ok(r2.antiderivative);

  // x / e^x
  const r3 = solveIntegral({ expression: 'x / e^x', isDefinite: false });
  assert.equal(r3.ok, true);
  assert.ok(r3.antiderivative);
  assertClose(evaluate(r3.antiderivative!, { x: 1 }) - evaluate(r3.antiderivative!, { x: 0 }), 1 - 2 / Math.E, 1e-4);

  // x / cos(x)^2
  const r4 = solveIntegral({ expression: 'x / cos(x)^2', isDefinite: false });
  assert.equal(r4.ok, true);
  assert.ok(r4.antiderivative);

  // sin(ln(x))
  const r5 = solveIntegral({ expression: 'sin(ln(x))', isDefinite: false });
  assert.equal(r5.ok, true);
  assert.ok(r5.antiderivative);

  // e^(sqrt(x))
  const r6 = solveIntegral({ expression: 'e^(sqrt(x))', isDefinite: false });
  assert.equal(r6.ok, true);
  assert.ok(r6.antiderivative);
  assertClose(evaluate(r6.antiderivative!, { x: 1 }) - evaluate(r6.antiderivative!, { x: 0 }), 2, 1e-4);

  // ln(x)/x
  const r7 = solveIntegral({ expression: 'ln(x)/x', isDefinite: false });
  assert.equal(r7.ok, true);
  assert.ok(r7.antiderivative);

  // cot^2(x), sec^4(x)
  const r8 = solveIntegral({ expression: 'cot^2(x)', isDefinite: false });
  assert.equal(r8.ok, true);
  assert.ok(r8.antiderivative);

  const r9 = solveIntegral({ expression: 'sec^4(x)', isDefinite: false });
  assert.equal(r9.ok, true);
  assert.ok(r9.antiderivative);

  // 1/(1 + cos(x)), 1/(1 + e^x), abs(x), 1/(x*sqrt(x^2-4))
  const r10 = solveIntegral({ expression: '1 / (1 + cos(x))', isDefinite: false });
  assert.equal(r10.ok, true);
  assert.ok(r10.antiderivative);

  const r11 = solveIntegral({ expression: '1 / (1 + e^x)', isDefinite: false });
  assert.equal(r11.ok, true);
  assert.ok(r11.antiderivative);

  const r12 = solveIntegral({ expression: 'abs(x)', isDefinite: false });
  assert.equal(r12.ok, true);
  assert.ok(r12.antiderivative);

  const r13 = solveIntegral({ expression: '1 / (x * sqrt(x^2 - 4))', isDefinite: false });
  assert.equal(r13.ok, true);
  assert.ok(r13.antiderivative);

  // Textbook paste normalization
  const r14 = solveIntegral({ expression: '∫ (2x + 1) dx', isDefinite: false });
  assert.equal(r14.ok, true);
  assert.ok(r14.antiderivative);
  assertClose(evaluate(r14.antiderivative!, { x: 2 }) - evaluate(r14.antiderivative!, { x: 0 }), 6, 1e-6);
});

test('Non-elementary indefinite integrals solved via Special Functions and Taylor Series', () => {
  for (const expr of ['sin(x)/x', 'sin(x^2)', 'sqrt(1 + x^4)', 'x^x']) {
    const res = solveIntegral({ expression: expr, isDefinite: false });
    assert.equal(res.ok, true, `Expected ok=true for ${expr}`);
    assert.equal(res.nonElementary, true, `Expected nonElementary=true for ${expr}`);
    assert.ok(res.taylorSeries, `Expected taylorSeries for ${expr}`);
    assert.ok(res.steps.length >= 2, `Expected steps for ${expr}`);
  }
});

test('Newly added functions: floor, ceil, round, sgn, cbrt, log2, fact, inverse hyperbolic', () => {
  assert.equal(evaluate(parseExpr('floor(3.7)'), {}), 3);
  assert.equal(evaluate(parseExpr('floor(-1.2)'), {}), -2);
  assert.equal(evaluate(parseExpr('ceil(3.2)'), {}), 4);
  assert.equal(evaluate(parseExpr('ceil(-1.8)'), {}), -1);
  assert.equal(evaluate(parseExpr('round(2.6)'), {}), 3);
  assert.equal(evaluate(parseExpr('sgn(-5)'), {}), -1);
  assert.equal(evaluate(parseExpr('sgn(0)'), {}), 0);
  assert.equal(evaluate(parseExpr('sgn(9)'), {}), 1);
  assert.equal(evaluate(parseExpr('cbrt(-8)'), {}), -2);
  assert.equal(evaluate(parseExpr('log2(8)'), {}), 3);
  assert.equal(evaluate(parseExpr('fact(5)'), {}), 120);
  assertClose(evaluate(parseExpr('fact(0.5)'), {}), Math.sqrt(Math.PI) / 2, 1e-6);

  const iCbrt = solveIntegral({ expression: 'cbrt(x)', isDefinite: true, lowerBound: '0', upperBound: '8' });
  assert.equal(iCbrt.ok, true);
  assertClose(iCbrt.definiteNumericValue!, 12, 1e-4); // (3/4)*(8^(4/3)) = 0.75*16 = 12

  const iLog2 = solveIntegral({ expression: 'log2(x)', isDefinite: true, lowerBound: '1', upperBound: '2' });
  assert.equal(iLog2.ok, true);
  assertClose(iLog2.definiteNumericValue!, 2 - 1 / Math.LN2, 1e-4);

  const iAsinh = solveIntegral({ expression: 'asinh(x)', isDefinite: false });
  assert.equal(iAsinh.ok, true);
  assert.ok(iAsinh.antiderivative);
  assertClose(
    evaluate(iAsinh.antiderivative!, { x: 1 }) - evaluate(iAsinh.antiderivative!, { x: 0 }),
    Math.asinh(1) - Math.sqrt(2) + 1,
    1e-4
  );

  const iAtanh = solveIntegral({ expression: 'atanh(x)', isDefinite: false });
  assert.equal(iAtanh.ok, true);
  assert.ok(iAtanh.antiderivative);
  assertClose(
    evaluate(iAtanh.antiderivative!, { x: 0.5 }) - evaluate(iAtanh.antiderivative!, { x: 0 }),
    0.5 * Math.atanh(0.5) + 0.5 * Math.log(1 - 0.25),
    1e-4
  );

  const iAcosh = solveIntegral({ expression: 'acosh(x)', isDefinite: false });
  assert.equal(iAcosh.ok, true);
  assert.ok(iAcosh.antiderivative);
  assertClose(
    evaluate(iAcosh.antiderivative!, { x: 2 }) - evaluate(iAcosh.antiderivative!, { x: 1 }),
    2 * Math.acosh(2) - Math.sqrt(3),
    1e-4
  );
});

