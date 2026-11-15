import { forwardRef } from 'react';
import { UI_TEXT } from '../i18n';
import { PdfDocumentData } from '../utils/pdfExportModel';
import { MathBlock, MathText } from './MathDisplay';

interface PdfExportSheetProps {
  data: PdfDocumentData | null;
}

export const PdfExportSheet = forwardRef<HTMLDivElement, PdfExportSheetProps>(
  function PdfExportSheet({ data }, ref) {
    if (!data) return null;

    const tp = UI_TEXT[data.lang].pdf;
    const tSteps = UI_TEXT[data.lang].steps;
    const isRtl = data.dir === 'rtl';

    return (
      <div
        ref={ref}
        dir={data.dir}
        lang={data.lang}
        data-testid="pdf-export-sheet"
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-99999px',
          top: 0,
          width: '720px',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          fontFamily: '"IBM Plex Sans Arabic", system-ui, -apple-system, sans-serif',
          zIndex: -1,
          pointerEvents: 'none',
        }}
      >
        {/* Block 1: Header + Problem Statement (+ Optional Blank Workspace) */}
        <div
          data-pdf-block="true"
          style={{
            backgroundColor: '#ffffff',
            padding: '20px 32px 16px 32px',
          }}
        >
          {/* Document Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              borderBottom: '2px solid #2563eb',
              paddingBottom: '12px',
              marginBottom: '18px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '4px',
                }}
              >
                {data.headerTitle}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '12px',
                  color: '#475569',
                }}
              >
                <span style={{ fontWeight: 600, color: '#1d4ed8' }}>{data.operationLabel}</span>
                <span>·</span>
                <span>{data.angleBadge}</span>
              </div>
            </div>

            <div
              style={{
                fontSize: '12px',
                color: '#64748b',
                textAlign: isRtl ? 'left' : 'right',
                whiteSpace: 'nowrap',
              }}
            >
              {data.dateLabel}
            </div>
          </div>

          {/* Problem Statement Box */}
          <div
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              backgroundColor: '#f8fafc',
              padding: '16px 20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '10px',
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#334155',
                }}
              >
                {data.problemLabel}
              </span>
              {data.problemNote && (
                <span
                  style={{
                    fontSize: '12px',
                    color: '#475569',
                    fontWeight: 500,
                  }}
                >
                  {data.problemNote}
                </span>
              )}
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px 14px',
                color: '#0f172a',
                fontSize: '20px',
              }}
            >
              <MathBlock latex={data.problemLatex} displayMode={true} />
            </div>
          </div>

          {/* Blank Practice Workspace when exporting WITHOUT solution */}
          {!data.includeSolution && (
            <div
              style={{
                marginTop: '22px',
                border: '1px dashed #94a3b8',
                borderRadius: '10px',
                backgroundColor: '#ffffff',
                padding: '16px 20px 20px 20px',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#64748b',
                  marginBottom: '16px',
                }}
              >
                {data.workspaceLabel}
              </div>
              {Array.from({ length: 12 }).map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    height: '44px',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Block 2: Final Solution Card (when includeSolution === true) */}
        {data.includeSolution && data.solution && (
          <div
            data-pdf-block="true"
            style={{
              backgroundColor: '#ffffff',
              padding: '6px 32px 14px 32px',
            }}
          >
            <div
              style={{
                border: '1.5px solid #93c5fd',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                padding: '14px 18px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginBottom: '10px',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e3a8a' }}>
                  {tp.answerLabel}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#1d4ed8' }}>
                  {data.solution.methodLabel}
                </span>
              </div>

              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  padding: '14px 12px',
                  color: '#0f172a',
                  fontSize: '19px',
                }}
              >
                <MathBlock latex={data.solution.answerLatex} displayMode={true} />
              </div>

              {data.solution.decimalLabel && data.solution.decimalValue && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: '12px',
                    marginTop: '10px',
                    paddingTop: '10px',
                    borderTop: '1px solid #bfdbfe',
                  }}
                >
                  <span style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>
                    {data.solution.decimalLabel}
                  </span>
                  <span
                    dir="ltr"
                    style={{
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#1d4ed8',
                    }}
                  >
                    {data.solution.decimalValue}
                  </span>
                </div>
              )}

              {data.solution.antiderivativeLatex && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    marginTop: '8px',
                    fontSize: '12px',
                    color: '#334155',
                  }}
                >
                  <span>{UI_TEXT[data.lang].result.antiderivLabel('x')}</span>
                  <MathBlock latex={data.solution.antiderivativeLatex} displayMode={false} />
                </div>
              )}

              {data.solution.oneSidedLimits && data.solution.oneSidedLimits.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    marginTop: '10px',
                  }}
                >
                  {data.solution.oneSidedLimits.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ color: '#475569', marginBottom: '4px' }}>{item.label}</div>
                      <MathBlock latex={item.latex} displayMode={false} />
                    </div>
                  ))}
                </div>
              )}

              {data.solution.taylorSummary && (
                <div
                  style={{
                    marginTop: '10px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '6px',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#475569', marginBottom: '6px' }}>
                    {data.solution.taylorSummary.label}
                  </div>
                  <MathBlock latex={data.solution.taylorSummary.latex} displayMode={true} />
                </div>
              )}

              {data.solution.warnings.length > 0 && (
                <div
                  style={{
                    marginTop: '10px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fcd34d',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: '#92400e',
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>{tp.warningsLabel}</div>
                  {data.solution.warnings.map((w, idx) => (
                    <div key={idx}>{w}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Block 3: Graph Snapshot (when available) */}
        {data.includeSolution && data.graphDataUrl && (
          <div
            data-pdf-block="true"
            style={{
              backgroundColor: '#ffffff',
              padding: '6px 32px 14px 32px',
            }}
          >
            <div
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                backgroundColor: '#ffffff',
                padding: '12px 16px',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '10px',
                }}
              >
                {tp.graphLabel}
              </div>
              <img
                src={data.graphDataUrl}
                alt={tp.graphLabel}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                }}
              />
              {data.graphLegend.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px',
                    marginTop: '8px',
                    fontSize: '11px',
                    color: '#475569',
                  }}
                >
                  {data.graphLegend.map((lbl, idx) => (
                    <span key={idx}>• {lbl}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Block 4: Steps Section Heading */}
        {data.includeSolution && data.solution && data.solution.steps.length > 0 && (
          <div
            data-pdf-block="true"
            style={{
              backgroundColor: '#ffffff',
              padding: '8px 32px 6px 32px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #cbd5e1',
                paddingBottom: '6px',
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                {tp.stepsLabel}
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {tSteps.stepCount(data.solution.steps.length)}
              </span>
            </div>
          </div>
        )}

        {/* Blocks 5..N: Individual Step Cards (never split mid-step across PDF pages) */}
        {data.includeSolution &&
          data.solution &&
          data.solution.steps.map((step, idx) => (
            <div
              key={`${step.id}-${idx}`}
              data-pdf-block="true"
              style={{
                backgroundColor: '#ffffff',
                padding: '5px 32px',
              }}
            >
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  padding: '12px 14px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '6px',
                  }}
                >
                  <span
                    dir="ltr"
                    style={{
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#2563eb',
                    }}
                  >
                    {String(idx + 1).padStart(2, '0')}.
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    {step.title}
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>·</span>
                  <span
                    dir="ltr"
                    style={{
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontSize: '11px',
                      color: '#475569',
                    }}
                  >
                    {step.rule}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: '15px',
                    lineHeight: 1.7,
                    color: '#1e293b',
                    marginBottom: '10px',
                  }}
                >
                  <MathText text={step.explanation} />
                </div>

                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    color: '#0f172a',
                  }}
                >
                  <MathBlock latex={step.latex} displayMode={true} />
                </div>
              </div>
            </div>
          ))}

        {/* Final Block: Simpson Sample Table if present */}
        {data.includeSolution && data.solution?.simpsonData && (
          <div
            data-pdf-block="true"
            style={{
              backgroundColor: '#ffffff',
              padding: '8px 32px 16px 32px',
            }}
          >
            <div
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '12px 14px',
                backgroundColor: '#ffffff',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                  {tSteps.simpsonTitle}
                </span>
                <span
                  dir="ltr"
                  style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: '11px',
                    color: '#475569',
                  }}
                >
                  h = {Number(data.solution.simpsonData.h.toPrecision(6))} · n ={' '}
                  {data.solution.simpsonData.n}
                </span>
              </div>
              <table
                dir="ltr"
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: '11px',
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>
                    <th style={{ padding: '6px 8px', borderBottom: '1px solid #cbd5e1' }}>i</th>
                    <th style={{ padding: '6px 8px', borderBottom: '1px solid #cbd5e1' }}>xᵢ</th>
                    <th style={{ padding: '6px 8px', borderBottom: '1px solid #cbd5e1' }}>f(xᵢ)</th>
                    <th style={{ padding: '6px 8px', borderBottom: '1px solid #cbd5e1' }}>wᵢ</th>
                    <th style={{ padding: '6px 8px', borderBottom: '1px solid #cbd5e1' }}>
                      wᵢ · f(xᵢ)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.solution.simpsonData.samples.map((row) => (
                    <tr key={row.i}>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #e2e8f0' }}>
                        {row.i}
                      </td>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #e2e8f0' }}>
                        {row.x.toFixed(4)}
                      </td>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #e2e8f0' }}>
                        {Number.isFinite(row.fx) ? row.fx.toFixed(6) : 'NaN'}
                      </td>
                      <td
                        style={{
                          padding: '5px 8px',
                          borderBottom: '1px solid #e2e8f0',
                          color: '#2563eb',
                          fontWeight: 600,
                        }}
                      >
                        {row.weight}
                      </td>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #e2e8f0' }}>
                        {Number.isFinite(row.fx) ? (row.weight * row.fx).toFixed(6) : 'NaN'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }
);
