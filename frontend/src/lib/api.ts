import {
  Transaction,
  MonthlyPnL,
  MaterialVariance,
  WaterfallBridge,
  ChatMessage,
  RuleCreateRequest,
  BalanceSheetItem,
  AuditLog
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error('Failed to fetch system health');
  return res.json();
}

export async function uploadTransactionsCSV(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

export async function seedSampleDataset() {
  const res = await fetch(`${API_BASE}/api/seed-sample`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to seed sample dataset');
  return res.json();
}

export async function fetchTransactions(params?: {
  month?: string;
  category?: string;
  statement_type?: string;
  account_type?: string;
  needs_review?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ total: number; limit: number; offset: number; items: Transaction[] }> {
  const query = new URLSearchParams();
  if (params?.month) query.set('month', params.month);
  if (params?.category) query.set('category', params.category);
  if (params?.statement_type) query.set('statement_type', params.statement_type);
  if (params?.account_type) query.set('account_type', params.account_type);
  if (params?.needs_review !== undefined) query.set('needs_review', String(params.needs_review));
  if (params?.search) query.set('search', params.search);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));

  const res = await fetch(`${API_BASE}/api/transactions?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}

export async function fetchTransactionDetail(id: string): Promise<Transaction> {
  const res = await fetch(`${API_BASE}/api/transactions/${id}`);
  if (!res.ok) throw new Error(`Transaction ${id} not found`);
  return res.json();
}

export async function updateTransaction(
  id: string,
  update: {
    category?: string;
    account_type?: string;
    statement_type?: string;
    needs_review?: boolean;
    review_reason?: string;
    remember_rule?: boolean;
    rule_pattern?: string;
  }
) {
  const res = await fetch(`${API_BASE}/api/transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error('Failed to update transaction');
  return res.json();
}

export async function resolveReviewItem(id: string, notes?: string) {
  const res = await fetch(`${API_BASE}/api/review-queue/${id}/resolve?notes=${encodeURIComponent(notes || 'Verified')}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to resolve review item');
  return res.json();
}

export async function fetchPnL(): Promise<MonthlyPnL[]> {
  const res = await fetch(`${API_BASE}/api/pnl`);
  if (!res.ok) throw new Error('Failed to fetch P&L');
  return res.json();
}

export async function fetchBalanceSheet(): Promise<BalanceSheetItem[]> {
  const res = await fetch(`${API_BASE}/api/pnl/balance-sheet`);
  if (!res.ok) throw new Error('Failed to fetch balance sheet items');
  return res.json();
}

export async function fetchVariances(base_month: string, target_month: string): Promise<MaterialVariance[]> {
  const res = await fetch(`${API_BASE}/api/variances?base_month=${base_month}&target_month=${target_month}`);
  if (!res.ok) throw new Error('Failed to fetch variances');
  return res.json();
}

export async function fetchWaterfallBridge(base_month: string, target_month: string): Promise<WaterfallBridge> {
  const res = await fetch(`${API_BASE}/api/waterfall-bridge?base_month=${base_month}&target_month=${target_month}`);
  if (!res.ok) throw new Error('Failed to fetch waterfall bridge');
  return res.json();
}

export async function previewRuleMatch(pattern: string): Promise<{ pattern: string; match_count: number }> {
  const res = await fetch(`${API_BASE}/api/rules/preview-match?pattern=${encodeURIComponent(pattern)}`);
  if (!res.ok) throw new Error('Failed to preview rule match');
  return res.json();
}

export async function createRule(rule: RuleCreateRequest) {
  const res = await fetch(`${API_BASE}/api/rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule),
  });
  if (!res.ok) throw new Error('Failed to create rule');
  return res.json();
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const res = await fetch(`${API_BASE}/api/audit-logs`);
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
}

export async function sendAnalystChat(message: string, history?: ChatMessage[]): Promise<ChatMessage> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) {
    // If Next.js route is not ready, fallback directly to FastAPI backend
    const fallbackRes = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });
    if (!fallbackRes.ok) throw new Error('Chat failed');
    return fallbackRes.json();
  }
  return res.json();
}
