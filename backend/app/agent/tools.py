import aiosqlite
from typing import Dict, Any, List, Optional
from app.services.pnl_service import calculate_monthly_pnl, get_balance_sheet_summary
from app.services.variance_service import calculate_material_variances, calculate_waterfall_bridge

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "get_pnl_summary",
            "description": "Fetch official monthly P&L totals (Revenue, COGS, Gross Profit, Gross Margin, Payroll, OpEx, Operating Profit, Operating Margin, category breakdown) for a specific month.",
            "parameters": {
                "type": "object",
                "properties": {
                    "month": {"type": "string", "description": "Format: YYYY-MM (e.g. '2026-01', '2026-02', '2026-03')"}
                },
                "required": ["month"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_material_variances",
            "description": "Retrieve all variances exceeding materiality thresholds between two months (with top transaction drivers).",
            "parameters": {
                "type": "object",
                "properties": {
                    "base_month": {"type": "string", "description": "Format: YYYY-MM (e.g. '2026-01')"},
                    "target_month": {"type": "string", "description": "Format: YYYY-MM (e.g. '2026-02')"}
                },
                "required": ["base_month", "target_month"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_underlying_transactions",
            "description": "Retrieve specific raw transactions filtered by category, date range, or counterparty.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "description": "Target category name (e.g. 'Food Inventory / Ingredients', 'Facility Rent')"},
                    "counterparty": {"type": "string", "description": "Vendor or counterparty name (e.g. 'Sysco', 'Gusto Payroll')"},
                    "start_date": {"type": "string", "description": "Format: YYYY-MM-DD"},
                    "end_date": {"type": "string", "description": "Format: YYYY-MM-DD"},
                    "limit": {"type": "integer", "default": 10}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_balance_sheet_items",
            "description": "Retrieve non-P&L items excluded from operating income (CapEx, Debt Principal, Sales Tax Remittance, Owner Distributions).",
            "parameters": {
                "type": "object",
                "properties": {
                    "month": {"type": "string", "description": "Optional format: YYYY-MM"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_operating_profit_bridge",
            "description": "Retrieve the exact waterfall bridge explaining what drove the delta in Operating Profit between two months.",
            "parameters": {
                "type": "object",
                "properties": {
                    "base_month": {"type": "string", "description": "Format: YYYY-MM"},
                    "target_month": {"type": "string", "description": "Format: YYYY-MM"}
                },
                "required": ["base_month", "target_month"]
            }
        }
    }
]

async def execute_tool(
    name: str,
    args: Dict[str, Any],
    db: aiosqlite.Connection
) -> Dict[str, Any]:
    """Execute deterministic tool queries on the SQLite ledger."""
    if name == "get_pnl_summary":
        month = args.get("month")
        records = await calculate_monthly_pnl(db)
        for r in records:
            if r.month == month:
                return r.model_dump()
        return {"error": f"No P&L data found for month '{month}'"}

    elif name == "get_material_variances":
        base_m = args.get("base_month")
        target_m = args.get("target_month")
        variances = await calculate_material_variances(db, base_m, target_m)
        material_only = [v.model_dump() for v in variances if v.is_material]
        return {"base_month": base_m, "target_month": target_m, "material_variances": material_only}

    elif name == "get_underlying_transactions":
        conditions = []
        params = []
        if args.get("category"):
            conditions.append("category = ?")
            params.append(args["category"])
        if args.get("counterparty"):
            conditions.append("LOWER(counterparty) LIKE ?")
            params.append(f"%{args['counterparty'].lower()}%")
        if args.get("start_date"):
            conditions.append("date >= ?")
            params.append(args["start_date"])
        if args.get("end_date"):
            conditions.append("date <= ?")
            params.append(args["end_date"])

        where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
        limit = args.get("limit", 10)
        params.append(limit)

        sql = f"SELECT id, date, description, counterparty, amount, method, category, statement_type, account_type FROM transactions {where_clause} ORDER BY date ASC LIMIT ?"
        cursor = await db.execute(sql, params)
        rows = await cursor.fetchall()
        return {"transactions": [dict(r) for r in rows]}

    elif name == "get_balance_sheet_items":
        items = await get_balance_sheet_summary(db)
        if args.get("month"):
            items = [i for i in items if i.get("month") == args["month"]]
        return {"balance_sheet_items": items}

    elif name == "get_operating_profit_bridge":
        base_m = args.get("base_month")
        target_m = args.get("target_month")
        bridge = await calculate_waterfall_bridge(db, base_m, target_m)
        return bridge.model_dump() if bridge else {"error": "Unable to calculate waterfall bridge"}

    return {"error": f"Unknown tool: {name}"}
