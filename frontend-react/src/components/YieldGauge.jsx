import React from "react";

export default function YieldGauge({ lotYield, baselineYield, thresholdPp = 5.0, status }) {
  const isAlert = status === "ALERT";
  const isInsufficient = status === "INSUFFICIENT_DATA";
  const delta = baselineYield !== null && lotYield !== null ? (lotYield - baselineYield).toFixed(2) : null;

  // Percentage within range 75% to 100% for display
  const minRange = 75;
  const maxRange = 100;
  const scale = (val) => {
    if (val === null || val === undefined) return 0;
    const clamped = Math.max(minRange, Math.min(maxRange, val));
    return ((clamped - minRange) / (maxRange - minRange)) * 100;
  };

  const yieldPct = scale(lotYield);
  const baselinePct = scale(baselineYield);
  const alertThresholdVal = baselineYield !== null ? baselineYield - thresholdPp : null;
  const alertPct = scale(alertThresholdVal);

  return (
    <div className={`yield-gauge-card ${isAlert ? "gauge-alert" : ""}`}>
      <div className="gauge-header">
        <div>
          <h4>Yield Deviation & Baseline Comparison</h4>
          <p className="muted-small">Comparison against same-product cohort median</p>
        </div>
        <span className={`status-badge-lg ${status?.toLowerCase().replace("_", "-")}`}>
          {status}
        </span>
      </div>

      <div className="gauge-values-row">
        <div className="gauge-stat">
          <label>Observed Yield</label>
          <span className={`gauge-num ${isAlert ? "text-red" : "text-cyan"}`}>
            {lotYield !== null ? `${lotYield}%` : "—"}
          </span>
        </div>
        <div className="gauge-divider">vs</div>
        <div className="gauge-stat">
          <label>Cohort Median Baseline</label>
          <span className="gauge-num text-white">
            {baselineYield !== null ? `${baselineYield}%` : "—"}
          </span>
        </div>
        <div className="gauge-divider">=</div>
        <div className="gauge-stat">
          <label>Deviation</label>
          <span className={`gauge-num ${isAlert ? "text-red" : Number(delta) >= 0 ? "text-green" : "text-amber"}`}>
            {delta !== null ? `${Number(delta) >= 0 ? "+" : ""}${delta} pp` : "—"}
          </span>
        </div>
      </div>

      {/* Visual Linear Gauge with Threshold Cutoff */}
      <div className="gauge-track-wrapper">
        <div className="gauge-labels-top">
          <span>{minRange}%</span>
          {alertThresholdVal && (
            <span style={{ left: `${alertPct}%` }} className="gauge-threshold-label">
              Alert Cutoff: {alertThresholdVal.toFixed(1)}% ({thresholdPp}pp drop)
            </span>
          )}
          <span>{maxRange}%</span>
        </div>
        <div className="gauge-bar-track">
          {/* Nominal zone */}
          <div
            className="gauge-nominal-zone"
            style={{ left: `${alertPct}%`, width: `${100 - alertPct}%` }}
          />
          {/* Excursion zone */}
          <div
            className="gauge-alert-zone"
            style={{ left: 0, width: `${alertPct}%` }}
          />
          {/* Baseline Marker */}
          {baselineYield && (
            <div
              className="gauge-marker baseline-marker"
              style={{ left: `${baselinePct}%` }}
              title={`Cohort Baseline: ${baselineYield}%`}
            >
              <div className="marker-pin" />
              <div className="marker-tag">Baseline</div>
            </div>
          )}
          {/* Actual Yield Marker */}
          {lotYield && (
            <div
              className={`gauge-marker actual-marker ${isAlert ? "marker-alert" : ""}`}
              style={{ left: `${yieldPct}%` }}
              title={`Observed: ${lotYield}%`}
            >
              <div className="marker-pin actual-pin" />
              <div className="marker-tag actual-tag">{lotYield}%</div>
            </div>
          )}
        </div>
      </div>

      <div className="gauge-footer-note">
        {isAlert && (
          <div className="alert-notice-box">
            <span className="notice-icon">⚠️</span>
            <span>
              <strong>Yield Excursion Flagged:</strong> Lot yield dropped by {Math.abs(Number(delta))} percentage points, exceeding the {thresholdPp} pp anomaly threshold.
            </span>
          </div>
        )}
        {!isAlert && !isInsufficient && (
          <div className="normal-notice-box">
            <span className="notice-icon">✓</span>
            <span>
              <strong>Nominal Variation:</strong> Lot yield is within the acceptable {thresholdPp} pp baseline tolerance band.
            </span>
          </div>
        )}
        {isInsufficient && (
          <div className="warning-notice-box">
            <span className="notice-icon">ℹ</span>
            <span>
              <strong>Insufficient Comparison Data:</strong> No comparable same-product baseline lots were found.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
