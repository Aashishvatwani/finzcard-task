import io
import re
import uuid
from typing import Tuple, List, Dict, Any
import pandas as pd

def normalize_csv(file_content: bytes) -> pd.DataFrame:
    """
    Fuzzy header detection and normalization for bank/POS exports.
    Handles:
      - Variable date headers ('Date', 'Transaction Date', 'Post Date')
      - Variable amount configurations (single Amount column or Debit + Credit columns)
      - Sanitization of currency symbols ($, commas, parenthesis for negatives)
      - ID preservation or generation
    """
    # Try reading as CSV or TSV
    try:
        df = pd.read_csv(io.BytesIO(file_content))
    except Exception:
        df = pd.read_csv(io.BytesIO(file_content), sep="\t")

    # Lowercase & strip column headers for flexible fuzzy matching
    col_map = {c: c.strip().lower() for c in df.columns}
    normalized_cols = {orig: clean for orig, clean in col_map.items()}

    # Helper to find column matching any keyword
    def find_col(keywords: List[str]) -> str | None:
        for orig, clean in normalized_cols.items():
            if any(kw in clean for kw in keywords):
                return orig
        return None

    date_col = find_col(["date", "time", "posted"])
    if not date_col:
        raise ValueError("Could not find a valid date column (e.g., 'Date', 'Transaction Date').")

    desc_col = find_col(["description", "desc", "memo", "narrative", "payee", "counterparty", "vendor"])
    if not desc_col:
        raise ValueError("Could not find a valid description/memo column.")

    counterparty_col = find_col(["counterparty", "payee", "merchant", "vendor"])
    method_col = find_col(["method", "payment method", "type", "channel"])
    id_col = find_col(["transaction id", "trans id", "txn id", "txn_id", "id", "reference"])

    # Amount detection
    credit_col = find_col(["credit", "deposit", "inflow"])
    debit_col = find_col(["debit", "withdrawal", "outflow", "expense"])
    amount_col = find_col(["amount", "amt", "net amount", "total"])

    clean_df = pd.DataFrame()

    # 1. ID handling
    if id_col and id_col in df.columns and df[id_col].notna().any():
        clean_df["id"] = df[id_col].astype(str).str.strip()
    else:
        clean_df["id"] = [f"TXN-{uuid.uuid4().hex[:8].upper()}" for _ in range(len(df))]

    # 2. Date handling -> YYYY-MM-DD
    parsed_dates = pd.to_datetime(df[date_col], errors="coerce")
    clean_df["date"] = parsed_dates.dt.strftime("%Y-%m-%d").fillna("2026-01-01")

    # 3. Description handling
    clean_df["description"] = df[desc_col].astype(str).str.strip()

    # 4. Counterparty handling
    if counterparty_col and counterparty_col != desc_col:
        clean_df["counterparty"] = df[counterparty_col].astype(str).str.strip()
    else:
        # Fallback counterparty extraction from description
        clean_df["counterparty"] = clean_df["description"]

    # 5. Method handling
    if method_col:
        clean_df["method"] = df[method_col].astype(str).str.strip()
    else:
        clean_df["method"] = "Unknown"

    # 6. Amount handling
    def parse_amount_str(val: Any) -> float:
        if pd.isna(val):
            return 0.0
        val_str = str(val).strip()
        # Handle accounting parenthesis: ($500.00) -> -500.00
        is_negative = False
        if val_str.startswith("(") and val_str.endswith(")"):
            is_negative = True
            val_str = val_str[1:-1]
        elif "-" in val_str:
            is_negative = True
        
        cleaned = re.sub(r"[^\d.]", "", val_str)
        try:
            num = float(cleaned) if cleaned else 0.0
            return -num if is_negative else num
        except ValueError:
            return 0.0

    if credit_col and debit_col and credit_col in df.columns and debit_col in df.columns:
        credits = df[credit_col].apply(parse_amount_str)
        debits = df[debit_col].apply(parse_amount_str)
        clean_df["amount"] = (credits - debits.abs()).round(2)
    elif amount_col:
        clean_df["amount"] = df[amount_col].apply(parse_amount_str).round(2)
    else:
        raise ValueError("Could not find Amount column or Debit/Credit columns.")

    return clean_df
