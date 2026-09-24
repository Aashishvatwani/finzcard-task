# FINZ AI — AI-Native Financial Review System

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-000000.svg?style=flat&logo=next.js)](https://nextjs.org)
[![SQLite](https://img.shields.io/badge/SQLite-Deterministic_Ledger-003B57.svg?style=flat&logo=sqlite)](https://sqlite.org)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB.svg?style=flat&logo=python)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Verification](https://img.shields.io/badge/Ledger-Verified_Responses-10B981.svg?style=flat)]()

**FINZ AI** is an AI-native financial review system built for the **FINZ Software Engineering Internship Challenge**. It transforms raw commercial bank transactions into an explainable, interactive financial review with deterministic accounting accuracy, active learning rule caching, and ledger-verified conversational analysis.

---

## 📊 Q1 2026 Financial Summary (181 Transactions)

All totals are computed directly from the underlying ledger data via pure SQL. Financial calculations are never delegated to an LLM.

$$\text{Operating Profit} = \text{Revenue} - \text{COGS} - \text{Payroll} - \text{Operating Expenses}$$

| Financial Line Item | January 2026 | February 2026 | March 2026 | Q1 Cumulative |
| :--- | :---: | :---: | :---: | :---: |
| **Revenue** | **$126,399.09** | **$125,617.29** | **$150,535.07** | **$402,551.45** |
| Cost of Goods Sold (COGS) | -$51,037.38 | -$54,403.09 | -$60,807.46 | -$166,247.93 |
| **Gross Profit** | **$75,361.71** (59.6%) | **$71,214.20** (56.7%) | **$89,727.61** (59.6%) | **$236,303.52** (58.7%) |
| Payroll | -$41,757.07 | -$44,870.99 | -$50,729.81 | -$137,357.87 |
| Operating Expenses (OpEx) | -$19,134.11 | -$20,335.25 | -$20,145.66 | -$59,615.02 |
| **Operating Profit** | **$14,470.53** (11.4%) | **$6,007.96** (4.8%) | **$18,852.14** (12.5%) | **$39,330.63** (9.8%) |

### 📈 Core Financial Narrative:
1. **January ($14,470.53 Operating Profit):** Stable operational baseline with 59.6% gross margin.
2. **February ($6,007.96 Operating Profit — -$8,462.57 / -58.5% drop):** Revenue remained steady ($125,617.29, down only $781.80), but operating profit compressed due to simultaneous increases in COGS (+$3,365.71), Payroll (+$3,113.92), and OpEx (+$1,201.14).
3. **March ($18,852.14 Operating Profit — +$12,844.18 / +213.8% rebound):** Revenue grew 19.8% MoM to $150,535.07 (with catering revenue rising from $4,769.14 to $7,273.11). Because fixed overhead remained flat ($20,145.66 vs $20,335.25), gross margin expansion flowed directly to operating profit.

---

## 🏛️ Non-P&L Accounting Treatment (Balance Sheet Quarantine)

The application separates operating P&L transactions from balance-sheet-oriented cash movements. Naïvely treating balance sheet movements as operating expenses would distort operating profit by a net **$20,050.00**:

| Transaction ID | Date | Amount | Counterparty / Description | Accounting Treatment |
| :--- | :---: | :---: | :--- | :--- |
| **`T1061`** | 2026-01-10 | **-$7,800.00** | Restaurant Depot / Equipment purchase - new oven | **CapEx (Fixed Asset):** Capitalized on Balance Sheet; not expensed in OpEx. |
| **`T1062`** | 2026-01-20 | **-$6,150.00** | Florida Dept of Revenue / Sales tax remittance | **Tax Liability Settlement:** Settles sales tax collected in trust; not an operating cost. |
| **`T1117`** | 2026-02-11 | **+$2,400.00** | In-store POS / Gift card sales deposit | **Deferred Revenue Inflow:** Creates unearned revenue liability until redeemed. |
| **`T1118`** | 2026-02-21 | **-$3,500.00** | First National Bank / Loan principal repayment | **Debt Principal:** Reduces loan liability; only interest affects the P&L. |
| **`T1180`** | 2026-03-19 | **-$5,000.00** | Owner Draw / Owner distribution | **Equity Distribution:** Reduces owner equity; excluded from Operating Profit. |

- **Total Non-P&L Outflows:** $7,800 + $6,150 + $3,500 + $5,000 = **$22,450.00**
- **Total Non-P&L Inflow:** **+$2,400.00** (Gift card deposit)
- **Net Non-P&L Cash Movement:** **-$20,050.00** ($24,850.00 gross volume across 5 items)

---

## 🔑 Key Engineering & Architectural Decisions

### 1. Deterministic Financial Core vs. AI Reasoning
- **Deterministic Core:** Pure SQL executes all summations, gross margin percentages, variance deltas, and waterfall steps. Financial numbers are never generated or altered by an LLM.
- **AI Reasoning:** The model translates structured variance data into audit explanations, reasons about vendor patterns, and answers conversational inquiries.

### 2. Numerical Claim Verification (Defense-in-Depth)
- The conversational pipeline extracts numeric claims ($ amounts and % values) from the model's textual responses using regex.
- Each extracted claim is checked against ledger-derived values in SQLite (monthly totals, category sums, transaction amounts).
- Verified claims render with an interactive `Verified by Ledger` badge; unsupported figures are surfaced as unverified.

### 3. Traceable Transaction Citations (`[TXN: <id>]`)
- Financial narratives and AI answers embed atomic citation tokens (e.g. `[TXN: T1031]`).
- The frontend renders these tokens as interactive `<TransactionChip />` components.
- Clicking any chip opens the **Audit Drawer**, displaying raw bank memos, confidence scores, review triggers, and append-only audit history.

### 4. Active Learning Rule Cache
- When an auditor reclassifies a transaction, the system prompts: *"Remember rule for matching records?"*.
- Upon confirmation, saves the pattern into `classification_rules` and retroactively reclassifies matching records.
- Avoids repeated LLM inference for previously learned vendor patterns.

### 5. Configured Material Variance Threshold & Waterfall Bridge
- For this challenge, a variance is flagged as material when **absolute change $\ge \$5,000$ or percentage change $\ge 15\%$**.
- The MoM waterfall bridge decomposes operating profit changes:
  $$\Delta \text{Operating Profit} = \Delta \text{Revenue} - \Delta \text{COGS} - \Delta \text{Payroll} - \Delta \text{OpEx}$$

### 6. Security Decision: Server-Side LLM Credentials
- External LLM credentials (`OPENROUTER_API_KEY`) are kept strictly server-side in the backend environment.
- Credentials are **never** stored in browser `localStorage` or exposed to client-side scripts.
- **No API key is required from the evaluator.** The server connects to OpenRouter (`qwen/qwen3.8-27b:free`) server-side and includes a graceful fallback to the local deterministic analysis engine if the external model is unavailable.

---

## ⚡ Quickstart & Local Setup

### Prerequisites
- **Python 3.12+** (tested on 3.12.10)
- **Node.js 18+** and **npm**

### 1. Backend Setup
```bash
# From workspace root
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run automated test suite (math, variance, fact-checker, rules)
pytest -o pythonpath=backend backend/tests

# Start FastAPI backend
python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```
Backend runs at `http://localhost:8000` (Swagger docs at `/docs`).

### 2. Frontend Setup
```bash
# In a new terminal window
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```
Frontend runs at `http://localhost:3000`.

---

## 🎬 5-Step Evaluator Walkthrough Guide

### Step 1: Ingestion & 1-Click Benchmark Seed (`/upload`)
- Navigate to `/upload`.
- Click **"Load 181 Transactions"** (or drag-and-drop any standard bank CSV export).
- The system normalizes headers, classifies records, runs anomaly detection, and populates SQLite.

### Step 2: Comparative P&L & Variance Explorer (`/pnl`)
- View the monthly matrix comparing January, February, and March 2026.
- In **Material Variances**, click **"View Drivers"** on the Net Operating Profit variance card to inspect the narrative and backing transactions.
- Click **"Explore all transactions in Ledger ↗"** at the bottom of the modal to view the full backing cohort.
- Switch to the **Waterfall Bridge** tab to see the formula decomposition.
- Switch to the **Balance Sheet** tab to inspect the 5 quarantined non-operating transactions.

### Step 3: Transaction Ledger & Human Overrides (`/transactions`)
- Click the **"⚠️ Requires Review"** tab to inspect flagged items.
- Click transaction `T1061` ($7,800 oven) to open the **Audit Drawer**.
- Select any transaction, adjust its category, check **"Remember rule for matching records"**, and click **"Save Override"**.
- The system logs an append-only audit entry (tracking actor and reason) and updates matching transactions.

### Step 4: AI Financial Analyst (`Drawer`)
- Click **"AI Analyst"** in the navigation bar.
- Test the challenge evaluation questions:
  1. *"What was our revenue in March?"* $\to$ Direct headline ($150,535.07, +19.8% MoM) and sales channel breakdown.
  2. *"How much did we spend on payroll each month?"* $\to$ Monthly payroll breakdown (Jan $41.8k, Feb $44.9k, Mar $50.7k) with staff wages vs salaries.
  3. *"Why did operating profit change between February and March?"* $\to$ Rebound explanation (+$12,844.18 / +213.8%) via operational leverage.
  4. *"What drove the increase in food costs?"* $\to$ Food spend breakdown ($37.8k $\to$ $39.8k $\to$ $45.0k) with Sysco/US Foods invoice evidence.
  5. *"Which transactions need my attention?"* $\to$ Lists all flagged items with review triggers and `[TXN: ...]` chips.
  6. *"Show me the transactions behind that variance."* $\to$ Lists top transaction drivers with interactive audit chips.
  7. *"What changed most significantly over the review period?"* $\to$ Ranks the 4 primary quarterly operational shifts.
- Notice the **`Verified by Ledger`** badges confirming numerical agreement with SQLite.

### Step 5: Automated Test Suite Verification
```bash
pytest -o pythonpath=backend backend/tests -v
```
All 4 test modules pass with 100% assertions verifying ingestion, mathematical invariance, claim extraction, and active learning rules.

---

## 📚 Technical Documentation Links

- [System Architecture & Processing Pipeline](docs/architecture.md)
- [Complete REST API Reference](docs/api.md)
