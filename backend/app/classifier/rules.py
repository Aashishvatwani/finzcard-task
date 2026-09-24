import re
from typing import Dict, Any, List, Optional

# Deterministic Restaurant & Commercial Accounting Rules
DETERMINISTIC_RULES = [
    # Non-P&L / Balance Sheet Items
    {
        "patterns": [r"equipment purchase", r"new oven", r"capex", r"capital expenditure", r"restaurant equipment"],
        "category": "Fixed Assets / CapEx",
        "account_type": "balance_sheet",
        "statement_type": "non_pnl",
        "confidence": 0.98,
        "reason": "Capital asset purchase with multi-year useful life; capitalized on balance sheet, not expensed on P&L."
    },
    {
        "patterns": [r"sales tax remittance", r"dept.*revenue", r"sales tax payment"],
        "category": "Tax Liabilities",
        "account_type": "balance_sheet",
        "statement_type": "non_pnl",
        "confidence": 0.99,
        "reason": "Remittance of collected sales tax payable; settles balance sheet liability without impacting P&L."
    },
    {
        "patterns": [r"loan principal", r"principal repayment", r"debt principal", r"bank loan"],
        "category": "Debt Principal Repayment",
        "account_type": "balance_sheet",
        "statement_type": "non_pnl",
        "confidence": 0.99,
        "reason": "Principal repayment reduces debt liability; only interest component is tax-deductible expense."
    },
    {
        "patterns": [r"owner distribution", r"owner draw", r"dividend", r"shareholder distribution"],
        "category": "Owner Equity Distribution",
        "account_type": "balance_sheet",
        "statement_type": "non_pnl",
        "confidence": 0.99,
        "reason": "Equity distribution to owner; reduces retained earnings/equity, excluded from P&L."
    },
    {
        "patterns": [r"gift card sales", r"gift card deposit", r"unredeemed gift card"],
        "category": "Deferred Revenue",
        "account_type": "balance_sheet",
        "statement_type": "non_pnl",
        "confidence": 0.85,
        "reason": "Gift card sales represent unearned deferred revenue liability until redeemed."
    },

    # Revenue
    {
        "patterns": [r"pos batch.*food", r"food sales"],
        "category": "Food Sales",
        "account_type": "pnl",
        "statement_type": "revenue",
        "confidence": 0.99,
        "reason": "Primary operating revenue from in-house food sales."
    },
    {
        "patterns": [r"pos batch.*beverage", r"beverage sales", r"bar sales"],
        "category": "Beverage Sales",
        "account_type": "pnl",
        "statement_type": "revenue",
        "confidence": 0.99,
        "reason": "Primary operating revenue from beverage and bar sales."
    },
    {
        "patterns": [r"catering invoice", r"corporate catering", r"catering client"],
        "category": "Catering Revenue",
        "account_type": "pnl",
        "statement_type": "revenue",
        "confidence": 0.98,
        "reason": "Operating revenue from corporate and private catering contracts."
    },
    {
        "patterns": [r"delivery marketplace payout", r"doordash.*payout", r"uber eats.*payout"],
        "category": "Delivery Marketplace Sales",
        "account_type": "pnl",
        "statement_type": "revenue",
        "confidence": 0.96,
        "reason": "Third-party delivery platform gross sales payouts."
    },
    {
        "patterns": [r"refunds and discounts", r"pos adjustment.*discount", r"comped meals"],
        "category": "Discounts & Refunds",
        "account_type": "pnl",
        "statement_type": "revenue",
        "confidence": 0.98,
        "reason": "Contra-revenue offsetting gross sales."
    },

    # Cost of Goods Sold (COGS)
    {
        "patterns": [r"sysco", r"us foods", r"local produce", r"butcher & sons", r"bakery supply", r"food inventory", r"large catering event food"],
        "category": "Food Inventory / Ingredients",
        "account_type": "pnl",
        "statement_type": "cogs",
        "confidence": 0.98,
        "reason": "Direct food product inventory and kitchen raw materials."
    },
    {
        "patterns": [r"southern glazer", r"craft beer distributor", r"beverage depot", r"beverage inventory", r"wine.*spirits"],
        "category": "Beverage Inventory / Alcohol",
        "account_type": "pnl",
        "statement_type": "cogs",
        "confidence": 0.98,
        "reason": "Direct cost of alcoholic and non-alcoholic beverage inventory."
    },
    {
        "patterns": [r"restaurant depot", r"to-go packaging", r"packaging and disposables", r"takeout containers"],
        "category": "Packaging & Disposables",
        "account_type": "pnl",
        "statement_type": "cogs",
        "confidence": 0.95,
        "reason": "Direct food service containers, cutlery, and to-go packaging."
    },
    {
        "patterns": [r"delivery platform commission", r"marketplace deduction", r"doordash commission", r"uber eats commission"],
        "category": "Delivery Platform Fees",
        "account_type": "pnl",
        "statement_type": "cogs",
        "confidence": 0.96,
        "reason": "Direct transactional commission deducted by third-party delivery channels."
    },

    # Payroll
    {
        "patterns": [r"hourly kitchen and foh", r"hourly wages", r"gusto payroll - hourly"],
        "category": "Hourly Wages",
        "account_type": "pnl",
        "statement_type": "payroll",
        "confidence": 0.99,
        "reason": "Direct operational labor for kitchen and front-of-house staff."
    },
    {
        "patterns": [r"manager salary", r"general manager", r"salary payroll"],
        "category": "Management Salaries",
        "account_type": "pnl",
        "statement_type": "payroll",
        "confidence": 0.99,
        "reason": "Exempt management and administrative payroll."
    },
    {
        "patterns": [r"payroll taxes", r"gusto.*taxes and benefits", r"employer tax", r"health benefits"],
        "category": "Payroll Taxes & Benefits",
        "account_type": "pnl",
        "statement_type": "payroll",
        "confidence": 0.98,
        "reason": "Mandatory employer payroll taxes, FICA, FUTA, and employee healthcare benefits."
    },

    # Operating Expenses (OpEx)
    {
        "patterns": [r"rent", r"landlord", r"lease payment"],
        "category": "Facility Rent",
        "account_type": "pnl",
        "statement_type": "opex",
        "confidence": 0.99,
        "reason": "Contractual commercial property lease expense."
    },
    {
        "patterns": [r"toast", r"pos/software", r"software subscription", r"saas"],
        "category": "POS & Software Subscriptions",
        "account_type": "pnl",
        "statement_type": "opex",
        "confidence": 0.98,
        "reason": "Point of sale and core operational software licensing."
    },
    {
        "patterns": [r"next insurance", r"insurance premium", r"liability insurance", r"workers comp"],
        "category": "Business Insurance",
        "account_type": "pnl",
        "statement_type": "opex",
        "confidence": 0.98,
        "reason": "Commercial general liability and property casualty insurance."
    },
    {
        "patterns": [r"ledgerpro", r"accounting", r"bookkeeping", r"cpa fee", r"legal fee"],
        "category": "Professional & Accounting Fees",
        "account_type": "pnl",
        "statement_type": "opex",
        "confidence": 0.98,
        "reason": "External bookkeeping, compliance, and accounting services."
    },
    {
        "patterns": [r"comcast", r"internet and phone", r"telecom", r"broadband"],
        "category": "Telecom & Internet",
        "account_type": "pnl",
        "statement_type": "opex",
        "confidence": 0.98,
        "reason": "Commercial telecommunications and high-speed POS data line."
    },
    {
        "patterns": [r"city utilities", r"utilities - electric", r"electric/gas/water", r"power & light"],
        "category": "Utilities",
        "account_type": "pnl",
        "statement_type": "opex",
        "confidence": 0.98,
        "reason": "Direct building electricity, natural gas for kitchen line, and municipal water/sewer."
    },
    {
        "patterns": [r"linenpro", r"cleaning and linen", r"laundry service", r"chemical supply"],
        "category": "Cleaning & Linen Services",
        "account_type": "pnl",
        "statement_type": "opex",
        "confidence": 0.98,
        "reason": "Kitchen apron, towel, bar rag linen cleaning, and sanitation supplies."
    },
    {
        "patterns": [r"meta/google/yelp", r"marketing", r"local ads", r"advertising", r"social ads"],
        "category": "Marketing & Advertising",
        "account_type": "pnl",
        "statement_type": "opex",
        "confidence": 0.97,
        "reason": "Digital local customer acquisition and search advertising."
    },
    {
        "patterns": [r"kitchen repair", r"repairs and maintenance", r"hvac service", r"refrigeration repair"],
        "category": "Repairs & Maintenance",
        "account_type": "pnl",
        "statement_type": "opex",
        "confidence": 0.96,
        "reason": "Preventative maintenance and emergency equipment repair."
    },
    {
        "patterns": [r"staples", r"amazon", r"office/admin supplies", r"paper and toner"],
        "category": "Office & Administrative Supplies",
        "account_type": "pnl",
        "statement_type": "opex",
        "confidence": 0.94,
        "reason": "Back-office stationery, receipt paper rolls, and printing."
    },
    {
        "patterns": [r"license renewal", r"city business licensing", r"health permit", r"liquor license"],
        "category": "Licenses & Permits",
        "account_type": "pnl",
        "statement_type": "opex",
        "confidence": 0.97,
        "reason": "Annual municipal operating license and regulatory compliance."
    }
]
