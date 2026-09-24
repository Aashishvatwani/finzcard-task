import pytest
import asyncio
import aiosqlite
from pathlib import Path
from app.config import DATA_DIR
from app.database import init_db
from app.ingestion.parser import normalize_csv
from app.services.pnl_service import calculate_monthly_pnl, get_balance_sheet_summary
from app.services.variance_service import calculate_material_variances, calculate_waterfall_bridge, check_is_material
from app.services.rule_cache_service import save_learned_rule
from app.schemas import RuleCreateRequest
from app.agent.fact_checker import extract_and_verify_claims
from app.classifier.engine import classify_record

TEST_DB_PATH = Path("backend/test_financial.db")

@pytest.fixture(autouse=True)
def setup_test_db():
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()
    init_db(TEST_DB_PATH)
    yield
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()

@pytest.mark.asyncio
async def test_ingestion_and_sample_structure():
    sample_file = DATA_DIR / "restaurant_transactions.csv"
    assert sample_file.exists()
    
    with open(sample_file, "rb") as f:
        content = f.read()

    df = normalize_csv(content)
    assert len(df) == 181
    assert "amount" in df.columns
    assert "date" in df.columns

    # Verify that oven ($7,800) is recognized as negative amount
    oven_row = df[df["description"].str.contains("oven", case=False)]
    assert len(oven_row) == 1
    assert oven_row.iloc[0]["amount"] == -7800.0

@pytest.mark.asyncio
async def test_fact_checker_interceptor():
    async with aiosqlite.connect(str(TEST_DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("""
            INSERT INTO transactions (id, date, description, counterparty, amount, method, category, account_type, statement_type, confidence_score, needs_review)
            VALUES 
            ('TXN-01', '2026-01-10', 'Toast Sales', 'Toast POS', 20000.0, 'ACH', 'Food Sales', 'pnl', 'revenue', 0.99, 0),
            ('TXN-02', '2026-01-12', 'Sysco Food', 'Sysco', -5000.0, 'ACH', 'Food Inventory / Ingredients', 'pnl', 'cogs', 0.98, 0),
            ('TXN-03', '2026-01-15', 'Gusto Wages', 'Gusto', -6000.0, 'ACH', 'Hourly Wages', 'pnl', 'payroll', 0.99, 0),
            ('TXN-04', '2026-01-20', 'Rent', 'Landlord', -3000.0, 'ACH', 'Facility Rent', 'pnl', 'opex', 0.99, 0)
        """)
        await db.commit()

        pnl = await calculate_monthly_pnl(db)
        assert len(pnl) == 1
        assert pnl[0].revenue == 20000.0
        assert pnl[0].cogs == 5000.0
        assert pnl[0].gross_profit == 15000.0
        assert pnl[0].operating_profit == 6000.0

        test_text = "Gross revenue was $20,000.00 and operating profit reached $6,000.00, but bonus was $99,999.00."
        annotated, claims = await extract_and_verify_claims(test_text, db)
        
        verified_vals = [c.claimed_value for c in claims if c.is_verified]
        unverified_vals = [c.claimed_value for c in claims if not c.is_verified]
        
        assert 20000.0 in verified_vals
        assert 6000.0 in verified_vals
        assert 99999.0 in unverified_vals

@pytest.mark.asyncio
async def test_waterfall_bridge_and_variances():
    async with aiosqlite.connect(str(TEST_DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        # Month 1 (Jan 2026)
        await db.execute("""
            INSERT INTO transactions (id, date, description, counterparty, amount, method, category, account_type, statement_type, confidence_score, needs_review)
            VALUES 
            ('T1', '2026-01-10', 'Sales', 'Toast', 100000.0, 'ACH', 'Food Sales', 'pnl', 'revenue', 0.99, 0),
            ('T2', '2026-01-15', 'Food Purchase', 'Sysco', -30000.0, 'ACH', 'Food Inventory / Ingredients', 'pnl', 'cogs', 0.99, 0),
            ('T3', '2026-01-20', 'Payroll', 'Gusto', -25000.0, 'ACH', 'Hourly Wages', 'pnl', 'payroll', 0.99, 0),
            ('T4', '2026-01-25', 'Rent', 'Landlord', -10000.0, 'ACH', 'Facility Rent', 'pnl', 'opex', 0.99, 0)
        """)
        # Month 2 (Feb 2026)
        await db.execute("""
            INSERT INTO transactions (id, date, description, counterparty, amount, method, category, account_type, statement_type, confidence_score, needs_review)
            VALUES 
            ('T5', '2026-02-10', 'Sales', 'Toast', 110000.0, 'ACH', 'Food Sales', 'pnl', 'revenue', 0.99, 0),
            ('T6', '2026-02-15', 'Food Purchase', 'Sysco', -35000.0, 'ACH', 'Food Inventory / Ingredients', 'pnl', 'cogs', 0.99, 0),
            ('T7', '2026-02-20', 'Payroll', 'Gusto', -27000.0, 'ACH', 'Hourly Wages', 'pnl', 'payroll', 0.99, 0),
            ('T8', '2026-02-25', 'Rent', 'Landlord', -10000.0, 'ACH', 'Facility Rent', 'pnl', 'opex', 0.99, 0)
        """)
        await db.commit()

        bridge = await calculate_waterfall_bridge(db, "2026-01", "2026-02")
        assert bridge is not None
        # Jan Op Profit = 100k - 30k - 25k - 10k = 35k
        # Feb Op Profit = 110k - 35k - 27k - 10k = 38k
        # Delta Revenue = +10k, Delta COGS = +5k, Delta Payroll = +2k, Delta OpEx = 0k
        # Net Delta = 10k - 5k - 2k - 0 = +3k
        assert bridge.base_operating_profit == 35000.0
        assert bridge.target_operating_profit == 38000.0
        assert bridge.delta_revenue == 10000.0
        assert bridge.delta_cogs == 5000.0
        assert bridge.delta_payroll == 2000.0
        assert bridge.delta_opex == 0.0
        assert bridge.net_operating_profit_delta == 3000.0

@pytest.mark.asyncio
async def test_active_learning_rule_caching():
    async with aiosqlite.connect(str(TEST_DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("""
            INSERT INTO transactions (id, date, description, counterparty, amount, method, category, account_type, statement_type, confidence_score, needs_review)
            VALUES 
            ('TXN-A', '2026-01-10', 'Chevron Gas Station', 'Chevron', -150.0, 'Card', 'General', 'pnl', 'opex', 0.60, 1),
            ('TXN-B', '2026-01-15', 'Chevron 0421', 'Chevron', -120.0, 'Card', 'General', 'pnl', 'opex', 0.60, 1)
        """)
        await db.commit()

        # User saves rule for 'Chevron'
        res = await save_learned_rule(
            db,
            RuleCreateRequest(
                pattern="chevron",
                category="Vehicle & Delivery Fuel",
                account_type="pnl",
                statement_type="cogs",
                apply_to_existing=True
            )
        )
        assert res["updated_records"] == 2

        # Check that classification engine now uses learned rule
        classified = await classify_record("Chevron Gas Stop", "Chevron", -100.0, db)
        assert classified.category == "Vehicle & Delivery Fuel"
        assert classified.statement_type == "cogs"
        assert classified.classification_source == "learned_rule"
