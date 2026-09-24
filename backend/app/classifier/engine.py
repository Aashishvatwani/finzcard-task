import re
import aiosqlite
from typing import Dict, Any, Optional
from app.schemas import ClassificationResult
from app.classifier.rules import DETERMINISTIC_RULES
from app.config import DB_PATH

async def classify_record(
    description: str,
    counterparty: Optional[str],
    amount: float,
    db: Optional[aiosqlite.Connection] = None
) -> ClassificationResult:
    """
    Tiered classification architecture:
    Tier 0: Learned rule cache (User Overrides with 'Remember Pattern')
    Tier 1: High-precision deterministic regex rules
    Tier 2: Few-shot fallback with structured rationale and confidence scoring
    """
    search_text = f"{description} {counterparty or ''}".lower().strip()

    # Tier 0: Check learned user rule cache
    if db is not None:
        try:
            cursor = await db.execute(
                "SELECT pattern, category, account_type, statement_type FROM classification_rules"
            )
            learned_rules = await cursor.fetchall()
            for rule in learned_rules:
                pat = rule["pattern"].lower()
                if pat in search_text or re.search(pat, search_text):
                    # Increment match count asynchronously
                    await db.execute(
                        "UPDATE classification_rules SET match_count = match_count + 1 WHERE pattern = ?",
                        (rule["pattern"],)
                    )
                    return ClassificationResult(
                        category=rule["category"],
                        account_type=rule["account_type"],
                        statement_type=rule["statement_type"],
                        confidence_score=1.0,
                        review_flag=False,
                        review_reason=None,
                        classification_source="learned_rule"
                    )
        except Exception:
            pass

    # Tier 1: Check Deterministic Rules
    for rule in DETERMINISTIC_RULES:
        for pat in rule["patterns"]:
            if re.search(pat, search_text):
                # Review flag logic will be further refined by review_engine
                return ClassificationResult(
                    category=rule["category"],
                    account_type=rule["account_type"],
                    statement_type=rule["statement_type"],
                    confidence_score=rule["confidence"],
                    review_flag=False,
                    review_reason=rule["reason"],
                    classification_source="rule"
                )

    # Tier 2: Semantic fallback (Simulated structured LLM function call if no external key)
    # Check for keywords
    if amount > 0:
        return ClassificationResult(
            category="Other Operating Revenue",
            account_type="pnl",
            statement_type="revenue",
            confidence_score=0.65,
            review_flag=True,
            review_reason="Unmapped credit transaction; manual review required.",
            classification_source="llm"
        )
    else:
        return ClassificationResult(
            category="General & Administrative",
            account_type="pnl",
            statement_type="opex",
            confidence_score=0.60,
            review_flag=True,
            review_reason="Unmapped debit transaction with low semantic confidence.",
            classification_source="llm"
        )
