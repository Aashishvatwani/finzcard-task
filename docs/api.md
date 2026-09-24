# FINZ AI — REST API Reference

The backend exposes a REST API powered by **FastAPI** running at `http://localhost:8000`. Interactive OpenAPI documentation is accessible at `http://localhost:8000/docs`.

---

## 📡 Endpoints Summary

### System & Ingestion
| Method | Path | Description | Parameters / Payload |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | System status and transaction counts | None |
| `POST` | `/api/upload` | Ingests CSV file and runs classification | `multipart/form-data` with `file` |
| `POST` | `/api/seed-sample` | Seeds the 181-record Q1 benchmark dataset | None |

### Transactions & Review
| Method | Path | Description | Parameters / Payload |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/transactions` | Paginated transaction ledger with filters | `month`, `category`, `statement_type`, `account_type`, `needs_review`, `search`, `limit`, `offset` |
| `GET` | `/api/transactions/{id}` | Single transaction details & audit history | `id` in path |
| `PATCH`| `/api/transactions/{id}` | Updates categorization and logs audit entry | `TransactionUpdate` JSON |
| `GET` | `/api/review-queue` | Returns all transactions flagged for review | None |
| `POST` | `/api/review-queue/{id}/resolve` | Resolves review item with audit note | `notes` query parameter |

### Financial Reporting & Variances
| Method | Path | Description | Parameters / Payload |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/pnl` | Monthly comparative P&L statement (Revenue, COGS, Gross Profit, Payroll, OpEx, Operating Profit) | None |
| `GET` | `/api/pnl/balance-sheet` | Summary of quarantined non-P&L transactions | None |
| `GET` | `/api/variances` | Material variances exceeding configured threshold | `base_month`, `target_month` |
| `GET` | `/api/waterfall-bridge` | Month-over-month EBITDA waterfall decomposition | `base_month`, `target_month` |

### Active Learning Rules & Audit History
| Method | Path | Description | Parameters / Payload |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/rules` | Retrieves all active learned classification rules | None |
| `POST` | `/api/rules` | Creates a new pattern rule & reclassifies matches | `RuleCreateRequest` JSON |
| `GET` | `/api/rules/preview-match` | Previews match count for a pattern | `pattern` query parameter |
| `GET` | `/api/audit-logs` | Chronological append-only audit history | `limit` query parameter |

### Conversational Analysis & Fact-Checking
| Method | Path | Description | Parameters / Payload |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/chat` | Conversational query with ledger-verified output | `ChatRequest` JSON (`message`, `history`) |
| `POST` | `/api/fact-check` | Defense-in-depth numerical claim verification | JSON `{ "text": string }` |
