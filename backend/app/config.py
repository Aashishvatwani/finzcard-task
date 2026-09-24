import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
WORKSPACE_DIR = BASE_DIR.parent
DATA_DIR = WORKSPACE_DIR / "data"
DB_PATH = BASE_DIR / "financial_review.db"

# Variance materiality thresholds
MATERIALITY_ABS_THRESHOLD = 5000.0  # |delta| >= $5,000
MATERIALITY_PCT_THRESHOLD = 15.0    # |delta %| >= 15.0%
MATERIALITY_PCT_MIN_ABS = 1000.0    # provided |delta| >= $1,000

# Anomaly review thresholds
CONFIDENCE_THRESHOLD = 0.70
OUTLIER_STD_DEV_MULTIPLIER = 3.0
DUPLICATE_HOURS_WINDOW = 48
