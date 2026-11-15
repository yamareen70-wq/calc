import test from 'node:test';
import assert from 'node:assert/strict';
import { solveDerivativeOrCalc } from '../math/derivatives';
import { solveIntegral } from '../math/integrator';
import { solveLimit } from '../math/limits';
import { solveMatrix } from '../math/matrix';
import { solveSeries } from '../math/summation';
import { buildPdfExportData, buildPdfFilename } from './pdfExportModel';

const HAS_ARABIC = /[\u0600-\u06FF]/;

function makeBaseInput() {
  const integralResult = solveIntegral({
    expression: 'x * sin(x)',
    variable: 'x',
    isDefinite: true,
    lowerBound: '0',
    upperBound: 'pi',
    method: 'auto',
  });
  const limitResult = solveLimit({
    expression: 'sin(3x) / x',
    variable: 'x',
    target: '0',
    direction: 'two-sided',
  });
  const derivResult = solveDerivativeOrCalc({
    expression: 'e^(2x)',
    variable: 'x',
    evalAt: '1',
    evaluateOnly: false,
    angleUnit: 'rad',
  });
  const seriesResult = solveSeries({
    kind: 'sum',
    expression: 'k^2',
    variable: 'k',
    lowerBound: '1',
    upperBound: '5',
    angleUnit: 'rad',
  });
  const matrixResult = solveMatrix({
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
  });

  return {
    lang: 'ar' as const,
    includeSolution: true,
    operation: 'def_integral' as const,
    angleUnit: 'rad' as const,
    variable: 'x',
    expression: 'x * sin(x)',
    lowerBound: '0',
    upperBound: 'pi',
    limitTarget: '0',
    limitDirection: 'two-sided' as const,
    derivEvalAt: '',
    matrixOp: 'det' as const,
    matrixA: [
      ['2', '1'],
      ['5', '3'],
    ],
    matrixB: [
      ['1', '0'],
      ['0', '1'],
    ],
    integralResult,
    limitResult,
    derivResult,
    seriesResult,
    matrixResult,
    graphDataUrl: 'data:image/png;base64,FAKE',
  };
}

test('buildPdfFilename creates distinct filenames for solution vs problem-only', () => {
  assert.equal(buildPdfFilename('def_integral', true), 'al-mutakamil-def_integral-solution.pdf');
  assert.equal(buildPdfFilename('def_integral', false), 'al-mutakamil-def_integral-problem.pdf');
  assert.equal(buildPdfFilename('matrix', false), 'al-mutakamil-matrix-problem.pdf');
});

test('Problem-only export omits solution, graph, and steps while keeping problem LaTeX', () => {
  const base = makeBaseInput();
  const doc = buildPdfExportData({ ...base, includeSolution: false }, '2026-11-15');

  assert.equal(doc.includeSolution, false);
  assert.equal(doc.solution, null);
  assert.equal(doc.graphDataUrl, null);
  assert.equal(doc.graphLegend.length, 0);
  assert.ok(doc.problemLatex.includes('\\int_{0}^{\\pi}'));
  assert.equal(doc.problemLatex.includes('= \\pi'), false);
});

test('With-solution export includes localized answer, graph, and steps in both Arabic and English', () => {
  const base = makeBaseInput();
  const arDoc = buildPdfExportData({ ...base, lang: 'ar', includeSolution: true }, '2026-11-15');
  assert.equal(arDoc.dir, 'rtl');
  assert.ok(arDoc.solution);
  assert.ok(arDoc.solution.steps.length > 0);
  assert.equal(arDoc.graphDataUrl, 'data:image/png;base64,FAKE');
  assert.equal(arDoc.solution.decimalValue, '3.141592654');

  const enDoc = buildPdfExportData({ ...base, lang: 'en', includeSolution: true }, 'Nov 15, 2026');
  assert.equal(enDoc.dir, 'ltr');
  assert.ok(enDoc.solution);
  assert.equal(HAS_ARABIC.test(enDoc.headerTitle), false);
  assert.equal(HAS_ARABIC.test(enDoc.solution.methodLabel), false);
  for (const st of enDoc.solution.steps) {
    assert.equal(HAS_ARABIC.test(st.title), false, `Arabic leaked in step title: ${st.title}`);
    assert.equal(HAS_ARABIC.test(st.explanation), false, `Arabic leaked in step expl: ${st.explanation}`);
    assert.equal(HAS_ARABIC.test(st.latex), false, `Arabic leaked in step latex: ${st.latex}`);
  }
});

test('Problem-only export builds clean problem LaTeX even when current result failed', () => {
  const base = makeBaseInput();
  const failedMatrix = solveMatrix({
    op: 'inv',
    matrixA: [
      ['1', '2'],
      ['2', '4'],
    ],
  });
  assert.equal(failedMatrix.ok, false);

  const doc = buildPdfExportData(
    {
      ...base,
      lang: 'en',
      includeSolution: false,
      operation: 'matrix',
      matrixOp: 'inv',
      matrixA: [
        ['1', '2'],
        ['2', '4'],
      ],
      matrixResult: failedMatrix,
    },
    'Nov 15, 2026'
  );

  assert.equal(doc.solution, null);
  assert.ok(doc.problemLatex.includes('\\begin{bmatrix}'));
  assert.ok(doc.problemLatex.includes('^{-1}'));
  assert.equal(HAS_ARABIC.test(doc.problemNote ?? ''), false);
});

test('All operation modes produce valid problem and solution PDF models', () => {
  const base = makeBaseInput();

  const limitDoc = buildPdfExportData({ ...base, operation: 'limit', includeSolution: true }, '2026-11-15');
  assert.ok(limitDoc.problemLatex.includes('\\lim'));
  assert.ok(limitDoc.solution?.answerLatex.includes('= 3'));

  const sumDoc = buildPdfExportData({ ...base, operation: 'sum', variable: 'k', lowerBound: '1', upperBound: '5', expression: 'k^2', includeSolution: true }, '2026-11-15');
  assert.ok(sumDoc.problemLatex.includes('\\sum'));
  assert.equal(sumDoc.solution?.decimalValue, '55');

  const derivDoc = buildPdfExportData({ ...base, operation: 'derivative', expression: 'e^(2x)', derivEvalAt: '1', includeSolution: true }, '2026-11-15');
  assert.ok(derivDoc.problemLatex.includes('\\frac{d}{dx}'));
  assert.ok(derivDoc.solution?.answerLatex.includes('='));

  const matDoc = buildPdfExportData({ ...base, operation: 'matrix', includeSolution: true }, '2026-11-15');
  assert.ok(matDoc.problemLatex.includes('\\det'));
  assert.equal(matDoc.solution?.decimalValue, '1');
});
