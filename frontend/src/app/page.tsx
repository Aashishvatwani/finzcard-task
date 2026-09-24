'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  DollarSign,
  ArrowRight,
  Layers,
  Sparkles,
  Calendar,
  ChevronRight,
  PieChart
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { AuditDrawer } from '@/components/AuditDrawer';
import { AnalystDrawer } from '@/components/AnalystDrawer';
import { fetchPnL, fetchBalanceSheet } from '@/lib/api';
import { MonthlyPnL, BalanceSheetItem } from '@/lib/types';

export default function OverviewPage() {
  const [pnl, setPnl] = useState<MonthlyPnL[]>([]);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetItem[]>([]);
  const [activeTxnId, setActiveTxnId] = useState<string | null>(null);
  const [isAnalystOpen, setIsAnalystOpen] = useState(false);

  useEffect(() => {
    Promise.all([fetchPnL(), fetchBalanceSheet()])
      .then(([pnlData, bsData]) => {
        setPnl(pnlData);
        setBalanceSheet(bsData);
      })
      .catch((err) => console.error(err));
  }, []);

  const totalRevenue = pnl.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalOperatingProfit = pnl.reduce((acc, curr) => acc + curr.operating_profit, 0);
  const totalGrossProfit = pnl.reduce((acc, curr) => acc + curr.gross_profit, 0);
  const grossMarginPct = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
  const avgMargin = totalRevenue > 0 ? (totalOperatingProfit / totalRevenue) * 100 : 0;
  const totalExcludedBS = balanceSheet.reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

  return (
    <div className="min-h-screen text-[#F4EFE5] flex flex-col font-sans">
      <Navbar
        onOpenAnalyst={() => setIsAnalystOpen(true)}
        txnCount={181}
        reviewCount={balanceSheet.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-8 rounded-2xl bg-[#0C171D]/80 border border-[#24343A] backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="space-y-2 z-10 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F4EFE5] tracking-tight">
              Hospitality Financial Review & Forensic Audit
            </h1>
            <p className="text-sm text-[#A8AAA3] leading-relaxed">
              Automated P&L ledger verification with GAAP CapEx quarantine, multi-period variance bridge analysis,
              and interactive transaction inspection.
            </p>
          </div>

          <div className="flex items-center gap-3 z-10 flex-shrink-0">
            <button
              onClick={() => setIsAnalystOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C89B5D] to-[#E5C58E] hover:from-[#E5C58E] hover:to-[#C89B5D] text-[#071015] font-bold text-xs transition-all shadow-lg shadow-[#C89B5D]/20 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-[#071015]" />
              <span>Launch AI Analyst</span>
            </button>
            <Link
              href="/pnl"
              className="px-4 py-2.5 rounded-xl bg-[#16242B] hover:bg-[#1E303A] text-[#F4EFE5] font-semibold text-xs border border-[#24343A] hover:border-[#C89B5D]/40 transition-all flex items-center gap-1.5"
            >
              <span>Explore P&L</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#C89B5D]" />
            </Link>
          </div>
        </div>

        {/* Top 4 Real Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#111D24]/85 border border-[#24343A] backdrop-blur-md space-y-2 shadow-lg">
            <div className="flex items-center justify-between text-xs text-[#A8AAA3]">
              <span className="uppercase font-bold tracking-wider">Q1 Net Revenue</span>
              <span className="p-1.5 rounded-lg bg-[#16242B] text-[#C89B5D] border border-[#24343A]">
                <DollarSign className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#F4EFE5]">
              ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-[#A8AAA3] flex items-center gap-1.5">
              <span className="text-[#55C99A] font-semibold">Q1 Verified Total</span>
              <span>•</span>
              <span>Toast POS + Delivery</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#111D24]/85 border border-[#24343A] backdrop-blur-md space-y-2 shadow-lg">
            <div className="flex items-center justify-between text-xs text-[#A8AAA3]">
              <span className="uppercase font-bold tracking-wider">Gross Profit</span>
              <span className="p-1.5 rounded-lg bg-[#16242B] text-[#F0D6A3] border border-[#24343A]">
                <PieChart className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#F0D6A3]">
              ${totalGrossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-[#A8AAA3] flex items-center gap-1.5">
              <span className="text-[#F0D6A3] font-semibold">{grossMarginPct.toFixed(1)}%</span>
              <span>Gross Profit Margin</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#111D24]/85 border border-[#24343A] backdrop-blur-md space-y-2 shadow-lg">
            <div className="flex items-center justify-between text-xs text-[#A8AAA3]">
              <span className="uppercase font-bold tracking-wider">Net Operating Profit</span>
              <span className="p-1.5 rounded-lg bg-[#16242B] text-[#55C99A] border border-[#24343A]">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#55C99A]">
              ${totalOperatingProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-[#A8AAA3] flex items-center gap-1.5">
              <span className="text-[#55C99A] font-semibold">{avgMargin.toFixed(1)}%</span>
              <span>Operating Profit Margin</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#111D24]/85 border border-[#24343A] backdrop-blur-md space-y-2 shadow-lg">
            <div className="flex items-center justify-between text-xs text-[#A8AAA3]">
              <span className="uppercase font-bold tracking-wider">Balance Sheet Quarantined</span>
              <span className="p-1.5 rounded-lg bg-[#16242B] text-[#A78BCE] border border-[#24343A]">
                <Layers className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#A78BCE]">
              ${totalExcludedBS.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-[#A8AAA3] flex items-center gap-1.5">
              <span className="text-[#A78BCE] font-semibold">{balanceSheet.length} Non-P&L Items</span>
              <span>•</span>
              <span>CapEx, Debt, Tax</span>
            </div>
          </div>
        </div>

        {/* Monthly Performance Progression */}
        <div className="p-6 rounded-2xl bg-[#111D24]/85 border border-[#24343A] backdrop-blur-md space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#C89B5D]" />
              <h2 className="text-base font-bold text-[#F4EFE5]">Monthly Operating Progression (Q1 2026)</h2>
            </div>
            <Link
              href="/pnl"
              className="text-xs text-[#C89B5D] hover:text-[#E5C58E] font-semibold flex items-center gap-1 transition-colors"
            >
              <span>View Full Comparative Income Statement</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pnl.map((p) => {
              const isProfitUp = p.operating_profit > 10000;
              return (
                <div
                  key={p.month}
                  className="p-5 rounded-xl bg-[#0C171D]/90 border border-[#24343A] space-y-3 hover:border-[#C89B5D]/50 transition-colors"
                >
                  <div className="flex items-center justify-between border-b border-[#24343A] pb-2">
                    <span className="font-mono text-sm font-bold text-[#E5C58E]">{p.month}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                        isProfitUp
                          ? 'bg-[#16242B] text-[#55C99A] border border-[#55C99A]/40'
                          : 'bg-[#16242B] text-[#E3A83B] border border-[#E3A83B]/40'
                      }`}
                    >
                      {p.operating_margin.toFixed(1)}% Net Margin
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#A8AAA3]">Revenue:</span>
                      <span className="font-mono font-semibold text-[#F4EFE5]">
                        ${p.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#A8AAA3]">Cost of Goods (COGS):</span>
                      <span className="font-mono font-semibold text-[#E66A63]">
                        -${p.cogs.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#A8AAA3]">Gross Profit:</span>
                      <span className="font-mono font-semibold text-[#F0D6A3]">
                        ${p.gross_profit.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({p.gross_margin}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#A8AAA3]">Payroll & Labor:</span>
                      <span className="font-mono font-semibold text-[#E66A63]">
                        -${p.payroll.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#A8AAA3]">Operating Expenses (OpEx):</span>
                      <span className="font-mono font-semibold text-[#E66A63]">
                        -${p.opex.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#24343A] flex justify-between items-center text-xs">
                    <span className="font-bold text-[#A8AAA3] uppercase text-[10px]">Net Operating Income:</span>
                    <span
                      className={`font-mono text-sm font-bold ${
                        p.operating_profit > 10000 ? 'text-[#55C99A]' : 'text-[#E3A83B]'
                      }`}
                    >
                      ${p.operating_profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Balance Sheet Quarantine Showcase */}
        <div className="p-6 rounded-2xl bg-[#111D24]/85 border border-[#24343A] backdrop-blur-md space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#A78BCE]" />
                <h3 className="text-base font-bold text-[#F4EFE5]">
                  Balance Sheet vs. P&L Separation (GAAP Quarantine)
                </h3>
              </div>
              <p className="text-xs text-[#A8AAA3] mt-1">
                Capital expenditures, debt repayments, and tax distributions are strictly quarantined from Operating Profit.
              </p>
            </div>
            <Link
              href="/pnl"
              className="text-xs text-[#C89B5D] hover:text-[#E5C58E] font-semibold transition-colors"
            >
              View Balance Sheet Tab →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {balanceSheet.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveTxnId(item.id)}
                className="p-3.5 rounded-xl bg-[#0C171D]/90 border border-[#24343A] hover:border-[#A78BCE]/60 cursor-pointer transition-colors space-y-2 group"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-[#A78BCE] font-semibold group-hover:text-[#F4EFE5]">
                    {item.id}
                  </span>
                  <span className="text-[#6F7C80]">{item.date}</span>
                </div>
                <div>
                  <div className="text-base font-bold font-mono text-[#F4EFE5]">
                    ${Math.abs(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs font-semibold text-[#E5C58E] mt-0.5">{item.category}</div>
                  <div className="text-[11px] text-[#A8AAA3] line-clamp-1">{item.description}</div>
                </div>
                <div className="pt-1 text-[10px] text-[#A8AAA3] bg-[#16242B] p-1.5 rounded border border-[#24343A]">
                  {item.review_reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Audit Drawer */}
      <AuditDrawer
        transactionId={activeTxnId}
        onClose={() => setActiveTxnId(null)}
        onUpdateSuccess={() => {
          fetchPnL().then(setPnl);
          fetchBalanceSheet().then(setBalanceSheet);
        }}
      />

      {/* Slide-over AI Analyst Drawer */}
      <AnalystDrawer
        isOpen={isAnalystOpen}
        onClose={() => setIsAnalystOpen(false)}
        onSelectTransaction={(id) => setActiveTxnId(id)}
      />
    </div>
  );
}
