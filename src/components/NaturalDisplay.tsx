import { AppLang, UI_TEXT } from '../i18n';
import { AngleUnit, parseExpr, toLatex } from '../math/ast';
import { parseBound } from '../math/integrator';
import { LimitDirection } from '../math/limits';
import { MatrixOp, isBinaryMatrixOp } from '../math/matrix';
import { MathBlock } from './MathDisplay';
import { CalcOperation } from './MathKeypad';

export type MatrixSlotField = `mat:${'A' | 'B'}:${number}:${number}`;

export type DisplaySlotField =
  | 'expr'
  | 'lower'
  | 'upper'
  | 'limitTarget'
  | 'derivEvalAt'
  | MatrixSlotField;

interface NaturalDisplayProps {
  lang: AppLang;
  operation: CalcOperation;
  operationLabel: string;
  angleUnit: AngleUnit;
  variable: string;
  expression: string;
  lowerBound: string;
  upperBound: string;
  limitTarget: string;
  limitDirection: LimitDirection;
  derivEvalAt: string;
  exprHasVars: boolean;
  matrixOp: MatrixOp;
  matrixA: string[][];
  matrixB: string[][];
  activeField: string | null;
  cursors: Record<string, number>;
  answerSummary: string | null;
  answerError: string | null;
  onSelectField: (field: DisplaySlotField) => void;
  onToggleAngleUnit: () => void;
  onChangeVariable: (v: string) => void;
  onChangeLimitDirection: (d: LimitDirection) => void;
  onQuickLimitTarget: (val: string) => void;
  onQuickSeriesUpper: (val: string) => void;
  onChangeMatrixOp: (op: MatrixOp) => void;
  onChangeMatrixDim: (target: 'A' | 'B', rows: number, cols: number) => void;
}

function tryExprToLatex(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return toLatex(parseExpr(trimmed));
  } catch {
    return null;
  }
}

function tryBoundToLatex(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return parseBound(trimmed).latex;
  } catch {
    return null;
  }
}

function CaretText({ value, cursor }: { value: string; cursor: number }) {
  const pos = Math.max(0, Math.min(cursor, value.length));
  const before = value.slice(0, pos);
  const after = value.slice(pos);
  return (
    <span dir="ltr" className="inline-flex items-center whitespace-pre font-mono">
      <span>{before}</span>
      <span
        aria-hidden="true"
        className="mx-[1px] inline-block h-[1.15em] w-[2px] animate-pulse bg-[#0284c7] dark:bg-sky-400"
      />
      <span>{after}</span>
    </span>
  );
}

