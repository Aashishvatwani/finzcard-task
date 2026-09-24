from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal

class TransactionBase(BaseModel):
    id: str
    date: str
    description: str
    counterparty: Optional[str] = None
    amount: float
    method: Optional[str] = None
    category: str
    account_type: Literal["pnl", "balance_sheet"]
    statement_type: Literal["revenue", "cogs", "payroll", "opex", "non_pnl"]
    confidence_score: float = Field(ge=0.0, le=1.0)
    needs_review: bool = False
    review_reason: Optional[str] = None
    is_user_modified: bool = False
    classification_source: Optional[str] = "rule"

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    category: Optional[str] = None
    account_type: Optional[Literal["pnl", "balance_sheet"]] = None
    statement_type: Optional[Literal["revenue", "cogs", "payroll", "opex", "non_pnl"]] = None
    needs_review: Optional[bool] = None
    review_reason: Optional[str] = None
    remember_rule: Optional[bool] = False
    rule_pattern: Optional[str] = None

class ClassificationResult(BaseModel):
    category: str
    account_type: Literal["pnl", "balance_sheet"]
    statement_type: Literal["revenue", "cogs", "payroll", "opex", "non_pnl"]
    confidence_score: float
    review_flag: bool
    review_reason: Optional[str] = None
    classification_source: str = "rule"

class MonthlyPnL(BaseModel):
    month: str
    revenue: float
    cogs: float
    gross_profit: float
    gross_margin: float
    payroll: float
    opex: float
    total_operating_expenses: float
    operating_profit: float
    operating_margin: float
    breakdown_by_category: Dict[str, float] = {}

class MaterialVariance(BaseModel):
    line_item_or_category: str
    item_type: Literal["line_item", "category"]
    base_month: str
    target_month: str
    base_amount: float
    target_amount: float
    delta_abs: float
    delta_pct: float
    is_material: bool
    top_drivers: List[Dict[str, Any]] = []
    explanation: Optional[str] = None

class WaterfallStep(BaseModel):
    name: str
    category: str
    amount: float
    running_total: float
    type: Literal["base", "increase", "decrease", "final"]

class WaterfallBridge(BaseModel):
    base_month: str
    target_month: str
    base_operating_profit: float
    target_operating_profit: float
    delta_revenue: float
    delta_cogs: float
    delta_payroll: float
    delta_opex: float
    net_operating_profit_delta: float
    steps: List[WaterfallStep]

class FactCheckClaim(BaseModel):
    text_snippet: str
    claimed_value: float
    claim_type: str  # 'dollar' | 'percentage'
    is_verified: bool
    verified_value: Optional[float] = None
    verification_source: Optional[str] = None
    verification_note: str

class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str
    citations: Optional[List[str]] = []
    verified_claims: Optional[List[FactCheckClaim]] = []

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []

class RuleCreateRequest(BaseModel):
    pattern: str
    category: str
    account_type: Literal["pnl", "balance_sheet"]
    statement_type: Literal["revenue", "cogs", "payroll", "opex", "non_pnl"]
    apply_to_existing: bool = True
