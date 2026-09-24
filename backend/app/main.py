import os
import io
import aiosqlite
import pandas as pd
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import DB_PATH, DATA_DIR
from app.database import init_db, get_db_connection
from app.schemas import (
    TransactionBase,
    TransactionUpdate,
    MonthlyPnL,
    MaterialVariance,
    WaterfallBridge,
    ChatMessage,
    ChatRequest,
    RuleCreateRequest
)
from app.ingestion.parser import normalize_csv
from app.classifier.engine import classify_record
from app.services.review_engine import evaluate_review_flags
from app.services.pnl_service import calculate_monthly_pnl, get_balance_sheet_summary
from app.services.variance_service import calculate_material_variances, calculate_waterfall_bridge
from app.services.rule_cache_service import (
    save_learned_rule,
    find_matching_transactions_count,
    get_all_rules
)
from app.services.audit_service import (
    log_audit_event,
    get_audit_trail_for_transaction,
    get_all_audit_logs
)
from app.agent.analyst_engine import run_analyst_chat

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB on startup
    init_db()
    # Check if we should auto-seed with sample data if table is empty
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT COUNT(*) as count FROM transactions")
        row = await cursor.fetchone()
        if row and row["count"] == 0:
            sample_file = DATA_DIR / "restaurant_transactions.csv"
            if sample_file.exists():
                with open(sample_file, "rb") as f:
                    content = f.read()
                    await process_and_store_transactions(content, db)
    yield

