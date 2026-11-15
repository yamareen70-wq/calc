import test from 'node:test';
import assert from 'node:assert/strict';
import { solveDerivativeOrCalc } from './derivatives';
import { solveLimit } from './limits';

function assertClose(actual: number | undefined, expected: number, tol = 1e-3, msg = '') {
  assert.ok(actual !== undefined && Number.isFinite(actual), `${msg} Expected finite value, got ${actual}`);
  assert.ok(
    Math.abs(actual! - expected) <= tol,
    `${msg} Expected ${expected}, got ${actual} (diff=${Math.abs(actual! - expected)})`
  );
}

test('Limit: Direct substitution', () => {
  const res = solveLimit({ expression: 'x^2 + 3x - 1', target: '2' });
  assert.equal(res.ok, true);
  assert.equal(res.exists, true);
  assertClose(res.value, 9, 1e-6);
  assert.ok(res.steps.length >= 1);
});

test('Limit: 0/0 Rational factoring and cancellation', () => {
  const res = solveLimit({ expression: '(x^2 - 9) / (x - 3)', target: '3' });
  assert.equal(res.ok, true);
  assert.equal(res.exists, true);
  assertClose(res.value, 6, 1e-5);
  assert.ok(res.steps.some((s) => s.rule.includes('Factoring')));
});

test('Limit: 0/0 Radical conjugate rationalization', () => {
  const res = solveLimit({ expression: '(sqrt(x + 4) - 2) / x', target: '0' });
  assert.equal(res.ok, true);
  assert.equal(res.exists, true);
  assertClose(res.value, 0.25, 1e-5);
  assert.ok(res.steps.some((s) => s.rule.includes('Conjugate')));
});

test('Limit: Trigonometric 0/0 via LHopital / Taylor', () => {
  const r1 = solveLimit({ expression: 'sin(3x) / x', target: '0' });
  assert.equal(r1.ok, true);
  assert.equal(r1.exists, true);
  assertClose(r1.value, 3, 1e-4);

  const r2 = solveLimit({ expression: '(1 - cos(x)) / x^2', target: '0' });
  assert.equal(r2.ok, true);
  assert.equal(r2.exists, true);
  assertClose(r2.value, 0.5, 1e-4);

  const r3 = solveLimit({ expression: '(sin(x) - x) / x^3', target: '0' });
  assert.equal(r3.ok, true);
  assert.equal(r3.exists, true);
  assertClose(r3.value, -1 / 6, 1e-4);
});

test('Limit: Exponential 0/0 and Euler 1^oo at infinity', () => {
  const r1 = solveLimit({ expression: '(e^(2x) - 1) / x', target: '0' });
  assert.equal(r1.ok, true);
  assert.equal(r1.exists, true);
  assertClose(r1.value, 2, 1e-4);

  const r2 = solveLimit({ expression: '(1 + 2/x)^x', target: 'oo' });
  assert.equal(r2.ok, true);
  assert.equal(r2.exists, true);
  assertClose(r2.value, Math.exp(2), 1e-2);
});

test('Limit: Rational & radical difference at infinity', () => {
  const r1 = solveLimit({ expression: '(3x^2 + 5x - 1) / (2x^2 - x + 7)', target: 'oo' });
  assert.equal(r1.ok, true);
  assert.equal(r1.exists, true);
  assertClose(r1.value, 1.5, 1e-6);

  const r2 = solveLimit({ expression: 'sqrt(x^2 + 4x) - x', target: 'oo' });
  assert.equal(r2.ok, true);
  assert.equal(r2.exists, true);
  assertClose(r2.value, 2, 1e-2);
});

