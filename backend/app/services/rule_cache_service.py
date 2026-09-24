import aiosqlite
import json
from typing import Dict, Any, List, Optional
from app.schemas import RuleCreateRequest

async def find_matching_transactions_count(
    db: aiosqlite.Connection,
    pattern: str
) -> int:
    """Finds how many transactions match this pattern across description and counterparty."""
    search = f"%{pattern.strip().lower()}%"
    cursor = await db.execute(
        """
        SELECT COUNT(*) as count 
        FROM transactions 
        WHERE LOWER(description) LIKE ? OR LOWER(counterparty) LIKE ?
        """,
        (search, search)
    )
    row = await cursor.fetchone()
    return int(row["count"]) if row else 0

async def save_learned_rule(
    db: aiosqlite.Connection,
    rule_req: RuleCreateRequest
) -> Dict[str, Any]:
    """
    Saves a pattern into classification_rules table and propagates to existing records if requested.
    """
    pattern_clean = rule_req.pattern.strip().lower()
    
    # Insert or update rule
    await db.execute(
        """
        INSERT INTO classification_rules (pattern, category, account_type, statement_type, match_count)
        VALUES (?, ?, ?, ?, 0)
        ON CONFLICT(pattern) DO UPDATE SET
            category = excluded.category,
            account_type = excluded.account_type,
            statement_type = excluded.statement_type
        """,
        (pattern_clean, rule_req.category, rule_req.account_type, rule_req.statement_type)
    )
    
    updated_records = 0
    if rule_req.apply_to_existing:
        search = f"%{pattern_clean}%"
        # Find transactions matching
        cursor = await db.execute(
            """
            SELECT id, category, account_type, statement_type 
            FROM transactions 
            WHERE (LOWER(description) LIKE ? OR LOWER(counterparty) LIKE ?)
            """,
            (search, search)
        )
        matches = await cursor.fetchall()
        for m in matches:
            old_vals = {
                "category": m["category"],
                "account_type": m["account_type"],
                "statement_type": m["statement_type"]
            }
            new_vals = {
                "category": rule_req.category,
                "account_type": rule_req.account_type,
                "statement_type": rule_req.statement_type
            }
            await db.execute(
                """
                UPDATE transactions 
                SET category = ?, account_type = ?, statement_type = ?, 
                    confidence_score = 1.0, is_user_modified = 1, classification_source = 'learned_rule'
                WHERE id = ?
                """,
                (rule_req.category, rule_req.account_type, rule_req.statement_type, m["id"])
            )
            # Log in audit
            await db.execute(
                """
                INSERT INTO audit_log (transaction_id, action, old_values, new_values)
                VALUES (?, 'rule_applied', ?, ?)
                """,
                (m["id"], json.dumps(old_vals), json.dumps(new_vals))
            )
            updated_records += 1

    await db.commit()
    return {
        "status": "success",
        "pattern": pattern_clean,
        "category": rule_req.category,
        "updated_records": updated_records
    }

async def get_all_rules(db: aiosqlite.Connection) -> List[Dict[str, Any]]:
    cursor = await db.execute("SELECT * FROM classification_rules ORDER BY created_at DESC")
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]