app = FastAPI(
    title="FINZ AI Financial Review System",
    description="Deterministic accounting engine with defensive AI financial review and dual-pass fact verification.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def process_and_store_transactions(file_bytes: bytes, db: aiosqlite.Connection) -> int:
    """Parses, normalizes, classifies, checks review flags, and inserts records into SQLite."""
    clean_df = normalize_csv(file_bytes)

    # Classify each record
    categories = []
    account_types = []
    statement_types = []
    confidences = []
    sources = []
    review_reasons = []

    for _, row in clean_df.iterrows():
        res = await classify_record(
            description=row["description"],
            counterparty=row["counterparty"],
            amount=row["amount"],
            db=db
        )
        categories.append(res.category)
        account_types.append(res.account_type)
        statement_types.append(res.statement_type)
        confidences.append(res.confidence_score)
        sources.append(res.classification_source)
        review_reasons.append(res.review_reason or "")

    clean_df["category"] = categories
    clean_df["account_type"] = account_types
    clean_df["statement_type"] = statement_types
    clean_df["confidence_score"] = confidences
    clean_df["classification_source"] = sources
    clean_df["review_reason"] = review_reasons

    # Run multi-mode anomaly and review detector
    clean_df = evaluate_review_flags(clean_df)

    # Batch insert into transactions table
    records_count = 0
    for _, row in clean_df.iterrows():
        await db.execute(
            """
            INSERT INTO transactions (
                id, date, description, counterparty, amount, method,
                category, account_type, statement_type, confidence_score,
                needs_review, review_reason, is_user_modified, classification_source
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
            ON CONFLICT(id) DO UPDATE SET
                date = excluded.date,
                description = excluded.description,
                counterparty = excluded.counterparty,
                amount = excluded.amount,
                method = excluded.method,
                category = excluded.category,
                account_type = excluded.account_type,
                statement_type = excluded.statement_type,
                confidence_score = excluded.confidence_score,
                needs_review = excluded.needs_review,
                review_reason = excluded.review_reason,
                classification_source = excluded.classification_source
            """,
            (
                str(row["id"]),
                str(row["date"]),
                str(row["description"]),
                str(row["counterparty"]),
                float(row["amount"]),
                str(row["method"]),
                str(row["category"]),
                str(row["account_type"]),
                str(row["statement_type"]),
                float(row["confidence_score"]),
                int(bool(row["needs_review"])),
                str(row["review_reason"]),
                str(row["classification_source"])
            )
        )
        # If needs review, register in review_queue
        if row["needs_review"]:
            await db.execute(
                """
                INSERT OR IGNORE INTO review_queue (transaction_id, resolved, resolution_notes)
                VALUES (?, 0, ?)
                """,
                (str(row["id"]), str(row["review_reason"]))
            )
        records_count += 1

    await db.commit()
    return records_count

@app.get("/api/health")
async def health_check():
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT COUNT(*) as count FROM transactions")
        r = await cursor.fetchone()
        tx_count = r["count"] if r else 0
        review_cur = await db.execute("SELECT COUNT(*) as count FROM transactions WHERE needs_review = 1")
        rev_r = await review_cur.fetchone()
        review_count = rev_r["count"] if rev_r else 0

    return {
        "status": "healthy",
        "system": "FINZ AI Financial Review System",
        "total_transactions": tx_count,
        "items_in_review": review_count
    }

@app.post("/api/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith((".csv", ".tsv", ".txt")):
        raise HTTPException(status_code=400, detail="Only CSV or TSV files are supported.")
    content = await file.read()
    try:
        async with aiosqlite.connect(str(DB_PATH)) as db:
            db.row_factory = aiosqlite.Row
            count = await process_and_store_transactions(content, db)
            pnl = await calculate_monthly_pnl(db)
        return {
            "status": "success",
            "message": f"Successfully ingested and classified {count} transactions.",
            "total_months": len(pnl)
        }
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to process file: {str(e)}")

@app.post("/api/seed-sample")
async def seed_sample_dataset():
    sample_file = DATA_DIR / "restaurant_transactions.csv"
    if not sample_file.exists():
        raise HTTPException(status_code=404, detail="Sample dataset file not found.")
    with open(sample_file, "rb") as f:
        content = f.read()
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        count = await process_and_store_transactions(content, db)
    return {"status": "success", "count": count, "message": f"Loaded {count} sample transactions."}

@app.get("/api/transactions")
async def get_transactions(
    month: Optional[str] = Query(None, description="Format: YYYY-MM"),
    category: Optional[str] = None,
    statement_type: Optional[str] = None,
    account_type: Optional[str] = None,
    needs_review: Optional[bool] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        conditions = []
        params = []

        if month:
            conditions.append("strftime('%Y-%m', date) = ?")
            params.append(month)
        if category:
            conditions.append("category = ?")
            params.append(category)
        if statement_type:
            conditions.append("statement_type = ?")
            params.append(statement_type)
        if account_type:
            conditions.append("account_type = ?")
            params.append(account_type)
        if needs_review is not None:
            conditions.append("needs_review = ?")
            params.append(1 if needs_review else 0)
        if search:
            conditions.append("(LOWER(description) LIKE ? OR LOWER(counterparty) LIKE ? OR LOWER(id) LIKE ?)")
            s_param = f"%{search.lower()}%"
            params.extend([s_param, s_param, s_param])

        where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""

        # Total count query
        count_cursor = await db.execute(f"SELECT COUNT(*) as total FROM transactions {where_clause}", params)
        total_row = await count_cursor.fetchone()
        total = total_row["total"] if total_row else 0

        # Data query
        query = f"""
            SELECT * FROM transactions
            {where_clause}
            ORDER BY date ASC, id ASC
            LIMIT ? OFFSET ?
        """
        params_data = list(params) + [limit, offset]
        cursor = await db.execute(query, params_data)
        rows = await cursor.fetchall()

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "items": [dict(r) for r in rows]
        }

@app.get("/api/transactions/{txn_id}")
async def get_transaction_detail(txn_id: str):
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM transactions WHERE id = ?", (txn_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        audit_trail = await get_audit_trail_for_transaction(db, txn_id)
        d = dict(row)
        d["audit_trail"] = audit_trail
        return d

@app.patch("/api/transactions/{txn_id}")
async def update_transaction(txn_id: str, update: TransactionUpdate):
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM transactions WHERE id = ?", (txn_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        old_data = dict(row)
        new_category = update.category or old_data["category"]
        new_account_type = update.account_type or old_data["account_type"]
        new_statement_type = update.statement_type or old_data["statement_type"]
        new_needs_review = update.needs_review if update.needs_review is not None else old_data["needs_review"]
        new_review_reason = update.review_reason if update.review_reason is not None else old_data["review_reason"]

        await db.execute(
            """
            UPDATE transactions
            SET category = ?, account_type = ?, statement_type = ?,
                needs_review = ?, review_reason = ?, is_user_modified = 1,
                classification_source = 'user'
            WHERE id = ?
            """,
            (new_category, new_account_type, new_statement_type, 1 if new_needs_review else 0, new_review_reason, txn_id)
        )

        # Log audit trail
        await log_audit_event(
            db,
            txn_id,
            action="override",
            old_values={"category": old_data["category"], "account_type": old_data["account_type"], "statement_type": old_data["statement_type"]},
            new_values={"category": new_category, "account_type": new_account_type, "statement_type": new_statement_type},
            actor="evaluator",
            reason=update.review_reason or "Manual auditor re-classification"
        )

        # Active Learning Rule Caching
        rule_saved = False
        matching_count = 0
        if update.remember_rule:
            pattern = update.rule_pattern or old_data["counterparty"] or old_data["description"]
            rule_res = await save_learned_rule(
                db,
                RuleCreateRequest(
                    pattern=pattern,
                    category=new_category,
                    account_type=new_account_type,
                    statement_type=new_statement_type,
                    apply_to_existing=True
                )
            )
            rule_saved = True
            matching_count = rule_res.get("updated_records", 0)

        await db.commit()

        # Deterministic P&L is automatically updated on next call!
        return {
            "status": "success",
            "message": "Transaction updated successfully and P&L re-aggregated.",
            "rule_saved": rule_saved,
            "matching_records_updated": matching_count
        }

@app.get("/api/review-queue")
async def get_review_queue():
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT t.*, r.flagged_at, r.resolved, r.resolution_notes
            FROM transactions t
            LEFT JOIN review_queue r ON t.id = r.transaction_id
            WHERE t.needs_review = 1
            ORDER BY t.date ASC
            """
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

@app.post("/api/review-queue/{txn_id}/resolve")
async def resolve_review_item(txn_id: str, notes: Optional[str] = "Verified by auditor"):
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        await db.execute(
            "UPDATE transactions SET needs_review = 0 WHERE id = ?",
            (txn_id,)
        )
        await db.execute(
            "UPDATE review_queue SET resolved = 1, resolution_notes = ? WHERE transaction_id = ?",
            (notes, txn_id)
        )
        await log_audit_event(
            db,
            txn_id,
            action="resolved",
            old_values={"needs_review": 1},
            new_values={"needs_review": 0, "notes": notes},
            actor="evaluator",
            reason=notes or "Verified by auditor"
        )
        await db.commit()
        return {"status": "success", "message": f"Review item {txn_id} marked as resolved."}

@app.get("/api/pnl", response_model=List[MonthlyPnL])
async def get_pnl_statement():
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        return await calculate_monthly_pnl(db)

@app.get("/api/pnl/balance-sheet")
async def get_balance_sheet():
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        return await get_balance_sheet_summary(db)

@app.get("/api/variances", response_model=List[MaterialVariance])
async def get_variances(
    base_month: str = Query("2026-01", description="Format: YYYY-MM"),
    target_month: str = Query("2026-02", description="Format: YYYY-MM")
):
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        return await calculate_material_variances(db, base_month, target_month)

@app.get("/api/waterfall-bridge")
async def get_bridge(
    base_month: str = Query("2026-01", description="Format: YYYY-MM"),
    target_month: str = Query("2026-02", description="Format: YYYY-MM")
):
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        bridge = await calculate_waterfall_bridge(db, base_month, target_month)
        if not bridge:
            raise HTTPException(status_code=404, detail="Insufficient data to compute waterfall bridge.")
        return bridge

@app.get("/api/rules")
async def list_rules():
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        return await get_all_rules(db)

@app.post("/api/rules")
async def create_rule(rule_req: RuleCreateRequest):
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        return await save_learned_rule(db, rule_req)

@app.get("/api/rules/preview-match")
async def preview_rule_match(pattern: str):
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        count = await find_matching_transactions_count(db, pattern)
        return {"pattern": pattern, "match_count": count}

@app.get("/api/audit-logs")
async def list_audit_logs(limit: int = 50):
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        return await get_all_audit_logs(db, limit)

@app.post("/api/chat", response_model=ChatMessage)
async def chat_analyst(req: ChatRequest):
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        return await run_analyst_chat(req.message, req.history or [], db)

@app.post("/api/fact-check")
async def verify_text_claims(req: dict):
    text = req.get("text", "")
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        from app.agent.fact_checker import extract_and_verify_claims
        annotated_text, verified_claims = await extract_and_verify_claims(text, db)
        return {
            "annotated_text": annotated_text,
            "verified_claims": [c.dict() for c in verified_claims]
        }

