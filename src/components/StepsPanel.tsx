import { ChevronDown, ChevronUp, ListOrdered } from 'lucide-react';
import { useState } from 'react';
import { AppLang, UI_TEXT, localizeStep } from '../i18n';
import { IntegrationResult, SolutionStep } from '../math/integrator';
import { MathBlock, MathText } from './MathDisplay';

interface StepsPanelProps {
  lang: AppLang;
  steps: SolutionStep[];
  simpsonData?: IntegrationResult['simpsonData'];
}

export function StepsPanel({ lang, steps, simpsonData }: StepsPanelProps) {
  const t = UI_TEXT[lang].steps;
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const allExpanded = collapsedIds.size === 0;

  const toggleStep = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allExpanded) {
      setCollapsedIds(new Set(steps.map((s) => s.id)));
    } else {
      setCollapsedIds(new Set());
    }
  };

  return (
    <section
      aria-label={t.aria}
      className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <ListOrdered className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t.heading}
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t.stepCount(steps.length)}
          </span>
        </div>

        {steps.length > 1 && (
          <button
            type="button"
            onClick={toggleAll}
            className="min-h-[36px] whitespace-nowrap shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {allExpanded ? t.collapseAll : t.expandAll}
          </button>
        )}
      </div>

      <ol className="space-y-3" data-testid="solution-steps-list">
        {steps.map((rawStep, index) => {
          const step = localizeStep(rawStep, lang);
          const isCollapsed = collapsedIds.has(step.id);
          const stepNumber = String(index + 1).padStart(2, '0');
          return (
            <li
              key={step.id}
              className="rounded-lg border border-slate-200/80 bg-slate-50/50 transition-colors dark:border-slate-800 dark:bg-slate-950/40"
            >
              <button
                type="button"
                aria-expanded={!isCollapsed}
                onClick={() => toggleStep(step.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                  <span className="font-mono text-xs font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                    {stepNumber}.
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {step.title}
                  </span>
                  <span className="hidden text-xs text-slate-400 sm:inline" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {step.rule}
                  </span>
                </div>
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                ) : (
                  <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                )}
              </button>

              {!isCollapsed && (
                <div className="border-t border-slate-200/60 px-4 py-3.5 dark:border-slate-800/80">
                  <p className="mb-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    <MathText text={step.explanation} />
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-slate-200/80 bg-white px-3 py-3 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                    <MathBlock latex={step.latex} displayMode={true} />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {simpsonData && (
        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t.simpsonTitle}
            </h3>
            <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
              h = {Number(simpsonData.h.toPrecision(6))} · n = {simpsonData.n}
            </span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table dir="ltr" className="w-full text-left font-mono text-xs tabular-nums">
              <thead className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-2">i</th>
                  <th className="px-3 py-2">xᵢ</th>
                  <th className="px-3 py-2">f(xᵢ)</th>
                  <th className="px-3 py-2">wᵢ</th>
                  <th className="px-3 py-2">wᵢ · f(xᵢ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {simpsonData.samples.map((row) => (
                  <tr key={row.i} className="bg-white dark:bg-slate-900">
                    <td className="px-3 py-1.5 text-slate-500">{row.i}</td>
                    <td className="px-3 py-1.5 text-slate-800 dark:text-slate-200">
                      {row.x.toFixed(4)}
                    </td>
                    <td className="px-3 py-1.5 text-slate-800 dark:text-slate-200">
                      {Number.isFinite(row.fx) ? row.fx.toFixed(6) : 'NaN'}
                    </td>
                    <td className="px-3 py-1.5 text-blue-600 dark:text-blue-400">{row.weight}</td>
                    <td className="px-3 py-1.5 text-slate-900 dark:text-slate-100">
                      {Number.isFinite(row.fx) ? (row.weight * row.fx).toFixed(6) : 'NaN'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
