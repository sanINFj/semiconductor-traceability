import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import WaferMap from "./WaferMap";
import DefectPareto from "./DefectPareto";
import YieldGauge from "./YieldGauge";

export default function LotComparator({ lots }) {
  const alertLots = lots.filter((l) => l.status === "ALERT");
  const normalLots = lots.filter((l) => l.status === "NORMAL");

  const [lot1Id, setLot1Id] = useState(alertLots[0]?.lot_id || lots[0]?.lot_id);
  const [lot2Id, setLot2Id] = useState(normalLots[0]?.lot_id || lots[1]?.lot_id);

  const lot1 = lots.find((l) => l.lot_id === lot1Id) || lots[0];
  const lot2 = lots.find((l) => l.lot_id === lot2Id) || lots[1];

  const yieldDiff = lot1 && lot2 ? (lot1.yield - lot2.yield).toFixed(2) : "0.00";
  const scrapDiff = lot1 && lot2 ? lot1.failed_dies - lot2.failed_dies : 0;

  const handleSwap = () => {
    const temp = lot1Id;
    setLot1Id(lot2Id);
    setLot2Id(temp);
  };

  return (
    <div className="lot-comparator-view">
      <div className="panel comparator-controls-panel">
        <div className="comparator-header">
          <div>
            <span className="eyebrow">DIAGNOSTIC YIELD DIFFERENTIAL</span>
            <h2>Side-by-Side Semiconductor Lot Comparator</h2>
            <p className="muted">
              Compare an excursion lot against a nominal reference lot of the same or different product
              to isolate defect signatures and equipment correlation.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={handleSwap}>
            ⇄ Swap Lots
          </button>
        </div>

        <div className="comparator-selectors-grid">
          <div className="selector-card">
            <span className="selector-tag tag-a">LOT A (Target)</span>
            <select
              value={lot1Id}
              onChange={(e) => setLot1Id(e.target.value)}
              className="lot-select"
            >
              {lots.map((l) => (
                <option key={l.lot_id} value={l.lot_id}>
                  {l.lot_id} ({l.product_id} · {l.yield}% · {l.status})
                </option>
              ))}
            </select>
            {lot1 && (
              <div className="lot-quick-meta">
                <span>{lot1.process_step} on <strong>{lot1.equipment_id}</strong></span>
                <span className={`status-pill ${lot1.status.toLowerCase().replace("_", "-")}`}>
                  {lot1.status}
                </span>
              </div>
            )}
          </div>

          <div className="comparator-delta-banner">
            <div className="delta-stat">
              <label>Yield Difference (A vs B)</label>
              <strong className={Number(yieldDiff) < 0 ? "text-red" : "text-green"}>
                {Number(yieldDiff) > 0 ? `+${yieldDiff}` : yieldDiff} pp
              </strong>
            </div>
            <div className="delta-stat">
              <label>Scrap Die Delta</label>
              <strong className={scrapDiff > 0 ? "text-red" : "text-green"}>
                {scrapDiff > 0 ? `+${scrapDiff.toLocaleString()}` : scrapDiff.toLocaleString()} dies
              </strong>
            </div>
          </div>

          <div className="selector-card">
            <span className="selector-tag tag-b">LOT B (Reference)</span>
            <select
              value={lot2Id}
              onChange={(e) => setLot2Id(e.target.value)}
              className="lot-select"
            >
              {lots.map((l) => (
                <option key={l.lot_id} value={l.lot_id}>
                  {l.lot_id} ({l.product_id} · {l.yield}% · {l.status})
                </option>
              ))}
            </select>
            {lot2 && (
              <div className="lot-quick-meta">
                <span>{lot2.process_step} on <strong>{lot2.equipment_id}</strong></span>
                <span className={`status-pill ${lot2.status.toLowerCase().replace("_", "-")}`}>
                  {lot2.status}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Side-by-Side Yield Gauges */}
      <div className="side-by-side-grid">
        <div className="side-col">
          <div className="side-col-header">
            <h3>{lot1.lot_id} · {lot1.product_id}</h3>
            <NavLink className="text-link" to={`/lots/${lot1.lot_id}`}>Open Lot Details ↗</NavLink>
          </div>
          <YieldGauge
            lotYield={lot1.yield}
            baselineYield={lot1.baseline}
            thresholdPp={5.0}
            status={lot1.status}
          />
        </div>

        <div className="side-col">
          <div className="side-col-header">
            <h3>{lot2.lot_id} · {lot2.product_id}</h3>
            <NavLink className="text-link" to={`/lots/${lot2.lot_id}`}>Open Lot Details ↗</NavLink>
          </div>
          <YieldGauge
            lotYield={lot2.yield}
            baselineYield={lot2.baseline}
            thresholdPp={5.0}
            status={lot2.status}
          />
        </div>
      </div>

      {/* Side-by-Side Silicon Wafer Maps */}
      <div className="side-by-side-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{lot1.lot_id} Silicon Wafer Map</h2>
              <p>Wafer {lot1.wafer_lot_id} ({lot1.wafer_diameter_mm}mm)</p>
            </div>
          </div>
          <WaferMap lot={lot1} />
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{lot2.lot_id} Silicon Wafer Map</h2>
              <p>Wafer {lot2.wafer_lot_id} ({lot2.wafer_diameter_mm}mm)</p>
            </div>
          </div>
          <WaferMap lot={lot2} />
        </section>
      </div>

      {/* Side-by-Side Defect Pareto */}
      <div className="side-by-side-grid">
        <section className="panel">
          <DefectPareto defectCounts={lot1.defect_counts} />
        </section>
        <section className="panel">
          <DefectPareto defectCounts={lot2.defect_counts} />
        </section>
      </div>
    </div>
  );
}
