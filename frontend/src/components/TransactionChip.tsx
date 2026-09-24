'use client';

import React from 'react';
import { ExternalLink, Hash } from 'lucide-react';

interface TransactionChipProps {
  id: string;
  onClick?: (id: string) => void;
  label?: string;
  amount?: number;
}

export const TransactionChip: React.FC<TransactionChipProps> = ({ id, onClick, label, amount }) => {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(id);
      }}
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 my-0.5 rounded-md text-xs font-mono font-medium
                 bg-[#16242B] hover:bg-[#1C2C34] text-[#E5C58E] hover:text-[#F0D6A3] border border-[#24343A]
                 hover:border-[#C89B5D]/60 transition-all duration-150 shadow-sm cursor-pointer group"
      title={`Inspect ledger audit trail for ${id}`}
    >
      <Hash className="w-3 h-3 text-[#C89B5D] group-hover:rotate-12 transition-transform" />
      <span>{label || id}</span>
      {amount !== undefined && (
        <span className={`text-[10px] ml-1 font-semibold ${amount < 0 ? 'text-[#E66A63]' : 'text-[#55C99A]'}`}>
          ${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      )}
      <ExternalLink className="w-2.5 h-2.5 opacity-60 text-[#C89B5D] group-hover:opacity-100" />
    </button>
  );
};
