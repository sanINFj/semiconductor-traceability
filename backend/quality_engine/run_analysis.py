import json
from pathlib import Path

from backend.quality_engine.lot import ManufacturingLot
from backend.quality_engine.anomaly_detector import detect_yield_anomaly


data_path = Path("sample_data/lots.json")
records = json.loads(data_path.read_text())

lots = [ManufacturingLot(**record) for record in records]

for lot in lots:
    result = detect_yield_anomaly(lot, lots)

    print(
        f"{result['lot_id']}: "
        f"{result['status']} — {result['message']}"
    )

    if result["status"] == "ALERT":
        print(
            f"  Observed: {result['observed_yield_pct']}% | "
            f"Baseline: {result['baseline_yield_pct']}% | "
            f"Drop: {result['yield_drop_percentage_points']} "
            "percentage points"
        )
        print(
            f"  Equipment: {result['equipment_id']} | "
            f"Recipe: {result['recipe_revision']}"
        )
