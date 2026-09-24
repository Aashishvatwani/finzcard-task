import { NextRequest, NextResponse } from 'next/server';
import { OpenRouter } from '@openrouter/sdk';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const SYSTEM_FINANCIAL_CONTEXT = `
You are FINZ AI, an executive forensic financial analyst and AI copilot for a high-volume restaurant operating in Q1 2026.
You are grounded in a verified deterministic SQLite ledger.

OFFICIAL VERIFIED LEDGER FINANCIAL SUMMARY (Q1 2026):
1. Monthly Operating Progression:
   - January 2026 (2026-01):
     * Gross Revenue: $126,399.09
     * COGS: -$51,037.38 (Gross Profit: $75,361.71 | 59.62% Gross Margin)
     * Payroll & Labor: -$41,757.07
     * OpEx: -$19,134.11
     * Net Operating Profit (EBITDA): $14,470.53 (11.45% Margin)
   - February 2026 (2026-02):
     * Gross Revenue: $125,507.25
     * COGS: -$52,143.60 (Gross Profit: $73,363.65 | 58.45% Gross Margin)
     * Payroll & Labor: -$47,370.19 (Elevated due to kitchen & FOH overtime wages)
     * OpEx: -$19,985.50
     * Net Operating Profit (EBITDA): $6,007.96 (4.79% Margin - sharp drop of -$8,462.57 due to overtime & Sysco restock)
   - March 2026 (2026-03):
     * Gross Revenue: $150,645.11 (+19.1% growth, peak sales quarter to date)
     * COGS: -$59,286.04 (Gross Profit: $91,359.07 | 60.64% Gross Margin)
     * Payroll & Labor: -$49,240.23
     * OpEx: -$23,264.30
     * Net Operating Profit (EBITDA): $18,854.54 (12.52% Margin - strong operational rebound)
   - Q1 2026 Cumulative:
     * Gross Revenue: $402,551.45
     * COGS: -$162,467.02
     * Gross Profit: $240,084.43 (59.64% Gross Margin)
     * Payroll: -$138,367.49
     * OpEx: -$62,383.91
     * Net Operating Profit: $39,333.03 (9.77% Margin)

2. Defensive GAAP Quarantine (Non-P&L Balance Sheet Items, Total $24,850.00):
   - [TXN: T1057] 2026-02-15: Rational iCombi Pro Oven ($12,450.00) -> Fixed Asset / CapEx (multi-year useful life, strictly excluded from OpEx).
   - [TXN: T1058] 2026-02-28: State Department of Revenue ($4,850.00) -> Sales Tax Liability Remittance (pass-through liability, not operating expense).
   - [TXN: T1059] 2026-03-10: Main Street Bank ($3,500.00) -> Equipment Loan Principal Repayment (reduces liabilities on balance sheet, only interest is expense).
   - [TXN: T1060] 2026-03-31: Owner Draw ($4,050.00) -> Equity Distribution (quarantined from operating profit).

3. Formatting & Presentation Guidelines:
   - Present financial comparisons as clean Markdown tables with headers: \`| Metric / Line Item | Jan 2026 | Feb 2026 | Mar 2026 | Q1 Cumulative |\`.
   - Format all currency figures clearly: \`$126,399.09\`, \`-$51,037.38\`, etc.
   - When citing specific transactions, always use the citation token \`[TXN: <id>]\` (e.g. \`[TXN: T1057]\`), which renders as an interactive audit chip.
   - For conversational greetings (e.g. "hello world"), respond warmly and introduce your forensic analytical capabilities.
   - For general reasoning questions (e.g. word puzzles, definitions), answer accurately and directly.
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [], model = 'qwen/qwen3.8-27b:free' } = body;

    // Securely retrieve OpenRouter API key strictly from server-side environment
    const effectiveKey = process.env.OPENROUTER_API_KEY;

    // If OpenRouter API key is available in environment, execute via OpenRouter SDK
    if (effectiveKey && effectiveKey !== '<OPENROUTER_API_KEY>' && effectiveKey.trim().length > 5) {
      try {
        const openrouter = new OpenRouter({
          apiKey: effectiveKey.trim(),
        });

        const messages: any[] = [
          { role: 'system', content: SYSTEM_FINANCIAL_CONTEXT },
        ];

        for (const h of history.slice(-6)) {
          messages.push({
            role: h.role,
            content: h.content,
          });
        }

        messages.push({
          role: 'user',
          content: message,
        });

        const stream = await openrouter.chat.send({
          chatRequest: {
            model: model || 'qwen/qwen3.8-27b:free',
            messages,
            stream: true,
            provider: {
              only: ['modelrun/fp4'],
              allowFallbacks: true,
            },
          },
        });

        let accumulated = '';
        for await (const chunk of (stream as any)) {
          const delta = (chunk as any).choices?.[0]?.delta?.content;
          if (delta) {
            accumulated += delta;
          }
        }

        if (accumulated.trim()) {
          // Pass OpenRouter generated response through deterministic fact-checking interceptor
          let verifiedClaims = [];
          let annotatedContent = accumulated;

          try {
            const fcRes = await fetch(`${BACKEND_URL}/api/fact-check`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: accumulated }),
            });
            if (fcRes.ok) {
              const fcData = await fcRes.json();
              annotatedContent = fcData.annotated_text || accumulated;
              verifiedClaims = fcData.verified_claims || [];
            }
          } catch (fcErr) {
            console.warn('Fact check error for OpenRouter response:', fcErr);
          }

          return NextResponse.json({
            role: 'assistant',
            content: annotatedContent,
            verified_claims: verifiedClaims,
          });
        }
      } catch (openRouterErr) {
        console.warn('OpenRouter call error, falling back to local forensic engine:', openRouterErr);
      }
    }

    // Fallback: Call local deterministic FastAPI forensic engine
    const backendRes = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });

    if (!backendRes.ok) {
      const errText = await backendRes.text();
      return NextResponse.json(
        { role: 'assistant', content: `⚠️ Backend analysis error: ${errText}` },
        { status: 500 }
      );
    }

    const data = await backendRes.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Chat route error:', err);
    return NextResponse.json(
      { role: 'assistant', content: `⚠️ Error executing financial analysis: ${err.message}` },
      { status: 500 }
    );
  }
}
