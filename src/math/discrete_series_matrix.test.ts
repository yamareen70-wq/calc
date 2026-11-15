import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluate, parseExpr } from './ast';
import { solveDerivativeOrCalc } from './derivatives';
import { solveMatrix } from './matrix';
import { solveSeries } from './summation';

test('gcd, lcm, mod, min, max, and logb evaluation', () => {
  assert.equal(evaluate(parseExpr('gcd(24, 36)')), 12);
  assert.equal(evaluate(parseExpr('gcd(18, 24, 30)')), 6);
  assert.equal(evaluate(parseExpr('lcm(12, 18)')), 36);
  assert.equal(evaluate(parseExpr('lcm(4, 6, 8)')), 24);
  assert.equal(evaluate(parseExpr('mod(17, 5)')), 2);
  assert.equal(evaluate(parseExpr('mod(-1, 5)')), 4);
  assert.equal(evaluate(parseExpr('min(4, -1, 9)')), -1);
  assert.equal(evaluate(parseExpr('max(4, -1, 9)')), 9);
  assert.ok(Math.abs(evaluate(parseExpr('log(2, 8)')) - 3) < 1e-12);
});

test('combinatorics nCr, nPr, and postfix factorial !', () => {
  assert.equal(evaluate(parseExpr('nCr(5, 2)')), 10);
  assert.equal(evaluate(parseExpr('nCr(10, 0)')), 1);
  assert.equal(evaluate(parseExpr('nPr(5, 2)')), 20);
  assert.equal(evaluate(parseExpr('5!')), 120);
  assert.equal(evaluate(parseExpr('(2+3)!')), 120);
  assert.equal(evaluate(parseExpr('0!')), 1);
  assert.equal(
    evaluate(parseExpr('gcd(24, 36) + lcm(4, 6) + nCr(5, 2) + 5!')),
    12 + 12 + 10 + 120
  );
});

test('DEG vs RAD angle unit evaluation and calculator mode', () => {
  assert.ok(Math.abs(evaluate(parseExpr('sin(30)'), {}, { angleUnit: 'deg' }) - 0.5) < 1e-12);
  assert.ok(Math.abs(evaluate(parseExpr('cos(60)'), {}, { angleUnit: 'deg' }) - 0.5) < 1e-12);
  assert.ok(Math.abs(evaluate(parseExpr('tan(45)'), {}, { angleUnit: 'deg' }) - 1) < 1e-12);
  assert.ok(Math.abs(evaluate(parseExpr('asin(0.5)'), {}, { angleUnit: 'deg' }) - 30) < 1e-12);
  assert.ok(Math.abs(evaluate(parseExpr('sin(pi/6)'), {}, { angleUnit: 'rad' }) - 0.5) < 1e-12);

  const degCalc = solveDerivativeOrCalc({
    expression: 'sin(30)',
    variable: 'x',
    evaluateOnly: true,
    angleUnit: 'deg',
  });
  assert.equal(degCalc.ok, true);
  assert.ok(Math.abs((degCalc.numericValue ?? 0) - 0.5) < 1e-12);
});

test('summation Σ and product Π finite, empty, and infinite series', () => {
  const sumRes = solveSeries({
    kind: 'sum',
    expression: 'k',
    variable: 'k',
    lowerBound: '1',
    upperBound: '10',
  });
  assert.equal(sumRes.ok, true);
  assert.equal(sumRes.value, 55);

  const sqSum = solveSeries({
    kind: 'sum',
    expression: 'k^2',
    variable: 'k',
    lowerBound: '1',
    upperBound: '5',
  });
  assert.equal(sqSum.ok, true);
  assert.equal(sqSum.value, 55);

  const prodRes = solveSeries({
    kind: 'prod',
    expression: 'k',
    variable: 'k',
    lowerBound: '1',
    upperBound: '5',
  });
  assert.equal(prodRes.ok, true);
  assert.equal(prodRes.value, 120);

  const emptySum = solveSeries({
    kind: 'sum',
    expression: 'k',
    variable: 'k',
    lowerBound: '5',
    upperBound: '3',
  });
  assert.equal(emptySum.ok, true);
  assert.equal(emptySum.value, 0);

  const infSum = solveSeries({
    kind: 'sum',
    expression: '1 / 2^k',
    variable: 'k',
    lowerBound: '1',
    upperBound: 'oo',
  });
  assert.equal(infSum.ok, true);
  assert.ok(Math.abs((infSum.value ?? 0) - 1) < 1e-10);
});

test('matrix calculator operations', () => {
  const detRes = solveMatrix({
    op: 'det',
    matrixA: [
      ['2', '1'],
      ['5', '3'],
    ],
  });
  assert.equal(detRes.ok, true);
  assert.ok(Math.abs((detRes.scalarValue ?? 0) - 1) < 1e-12);

  const invRes = solveMatrix({
    op: 'inv',
    matrixA: [
      ['2', '1'],
      ['5', '3'],
    ],
  });
  assert.equal(invRes.ok, true);
  assert.deepEqual(invRes.resultMatrix, [
    [3, -1],
    [-5, 2],
  ]);

  const singularInv = solveMatrix({
    op: 'inv',
    matrixA: [
      ['1', '2'],
      ['2', '4'],
    ],
  });
  assert.equal(singularInv.ok, false);

  const transRes = solveMatrix({
    op: 'transpose',
    matrixA: [
      ['1', '2', '3'],
      ['4', '5', '6'],
    ],
  });
  assert.equal(transRes.ok, true);
  assert.deepEqual(transRes.resultMatrix, [
    [1, 4],
    [2, 5],
    [3, 6],
  ]);

  const traceRes = solveMatrix({
    op: 'trace',
    matrixA: [
      ['4', '1'],
      ['2', '7'],
    ],
  });
  assert.equal(traceRes.ok, true);
  assert.equal(traceRes.scalarValue, 11);

  const rankRes = solveMatrix({
    op: 'rank',
    matrixA: [
      ['1', '2', '3'],
      ['2', '4', '6'],
    ],
  });
  assert.equal(rankRes.ok, true);
  assert.equal(rankRes.scalarValue, 1);

  const mulRes = solveMatrix({
    op: 'mul',
    matrixA: [
      ['1', '2'],
      ['3', '4'],
    ],
    matrixB: [
      ['2', '0'],
      ['1', '2'],
    ],
  });
  assert.equal(mulRes.ok, true);
  assert.deepEqual(mulRes.resultMatrix, [
    [4, 4],
    [10, 8],
  ]);

  const sysRes = solveMatrix({
    op: 'solve_ax_b',
    matrixA: [
      ['2', '1'],
      ['5', '3'],
    ],
    matrixB: [['5'], ['13']],
  });
  assert.equal(sysRes.ok, true);
  assert.ok(Math.abs((sysRes.resultMatrix?.[0][0] ?? 0) - 2) < 1e-10);
  assert.ok(Math.abs((sysRes.resultMatrix?.[1][0] ?? 0) - 1) < 1e-10);

  const eigRes = solveMatrix({
    op: 'eigen',
    matrixA: [
      ['4', '1'],
      ['2', '3'],
    ],
  });
  assert.equal(eigRes.ok, true);
  assert.ok(eigRes.resultLatex.includes('5') && eigRes.resultLatex.includes('2'));
});
