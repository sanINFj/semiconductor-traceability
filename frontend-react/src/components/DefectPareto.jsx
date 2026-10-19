import React from "react";
import { DEFECT_COLORS } from "../data/constants";

export default function DefectPareto({ defectCounts = {} }) {
  const entries = Object.entries(defectCounts).sort((a, b) => b[1] - a[1]);
  const sumCounts = entries.reduce((acc, [, val]) => acc + val, 0) || 1;

  const items = entries.map(([category, count]) => {
    const pct = ((count / sumCounts) * 100).toFixed(1);
    return {
      category,
      count,
      pct,
      color: DEFECT_COLORS[category] || "#94a3b8",
    };
  });

  return (
    <div className="defect-pareto-card">
      <div className="pareto-header">
        <div>
          <h4>Defect Pareto Breakdown</h4>
          <p className="muted-small">Classification of defect mechanisms sorted by frequency</p>
        </div>
        <div className="pareto-total">
          <span>Total Defects Logged:</span>
          <strong>{sumCounts}</strong>
        </div>
      </div>

      <div className="pareto-bars">
        {items.map((item) => (
          <div key={item.category} className="pareto-row">
            <div className="pareto-labels">
              <span className="pareto-name">
                <span className="defect-dot" style={{ background: item.color }} />
                {item.category}
              </span>
              <span className="pareto-count">
                <strong>{item.count}</strong> <small>({item.pct}%)</small>
              </span>
            </div>
            <div className="pareto-track">
              <div
                className="pareto-fill"
                style={{
                  width: `${item.pct}%`,
                  background: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
