'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { WaterfallBridge as WaterfallBridgeType } from '@/lib/types';

interface WaterfallBridgeProps {
  bridge: WaterfallBridgeType | null;
}

export const WaterfallBridge: React.FC<WaterfallBridgeProps> = ({ bridge }) => {
  if (!bridge) {
    return (
      <div className="p-8 text-center text-[#6F7C80] text-xs">
        No comparative period data available for waterfall decomposition.
      </div>
    );
  }

  const {
    base_month,
    target_month,
    base_operating_profit,
    target_operating_profit,
    delta_revenue,
    delta_cogs,
    delta_payroll,
    delta_opex,
    net_operating_profit_delta,
    steps,
  } = bridge;

  return (
    <div className="p-6 rounded-2xl bg-[#111D24]/85 border border-[#24343A] backdrop-blur-md space-y-6 shadow-xl">
      {/* Title & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#24343A] pb-4">
        <div>
          <h3 className="text-base font-bold text-[#F4EFE5]">
            Operating Profit Waterfall Bridge ({base_month} → {target_month})
          </h3>
          <p className="text-xs text-[#A8AAA3] mt-1">
            Exact mathematical decomposition: Δ Operating Profit = Δ Revenue − Δ COGS − Δ Payroll − Δ OpEx
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="bg-[#0C171D] p-2.5 rounded-xl border border-[#24343A] text-right">
            <span className="text-[10px] text-[#A8AAA3] uppercase block font-semibold">Base ({base_month})</span>
            <span className="text-sm font-bold font-mono text-[#F4EFE5]">
              ${base_operating_profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-[#0C171D] p-2.5 rounded-xl border border-[#24343A] text-right">
            <span className="text-[10px] text-[#A8AAA3] uppercase block font-semibold">Target ({target_month})</span>
            <span
              className={`text-sm font-bold font-mono ${
                target_operating_profit >= base_operating_profit ? 'text-[#55C99A]' : 'text-[#E3A83B]'
              }`}
            >
              ${target_operating_profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-[#0C171D] p-2.5 rounded-xl border border-[#24343A] text-right">
            <span className="text-[10px] text-[#A8AAA3] uppercase block font-semibold">Net Bottom-Line Delta</span>
            <span
              className={`text-sm font-bold font-mono ${
                net_operating_profit_delta >= 0 ? 'text-[#55C99A]' : 'text-[#E66A63]'
              }`}
            >
              {net_operating_profit_delta >= 0 ? '+' : '-'}${Math.abs(net_operating_profit_delta).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Waterfall Columns / Step Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 pt-2">
        {steps.map((step, idx) => {
          const isBase = step.type === 'base';
          const isFinal = step.type === 'final';
          const isPositive = step.amount >= 0;

          return (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all duration-150 ${
                isBase
                  ? 'bg-[#16242B] border-[#24343A]'
                  : isFinal
                  ? 'bg-[#16242B] border-[#C89B5D]/70 shadow-lg shadow-[#C89B5D]/10'
                  : isPositive
                  ? 'bg-[#0C171D] border-[#55C99A]/40'
                  : 'bg-[#0C171D] border-[#E66A63]/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#A8AAA3] mb-1">
                  <span>Step {idx + 1}</span>
                  {!isBase && !isFinal && (
                    <span
                      className={`flex items-center text-[10px] font-bold ${
                        isPositive ? 'text-[#55C99A]' : 'text-[#E66A63]'
                      }`}
                    >
                      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {isPositive ? '+' : '-'}${Math.abs(step.amount).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-[#F4EFE5] leading-tight">{step.name}</h4>
              </div>

              <div className="mt-4 pt-2 border-t border-[#24343A]">
                <span className="text-[10px] uppercase tracking-wider text-[#A8AAA3] block font-semibold">Running Total</span>
                <span className="text-sm font-mono font-bold text-[#F4EFE5]">
                  ${step.running_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Driver Impact Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
        <div className="p-3.5 rounded-xl bg-[#0C171D] border border-[#24343A]">
          <span className="text-[#A8AAA3] uppercase text-[10px] font-bold block">1. Revenue Impact</span>
          <div className={`text-sm font-mono font-bold mt-1 ${delta_revenue >= 0 ? 'text-[#55C99A]' : 'text-[#E66A63]'}`}>
            {delta_revenue >= 0 ? '+' : '-'}${Math.abs(delta_revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-[#6F7C80]">Direct addition to top line</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0C171D] border border-[#24343A]">
          <span className="text-[#A8AAA3] uppercase text-[10px] font-bold block">2. COGS Impact</span>
          <div className={`text-sm font-mono font-bold mt-1 ${delta_cogs <= 0 ? 'text-[#55C99A]' : 'text-[#E66A63]'}`}>
            {delta_cogs > 0 ? '-' : '+'}${Math.abs(delta_cogs).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-[#6F7C80]">
            {delta_cogs > 0 ? 'Cost inflation / volume' : 'Cost efficiency / savings'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0C171D] border border-[#24343A]">
          <span className="text-[#A8AAA3] uppercase text-[10px] font-bold block">3. Payroll & Wages</span>
          <div className={`text-sm font-mono font-bold mt-1 ${delta_payroll <= 0 ? 'text-[#55C99A]' : 'text-[#E66A63]'}`}>
            {delta_payroll > 0 ? '-' : '+'}${Math.abs(delta_payroll).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-[#6F7C80]">Kitchen & FOH labor shift</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0C171D] border border-[#24343A]">
          <span className="text-[#A8AAA3] uppercase text-[10px] font-bold block">4. Operating Expenses</span>
          <div className={`text-sm font-mono font-bold mt-1 ${delta_opex <= 0 ? 'text-[#55C99A]' : 'text-[#E66A63]'}`}>
            {delta_opex > 0 ? '-' : '+'}${Math.abs(delta_opex).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-[#6F7C80]">Facility, utilities, maintenance</span>
        </div>
      </div>
    </div>
  );
};
