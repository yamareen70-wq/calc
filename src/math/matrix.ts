import { AngleUnit, evaluate, parseExpr } from './ast';
import { SolutionStep, formatNumberToLatex } from './integrator';

export type MatrixOp =
  | 'det'
  | 'inv'
  | 'transpose'
  | 'trace'
  | 'rank'
  | 'rref'
  | 'eigen'
  | 'add'
  | 'sub'
  | 'mul'
  | 'solve_ax_b';

export const MATRIX_OP_LABELS: Record<MatrixOp, string> = {
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
};

export function isBinaryMatrixOp(op: MatrixOp): boolean {
  return op === 'add' || op === 'sub' || op === 'mul' || op === 'solve_ax_b';
}

export interface MatrixRequest {
  op: MatrixOp;
  matrixA: string[][];
  matrixB?: string[][];
  angleUnit?: AngleUnit;
}

export interface MatrixResult {
  ok: boolean;
  error?: string;
  op: MatrixOp;
  exprLatex: string;
  resultLatex: string;
  scalarValue?: number;
  resultMatrix?: number[][];
  methodLabel: string;
  steps: SolutionStep[];
  warnings: string[];
}

export function matrixToLatex(m: number[][]): string {
  const rows = m.map((row) => row.map((v) => formatNumberToLatex(Math.abs(v) < 1e-12 ? 0 : v)).join(' & '));
  return `\\begin{bmatrix} ${rows.join(' \\\\ ')} \\end{bmatrix}`;
}

export function rawMatrixToLatex(m: string[][]): string {
  const rows = m.map((row) =>
    row
      .map((cell) => {
        const trimmed = cell.trim();
        if (!trimmed) return '0';
        try {
          const val = evaluate(parseExpr(trimmed), {});
          return Number.isFinite(val) ? formatNumberToLatex(val) : trimmed;
        } catch {
          return trimmed;
        }
      })
      .join(' & ')
  );
  return `\\begin{bmatrix} ${rows.join(' \\\\ ')} \\end{bmatrix}`;
}

function parseNumericMatrix(
  raw: string[][],
  label: string,
  angleUnit: AngleUnit
): { ok: true; data: number[][] } | { ok: false; error: string } {
  if (raw.length === 0 || raw[0].length === 0) {
    return { ok: false, error: `المصفوفة ${label} فارغة.` };
  }
  const rows = raw.length;
  const cols = raw[0].length;
  const out: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const rowVals: number[] = [];
    for (let c = 0; c < cols; c++) {
      const text = (raw[r]?.[c] ?? '').trim() || '0';
      try {
        const val = evaluate(parseExpr(text), {}, { angleUnit });
        if (!Number.isFinite(val)) {
          return {
            ok: false,
            error: `قيمة الخلية (${r + 1}, ${c + 1}) في المصفوفة ${label} غير معرفة رياضياً.`,
          };
        }
        rowVals.push(Math.abs(val) < 1e-13 ? 0 : val);
      } catch (err) {
        return {
          ok: false,
          error: `صيغة الخلية (${r + 1}, ${c + 1}) في المصفوفة ${label} غير صالحة: ${
            err instanceof Error ? err.message : ''
          }`,
        };
      }
    }
    out.push(rowVals);
  }
  return { ok: true, data: out };
}

function cleanFloat(v: number): number {
  if (Math.abs(v) < 1e-12) return 0;
  const rounded = Math.round(v);
  if (Math.abs(v - rounded) < 1e-11) return rounded === 0 ? 0 : rounded;
  return v;
}

function cloneMatrix(m: number[][]): number[][] {
  return m.map((r) => [...r]);
}

