'use client';

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { TransactionChip } from './TransactionChip';

interface RichMessageRendererProps {
  content: string;
  verifiedClaims?: any[];
  onSelectTransaction: (id: string) => void;
}

// Helper to extract text recursively from React nodes
const extractText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node?.props?.children) return extractText(node.props.children);
  return '';
};

export const RichMessageRenderer: React.FC<RichMessageRendererProps> = ({
  content,
  onSelectTransaction,
}) => {
  // Normalize markdown to prevent parser collapse (e.g. lists following bold titles without blank line)
  const normalizedContent = useMemo(() => {
    if (!content) return '';
    return content
      // Normalize Windows CRLF
      .replace(/\r\n/g, '\n')
      // Ensure list items following bold headers have a blank line between them
      .replace(/(\*\*[^\n]+\*\*):?\n(?=[-*\d])/g, '$1:\n\n')
      // Ensure markdown tables have a preceding blank line
      .replace(/([^\n])\n(\|)/g, '$1\n\n$2')
      // Ensure headers have a preceding blank line
      .replace(/([^\n])\n(#{1,4}\s)/g, '$1\n\n$2');
  }, [content]);

  // Custom text processor that turns [TXN: id] into chips and highlights currencies
  const renderTextWithChips = (children: React.ReactNode): React.ReactNode => {
    if (typeof children !== 'string') {
      if (Array.isArray(children)) {
        return children.map((child, i) => (
          <React.Fragment key={i}>{renderTextWithChips(child)}</React.Fragment>
        ));
      }
      return children;
    }

    // Match [TXN: id] or currencies like +$123.45, -$123.45, $123.45, +12.3%, -12.3%
    const tokenRegex = /(\[TXN:\s*[A-Za-z0-9_-]+\]|(?:\+|-)?\$\d[\d,]*(?:\.\d+)?|(?:\+|-)\d+(?:\.\d+)?%)/g;
    const parts: React.ReactNode[] = [];
    let lastIdx = 0;
    let match;

    while ((match = tokenRegex.exec(children)) !== null) {
      if (match.index > lastIdx) {
        parts.push(children.substring(lastIdx, match.index));
      }

      const token = match[1];

      // Case 1: Transaction chip
      if (token.startsWith('[TXN:')) {
        const txnIdMatch = /\[TXN:\s*([A-Za-z0-9_-]+)\]/.exec(token);
        const txnId = txnIdMatch ? txnIdMatch[1] : token;
        parts.push(
          <TransactionChip
            key={`txn-${txnId}-${match.index}`}
            id={txnId}
            onClick={onSelectTransaction}
          />
        );
      }
      // Case 2: Negative Currency or Negative %
      else if (token.includes('-$') || token.startsWith('-')) {
        parts.push(
          <span
            key={`neg-${match.index}`}
            className="font-mono font-semibold text-[#E66A63] px-1 py-0.5 rounded bg-[#16242B]/60"
          >
            {token}
          </span>
        );
      }
      // Case 3: Positive Currency or Positive %
      else if (token.includes('+$') || token.startsWith('+')) {
        parts.push(
          <span
            key={`pos-${match.index}`}
            className="font-mono font-semibold text-[#55C99A] px-1 py-0.5 rounded bg-[#16242B]/60"
          >
            {token}
          </span>
        );
      }
      // Case 4: General Dollar Amount
      else if (token.startsWith('$')) {
        parts.push(
          <span
            key={`cur-${match.index}`}
            className="font-mono font-semibold text-[#55C99A] px-0.5"
          >
            {token}
          </span>
        );
      } else {
        parts.push(token);
      }

      lastIdx = tokenRegex.lastIndex;
    }

    if (lastIdx < children.length) {
      parts.push(children.substring(lastIdx));
    }

    return parts.length > 0 ? parts : children;
  };

  return (
    <div className="space-y-3.5 text-[#F4EFE5] text-xs sm:text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Styled Headings
          h1: ({ children }) => (
            <h1 className="text-base sm:text-lg font-bold text-[#F4EFE5] border-b border-[#24343A] pb-2 mt-4 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#C89B5D] rounded-full inline-block" />
              {renderTextWithChips(children)}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm sm:text-base font-bold text-[#F4EFE5] border-b border-[#24343A] pb-1.5 mt-3 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-[#C89B5D] rounded-full inline-block" />
              {renderTextWithChips(children)}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs sm:text-sm font-bold text-[#F0D6A3] mt-3 mb-1.5 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-[#C89B5D]/80 rounded-full inline-block" />
              {renderTextWithChips(children)}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs font-bold text-[#E5C58E] uppercase tracking-wider mt-2.5 mb-1 flex items-center gap-1.5">
              <span className="w-1 h-3 bg-[#E5C58E] rounded-full inline-block" />
              {renderTextWithChips(children)}
            </h4>
          ),

          // Styled Paragraphs
          p: ({ children }) => (
            <p className="my-1.5 leading-relaxed text-[#F4EFE5]">
              {renderTextWithChips(children)}
            </p>
          ),

          // Styled Lists
          ul: ({ children }) => (
            <ul className="my-2.5 space-y-2 pl-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2.5 space-y-2 pl-4 list-decimal marker:text-[#C89B5D]">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-2.5 text-xs sm:text-sm text-[#F4EFE5]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C89B5D] mt-2 flex-shrink-0" />
              <div className="flex-1 leading-relaxed">{renderTextWithChips(children)}</div>
            </li>
          ),

          // Highlighted Strong / Bold Text
          strong: ({ children }) => {
            const rawText = extractText(children);
            const isNegative = rawText.includes('-$') || (rawText.includes('-') && rawText.includes('%'));
            const isPositive = rawText.includes('+$') || (rawText.includes('+') && rawText.includes('%')) || (rawText.startsWith('$') && !isNegative);
            return (
              <strong
                className={`font-bold ${
                  isNegative
                    ? 'text-[#E66A63] font-mono'
                    : isPositive
                    ? 'text-[#55C99A] font-mono'
                    : 'text-[#F0D6A3]'
                }`}
              >
                {renderTextWithChips(children)}
              </strong>
            );
          },

          // Executive High-End Financial Tables
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-[#24343A] bg-[#111D24] shadow-2xl">
              <table className="w-full text-left text-xs border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#16242B] border-b border-[#24343A] text-[#C89B5D] uppercase text-[10px] font-bold tracking-wider">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[#24343A]/60">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-[#16242B]/80 transition-colors even:bg-[#0C171D]/60">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="py-2.5 px-3.5 text-[#C89B5D] font-bold font-sans">
              {renderTextWithChips(children)}
            </th>
          ),
          td: ({ children }) => {
            const strVal = extractText(children);
            const isMoney = strVal.includes('$');
            const isPercent = strVal.includes('%');
            const isNumeric = isMoney || isPercent;
            const isNegative = strVal.includes('-$') || (strVal.includes('-') && isPercent);
            const isPositive = strVal.includes('+') || (isNumeric && !isNegative && !strVal.startsWith('0'));

            return (
              <td
                className={`py-2 px-3.5 ${
                  isNumeric
                    ? isNegative
                      ? 'text-[#E66A63] font-mono font-semibold text-right'
                      : isPositive
                      ? 'text-[#55C99A] font-mono font-semibold text-right'
                      : 'text-[#F4EFE5] font-mono text-right'
                    : 'text-[#F4EFE5] font-sans font-medium'
                }`}
              >
                {renderTextWithChips(children)}
              </td>
            );
          },

          // Code blocks & inline code
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded bg-[#0C171D] border border-[#24343A] text-[#E5C58E] text-xs font-mono">
              {children}
            </code>
          ),
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
};
