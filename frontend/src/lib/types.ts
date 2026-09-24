export type AccountType = 'pnl' | 'balance_sheet';
export type StatementType = 'revenue' | 'cogs' | 'payroll' | 'opex' | 'non_pnl';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  counterparty: string;
  amount: number;
  method?: string;
  category: string;
  account_type: AccountType;
  statement_type: StatementType;
  confidence_score: number;
  needs_review: boolean;
  review_reason?: string;
  is_user_modified: boolean;
  classification_source: string;
  audit_trail?: AuditLog[];
}

export interface MonthlyPnL {
  month: string;
  revenue: number;
  cogs: number;
  gross_profit: number;
  gross_margin: number;
  payroll: number;
  opex: number;
  total_operating_expenses: number;
  operating_profit: number;
  operating_margin: number;
  breakdown_by_category: Record<string, number>;
}

export interface MaterialVariance {
  line_item_or_category: string;
  item_type: 'line_item' | 'category';
  base_month: string;
  target_month: string;
  base_amount: number;
  target_amount: number;
  delta_abs: number;
  delta_pct: number;
  is_material: boolean;
  top_drivers: Transaction[];
  explanation?: string;
}

export interface WaterfallStep {
  name: string;
  category: string;
  amount: number;
  running_total: number;
  type: 'base' | 'increase' | 'decrease' | 'final';
}

export interface WaterfallBridge {
  base_month: string;
  target_month: string;
  base_operating_profit: number;
  target_operating_profit: number;
  delta_revenue: number;
  delta_cogs: number;
  delta_payroll: number;
  delta_opex: number;
  net_operating_profit_delta: number;
  steps: WaterfallStep[];
}

export interface FactCheckClaim {
  text_snippet: string;
  claimed_value: number;
  claim_type: 'dollar' | 'percentage';
  is_verified: boolean;
  verified_value?: number;
  verification_source?: string;
  verification_note: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: string[];
  verified_claims?: FactCheckClaim[];
}

export interface RuleCreateRequest {
  pattern: string;
  category: string;
  account_type: AccountType;
  statement_type: StatementType;
  apply_to_existing?: boolean;
}

export interface AuditLog {
  id: number;
  transaction_id: string;
  action: string;
  old_values: Record<string, any>;
  new_values: Record<string, any>;
  timestamp: string;
}

export interface BalanceSheetItem {
  month: string;
  id: string;
  date: string;
  description: string;
  counterparty: string;
  category: string;
  amount: number;
  review_reason: string;
}
