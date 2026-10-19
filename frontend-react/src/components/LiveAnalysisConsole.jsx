import React, { useState } from "react";
import { analyzeLotApi } from "../services/api";
import { BENCHMARK_LOTS, calculateLotAnalysis } from "../data/benchmarkLots";

export default function LiveAnalysisConsole({ onLotAnalyzed }) {
  const [lotId, setLotId] = useState("LOT-LIVE-001");
  const [productId, setProductId] = useState("CHIP-A");
  const [testedDies, setTestedDies] = useState("10000");
  const [passingDies, setPassingDies] = useState("9150");
  const [processStep, setProcessStep] = useState("Final Test");
  const [equipmentId, setEquipmentId] = useState("TESTER-03");
  const [recipeRevision, setRecipeRevision] = useState("REV-A");
  const [cohortMode, setCohortMode] = useState("cohort"); // "cohort" or "none"
  const [useLiveApi, setUseLiveApi] = useState(true);
  const [loadedFileName, setLoadedFileName] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Quick preset loader
  const handleLoadPreset = (type) => {
    setError(null);
    if (type === "EXCURSION") {
      setLotId(`LOT-EXCURSION-${Math.floor(1000 + Math.random() * 9000)}`);
      setProductId("CHIP-A");
      setTestedDies("10000");
      setPassingDies("8850");
      setProcessStep("Final Test");
      setEquipmentId("TESTER-03");
      setRecipeRevision("REV-B");
      setLoadedFileName("preset_excursion_run.csv");
    } else if (type === "NOMINAL") {
      setLotId(`LOT-NOMINAL-${Math.floor(1000 + Math.random() * 9000)}`);
      setProductId("CHIP-A");
      setTestedDies("10000");
      setPassingDies("9820");
      setProcessStep("Final Test");
      setEquipmentId("TESTER-01");
      setRecipeRevision("REV-A");
      setLoadedFileName("preset_nominal_baseline.csv");
    } else if (type === "PROBE_RESISTANCE") {
      setLotId(`LOT-PROBE-FAIL-${Math.floor(1000 + Math.random() * 9000)}`);
      setProductId("CHIP-B");
      setTestedDies("10000");
      setPassingDies("8920");
      setProcessStep("Final Test");
      setEquipmentId("TESTER-02");
      setRecipeRevision("REV-C");
      setLoadedFileName("preset_contact_resistance.csv");
    }
  };

  // ATE File Parser (CSV or JSON)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        if (!content || typeof content !== "string") return;

        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(content);
          const target = parsed.lot || parsed;
          if (target.lot_id) setLotId(target.lot_id);
          if (target.product_id) setProductId(target.product_id);
          if (target.tested_dies) setTestedDies(String(target.tested_dies));
          if (target.passing_dies) setPassingDies(String(target.passing_dies));
          if (target.process_step) setProcessStep(target.process_step);
          if (target.equipment_id) setEquipmentId(target.equipment_id);
          if (target.recipe_revision) setRecipeRevision(target.recipe_revision);
          setLoadedFileName(file.name);
        } else {
          // Parse CSV
          const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
          if (lines.length >= 2) {
            const headers = lines[0].toLowerCase().split(",").map((h) => h.trim());
            const values = lines[1].split(",").map((v) => v.trim());
            const row = {};
            headers.forEach((h, idx) => {
              row[h] = values[idx];
            });

            if (row.lot_id) setLotId(row.lot_id);
            if (row.product_id) setProductId(row.product_id);
            if (row.tested_dies) setTestedDies(row.tested_dies);
            if (row.passing_dies) setPassingDies(row.passing_dies);
            if (row.process_step) setProcessStep(row.process_step);
            if (row.equipment_id) setEquipmentId(row.equipment_id);
            if (row.recipe_revision) setRecipeRevision(row.recipe_revision);
            setLoadedFileName(file.name);
          } else {
            setError("CSV file must contain a header line and at least one data row.");
          }
        }
      } catch (err) {
        setError(`Failed to parse ATE file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const tested = Number(testedDies);
    const passing = Number(passingDies);

    if (!Number.isInteger(tested) || tested <= 0) {
      setError("Tested dies must be a positive whole number.");
      return;
    }
    if (!Number.isInteger(passing) || passing < 0 || passing > tested) {
      setError("Passing dies must be an integer between 0 and tested dies.");
      return;
    }

    const lotPayload = {
      lot_id: lotId.trim() || `LOT-${Date.now().toString().slice(-4)}`,
      product_id: productId,
      tested_dies: tested,
      passing_dies: passing,
      process_step: processStep,
      equipment_id: equipmentId,
      recipe_revision: recipeRevision,
    };

    const comparisonLots =
      cohortMode === "cohort"
        ? BENCHMARK_LOTS.filter((l) => l.product_id === productId)
        : [];

    setLoading(true);

    if (useLiveApi) {
      try {
        const liveData = await analyzeLotApi(lotPayload, comparisonLots);
        setResult({
          source: "AWS_LAMBDA",
          lot_id: liveData.lot_id,
          product_id: liveData.product_id,
          final_test_yield: liveData.final_test_yield,
          tested_dies: liveData.tested_dies,
          passing_dies: liveData.passing_dies,
          failed_dies: liveData.failed_dies,
          analysis: liveData.analysis,
          ai_investigation: liveData.ai_investigation,
        });
        if (onLotAnalyzed) {
          onLotAnalyzed(liveData);
        }
      } catch (err) {
        setError(`Live AWS API error: ${err.message}. You can switch to local deterministic mode.`);
      } finally {
        setLoading(false);
      }
    } else {
      // Local deterministic engine
      const localAnalysis = calculateLotAnalysis(
        {
          lot_id: lotPayload.lot_id,
          product_id: lotPayload.product_id,
          yield: Number(((passing / tested) * 100).toFixed(2)),
        },
        cohortMode === "cohort" ? BENCHMARK_LOTS : []
      );

      let localAi = null;
      if (localAnalysis.status === "ALERT") {
        localAi = {
          model_id: "amazon.nova-lite-v1:0 (simulated)",
          summary: `Yield drop of ${localAnalysis.yield_drop_pp} pp observed on ${equipmentId}. Review test socket contact resistance, probe tip planarity, and compare against reference recipe ${recipeRevision}. Validate equipment calibration logs before attributing root cause.`,
          disclaimer:
            "AI-generated investigation guidance only. It does not establish a confirmed root cause.",
        };
      }

      setResult({
        source: "LOCAL_ENGINE",
        lot_id: lotPayload.lot_id,
        product_id: lotPayload.product_id,
        final_test_yield: Number(((passing / tested) * 100).toFixed(2)),
        tested_dies: tested,
        passing_dies: passing,
        failed_dies: tested - passing,
        analysis: localAnalysis,
        ai_investigation: localAi,
      });
      setLoading(false);
    }
  };

  return (
    <div className="live-analysis-panel">
      <div className="panel-heading">
        <div>
          <h2>Lot Quality Analysis Console</h2>
          <p>
            Submit lot measurements to AWS Lambda for deterministic yield
            deviation analysis and Amazon Bedrock AI investigation synthesis.
          </p>
        </div>
        <div className="console-mode-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={useLiveApi}
              onChange={(e) => setUseLiveApi(e.target.checked)}
            />
            <span className={`api-pill ${useLiveApi ? "live" : "local"}`}>
              {useLiveApi ? "● LIVE AWS API (API Gateway + Bedrock)" : "○ LOCAL ENGINE"}
            </span>
          </label>
        </div>
      </div>

      {/* ATE Data Ingestion & Presets Bar */}
      <div className="ate-ingestion-box">
        <div className="ate-drop-header">
          <span className="eyebrow">AUTOMATED TEST EQUIPMENT (ATE) INGESTION</span>
          {loadedFileName && (
            <span className="ate-file-loaded-pill">
              ✓ Loaded: {loadedFileName}
            </span>
          )}
        </div>
        <div className="ate-drop-row">
          <div className="ate-upload-trigger">
            <label className="file-upload-label">
              📁 Upload ATE Test Run (.csv / .json)
              <input
                type="file"
                accept=".csv,.json,text/csv,application/json"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
            </label>
          </div>
          <div className="ate-presets-group">
            <span className="presets-label">Quick Presets:</span>
            <button
              type="button"
              className="ate-preset-btn excursion"
              onClick={() => handleLoadPreset("EXCURSION")}
            >
              ⚡ Excursion (88.5%)
            </button>
            <button
              type="button"
              className="ate-preset-btn nominal"
              onClick={() => handleLoadPreset("NOMINAL")}
            >
              ⚡ Nominal (98.2%)
            </button>
            <button
              type="button"
              className="ate-preset-btn probe"
              onClick={() => handleLoadPreset("PROBE_RESISTANCE")}
            >
              ⚡ Probe Wear (89.2%)
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="analysis-form">
        <div className="form-row-grid">
          <div className="form-field">
            <label>Lot Identifier</label>
            <input
              type="text"
              value={lotId}
              onChange={(e) => setLotId(e.target.value)}
              placeholder="e.g. LOT-FAB1-009"
              required
            />
          </div>

          <div className="form-field">
            <label>Product Family</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="CHIP-A">CHIP-A</option>
              <option value="CHIP-B">CHIP-B</option>
              <option value="CHIP-C">CHIP-C</option>
            </select>
          </div>

          <div className="form-field">
            <label>Tested Dies</label>
            <input
              type="number"
              min="1"
              value={testedDies}
              onChange={(e) => setTestedDies(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label>Passing Dies</label>
            <input
              type="number"
              min="0"
              value={passingDies}
              onChange={(e) => setPassingDies(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label>Process Step</label>
            <select
              value={processStep}
              onChange={(e) => setProcessStep(e.target.value)}
            >
              <option value="Final Test">Final Test</option>
              <option value="Wafer Sort">Wafer Sort</option>
              <option value="Wafer Inspection">Wafer Inspection</option>
            </select>
          </div>

          <div className="form-field">
            <label>Test Equipment</label>
            <select
              value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
            >
              <option value="TESTER-01">TESTER-01</option>
              <option value="TESTER-02">TESTER-02</option>
              <option value="TESTER-03">TESTER-03</option>
              <option value="TESTER-04">TESTER-04</option>
              <option value="TESTER-05">TESTER-05</option>
            </select>
          </div>

          <div className="form-field">
            <label>Recipe Revision</label>
            <input
              type="text"
              value={recipeRevision}
              onChange={(e) => setRecipeRevision(e.target.value)}
            />
          </div>

          <div className="form-field full">
            <label>Comparison Baseline Mode</label>
            <select
              value={cohortMode}
              onChange={(e) => setCohortMode(e.target.value)}
            >
              <option value="cohort">
                Include same-product synthetic benchmark cohort (Derive median
                baseline)
              </option>
              <option value="none">
                No reference lots (Test INSUFFICIENT_DATA code path)
              </option>
            </select>
            <small className="helper">
              Baseline is computed as the median yield of reference lots for the
              same product.
            </small>
          </div>
        </div>

        {error && <div className="error-banner">⚠️ {error}</div>}

        <div className="form-actions-row">
          <span className="api-endpoint-text">
            Endpoint:{" "}
            <code>
              {useLiveApi ? "i81d4puvul.execute-api.ap-southeast-2.amazonaws.com" : "Deterministic in-browser quality engine"}
            </code>
          </span>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? "Analyzing Lot via Lambda & Bedrock…" : "Run Quality Analysis ↗"}
          </button>
        </div>
      </form>

      {/* Analysis Output Section */}
      {result && (
        <div className="analysis-result-card">
          <div className="result-card-header">
            <div>
              <span className="eyebrow">QUALITY EVALUATION COMPLETED</span>
              <h3>
                Analysis Dossier: {result.lot_id} ({result.product_id})
              </h3>
            </div>
            <div className="result-meta-tags">
              <span className={`status-pill ${result.analysis.status.toLowerCase()}`}>
                {result.analysis.status}
              </span>
              <span className="source-pill">
                Source: {result.source}
              </span>
            </div>
          </div>

          <div className="result-stats-grid">
            <div className="res-stat">
              <label>Final Test Yield</label>
              <strong
                className={
                  result.analysis.status === "ALERT" ? "text-red" : "text-green"
                }
              >
                {result.final_test_yield ?? result.analysis.observed_yield_pct}%
              </strong>
            </div>

            <div className="res-stat">
              <label>Cohort Baseline Median</label>
              <strong>
                {result.analysis.baseline_yield_pct !== null &&
                result.analysis.baseline_yield_pct !== undefined
                  ? `${result.analysis.baseline_yield_pct}%`
                  : "N/A"}
              </strong>
            </div>

            <div className="res-stat">
              <label>Yield Deviation</label>
              <strong
                className={
                  Number(result.analysis.yield_drop_pp ?? result.analysis.yield_drop_percentage_points) > 0
                    ? "text-red"
                    : "text-green"
                }
              >
                {result.analysis.yield_drop_pp !== null &&
                result.analysis.yield_drop_pp !== undefined
                  ? `-${result.analysis.yield_drop_pp} pp`
                  : result.analysis.yield_drop_percentage_points !== null &&
                    result.analysis.yield_drop_percentage_points !== undefined
                  ? `-${result.analysis.yield_drop_percentage_points} pp`
                  : "0.00 pp"}
              </strong>
            </div>

            <div className="res-stat">
              <label>Evaluated Dies (Pass / Fail)</label>
              <span className="mono">
                {result.passing_dies.toLocaleString()} /{" "}
                {result.failed_dies.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="result-message-box">
            <strong>Engine Determination:</strong> {result.analysis.message}
          </div>

          {/* AI Investigation Guidance */}
          {result.ai_investigation && (
            <div className="ai-brief-card">
              <div className="ai-brief-header">
                <span className="ai-badge">🤖 AMAZON BEDROCK NOVA</span>
                <span className="mono text-muted">
                  Model: {result.ai_investigation.model_id}
                </span>
              </div>
              <div className="ai-brief-body">
                <pre className="ai-text">
                  {result.ai_investigation.summary}
                </pre>
              </div>
              <div className="ai-brief-footer">
                <small className="muted">
                  ⚠️ {result.ai_investigation.disclaimer}
                </small>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