function computeRrefAndDet(input: number[][]): {
  rref: number[][];
  rank: number;
  det: number;
  pivots: number[];
} {
  const m = input.length;
  const n = input[0].length;
  const mat = cloneMatrix(input);
  let detSign = 1;
  let detScale = 1;
  const pivots: number[] = [];

  let lead = 0;
  for (let r = 0; r < m; r++) {
    if (lead >= n) break;
    let i = r;
    while (Math.abs(mat[i][lead]) < 1e-11) {
      i++;
      if (i === m) {
        i = r;
        lead++;
        if (lead === n) break;
      }
    }
    if (lead >= n) break;

    if (i !== r) {
      [mat[i], mat[r]] = [mat[r], mat[i]];
      detSign *= -1;
    }

    const lv = mat[r][lead];
    detScale *= lv;
    for (let c = 0; c < n; c++) {
      mat[r][c] = cleanFloat(mat[r][c] / lv);
    }

    for (let other = 0; other < m; other++) {
      if (other !== r) {
        const factor = mat[other][lead];
        if (Math.abs(factor) > 1e-12) {
          for (let c = 0; c < n; c++) {
            mat[other][c] = cleanFloat(mat[other][c] - factor * mat[r][c]);
          }
        }
      }
    }
    pivots.push(lead);
    lead++;
  }

  let detVal = 0;
  if (m === n) {
    if (pivots.length === n) {
      detVal = cleanFloat(detSign * detScale);
    } else {
      detVal = 0;
    }
  }

  return { rref: mat, rank: pivots.length, det: detVal, pivots };
}

function invertMatrix(input: number[][]): number[][] | null {
  const n = input.length;
  if (n === 0 || input[0].length !== n) return null;
  const aug = input.map((row, r) => [
    ...row,
    ...Array.from({ length: n }, (_, c) => (r === c ? 1 : 0)),
  ]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxAbs = Math.abs(aug[col][col]);
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(aug[r][col]) > maxAbs) {
        maxAbs = Math.abs(aug[r][col]);
        pivotRow = r;
      }
    }
    if (maxAbs < 1e-11) return null;
    if (pivotRow !== col) {
      [aug[col], aug[pivotRow]] = [aug[pivotRow], aug[col]];
    }
    const piv = aug[col][col];
    for (let c = 0; c < 2 * n; c++) {
      aug[col][c] /= piv;
    }
    for (let r = 0; r < n; r++) {
      if (r !== col) {
        const f = aug[r][col];
        if (Math.abs(f) > 1e-13) {
          for (let c = 0; c < 2 * n; c++) {
            aug[r][c] -= f * aug[col][c];
          }
        }
      }
    }
  }

  return aug.map((row) => row.slice(n).map((v) => cleanFloat(v)));
}

function multiplyMatrices(a: number[][], b: number[][]): number[][] {
  const rows = a.length;
  const cols = b[0].length;
  const inner = b.length;
  const out = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let sum = 0;
      for (let k = 0; k < inner; k++) {
        sum += a[r][k] * b[k][c];
      }
      out[r][c] = cleanFloat(sum);
    }
  }
  return out;
}

