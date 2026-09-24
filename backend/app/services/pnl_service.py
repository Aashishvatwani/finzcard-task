import aiosqlite
from typing import Dict, List, Any, Optional
from app.schemas import MonthlyPnL

async def calculate_monthly_pnl(
    db: aiosqlite.Connection,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[MonthlyPnL]:
    """
    DETERMINISTIC P&L CALCULATION ENGINE:
    All calculations are executed in pure SQL and Python with strict 2-decimal rounding.
    Zero hallucination guarantee.
    """
    conditions = ["account_type = 'pnl'"]
    params: List[Any] = []

    if start_date:
        conditions.append("date >= ?")
        params.append(start_date)
    if end_date:
        conditions.append("date <= ?")
        params.append(end_date)

    where_clause = " AND ".join(conditions)

    # 1. Statement Type Level Aggregations
    sql = f"""
        SELECT 
            strftime('%Y-%m', date) AS month,
            statement_type,
            ROUND(SUM(amount), 2) AS total
        FROM transactions
        WHERE {where_clause}
        GROUP BY month, statement_type
        ORDER BY month ASC;
    """
    cursor = await db.execute(sql, params)
    rows = await cursor.fetchall()

    # 2. Category Level Aggregations
    cat_sql = f"""
        SELECT 
            strftime('%Y-%m', date) AS month,
            statement_type,
            category,
            ROUND(SUM(amount), 2) AS total
        FROM transactions
        WHERE {where_clause}
        GROUP BY month, statement_type, category
        ORDER BY month ASC, category ASC;
    """
    cat_cursor = await db.execute(cat_sql, params)
    cat_rows = await cat_cursor.fetchall()

    months_data: Dict[str, Dict[str, Any]] = {}

    for row in rows:
        month = row["month"]
        st = row["statement_type"]
        val = float(row["total"])

        if month not in months_data:
            months_data[month] = {
                "revenue": 0.0,
                "cogs": 0.0,
                "payroll": 0.0,
                "opex": 0.0,
                "categories": {}
            }

        if st == "revenue":
            # Inflow is positive, discounts are negative -> net revenue
            months_data[month]["revenue"] = round(val, 2)
        elif st == "cogs":
            months_data[month]["cogs"] = round(abs(val), 2)
        elif st == "payroll":
            months_data[month]["payroll"] = round(abs(val), 2)
        elif st == "opex":
            months_data[month]["opex"] = round(abs(val), 2)

    for c_row in cat_rows:
        month = c_row["month"]
        cat = c_row["category"]
        st = c_row["statement_type"]
        val = float(c_row["total"])
        if month in months_data:
            normalized_val = val if st == "revenue" else abs(val)
            months_data[month]["categories"][cat] = round(normalized_val, 2)

    results: List[MonthlyPnL] = []
    for month in sorted(months_data.keys()):
        d = months_data[month]
        rev = d["revenue"]
        cogs = d["cogs"]
        gp = round(rev - cogs, 2)
        gm = round((gp / rev * 100.0), 2) if rev > 0 else 0.0
        payroll = d["payroll"]
        opex = d["opex"]
        total_opex = round(payroll + opex, 2)
        op_profit = round(gp - total_opex, 2)
        op_margin = round((op_profit / rev * 100.0), 2) if rev > 0 else 0.0

        results.append(MonthlyPnL(
            month=month,
            revenue=rev,
            cogs=cogs,
            gross_profit=gp,
            gross_margin=gm,
            payroll=payroll,
            opex=opex,
            total_operating_expenses=total_opex,
            operating_profit=op_profit,
            operating_margin=op_margin,
            breakdown_by_category=d["categories"]
        ))

    return results

async def get_balance_sheet_summary(
    db: aiosqlite.Connection
) -> List[Dict[str, Any]]:
    """
    Returns non-P&L balance sheet transactions grouped by month and category,
    explaining why they were excluded from the income statement.
    """
    sql = """
        SELECT 
            strftime('%Y-%m', date) AS month,
            id,
            date,
            description,
            counterparty,
            category,
            amount,
            review_reason
        FROM transactions
        WHERE account_type = 'balance_sheet'
        ORDER BY date ASC;
    """
    cursor = await db.execute(sql)
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]
