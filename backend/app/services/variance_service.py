import aiosqlite
from typing import List, Dict, Any, Optional
from app.config import (
    MATERIALITY_ABS_THRESHOLD,
    MATERIALITY_PCT_THRESHOLD,
    MATERIALITY_PCT_MIN_ABS
)
from app.schemas import MaterialVariance, WaterfallBridge, WaterfallStep
from app.services.pnl_service import calculate_monthly_pnl

def check_is_material(delta_abs: float, delta_pct: float) -> bool:
    """Evaluates the mathematical materiality standard."""
    if abs(delta_abs) >= MATERIALITY_ABS_THRESHOLD:
        return True
    if abs(delta_pct) >= MATERIALITY_PCT_THRESHOLD and abs(delta_abs) >= MATERIALITY_PCT_MIN_ABS:
        return True
    return False

async def get_top_contributing_drivers(
    db: aiosqlite.Connection,
    target_month: str,
    category: Optional[str] = None,
    statement_type: Optional[str] = None,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    Fetches the top underlying transactions driving the variance in the target month.
    """
    conditions = ["strftime('%Y-%m', date) = ?", "account_type = 'pnl'"]
    params: List[Any] = [target_month]

    if category:
        conditions.append("category = ?")
        params.append(category)
    elif statement_type:
        conditions.append("statement_type = ?")
        params.append(statement_type)

    where_clause = " AND ".join(conditions)
    sql = f"""
        SELECT id, date, description, counterparty, amount, method, category, statement_type
        FROM transactions
        WHERE {where_clause}
        ORDER BY ABS(amount) DESC
        LIMIT ?;
    """
    params.append(limit)
    cursor = await db.execute(sql, params)
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]

def generate_grounded_variance_narrative(
    item_name: str,
    base_month: str,
    target_month: str,
    base_val: float,
    target_val: float,
    delta_abs: float,
    delta_pct: float,
    drivers: List[Dict[str, Any]]
) -> str:
    """
    Synthesizes a grounded, deterministic audit narrative.
    Strictly uses returned transaction records and cites transaction IDs inline: [TXN: <id>].
    """
    direction = "increased" if delta_abs > 0 else "decreased"
    sign = "+" if delta_abs > 0 else "-"
    abs_delta_str = f"${abs(delta_abs):,.2f}"
    
    lines = [
        f"**{item_name}** {direction} by **{sign}{abs_delta_str}** ({sign}{abs(delta_pct):.2f}%) from **${base_val:,.2f}** ({base_month}) to **${target_val:,.2f}** ({target_month})."
    ]

    if drivers:
        lines.append("\n**Primary Underlying Drivers:**\n")
        for i, d in enumerate(drivers[:4], start=1):
            amt = abs(d['amount'])
            lines.append(
                f"- [TXN: {d['id']}] **{d['description']}** ({d['counterparty']}) on {d['date']}: **${amt:,.2f}**"
            )
    else:
        lines.append("\n*No single transaction dominated the variance; movement reflects broad daily operational adjustments.*")

    return "\n".join(lines)

async def calculate_material_variances(
    db: aiosqlite.Connection,
    base_month: str,
    target_month: str
) -> List[MaterialVariance]:
    """
    Computes Month-over-Month variances across both high-level P&L line items
    and granular categories, filtering for material deviations.
    """
    pnl_records = await calculate_monthly_pnl(db)
    pnl_by_month = {p.month: p for p in pnl_records}

    if base_month not in pnl_by_month or target_month not in pnl_by_month:
        return []

    pnl_base = pnl_by_month[base_month]
    pnl_target = pnl_by_month[target_month]

    variances: List[MaterialVariance] = []

    # 1. Main Line Items
    line_items = [
        ("Gross Revenue", pnl_base.revenue, pnl_target.revenue, "revenue"),
        ("Cost of Goods Sold (COGS)", pnl_base.cogs, pnl_target.cogs, "cogs"),
        ("Gross Profit", pnl_base.gross_profit, pnl_target.gross_profit, None),
        ("Payroll Expenses", pnl_base.payroll, pnl_target.payroll, "payroll"),
        ("Operating Expenses (OpEx)", pnl_base.opex, pnl_target.opex, "opex"),
        ("Net Operating Profit", pnl_base.operating_profit, pnl_target.operating_profit, None),
    ]

    for name, base_v, target_v, st_type in line_items:
        delta_abs = round(target_v - base_v, 2)
        delta_pct = round((delta_abs / base_v * 100.0), 2) if base_v != 0 else (100.0 if target_v > 0 else 0.0)
        is_mat = check_is_material(delta_abs, delta_pct)

        drivers = []
        if is_mat and st_type:
            drivers = await get_top_contributing_drivers(db, target_month, statement_type=st_type, limit=5)

        explanation = generate_grounded_variance_narrative(
            name, base_month, target_month, base_v, target_v, delta_abs, delta_pct, drivers
        ) if is_mat else None

        variances.append(MaterialVariance(
            line_item_or_category=name,
            item_type="line_item",
            base_month=base_month,
            target_month=target_month,
            base_amount=base_v,
            target_amount=target_v,
            delta_abs=delta_abs,
            delta_pct=delta_pct,
            is_material=is_mat,
            top_drivers=drivers,
            explanation=explanation
        ))

    # 2. Granular Categories
    all_categories = sorted(set(list(pnl_base.breakdown_by_category.keys()) + list(pnl_target.breakdown_by_category.keys())))
    for cat in all_categories:
        base_v = pnl_base.breakdown_by_category.get(cat, 0.0)
        target_v = pnl_target.breakdown_by_category.get(cat, 0.0)
        delta_abs = round(target_v - base_v, 2)
        delta_pct = round((delta_abs / base_v * 100.0), 2) if base_v != 0 else (100.0 if target_v > 0 else 0.0)
        is_mat = check_is_material(delta_abs, delta_pct)

        drivers = []
        if is_mat:
            drivers = await get_top_contributing_drivers(db, target_month, category=cat, limit=5)

        explanation = generate_grounded_variance_narrative(
            cat, base_month, target_month, base_v, target_v, delta_abs, delta_pct, drivers
        ) if is_mat else None

        variances.append(MaterialVariance(
            line_item_or_category=cat,
            item_type="category",
            base_month=base_month,
            target_month=target_month,
            base_amount=base_v,
            target_amount=target_v,
            delta_abs=delta_abs,
            delta_pct=delta_pct,
            is_material=is_mat,
            top_drivers=drivers,
            explanation=explanation
        ))

    return variances

async def calculate_waterfall_bridge(
    db: aiosqlite.Connection,
    base_month: str,
    target_month: str
) -> Optional[WaterfallBridge]:
    """
    Computes a strict Operating Profit Bridge:
    Δ Operating Profit = Δ Revenue - Δ COGS - Δ Payroll - Δ OpEx
    """
    pnl_records = await calculate_monthly_pnl(db)
    pnl_by_month = {p.month: p for p in pnl_records}

    if base_month not in pnl_by_month or target_month not in pnl_by_month:
        return None

    b = pnl_by_month[base_month]
    t = pnl_by_month[target_month]

    d_rev = round(t.revenue - b.revenue, 2)
    d_cogs = round(t.cogs - b.cogs, 2)
    d_payroll = round(t.payroll - b.payroll, 2)
    d_opex = round(t.opex - b.opex, 2)

    # Net impact on profit:
    # Revenue increase adds to profit (+d_rev)
    # COGS increase reduces profit (-d_cogs)
    # Payroll increase reduces profit (-d_payroll)
    # OpEx increase reduces profit (-d_opex)
    net_profit_delta = round(d_rev - d_cogs - d_payroll - d_opex, 2)

    steps: List[WaterfallStep] = []
    current = b.operating_profit
    steps.append(WaterfallStep(
        name=f"Starting Operating Profit ({base_month})",
        category="base",
        amount=b.operating_profit,
        running_total=current,
        type="base"
    ))

    # Revenue contribution
    current = round(current + d_rev, 2)
    steps.append(WaterfallStep(
        name="Revenue Change",
        category="revenue",
        amount=d_rev,
        running_total=current,
        type="increase" if d_rev >= 0 else "decrease"
    ))

    # COGS impact (inverse sign for profit)
    current = round(current - d_cogs, 2)
    steps.append(WaterfallStep(
        name="COGS Impact",
        category="cogs",
        amount=-d_cogs,
        running_total=current,
        type="increase" if -d_cogs >= 0 else "decrease"
    ))

    # Payroll impact (inverse sign for profit)
    current = round(current - d_payroll, 2)
    steps.append(WaterfallStep(
        name="Labor & Payroll Impact",
        category="payroll",
        amount=-d_payroll,
        running_total=current,
        type="increase" if -d_payroll >= 0 else "decrease"
    ))

    # OpEx impact (inverse sign for profit)
    current = round(current - d_opex, 2)
    steps.append(WaterfallStep(
        name="Operating Expenses Impact",
        category="opex",
        amount=-d_opex,
        running_total=current,
        type="increase" if -d_opex >= 0 else "decrease"
    ))

    # Final Target Operating Profit
    steps.append(WaterfallStep(
        name=f"Ending Operating Profit ({target_month})",
        category="final",
        amount=t.operating_profit,
        running_total=t.operating_profit,
        type="final"
    ))

    return WaterfallBridge(
        base_month=base_month,
        target_month=target_month,
        base_operating_profit=b.operating_profit,
        target_operating_profit=t.operating_profit,
        delta_revenue=d_rev,
        delta_cogs=d_cogs,
        delta_payroll=d_payroll,
        delta_opex=d_opex,
        net_operating_profit_delta=net_profit_delta,
        steps=steps
    )
