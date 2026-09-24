'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  User,
  Send,
  Lightbulb
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { AuditDrawer } from '@/components/AuditDrawer';
import { RichMessageRenderer } from '@/components/RichMessageRenderer';
import { sendAnalystChat } from '@/lib/api';
import { ChatMessage } from '@/lib/types';

const PROMPT_SUGGESTIONS = [
  'What was our gross revenue and net profit across Jan, Feb, and March 2026?',
  'Why did net operating profit drop so sharply in February 2026?',
  'Show all Balance Sheet items excluded from the P&L and explain why.',
  'Analyze Sysco food inventory purchases and flag anomalies.',
  'Break down the Operating Profit Waterfall bridge between Jan and Feb 2026.'
];

export default function DedicatedAnalystPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        '👋 Welcome to **FINZ AI Financial Analyst Terminal**.\n\n' +
        'I provide deterministic P&L analysis, multi-period variance bridge explanations, vendor spend audit, ' +
        'and balance sheet quarantine verification.\n\n' +
        'Select one of the suggested inquiries below or enter your own query.'
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTxnId, setActiveTxnId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const text = queryText || input;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const response = await sendAnalystChat(text.trim(), updated.slice(-6));
      setMessages([...updated, response]);
    } catch (err: any) {
      setMessages([
        ...updated,
        {
          role: 'assistant',
          content: `⚠️ Error executing financial analysis: ${err.message || 'Server communication error'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-[#F4EFE5] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col space-y-4">
        {/* Terminal Header */}
        <div className="p-5 rounded-2xl bg-[#111D24]/90 border border-[#24343A] backdrop-blur-md flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#C89B5D] to-[#E5C58E] flex items-center justify-center text-[#071015] shadow-lg shadow-[#C89B5D]/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#F4EFE5]">Financial Analyst Terminal</h1>
              <p className="text-xs text-[#A8AAA3]">
                Deterministic Forensic Accounting & Multi-Period Variance Intelligence
              </p>
            </div>
          </div>
        </div>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-[#A8AAA3] flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-[#C89B5D]" />
            <span>Suggested Inquiries:</span>
          </span>
          {PROMPT_SUGGESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="px-3 py-1 rounded-lg bg-[#111D24]/80 hover:bg-[#16242B] text-[#A8AAA3] hover:text-[#F0D6A3] border border-[#24343A] hover:border-[#C89B5D]/50 text-xs transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat Feed */}
        <div className="flex-1 min-h-[500px] max-h-[620px] overflow-y-auto p-6 rounded-2xl bg-[#0C171D]/90 border border-[#24343A] backdrop-blur-md space-y-4 shadow-2xl">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-[#16242B] border border-[#24343A] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-[#C89B5D]" />
                </div>
              )}

              <div
                className={`max-w-[88%] rounded-2xl p-4 text-xs sm:text-sm ${
                  msg.role === 'user'
                    ? 'bg-[#C89B5D] text-[#071015] font-semibold shadow-md shadow-[#C89B5D]/20'
                    : 'bg-[#111D24]/95 border border-[#24343A] text-[#F4EFE5] shadow-xl'
                }`}
              >
                {msg.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <RichMessageRenderer
                    content={msg.content}
                    verifiedClaims={msg.verified_claims}
                    onSelectTransaction={(id) => setActiveTxnId(id)}
                  />
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-[#16242B] border border-[#24343A] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-[#C89B5D]" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center text-xs text-[#E5C58E] bg-[#111D24] p-3 rounded-xl border border-[#24343A] w-fit shadow-md">
              <div className="w-4 h-4 border-2 border-[#C89B5D] border-t-transparent rounded-full animate-spin" />
              <span>Running forensic ledger audit & generating verified analysis...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 rounded-2xl bg-[#111D24]/90 border border-[#24343A] backdrop-blur-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask FINZ AI to analyze financial statements, root drivers, or vendor activity..."
              className="flex-1 bg-[#0C171D] border border-[#24343A] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#F4EFE5] placeholder-[#6F7C80] focus:outline-none focus:border-[#C89B5D]"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#C89B5D] hover:bg-[#E5C58E] disabled:opacity-40 text-[#071015] font-bold text-xs sm:text-sm transition-all shadow-md shadow-[#C89B5D]/20 flex items-center gap-1.5"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      {/* Audit Drawer */}
      <AuditDrawer
        transactionId={activeTxnId}
        onClose={() => setActiveTxnId(null)}
      />
    </div>
  );
}
