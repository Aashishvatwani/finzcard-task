'use client';

import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, Database } from 'lucide-react';
import { FactCheckClaim } from '@/lib/types';

interface FactCheckBadgeProps {
  claim: FactCheckClaim;
}

export const FactCheckBadge: React.FC<FactCheckBadgeProps> = ({ claim }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (claim.is_verified) {
    return (
      <div className="relative inline-block my-1 mr-1.5">
        <span
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={() => setShowTooltip(!showTooltip)}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium
                     bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 hover:border-emerald-400
                     shadow-sm cursor-help transition-all"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="font-mono font-semibold">{claim.text_snippet}</span>
          <span className="text-[9px] uppercase tracking-wider bg-emerald-900/60 px-1 py-0.2 rounded text-emerald-200">
            Verified by Ledger
          </span>
        </span>

        {showTooltip && (
          <div className="absolute z-50 bottom-full left-0 mb-1.5 w-64 p-2.5 rounded-lg bg-slate-900 border border-emerald-500/40 text-slate-200 text-xs shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-400 mb-1">
              <Database className="w-3.5 h-3.5" />
              <span>Ground Truth Ledger Verification</span>
            </div>
            <p className="text-[11px] text-slate-300">{claim.verification_note}</p>
            {claim.verification_source && (
              <div className="mt-1 text-[10px] text-emerald-300/80 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/30">
                Source: {claim.verification_source}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Unverified claim
  return (
    <div className="relative inline-block my-1 mr-1.5">
      <span
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium
                   bg-rose-950/70 text-rose-300 border border-rose-500/40 hover:border-rose-400
                   shadow-sm cursor-help transition-all"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
        <span className="font-mono font-semibold">{claim.text_snippet}</span>
        <span className="text-[9px] uppercase tracking-wider bg-rose-900/60 px-1 py-0.2 rounded text-rose-200">
          Unverified Metric
        </span>
      </span>

      {showTooltip && (
        <div className="absolute z-50 bottom-full left-0 mb-1.5 w-64 p-2.5 rounded-lg bg-slate-900 border border-rose-500/40 text-slate-200 text-xs shadow-xl animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-1.5 font-semibold text-rose-400 mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Integrity Alert</span>
          </div>
          <p className="text-[11px] text-slate-300">{claim.verification_note}</p>
          <p className="mt-1 text-[10px] text-rose-300/80 bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-800/30">
            Defensive AI Interceptor: Claim could not be traced to verified SQLite records.
          </p>
        </div>
      )}
    </div>
  );
};
