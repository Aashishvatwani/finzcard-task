'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Layers,
  Calendar,
  FileText
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { VarianceModal } from '@/components/VarianceModal';
import { WaterfallBridge } from '@/components/WaterfallBridge';
import { AuditDrawer } from '@/components/AuditDrawer';
import { AnalystDrawer } from '@/components/AnalystDrawer';
import { RichMessageRenderer } from '@/components/RichMessageRenderer';
import { fetchPnL, fetchVariances, fetchWaterfallBridge, fetchBalanceSheet } from '@/lib/api';
import { MonthlyPnL, MaterialVariance, WaterfallBridge as WaterfallBridgeType, BalanceSheetItem } from '@/lib/types';

export default function PnLPage() {
  const [pnlData, setPnlData] = useState<MonthlyPnL[]>([]);
  const [variances, setVariances] = useState<MaterialVariance[]>([]);
  const [waterfall, setWaterfall] = useState<WaterfallBridgeType | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetItem[]>([]);

  // View tabs: 'pnl' | 'waterfall' | 'balancesheet'
  const [activeTab, setActiveTab] = useState<'pnl' | 'waterfall' | 'balancesheet'>('pnl');

  // Month selectors for variance
  const [baseMonth, setBaseMonth] = useState('2026-01');
  const [targetMonth, setTargetMonth] = useState('2026-02');

  // Modals & Drawers
  const [selectedVariance, setSelectedVariance] = useState<MaterialVariance | null>(null);
  const [activeTxnId, setActiveTxnId] = useState<string | null>(null);
  const [isAnalystOpen, setIsAnalystOpen] = useState(false);

  const loadData = async (bMonth = baseMonth, tMonth = targetMonth) => {
    try {
      const [pnl, vars, bridge, bs] = await Promise.all([
        fetchPnL(),
        fetchVariances(bMonth, tMonth).catch(() => []),
        fetchWaterfallBridge(bMonth, tMonth).catch(() => null),
        fetchBalanceSheet().catch(() => [])
      ]);
      setPnlData(pnl);
      setVariances(vars);
      setWaterfall(bridge);
      setBalanceSheet(bs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData(baseMonth, targetMonth);
  }, [baseMonth, targetMonth]);

  const months = pnlData.map((p) => p.month);

  return (
    <div className="min-h-screen text-[#F4EFE5] flex flex-col font-sans">
      <Navbar
        onOpenAnalyst={() => setIsAnalystOpen(true)}
        txnCount={181}
        reviewCount={balanceSheet.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header & View Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#24343A] pb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#F4EFE5] tracking-tight">
              Financial Statements & Variance Explorer
            </h1>
            <p className="text-xs text-[#A8AAA3] mt-1">
              Comparative Income Statement, Waterfall Operating Profit Bridge, and Balance Sheet Quarantine Ledger.
            </p>
          </div>

          {/* Navigation Pill Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#111D24] border border-[#24343A] rounded-xl">
            <button
              onClick={() => setActiveTab('pnl')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'pnl'
                  ? 'bg-[#C89B5D] text-[#071015] font-bold shadow-sm'
                  : 'text-[#A8AAA3] hover:text-[#F4EFE5]'
              }`}
            >
              Comparative P&L Grid
            </button>
            <button
              onClick={() => setActiveTab('waterfall')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'waterfall'
                  ? 'bg-[#C89B5D] text-[#071015] font-bold shadow-sm'
                  : 'text-[#A8AAA3] hover:text-[#F4EFE5]'
              }`}
            >
              Waterfall Bridge
            </button>
            <button
              onClick={() => setActiveTab('balancesheet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'balancesheet'
                  ? 'bg-[#C89B5D] text-[#071015] font-bold shadow-sm'
                  : 'text-[#A8AAA3] hover:text-[#F4EFE5]'
              }`}
            >
              Non-P&L Balance Sheet ({balanceSheet.length})
            </button>
          </div>
        </div>

        {/* Period Selector Bar */}
        <div className="p-4 rounded-xl bg-[#111D24]/85 border border-[#24343A] backdrop-blur-md flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-[#A8AAA3] font-semibold flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#C89B5D]" />
              Variance Analysis Period:
            </span>
            <div className="flex items-center gap-2 font-mono">
              <select
                value={baseMonth}
                onChange={(e) => setBaseMonth(e.target.value)}
                className="bg-[#0C171D] border border-[#24343A] rounded-lg px-2.5 py-1 text-[#F4EFE5] focus:outline-none focus:border-[#C89B5D]"
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <span className="text-[#6F7C80] font-sans">compared against</span>
              <select
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                className="bg-[#0C171D] border border-[#24343A] rounded-lg px-2.5 py-1 text-[#F4EFE5] focus:outline-none focus:border-[#C89B5D]"
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-[#A8AAA3] text-[11px]">
            Materiality standard: <span className="text-[#F0D6A3] font-mono">|Δ| ≥ $5,000</span> or{' '}
            <span className="text-[#F0D6A3] font-mono">|Δ%| ≥ 15.0%</span> (|Δ| ≥ $1,000)
          </div>
        </div>

        {/* TAB 1: COMPARATIVE P&L GRID */}
        {activeTab === 'pnl' && (
          <div className="space-y-6">
            <div className="bg-[#111D24]/85 rounded-2xl border border-[#24343A] backdrop-blur-md overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#16242B] border-b border-[#24343A] text-[#C89B5D] uppercase text-[11px] font-bold tracking-wider">
                      <th className="py-3.5 px-6">Line Item / Category</th>
                      {pnlData.map((p) => (
                        <th key={p.month} className="py-3.5 px-6 text-right font-mono">
                          {p.month}
                        </th>
                      ))}
                      <th className="py-3.5 px-6 text-right font-mono">
                        Δ ({baseMonth} → {targetMonth})
                      </th>
                      <th className="py-3.5 px-6 text-center">Variance Audit</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#24343A]/60 font-mono">
                    {/* REVENUE SECTION */}
                    <tr className="bg-[#0C171D]/80 text-[#F4EFE5] font-sans font-bold">
                      <td colSpan={pnlData.length + 3} className="py-2.5 px-6 uppercase text-[10px] text-[#C89B5D] tracking-wider">
                        1. Operating Revenue
                      </td>
                    </tr>

                    <tr className="hover:bg-[#16242B]/50 transition-colors font-semibold">
                      <td className="py-3 px-6 text-[#F4EFE5] font-sans">Gross Revenue</td>
                      {pnlData.map((p) => (
                        <td key={p.month} className="py-3 px-6 text-right text-[#F4EFE5]">
                          ${p.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      ))}
                      {(() => {
                        const v = variances.find((x) => x.line_item_or_category === 'Gross Revenue');
                        return renderVarianceCells(v, () => setSelectedVariance(v || null));
                      })()}
                    </tr>

                    {/* COGS SECTION */}
                    <tr className="bg-[#0C171D]/80 text-[#F4EFE5] font-sans font-bold">
                      <td colSpan={pnlData.length + 3} className="py-2.5 px-6 uppercase text-[10px] text-[#C89B5D] tracking-wider">
                        2. Cost of Goods Sold (COGS)
                      </td>
                    </tr>

                    <tr className="hover:bg-[#16242B]/50 transition-colors font-semibold">
                      <td className="py-3 px-6 text-[#F4EFE5] font-sans">Total COGS</td>
                      {pnlData.map((p) => (
                        <td key={p.month} className="py-3 px-6 text-right text-[#E66A63]">
                          -${p.cogs.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      ))}
                      {(() => {
                        const v = variances.find((x) => x.line_item_or_category === 'Cost of Goods Sold (COGS)');
                        return renderVarianceCells(v, () => setSelectedVariance(v || null));
                      })()}
                    </tr>

                    {/* Key COGS Categories */}
                    {['Food Inventory / Ingredients', 'Beverage Inventory / Alcohol', 'Packaging & Disposables', 'Delivery Platform Fees'].map((cat) => (
                      <tr key={cat} className="hover:bg-[#16242B]/30 transition-colors text-[#A8AAA3] text-[11px]">
                        <td className="py-2 px-8 text-[#A8AAA3] font-sans">• {cat}</td>
                        {pnlData.map((p) => (
                          <td key={p.month} className="py-2 px-6 text-right text-[#A8AAA3]">
                            ${(p.breakdown_by_category[cat] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        ))}
                        {(() => {
                          const v = variances.find((x) => x.line_item_or_category === cat);
                          return renderVarianceCells(v, () => setSelectedVariance(v || null));
                        })()}
                      </tr>
                    ))}

                    {/* GROSS PROFIT */}
                    <tr className="bg-[#16242B]/70 font-bold border-y border-[#24343A]">
                      <td className="py-3.5 px-6 text-[#F4EFE5] font-sans">
                        Gross Profit
                        <span className="text-[10px] text-[#A8AAA3] block font-normal">
                          (Revenue minus Cost of Goods Sold)
                        </span>
                      </td>
                      {pnlData.map((p) => (
                        <td key={p.month} className="py-3.5 px-6 text-right text-[#F0D6A3]">
                          ${p.gross_profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          <span className="text-[10px] text-[#A8AAA3] block font-sans">
                            {p.gross_margin.toFixed(1)}% Margin
                          </span>
                        </td>
                      ))}
                      {(() => {
                        const v = variances.find((x) => x.line_item_or_category === 'Gross Profit');
                        return renderVarianceCells(v, () => setSelectedVariance(v || null));
                      })()}
                    </tr>

                    {/* PAYROLL SECTION */}
                    <tr className="bg-[#0C171D]/80 text-[#F4EFE5] font-sans font-bold">
                      <td colSpan={pnlData.length + 3} className="py-2.5 px-6 uppercase text-[10px] text-[#C89B5D] tracking-wider">
                        3. Labor & Payroll
                      </td>
                    </tr>

                    <tr className="hover:bg-[#16242B]/50 transition-colors font-semibold">
                      <td className="py-3 px-6 text-[#F4EFE5] font-sans">Total Payroll & Benefits</td>
                      {pnlData.map((p) => (
                        <td key={p.month} className="py-3 px-6 text-right text-[#E66A63]">
                          -${p.payroll.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      ))}
                      {(() => {
                        const v = variances.find((x) => x.line_item_or_category === 'Payroll Expenses');
                        return renderVarianceCells(v, () => setSelectedVariance(v || null));
                      })()}
                    </tr>

                    {/* OPEX SECTION */}
                    <tr className="bg-[#0C171D]/80 text-[#F4EFE5] font-sans font-bold">
                      <td colSpan={pnlData.length + 3} className="py-2.5 px-6 uppercase text-[10px] text-[#C89B5D] tracking-wider">
                        4. Operating Expenses (OpEx)
                      </td>
                    </tr>

                    <tr className="hover:bg-[#16242B]/50 transition-colors font-semibold">
                      <td className="py-3 px-6 text-[#F4EFE5] font-sans">Total OpEx</td>
                      {pnlData.map((p) => (
                        <td key={p.month} className="py-3 px-6 text-right text-[#E66A63]">
                          -${p.opex.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      ))}
                      {(() => {
                        const v = variances.find((x) => x.line_item_or_category === 'Operating Expenses (OpEx)');
                        return renderVarianceCells(v, () => setSelectedVariance(v || null));
                      })()}
                    </tr>

                    {/* Key OpEx Sub-Categories */}
                    {['Facility Rent', 'Utilities', 'Marketing & Advertising', 'Repairs & Maintenance', 'Business Insurance', 'POS & Software Subscriptions'].map((cat) => (
                      <tr key={cat} className="hover:bg-[#16242B]/30 transition-colors text-[#A8AAA3] text-[11px]">
                        <td className="py-2 px-8 text-[#A8AAA3] font-sans">• {cat}</td>
                        {pnlData.map((p) => (
                          <td key={p.month} className="py-2 px-6 text-right text-[#A8AAA3]">
                            ${(p.breakdown_by_category[cat] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        ))}
                        {(() => {
                          const v = variances.find((x) => x.line_item_or_category === cat);
                          return renderVarianceCells(v, () => setSelectedVariance(v || null));
                        })()}
                      </tr>
                    ))}

                    {/* NET OPERATING PROFIT BOTTOM LINE */}
                    <tr className="bg-[#111D24] border-t-2 border-[#55C99A]/50 font-bold text-sm">
                      <td className="py-4 px-6 text-white font-sans">
                        Net Operating Profit (EBITDA)
                        <span className="text-[10px] text-[#A8AAA3] block font-normal">
                          Strict GAAP Operating Result
                        </span>
                      </td>
                      {pnlData.map((p) => (
                        <td key={p.month} className="py-4 px-6 text-right">
                          <span className={p.operating_profit >= 10000 ? 'text-[#55C99A]' : 'text-[#E3A83B]'}>
                            ${p.operating_profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-[#A8AAA3] block font-sans">
                            {p.operating_margin.toFixed(1)}% Operating Margin
                          </span>
                        </td>
                      ))}
                      {(() => {
                        const v = variances.find((x) => x.line_item_or_category === 'Net Operating Profit');
                        return renderVarianceCells(v, () => setSelectedVariance(v || null));
                      })()}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Material Variance Highlights Section */}
            <div className="p-6 rounded-2xl bg-[#111D24]/85 border border-[#24343A] backdrop-blur-md space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-[#E3A83B]" />
                  <h3 className="text-base font-bold text-[#F4EFE5]">
                    Material Variances Requiring Auditor Explanation ({baseMonth} → {targetMonth})
                  </h3>
                </div>
                <span className="text-xs text-[#A8AAA3]">
                  {variances.filter((v) => v.is_material).length} Material items detected
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {variances
                  .filter((v) => v.is_material)
                  .map((v) => {
                    const isPositive = v.delta_abs > 0;
                    return (
                      <div
                        key={v.line_item_or_category}
                        className="p-4 rounded-xl bg-[#0C171D] border border-[#24343A] hover:border-[#C89B5D]/40 transition-colors space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-[#F4EFE5]">{v.line_item_or_category}</h4>
                          <span
                            className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                              isPositive
                                ? 'bg-[#16242B] text-[#55C99A] border border-[#55C99A]/40'
                                : 'bg-[#16242B] text-[#E66A63] border border-[#E66A63]/40'
                            }`}
                          >
                            {isPositive ? '+' : ''}${v.delta_abs.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({isPositive ? '+' : ''}{v.delta_pct.toFixed(1)}%)
                          </span>
                        </div>

                        <div className="text-xs text-[#A8AAA3] max-h-24 overflow-hidden leading-relaxed">
                          <RichMessageRenderer
                            content={v.explanation || 'Variance exceeded mathematical threshold.'}
                            onSelectTransaction={(id) => setActiveTxnId(id)}
                          />
                        </div>

                        <button
                          onClick={() => setSelectedVariance(v)}
                          className="w-full py-1.5 rounded-lg bg-[#16242B] hover:bg-[#1E303A] text-[#F0D6A3] text-xs font-semibold border border-[#24343A] hover:border-[#C89B5D]/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#C89B5D]" />
                          <span>View Forensic Drivers ({v.top_drivers.length})</span>
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WATERFALL BRIDGE */}
        {activeTab === 'waterfall' && (
          <div className="space-y-6">
            <WaterfallBridge bridge={waterfall} />
          </div>
        )}

        {/* TAB 3: BALANCE SHEET NON-P&L EXCLUSIONS */}
        {activeTab === 'balancesheet' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[#111D24]/85 border border-[#24343A] backdrop-blur-md space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-[#A78BCE]">
                <Layers className="w-5 h-5" />
                <h3 className="text-base font-bold text-[#F4EFE5]">
                  Defensive Accounting: Non-P&L Balance Sheet Items
                </h3>
              </div>
              <p className="text-xs text-[#A8AAA3] max-w-3xl leading-relaxed">
                Financial statements must accurately portray true operating health. These transactions represent
                capital asset acquisitions, debt service principal reductions, statutory sales tax remittances,
                and equity owner draws. <strong>They are strictly quarantined from the Operating Income statement</strong> to prevent distorting margins.
              </p>

              <div className="border border-[#24343A] rounded-xl overflow-hidden bg-[#0C171D]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#16242B] text-[#C89B5D] uppercase text-[10px] font-bold border-b border-[#24343A]">
                    <tr>
                      <th className="py-3 px-4">Transaction ID</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Counterparty</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Balance Sheet Classification</th>
                      <th className="py-3 px-4">GAAP Exclusion Justification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#24343A]/60 font-mono">
                    {balanceSheet.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setActiveTxnId(item.id)}
                        className="hover:bg-[#16242B]/50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 text-[#A78BCE] font-bold">{item.id}</td>
                        <td className="py-3 px-4 text-[#A8AAA3] font-sans">{item.date}</td>
                        <td className="py-3 px-4 text-[#F4EFE5] font-sans font-medium">{item.description}</td>
                        <td className="py-3 px-4 text-[#A8AAA3] font-sans">{item.counterparty}</td>
                        <td className="py-3 px-4 text-right font-bold text-[#F4EFE5]">
                          ${Math.abs(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <span className="px-2 py-0.5 rounded bg-[#16242B] text-[#A78BCE] border border-[#A78BCE]/40 text-[10px] font-semibold">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#A8AAA3] font-sans text-[11px] max-w-xs">
                          {item.review_reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Variance Modal */}
      <VarianceModal
        variance={selectedVariance}
        onClose={() => setSelectedVariance(null)}
        onSelectTransaction={(id) => setActiveTxnId(id)}
      />

      {/* Audit Drawer */}
      <AuditDrawer
        transactionId={activeTxnId}
        onClose={() => setActiveTxnId(null)}
        onUpdateSuccess={() => loadData(baseMonth, targetMonth)}
      />

      {/* AI Analyst Drawer */}
      <AnalystDrawer
        isOpen={isAnalystOpen}
        onClose={() => setIsAnalystOpen(false)}
        onSelectTransaction={(id) => setActiveTxnId(id)}
      />
    </div>
  );
}

function renderVarianceCells(v: MaterialVariance | undefined, onViewDrivers: () => void) {
  if (!v) {
    return (
      <>
        <td className="py-3 px-6 text-right text-[#6F7C80]">-</td>
        <td className="py-3 px-6 text-center text-[#6F7C80]">-</td>
      </>
    );
  }

  const isPositive = v.delta_abs > 0;
  const isMaterial = v.is_material;

  return (
    <>
      <td
        className={`py-3 px-6 text-right font-mono text-xs ${
          isPositive ? 'text-[#55C99A]' : 'text-[#E66A63]'
        }`}
      >
        {isPositive ? '+' : ''}${v.delta_abs.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        <span className="text-[10px] ml-1 font-sans block text-[#A8AAA3]">
          ({isPositive ? '+' : ''}{v.delta_pct.toFixed(1)}%)
        </span>
      </td>

      <td className="py-3 px-6 text-center">
        {isMaterial ? (
          <button
            onClick={onViewDrivers}
            className="px-2.5 py-1 rounded bg-[#16242B] hover:bg-[#1E303A] text-[#E3A83B] text-[11px] font-semibold border border-[#E3A83B]/40 transition-colors shadow-sm inline-flex items-center gap-1 cursor-pointer"
          >
            <span>View Drivers</span>
          </button>
        ) : (
          <span className="text-[10px] text-[#6F7C80] font-sans uppercase font-medium">Standard</span>
        )}
      </td>
    </>
  );
}
