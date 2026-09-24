'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Lightbulb
} from 'lucide-react';
import { ChatMessage } from '@/lib/types';
import { sendAnalystChat } from '@/lib/api';
import { RichMessageRenderer } from './RichMessageRenderer';

interface AnalystDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTransaction: (id: string) => void;
}

const SAMPLE_QUESTIONS = [
  'What was our revenue in March?',
  'How much did we spend on payroll each month?',
  'Why did operating profit change between February and March?',
  'What drove the increase in food costs?',
  'Which transactions need my attention?',
  'Show me the transactions behind that variance.',
  'What changed most significantly over the review period?'
];

export const AnalystDrawer: React.FC<AnalystDrawerProps> = ({
  isOpen,
  onClose,
  onSelectTransaction,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        '👋 Welcome to **FINZ AI Financial Analyst**.\n\n' +
        'I provide deterministic P&L analysis, multi-period variance bridge explanations, vendor spend audit, ' +
        'and balance sheet quarantine verification with ledger-verified citations.\n\n' +
        'How can I assist your financial review today?'
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: query.trim() };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput('');
    setLoading(true);

    try {
      const response = await sendAnalystChat(query.trim(), updatedHistory.slice(-6));
      setMessages([...updatedHistory, response]);
    } catch (err: any) {
      setMessages([
        ...updatedHistory,
        {
          role: 'assistant',
          content: `⚠️ Error executing financial analysis: ${err.message || 'Server communication error'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#071015]/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
        <div className="w-screen max-w-2xl bg-[#0C171D] border-l border-[#24343A] shadow-2xl flex flex-col text-[#F4EFE5]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#24343A] bg-[#111D24] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C89B5D] to-[#E5C58E] flex items-center justify-center shadow-lg shadow-[#C89B5D]/20">
                <Sparkles className="w-5 h-5 text-[#071015]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[#F4EFE5] tracking-tight">FINZ AI Financial Analyst</h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#16242B] border border-[#55C99A]/40 text-[#55C99A]">
                    Ledger-Verified
                  </span>
                </div>
                <p className="text-xs text-[#A8AAA3]">Forensic Accounting & Variance Intelligence</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#A8AAA3] hover:text-[#F4EFE5] hover:bg-[#16242B] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Starter Prompts */}
          <div className="px-6 py-2.5 bg-[#071015]/70 border-b border-[#24343A] overflow-x-auto">
            <div className="flex gap-2 items-center text-xs">
              <span className="text-[#A8AAA3] text-[11px] font-semibold flex items-center gap-1 flex-shrink-0">
                <Lightbulb className="w-3.5 h-3.5 text-[#C89B5D]" />
                Prompt Ideas:
              </span>
              {SAMPLE_QUESTIONS.slice(0, 3).map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="px-2.5 py-1 rounded-lg bg-[#111D24] hover:bg-[#16242B] text-[#A8AAA3] hover:text-[#F0D6A3] border border-[#24343A] hover:border-[#C89B5D]/50 text-[11px] whitespace-nowrap transition-colors cursor-pointer"
                >
                  {q.length > 40 ? q.slice(0, 40) + '...' : q}
                </button>
              ))}
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-[#16242B] border border-[#24343A] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-[#C89B5D]" />
                  </div>
                )}

                <div
                  className={`max-w-[92%] rounded-2xl p-4 text-xs sm:text-sm ${
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
                      onSelectTransaction={onSelectTransaction}
                    />
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-[#16242B] border border-[#24343A] flex items-center justify-center flex-shrink-0 mt-0.5">
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

          {/* Input Box */}
          <div className="p-4 border-t border-[#24343A] bg-[#111D24]">
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
                placeholder="Ask about revenue trends, material variances, or specific vendors..."
                className="flex-1 bg-[#0C171D] border border-[#24343A] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#F4EFE5] placeholder-[#6F7C80] focus:outline-none focus:border-[#C89B5D] transition-colors"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2.5 rounded-xl bg-[#C89B5D] hover:bg-[#E5C58E] disabled:opacity-40 text-[#071015] font-bold transition-colors flex-shrink-0 shadow-md shadow-[#C89B5D]/20 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
