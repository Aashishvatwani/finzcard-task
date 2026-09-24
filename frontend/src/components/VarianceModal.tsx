'use client';

import React from 'react';
import Link from 'next/link';
import { X, TrendingUp, TrendingDown, Layers, FileText, ExternalLink } from 'lucide-react';
import { MaterialVariance } from '@/lib/types';
import { TransactionChip } from './TransactionChip';
import { RichMessageRenderer } from './RichMessageRenderer';

interface VarianceModalProps {
  variance: MaterialVariance | null;
  onClose: () => void;
  onSelectTransaction: (id: string) => void;
}

export const VarianceModal: React.FC<VarianceModalProps> = ({
  variance,
  onClose,
  onSelectTransaction,
}) => {
  if (!variance) return null;

  const isPositive = variance.delta_abs > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071015]/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0C171D] border border-[#24343A] rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden text-[#F4EFE5]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#24343A] flex items-center justify-between bg-[#111D24]">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                isPositive ? 'bg-[#16242B] text-[#55C99A]' : 'bg-[#16242B] text-[#E66A63]'
              }`}
            >
              {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F4EFE5]">{variance.line_item_or_category}</h3>
              <p className="text-xs text-[#A8AAA3]">
                Comparison: {variance.base_month} → {variance.target_month}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A8AAA3] hover:text-[#F4EFE5] hover:bg-[#16242B] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Delta Statistics Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#111D24] border border-[#24343A]">
              <span className="text-[10px] uppercase font-semibold text-[#A8AAA3] block">{variance.base_month}</span>
              <span className="text-lg font-bold font-mono text-[#F4EFE5]">
                ${variance.base_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#111D24] border border-[#24343A]">
              <span className="text-[10px] uppercase font-semibold text-[#A8AAA3] block">{variance.target_month}</span>
              <span className="text-lg font-bold font-mono text-[#F4EFE5]">
                ${variance.target_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#111D24] border border-[#24343A]">
              <span className="text-[10px] uppercase font-semibold text-[#A8AAA3] block">Net Variance Delta</span>
              <span
                className={`text-lg font-bold font-mono ${
                  isPositive ? 'text-[#55C99A]' : 'text-[#E66A63]'
                }`}
              >
                {isPositive ? '+' : '-'}${Math.abs(variance.delta_abs).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                <span className="text-xs ml-1 font-sans">
                  ({isPositive ? '+' : ''}{variance.delta_pct.toFixed(1)}%)
                </span>
              </span>
            </div>
          </div>

          {/* AI Narrative Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#C89B5D]">
              <FileText className="w-4 h-4 text-[#C89B5D]" />
              <span>Forensic Variance Explanation</span>
            </div>
            <div className="p-4 rounded-xl bg-[#111D24] border border-[#24343A] text-xs text-[#F4EFE5] leading-relaxed shadow-inner">
              {variance.explanation ? (
                <RichMessageRenderer
                  content={variance.explanation}
                  onSelectTransaction={onSelectTransaction}
                />
              ) : (
                <p className="text-[#6F7C80]">No material narrative generated for non-material movement.</p>
              )}
            </div>
          </div>

          {/* Backing Drivers Table */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#F4EFE5] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#C89B5D]" />
                <span>Primary Drivers ({variance.target_month})</span>
              </span>
              <span className="text-[11px] text-[#A8AAA3]">Click to inspect transaction audit trail</span>
            </div>

            {variance.top_drivers && variance.top_drivers.length > 0 ? (
              <div className="border border-[#24343A] rounded-xl overflow-hidden bg-[#111D24] divide-y divide-[#24343A]">
                {variance.top_drivers.map((d: any) => (
                  <div
                    key={d.id}
                    onClick={() => onSelectTransaction(d.id)}
                    className="p-3 flex items-center justify-between hover:bg-[#16242B] cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <TransactionChip id={d.id} onClick={onSelectTransaction} />
                      <div>
                        <div className="text-xs font-medium text-[#F4EFE5] group-hover:text-[#F0D6A3] transition-colors">
                          {d.description}
                        </div>
                        <div className="text-[11px] text-[#A8AAA3] flex items-center gap-2">
                          <span>{d.date}</span>
                          <span>•</span>
                          <span>{d.counterparty}</span>
                          <span>•</span>
                          <span className="capitalize">{d.method || 'ACH'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-[#F4EFE5]">
                        ${Math.abs(d.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#6F7C80] italic p-3 rounded-xl bg-[#111D24] border border-[#24343A]">
                No individual single-point driver dominated this line item.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#24343A] bg-[#111D24] flex items-center justify-between">
          <Link
            href={`/transactions?month=${variance.target_month}`}
            className="text-xs text-[#C89B5D] hover:text-[#E5C58E] flex items-center gap-1.5 font-medium transition-colors"
          >
            <span>Explore all {variance.target_month} transactions in Ledger</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#16242B] hover:bg-[#24343A] text-[#F4EFE5] text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
