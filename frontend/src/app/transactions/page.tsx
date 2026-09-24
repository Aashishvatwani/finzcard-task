'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  AlertCircle,
  ShieldCheck,
  Edit2
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { AuditDrawer } from '@/components/AuditDrawer';
import { AnalystDrawer } from '@/components/AnalystDrawer';
import { fetchTransactions, resolveReviewItem } from '@/lib/api';
import { Transaction } from '@/lib/types';

function TransactionsContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const initialFilter = searchParams.get('filter');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [activeTab, setActiveTab] = useState<string>(initialFilter === 'review' ? 'review' : 'all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedStatementType, setSelectedStatementType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers
  const [activeTxnId, setActiveTxnId] = useState<string | null>(null);
  const [isAnalystOpen, setIsAnalystOpen] = useState(false);

  const highlightedRowRef = useRef<HTMLTableRowElement | null>(null);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 200 };
      if (activeTab === 'review') params.needs_review = true;
      if (activeTab === 'balancesheet') params.account_type = 'balance_sheet';
      if (activeTab === 'pnl') params.account_type = 'pnl';
      if (selectedMonth !== 'all') params.month = selectedMonth;
      if (selectedStatementType !== 'all') params.statement_type = selectedStatementType;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await fetchTransactions(params);
      setTransactions(res.items);
      setTotalCount(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [activeTab, selectedMonth, selectedStatementType, searchQuery]);

  useEffect(() => {
    if (highlightId && transactions.length > 0) {
      setActiveTxnId(highlightId);
      setTimeout(() => {
        highlightedRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    }
  }, [highlightId, transactions]);

  const handleQuickResolve = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await resolveReviewItem(id, 'Verified directly in ledger');
      loadTransactions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen text-[#F4EFE5] flex flex-col font-sans">
      <Navbar
        onOpenAnalyst={() => setIsAnalystOpen(true)}
        txnCount={totalCount || 181}
        reviewCount={transactions.filter((t) => t.needs_review).length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#24343A] pb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#F4EFE5] tracking-tight">
              Transaction Ledger & Review Queue
            </h1>
            <p className="text-xs text-[#A8AAA3] mt-1">
              Deterministic classification audit, active learning rule management, and anomaly review.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#A8AAA3] px-3 py-1.5 rounded-lg bg-[#111D24] border border-[#24343A]">
              Showing {transactions.length} of {totalCount} records
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 rounded-2xl bg-[#111D24]/85 border border-[#24343A] backdrop-blur-md space-y-4 shadow-xl">
          {/* Top Row: Search & Sub-filters */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-[#6F7C80] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memo, vendor, or ID..."
                className="w-full bg-[#0C171D] border border-[#24343A] rounded-xl pl-9 pr-4 py-2 text-xs text-[#F4EFE5] placeholder-[#6F7C80] focus:outline-none focus:border-[#C89B5D]"
              />
            </div>

            {/* Dropdown Selectors */}
            <div className="flex items-center gap-2 w-full md:w-auto text-xs">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-[#0C171D] border border-[#24343A] rounded-lg px-3 py-1.5 text-[#F4EFE5] focus:outline-none focus:border-[#C89B5D] font-mono"
              >
                <option value="all">All Months</option>
                <option value="2026-01">2026-01 (Jan)</option>
                <option value="2026-02">2026-02 (Feb)</option>
                <option value="2026-03">2026-03 (Mar)</option>
              </select>

              <select
                value={selectedStatementType}
                onChange={(e) => setSelectedStatementType(e.target.value)}
                className="bg-[#0C171D] border border-[#24343A] rounded-lg px-3 py-1.5 text-[#F4EFE5] focus:outline-none focus:border-[#C89B5D]"
              >
                <option value="all">All Statement Types</option>
                <option value="revenue">Revenue</option>
                <option value="cogs">COGS</option>
                <option value="payroll">Payroll</option>
                <option value="opex">OpEx</option>
                <option value="non_pnl">Non-P&L (Balance Sheet)</option>
              </select>
            </div>
          </div>

          {/* Bottom Row: Tab Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#24343A]">
            {[
              { id: 'all', label: 'All Transactions' },
              { id: 'review', label: '⚠️ Requires Review' },
              { id: 'pnl', label: 'P&L Operating' },
              { id: 'balancesheet', label: 'Non-P&L Balance Sheet' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#C89B5D] text-[#071015] font-bold shadow-sm'
                    : 'bg-[#0C171D] text-[#A8AAA3] hover:text-[#F4EFE5] border border-[#24343A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-[#111D24]/85 rounded-2xl border border-[#24343A] backdrop-blur-md overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#16242B] text-[#C89B5D] uppercase text-[10px] font-bold tracking-wider border-b border-[#24343A]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Description / Memo</th>
                  <th className="py-3 px-4">Counterparty</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Status & Review</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#24343A]/60 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-[#A8AAA3] font-sans">
                      <div className="w-6 h-6 border-2 border-[#C89B5D] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Loading verified ledger...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-[#6F7C80] font-sans">
                      No transactions match the selected filters.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => {
                    const isCredit = t.amount > 0;
                    const isHighlighted = highlightId === t.id;

                    return (
                      <tr
                        key={t.id}
                        ref={isHighlighted ? highlightedRowRef : null}
                        onClick={() => setActiveTxnId(t.id)}
                        className={`hover:bg-[#16242B]/60 cursor-pointer transition-colors ${
                          isHighlighted ? 'bg-[#16242B] ring-2 ring-[#C89B5D] animate-pulse' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-[#A8AAA3] font-sans">{t.date}</td>
                        <td className="py-3 px-4 font-bold text-[#E5C58E]">{t.id}</td>
                        <td className="py-3 px-4 font-sans font-medium text-[#F4EFE5] max-w-xs truncate" title={t.description}>
                          {t.description}
                        </td>
                        <td className="py-3 px-4 font-sans text-[#A8AAA3]">{t.counterparty || '-'}</td>
                        <td
                          className={`py-3 px-4 text-right font-bold ${
                            isCredit ? 'text-[#55C99A]' : 'text-[#F4EFE5]'
                          }`}
                        >
                          {isCredit ? '+' : '-'}${Math.abs(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 font-sans text-[#A8AAA3]">{t.category}</td>
                        <td className="py-3 px-4 font-sans">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                              t.statement_type === 'revenue'
                                ? 'bg-[#16242B] text-[#55C99A] border border-[#55C99A]/40'
                                : t.statement_type === 'cogs'
                                ? 'bg-[#16242B] text-[#E3A83B] border border-[#E3A83B]/40'
                                : t.statement_type === 'payroll'
                                ? 'bg-[#16242B] text-[#E66A63] border border-[#E66A63]/40'
                                : t.statement_type === 'non_pnl'
                                ? 'bg-[#16242B] text-[#A78BCE] border border-[#A78BCE]/40'
                                : 'bg-[#16242B] text-[#A8AAA3]'
                            }`}
                          >
                            {t.statement_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                              t.classification_source === 'learned_rule'
                                ? 'bg-[#16242B] text-[#E3A83B]'
                                : t.classification_source === 'rule'
                                ? 'bg-[#16242B] text-[#6F7C80]'
                                : 'bg-[#16242B] text-[#E5C58E]'
                            }`}
                          >
                            {t.classification_source}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans">
                          {t.needs_review ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#16242B] text-[#E3A83B] border border-[#E3A83B]/40 text-[10px] font-semibold"
                              title={t.review_reason}
                            >
                              <AlertCircle className="w-3 h-3 text-[#E3A83B]" />
                              <span className="truncate max-w-[120px]">{t.review_reason || 'Requires Review'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-[#55C99A]">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Verified</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-sans">
                          {t.needs_review ? (
                            <button
                              onClick={(e) => handleQuickResolve(e, t.id)}
                              className="px-2 py-0.5 rounded bg-[#C89B5D] hover:bg-[#E5C58E] text-[#071015] font-bold text-[10px] transition-colors cursor-pointer"
                            >
                              Resolve
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTxnId(t.id);
                              }}
                              className="text-[#6F7C80] hover:text-[#C89B5D] p-1 cursor-pointer"
                              title="Audit Drawer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Audit Drawer */}
      <AuditDrawer
        transactionId={activeTxnId}
        onClose={() => setActiveTxnId(null)}
        onUpdateSuccess={loadTransactions}
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

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-[#A8AAA3]">Loading ledger...</div>}>
      <TransactionsContent />
    </Suspense>
  );
}