export function solveMatrix(req: MatrixRequest): MatrixResult {
  const angleUnit: AngleUnit = req.angleUnit === 'deg' ? 'deg' : 'rad';
  const op = req.op;
  const methodLabel = `حساب المصفوفات — ${MATRIX_OP_LABELS[op]}`;
  const warnings: string[] = [];

  const parsedA = parseNumericMatrix(req.matrixA, 'A', angleUnit);
  if (!parsedA.ok) {
    return {
      ok: false,
      error: parsedA.error,
      op,
      exprLatex: '',
      resultLatex: '',
      methodLabel,
      steps: [],
      warnings,
    };
  }
  const A = parsedA.data;
  const rowsA = A.length;
  const colsA = A[0].length;
  const texA = matrixToLatex(A);

  let B: number[][] | null = null;
  let texB = '';
  if (isBinaryMatrixOp(op)) {
    if (!req.matrixB) {
      return {
        ok: false,
        error: 'هذه العملية تتطلب إدخال المصفوفة B.',
        op,
        exprLatex: texA,
        resultLatex: '',
        methodLabel,
        steps: [],
        warnings,
      };
    }
    const parsedB = parseNumericMatrix(req.matrixB, 'B', angleUnit);
    if (!parsedB.ok) {
      return {
        ok: false,
        error: parsedB.error,
        op,
        exprLatex: texA,
        resultLatex: '',
        methodLabel,
        steps: [],
        warnings,
      };
    }
    B = parsedB.data;
    texB = matrixToLatex(B);
  }

  switch (op) {
    case 'det': {
      if (rowsA !== colsA) {
        return {
          ok: false,
          error: `حساب المحدد يتطلب مصفوفة مربعة (المصفوفة الحالية ${rowsA}×${colsA}).`,
          op,
          exprLatex: `\\det${texA}`,
          resultLatex: '',
          methodLabel,
          steps: [],
          warnings,
        };
      }
      const { det } = computeRrefAndDet(A);
      const valTex = formatNumberToLatex(det);
      const steps: SolutionStep[] = [];
      if (rowsA === 2) {
        const [[a, b], [c, d]] = A;
        steps.push({
          id: 'mat-det-2x2',
          title: 'تطبيق قانون محدد المصفوفة 2×2',
          rule: '2×2 Determinant Formula',
          explanation: 'نطرح حاصل ضرب القطر الثانوي من حاصل ضرب القطر الرئيسي: ad − bc.',
          latex: `\\det(A) = (${formatNumberToLatex(a)})(${formatNumberToLatex(d)}) - (${formatNumberToLatex(b)})(${formatNumberToLatex(c)}) = ${valTex}`,
        });
      } else {
        steps.push({
          id: 'mat-det-gauss',
          title: 'اختزال غاوس إلى الشكل المثلثي العلوي',
          rule: 'Gaussian Elimination Determinant',
          explanation: 'نحول المصفوفة إلى الشكل المثلثي عبر العمليات الصفية ونضرب عناصر القطر الرئيسي.',
          latex: `\\det${texA} = ${valTex}`,
        });
      }
      return {
        ok: true,
        op,
        exprLatex: `\\det${texA}`,
        resultLatex: valTex,
        scalarValue: det,
        methodLabel,
        steps,
        warnings,
      };
    }

    case 'trace': {
      if (rowsA !== colsA) {
        return {
          ok: false,
          error: `حساب الأثر يتطلب مصفوفة مربعة (المصفوفة الحالية ${rowsA}×${colsA}).`,
          op,
          exprLatex: `\\operatorname{tr}${texA}`,
          resultLatex: '',
          methodLabel,
          steps: [],
          warnings,
        };
      }
      const diag = A.map((row, i) => row[i]);
      const tr = diag.reduce((s, v) => s + v, 0);
      const valTex = formatNumberToLatex(tr);
      return {
        ok: true,
        op,
        exprLatex: `\\operatorname{tr}${texA}`,
        resultLatex: valTex,
        scalarValue: tr,
        methodLabel,
        steps: [
          {
            id: 'mat-trace',
            title: 'جمع عناصر القطر الرئيسي',
            rule: 'Matrix Trace',
            explanation: 'أثر المصفوفة المربعة هو مجموع عناصر قطرها الرئيسي.',
            latex: `\\operatorname{tr}(A) = ${diag.map((v) => formatNumberToLatex(v)).join(' + ')} = ${valTex}`,
          },
        ],
        warnings,
      };
    }

    case 'transpose': {
      const T = Array.from({ length: colsA }, (_, c) =>
        Array.from({ length: rowsA }, (_, r) => A[r][c])
      );
      const texT = matrixToLatex(T);
      return {
        ok: true,
        op,
        exprLatex: `${texA}^{T}`,
        resultLatex: texT,
        resultMatrix: T,
        methodLabel,
        steps: [
          {
            id: 'mat-transpose',
            title: 'تبديل الصفوف والأعمدة',
            rule: 'Matrix Transpose',
            explanation: `نبدل كل صف بالعمود المقابل له لتصبح الأبعاد ${colsA}×${rowsA}.`,
            latex: `${texA}^{T} = ${texT}`,
          },
        ],
        warnings,
      };
    }

    case 'rank':
    case 'rref': {
      const { rref, rank } = computeRrefAndDet(A);
      const texRref = matrixToLatex(rref);
      const isRank = op === 'rank';
      return {
        ok: true,
        op,
        exprLatex: isRank ? `\\operatorname{rank}${texA}` : `\\operatorname{rref}${texA}`,
        resultLatex: isRank ? String(rank) : texRref,
        scalarValue: isRank ? rank : undefined,
        resultMatrix: isRank ? undefined : rref,
        methodLabel,
        steps: [
          {
            id: 'mat-rref',
            title: 'الاختزال الصفي المختصر (Gauss-Jordan)',
            rule: 'Reduced Row Echelon Form',
            explanation: 'نطبق العمليات الصفية الأولية لجعل كل محور مساوياً لـ 1 وتصفير ما فوقه وتحته.',
            latex: `\\operatorname{rref}(A) = ${texRref}`,
          },
          ...(isRank
            ? [
                {
                  id: 'mat-rank',
                  title: 'عد الصفوف غير الصفرية (المحاور)',
                  rule: 'Matrix Rank',
                  explanation: 'مرتبة المصفوفة تساوي عدد الصفوف غير الصفرية في صيغة الاختزال المختصرة.',
                  latex: `\\operatorname{rank}(A) = ${rank}`,
                },
              ]
            : []),
        ],
        warnings,
      };
    }

    case 'inv': {
      if (rowsA !== colsA) {
        return {
          ok: false,
          error: `المعكوس يتطلب مصفوفة مربعة (المصفوفة الحالية ${rowsA}×${colsA}).`,
          op,
          exprLatex: `${texA}^{-1}`,
          resultLatex: '',
          methodLabel,
          steps: [],
          warnings,
        };
      }
      const inv = invertMatrix(A);
      if (!inv) {
        return {
          ok: false,
          error: 'المصفوفة منفردة (المحدد = 0)، لذا لا يوجد لها معكوس ضربي.',
          op,
          exprLatex: `${texA}^{-1}`,
          resultLatex: '',
          methodLabel,
          steps: [],
          warnings,
        };
      }
      const texInv = matrixToLatex(inv);
      const { det } = computeRrefAndDet(A);
      return {
        ok: true,
        op,
        exprLatex: `${texA}^{-1}`,
        resultLatex: texInv,
        resultMatrix: inv,
        methodLabel,
        steps: [
          {
            id: 'mat-inv-det',
            title: 'التحقق من قابلية العكس',
            rule: 'Invertibility Check',
            explanation: 'المصفوفة قابلة للعكس لأن محددها لا يساوي صفراً.',
            latex: `\\det(A) = ${formatNumberToLatex(det)} \\neq 0`,
          },
          {
            id: 'mat-inv-gauss',
            title: 'تطبيق طريقة غاوس-جوردان [A | I] → [I | A⁻¹]',
            rule: 'Gauss-Jordan Inversion',
            explanation: 'نختزل المصفوفة الموسعة للوصول إلى مصفوفة الوحدة في الطرف الأيسر فينتج المعكوس في الطرف الأيمن.',
            latex: `A^{-1} = ${texInv}`,
          },
        ],
        warnings,
      };
    }

    case 'eigen': {
      if (rowsA !== colsA) {
        return {
          ok: false,
          error: `القيم الذاتية تتطلب مصفوفة مربعة (الحالية ${rowsA}×${colsA}).`,
          op,
          exprLatex: `\\operatorname{eig}${texA}`,
          resultLatex: '',
          methodLabel,
          steps: [],
          warnings,
        };
      }
      if (rowsA === 1) {
        const l1 = formatNumberToLatex(A[0][0]);
        return {
          ok: true,
          op,
          exprLatex: `\\lambda${texA}`,
          resultLatex: `\\lambda_1 = ${l1}`,
          scalarValue: A[0][0],
          methodLabel,
          steps: [
            {
              id: 'mat-eig-1',
              title: 'القيمة الذاتية لمصفوفة 1×1',
              rule: 'Characteristic Equation',
              explanation: 'القيمة الذاتية هي العنصر الوحيد في المصفوفة.',
              latex: `\\lambda_1 = ${l1}`,
            },
          ],
          warnings,
        };
      }
      if (rowsA === 2) {
        const tr = A[0][0] + A[1][1];
        const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
        const disc = tr * tr - 4 * det;
        const charLatex = `\\lambda^2 ${tr >= 0 ? '-' : '+'} ${formatNumberToLatex(Math.abs(tr))}\\lambda ${
          det >= 0 ? '+' : '-'
        } ${formatNumberToLatex(Math.abs(det))} = 0`;
        let resLatex: string;
        if (disc >= -1e-11) {
          const sq = Math.sqrt(Math.max(0, disc));
          const l1 = (tr + sq) / 2;
          const l2 = (tr - sq) / 2;
          resLatex = `\\lambda_1 = ${formatNumberToLatex(l1)},\\; \\lambda_2 = ${formatNumberToLatex(l2)}`;
        } else {
          const re = tr / 2;
          const im = Math.sqrt(-disc) / 2;
          const reStr = Math.abs(re) < 1e-12 ? '' : formatNumberToLatex(re);
          const imStr = `${formatNumberToLatex(im)}i`;
          resLatex = reStr
            ? `\\lambda_{1,2} = ${reStr} \\pm ${imStr}`
            : `\\lambda_{1,2} = \\pm ${imStr}`;
        }
        return {
          ok: true,
          op,
          exprLatex: `\\det(${texA} - \\lambda I) = 0`,
          resultLatex: resLatex,
          methodLabel,
          steps: [
            {
              id: 'mat-eig-char',
              title: 'بناء المعادلة المميزة',
              rule: 'Characteristic Polynomial',
              explanation: 'نستخدم الأثر والمحدد لتشكيل معادلة الدرجة الثانية للمصفوفة 2×2.',
              latex: charLatex,
            },
            {
              id: 'mat-eig-sol',
              title: 'حل جذور المعادلة المميزة',
              rule: 'Quadratic Eigenvalues',
              explanation: 'نحل المعادلة باستخدام القانون العام لإيجاد القيم الذاتية.',
              latex: resLatex,
            },
          ],
          warnings,
        };
      }
      return {
        ok: false,
        error: 'حساب القيم الذاتية التحليلي مدعوم حالياً للمصفوفات 1×1 و 2×2.',
        op,
        exprLatex: `\\det(${texA} - \\lambda I) = 0`,
        resultLatex: '',
        methodLabel,
        steps: [],
        warnings,
      };
    }

    case 'add':
    case 'sub': {
      const bMat = B!;
      if (rowsA !== bMat.length || colsA !== bMat[0].length) {
        return {
          ok: false,
          error: `يتطلب ${op === 'add' ? 'الجمع' : 'الطرح'} تطابق أبعاد المصفوفتين (${rowsA}×${colsA} مقابل ${bMat.length}×${bMat[0].length}).`,
          op,
          exprLatex: `${texA} ${op === 'add' ? '+' : '-'} ${texB}`,
          resultLatex: '',
          methodLabel,
          steps: [],
          warnings,
        };
      }
      const out = A.map((row, r) =>
        row.map((val, c) => {
          const res = op === 'add' ? val + bMat[r][c] : val - bMat[r][c];
          return Math.abs(res) < 1e-12 ? 0 : res;
        })
      );
      const texOut = matrixToLatex(out);
      const sym = op === 'add' ? '+' : '-';
      return {
        ok: true,
        op,
        exprLatex: `${texA} ${sym} ${texB}`,
        resultLatex: texOut,
        resultMatrix: out,
        methodLabel,
        steps: [
          {
            id: 'mat-add-sub',
            title: `${op === 'add' ? 'جمع' : 'طرح'} العناصر المتناظرة`,
            rule: 'Elementwise Matrix Operation',
            explanation: `نطبق العملية على كل عنصر في المصفوفة A مع نظيره في المصفوفة B.`,
            latex: `${texA} ${sym} ${texB} = ${texOut}`,
          },
        ],
        warnings,
      };
    }

    case 'mul': {
      const bMat = B!;
      if (colsA !== bMat.length) {
        return {
          ok: false,
          error: `لضرب A × B يجب أن يساوي عدد أعمدة A (${colsA}) عدد صفوف B (${bMat.length}).`,
          op,
          exprLatex: `${texA} \\cdot ${texB}`,
          resultLatex: '',
          methodLabel,
          steps: [],
          warnings,
        };
      }
      const out = multiplyMatrices(A, bMat);
      const texOut = matrixToLatex(out);
      return {
        ok: true,
        op,
        exprLatex: `${texA} \\cdot ${texB}`,
        resultLatex: texOut,
        resultMatrix: out,
        methodLabel,
        steps: [
          {
            id: 'mat-mul',
            title: 'ضرب الصفوف في الأعمدة',
            rule: 'Matrix Multiplication',
            explanation: `نضرب كل صف من A (${rowsA}×${colsA}) في كل عمود من B (${bMat.length}×${bMat[0].length}) لنحصل على مصفوفة ${rowsA}×${bMat[0].length}.`,
            latex: `${texA} \\cdot ${texB} = ${texOut}`,
          },
        ],
        warnings,
      };
    }

    case 'solve_ax_b': {
      const bMat = B!;
      if (rowsA !== colsA) {
        return {
          ok: false,
          error: `يتطلب حل النظام AX = B أن تكون المصفوفة A مربعة (الحالية ${rowsA}×${colsA}).`,
          op,
          exprLatex: `${texA} X = ${texB}`,
          resultLatex: '',
          methodLabel,
          steps: [],
          warnings,
        };
      }
      if (bMat.length !== rowsA) {
        return {
          ok: false,
          error: `عدد صفوف المصفوفة B (${bMat.length}) يجب أن يطابق عدد صفوف A (${rowsA}).`,
          op,
          exprLatex: `${texA} X = ${texB}`,
          resultLatex: '',
          methodLabel,
          steps: [],
          warnings,
        };
      }
      const inv = invertMatrix(A);
      if (!inv) {
        return {
          ok: false,
          error: 'محدد مصفوفة المعاملات A يساوي صفراً، لذا لا يوجد حل وحيد للنظام.',
          op,
          exprLatex: `${texA} X = ${texB}`,
          resultLatex: '',
          methodLabel,
          steps: [],
          warnings,
        };
      }
      const sol = multiplyMatrices(inv, bMat);
      const texSol = matrixToLatex(sol);
      return {
        ok: true,
        op,
        exprLatex: `${texA} X = ${texB}`,
        resultLatex: `X = ${texSol}`,
        resultMatrix: sol,
        methodLabel,
        steps: [
          {
            id: 'mat-solve-inv',
            title: 'إيجاد معكوس مصفوفة المعاملات A⁻¹',
            rule: 'Inverse Matrix Method',
            explanation: 'بما أن det(A) ≠ 0، نحسب المعكوس A⁻¹ ثم نضربه في مصفوفة الثوابت B.',
            latex: `A^{-1} = ${matrixToLatex(inv)}`,
          },
          {
            id: 'mat-solve-final',
            title: 'حساب متجه المجاهيل X = A⁻¹B',
            rule: 'Linear System Solution',
            explanation: 'نضرب المعكوس في المصفوفة B للحصول على قيم المجاهيل.',
            latex: `X = A^{-1}B = ${texSol}`,
          },
        ],
        warnings,
      };
    }
  }
}
