"""Simple baseline-based yield anomaly detection."""

from statistics import median

from backend.quality_engine.lot import ManufacturingLot


def detect_yield_anomaly(
    lot: ManufacturingLot,
    comparison_lots: list[ManufacturingLot],
    min_drop_percentage_points: float = 5.0,
) -> dict:
    """Compare a lot's yield with comparable lots of the same product."""

    if min_drop_percentage_points < 0:
        raise ValueError("The drop threshold cannot be negative")

    # Exclude the current lot so it cannot influence its own baseline.
    references = [
        other
        for other in comparison_lots
        if other.lot_id != lot.lot_id
        and other.product_id == lot.product_id
    ]

    if not references:
        return {
            "lot_id": lot.lot_id,
            "status": "INSUFFICIENT_DATA",
            "message": "No comparable lots are available.",
        }

    baseline = median(
        other.final_test_yield for other in references
    )
    yield_drop = baseline - lot.final_test_yield
    is_anomaly = yield_drop >= min_drop_percentage_points

    return {
        "lot_id": lot.lot_id,
        "product_id": lot.product_id,
        "status": "ALERT" if is_anomaly else "NORMAL",
        "observed_yield_pct": round(lot.final_test_yield, 2),
        "baseline_yield_pct": round(baseline, 2),
        "yield_drop_percentage_points": round(yield_drop, 2),
        "threshold_percentage_points": min_drop_percentage_points,
        "comparison_lot_ids": [other.lot_id for other in references],
        "equipment_id": lot.equipment_id,
        "recipe_revision": lot.recipe_revision,
        "message": (
            f"Yield is {yield_drop:.2f} percentage points "
            f"below the comparison baseline."
            if is_anomaly
            else "Yield does not meet the configured alert criterion."
        ),
    }
