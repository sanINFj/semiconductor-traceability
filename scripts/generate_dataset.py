import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "sample_data"
RNG = random.Random(20261010)

products = {
    "CHIP-A": {"nominal_yield": 95.0, "wafer_diameter_mm": 300},
    "CHIP-B": {"nominal_yield": 94.0, "wafer_diameter_mm": 300},
    "CHIP-C": {"nominal_yield": 97.0, "wafer_diameter_mm": 200},
}

equipment = [
    "TESTER-01", "TESTER-02", "TESTER-03",
    "TESTER-04", "TESTER-05",
]
recipes = ["REV-A", "REV-B", "REV-C"]
defect_types = [
    "Particle contamination",
    "Lithography pattern defect",
    "Overlay/alignment deviation",
    "Electrical test failure",
    "Contact/via resistance",
    "Parametric outlier",
]
process_history = [
    "Wafer Fabrication",
    "Wafer Inspection",
    "Wafer Sort",
    "Assembly",
    "Final Test",
]

records = []
metadata = []
base_time = datetime(2026, 9, 1, 8, 0, tzinfo=timezone.utc)

# Stable, intentionally seeded synthetic population.
for i in range(1, 61):
    product_id = list(products)[(i - 1) % len(products)]
    product = products[product_id]
    tested = RNG.choice([8000, 10000, 12000, 15000])
    nominal = product["nominal_yield"]
    yield_pct = max(70.0, min(99.5, RNG.gauss(nominal, 0.8)))

    # Inject clearly labelled synthetic anomaly scenarios.
    scenario = "NORMAL"
    if i in (12, 29, 47):
        yield_pct = nominal - RNG.uniform(7.0, 11.0)
        scenario = "LOW_YIELD_INJECTED"
    elif i in (18, 36, 54):
        yield_pct = nominal - RNG.uniform(5.5, 7.0)
        scenario = "MODERATE_YIELD_DROP_INJECTED"

    passing = round(tested * yield_pct / 100)
    lot_id = f"SYN-LOT-{i:04d}"
    tool = equipment[(i * 3 + i // 4) % len(equipment)]
    recipe = recipes[(i // 8) % len(recipes)]
    event_time = base_time + timedelta(hours=i * 9)

    records.append({
        "lot_id": lot_id,
        "product_id": product_id,
        "tested_dies": tested,
        "passing_dies": passing,
        "process_step": "Final Test",
        "equipment_id": tool,
        "recipe_revision": recipe,
    })

    # These fields are deliberately kept outside ManufacturingLot
    # so the current data model and Lambda contract remain compatible.
    failed = tested - passing
    metadata.append({
        "lot_id": lot_id,
        "synthetic_data": True,
        "scenario_label": scenario,
        "wafer_lot_id": f"WAF-{i:04d}",
        "wafer_count": RNG.randint(18, 25),
        "wafer_diameter_mm": product["wafer_diameter_mm"],
        "plant_id": f"FAB-{1 + (i % 2):02d}",
        "process_revision": recipe,
        "equipment_id": tool,
        "process_history": process_history,
        "event_timestamp": event_time.isoformat(),
        "defect_counts": {
            "Particle contamination": round(failed * RNG.uniform(0.05, 0.18)),
            "Lithography pattern defect": round(failed * RNG.uniform(0.04, 0.16)),
            "Overlay/alignment deviation": round(failed * RNG.uniform(0.03, 0.12)),
            "Electrical test failure": round(failed * RNG.uniform(0.20, 0.45)),
            "Contact/via resistance": round(failed * RNG.uniform(0.05, 0.15)),
            "Parametric outlier": round(failed * RNG.uniform(0.04, 0.14)),
        },
        "observed_yield_pct": round(passing / tested * 100, 2),
        "failed_dies": failed,
        "investigation_note": (
            "Synthetic anomaly injected for detector validation; "
            "not evidence of a real manufacturing root cause."
            if scenario != "NORMAL"
            else "Synthetic reference record; no injected yield anomaly."
        ),
    })

(DATA_DIR / "lots.json").write_text(
    json.dumps(records, indent=2) + "\n"
)
(DATA_DIR / "lot_metadata.json").write_text(
    json.dumps(metadata, indent=2) + "\n"
)

print(f"Generated {len(records)} synthetic lots.")
print(f"Core dataset: {DATA_DIR / 'lots.json'}")
print(f"Traceability metadata: {DATA_DIR / 'lot_metadata.json'}")
print("Injected scenarios:",
      sum(x["scenario_label"] != "NORMAL" for x in metadata))
print("All lot records retain the existing seven-field schema.")
