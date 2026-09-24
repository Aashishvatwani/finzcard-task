# FINZ AI — System Architecture & Data Model Reference

This document details the internal architecture, classification pipeline, review engine, and database schema for the FINZ AI Financial Review System.

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              Next.js 14 Frontend (App Router)                          │
│  ┌──────────────────────┬──────────────────────┬──────────────────────┬─────────────┐  │
│  │   Executive Cockpit  │   Comparative P&L    │  Waterfall Bridge    │ Transaction │  │
│  │   - High-Level KPIs  │   - Monthly Matrix   │  - MoM Decomposition │ Ledger Grid │  │
│  │   - Material Alerts  │   - Margin Badges    │  - Delta Visualizer  │ & Overrides │  │
│  └──────────────────────┴──────────────────────┴──────────────────────┴─────────────┘  │
│  ┌──────────────────────────────────────────────┬───────────────────────────────────┐  │
│  │          AI Analyst Drawer (Hybrid)          │       Audit Drill-Down Drawer     │  │
│  │  - Server-Side OpenRouter (Qwen 3.8 27B)     │  - Raw Bank Memo & Sanitized Data │  │
│  │  - Interactive Traceable Chips: [TXN: T1031] │  - Active Learning Rule Trigger   │  │
│  │  - Ledger-Verified Claims: [Verified: DB]    │  - Audit History (Actor & Reason) │  │
│  └──────────────────────────────────────────────┴───────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────┬─────────────────────────┘
                            │ /api/chat                        │ REST HTTP Requests
                            ▼                                  ▼
┌──────────────────────────────────────────────┐ ┌────────────────────────────────────────┐
│       Next.js API Route (Edge / Server)      │ │            FastAPI Backend             │
│  • Server-Side OpenRouter Client             │ │  • Pandas Ingestion & Fuzzy Sanitizer  │
│  • OPENROUTER_API_KEY from Environment       │ │  • Pure SQL Deterministic Aggregator   │
│  • Grounded Prompt Context Injection         │ │  • Material Variance Engine ($5k / 15%)│
│  • Local FastAPI Fallback if Unavailable     │ │  • Multi-Mode Review & Anomaly Engine  │
└──────────────────────────────────────────────┘ │  • Active Learning Rule Cache Service  │
                                                 │  • Defense-in-Depth Fact-Checker       │
                                                 └───────────────────┬────────────────────┘
                                                                     │ SQL Queries & DDL
                                                 ┌───────────────────▼────────────────────┐
                                                 │       SQLite Relational Database       │
                                                 │  [transactions]      [review_queue]    │
                                                 │  [audit_log]   [classification_rules]  │
                                                 └────────────────────────────────────────┘
```

---

## 🗄️ Database Schema (DDL)

```sql
-- 1. Core Transactions Table
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,                     -- Format: YYYY-MM-DD
    description TEXT NOT NULL,
    counterparty TEXT,
    amount REAL NOT NULL,                   -- Positive: Inflow, Negative: Outflow
    method TEXT,                            -- 'ACH', 'Card', 'Bank deposit', etc.
    category TEXT NOT NULL,                 -- Chart of accounts line item
    account_type TEXT NOT NULL,             -- 'pnl' | 'balance_sheet'
    statement_type TEXT NOT NULL,           -- 'revenue' | 'cogs' | 'payroll' | 'opex' | 'non_pnl'
    confidence_score REAL NOT NULL,         -- 0.0 to 1.0
    needs_review BOOLEAN NOT NULL DEFAULT 0,-- Flagged for human review
    review_reason TEXT,                     -- Reason for flagging
    is_user_modified BOOLEAN NOT NULL DEFAULT 0,
    classification_source TEXT DEFAULT 'rule' -- 'rule' | 'learned_rule' | 'llm' | 'user'
);

-- 2. Review Queue Table
CREATE TABLE review_queue (
    transaction_id TEXT PRIMARY KEY,
    flagged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT 0,
    resolution_notes TEXT,
    FOREIGN KEY(transaction_id) REFERENCES transactions(id)
);

-- 3. Active Learning Classification Rules Table
CREATE TABLE classification_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern TEXT NOT NULL UNIQUE,          -- Vendor substring pattern
    category TEXT NOT NULL,
    account_type TEXT NOT NULL,
    statement_type TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    match_count INTEGER DEFAULT 0
);

-- 4. Append-Only Audit History Table
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT NOT NULL,
    actor TEXT DEFAULT 'evaluator',         -- User / Auditor identity
    reason TEXT,                            -- Reason for modification
    action TEXT NOT NULL,                   -- 'create', 'override', 'rule_applied', 'resolved'
    old_values TEXT,                        -- JSON string of previous state
    new_values TEXT,                        -- JSON string of updated state
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices for Fast Deterministic Aggregation
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_statement_type ON transactions(statement_type);
CREATE INDEX idx_transactions_account_type ON transactions(account_type);
CREATE INDEX idx_transactions_needs_review ON transactions(needs_review);
```

---

## ⚙️ Processing & Anomaly Detection Pipeline

1. **Fuzzy Header Normalization:**
   - Detects variable bank CSV column naming (`Date` vs `Posted Date`, `Amount` vs `Debit`/`Credit`, `Description` vs `Memo`, `Counterparty` vs `Vendor`).
   - Normalizes currency formats (`-$4,151.25`, `($4,151.25)`, `4151.25 CR/DR`) into signed floating-point numbers.

2. **Hierarchical Classification:**
   - **Tier 1:** Active Learning Rule Cache (exact match against verified user rules).
   - **Tier 2:** Deterministic vendor pattern rules (e.g. `Sysco` $\to$ Food Inventory / COGS, `Gusto` $\to$ Hourly Wages / Payroll, `Toast` $\to$ POS Sales or Software).
   - **Tier 3:** Heuristic semantic classification with confidence estimation.

3. **Multi-Mode Anomaly Screening:**
   - Flags transactions (`needs_review = 1`) when:
     - Confidence score $< 0.70$.
     - Keywords match balance sheet indicators (CapEx, Debt, Tax, Owner Distribution).
     - Outlier detection ($> 3\sigma$ variance from vendor average).
     - Potential duplicate detected (same counterparty and amount within 48 hours).
     - Uninformative or ambiguous bank descriptions (`"Wire Transfer"`, `"Check #104"`).

4. **Pure SQL P&L Aggregator:**
   - All income statement figures are calculated deterministically via SQL `GROUP BY strftime('%Y-%m', date)`.
   - Filters `account_type = 'pnl'` to strictly segregate operating activities from balance sheet items.
