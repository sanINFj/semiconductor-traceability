import React from "react";

export default function EightDReportModal({ lot, onClose }) {
  if (!lot) return null;

  const dropPp = lot.yield_drop_pp ?? (lot.baseline ? (lot.baseline - lot.yield).toFixed(2) : "5.00");
  const reportDate = lot.event_timestamp ? lot.event_timestamp.slice(0, 10) : "2026-10-19";

  const handleDownloadMarkdown = () => {
    const mdContent = `# 8D Quality Investigation Report
**Document ID:** 8D-${lot.lot_id}
**Date:** ${reportDate}
**Product:** ${lot.product_id}
**Status:** ${lot.status}
**Classification:** ${lot.is_synthetic ? "SYNTHETIC BENCHMARK EVALUATION" : "FAB PRODUCTION"}

---

### D1: Quality Team
- **Lead Quality Engineer:** Fab Quality Engineering Lead
- **Process Engineer:** ATE Test Cell Specialist
- **Failure Analysis:** Wafer Metrology & PFA Lab

### D2: Problem Description
- **Manufacturing Lot ID:** ${lot.lot_id}
- **Wafer Lot:** ${lot.wafer_lot_id || "N/A"}
- **Process Step:** ${lot.process_step} on ${lot.equipment_id} (${lot.recipe_revision})
- **Observed Yield:** ${lot.yield}%
- **Cohort Baseline Median:** ${lot.baseline}%
- **Yield Drop (Excursion):** -${Math.abs(Number(dropPp))} percentage points
- **Total Tested Dies:** ${lot.tested_dies.toLocaleString()}
- **Failed Dies (Scrap):** ${lot.failed_dies.toLocaleString()} (${((lot.failed_dies / lot.tested_dies) * 100).toFixed(2)}%)

### D3: Interim Containment Actions
- Automated hold flag set in MES.
- Downstream packaging staging paused pending test socket verification.
- Tester ${lot.equipment_id} locked for calibration check.

### D4: Root Cause Analysis (RCA) & AI Brief
- **Dominant Defect Mechanism:** ${Object.entries(lot.defect_counts || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || "Parametric Outlier"}
- **Investigation Summary:** ${lot.investigation_note || "Yield drop exceeded configured 5.0 pp baseline threshold."}
- **Advisory Guidance:** Review tester ${lot.equipment_id} pin alignment and contact resistance data. Cross-reference wafer sort metrology to verify if defect mechanism initiated at front-end lithography or during package test.

### D5: Permanent Corrective Action (PCA)
- Perform probe card planarization and ultrasonic cleaning on ${lot.equipment_id}.
- Re-zero thermal chuck PID loop and recalibrate pin electronics before next lot run.

### D6: Verification of Effectiveness
- Verification wafers passed within ±0.05 ohm contact tolerance.
- Scrap rate normalized to nominal baseline band on subsequent test runs.

### D7: Prevention of Recurrence
- FMEA item updated for probe tip wear monitoring.
- Automated Amazon SNS notification rule active for yield drops >= 5.0 pp.

### D8: Team Sign-Off
- **Status:** APPROVED & ARCHIVED
- **Notice:** Synthetic evaluation dataset record for WaferIQ quality platform validation.
`;

    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `8D-Report-${lot.lot_id}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">AUTOMOTIVE / SEMICONDUCTOR STANDARD</span>
            <h2>8D Quality Incident Report: {lot.lot_id}</h2>
          </div>
          <div className="modal-actions">
            <button className="btn btn-sm btn-secondary" onClick={() => window.print()}>
              🖨️ Print / PDF
            </button>
            <button className="btn btn-sm btn-primary" onClick={handleDownloadMarkdown}>
              ⬇ Download .MD
            </button>
            <button className="modal-close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="report-content-scroll">
          <div className="report-doc-view">
            <div className="report-doc-header">
              <div className="doc-brand">
                <span>WAFERIQ</span> · SEMICONDUCTOR QUALITY INTELLIGENCE
              </div>
              <div className="doc-meta">
                <span>Report ID: <strong>8D-{lot.lot_id}</strong></span>
                <span>Date: <strong>{reportDate}</strong></span>
              </div>
            </div>

            <div className="d-section">
              <h3>D1 · Team & Champions</h3>
              <p>Lead Quality Engineer: Quality Operations · Process Owner: {lot.equipment_id} Cell Specialist · Metrology: PFA Lab</p>
            </div>

            <div className="d-section">
              <h3>D2 · Problem Description</h3>
              <div className="d-grid-2">
                <div>
                  <label>Lot ID:</label> <span>{lot.lot_id}</span><br />
                  <label>Product Family:</label> <span>{lot.product_id}</span><br />
                  <label>Process Step:</label> <span>{lot.process_step}</span>
                </div>
                <div>
                  <label>Observed Yield:</label> <strong className="text-red">{lot.yield}%</strong><br />
                  <label>Cohort Median Baseline:</label> <span>{lot.baseline}%</span><br />
                  <label>Yield Excursion Delta:</label> <strong className="text-red">-{Math.abs(Number(dropPp))} pp</strong>
                </div>
              </div>
            </div>

            <div className="d-section">
              <h3>D3 · Interim Containment Actions</h3>
              <p>Lot quarantined in MES. Tester {lot.equipment_id} flagged for maintenance inspection. Staging hold initiated.</p>
            </div>

            <div className="d-section">
              <h3>D4 · Root Cause Analysis & Bedrock AI Brief</h3>
              <div className="ai-brief-box">
                <p><strong>Observation:</strong> {lot.investigation_note}</p>
                <small className="muted">AI guidance: Review tester {lot.equipment_id} pin alignment and contact resistance data. Cross-reference wafer sort metrology to verify if defect mechanism initiated at front-end lithography or during package test.</small>
              </div>
            </div>

            <div className="d-section">
              <h3>D5 · Corrective Actions (CAPA)</h3>
              <p>Perform probe card planarization and ultrasonic cleaning on {lot.equipment_id}. Recalibrate thermocouple sensor and recipe parameters.</p>
            </div>

            <div className="d-section">
              <h3>D6 & D7 · Verification & Prevention</h3>
              <p>Subsequent run yields recovered to &gt;95.0%. Dynamic alert threshold monitoring set at 5.0 pp drop trigger via Amazon SNS.</p>
            </div>

            <div className="d-section">
              <h3>D8 · Final Sign-Off</h3>
              <div className="sign-off-bar">
                <span>Status: <strong className="text-green">RESOLVED & ARCHIVED</strong></span>
                <span className="mono">Reviewed by Quality Control Council</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
