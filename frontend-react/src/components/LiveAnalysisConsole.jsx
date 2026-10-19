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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

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
        // Fallback option when live AWS API is unreachable (e.g. offline / CORS)
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

      // Simulated Bedrock brief for local demonstration if alert
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
              {useLiveApi ? "● LIVE AWS API" : "○ LOCAL ENGINE"}
            </span>
          </label>
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
              {useLiveApi ? "execute-api.ap-southeast-2.amazonaws.com" : "Deterministic in-browser quality engine"}
            </code>
          </span>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? "Analyzing Lot via Lambda…" : "Run Quality Analysis ↗"}
          </button>
        </div>
      </form>

      {/* Analysis Output Section */}
      {result && (
        <div className="analysis-result-card">
          <div className="result-header">
            <div>
              <span className="eyebrow">
                ANALYSIS COMPLETE · {result.source === "AWS_LAMBDA" ? "AWS LAMBDA RESPONSE" : "LOCAL DETERMINISTIC"}
              </span>
              <h3>
                {result.lot_id} · {result.product_id}
              </h3>
            </div>
            <span
              className={`badge-status-pill ${result.analysis.status?.toLowerCase().replace("_", "-")}`}
            >
              {result.analysis.status}
            </span>
          </div>

          <div className="result-metrics-grid">
            <div className="result-metric">
              <label>Observed Yield</label>
              <strong>{result.final_test_yield?.toFixed(2) ?? result.analysis.observed_yield_pct}%</strong>
            </div>
            <div className="result-metric">
              <label>Cohort Baseline</label>
              <strong>
                {result.analysis.baseline_yield_pct !== null
                  ? `${result.analysis.baseline_yield_pct}%`
                  : "N/A"}
              </strong>
            </div>
            <div className="result-metric">
              <label>Yield Drop</label>
              <strong
                className={
                  result.analysis.status === "ALERT"
                    ? "text-red"
                    : "text-green"
                }
              >
                {result.analysis.yield_drop_pp !== null || result.analysis.yield_drop_percentage_points !== null
                  ? `${result.analysis.yield_drop_pp ?? result.analysis.yield_drop_percentage_points} pp`
                  : "—"}
              </strong>
            </div>
            <div className="result-metric">
              <label>Failed Dies</label>
              <strong>{result.failed_dies?.toLocaleString()}</strong>
            </div>
          </div>

          <p className="analysis-message-text">{result.analysis.message}</p>

          {/* AI Investigation Brief from Amazon Bedrock */}
          {result.ai_investigation && (
            <div className="bedrock-brief-card">
              <div className="bedrock-header">
                <span className="bedrock-icon">⚡</span>
                <div>
                  <h4>Amazon Bedrock Quality Investigation Brief</h4>
                  <span className="model-chip">
                    Model: {result.ai_investigation.model_id}
                  </span>
                </div>
              </div>
              <p className="bedrock-text">{result.ai_investigation.summary}</p>
              <div className="bedrock-disclaimer">
                <strong>ENGINEERING DISCLAIMER:</strong>{" "}
                {result.ai_investigation.disclaimer}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