test('Limit: One-sided, jump discontinuity DNE, vertical asymptote, and oscillation', () => {
  const rJump = solveLimit({ expression: 'abs(x) / x', target: '0', direction: 'two-sided' });
  assert.equal(rJump.ok, true);
  assert.equal(rJump.exists, false);
  assert.equal(rJump.rightLimitLatex, '1');
  assert.equal(rJump.leftLimitLatex, '-1');

  const rRight = solveLimit({ expression: 'abs(x) / x', target: '0', direction: 'right' });
  assert.equal(rRight.ok, true);
  assert.equal(rRight.exists, true);
  assertClose(rRight.value, 1, 1e-5);

  const rVert = solveLimit({ expression: '1 / x^2', target: '0', direction: 'two-sided' });
  assert.equal(rVert.ok, true);
  assert.equal(rVert.isInfinite, true);
  assert.equal(rVert.infinitySign, '+inf');

  const rOsc = solveLimit({ expression: 'sin(1/x)', target: '0', direction: 'two-sided' });
  assert.equal(rOsc.ok, true);
  assert.equal(rOsc.exists, false);
});

test('Derivative & pure arithmetic evaluation', () => {
  const d1 = solveDerivativeOrCalc({ expression: 'x^3 + sin(2x)', evalAt: '0', evaluateOnly: false });
  assert.equal(d1.ok, true);
  assert.equal(d1.isPureNumeric, false);
  assertClose(d1.evalSlope, 2, 1e-6);

  const dConst = solveDerivativeOrCalc({ expression: '5', evaluateOnly: false });
  assert.equal(dConst.ok, true);
  assert.equal(dConst.isPureNumeric, false);
  assert.equal(dConst.derivativeLatex, '0');

  const c1 = solveDerivativeOrCalc({ expression: '2 + 3 * 4', evaluateOnly: true });
  assert.equal(c1.ok, true);
  assert.equal(c1.isPureNumeric, true);
  assertClose(c1.numericValue, 14, 1e-6);

  const c2 = solveDerivativeOrCalc({ expression: 'x^2 + 1', evalAt: '3', evaluateOnly: true });
  assert.equal(c2.ok, true);
  assert.equal(c2.isEvaluationOnly, true);
  assertClose(c2.evalSlope, 10, 1e-6);
});

test('Limits & derivatives for floor, ceil, cbrt, log2, asinh, acosh, atanh, fact', () => {
  const fLeft = solveLimit({ expression: 'floor(x)', target: '2', direction: 'left' });
  assert.equal(fLeft.ok, true);
  assert.equal(fLeft.exists, true);
  assertClose(fLeft.value, 1, 1e-6);

  const fRight = solveLimit({ expression: 'floor(x)', target: '2', direction: 'right' });
  assert.equal(fRight.ok, true);
  assert.equal(fRight.exists, true);
  assertClose(fRight.value, 2, 1e-6);

  const fTwo = solveLimit({ expression: 'floor(x)', target: '2', direction: 'two-sided' });
  assert.equal(fTwo.ok, true);
  assert.equal(fTwo.exists, false);

  const cLeft = solveLimit({ expression: 'ceil(x)', target: '2', direction: 'left' });
  assert.equal(cLeft.ok, true);
  assert.equal(cLeft.exists, true);
  assertClose(cLeft.value, 2, 1e-6);

  const cRight = solveLimit({ expression: 'ceil(x)', target: '2', direction: 'right' });
  assert.equal(cRight.ok, true);
  assert.equal(cRight.exists, true);
  assertClose(cRight.value, 3, 1e-6);

  const dAsinh = solveDerivativeOrCalc({ expression: 'asinh(x)', evalAt: '0', evaluateOnly: false });
  assert.equal(dAsinh.ok, true);
  assertClose(dAsinh.evalSlope, 1, 1e-6);

  const dLog2 = solveDerivativeOrCalc({ expression: 'log2(x)', evalAt: '2', evaluateOnly: false });
  assert.equal(dLog2.ok, true);
  assertClose(dLog2.evalSlope, 1 / (2 * Math.LN2), 1e-6);

  const dCbrt = solveDerivativeOrCalc({ expression: 'cbrt(x)', evalAt: '8', evaluateOnly: false });
  assert.equal(dCbrt.ok, true);
  assertClose(dCbrt.evalSlope, 1 / 12, 1e-6);

  const evalFloor = solveDerivativeOrCalc({ expression: 'floor(3.7) + ceil(3.2) + fact(5)', evaluateOnly: true });
  assert.equal(evalFloor.ok, true);
  assertClose(evalFloor.numericValue, 127, 1e-6);
});

