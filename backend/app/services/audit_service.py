import aiosqlite
import json
from typing import List, Dict, Any

async def log_audit_event(
    db: aiosqlite.Connection,
    transaction_id: str,
    action: str,
    old_values: Dict[str, Any],
    new_values: Dict[str, Any],
    actor: str = "evaluator",
    reason: str = ""
):
    await db.execute(
        """
        INSERT INTO audit_log (transaction_id, actor, reason, action, old_values, new_values)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (transaction_id, actor, reason, action, json.dumps(old_values), json.dumps(new_values))
    )
    await db.commit()

async def get_audit_trail_for_transaction(
    db: aiosqlite.Connection,
    transaction_id: str
) -> List[Dict[str, Any]]:
    cursor = await db.execute(
        "SELECT * FROM audit_log WHERE transaction_id = ? ORDER BY timestamp DESC",
        (transaction_id,)
    )
    rows = await cursor.fetchall()
    results = []
    for r in rows:
        d = dict(r)
        d["old_values"] = json.loads(d["old_values"]) if d.get("old_values") else {}
        d["new_values"] = json.loads(d["new_values"]) if d.get("new_values") else {}
        results.append(d)
    return results

async def get_all_audit_logs(
    db: aiosqlite.Connection,
    limit: int = 50
) -> List[Dict[str, Any]]:
    cursor = await db.execute(
        "SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?",
        (limit,)
    )
    rows = await cursor.fetchall()
    results = []
    for r in rows:
        d = dict(r)
        d["old_values"] = json.loads(d["old_values"]) if d.get("old_values") else {}
        d["new_values"] = json.loads(d["new_values"]) if d.get("new_values") else {}
        results.append(d)
    return results
