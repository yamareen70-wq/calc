import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppLang, UI_TEXT } from '../i18n';
import { ExprNode, evaluate, parseExpr } from '../math/ast';
import { DerivativeResult } from '../math/derivatives';
import { IntegrationResult } from '../math/integrator';
import { LimitResult } from '../math/limits';

export type GraphPayload =
  | { kind: 'integral'; result: IntegrationResult }
  | { kind: 'limit'; result: LimitResult }
  | { kind: 'derivative'; result: DerivativeResult };

interface IntegralGraphProps {
  lang: AppLang;
  payload: GraphPayload;
  isDark: boolean;
}

function computeDomain(payload: GraphPayload, zoom: number): { xMin: number; xMax: number } {
  let center = 0;
  let halfSpan = 5;

  if (payload.kind === 'integral') {
    const r = payload.result;
    if (r.isDefinite && r.lowerBound && r.upperBound) {
      const a = r.lowerBound.value === '-inf' ? -6 : r.lowerBound.value === '+inf' ? 6 : r.lowerBound.value;
      const b = r.upperBound.value === '-inf' ? -6 : r.upperBound.value === '+inf' ? 6 : r.upperBound.value;
      if (typeof a === 'number' && typeof b === 'number' && Number.isFinite(a) && Number.isFinite(b)) {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        center = (lo + hi) / 2;
        halfSpan = Math.max((hi - lo) * 0.85, 2.5);
      }
    }
  } else if (payload.kind === 'limit') {
    const tVal = payload.result.target.value;
    if (tVal === '+inf') {
      center = 25;
      halfSpan = 20;
    } else if (tVal === '-inf') {
      center = -25;
      halfSpan = 20;
    } else if (typeof tVal === 'number' && Number.isFinite(tVal)) {
      center = tVal;
      halfSpan = 3.5;
    }
  }

  const scaledSpan = halfSpan / zoom;
  return {
    xMin: center - scaledSpan,
    xMax: center + scaledSpan,
  };
}

function computeYBounds(
  integrandNode: ExprNode | null,
  domain: { xMin: number; xMax: number },
  variable: string,
  showSecondary: boolean,
  secondaryNode: ExprNode | null,
  numericAntiderivSamples: { xs: number[]; vals: number[] } | null,
  payload: GraphPayload
): { yMin: number; yMax: number } {
  if (!integrandNode) return { yMin: -5, yMax: 5 };
  const samples = 240;
  const ys: number[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = domain.xMin + ((domain.xMax - domain.xMin) * i) / samples;
    const y = evaluate(integrandNode, { [variable]: x });
    if (Number.isFinite(y) && Math.abs(y) < 1e4) {
      ys.push(y);
    }
    if (showSecondary && secondaryNode) {
      const sy = evaluate(secondaryNode, { [variable]: x });
      if (Number.isFinite(sy) && Math.abs(sy) < 1e4) {
        ys.push(sy);
      }
    }
  }
  if (showSecondary && numericAntiderivSamples) {
    for (const fy of numericAntiderivSamples.vals) {
      if (Number.isFinite(fy) && Math.abs(fy) < 1e4) ys.push(fy);
    }
  }
  if (
    payload.kind === 'limit' &&
    payload.result.exists &&
    payload.result.value !== undefined &&
    Number.isFinite(payload.result.value)
  ) {
    ys.push(payload.result.value);
  }
  if (ys.length === 0) return { yMin: -5, yMax: 5 };
  const sorted = [...ys].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.03)];
  const hi = sorted[Math.floor(sorted.length * 0.97)];
  const span = Math.max(hi - lo, 2);
  const pad = span * 0.22;
  return {
    yMin: Math.min(lo - pad, -0.5),
    yMax: Math.max(hi + pad, 0.5),
  };
}

