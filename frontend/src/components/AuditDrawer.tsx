'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  AlertCircle,
  History,
  CheckCircle2,
  BookmarkCheck,
  ExternalLink,
  Sliders
} from 'lucide-react';
import { Transaction, AccountType, StatementType } from '@/lib/types';
import { fetchTransactionDetail, updateTransaction, resolveReviewItem, previewRuleMatch } from '@/lib/api';

interface AuditDrawerProps {
  transactionId: string | null;
  onClose: () => void;
  onUpdateSuccess?: () => void;
  onNavigateToLedger?: (id: string) => void;
}

const CATEGORY_OPTIONS = [
  // Revenue
  'Food Sales',
  'Beverage Sales',
  'Catering Revenue',
  'Delivery Marketplace Sales',
  'Discounts & Refunds',
  // COGS
  'Food Inventory / Ingredients',
  'Beverage Inventory / Alcohol',
  'Packaging & Disposables',
  'Delivery Platform Fees',
  // Payroll
  'Hourly Wages',
  'Management Salaries',
  'Payroll Taxes & Benefits',
  // OpEx
  'Facility Rent',
  'POS & Software Subscriptions',
  'Business Insurance',
  'Professional & Accounting Fees',
  'Telecom & Internet',
  'Utilities',
  'Cleaning & Linen Services',
  'Marketing & Advertising',
  'Repairs & Maintenance',
  'Office & Administrative Supplies',
  'Licenses & Permits',
  // Balance Sheet Non-P&L
  'Fixed Assets / CapEx',
  'Tax Liabilities',
  'Debt Principal Repayment',
  'Owner Equity Distribution',
  'Deferred Revenue'
];