export function NaturalDisplay({
  lang,
  operation,
  operationLabel,
  angleUnit,
  variable,
  expression,
  lowerBound,
  upperBound,
  limitTarget,
  limitDirection,
  derivEvalAt,
  exprHasVars,
  matrixOp,
  matrixA,
  matrixB,
  activeField,
  cursors,
  answerSummary,
  answerError,
  onSelectField,
  onToggleAngleUnit,
  onChangeVariable,
  onChangeLimitDirection,
  onQuickLimitTarget,
  onQuickSeriesUpper,
  onChangeMatrixOp,
  onChangeMatrixDim,
}: NaturalDisplayProps) {
  const t = UI_TEXT[lang].display;
  const mLabels = UI_TEXT[lang].matrixOps;
  const isPreviewMode = activeField === null;
  const textDir = lang === 'ar' ? 'rtl' : 'ltr';

  const renderSlotContent = (
    field: DisplaySlotField,
    raw: string,
    mode: 'expr' | 'bound',
    emptyPlaceholder = '□'
  ) => {
    const isActive = activeField === field;
    if (isActive) {
      return <CaretText value={raw} cursor={cursors[field] ?? raw.length} />;
    }
    if (!raw.trim()) {
      return (
        <span className="font-mono text-slate-400 dark:text-slate-500">
          {emptyPlaceholder}
        </span>
      );
    }
    const tex = mode === 'expr' ? tryExprToLatex(raw) : tryBoundToLatex(raw);
    if (tex) {
      return (
        <MathBlock
          latex={mode === 'expr' ? `\\displaystyle ${tex}` : tex}
          displayMode={false}
        />
      );
    }
    return <span className="font-mono">{raw}</span>;
  };

  const slotBtnClass = (field: DisplaySlotField, compact = false, isEmpty = false) => {
    const isActive = activeField === field;
    const baseSize = compact
      ? 'min-h-[26px] min-w-[30px] px-1.5 py-0.5 text-sm'
      : 'min-h-[42px] min-w-[84px] px-2.5 py-1 text-base sm:text-lg';

    if (isActive) {
      return `inline-flex items-center justify-center rounded transition-colors focus-visible:outline-2 focus-visible:outline-[#0284c7] ${baseSize} border-2 border-[#0284c7] bg-sky-50/70 text-slate-950 dark:border-sky-400 dark:bg-sky-950/40 dark:text-white`;
    }

    if (isPreviewMode && !isEmpty) {
      return `inline-flex items-center justify-center rounded transition-colors focus-visible:outline-2 focus-visible:outline-[#0284c7] ${baseSize} border border-transparent bg-transparent text-slate-950 hover:border-dashed hover:border-sky-400/70 hover:bg-sky-50/40 dark:text-slate-100 dark:hover:border-sky-600 dark:hover:bg-sky-950/30`;
    }

    return `inline-flex items-center justify-center rounded transition-colors focus-visible:outline-2 focus-visible:outline-[#0284c7] ${baseSize} border border-dashed border-slate-300 bg-slate-50/70 text-slate-900 hover:border-slate-400 hover:bg-slate-100/70 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:border-slate-500`;
  };

  const renderMatrixBracketGrid = (target: 'A' | 'B', mat: string[][]) => {
    const rows = mat.length;
    const cols = mat[0]?.length ?? 1;
    return (
      <div className="inline-flex flex-col items-center gap-1">
        <div className="relative inline-flex items-stretch px-2 py-1.5">
          {/* Left Square Matrix Bracket */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0 bottom-0 left-0 w-2 rounded-l-xs border-y-2 border-l-2 border-slate-800 dark:border-slate-200"
          />
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(44px, auto))` }}
          >
            {mat.map((row, r) =>
              row.map((cellVal, c) => {
                const field: MatrixSlotField = `mat:${target}:${r}:${c}`;
                return (
                  <button
                    key={field}
                    type="button"
                    role="textbox"
                    aria-readonly="true"
                    data-lcd-slot="true"
                    data-testid={`matrix-slot-${target}-${r}-${c}`}
                    data-value={cellVal}
                    aria-label={t.matrixCellAria(target, r, c)}
                    onClick={() => onSelectField(field)}
                    className={`${slotBtnClass(field, true, !cellVal.trim())} min-h-[34px] min-w-[44px] justify-center font-mono text-xs sm:text-sm`}
                  >
                    {renderSlotContent(field, cellVal, 'expr', '0')}
                  </button>
                );
              })
            )}
          </div>
          {/* Right Square Matrix Bracket */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0 right-0 bottom-0 w-2 rounded-r-xs border-y-2 border-r-2 border-slate-800 dark:border-slate-200"
          />
        </div>
        <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
          {target} ({rows}×{cols})
        </span>
      </div>
    );
  };

  const matrixOpOptions: { id: MatrixOp; label: string; aria: string }[] = [
    { id: 'det', label: 'det', aria: mLabels.det },
    { id: 'inv', label: 'A⁻¹', aria: mLabels.inv },
    { id: 'transpose', label: 'Aᵀ', aria: mLabels.transpose },
    { id: 'trace', label: 'tr', aria: mLabels.trace },
    { id: 'rank', label: 'rank', aria: mLabels.rank },
    { id: 'rref', label: 'RREF', aria: mLabels.rref },
    { id: 'eigen', label: 'λ', aria: mLabels.eigen },
    { id: 'add', label: 'A+B', aria: mLabels.add },
    { id: 'sub', label: 'A−B', aria: mLabels.sub },
    { id: 'mul', label: 'A×B', aria: mLabels.mul },
    { id: 'solve_ax_b', label: 'AX=B', aria: mLabels.solve_ax_b },
  ];

  const varChoices =
    operation === 'sum' || operation === 'prod'
      ? (['k', 'x', 'n', 't'] as const)
      : (['x', 'k', 't', 'u', 'y'] as const);

  return (
    <div className="space-y-2.5 rounded-t-xl border-b border-slate-300 bg-[#f6f7f9] p-3.5 sm:p-4 dark:border-slate-700 dark:bg-slate-900">
      {/* LCD Top Status Bar: RAD/DEG Toggle + Operation + Variable Switch */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <button
            type="button"
            dir="ltr"
            data-lcd-inline-control="true"
            data-testid="angle-unit-toggle"
            aria-label={t.angleAria}
            aria-pressed={angleUnit === 'deg'}
            onClick={onToggleAngleUnit}
            className={`min-h-[24px] rounded px-1.5 font-mono text-[11px] font-extrabold tracking-wider transition-colors focus-visible:outline-2 focus-visible:outline-[#0284c7] ${
              angleUnit === 'deg'
                ? 'bg-amber-200 text-amber-950 dark:bg-amber-900/70 dark:text-amber-200'
                : 'bg-slate-200/90 text-slate-800 hover:bg-slate-300/80 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            {angleUnit.toUpperCase()}
          </button>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-[#0369a1] dark:text-sky-400">
            {operationLabel}
          </span>
        </div>

        {operation !== 'matrix' && (
          <div data-lcd-inline-control="true" className="flex items-center gap-1.5">
            <span>{t.variableLabel}</span>
            <div className="inline-flex rounded bg-slate-200/80 p-0.5 dark:bg-slate-800">
              {varChoices.map((vOpt) => (
                <button
                  key={vOpt}
                  type="button"
                  onClick={() => onChangeVariable(vOpt)}
                  className={`min-h-[26px] min-w-[24px] rounded px-1.5 font-mono text-xs font-bold transition-colors ${
                    variable === vOpt
                      ? 'bg-white text-[#0369a1] shadow-xs dark:bg-slate-700 dark:text-sky-300'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                  }`}
                >
                  {vOpt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Unified Interactive Natural Display Screen (Zero separate input boxes!) */}
      <div
        data-testid="natural-lcd-screen"
        data-display-mode={isPreviewMode ? 'natural' : 'editing'}
        className="flex min-h-[152px] flex-col justify-between rounded-lg border border-slate-200/90 bg-white px-3.5 py-3.5 shadow-inner dark:border-slate-800 dark:bg-slate-950"
      >
        {/* Interactive Math Equation & Symbol Slots */}
        <div dir="ltr" className="overflow-x-auto py-1">
          {operation === 'def_integral' && (
            <div className="inline-flex min-w-full items-center gap-2">
              {/* Stacked upper bound, tall ∫ symbol, lower bound (HiPER layout) */}
              <div className="flex flex-col items-center gap-0.5">
                <button
                  id="upper-bound"
                  type="button"
                  role="textbox"
                  aria-readonly="true"
                  data-lcd-slot="true"
                  data-testid="lcd-slot-upper"
                  data-value={upperBound}
                  aria-label={t.upperBoundAria}
                  onClick={() => onSelectField('upper')}
                  className={slotBtnClass('upper', true, !upperBound.trim())}
                >
                  {renderSlotContent('upper', upperBound, 'bound')}
                </button>

                <span
                  aria-hidden="true"
                  className="font-serif text-5xl leading-[0.85] text-slate-900 select-none dark:text-slate-100"
                >
                  ∫
                </span>

                <button
                  id="lower-bound"
                  type="button"
                  role="textbox"
                  aria-readonly="true"
                  data-lcd-slot="true"
                  data-testid="lcd-slot-lower"
                  data-value={lowerBound}
                  aria-label={t.lowerBoundAria}
                  onClick={() => onSelectField('lower')}
                  className={slotBtnClass('lower', true, !lowerBound.trim())}
                >
                  {renderSlotContent('lower', lowerBound, 'bound')}
                </button>
              </div>

              <button
                id="expr-input"
                type="button"
                role="textbox"
                aria-readonly="true"
                data-lcd-slot="true"
                data-testid="lcd-slot-expr"
                data-value={expression}
                aria-label={t.exprSlotAria}
                onClick={() => onSelectField('expr')}
                className={`${slotBtnClass('expr', false, !expression.trim())} flex-1 justify-start overflow-x-auto`}
              >
                {renderSlotContent('expr', expression, 'expr')}
              </button>

              <span className="shrink-0 font-serif text-xl italic text-slate-800 dark:text-slate-200">
                d{variable}
              </span>
            </div>
          )}

          {operation === 'indef_integral' && (
            <div className="inline-flex min-w-full items-center gap-2.5">
              <span
                aria-hidden="true"
                className="font-serif text-5xl leading-none text-slate-900 select-none dark:text-slate-100"
              >
                ∫
              </span>

              <button
                id="expr-input"
                type="button"
                role="textbox"
                aria-readonly="true"
                data-lcd-slot="true"
                data-testid="lcd-slot-expr"
                data-value={expression}
                aria-label={t.exprSlotAria}
                onClick={() => onSelectField('expr')}
                className={`${slotBtnClass('expr', false, !expression.trim())} flex-1 justify-start overflow-x-auto`}
              >
                {renderSlotContent('expr', expression, 'expr')}
              </button>

              <span className="shrink-0 font-serif text-xl italic text-slate-800 dark:text-slate-200">
                d{variable}
              </span>
            </div>
          )}

          {operation === 'limit' && (
            <div className="space-y-2.5">
              <div className="inline-flex min-w-full items-center gap-2.5">
                <div className="flex shrink-0 flex-col items-center gap-1">
                  <span className="font-serif text-2xl font-semibold leading-none text-slate-900 dark:text-slate-100">
                    lim
                  </span>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="font-serif italic text-slate-700 dark:text-slate-300">
                      {variable} →
                    </span>
                    <button
                      id="limit-target"
                      type="button"
                      role="textbox"
                      aria-readonly="true"
                      data-lcd-slot="true"
                      data-testid="lcd-slot-limitTarget"
                      data-value={limitTarget}
                      aria-label={t.limitTargetAria}
                      onClick={() => onSelectField('limitTarget')}
                      className={slotBtnClass('limitTarget', true, !limitTarget.trim())}
                    >
                      {renderSlotContent('limitTarget', limitTarget, 'bound')}
                    </button>
                    {limitDirection !== 'two-sided' && (
                      <sup className="font-mono text-xs font-bold text-[#0369a1] dark:text-sky-400">
                        {limitDirection === 'right' ? '+' : '−'}
                      </sup>
                    )}
                  </div>
                </div>

                <button
                  id="expr-input"
                  type="button"
                  role="textbox"
                  aria-readonly="true"
                  data-lcd-slot="true"
                  data-testid="lcd-slot-expr"
                  data-value={expression}
                  aria-label={t.exprSlotAria}
                  onClick={() => onSelectField('expr')}
                  className={`${slotBtnClass('expr', false, !expression.trim())} flex-1 justify-start overflow-x-auto`}
                >
                  {renderSlotContent('expr', expression, 'expr')}
                </button>
              </div>

              {/* Compact inline limit helpers inside LCD screen */}
              <div
                dir={textDir}
                data-lcd-inline-control="true"
                className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800"
              >
                <div className="inline-flex rounded bg-slate-100 p-0.5 dark:bg-slate-900" role="group" aria-label={t.limitDirAria}>
                  {(
                    [
                      { id: 'two-sided', label: t.limitDirs['two-sided'] },
                      { id: 'right', label: t.limitDirs.right },
                      { id: 'left', label: t.limitDirs.left },
                    ] as { id: LimitDirection; label: string }[]
                  ).map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => onChangeLimitDirection(d.id)}
                      className={`min-h-[26px] whitespace-nowrap shrink-0 rounded px-2 font-semibold transition-colors ${
                        limitDirection === d.id
                          ? 'bg-white text-[#0369a1] shadow-xs dark:bg-slate-800 dark:text-sky-300'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                <div dir="ltr" className="flex flex-wrap items-center gap-1">
                  {[
                    { label: '0', val: '0' },
                    { label: '1', val: '1' },
                    { label: 'π', val: 'pi' },
                    { label: '+∞', val: 'oo' },
                    { label: '−∞', val: '-oo' },
                  ].map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => onQuickLimitTarget(q.val)}
                      className={`min-h-[26px] rounded border px-1.5 font-mono text-[11px] font-semibold transition-colors ${
                        limitTarget === q.val
                          ? 'border-[#0284c7] bg-sky-50 text-[#0369a1] dark:border-sky-500 dark:bg-sky-950/60 dark:text-sky-300'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {operation === 'derivative' && (
            <div className="inline-flex min-w-full flex-wrap items-center gap-2">
              <div className="flex flex-col items-center font-serif text-base leading-tight text-slate-900 dark:text-slate-100">
                <span className="border-b border-slate-800 px-1.5 pb-0.5 dark:border-slate-300">
                  d
                </span>
                <span className="px-1.5 pt-0.5 italic">d{variable}</span>
              </div>

              <span className="text-2xl font-light text-slate-500">(</span>
              <button
                id="expr-input"
                type="button"
                role="textbox"
                aria-readonly="true"
                data-lcd-slot="true"
                data-testid="lcd-slot-expr"
                data-value={expression}
                aria-label={t.exprSlotAria}
                onClick={() => onSelectField('expr')}
                className={`${slotBtnClass('expr', false, !expression.trim())} min-w-[120px] flex-1 justify-start overflow-x-auto`}
              >
                {renderSlotContent('expr', expression, 'expr')}
              </button>
              <span className="text-2xl font-light text-slate-500">)</span>

              <div className="flex items-center gap-1 border-l border-slate-200 pl-2 text-xs dark:border-slate-800">
                <span className="font-serif italic text-slate-600 dark:text-slate-400">
                  {variable}₀=
                </span>
                <button
                  id="deriv-eval-at"
                  type="button"
                  role="textbox"
                  aria-readonly="true"
                  data-lcd-slot="true"
                  data-testid="lcd-slot-derivEvalAt"
                  data-value={derivEvalAt}
                  aria-label={t.derivEvalAria}
                  onClick={() => onSelectField('derivEvalAt')}
                  className={slotBtnClass('derivEvalAt', true, !derivEvalAt.trim())}
                >
                  {renderSlotContent('derivEvalAt', derivEvalAt, 'bound', t.optionalPlaceholder)}
                </button>
              </div>
            </div>
          )}

          {(operation === 'sum' || operation === 'prod') && (
            <div className="space-y-2.5">
              <div className="inline-flex min-w-full items-center gap-2.5">
                <div className="flex shrink-0 flex-col items-center gap-1">
                  <button
                    id="upper-bound"
                    type="button"
                    role="textbox"
                    aria-readonly="true"
                    data-lcd-slot="true"
                    data-testid="lcd-slot-upper"
                    data-value={upperBound}
                    aria-label={t.seriesUpperAria}
                    onClick={() => onSelectField('upper')}
                    className={slotBtnClass('upper', true, !upperBound.trim())}
                  >
                    {renderSlotContent('upper', upperBound, 'bound')}
                  </button>

                  <span
                    aria-hidden="true"
                    className="font-serif text-4xl leading-none text-slate-900 select-none dark:text-slate-100"
                  >
                    {operation === 'sum' ? '∑' : '∏'}
                  </span>

                  <div className="flex items-center gap-1 text-xs">
                    <span className="font-serif italic text-slate-700 dark:text-slate-300">
                      {variable} =
                    </span>
                    <button
                      id="lower-bound"
                      type="button"
                      role="textbox"
                      aria-readonly="true"
                      data-lcd-slot="true"
                      data-testid="lcd-slot-lower"
                      data-value={lowerBound}
                      aria-label={t.seriesLowerAria}
                      onClick={() => onSelectField('lower')}
                      className={slotBtnClass('lower', true, !lowerBound.trim())}
                    >
                      {renderSlotContent('lower', lowerBound, 'bound')}
                    </button>
                  </div>
                </div>

                <span className="text-2xl font-light text-slate-400">(</span>
                <button
                  id="expr-input"
                  type="button"
                  role="textbox"
                  aria-readonly="true"
                  data-lcd-slot="true"
                  data-testid="lcd-slot-expr"
                  data-value={expression}
                  aria-label={t.seriesTermAria}
                  onClick={() => onSelectField('expr')}
                  className={`${slotBtnClass('expr', false, !expression.trim())} min-w-[110px] flex-1 justify-start overflow-x-auto`}
                >
                  {renderSlotContent('expr', expression, 'expr')}
                </button>
                <span className="text-2xl font-light text-slate-400">)</span>
              </div>

              <div
                dir={textDir}
                data-lcd-inline-control="true"
                className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800"
              >
                <span className="text-slate-500 dark:text-slate-400">{t.quickSeriesUpper}</span>
                <div dir="ltr" className="flex flex-wrap items-center gap-1">
                  {[
                    { label: '5', val: '5' },
                    { label: '10', val: '10' },
                    { label: '20', val: '20' },
                    { label: '100', val: '100' },
                    { label: '+∞', val: 'oo' },
                  ].map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => onQuickSeriesUpper(q.val)}
                      className={`min-h-[26px] rounded border px-2 font-mono text-[11px] font-semibold transition-colors ${
                        upperBound === q.val
                          ? 'border-[#0284c7] bg-sky-50 text-[#0369a1] dark:border-sky-500 dark:bg-sky-950/60 dark:text-sky-300'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {operation === 'matrix' && (
            <div className="space-y-2.5">
              {/* Inline Matrix Operation & Dimension Controls */}
              <div
                dir={textDir}
                data-lcd-inline-control="true"
                className="space-y-2 border-b border-slate-100 pb-2 text-[11px] dark:border-slate-800"
              >
                <div dir="ltr" className="flex flex-wrap items-center gap-1">
                  {matrixOpOptions.map((mOpt) => (
                    <button
                      key={mOpt.id}
                      type="button"
                      data-testid={`matrix-op-${mOpt.id}`}
                      aria-label={mOpt.aria}
                      aria-pressed={matrixOp === mOpt.id}
                      onClick={() => onChangeMatrixOp(mOpt.id)}
                      className={`min-h-[26px] whitespace-nowrap rounded border px-1.5 font-mono text-[11px] font-bold transition-colors ${
                        matrixOp === mOpt.id
                          ? 'border-[#0284c7] bg-[#0284c7] text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      {mOpt.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{t.dimsA}</span>
                    <div dir="ltr" className="inline-flex items-center gap-1 font-mono">
                      <button
                        type="button"
                        aria-label={t.reduceRows('A')}
                        onClick={() => onChangeMatrixDim('A', Math.max(1, matrixA.length - 1), matrixA[0].length)}
                        className="h-6 w-6 rounded border border-slate-300 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        −
                      </button>
                      <span className="px-1 font-bold text-slate-800 dark:text-slate-100">
                        {matrixA.length}
                      </span>
                      <button
                        type="button"
                        aria-label={t.increaseRows('A')}
                        onClick={() => onChangeMatrixDim('A', Math.min(4, matrixA.length + 1), matrixA[0].length)}
                        className="h-6 w-6 rounded border border-slate-300 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        +
                      </button>
                      <span className="px-0.5 text-slate-400">×</span>
                      <button
                        type="button"
                        aria-label={t.reduceCols('A')}
                        onClick={() => onChangeMatrixDim('A', matrixA.length, Math.max(1, matrixA[0].length - 1))}
                        className="h-6 w-6 rounded border border-slate-300 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        −
                      </button>
                      <span className="px-1 font-bold text-slate-800 dark:text-slate-100">
                        {matrixA[0].length}
                      </span>
                      <button
                        type="button"
                        aria-label={t.increaseCols('A')}
                        onClick={() => onChangeMatrixDim('A', matrixA.length, Math.min(4, matrixA[0].length + 1))}
                        className="h-6 w-6 rounded border border-slate-300 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {isBinaryMatrixOp(matrixOp) && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{t.dimsB}</span>
                      <div dir="ltr" className="inline-flex items-center gap-1 font-mono">
                        <button
                          type="button"
                          aria-label={t.reduceRows('B')}
                          onClick={() => onChangeMatrixDim('B', Math.max(1, matrixB.length - 1), matrixB[0].length)}
                          className="h-6 w-6 rounded border border-slate-300 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          −
                        </button>
                        <span className="px-1 font-bold text-slate-800 dark:text-slate-100">
                          {matrixB.length}
                        </span>
                        <button
                          type="button"
                          aria-label={t.increaseRows('B')}
                          onClick={() => onChangeMatrixDim('B', Math.min(4, matrixB.length + 1), matrixB[0].length)}
                          className="h-6 w-6 rounded border border-slate-300 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          +
                        </button>
                        <span className="px-0.5 text-slate-400">×</span>
                        <button
                          type="button"
                          aria-label={t.reduceCols('B')}
                          onClick={() => onChangeMatrixDim('B', matrixB.length, Math.max(1, matrixB[0].length - 1))}
                          className="h-6 w-6 rounded border border-slate-300 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          −
                        </button>
                        <span className="px-1 font-bold text-slate-800 dark:text-slate-100">
                          {matrixB[0].length}
                        </span>
                        <button
                          type="button"
                          aria-label={t.increaseCols('B')}
                          onClick={() => onChangeMatrixDim('B', matrixB.length, Math.min(4, matrixB[0].length + 1))}
                          className="h-6 w-6 rounded border border-slate-300 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Interactive Bracketed Matrix Cells inside LCD */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 py-1">
                {matrixOp === 'det' && (
                  <span className="font-serif text-lg font-semibold text-slate-800 dark:text-slate-200">
                    det
                  </span>
                )}
                {matrixOp === 'trace' && (
                  <span className="font-serif text-lg font-semibold text-slate-800 dark:text-slate-200">
                    tr
                  </span>
                )}
                {matrixOp === 'rank' && (
                  <span className="font-serif text-lg font-semibold text-slate-800 dark:text-slate-200">
                    rank
                  </span>
                )}
                {matrixOp === 'rref' && (
                  <span className="font-serif text-lg font-semibold text-slate-800 dark:text-slate-200">
                    rref
                  </span>
                )}
                {matrixOp === 'eigen' && (
                  <span className="font-serif text-lg font-semibold text-slate-800 dark:text-slate-200">
                    eig
                  </span>
                )}

                {renderMatrixBracketGrid('A', matrixA)}

                {matrixOp === 'inv' && (
                  <sup className="-ml-1 font-mono text-sm font-bold text-[#0369a1] dark:text-sky-400">
                    −1
                  </sup>
                )}
                {matrixOp === 'transpose' && (
                  <sup className="-ml-1 font-mono text-sm font-bold text-[#0369a1] dark:text-sky-400">
                    T
                  </sup>
                )}

                {isBinaryMatrixOp(matrixOp) && (
                  <>
                    <span className="font-mono text-lg font-bold text-slate-700 dark:text-slate-300">
                      {matrixOp === 'add'
                        ? '+'
                        : matrixOp === 'sub'
                          ? '−'
                          : matrixOp === 'mul'
                            ? '×'
                            : '· X ='}
                    </span>
                    {renderMatrixBracketGrid('B', matrixB)}
                  </>
                )}
              </div>
            </div>
          )}

          {operation === 'evaluate' && (
            <div className="inline-flex min-w-full flex-wrap items-center gap-2">
              <button
                id="expr-input"
                type="button"
                role="textbox"
                aria-readonly="true"
                data-lcd-slot="true"
                data-testid="lcd-slot-expr"
                data-value={expression}
                aria-label={t.exprSlotAria}
                onClick={() => onSelectField('expr')}
                className={`${slotBtnClass('expr', false, !expression.trim())} w-full justify-start overflow-x-auto`}
              >
                {renderSlotContent('expr', expression, 'expr')}
              </button>

              {exprHasVars && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-serif italic text-slate-600 dark:text-slate-400">
                    {t.evalAtWord} {variable}₀ =
                  </span>
                  <button
                    id="deriv-eval-at"
                    type="button"
                    role="textbox"
                    aria-readonly="true"
                    data-lcd-slot="true"
                    data-testid="lcd-slot-derivEvalAt"
                    data-value={derivEvalAt}
                    aria-label={t.derivEvalAria}
                    onClick={() => onSelectField('derivEvalAt')}
                    className={slotBtnClass('derivEvalAt', true, !derivEvalAt.trim())}
                  >
                    {renderSlotContent('derivEvalAt', derivEvalAt, 'bound', t.optionalPlaceholder)}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom-Right LCD Answer Readout (just like HiPER screen) */}
        <div
          dir="ltr"
          className="mt-2 flex min-h-[26px] items-center justify-end border-t border-slate-100 pt-1.5 font-mono text-sm font-bold tabular-nums dark:border-slate-800/80"
        >
          {answerError ? (
            <span dir={textDir} className="truncate text-xs font-medium text-rose-600 dark:text-rose-400">
              {answerError}
            </span>
          ) : answerSummary ? (
            /[\u0600-\u06FF]|[a-zA-Z]{3,}/.test(answerSummary) ? (
              <span dir={textDir} className="truncate font-sans text-xs font-semibold text-[#059669] dark:text-emerald-400">
                {answerSummary.replace(/^=\s*/, '')}
              </span>
            ) : (
              <span className="truncate text-[#059669] dark:text-emerald-400">
                {answerSummary}
              </span>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