export function renderLightGraphDataUrl(payload: GraphPayload): string | null {
  if (typeof document === 'undefined') return null;
  let integrandNode: ExprNode;
  try {
    integrandNode = parseExpr(payload.result.integrandText);
  } catch {
    return null;
  }

  const variable = payload.result.variable;
  const domain = computeDomain(payload, 1);
  const yBounds = computeYBounds(integrandNode, domain, variable, false, null, null, payload);

  const W = 680;
  const H = 260;
  const dpr = 2;
  const canvas = document.createElement('canvas');
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  drawPlotToContext({
    ctx,
    W,
    H,
    integrandNode,
    secondaryNode: null,
    numericAntiderivSamples: null,
    domain,
    yBounds,
    isDark: false,
    payload,
    showSecondary: false,
    probe: null,
    variable,
  });

  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

export function IntegralGraph({ lang, payload, isDark }: IntegralGraphProps) {
  const t = UI_TEXT[lang].graph;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showSecondary, setShowSecondary] = useState(false);
  const [probe, setProbe] = useState<{ x: number; y: number } | null>(null);

  const variable = payload.result.variable;
  const integrandText = payload.result.integrandText;

  const integrandNode: ExprNode | null = useMemo(() => {
    try {
      return parseExpr(integrandText);
    } catch {
      return null;
    }
  }, [integrandText]);

  const secondaryNode: ExprNode | null = useMemo(() => {
    if (payload.kind === 'integral') return payload.result.antiderivative ?? null;
    if (payload.kind === 'derivative') return payload.result.derivative ?? null;
    return null;
  }, [payload]);

  const canToggleSecondary =
    (payload.kind === 'integral' &&
      (Boolean(payload.result.antiderivative) || Boolean(payload.result.nonElementary))) ||
    (payload.kind === 'derivative' && Boolean(payload.result.derivative));

  const domain = useMemo(() => computeDomain(payload, zoom), [payload, zoom]);

  const resetKey =
    payload.kind === 'integral'
      ? `${payload.kind}-${integrandText}-${payload.result.lowerBound?.raw ?? ''}-${payload.result.upperBound?.raw ?? ''}`
      : payload.kind === 'limit'
        ? `${payload.kind}-${integrandText}-${payload.result.target.raw}`
        : `${payload.kind}-${integrandText}`;

  useEffect(() => {
    setZoom(1);
    setProbe(null);
  }, [resetKey]);

  // Cumulative numerical antiderivative F(x) for non-elementary integrals
  const numericAntiderivSamples = useMemo(() => {
    if (
      payload.kind !== 'integral' ||
      !showSecondary ||
      payload.result.antiderivative ||
      !integrandNode
    ) {
      return null;
    }
    const x0 = payload.result.taylorSeries?.x0 ?? 0;
    const N = 240;
    const dx = (domain.xMax - domain.xMin) / N;
    const xs: number[] = [];
    const vals: number[] = [];
    const evalSafe = (xv: number) => {
      const y = evaluate(integrandNode, { [variable]: xv });
      return Number.isFinite(y) && Math.abs(y) < 1e4 ? y : NaN;
    };
    const rawValues: number[] = new Array(N + 1).fill(NaN);
    for (let i = 0; i <= N; i++) {
      xs.push(domain.xMin + i * dx);
    }
    const integrateSeg = (a: number, b: number, steps = 16): number => {
      if (Math.abs(b - a) < 1e-12) return 0;
      const h = (b - a) / steps;
      let sum = 0;
      for (let k = 0; k < steps; k++) {
        const xm = a + (k + 0.5) * h;
        const ym = evalSafe(xm);
        if (!Number.isFinite(ym)) return NaN;
        sum += ym;
      }
      return sum * h;
    };

    if (x0 <= domain.xMin) {
      let acc = integrateSeg(x0, domain.xMin, 64);
      rawValues[0] = acc;
      for (let i = 1; i <= N; i++) {
        const seg = integrateSeg(xs[i - 1], xs[i], 4);
        acc = Number.isFinite(acc) && Number.isFinite(seg) ? acc + seg : NaN;
        rawValues[i] = acc;
      }
    } else if (x0 >= domain.xMax) {
      let acc = integrateSeg(x0, domain.xMax, 64);
      rawValues[N] = acc;
      for (let i = N - 1; i >= 0; i--) {
        const seg = integrateSeg(xs[i + 1], xs[i], 4);
        acc = Number.isFinite(acc) && Number.isFinite(seg) ? acc + seg : NaN;
        rawValues[i] = acc;
      }
    } else {
      const idx0 = Math.max(0, Math.min(N, Math.round((x0 - domain.xMin) / dx)));
      let accR = integrateSeg(x0, xs[idx0], 8);
      rawValues[idx0] = accR;
      for (let i = idx0 + 1; i <= N; i++) {
        const seg = integrateSeg(xs[i - 1], xs[i], 4);
        accR = Number.isFinite(accR) && Number.isFinite(seg) ? accR + seg : NaN;
        rawValues[i] = accR;
      }
      let accL = rawValues[idx0];
      for (let i = idx0 - 1; i >= 0; i--) {
        const seg = integrateSeg(xs[i + 1], xs[i], 4);
        accL = Number.isFinite(accL) && Number.isFinite(seg) ? accL + seg : NaN;
        rawValues[i] = accL;
      }
    }
    for (let i = 0; i <= N; i++) vals.push(rawValues[i]);
    return { xs, vals };
  }, [payload, showSecondary, integrandNode, domain, variable]);

  const yBounds = useMemo(
    () =>
      computeYBounds(
        integrandNode,
        domain,
        variable,
        showSecondary,
        secondaryNode,
        numericAntiderivSamples,
        payload
      ),
    [integrandNode, domain, variable, showSecondary, secondaryNode, numericAntiderivSamples, payload]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !integrandNode) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawPlotToContext({
      ctx,
      W: rect.width,
      H: rect.height,
      integrandNode,
      secondaryNode,
      numericAntiderivSamples,
      domain,
      yBounds,
      isDark,
      payload,
      showSecondary,
      probe,
      variable,
    });
  }, [integrandNode, secondaryNode, domain, yBounds, isDark, payload, showSecondary, numericAntiderivSamples, probe, variable]);

  const handlePointerMove = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !integrandNode) return;
    const rect = canvas.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const xVal = domain.xMin + relX * (domain.xMax - domain.xMin);
    const yVal = evaluate(integrandNode, { [variable]: xVal });
    setProbe({ x: xVal, y: yVal });
  };

  const secondaryLabel =
    payload.kind === 'derivative' ? t.showFPrime(variable) : t.showAntideriv(variable);

  return (
    <section
      aria-label={t.aria}
      className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t.title}{' '}
            {payload.kind === 'integral' && payload.result.isDefinite
              ? t.titleAreaSuffix
              : payload.kind === 'limit'
                ? t.titleLimitSuffix
                : ''}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {canToggleSecondary && (
            <button
              type="button"
              onClick={() => setShowSecondary((v) => !v)}
              className={`min-h-[36px] whitespace-nowrap shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                showSecondary
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {secondaryLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(z * 1.4, 8))}
            aria-label={t.zoomIn}
            className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <ZoomIn className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(z / 1.4, 0.25))}
            aria-label={t.zoomOut}
            className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <ZoomOut className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            aria-label={t.resetZoom}
            className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
        <canvas
          ref={canvasRef}
          dir="ltr"
          data-testid="integral-graph-canvas"
          onMouseMove={(e) => handlePointerMove(e.clientX)}
          onMouseLeave={() => setProbe(null)}
          onTouchMove={(e) => {
            if (e.touches[0]) handlePointerMove(e.touches[0].clientX);
          }}
          className="h-[240px] w-full cursor-crosshair touch-pan-y sm:h-[280px]"
        />

        {probe && (
          <div
            dir="ltr"
            className="pointer-events-none absolute top-2.5 left-2.5 rounded-md border border-slate-200/90 bg-white/95 px-2.5 py-1 font-mono text-xs tabular-nums text-slate-800 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100"
          >
            {variable} = {probe.x.toFixed(3)} · f({variable}) ={' '}
            {Number.isFinite(probe.y) ? probe.y.toFixed(4) : t.undefinedText}
          </div>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-blue-600 dark:bg-blue-400" aria-hidden="true" />
          <span>{t.legendCurve(variable)}</span>
        </span>
        {payload.kind === 'integral' && payload.result.isDefinite && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-xs bg-blue-600/25 dark:bg-blue-400/35"
              aria-hidden="true"
            />
            <span>{t.legendArea}</span>
          </span>
        )}
        {payload.kind === 'limit' && payload.result.exists && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full border-2 border-emerald-600 dark:border-emerald-400"
              aria-hidden="true"
            />
            <span>{t.legendLimit}</span>
          </span>
        )}
        {showSecondary && canToggleSecondary && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-0.5 w-4 border-b-2 border-dashed border-emerald-600 dark:border-emerald-400"
              aria-hidden="true"
            />
            <span>
              {payload.kind === 'derivative'
                ? t.legendDeriv(variable)
                : t.legendAntideriv(variable)}
            </span>
          </span>
        )}
      </div>
    </section>
  );
}

interface DrawPlotArgs {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  integrandNode: ExprNode;
  secondaryNode: ExprNode | null;
  numericAntiderivSamples: { xs: number[]; vals: number[] } | null;
  domain: { xMin: number; xMax: number };
  yBounds: { yMin: number; yMax: number };
  isDark: boolean;
  payload: GraphPayload;
  showSecondary: boolean;
  probe: { x: number; y: number } | null;
  variable: string;
}

function drawPlotToContext({
  ctx,
  W,
  H,
  integrandNode,
  secondaryNode,
  numericAntiderivSamples,
  domain,
  yBounds,
  isDark,
  payload,
  showSecondary,
  probe,
  variable,
}: DrawPlotArgs) {
  const toPxX = (x: number) => ((x - domain.xMin) / (domain.xMax - domain.xMin)) * W;
  const toPxY = (y: number) => H - ((y - yBounds.yMin) / (yBounds.yMax - yBounds.yMin)) * H;

  ctx.fillStyle = isDark ? '#0B1120' : '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  const xSpan = domain.xMax - domain.xMin;
  const ySpan = yBounds.yMax - yBounds.yMin;
  const niceStep = (span: number) => {
    const raw = span / 6;
    const pow10 = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / pow10;
    const mult = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
    return mult * pow10;
  };

  const xStep = niceStep(xSpan);
  const yStep = niceStep(ySpan);

  ctx.lineWidth = 1;
  ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.06)';

  const firstX = Math.ceil(domain.xMin / xStep) * xStep;
  for (let gx = firstX; gx <= domain.xMax; gx += xStep) {
    const px = toPxX(gx);
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, H);
    ctx.stroke();
  }

  const firstY = Math.ceil(yBounds.yMin / yStep) * yStep;
  for (let gy = firstY; gy <= yBounds.yMax; gy += yStep) {
    const py = toPxY(gy);
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(W, py);
    ctx.stroke();
  }

  const zeroX = toPxX(0);
  const zeroY = toPxY(0);
  ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(71, 85, 105, 0.35)';
  ctx.lineWidth = 1.25;
  if (zeroX >= 0 && zeroX <= W) {
    ctx.beginPath();
    ctx.moveTo(zeroX, 0);
    ctx.lineTo(zeroX, H);
    ctx.stroke();
  }
  if (zeroY >= 0 && zeroY <= H) {
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(W, zeroY);
    ctx.stroke();
  }

  ctx.direction = 'ltr';
  ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
  ctx.font = '11px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  for (let gx = firstX; gx <= domain.xMax; gx += xStep) {
    if (Math.abs(gx) < xStep * 0.1) continue;
    const px = toPxX(gx);
    const labelY = zeroY >= 14 && zeroY <= H - 16 ? zeroY + 14 : H - 6;
    ctx.fillText(Number(gx.toPrecision(3)).toString(), px, labelY);
  }

  ctx.textAlign = 'right';
  for (let gy = firstY; gy <= yBounds.yMax; gy += yStep) {
    if (Math.abs(gy) < yStep * 0.1) continue;
    const py = toPxY(gy);
    const labelX = zeroX >= 36 && zeroX <= W - 8 ? zeroX - 6 : 34;
    ctx.fillText(Number(gy.toPrecision(3)).toString(), labelX, py + 4);
  }

  if (payload.kind === 'integral' && payload.result.isDefinite && payload.result.lowerBound && payload.result.upperBound) {
    const r = payload.result;
    const rawA =
      r.lowerBound!.value === '-inf'
        ? domain.xMin
        : r.lowerBound!.value === '+inf'
          ? domain.xMax
          : r.lowerBound!.value;
    const rawB =
      r.upperBound!.value === '-inf'
        ? domain.xMin
        : r.upperBound!.value === '+inf'
          ? domain.xMax
          : r.upperBound!.value;
    const lo = Math.max(domain.xMin, Math.min(rawA, rawB));
    const hi = Math.min(domain.xMax, Math.max(rawA, rawB));

    if (hi > lo) {
      const steps = 220;
      const baseY = toPxY(0);
      for (let i = 0; i < steps; i++) {
        const x1 = lo + ((hi - lo) * i) / steps;
        const x2 = lo + ((hi - lo) * (i + 1)) / steps;
        const y1 = evaluate(integrandNode, { [variable]: x1 });
        const y2 = evaluate(integrandNode, { [variable]: x2 });
        if (!Number.isFinite(y1) || !Number.isFinite(y2)) continue;
        if (Math.abs(y1) > ySpan * 4 || Math.abs(y2) > ySpan * 4) continue;

        const px1 = toPxX(x1);
        const px2 = toPxX(x2);
        const py1 = toPxY(y1);
        const py2 = toPxY(y2);

        ctx.fillStyle =
          y1 + y2 >= 0
            ? isDark
              ? 'rgba(59, 130, 246, 0.28)'
              : 'rgba(37, 99, 235, 0.18)'
            : isDark
              ? 'rgba(245, 158, 11, 0.25)'
              : 'rgba(217, 119, 6, 0.18)';

        ctx.beginPath();
        ctx.moveTo(px1, baseY);
        ctx.lineTo(px1, py1);
        ctx.lineTo(px2, py2);
        ctx.lineTo(px2, baseY);
        ctx.closePath();
        ctx.fill();
      }

      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = isDark ? '#60A5FA' : '#2563EB';
      ctx.lineWidth = 1.25;
      for (const boundX of [rawA, rawB]) {
        const bpx = toPxX(boundX);
        if (bpx >= 0 && bpx <= W) {
          ctx.beginPath();
          ctx.moveTo(bpx, 0);
          ctx.lineTo(bpx, H);
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);
    }
  }

  if (showSecondary && (secondaryNode || numericAntiderivSamples)) {
    ctx.strokeStyle = isDark ? '#10B981' : '#059669';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 4]);
    if (secondaryNode) {
      drawCurve(ctx, secondaryNode, variable, domain.xMin, domain.xMax, ySpan, toPxX, toPxY, H);
    } else if (numericAntiderivSamples) {
      drawSampledCurve(ctx, numericAntiderivSamples.xs, numericAntiderivSamples.vals, ySpan, toPxX, toPxY, H);
    }
    ctx.setLineDash([]);
  }

  ctx.strokeStyle = isDark ? '#60A5FA' : '#2563EB';
  ctx.lineWidth = 2.4;
  drawCurve(ctx, integrandNode, variable, domain.xMin, domain.xMax, ySpan, toPxX, toPxY, H);

  if (payload.kind === 'limit') {
    const lim = payload.result;
    const tVal = lim.target.value;
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.3;
    if (typeof tVal === 'number' && Number.isFinite(tVal)) {
      const pxA = toPxX(tVal);
      if (pxA >= 0 && pxA <= W) {
        ctx.strokeStyle = isDark ? 'rgba(251, 191, 36, 0.7)' : 'rgba(217, 119, 6, 0.7)';
        ctx.beginPath();
        ctx.moveTo(pxA, 0);
        ctx.lineTo(pxA, H);
        ctx.stroke();
      }
    }
    if (lim.exists && lim.value !== undefined && Number.isFinite(lim.value)) {
      const pyL = toPxY(lim.value);
      if (pyL >= 0 && pyL <= H) {
        ctx.strokeStyle = isDark ? 'rgba(16, 185, 129, 0.75)' : 'rgba(5, 150, 105, 0.75)';
        ctx.beginPath();
        ctx.moveTo(0, pyL);
        ctx.lineTo(W, pyL);
        ctx.stroke();
      }
      if (typeof tVal === 'number' && Number.isFinite(tVal)) {
        const pxA = toPxX(tVal);
        if (pxA >= 0 && pxA <= W && pyL >= 0 && pyL <= H) {
          ctx.setLineDash([]);
          ctx.fillStyle = isDark ? '#0B1120' : '#FFFFFF';
          ctx.strokeStyle = isDark ? '#10B981' : '#059669';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(pxA, pyL, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    }
    ctx.setLineDash([]);
  }

  if (probe) {
    const px = toPxX(probe.x);
    const py = toPxY(probe.y);
    if (px >= 0 && px <= W && Number.isFinite(py)) {
      ctx.strokeStyle = isDark ? 'rgba(226, 232, 240, 0.35)' : 'rgba(15, 23, 42, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, H);
      ctx.stroke();
      if (py >= 0 && py <= H) {
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(W, py);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      if (py >= -10 && py <= H + 10) {
        ctx.fillStyle = isDark ? '#60A5FA' : '#2563EB';
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }
}

function drawCurve(
  ctx: CanvasRenderingContext2D,
  node: ExprNode,
  variable: string,
  xMin: number,
  xMax: number,
  ySpan: number,
  toPxX: (x: number) => number,
  toPxY: (y: number) => number,
  H: number
) {
  const N = 360;
  let drawing = false;
  let prevY = 0;

  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const x = xMin + ((xMax - xMin) * i) / N;
    const y = evaluate(node, { [variable]: x });
    if (!Number.isFinite(y) || Math.abs(y) > ySpan * 15) {
      drawing = false;
      continue;
    }
    const px = toPxX(x);
    const py = toPxY(y);
    if (py < -H * 2 || py > H * 3) {
      drawing = false;
      continue;
    }
    if (drawing && Math.abs(y - prevY) > ySpan * 2.5) {
      drawing = false;
    }
    if (!drawing) {
      ctx.moveTo(px, py);
      drawing = true;
    } else {
      ctx.lineTo(px, py);
    }
    prevY = y;
  }
  ctx.stroke();
}

function drawSampledCurve(
  ctx: CanvasRenderingContext2D,
  xs: number[],
  vals: number[],
  ySpan: number,
  toPxX: (x: number) => number,
  toPxY: (y: number) => number,
  H: number
) {
  let drawing = false;
  let prevY = 0;
  ctx.beginPath();
  for (let i = 0; i < xs.length; i++) {
    const y = vals[i];
    if (!Number.isFinite(y) || Math.abs(y) > ySpan * 15) {
      drawing = false;
      continue;
    }
    const px = toPxX(xs[i]);
    const py = toPxY(y);
    if (py < -H * 2 || py > H * 3) {
      drawing = false;
      continue;
    }
    if (drawing && Math.abs(y - prevY) > ySpan * 2.5) {
      drawing = false;
    }
    if (!drawing) {
      ctx.moveTo(px, py);
      drawing = true;
    } else {
      ctx.lineTo(px, py);
    }
    prevY = y;
  }
  ctx.stroke();
}
