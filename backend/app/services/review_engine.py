import re
import pandas as pd
from typing import Dict, Any, List, Tuple
from app.config import (
    CONFIDENCE_THRESHOLD,
    OUTLIER_STD_DEV_MULTIPLIER,
    DUPLICATE_HOURS_WINDOW
)

VAGUE_PATTERNS = [
    r"^wire\s*(transfer|out|in)?$",
    r"^check\s*#?\d*$",
    r"^misc\s*(withdrawal|deposit)?$",
    r"^transfer$",
    r"^ach\s*(debit|credit)?$",
    r"^adjustment$",
    r"^pending$"
]

def evaluate_review_flags(
    df: pd.DataFrame
) -> pd.DataFrame:
    """
    Applies defensive financial accounting review rules:
      1. Low confidence (< 0.70)
      2. Balance Sheet exclusion (CapEx, Debt Principal, Tax Remittance, Owner Draw, Gift Card)
      3. Statistical Anomaly (> 3-sigma from vendor's historical mean)
      4. Duplicate Transaction Detection (Same vendor, same amount within 48 hours)
      5. Uninformative / Vague Memo
    """
    df = df.copy()
    if "needs_review" not in df.columns:
        df["needs_review"] = False
    if "review_reason" not in df.columns:
        df["review_reason"] = ""

    # Ensure date is datetime
    dates = pd.to_datetime(df["date"], errors="coerce")

    # 1. Low confidence
    low_conf_mask = df["confidence_score"] < CONFIDENCE_THRESHOLD
    for idx in df[low_conf_mask].index:
        df.loc[idx, "needs_review"] = True
        reason = f"Low confidence classification ({df.loc[idx, 'confidence_score']:.2f} < {CONFIDENCE_THRESHOLD})"
        cur_reason = df.loc[idx, "review_reason"]
        df.loc[idx, "review_reason"] = f"{cur_reason}; {reason}" if cur_reason else reason

    # 2. Balance Sheet / Non-P&L separation flag
    # Balance sheet items are critical for tax & audit verification
    bs_mask = df["account_type"] == "balance_sheet"
    for idx in df[bs_mask].index:
        df.loc[idx, "needs_review"] = True
        cat = df.loc[idx, "category"]
        reason = f"Non-P&L Balance Sheet Item ({cat}) - Excluded from Net Operating Income"
        cur_reason = df.loc[idx, "review_reason"]
        df.loc[idx, "review_reason"] = f"{cur_reason}; {reason}" if cur_reason else reason

    # 3. Vague memo detection
    for idx, row in df.iterrows():
        desc = str(row["description"]).strip().lower()
        if any(re.match(p, desc) for p in VAGUE_PATTERNS) or len(desc) <= 3:
            df.loc[idx, "needs_review"] = True
            reason = "Vague or uninformative transaction memo"
            cur_reason = df.loc[idx, "review_reason"]
            df.loc[idx, "review_reason"] = f"{cur_reason}; {reason}" if cur_reason else reason

    # 4. Statistical Anomaly Detection (> 3-sigma per counterparty/vendor)
    grouped = df.groupby("counterparty")
    for cp, group in grouped:
        if len(group) >= 4:
            amounts = group["amount"].abs()
            mean = amounts.mean()
            std = amounts.std()
            if std > 0:
                for idx in group.index:
                    val = abs(df.loc[idx, "amount"])
                    z_score = (val - mean) / std
                    if z_score > OUTLIER_STD_DEV_MULTIPLIER:
                        df.loc[idx, "needs_review"] = True
                        reason = f"Statistical outlier: Amount ${val:,.2f} is {z_score:.1f}σ above vendor mean (${mean:,.2f})"
                        cur_reason = df.loc[idx, "review_reason"]
                        df.loc[idx, "review_reason"] = f"{cur_reason}; {reason}" if cur_reason else reason

    # 5. Duplicate charge detector (Same vendor, same amount within 48h)
    df_sorted = df.sort_values(by="date")
    for cp, group in df_sorted.groupby("counterparty"):
        if len(group) > 1:
            prev_row = None
            for idx, row in group.iterrows():
                if prev_row is not None:
                    amt_diff = abs(row["amount"] - prev_row["amount"])
                    day_diff = (pd.to_datetime(row["date"]) - pd.to_datetime(prev_row["date"])).days
                    if amt_diff < 0.01 and 0 <= day_diff <= 2:
                        df.loc[idx, "needs_review"] = True
                        reason = f"Potential duplicate charge: ${abs(row['amount']):,.2f} matches {prev_row['id']} within {day_diff} days"
                        cur_reason = df.loc[idx, "review_reason"]
                        df.loc[idx, "review_reason"] = f"{cur_reason}; {reason}" if cur_reason else reason
                prev_row = row

    return df
