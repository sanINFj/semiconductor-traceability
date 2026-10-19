import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DEFECT_COLORS } from "../data/constants";

export default function WaferMap({ lot }) {
  const navigate = useNavigate();
  const [selectedDie, setSelectedDie] = useState(null);
  const [filterType, setFilterType] = useState("ALL"); // ALL, DEFECTS_ONLY, or specific defect category
  const [zoneFilter, setZoneFilter] = useState("ALL"); // ALL, CENTER, MIDDLE, EDGE

  const diameter = lot?.wafer_diameter_mm || 300;
  const gridSize = diameter === 200 ? 17 : 21; // grid dimension
  const radius = (gridSize - 1) / 2;

  // Generate deterministic die map based on lot id and defects
  const dies = useMemo(() => {
    if (!lot) return [];
    const list = [];
    const seed = (lot.lot_id || "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const defectTypes = Object.keys(lot.defect_counts || {});
    
    // Anomaly patterns
    const isEdgeParticle = lot.scenario_label === "MODERATE_YIELD_DROP_INJECTED";
    const isProbeCluster = lot.scenario_label === "LOW_YIELD_INJECTED";

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const dx = c - radius;
        const dy = r - radius;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Within silicon boundary
        if (dist <= radius) {
          // Classify zone
          const normDist = dist / radius;
          const zone = normDist < 0.4 ? "CENTER" : normDist < 0.75 ? "MIDDLE" : "EDGE";

          // Deterministic pseudorandom hash
          const hash = Math.sin(seed * 31 + r * 97 + c * 43) * 10000;
          const rand = hash - Math.floor(hash);

          // Defect probability adjusted by distance and lot yield
          let failProb = (100 - (lot.yield || 95)) / 100 * 1.8;
          
          if (isEdgeParticle && zone === "EDGE") {
            failProb *= 2.6; // Edge ring defect signature
          } else if (isProbeCluster && zone === "CENTER") {
            failProb *= 2.4; // Center probe cluster defect signature
          }

          const isDefective = rand < failProb;
          let defectCategory = null;
          let defectDetail = null;

          if (isDefective) {
            const defectIdx = Math.floor(rand * defectTypes.length * 10) % (defectTypes.length || 1);
            defectCategory = defectTypes[defectIdx] || "Electrical test failure";
            defectDetail = {
              "Particle contamination": "Bevel particle cluster (0.28µm)",
              "Lithography pattern defect": "Bridge flaw in metal layer 2",
              "Overlay/alignment deviation": "14nm alignment shift",
              "Electrical test failure": "Open contact / scan chain fail",
              "Contact/via resistance": "High resistance via chain (>42Ω)",
              "Parametric outlier": "Threshold voltage shift (Vth = +140mV)",
            }[defectCategory] || "Parametric failure";
          }

          list.push({
            id: `${lot.lot_id}-R${r}C${c}`,
            r,
            c,
            dx,
            dy,
            zone,
            dist: Number(dist.toFixed(1)),
            isDefective,
            defectCategory,
            defectDetail,
            voltage: isDefective ? (1.05 + rand * 0.4).toFixed(3) : "1.200",
            leakage_nA: isDefective ? (18.4 + rand * 30).toFixed(1) : (1.2 + rand * 0.8).toFixed(1),
          });
        }
      }
    }
    return list;
  }, [lot, gridSize, radius]);

  const filteredDies = useMemo(() => {
    return dies.map((d) => {
      let dimmed = false;
      if (zoneFilter !== "ALL" && d.zone !== zoneFilter) {
        dimmed = true;
      }
      if (filterType === "DEFECTS_ONLY" && !d.isDefective) {
        dimmed = true;
      } else if (filterType !== "ALL" && filterType !== "DEFECTS_ONLY" && d.defectCategory !== filterType) {
        dimmed = true;
      }
      return { ...d, dimmed };
    });
  }, [dies, filterType, zoneFilter]);

  const totalPassing = dies.filter((d) => !d.isDefective).length;
  const totalFailing = dies.filter((d) => d.isDefective).length;
  const simulatedYield = dies.length > 0 ? ((totalPassing / dies.length) * 100).toFixed(1) : 0;

  // Zone statistics
  const zoneStats = useMemo(() => {
    const calc = (z) => {
      const zDies = dies.filter((d) => d.zone === z);
      const pass = zDies.filter((d) => !d.isDefective).length;
      return zDies.length > 0 ? ((pass / zDies.length) * 100).toFixed(1) : 0;
    };
    return {
      center: calc("CENTER"),
      middle: calc("MIDDLE"),
      edge: calc("EDGE"),
    };
  }, [dies]);

  const handleProceedToInvestigation = () => {
    navigate("/investigations", {
      state: {
        focusLotId: lot.lot_id,
        dieContext: selectedDie,
      },
    });
  };

  return (
    <div className="wafer-inspector-container">
      <div className="wafer-inspector-header">
        <div>
          <div className="wafer-title-row">
            <h3>Wafer Die Map Inspector</h3>
            <span className="wafer-badge">{diameter}mm Silicon Wafer</span>
            <span className="subtle-tag synthetic-tag">SYNTHETIC MAP</span>
          </div>
          <p className="wafer-subtitle">
            Interactive die-level spatial test telemetry for wafer <strong>{lot.wafer_lot_id || `WAF-${lot.lot_id.slice(-4)}`}</strong>.
            Click any die to inspect electrical parameters and defect categorization.
          </p>
        </div>
        <div className="wafer-controls-group">
          <div className="wafer-controls">
            <label>Defect Filter:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="wafer-filter-select"
            >
              <option value="ALL">All Dies ({dies.length})</option>
              <option value="DEFECTS_ONLY">Defects Only ({totalFailing})</option>
              {Object.keys(DEFECT_COLORS).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="wafer-controls">
            <label>Radial Zone:</label>
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="wafer-filter-select"
            >
              <option value="ALL">All Zones</option>
              <option value="CENTER">Center Zone ({zoneStats.center}%)</option>
              <option value="MIDDLE">Middle Zone ({zoneStats.middle}%)</option>
              <option value="EDGE">Bevel Edge Zone ({zoneStats.edge}%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Radial Zone Yield Bar */}
      <div className="wafer-zone-bar">
        <div className={`zone-chip ${zoneFilter === "CENTER" ? "active" : ""}`} onClick={() => setZoneFilter(zoneFilter === "CENTER" ? "ALL" : "CENTER")}>
          <span>Center Zone</span>
          <strong>{zoneStats.center}%</strong>
        </div>
        <div className={`zone-chip ${zoneFilter === "MIDDLE" ? "active" : ""}`} onClick={() => setZoneFilter(zoneFilter === "MIDDLE" ? "ALL" : "MIDDLE")}>
          <span>Middle Annulus</span>
          <strong>{zoneStats.middle}%</strong>
        </div>
        <div className={`zone-chip ${zoneFilter === "EDGE" ? "active" : ""}`} onClick={() => setZoneFilter(zoneFilter === "EDGE" ? "ALL" : "EDGE")}>
          <span>Bevel Edge</span>
          <strong className={Number(zoneStats.edge) < 90 ? "text-red" : "text-green"}>{zoneStats.edge}%</strong>
        </div>
      </div>

      <div className="wafer-inspector-body">
        {/* SVG Silicon Wafer Canvas */}
        <div className="wafer-canvas-wrapper">
          <div className="wafer-notch-indicator">▲ Wafer Flat / Notch (Orientation Mark)</div>
          <svg
            viewBox={`-10 -10 ${gridSize * 18 + 20} ${gridSize * 18 + 20}`}
            className="wafer-svg"
          >
            {/* Silicon Wafer Substrate */}
            <circle
              cx={(gridSize * 18) / 2}
              cy={(gridSize * 18) / 2}
              r={(gridSize * 18) / 2 - 2}
              className="wafer-substrate"
            />
            {/* Edge Exclusion Ring */}
            <circle
              cx={(gridSize * 18) / 2}
              cy={(gridSize * 18) / 2}
              r={(gridSize * 18) / 2 - 8}
              className="wafer-exclusion-ring"
            />
            {/* Alignment Center Crosshairs */}
            <line
              x1={(gridSize * 18) / 2 - 12}
              y1={(gridSize * 18) / 2}
              x2={(gridSize * 18) / 2 + 12}
              y2={(gridSize * 18) / 2}
              className="wafer-crosshair"
            />
            <line
              x1={(gridSize * 18) / 2}
              y1={(gridSize * 18) / 2 - 12}
              x2={(gridSize * 18) / 2}
              y2={(gridSize * 18) / 2 + 12}
              className="wafer-crosshair"
            />

            {/* Individual Dies */}
            {filteredDies.map((die) => {
              const x = die.c * 18 + 1;
              const y = die.r * 18 + 1;
              const isSelected = selectedDie?.id === die.id;
              let fill = "#22c55e"; // Pass green
              if (die.isDefective) {
                fill = DEFECT_COLORS[die.defectCategory] || "#ef4444";
              }
              const opacity = die.dimmed ? 0.12 : 1;

              return (
                <rect
                  key={die.id}
                  x={x}
                  y={y}
                  width="16"
                  height="16"
                  rx="1.5"
                  fill={fill}
                  opacity={opacity}
                  stroke={isSelected ? "#ffffff" : "#0d1424"}
                  strokeWidth={isSelected ? "2" : "0.75"}
                  className={`wafer-die ${die.isDefective ? "die-defect" : "die-pass"} ${isSelected ? "die-selected" : ""}`}
                  onClick={() => setSelectedDie(die)}
                >
                  <title>
                    {`Die (${die.c}, ${die.r}) [${die.zone}]: ${die.isDefective ? die.defectCategory : "PASS"}`}
                  </title>
                </rect>
              );
            })}
          </svg>

          {/* Wafer Legend */}
          <div className="wafer-legend">
            <div className="legend-item">
              <span className="legend-swatch pass" />
              <span>Pass ({totalPassing})</span>
            </div>
            {Object.entries(DEFECT_COLORS).map(([cat, color]) => (
              <div key={cat} className="legend-item">
                <span className="legend-swatch" style={{ background: color }} />
                <span>{cat.replace(" defect", "").replace(" failure", "")}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Die Inspection Sidebar */}
        <div className="die-inspector-pane">
          {selectedDie ? (
            <div className="die-details-card">
              <div className="die-card-header">
                <div>
                  <span className="die-eyebrow">DIE TELEMETRY · {selectedDie.zone} ZONE</span>
                  <h4>Die Coordinate [{selectedDie.c}, {selectedDie.r}]</h4>
                </div>
                <span className={`die-status-pill ${selectedDie.isDefective ? "status-fail" : "status-pass"}`}>
                  {selectedDie.isDefective ? "DEFECTIVE DIE" : "FUNCTIONAL PASS"}
                </span>
              </div>

              <div className="die-metric-row">
                <div className="die-submetric">
                  <label>Wafer Center Dist</label>
                  <span>{selectedDie.dist} units</span>
                </div>
                <div className="die-submetric">
                  <label>Test Supply (Vdd)</label>
                  <span>{selectedDie.voltage} V</span>
                </div>
                <div className="die-submetric">
                  <label>Quiescent Iddq</label>
                  <span>{selectedDie.leakage_nA} nA</span>
                </div>
              </div>

              {selectedDie.isDefective ? (
                <div className="defect-analysis-box">
                  <div className="defect-header">
                    <span className="defect-dot" style={{ background: DEFECT_COLORS[selectedDie.defectCategory] }} />
                    <strong>{selectedDie.defectCategory}</strong>
                  </div>
                  <p className="defect-notes">{selectedDie.defectDetail}</p>
                  <div className="defect-recommendation">
                    <span className="rec-badge">RECOMMENDED ACTION</span>
                    <p>
                      Inspect SEM/TEM review images for layer pattern bridge or perform probe card scrub alignment verify.
                    </p>
                  </div>
                  <div className="die-actions">
                    <button
                      className="btn btn-primary proceed-btn"
                      onClick={handleProceedToInvestigation}
                    >
                      Proceed to Investigation Center ↗
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pass-analysis-box">
                  <p>Die passed all high-speed functional vector sets, scan chains, and parametric guardbands.</p>
                  <div className="die-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => setSelectedDie(null)}
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="die-placeholder-card">
              <div className="placeholder-icon">◎</div>
              <h4>Die Inspector Ready</h4>
              <p>
                Click any die in the circular wafer map on the left to inspect electrical characterization,
                defect bin classification, and initiate root cause review.
              </p>
              <div className="wafer-quick-stats">
                <div>
                  <label>Dies Tested</label>
                  <strong>{dies.length}</strong>
                </div>
                <div>
                  <label>Map Yield</label>
                  <strong className={Number(simulatedYield) < 92 ? "text-red" : "text-green"}>
                    {simulatedYield}%
                  </strong>
                </div>
                <div>
                  <label>Defect Dies</label>
                  <strong className="text-amber">{totalFailing}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
