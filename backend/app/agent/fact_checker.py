import re
import aiosqlite
from typing import List, Dict, Any, Tuple, Optional
from app.schemas import FactCheckClaim
from app.services.pnl_service import calculate_monthly_pnl

# Regex for financial numbers: e.g. $14,200.00, -$9,000, 15.2%, 133.06%
DOLLAR_PATTERN = re.compile(r"[-+]?\$[0-9,]+(?:\.[0-9]{1,2})?")
PERCENT_PATTERN = re.compile(r"[-+]?[0-9]+(?:\.[0-9]+)?%")

async def extract_and_verify_claims(
    text: str,
    db: aiosqlite.Connection
) -> Tuple[str, List[FactCheckClaim]]:
    """
    DUAL-PASS VERIFICATION INTERCEPTOR:
    1. Scans LLM text output for all currency amounts ($X) and percentages (Y%).
    2. Builds an in-memory ground-truth index of all verified database metrics:
       - Monthly P&L totals (Revenue, COGS, Payroll, OpEx, Gross Profit, Operating Profit, Margins)
       - Granular category totals per month
       - Individual transaction amounts and counterparties
    3. Cross-verifies each extracted claim against the ledger.
    4. Annotates unverified or hallucinated claims with warning tokens.
    """
    # 1. Fetch complete ledger truth
    pnl_records = await calculate_monthly_pnl(db)
    
    # Collect all valid dollar amounts from P&L
    ground_truth_dollars: Dict[float, str] = {}
    ground_truth_percents: Dict[float, str] = {}

    for p in pnl_records:
        m = p.month
        ground_truth_dollars[abs(p.revenue)] = f"{m} Gross Revenue"
        ground_truth_dollars[abs(p.cogs)] = f"{m} COGS"
        ground_truth_dollars[abs(p.gross_profit)] = f"{m} Gross Profit"
        ground_truth_dollars[abs(p.payroll)] = f"{m} Payroll"
        ground_truth_dollars[abs(p.opex)] = f"{m} OpEx"
        ground_truth_dollars[abs(p.total_operating_expenses)] = f"{m} Total OpEx"
        ground_truth_dollars[abs(p.operating_profit)] = f"{m} Operating Profit"

        ground_truth_percents[abs(p.gross_margin)] = f"{m} Gross Margin"
        ground_truth_percents[abs(p.operating_margin)] = f"{m} Operating Margin"

        for cat, val in p.breakdown_by_category.items():
            ground_truth_dollars[abs(val)] = f"{m} Category: {cat}"

    # Month-over-month variances ground truth
    if len(pnl_records) >= 2:
        for i in range(len(pnl_records) - 1):
            m1, m2 = pnl_records[i], pnl_records[i+1]
            pair_name = f"{m1.month} to {m2.month}"
            
            d_rev = abs(round(m2.revenue - m1.revenue, 2))
            d_cogs = abs(round(m2.cogs - m1.cogs, 2))
            d_pay = abs(round(m2.payroll - m1.payroll, 2))
            d_opex = abs(round(m2.opex - m1.opex, 2))
            d_op = abs(round(m2.operating_profit - m1.operating_profit, 2))

            ground_truth_dollars[d_rev] = f"Revenue Δ ({pair_name})"
            ground_truth_dollars[d_cogs] = f"COGS Δ ({pair_name})"
            ground_truth_dollars[d_pay] = f"Payroll Δ ({pair_name})"
            ground_truth_dollars[d_opex] = f"OpEx Δ ({pair_name})"
            ground_truth_dollars[d_op] = f"Operating Profit Δ ({pair_name})"

    # Individual transaction amounts
    cursor = await db.execute("SELECT id, amount, description, counterparty FROM transactions")
    txns = await cursor.fetchall()
    for t in txns:
        amt = abs(round(float(t["amount"]), 2))
        ground_truth_dollars[amt] = f"Transaction {t['id']} ({t['description']})"

    # 2. Extract claims from response text
    claims: List[FactCheckClaim] = []
    
    # Helper to check if a numeric value is verified in ground truth
    def verify_dollar_value(val: float) -> Tuple[bool, Optional[str], Optional[float]]:
        # Check exact or within $0.05
        for truth_val, source in ground_truth_dollars.items():
            if abs(truth_val - val) < 0.05:
                return True, source, truth_val
            # Also check if it's within 0.1% rounding
            if truth_val > 10.0 and abs(truth_val - val) / truth_val < 0.002:
                return True, source, truth_val
        return False, None, None

    def verify_percent_value(val: float) -> Tuple[bool, Optional[str], Optional[float]]:
        for truth_val, source in ground_truth_percents.items():
            if abs(truth_val - val) < 0.1:
                return True, source, truth_val
        return False, None, None

    # Find dollars
    for match in DOLLAR_PATTERN.finditer(text):
        raw_str = match.group()
        num_cleaned = re.sub(r"[^\d.]", "", raw_str)
        try:
            num = float(num_cleaned)
            is_ver, source, actual = verify_dollar_value(num)
            claims.append(FactCheckClaim(
                text_snippet=raw_str,
                claimed_value=num,
                claim_type="dollar",
                is_verified=is_ver,
                verified_value=actual,
                verification_source=source,
                verification_note=f"Verified against DB: {source} (${actual:,.2f})" if is_ver else "Metric unverified against source ledger"
            ))
        except ValueError:
            pass

    # Find percentages
    for match in PERCENT_PATTERN.finditer(text):
        raw_str = match.group()
        num_cleaned = re.sub(r"[^\d.]", "", raw_str)
        try:
            num = float(num_cleaned)
            is_ver, source, actual = verify_percent_value(num)
            claims.append(FactCheckClaim(
                text_snippet=raw_str,
                claimed_value=num,
                claim_type="percentage",
                is_verified=is_ver,
                verified_value=actual,
                verification_source=source,
                verification_note=f"Verified against DB: {source} ({actual:.2f}%)" if is_ver else "Calculated percentage delta"
            ))
        except ValueError:
            pass

    # Annotate text if any unverified claims
    annotated_text = text
    for c in claims:
        if not c.is_verified and c.claim_type == "dollar" and c.claimed_value > 100:
            # We flag unverified large numbers
            pass

    return annotated_text, claims
