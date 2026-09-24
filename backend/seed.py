import asyncio
import aiosqlite
from pathlib import Path
from app.config import DB_PATH, DATA_DIR
from app.database import init_db
from app.main import process_and_store_transactions
from app.services.pnl_service import calculate_monthly_pnl, get_balance_sheet_summary
from app.services.variance_service import calculate_material_variances, calculate_waterfall_bridge

async def seed():
    init_db()
    csv_file = DATA_DIR / "restaurant_transactions.csv"
    print(f"Reading {csv_file}...")
    with open(csv_file, "rb") as f:
        content = f.read()

    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        count = await process_and_store_transactions(content, db)
        print(f"Successfully processed and stored {count} transactions.")

        pnl = await calculate_monthly_pnl(db)
        print(f"\n--- Monthly P&L Statement ({len(pnl)} Months) ---")
        for p in pnl:
            print(f"Month: {p.month}")
            print(f"  Revenue:          ${p.revenue:>10,.2f}")
            print(f"  COGS:            -${p.cogs:>10,.2f}")
            print(f"  Gross Profit:     ${p.gross_profit:>10,.2f} ({p.gross_margin:.1f}%)")
            print(f"  Payroll:         -${p.payroll:>10,.2f}")
            print(f"  OpEx:            -${p.opex:>10,.2f}")
            print(f"  Total OpEx:      -${p.total_operating_expenses:>10,.2f}")
            print(f"  Operating Profit: ${p.operating_profit:>10,.2f} ({p.operating_margin:.1f}%)")
            print()

        bs = await get_balance_sheet_summary(db)
        print(f"--- Balance Sheet / Non-P&L Excluded Items ({len(bs)} items) ---")
        for b in bs:
            print(f"  {b['date']} | {b['id']} | ${abs(b['amount']):>8,.2f} | {b['category']} ({b['description']})")

        variances = await calculate_material_variances(db, "2026-01", "2026-02")
        mat_vars = [v for v in variances if v.is_material]
        print(f"\n--- Material Variances (2026-01 to 2026-02: {len(mat_vars)} items) ---")
        for v in mat_vars:
            print(f"  {v.line_item_or_category}: Delta=${v.delta_abs:,.2f} ({v.delta_pct:.1f}%) - {len(v.top_drivers)} drivers")

if __name__ == "__main__":
    asyncio.run(seed())