export const AuditDrawer: React.FC<AuditDrawerProps> = ({
  transactionId,
  onClose,
  onUpdateSuccess,
  onNavigateToLedger,
}) => {
  const [txn, setTxn] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [editCategory, setEditCategory] = useState('');
  const [editStatementType, setEditStatementType] = useState<StatementType>('cogs');
  const [editAccountType, setEditAccountType] = useState<AccountType>('pnl');
  const [rememberRule, setRememberRule] = useState(true);
  const [rulePattern, setRulePattern] = useState('');
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  useEffect(() => {
    if (!transactionId) {
      setTxn(null);
      return;
    }
    setLoading(true);
    setIsEditing(false);
    setSaveSuccessMsg('');
    fetchTransactionDetail(transactionId)
      .then((data) => {
        setTxn(data);
        setEditCategory(data.category);
        setEditStatementType(data.statement_type);
        setEditAccountType(data.account_type);
        const defaultPattern = data.counterparty || data.description.split(' ')[0] || '';
        setRulePattern(defaultPattern);
        if (defaultPattern) {
          previewRuleMatch(defaultPattern).then((res) => setMatchCount(res.match_count)).catch(() => {});
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [transactionId]);

  const handlePatternChange = (pat: string) => {
    setRulePattern(pat);
    if (pat.trim().length >= 2) {
      previewRuleMatch(pat.trim()).then((res) => setMatchCount(res.match_count)).catch(() => {});
    } else {
      setMatchCount(null);
    }
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txn) return;
    setSaving(true);
    try {
      const res = await updateTransaction(txn.id, {
        category: editCategory,
        statement_type: editStatementType,
        account_type: editAccountType,
        needs_review: false,
        review_reason: 'Resolved via auditor override',
        remember_rule: rememberRule,
        rule_pattern: rulePattern.trim(),
      });
      setSaveSuccessMsg(
        rememberRule && res.matching_records_updated > 1
          ? `Override saved & rule propagated to ${res.matching_records_updated} matching transactions!`
          : 'Classification updated and P&L ledger re-aggregated!'
      );
      // Reload detail
      const refreshed = await fetchTransactionDetail(txn.id);
      setTxn(refreshed);
      setIsEditing(false);
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (err: any) {
      alert(err.message || 'Failed to save override');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickResolve = async () => {
    if (!txn) return;
    try {
      await resolveReviewItem(txn.id, 'Verified by auditor in drawer');
      const refreshed = await fetchTransactionDetail(txn.id);
      setTxn(refreshed);
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!transactionId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#071015]/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0C171D] border-l border-[#24343A] shadow-2xl flex flex-col text-[#F4EFE5]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#24343A] flex items-center justify-between bg-[#111D24]">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#16242B] text-[#E5C58E] border border-[#24343A]">
                {txn?.id || transactionId}
              </span>
              <h2 className="text-base font-semibold text-[#F4EFE5]">Transaction Audit Drawer</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-[#A8AAA3] hover:text-[#F4EFE5] hover:bg-[#16242B] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#A8AAA3]">
                <div className="w-6 h-6 border-2 border-[#C89B5D] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Fetching ledger audit trace...</span>
              </div>
            ) : txn ? (
              <>
                {saveSuccessMsg && (
                  <div className="p-3 rounded-xl bg-[#16242B] border border-[#55C99A]/50 text-[#55C99A] text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                )}

                {/* Amount & Date Card */}
                <div className="p-4 rounded-xl bg-[#111D24] border border-[#24343A] flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-medium text-[#A8AAA3] uppercase tracking-wider">Amount</span>
                    <div
                      className={`text-2xl font-bold font-mono ${
                        txn.amount < 0 ? 'text-[#E66A63]' : 'text-[#55C99A]'
                      }`}
                    >
                      {txn.amount < 0 ? '-' : '+'}${Math.abs(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-medium text-[#A8AAA3] uppercase tracking-wider">Posted Date</span>
                    <div className="text-sm font-semibold font-mono text-[#F4EFE5]">{txn.date}</div>
                    <span className="text-[10px] text-[#A8AAA3]">Method: {txn.method || 'Standard'}</span>
                  </div>
                </div>

                {/* Counterparty & Memo */}
                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] text-[#A8AAA3] uppercase font-semibold">Counterparty / Merchant</span>
                    <p className="text-sm font-medium text-[#F4EFE5] mt-0.5">{txn.counterparty || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#A8AAA3] uppercase font-semibold">Bank Memo / Raw Description</span>
                    <p className="text-xs font-mono bg-[#0C171D] p-2.5 rounded-lg border border-[#24343A] text-[#F4EFE5] break-words mt-0.5">
                      {txn.description}
                    </p>
                  </div>
                </div>

                {/* Classification & Accounting Target */}
                <div className="p-4 rounded-xl bg-[#111D24] border border-[#24343A] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#F4EFE5] flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#C89B5D]" />
                      Classification Metadata
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded font-mono text-[#E5C58E] bg-[#16242B] border border-[#24343A]"
                    >
                      Source: {txn.classification_source}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#0C171D] p-2 rounded-lg border border-[#24343A]">
                      <span className="text-[10px] text-[#A8AAA3] uppercase block">Category</span>
                      <span className="font-semibold text-[#F4EFE5]">{txn.category}</span>
                    </div>
                    <div className="bg-[#0C171D] p-2 rounded-lg border border-[#24343A]">
                      <span className="text-[10px] text-[#A8AAA3] uppercase block">Statement Type</span>
                      <span className="font-semibold text-[#F4EFE5] uppercase">{txn.statement_type}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[#A8AAA3]">Confidence</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-[#16242B] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#C89B5D] h-full rounded-full"
                          style={{ width: `${Math.round(txn.confidence_score * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[#F4EFE5]">
                        {Math.round(txn.confidence_score * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Needs Review Alert Banner */}
                {txn.needs_review ? (
                  <div className="p-3.5 rounded-xl bg-[#16242B] border border-[#E3A83B]/50 space-y-2">
                    <div className="flex items-center justify-between text-[#E3A83B] text-xs font-semibold">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-[#E3A83B]" />
                        <span>Action Required: Flagged for Review</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#A8AAA3]">{txn.review_reason || 'Flagged by defensive anomaly detection'}</p>
                    <div className="pt-1 flex gap-2">
                      <button
                        onClick={handleQuickResolve}
                        className="px-2.5 py-1 rounded-lg bg-[#C89B5D] hover:bg-[#E5C58E] text-[#071015] text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm & Resolve</span>
                      </button>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-2.5 py-1 rounded-lg bg-[#0C171D] hover:bg-[#16242B] text-[#F4EFE5] text-xs font-medium border border-[#24343A] transition-colors cursor-pointer"
                      >
                        Re-classify
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-[#16242B] border border-[#55C99A]/40 flex items-center justify-between text-xs text-[#55C99A]">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#55C99A]" />
                      <span>Verified & Cleared by Accounting Engine</span>
                    </div>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-xs text-[#C89B5D] hover:text-[#E5C58E] underline font-medium cursor-pointer"
                    >
                      {isEditing ? 'Cancel Edit' : 'Edit Classification'}
                    </button>
                  </div>
                )}

                {/* Inline Re-classification & Active Learning Form */}
                {isEditing && (
                  <form onSubmit={handleSaveOverride} className="p-4 rounded-xl bg-[#111D24] border border-[#C89B5D]/50 space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#F0D6A3] uppercase tracking-wide">
                        Audit Classification Override
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="text-[#A8AAA3] hover:text-[#F4EFE5] text-xs"
                      >
                        Cancel
                      </button>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#A8AAA3] block mb-1">Target Account Category</label>
                      <select
                        value={editCategory}
                        onChange={(e) => {
                          const cat = e.target.value;
                          setEditCategory(cat);
                          if (['Fixed Assets / CapEx', 'Tax Liabilities', 'Debt Principal Repayment', 'Owner Equity Distribution', 'Deferred Revenue'].includes(cat)) {
                            setEditAccountType('balance_sheet');
                            setEditStatementType('non_pnl');
                          } else if (['Food Sales', 'Beverage Sales', 'Catering Revenue', 'Delivery Marketplace Sales', 'Discounts & Refunds'].includes(cat)) {
                            setEditAccountType('pnl');
                            setEditStatementType('revenue');
                          } else if (['Food Inventory / Ingredients', 'Beverage Inventory / Alcohol', 'Packaging & Disposables', 'Delivery Platform Fees'].includes(cat)) {
                            setEditAccountType('pnl');
                            setEditStatementType('cogs');
                          } else if (['Hourly Wages', 'Management Salaries', 'Payroll Taxes & Benefits'].includes(cat)) {
                            setEditAccountType('pnl');
                            setEditStatementType('payroll');
                          } else {
                            setEditAccountType('pnl');
                            setEditStatementType('opex');
                          }
                        }}
                        className="w-full bg-[#0C171D] border border-[#24343A] rounded-lg p-2 text-xs text-[#F4EFE5] focus:outline-none focus:border-[#C89B5D]"
                      >
                        {CATEGORY_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-[#A8AAA3] block mb-1">Statement</label>
                        <select
                          value={editStatementType}
                          onChange={(e) => setEditStatementType(e.target.value as StatementType)}
                          className="w-full bg-[#0C171D] border border-[#24343A] rounded p-1.5 text-xs text-[#F4EFE5]"
                        >
                          <option value="revenue">Revenue</option>
                          <option value="cogs">COGS</option>
                          <option value="payroll">Payroll</option>
                          <option value="opex">OpEx</option>
                          <option value="non_pnl">Non-P&L (Balance Sheet)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-[#A8AAA3] block mb-1">Account Type</label>
                        <select
                          value={editAccountType}
                          onChange={(e) => setEditAccountType(e.target.value as AccountType)}
                          className="w-full bg-[#0C171D] border border-[#24343A] rounded p-1.5 text-xs text-[#F4EFE5]"
                        >
                          <option value="pnl">P&L Operating</option>
                          <option value="balance_sheet">Balance Sheet Only</option>
                        </select>
                      </div>
                    </div>

                    {/* Active Learning Rule Cache Section */}
                    <div className="p-3 rounded-lg bg-[#0C171D] border border-[#24343A] space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="rememberRuleCheck"
                          checked={rememberRule}
                          onChange={(e) => setRememberRule(e.target.checked)}
                          className="rounded text-[#C89B5D] focus:ring-0 bg-[#16242B] border-[#24343A] cursor-pointer"
                        />
                        <label htmlFor="rememberRuleCheck" className="text-xs font-semibold text-[#F0D6A3] cursor-pointer">
                          Active Learning: Remember Rule for Matching Records
                        </label>
                      </div>

                      {rememberRule && (
                        <div className="space-y-1.5 pl-5 pt-1">
                          <label className="text-[10px] text-[#A8AAA3] block">Match Pattern / Substring</label>
                          <input
                            type="text"
                            value={rulePattern}
                            onChange={(e) => handlePatternChange(e.target.value)}
                            placeholder="e.g. Sysco, Toast, Chevron"
                            className="w-full bg-[#111D24] border border-[#24343A] rounded px-2 py-1 text-xs text-[#F4EFE5] font-mono"
                          />
                          {matchCount !== null && (
                            <div className="text-[11px] text-[#E3A83B] flex items-center gap-1">
                              <BookmarkCheck className="w-3.5 h-3.5" />
                              <span>Found {matchCount} matching transactions that will be auto-updated.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full py-2 rounded-lg bg-[#C89B5D] hover:bg-[#E5C58E] text-[#071015] font-bold text-xs transition-colors shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-[#071015] border-t-transparent rounded-full animate-spin" />
                          <span>Updating Ledger...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Save Override & Re-aggregate P&L</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Audit Trail Section */}
                <div className="space-y-2 pt-2 border-t border-[#24343A]">
                  <span className="text-xs font-semibold text-[#F4EFE5] flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[#C89B5D]" />
                    Ledger Audit Trail History
                  </span>
                  {txn.audit_trail && txn.audit_trail.length > 0 ? (
                    <div className="space-y-2 text-xs">
                      {txn.audit_trail.map((log) => (
                        <div key={log.id} className="p-2.5 rounded-lg bg-[#111D24] border border-[#24343A] space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-[#A8AAA3]">
                            <span className="font-semibold uppercase tracking-wider text-[#C89B5D]">{log.action}</span>
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="text-[11px] text-[#F4EFE5] font-mono">
                            Changed to: <span className="text-[#55C99A]">{log.new_values?.category}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#6F7C80] italic">No manual overrides recorded. Classification is currently original.</p>
                  )}
                </div>

                {/* Navigate to Ledger button */}
                {onNavigateToLedger && (
                  <div className="pt-2">
                    <button
                      onClick={() => onNavigateToLedger(txn.id)}
                      className="w-full py-2 rounded-lg bg-[#16242B] hover:bg-[#1E303A] text-[#F4EFE5] text-xs font-medium border border-[#24343A] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#C89B5D]" />
                      <span>Highlight in Ledger Table</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20 text-[#6F7C80] text-xs">Transaction not found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
