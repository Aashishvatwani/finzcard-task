import sqlite3
import aiosqlite
from pathlib import Path
from app.config import DB_PATH

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,                  -- Format: YYYY-MM-DD
    description TEXT NOT NULL,
    counterparty TEXT,
    amount REAL NOT NULL,                -- Positive: Credit/Inflow, Negative: Debit/Outflow
    method TEXT,
    category TEXT NOT NULL,              -- Target Account
    account_type TEXT NOT NULL,          -- 'pnl' | 'balance_sheet'
    statement_type TEXT NOT NULL,        -- 'revenue' | 'cogs' | 'payroll' | 'opex' | 'non_pnl'
    confidence_score REAL NOT NULL,      -- Range: 0.0 to 1.0
    needs_review BOOLEAN NOT NULL DEFAULT 0,
    review_reason TEXT,
    is_user_modified BOOLEAN NOT NULL DEFAULT 0,
    classification_source TEXT DEFAULT 'rule' -- 'rule' | 'learned_rule' | 'llm' | 'user'
);

CREATE TABLE IF NOT EXISTS review_queue (
    transaction_id TEXT PRIMARY KEY,
    flagged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT 0,
    resolution_notes TEXT,
    FOREIGN KEY(transaction_id) REFERENCES transactions(id)
);

CREATE TABLE IF NOT EXISTS classification_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    account_type TEXT NOT NULL,
    statement_type TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    match_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT NOT NULL,
    actor TEXT DEFAULT 'evaluator',      -- User / Auditor identity
    reason TEXT,                         -- Reason for modification
    action TEXT NOT NULL,                -- 'create', 'override', 'rule_applied', 'resolved'
    old_values TEXT,                     -- JSON string
    new_values TEXT,                     -- JSON string
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_statement_type ON transactions(statement_type);
CREATE INDEX IF NOT EXISTS idx_transactions_account_type ON transactions(account_type);
CREATE INDEX IF NOT EXISTS idx_transactions_needs_review ON transactions(needs_review);
"""

def init_db(db_path: Path = DB_PATH):
    """Synchronous database initialization."""
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    cursor.executescript(SCHEMA_SQL)
    # Safe migrations if table already existed
    try:
        cursor.execute("ALTER TABLE audit_log ADD COLUMN actor TEXT DEFAULT 'evaluator'")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE audit_log ADD COLUMN reason TEXT")
    except Exception:
        pass
    conn.commit()
    conn.close()

async def get_db_connection() -> aiosqlite.Connection:
    """Async database connection context."""
    db = await aiosqlite.connect(str(DB_PATH))
    db.row_factory = aiosqlite.Row
    return db
