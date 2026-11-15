import katex from 'katex';
import { useMemo } from 'react';

interface MathBlockProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

export function MathBlock({ latex, displayMode = true, className = '' }: MathBlockProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        strict: false,
        trust: false,
      });
    } catch {
      return latex;
    }
  }, [latex, displayMode]);

  return (
    <span
      dir="ltr"
      className={`math-ltr inline-block max-w-full ${displayMode ? 'block w-full text-center' : ''} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

interface MathTextProps {
  text: string;
  className?: string;
}

export function MathText({ text, className = '' }: MathTextProps) {
  const parts = useMemo(() => {
    const segments: Array<{ kind: 'text' | 'math'; content: string }> = [];
    let idx = 0;
    while (idx < text.length) {
      const start = text.indexOf('$', idx);
      if (start === -1) {
        segments.push({ kind: 'text', content: text.slice(idx) });
        break;
      }
      if (start > idx) {
        segments.push({ kind: 'text', content: text.slice(idx, start) });
      }
      const end = text.indexOf('$', start + 1);
      if (end === -1) {
        segments.push({ kind: 'text', content: text.slice(start) });
        break;
      }
      segments.push({ kind: 'math', content: text.slice(start + 1, end) });
      idx = end + 1;
    }
    return segments;
  }, [text]);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.kind === 'text' ? (
          <span key={i}>{part.content}</span>
        ) : (
          <MathBlock key={i} latex={part.content} displayMode={false} className="mx-1 align-middle" />
        )
      )}
    </span>
  );
}
