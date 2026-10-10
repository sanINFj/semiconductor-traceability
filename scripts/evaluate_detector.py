import csv
import json
import statistics
import time
from pathlib import Path
import sys

# Ensure the repository root is importable when run as a script.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.quality_engine.lot import ManufacturingLot
from backend.quality_engine.anomaly_detector import detect_yield_anomaly

ROOT = Path(".")
OUT = ROOT / "build" / "evaluation"
OUT.mkdir(parents=True, exist_ok=True)

lots_data = json.loads((ROOT / "sample_data/lots.json").read_text())
metadata_data = json.loads(
    (ROOT / "sample_data/lot_metadata.json").read_text()
)

metadata_by_id = {m["lot_id"]: m for m in metadata_data}
lots = [
    ManufacturingLot(
        lot_id=row["lot_id"],
        product_id=row["product_id"],
        tested_dies=row["tested_dies"],
        passing_dies=row["passing_dies"],
        process_step=row["process_step"],
        equipment_id=row["equipment_id"],
        recipe_revision=row["recipe_revision"],
    )
    for row in lots_data
]

if len(lots) != len(metadata_by_id):
    raise SystemExit(
        f"Dataset/metadata count mismatch: {len(lots)} lots, "
        f"{len(metadata_by_id)} metadata records"
    )

labels = {
    lot.lot_id: str(metadata_by_id[lot.lot_id]["scenario_label"]).upper()
    for lot in lots
}
label_counts = {}
for label in labels.values():
    label_counts[label] = label_counts.get(label, 0) + 1

# Treat NORMAL as negative and any explicitly different scenario as positive.
# Print the exact labels so this assumption is visible in the report.
positive_ids = {lot_id for lot_id, label in labels.items() if label != "NORMAL"}

print("Ground-truth scenario labels:", json.dumps(label_counts, indent=2))
print("Positive label convention: every scenario_label other than NORMAL")
print("Positive lot count:", len(positive_ids))

if not positive_ids:
    raise SystemExit("No positive scenarios found; refusing to report metrics.")

rows_by_threshold = {}
threshold_metrics = []

for threshold in (3.0, 5.0, 7.0, 10.0):
    results = []
    started = time.perf_counter()

    for lot in lots:
        # Same-product references only; detector itself excludes the target lot.
        comparisons = [
            other for other in lots
            if other.product_id == lot.product_id
        ]
        result = detect_yield_anomaly(
            lot,
            comparisons,
            min_drop_percentage_points=threshold,
        )
        result["ground_truth"] = (
            "ANOMALY" if lot.lot_id in positive_ids else "NORMAL"
        )
        result["predicted"] = (
            "ANOMALY" if result["status"] == "ALERT" else "NORMAL"
        )
        result["scenario_label"] = labels[lot.lot_id]
        results.append(result)

    elapsed_ms = (time.perf_counter() - started) * 1000
    tp = sum(r["predicted"] == "ANOMALY" and r["ground_truth"] == "ANOMALY" for r in results)
    fp = sum(r["predicted"] == "ANOMALY" and r["ground_truth"] == "NORMAL" for r in results)
    tn = sum(r["predicted"] == "NORMAL" and r["ground_truth"] == "NORMAL" for r in results)
    fn = sum(r["predicted"] == "NORMAL" and r["ground_truth"] == "ANOMALY" for r in results)

    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    specificity = tn / (tn + fp) if tn + fp else 0.0
    f1 = (
        2 * precision * recall / (precision + recall)
        if precision + recall else 0.0
    )
    accuracy = (tp + tn) / len(results) if results else 0.0

    threshold_metrics.append({
        "threshold_pp": threshold,
        "lots_evaluated": len(results),
        "TP": tp, "FP": fp, "TN": tn, "FN": fn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "specificity": round(specificity, 4),
        "f1": round(f1, 4),
        "accuracy": round(accuracy, 4),
        "runtime_ms": round(elapsed_ms, 3),
    })
    rows_by_threshold[threshold] = results

# Save detailed per-lot predictions at the default threshold.
default_results = rows_by_threshold[5.0]
with (OUT / "lot_predictions.csv").open("w", newline="") as f:
    fields = [
        "lot_id", "product_id", "scenario_label", "ground_truth", "predicted",
        "status", "observed_yield_pct", "baseline_yield_pct",
        "yield_drop_percentage_points", "threshold_percentage_points",
        "comparison_lot_ids",
    ]
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    for r in default_results:
        writer.writerow({
            **{key: r.get(key, "") for key in fields},
            "comparison_lot_ids": ";".join(r.get("comparison_lot_ids", [])),
        })

with (OUT / "threshold_metrics.csv").open("w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=threshold_metrics[0].keys())
    writer.writeheader()
    writer.writerows(threshold_metrics)

report = {
    "evaluation_type": "synthetic dataset benchmark",
    "dataset_size": len(lots),
    "scenario_label_counts": label_counts,
    "positive_label_rule": "scenario_label != NORMAL",
    "comparison_policy": "all other lots with the same product_id",
    "threshold_metrics": threshold_metrics,
    "limitations": [
        "Results apply only to this synthetic dataset.",
        "Comparison lots include other labeled anomaly lots, which may shift the median baseline.",
        "Thresholds are compared on the same dataset; this is not held-out validation.",
        "A yield alert is a signal for investigation, not a confirmed root cause.",
    ],
}
(OUT / "evaluation_report.json").write_text(json.dumps(report, indent=2))

md = [
    "# WaferIQ Detector Evaluation",
    "",
    "- Dataset: synthetic manufacturing lots",
    f"- Lots evaluated: {len(lots)}",
    f"- Scenario labels: `{json.dumps(label_counts, sort_keys=True)}`",
    "- Comparison cohort: all other lots with the same product ID",
    "- Positive ground truth: any `scenario_label` other than `NORMAL`",
    "",
    "| Threshold (pp) | TP | FP | TN | FN | Precision | Recall | Specificity | F1 | Accuracy | Runtime (ms) |",
    "|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
]
for m in threshold_metrics:
    md.append(
        f"| {m['threshold_pp']:.1f} | {m['TP']} | {m['FP']} | {m['TN']} | "
        f"{m['FN']} | {m['precision']:.4f} | {m['recall']:.4f} | "
        f"{m['specificity']:.4f} | {m['f1']:.4f} | {m['accuracy']:.4f} | "
        f"{m['runtime_ms']:.3f} |"
    )
md += [
    "",
    "## Limitations",
    "",
    "- This is a synthetic-data benchmark, not real-fab validation.",
    "- Other labeled anomalies remain in the comparison cohort and can influence its median.",
    "- Thresholds are compared on the same dataset, not a held-out test set.",
    "- Alerts indicate yield deviations; they do not establish root cause.",
    "",
]
(OUT / "evaluation_report.md").write_text("\n".join(md))

print("\n===== THRESHOLD RESULTS =====")
print("| Threshold | TP | FP | TN | FN | Precision | Recall | Specificity | F1 |")
print("|---:|---:|---:|---:|---:|---:|---:|---:|---:|")
for m in threshold_metrics:
    print(
        f"| {m['threshold_pp']:.1f} pp | {m['TP']} | {m['FP']} | {m['TN']} | "
        f"{m['FN']} | {m['precision']:.3f} | {m['recall']:.3f} | "
        f"{m['specificity']:.3f} | {m['f1']:.3f} |"
    )

print("\n===== FILES CREATED =====")
for name in ("evaluation_report.md", "evaluation_report.json",
             "threshold_metrics.csv", "lot_predictions.csv"):
    print(OUT / name)
