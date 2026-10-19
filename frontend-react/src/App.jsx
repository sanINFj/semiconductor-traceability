import React, { useState, useMemo, useEffect } from "react";
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import "./App.css";

import {
  BENCHMARK_LOTS,
  INITIAL_INVESTIGATIONS,
  BENCHMARK_METRICS_BY_THRESHOLD,
  calculateLotAnalysis,
} from "./data/benchmarkLots";
import { ATE_TOOLS } from "./data/constants";
import { restoreUserSession, signOutUser } from "./services/auth";

import WaferMap from "./components/WaferMap";
import DefectPareto from "./components/DefectPareto";
import YieldGauge from "./components/YieldGauge";
import LiveAnalysisConsole from "./components/LiveAnalysisConsole";
import PreferencesConsole from "./components/PreferencesConsole";
import SignUpConsole from "./components/SignUpConsole";
import EightDReportModal from "./components/EightDReportModal";
import LotComparator from "./components/LotComparator";
import AutoIngestionHub from "./components/AutoIngestionHub";

const navigation = [
  {
    label: "WORKSPACE",
    items: [
      { to: "/overview", icon: "◈", label: "Quality overview" },
      { to: "/ingest", icon: "⚡", label: "Auto-generate from file" },
      { to: "/lots", icon: "▦", label: "Lot explorer" },
      { to: "/compare", icon: "⇋", label: "Lot comparator" },
      { to: "/investigations", icon: "⌕", label: "Investigation center" },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { to: "/process-intelligence", icon: "⌁", label: "Process intelligence" },
      { to: "/model-lab", icon: "⌘", label: "Anomaly model lab" },
    ],
  },
];

function Badge({ status }) {
  const norm = (status || "").toLowerCase().replaceAll("_", "-").replaceAll(" ", "-");
  return <span className={`badge ${norm}`}>{status}</span>;
}

function Header({ userSession, onSignOut, theme, onThemeChange }) {
  const location = useLocation();
  const names = {
    "/overview": "Quality Overview",
    "/ingest": "Automated File Ingestion & Generation",
    "/lots": "Lot Explorer",
    "/compare": "Lot Comparator (Side-by-Side)",
    "/investigations": "Investigation Center",
    "/process-intelligence": "Process & Tool Intelligence",
    "/model-lab": "Anomaly Model Lab",
    "/login": "Authentication & Preferences",
    "/signup": "Create Account & Verify Email",
  };
  const title =
    names[location.pathname] ||
    (location.pathname.startsWith("/lots/") ? "Lot Trace & Inspection" : "Quality Intelligence");

  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span className="brand-pill">WAFERIQ</span>
        <span className="sep">/</span>
        <strong>{title}</strong>
      </div>
      <div className="top-actions">
        <NavLink to="/ingest" className="auto-ingest-topbar-btn">
          ⚡ Auto-Generate from File
        </NavLink>

        <div className="theme-selector-pill">
          <span className="theme-icon">🎨</span>
          <select
            value={theme}
            onChange={(e) => onThemeChange(e.target.value)}
            className="theme-select"
            aria-label="Color Theme"
          >
            <option value="titanium">🌌 Obsidian Titanium</option>
            <option value="sapphire">💎 Sapphire Foundry</option>
            <option value="emerald">🌲 Emerald Silicon</option>
            <option value="nordic-light">☀️ Nordic Cleanroom</option>
          </select>
        </div>

        <div className="banner-tag synthetic-alert-tag">
          <span className="pulse-dot amber" />
          <span>SYNTHETIC BENCHMARK DATA</span>
        </div>
        <span className="region">AWS · ap-southeast-2</span>
        {userSession ? (
          <div className="user-session-chip">
            <span className="user-email">{userSession.email}</span>
            <button className="signout-link" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        ) : (
          <div className="auth-nav-links">
            <NavLink className="account-link" to="/login">
              Sign in ↗
            </NavLink>
            <NavLink className="signup-pill-link" to="/signup">
              Sign up
            </NavLink>
          </div>
        )}
      </div>
    </header>
  );
}

function Layout({ lots, onAddLot, userSession, setUserSession, theme, onThemeChange }) {
  const handleSignOut = () => {
    signOutUser();
    setUserSession(null);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/overview" className="brand">
          <span className="brand-icon">W</span>
          <div className="brand-text">
            <span className="brand-name">
              wafer<span>IQ</span>
            </span>
            <span className="brand-sub">Semiconductor Quality</span>
          </div>
        </NavLink>

        {navigation.map((group) => (
          <section className="nav-group" key={group.label}>
            <div className="eyebrow">{group.label}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-text">{item.label}</span>
              </NavLink>
            ))}
          </section>
        ))}

        <div className="sidebar-bottom">
          <div className="cloud-card">
            <div className="cloud-card-header">
              <span className="online-dot" />
              <strong>AWS CLOUD CONNECTED</strong>
            </div>
            <p>
              Connected to API Gateway, Bedrock LLM, DynamoDB, and SNS topics.
            </p>
            <div className="disclaimer-chip">BENCHMARK EVALUATION MODE</div>
          </div>
          <div className="version">WAFERIQ v0.2.0 · CORE QUALITY ENGINE</div>
        </div>
      </aside>

      <main className="main-area">
        <Header
          userSession={userSession}
          onSignOut={handleSignOut}
          theme={theme}
          onThemeChange={onThemeChange}
        />
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<Overview lots={lots} onAddLot={onAddLot} />} />
            <Route path="/ingest" element={<AutoIngestionHub lots={lots} onAddLot={onAddLot} />} />
            <Route path="/lots" element={<Lots lots={lots} onAddLot={onAddLot} />} />
            <Route path="/lots/:lotId" element={<LotDetails lots={lots} />} />
            <Route path="/compare" element={<CompareView lots={lots} />} />
            <Route path="/investigations" element={<Investigations lots={lots} />} />
            <Route path="/process-intelligence" element={<ProcessIntelligence lots={lots} />} />
            <Route path="/model-lab" element={<ModelLab lots={lots} />} />
            <Route
              path="/login"
              element={
                <AuthPage
                  userSession={userSession}
                  onAuthStateChange={setUserSession}
                />
              }
            />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
          <footer className="footer">
            <div className="footer-left">
              <span>WaferIQ · AI-Enhanced Semiconductor Traceability & Yield Intelligence</span>
              <span className="footer-badge">SYNTHETIC EVALUATION BENCHMARK</span>
            </div>
            <div className="footer-right">
              <span>Always validate findings against equipment logs, metrology, and physical failure analysis (PFA).</span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

function PageIntro({ eyebrow, title, description, action }) {
  return (
    <div className="page-intro">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="page-action">{action}</div>}
    </div>
  );
}

function Metric({ label, value, note, accent = "cyan", icon = null }) {
  return (
    <div className={`metric accent-${accent}`}>
      <div className="metric-head">
        <span className="metric-label">{label}</span>
        {icon && <span className="metric-icon">{icon}</span>}
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-note">{note}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VIEW 1: OVERVIEW
// ---------------------------------------------------------------------------
function Overview({ lots, onAddLot }) {
  const navigate = useNavigate();
  const [selectedProduct, setSelectedProduct] = useState("ALL");
  const [showLiveConsole, setShowLiveConsole] = useState(false);

  const filteredLots = useMemo(() => {
    if (selectedProduct === "ALL") return lots;
    return lots.filter((l) => l.product_id === selectedProduct);
  }, [lots, selectedProduct]);

  const alertLots = useMemo(() => {
    return filteredLots.filter((l) => l.status === "ALERT");
  }, [filteredLots]);

  const normalLots = useMemo(() => {
    return filteredLots.filter((l) => l.status === "NORMAL");
  }, [filteredLots]);

  const totalFailed = useMemo(() => {
    return filteredLots.reduce((acc, l) => acc + l.failed_dies, 0);
  }, [filteredLots]);

  const medianYield = useMemo(() => {
    const yields = [...filteredLots.map((l) => l.yield)].sort((a, b) => a - b);
    const mid = Math.floor(yields.length / 2);
    return yields.length
      ? (yields.length % 2 !== 0 ? yields[mid] : (yields[mid - 1] + yields[mid]) / 2).toFixed(1)
      : "—";
  }, [filteredLots]);

  return (
    <>
      <PageIntro
        eyebrow="FAB OPERATIONS / YIELD HEALTH"
        title={
          <>
            Yield Intelligence <span className="gradient">Overview</span>
          </>
        }
        description="Real-time monitoring of semiconductor manufacturing lots, baseline yield deviation tracking, and active quality excursion management."
        action={
          <div className="intro-button-group">
            <button
              className="btn btn-primary"
              onClick={() => setShowLiveConsole(!showLiveConsole)}
            >
              {showLiveConsole ? "Hide Analysis Console" : "⚡ Live Analysis Console"}
            </button>
            <button className="btn btn-secondary" onClick={() => navigate("/lots")}>
              Explore Lots ({lots.length}) ↗
            </button>
          </div>
        }
      />

      {showLiveConsole && (
        <section className="panel mb-6">
          <LiveAnalysisConsole
            onLotAnalyzed={(newLotData) => {
              if (onAddLot) onAddLot(newLotData);
            }}
          />
        </section>
      )}

      <div className="filter-pill-bar">
        <span className="filter-label">Product Cohort:</span>
        {["ALL", "CHIP-A", "CHIP-B", "CHIP-C"].map((prod) => (
          <button
            key={prod}
            className={`filter-pill ${selectedProduct === prod ? "active" : ""}`}
            onClick={() => setSelectedProduct(prod)}
          >
            {prod} ({prod === "ALL" ? lots.length : lots.filter((l) => l.product_id === prod).length})
          </button>
        ))}
      </div>

      <div className="metrics-grid">
        <Metric
          label="EVALUATED LOTS"
          value={filteredLots.length.toString().padStart(2, "0")}
          note={`Synthetic benchmark (${selectedProduct})`}
          accent="cyan"
          icon="▦"
        />
        <Metric
          label="ACTIVE YIELD ALERTS"
          value={alertLots.length.toString().padStart(2, "0")}
          note={`Drop ≥ 5.0 pp vs cohort baseline`}
          accent="red"
          icon="⚠️"
        />
        <Metric
          label="NOMINAL LOTS"
          value={normalLots.length.toString().padStart(2, "0")}
          note={`${((normalLots.length / (filteredLots.length || 1)) * 100).toFixed(0)}% passing tolerance`}
          accent="green"
          icon="✓"
        />
        <Metric
          label="MEDIAN YIELD"
          value={`${medianYield}%`}
          note={`Total scrap: ${totalFailed.toLocaleString()} dies`}
          accent="purple"
          icon="◎"
        />
      </div>

      <div className="two-column">
        {/* Active Excursion Queue */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Active Yield Excursions</h2>
              <p>Lots flagged for exceeding the 5.0 percentage-point deviation threshold</p>
            </div>
            <span className="badge alert">{alertLots.length} Flagged</span>
          </div>

          {alertLots.length === 0 ? (
            <div className="empty-state">No yield alerts detected in this cohort.</div>
          ) : (
            <div className="excursion-list">
              {alertLots.map((lot) => (
                <div key={lot.lot_id} className="excursion-card">
                  <div className="excursion-main">
                    <div className="excursion-title-row">
                      <NavLink className="lot-link-bold" to={`/lots/${lot.lot_id}`}>
                        {lot.lot_id}
                      </NavLink>
                      <span className="product-tag">{lot.product_id}</span>
                      <span className="equipment-tag">{lot.equipment_id}</span>
                      <span className="excursion-drop">
                        Drop: -{Math.abs(lot.yield_drop_pp).toFixed(1)} pp
                      </span>
                    </div>
                    <div className="excursion-meta">
                      <span>Observed: <strong>{lot.yield}%</strong></span>
                      <span>Baseline: {lot.baseline}%</span>
                      <span>Failed Dies: <strong>{lot.failed_dies.toLocaleString()}</strong> ({((lot.failed_dies / lot.tested_dies) * 100).toFixed(1)}%)</span>
                      <span>Wafer: {lot.wafer_lot_id}</span>
                    </div>
                    <p className="excursion-note">{lot.investigation_note}</p>
                  </div>
                  <div className="excursion-actions">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => navigate(`/lots/${lot.lot_id}`)}
                    >
                      Inspect Wafer ↗
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() =>
                        navigate("/investigations", { state: { focusLotId: lot.lot_id } })
                      }
                    >
                      Open Case
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quality Distribution & Equipment Status */}
        <div className="side-column">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Cohort Yield Health</h2>
                <p>Status breakdown for {selectedProduct}</p>
              </div>
            </div>

            <div className="status-bars-group">
              <div className="status-row">
                <span className="status-label">Alert (Excursions)</span>
                <div className="bar-track">
                  <div
                    className="bar-fill alert"
                    style={{ width: `${(alertLots.length / filteredLots.length) * 100}%` }}
                  />
                </div>
                <strong className="status-count text-red">{alertLots.length}</strong>
              </div>
              <div className="status-row">
                <span className="status-label">Nominal (Passing)</span>
                <div className="bar-track">
                  <div
                    className="bar-fill normal"
                    style={{ width: `${(normalLots.length / filteredLots.length) * 100}%` }}
                  />
                </div>
                <strong className="status-count text-green">{normalLots.length}</strong>
              </div>
            </div>

            <div className="notice info-notice">
              <strong>Evaluation Benchmark:</strong> Ground truth contains 6 injected yield drop anomalies across 60 lots. At 5.0 pp threshold, precision is 1.00 and recall is 1.00.
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Tester Allocation</h2>
                <p>Lot counts across final test tools</p>
              </div>
            </div>
            <div className="equipment-mini-grid">
              {ATE_TOOLS.map((eq) => {
                const count = filteredLots.filter((l) => l.equipment_id === eq).length;
                const eqAlerts = filteredLots.filter((l) => l.equipment_id === eq && l.status === "ALERT").length;
                return (
                  <div key={eq} className="equipment-chip">
                    <span className="eq-name">{eq}</span>
                    <span className="eq-count">{count} lots</span>
                    {eqAlerts > 0 && <span className="eq-alert-dot">{eqAlerts} alert</span>}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* Yield Distribution Trend */}
      <section className="panel trend-panel">
        <div className="panel-heading">
          <div>
            <h2>Yield Distribution Snapshot</h2>
            <p>Chronological final-test yields across benchmark manufacturing lots</p>
          </div>
          <span className="subtle-tag">{lots.length}-LOT SEQUENCE</span>
        </div>

        <div className="yield-snapshot-scroll">
          <div className="yield-snapshot">
            {filteredLots.map((l) => {
              const isAlert = l.status === "ALERT";
              return (
                <div
                  key={l.lot_id}
                  className="yield-item"
                  onClick={() => navigate(`/lots/${l.lot_id}`)}
                  title={`${l.lot_id} (${l.product_id}): ${l.yield}% | Baseline: ${l.baseline}%`}
                >
                  <div className={`yield-number ${isAlert ? "text-red font-bold" : ""}`}>
                    {l.yield}%
                  </div>
                  <div className="yield-track">
                    <div
                      className={`yield-column ${isAlert ? "alert" : "normal"}`}
                      style={{ height: `${((l.yield - 70) / 30) * 100}%` }}
                    />
                  </div>
                  <div className={`yield-label ${isAlert ? "alert-label" : ""}`}>{l.lot_id.slice(-4)}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="yield-axis-label">
          <span>← Older Test Runs</span>
          <span>Click any bar to inspect silicon wafer and defect breakdown</span>
          <span>Recent Test Runs →</span>
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// VIEW 2: LOT EXPLORER
// ---------------------------------------------------------------------------
function Lots({ lots, onAddLot }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [productFilter, setProductFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [equipmentFilter, setEquipmentFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState("lot_id");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const [showLiveConsole, setShowLiveConsole] = useState(false);
  const pageSize = 12;

  const equipmentOptions = useMemo(() => {
    return Array.from(new Set(lots.map((l) => l.equipment_id))).sort();
  }, [lots]);

  const filtered = useMemo(() => {
    return lots.filter((l) => {
      if (productFilter !== "ALL" && l.product_id !== productFilter) return false;
      if (statusFilter !== "ALL" && l.status !== statusFilter) return false;
      if (equipmentFilter !== "ALL" && l.equipment_id !== equipmentFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const str = `${l.lot_id} ${l.product_id} ${l.wafer_lot_id} ${l.equipment_id} ${l.plant_id}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      let va = a[sortKey];
      let vb = b[sortKey];
      if (sortKey === "yield_drop_pp") {
        va = a.yield_drop_pp ?? -999;
        vb = b.yield_drop_pp ?? -999;
      }
      if (typeof va === "string") {
        return sortOrder === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortOrder === "asc" ? (va ?? 0) - (vb ?? 0) : (vb ?? 0) - (va ?? 0);
    });
  }, [lots, productFilter, statusFilter, equipmentFilter, query, sortKey, sortOrder]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pagedLots = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  return (
    <>
      <PageIntro
        eyebrow="MANUFACTURING TRACEABILITY"
        title="Lot Explorer"
        description="Filter, search, and inspect semiconductor lots evaluated across wafer fab, wafer sort, and final test stages."
        action={
          <div className="intro-button-group">
            <button
              className="btn btn-primary"
              onClick={() => setShowLiveConsole(!showLiveConsole)}
            >
              {showLiveConsole ? "Hide Analysis Console" : "+ Analyze New Lot"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate("/compare")}
            >
              ⇋ Compare Lots
            </button>
          </div>
        }
      />

      {showLiveConsole && (
        <section className="panel mb-6">
          <LiveAnalysisConsole
            onLotAnalyzed={(newLotData) => {
              if (onAddLot) onAddLot(newLotData);
            }}
          />
        </section>
      )}

      <section className="panel">
        <div className="toolbar-complex">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              aria-label="Search lots"
              placeholder="Search Lot ID, Wafer Lot, Equipment, or Fab…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
            {query && (
              <button className="clear-btn" onClick={() => setQuery("")}>
                ×
              </button>
            )}
          </div>

          <div className="filter-group">
            <select
              aria-label="Product filter"
              value={productFilter}
              onChange={(e) => {
                setProductFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Products</option>
              <option value="CHIP-A">CHIP-A</option>
              <option value="CHIP-B">CHIP-B</option>
              <option value="CHIP-C">CHIP-C</option>
            </select>

            <select
              aria-label="Status filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ALERT">Yield Alert (Excursions)</option>
              <option value="NORMAL">Normal Yield</option>
            </select>

            <select
              aria-label="Equipment filter"
              value={equipmentFilter}
              onChange={(e) => {
                setEquipmentFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Equipment</option>
              {equipmentOptions.map((eq) => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-meta-bar">
          <span>
            Showing <strong>{filtered.length}</strong> matching semiconductor lots
          </span>
          <span className="subtle-tag">SYNTHETIC BENCHMARK DATA</span>
        </div>

        <div className="table-scroll">
          <table className="interactive-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("lot_id")} className="sortable">
                  Lot ID {sortKey === "lot_id" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                </th>
                <th>Product</th>
                <th>Wafer Lot</th>
                <th>Fab Plant</th>
                <th>Equipment</th>
                <th onClick={() => handleSort("yield")} className="sortable">
                  Yield % {sortKey === "yield" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                </th>
                <th>Cohort Baseline</th>
                <th onClick={() => handleSort("yield_drop_pp")} className="sortable">
                  Deviation (pp) {sortKey === "yield_drop_pp" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("tested_dies")} className="sortable">
                  Tested Dies {sortKey === "tested_dies" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                </th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedLots.map((l) => {
                const isAlert = l.status === "ALERT";
                return (
                  <tr key={l.lot_id} className={isAlert ? "row-alert" : ""}>
                    <td>
                      <NavLink className="lot-link-cell" to={`/lots/${l.lot_id}`}>
                        <strong>{l.lot_id}</strong>
                      </NavLink>
                    </td>
                    <td><span className="product-badge">{l.product_id}</span></td>
                    <td className="mono">{l.wafer_lot_id}</td>
                    <td>{l.plant_id}</td>
                    <td><span className="equipment-cell">{l.equipment_id}</span></td>
                    <td>
                      <strong className={isAlert ? "text-red" : "text-cyan"}>
                        {l.yield}%
                      </strong>
                    </td>
                    <td>{l.baseline}%</td>
                    <td>
                      <span className={`deviation-pill ${isAlert ? "dev-alert" : Number(l.yield_drop_pp) <= 0 ? "dev-positive" : "dev-neutral"}`}>
                        {Number(l.yield_drop_pp) > 0 ? `-${l.yield_drop_pp}` : `+${Math.abs(l.yield_drop_pp)}`} pp
                      </span>
                    </td>
                    <td className="mono">{l.tested_dies.toLocaleString()}</td>
                    <td><Badge status={l.status} /></td>
                    <td>
                      <button
                        className="btn btn-xs btn-secondary"
                        onClick={() => navigate(`/lots/${l.lot_id}`)}
                      >
                        Inspect ↗
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="empty-state">No semiconductor lots match your filter criteria.</div>
        )}

        {totalPages > 1 && (
          <div className="pagination-bar">
            <button
              className="btn btn-sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Previous
            </button>
            <span className="page-indicator">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
            <button
              className="btn btn-sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next →
            </button>
          </div>
        )}

        <div className="notice">
          <strong>Dataset Note:</strong> All lots represent synthetic manufacturing data generated for deterministic algorithm validation.
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// VIEW 3: LOT DETAILS, WAFER MAP & 8D REPORT
// ---------------------------------------------------------------------------
function LotDetails({ lots }) {
  const { lotId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("wafer-map"); // wafer-map, defects, cohort
  const [show8DModal, setShow8DModal] = useState(false);

  const lot = useMemo(() => {
    return lots.find((l) => l.lot_id.toLowerCase() === lotId?.toLowerCase());
  }, [lots, lotId]);

  // Unconditionally call useMemo for comparison cohort lots
  const cohortLots = useMemo(() => {
    if (!lot) return [];
    return lots.filter((l) => l.product_id === lot.product_id && l.lot_id !== lot.lot_id);
  }, [lots, lot]);

  if (!lot) {
    return (
      <div className="lot-not-found">
        <PageIntro
          eyebrow="LOT NOT FOUND"
          title={`Lot ${lotId}`}
          description="The requested lot record could not be found in the benchmark dataset."
          action={
            <NavLink className="btn btn-primary" to="/lots">
              ← Return to Lot Explorer
            </NavLink>
          }
        />
      </div>
    );
  }

  const scrapRate = ((lot.failed_dies / lot.tested_dies) * 100).toFixed(2);

  return (
    <>
      <div className="lot-header-navigation">
        <NavLink to="/lots" className="back-link">
          ← Back to Lot Explorer
        </NavLink>
        <div className="lot-cycle-actions">
          <span className="lot-timestamp">Recorded: {new Date(lot.event_timestamp).toLocaleDateString()}</span>
          <span className="subtle-tag synthetic-tag">SYNTHETIC BENCHMARK RECORD</span>
        </div>
      </div>

      <PageIntro
        eyebrow={`SEMICONDUCTOR LOT TRACE · ${lot.plant_id}`}
        title={
          <div className="lot-title-wrap">
            <span>{lot.lot_id}</span>
            <Badge status={lot.status} />
          </div>
        }
        description={`Product ${lot.product_id} · ${lot.process_step} on ${lot.equipment_id} (${lot.recipe_revision}) · Wafer Lot ${lot.wafer_lot_id}`}
        action={
          <div className="intro-button-group">
            <button
              className="btn btn-secondary"
              onClick={() => setShow8DModal(true)}
            >
              📄 8D Quality Report
            </button>
            {lot.status === "ALERT" && (
              <button
                className="btn btn-primary"
                onClick={() =>
                  navigate("/investigations", { state: { focusLotId: lot.lot_id } })
                }
              >
                Open Investigation ↗
              </button>
            )}
          </div>
        }
      />

      {/* 8D Incident Report Modal */}
      {show8DModal && (
        <EightDReportModal lot={lot} onClose={() => setShow8DModal(false)} />
      )}

      {/* Process History Stepper */}
      <section className="panel process-stepper-panel">
        <div className="stepper-title">Manufacturing Process Flow Progression:</div>
        <div className="stepper-track">
          {[
            { step: "Wafer Fabrication", plant: lot.plant_id, status: "completed" },
            { step: "Wafer Inspection", plant: lot.plant_id, status: "completed" },
            { step: "Wafer Sort", plant: lot.plant_id, status: "completed" },
            { step: "Assembly / Packaging", plant: "SUB-01", status: "completed" },
            { step: "Final Test (Active)", plant: lot.equipment_id, status: "active" },
          ].map((s, idx) => (
            <div key={s.step} className={`step-node ${s.status}`}>
              <div className="step-circle">{idx + 1}</div>
              <div className="step-text">
                <strong>{s.step}</strong>
                <span>{s.plant}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Yield Deviation Gauge */}
      <YieldGauge
        lotYield={lot.yield}
        baselineYield={lot.baseline}
        thresholdPp={5.0}
        status={lot.status}
      />

      {/* High-Level Fab Metrics */}
      <div className="metrics-grid">
        <Metric
          label="TESTED DIES"
          value={lot.tested_dies.toLocaleString()}
          note={`${lot.wafer_count} wafers (${lot.wafer_diameter_mm}mm)`}
          accent="cyan"
        />
        <Metric
          label="PASSING DIES"
          value={lot.passing_dies.toLocaleString()}
          note={`Functional units shipped`}
          accent="green"
        />
        <Metric
          label="FAILED DIES (SCRAP)"
          value={lot.failed_dies.toLocaleString()}
          note={`${scrapRate}% die loss rate`}
          accent={lot.status === "ALERT" ? "red" : "amber"}
        />
        <Metric
          label="COHORT BASELINE"
          value={`${lot.baseline}%`}
          note={`Median of ${cohortLots.length} comparison lots`}
          accent="purple"
        />
      </div>

      {/* Interactive Tabs: Wafer Map / Defect Pareto / Cohort Table */}
      <div className="lot-tabs-container">
        <div className="lot-tabs-header">
          <button
            className={`tab-btn ${activeTab === "wafer-map" ? "active" : ""}`}
            onClick={() => setActiveTab("wafer-map")}
          >
            ◎ Visual Wafer Map Inspector
          </button>
          <button
            className={`tab-btn ${activeTab === "defects" ? "active" : ""}`}
            onClick={() => setActiveTab("defects")}
          >
            📊 Defect Pareto Breakdown
          </button>
          <button
            className={`tab-btn ${activeTab === "cohort" ? "active" : ""}`}
            onClick={() => setActiveTab("cohort")}
          >
            ▦ Comparison Cohort Lots ({cohortLots.length})
          </button>
        </div>

        <div className="tab-content">
          {activeTab === "wafer-map" && (
            <section className="panel wafer-panel">
              <WaferMap lot={lot} />
            </section>
          )}

          {activeTab === "defects" && (
            <section className="panel">
              <DefectPareto defectCounts={lot.defect_counts} />
              <div className="notice mt-4">
                <strong>Failure Mechanism Note:</strong> {lot.investigation_note}
              </div>
            </section>
          )}

          {activeTab === "cohort" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Same-Product Comparison Cohort ({lot.product_id})</h2>
                  <p>
                    Reference lots used to calculate the cohort median baseline ({lot.baseline}%).
                    Target lot is strictly excluded from its own baseline calculation.
                  </p>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Lot ID</th>
                      <th>Wafer Lot</th>
                      <th>Yield %</th>
                      <th>Tested Dies</th>
                      <th>Equipment</th>
                      <th>Recipe</th>
                      <th>Deviation vs Baseline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cohortLots.map((ref) => {
                      const diff = (ref.yield - lot.baseline).toFixed(2);
                      return (
                        <tr key={ref.lot_id}>
                          <td>
                            <NavLink className="lot-link-cell" to={`/lots/${ref.lot_id}`}>
                              {ref.lot_id}
                            </NavLink>
                          </td>
                          <td className="mono">{ref.wafer_lot_id}</td>
                          <td>
                            <strong>{ref.yield}%</strong>
                          </td>
                          <td className="mono">{ref.tested_dies.toLocaleString()}</td>
                          <td>{ref.equipment_id}</td>
                          <td>{ref.recipe_revision}</td>
                          <td>
                            <span className={`deviation-pill ${Number(diff) >= 0 ? "dev-positive" : "dev-neutral"}`}>
                              {Number(diff) >= 0 ? `+${diff}` : diff} pp
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// VIEW 4: LOT COMPARATOR VIEW (/compare)
// ---------------------------------------------------------------------------
function CompareView({ lots }) {
  return (
    <>
      <PageIntro
        eyebrow="CROSS-LOT ANALYSIS"
        title="Side-by-Side Lot Comparator"
        description="Isolate process shifts and defect clusters by comparing yield excursions against reference lots."
      />
      <LotComparator lots={lots} />
    </>
  );
}

// ---------------------------------------------------------------------------
// VIEW 5: INVESTIGATION CENTER WITH AI BEDROCK BRIEF & 8D EXPORT
// ---------------------------------------------------------------------------
function CaseEditor({ initialCase, onSave, onStatusChange, onOpen8D }) {
  const [hypothesis, setHypothesis] = useState(initialCase?.hypothesis || "");
  const [evidence, setEvidence] = useState(initialCase?.supporting_evidence || "");
  const [action, setAction] = useState(initialCase?.corrective_action || "");
  const [notes, setNotes] = useState(initialCase?.verification_notes || "");
  const [recurred, setRecurred] = useState(initialCase?.issue_recurred ?? false);

  const handleSave = () => {
    onSave({
      hypothesis,
      supporting_evidence: evidence,
      corrective_action: action,
      verification_notes: notes,
      issue_recurred: recurred,
    });
  };

  const handleClose = () => {
    if (!action.trim()) {
      alert("A corrective action must be documented before closing the investigation.");
      return;
    }
    onStatusChange("CLOSED", {
      hypothesis,
      supporting_evidence: evidence,
      corrective_action: action,
      verification_notes: notes,
      issue_recurred: recurred,
    });
  };

  return (
    <section className="panel case-detail-panel">
      <div className="case-header">
        <div>
          <div className="case-eyebrow">CASE FILE · {initialCase.alert_id}</div>
          <h2>Investigation for Lot {initialCase.lot_id}</h2>
          <p className="muted">
            Product: <strong>{initialCase.product_id}</strong> · Tool: <strong>{initialCase.equipment_id}</strong> · Opened: {new Date(initialCase.opened_at).toLocaleDateString()}
          </p>
        </div>
        <div className="case-header-actions">
          <button className="btn btn-sm btn-secondary" onClick={() => onOpen8D(initialCase.lot_id)}>
            📄 8D Report
          </button>
          <span className={`status-pill-lg ${initialCase.status.toLowerCase()}`}>
            STATUS: {initialCase.status}
          </span>
        </div>
      </div>

      {/* State Machine Stepper */}
      <div className="investigation-stages">
        <div className={`stage-step ${initialCase.status === "OPEN" ? "active" : "done"}`}>
          <div className="step-num">1</div>
          <span>OPEN (TRIAGE)</span>
        </div>
        <div className="stage-connector" />
        <div className={`stage-step ${initialCase.status === "INVESTIGATING" ? "active" : initialCase.status === "CLOSED" ? "done" : ""}`}>
          <div className="step-num">2</div>
          <span>INVESTIGATING (EVIDENCE)</span>
        </div>
        <div className="stage-connector" />
        <div className={`stage-step ${initialCase.status === "CLOSED" ? "done active" : ""}`}>
          <div className="step-num">3</div>
          <span>CLOSED (VERIFIED)</span>
        </div>
      </div>

      {/* AI Investigation Guidance Brief */}
      <div className="bedrock-brief-card mb-5">
        <div className="bedrock-header">
          <span className="bedrock-icon">⚡</span>
          <div>
            <h4>Amazon Bedrock AI Investigation Guidance</h4>
            <span className="model-chip">Model: amazon.nova-lite-v1:0</span>
          </div>
        </div>
        <p className="bedrock-text">
          Review tester {initialCase.equipment_id} pin alignment and contact resistance data. Cross-reference wafer sort metrology to verify if defect mechanism initiated at front-end lithography or during package test. Distinguish symptoms from verified physical cause.
        </p>
        <div className="bedrock-disclaimer">
          <strong>NON-CAUSAL DISCLAIMER:</strong> AI guidance is advisory and does not establish a confirmed physical root cause. Physical failure analysis (PFA) is required.
        </div>
      </div>

      {/* Form Workspace */}
      <div className="case-form-grid">
        <div className="form-field full">
          <label>Root Cause Hypothesis</label>
          <textarea
            rows="3"
            value={hypothesis}
            onChange={(e) => setHypothesis(e.target.value)}
            placeholder="Enter engineering hypothesis (e.g. Probe card scrub marks, thermal drift, recipe variance)..."
          />
          <small className="helper">Distinguish observed symptoms from unverified physical root cause.</small>
        </div>

        <div className="form-field full">
          <label>Supporting Evidence & Diagnostics</label>
          <textarea
            rows="3"
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="Attach metrology data, wafer map spatial signatures, tester logs, or SEM photos..."
          />
          <small className="helper">Evidence must be verified before concluding physical root cause.</small>
        </div>

        <div className="form-field full">
          <label>Corrective & Preventive Action (CAPA)</label>
          <textarea
            rows="3"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Document maintenance action (e.g. chamber clean, probe planarization, recipe revert)..."
          />
        </div>

        <div className="form-field half">
          <label>Post-Action Verification Notes</label>
          <textarea
            rows="2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Test results from subsequent lots or verification wafers..."
          />
        </div>

        <div className="form-field half">
          <label>Recurrence Monitored?</label>
          <div className="radio-toggle-group">
            <label className={`toggle-pill ${!recurred ? "active" : ""}`}>
              <input
                type="radio"
                name="recurred"
                checked={!recurred}
                onChange={() => setRecurred(false)}
              />
              No Recurrence (Resolved)
            </label>
            <label className={`toggle-pill ${recurred ? "active-alert" : ""}`}>
              <input
                type="radio"
                name="recurred"
                checked={recurred}
                onChange={() => setRecurred(true)}
              />
              Issue Recurred (Requires Rework)
            </label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="case-actions-bar">
        {initialCase.status === "OPEN" && (
          <button
            className="btn btn-primary"
            onClick={() => onStatusChange("INVESTIGATING", { hypothesis, supporting_evidence: evidence, corrective_action: action, verification_notes: notes, issue_recurred: recurred })}
          >
            Start Investigation →
          </button>
        )}
        {initialCase.status === "INVESTIGATING" && (
          <>
            <button className="btn btn-secondary" onClick={handleSave}>
              Save Findings
            </button>
            <button className="btn btn-primary" onClick={handleClose}>
              Verify & Close Investigation ✓
            </button>
          </>
        )}
        {initialCase.status === "CLOSED" && (
          <button
            className="btn btn-secondary"
            onClick={() => onStatusChange("INVESTIGATING", { hypothesis, supporting_evidence: evidence, corrective_action: action, verification_notes: notes, issue_recurred: recurred })}
          >
            Re-open Investigation ↺
          </button>
        )}
      </div>

      <div className="notice mt-4">
        <strong>Backend Protocol Compliance:</strong> Conforms to <code>QualityInvestigation</code> state machine rules from <code>backend/quality_engine/investigation.py</code>.
      </div>
    </section>
  );
}

function Investigations({ lots }) {
  const location = useLocation();
  const [investigations, setInvestigations] = useState(INITIAL_INVESTIGATIONS);
  const [selectedAlertId, setSelectedAlertId] = useState(
    location.state?.focusLotId
      ? investigations.find((i) => i.lot_id === location.state.focusLotId)?.alert_id || investigations[0].alert_id
      : investigations[0].alert_id
  );
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [reportLot, setReportLot] = useState(null);

  const selectedCase = useMemo(() => {
    return investigations.find((i) => i.alert_id === selectedAlertId) || investigations[0];
  }, [investigations, selectedAlertId]);

  const handleUpdate = (updatedFields) => {
    setInvestigations((prev) =>
      prev.map((item) => (item.alert_id === selectedAlertId ? { ...item, ...updatedFields } : item))
    );
  };

  const handleStatusChange = (newStatus, updatedFields) => {
    setInvestigations((prev) =>
      prev.map((item) =>
        item.alert_id === selectedAlertId ? { ...item, ...updatedFields, status: newStatus } : item
      )
    );
  };

  const handleOpen8D = (targetLotId) => {
    const found = lots.find((l) => l.lot_id === targetLotId);
    if (found) setReportLot(found);
  };

  const filteredCases = useMemo(() => {
    if (statusFilter === "ALL") return investigations;
    return investigations.filter((i) => i.status === statusFilter);
  }, [investigations, statusFilter]);

  return (
    <>
      <PageIntro
        eyebrow="QUALITY WORKFLOW / CAPA"
        title="Investigation Center"
        description="Structured engineering triage and root-cause verification for yield excursions, conforming to standard semiconductor Corrective & Preventive Action (CAPA) protocols."
      />

      {reportLot && (
        <EightDReportModal lot={reportLot} onClose={() => setReportLot(null)} />
      )}

      <div className="investigations-layout">
        {/* Cases Sidebar */}
        <div className="cases-sidebar">
          <div className="cases-filter-bar">
            <span>Filter Cases:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="cases-select"
            >
              <option value="ALL">All ({investigations.length})</option>
              <option value="OPEN">Open ({investigations.filter((i) => i.status === "OPEN").length})</option>
              <option value="INVESTIGATING">
                Investigating ({investigations.filter((i) => i.status === "INVESTIGATING").length})
              </option>
              <option value="CLOSED">Closed ({investigations.filter((i) => i.status === "CLOSED").length})</option>
            </select>
          </div>

          <div className="cases-list">
            {filteredCases.map((c) => {
              const isSelected = c.alert_id === selectedAlertId;
              return (
                <div
                  key={c.alert_id}
                  className={`case-item ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedAlertId(c.alert_id)}
                >
                  <div className="case-item-top">
                    <span className="case-alert-id">{c.alert_id}</span>
                    <span className={`case-status-badge ${c.status.toLowerCase()}`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="case-item-lot">{c.lot_id}</div>
                  <p className="case-item-hyp">{c.hypothesis || "No hypothesis recorded yet."}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Case Detail & Resolution Workspace */}
        <div className="case-workspace">
          {selectedCase && (
            <CaseEditor
              key={selectedCase.alert_id}
              initialCase={selectedCase}
              onSave={handleUpdate}
              onStatusChange={handleStatusChange}
              onOpen8D={handleOpen8D}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// VIEW 6: PROCESS & TOOL INTELLIGENCE
// ---------------------------------------------------------------------------
function ProcessIntelligence({ lots }) {
  const toolStats = useMemo(() => {
    return ATE_TOOLS.map((t) => {
      const toolLots = lots.filter((l) => l.equipment_id === t);
      const alerts = toolLots.filter((l) => l.status === "ALERT").length;
      const yields = toolLots.map((l) => l.yield).sort((a, b) => a - b);
      const mid = Math.floor(yields.length / 2);
      const median = yields.length
        ? (yields.length % 2 !== 0 ? yields[mid] : (yields[mid - 1] + yields[mid]) / 2).toFixed(1)
        : 0;
      const totalDies = toolLots.reduce((acc, l) => acc + l.tested_dies, 0);
      return {
        id: t,
        totalLots: toolLots.length,
        alertCount: alerts,
        medianYield: median,
        totalDies,
      };
    });
  }, [lots]);

  return (
    <>
      <PageIntro
        eyebrow="PROCESS CROSS-CORRELATION"
        title="Process & Tool Intelligence"
        description="Cross-correlate yield variations across test equipment, recipe revisions, and fabrication lines to isolate tool-specific signals."
      />

      <div className="metrics-grid">
        <Metric
          label="FINAL TEST TOOLS"
          value="05"
          note="Active automated test cells"
          accent="cyan"
        />
        <Metric
          label="EQUIPMENT EXCURSIONS"
          value={lots.filter((l) => l.status === "ALERT").length.toString().padStart(2, "0")}
          note={`Across ${lots.length} manufacturing lots`}
          accent="red"
        />
        <Metric
          label="FAB-01 YIELD MEDIAN"
          value="95.3%"
          note="30 evaluated lots"
          accent="green"
        />
        <Metric
          label="FAB-02 YIELD MEDIAN"
          value="94.9%"
          note="30 evaluated lots"
          accent="purple"
        />
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Automated Test Equipment (ATE) Yield Matrix</h2>
            <p>Evaluation of yield medians and excursion frequency by tester</p>
          </div>
          <span className="subtle-tag">EQUIPMENT VARIANCE</span>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Equipment ID</th>
                <th>Lots Processed</th>
                <th>Total Dies Tested</th>
                <th>Median Yield %</th>
                <th>Excursions (Alerts)</th>
                <th>Excursion Rate</th>
                <th>Variance Indicator</th>
              </tr>
            </thead>
            <tbody>
              {toolStats.map((stat) => {
                const excRate = stat.totalLots > 0 ? ((stat.alertCount / stat.totalLots) * 100).toFixed(1) : 0;
                return (
                  <tr key={stat.id}>
                    <td><strong>{stat.id}</strong></td>
                    <td className="mono">{stat.totalLots}</td>
                    <td className="mono">{stat.totalDies.toLocaleString()}</td>
                    <td>
                      <strong className={Number(stat.medianYield) < 94 ? "text-amber" : "text-cyan"}>
                        {stat.medianYield}%
                      </strong>
                    </td>
                    <td>
                      <span className={`badge ${stat.alertCount > 0 ? "alert" : "normal"}`}>
                        {stat.alertCount} ALERTS
                      </span>
                    </td>
                    <td className="mono">{excRate}%</td>
                    <td>
                      <div className="variance-bar-track">
                        <div
                          className="variance-bar-fill"
                          style={{
                            width: `${Math.min(100, (stat.alertCount / 2) * 100)}%`,
                            background: stat.alertCount > 0 ? "#ff7d92" : "#72edbb",
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="notice warning-notice">
          <strong>Correlation vs. Causation Caution:</strong> Observed equipment-level yield differences do not establish equipment-caused defects. Physical failure analysis, pin scrub inspection, and metrology validation are required.
        </div>
      </section>

      <div className="two-column">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Plant Comparison: FAB-01 vs FAB-02</h2>
              <p>Front-end wafer fabrication line performance</p>
            </div>
          </div>
          <div className="plant-compare-row">
            <div className="plant-stat-card">
              <span className="plant-name">FAB-01</span>
              <span className="plant-yield">95.3%</span>
              <span className="plant-detail">Front-end diffusion & lithography</span>
            </div>
            <div className="plant-stat-card">
              <span className="plant-name">FAB-02</span>
              <span className="plant-yield">94.9%</span>
              <span className="plant-detail">Advanced packaging line</span>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Process Step Lineage</h2>
              <p>Standard semiconductor traceability sequence</p>
            </div>
          </div>
          <div className="lineage-list">
            <div className="lineage-item">
              <span className="step-num">1</span>
              <div>
                <strong>Wafer Fabrication</strong>
                <p>Diffusion, photolithography, etch, ion implant, metallization</p>
              </div>
            </div>
            <div className="lineage-item">
              <span className="step-num">2</span>
              <div>
                <strong>Wafer Inspection & Defect Metrology</strong>
                <p>KLA optical particle scanning, overlay error verification</p>
              </div>
            </div>
            <div className="lineage-item">
              <span className="step-num">3</span>
              <div>
                <strong>Wafer Sort / Probe</strong>
                <p>Initial electrical contact test on raw silicon wafer</p>
              </div>
            </div>
            <div className="lineage-item">
              <span className="step-num">4</span>
              <div>
                <strong>Final Test (Package Level)</strong>
                <p>Full speed vector test, temperature cycling, burn-in</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// VIEW 7: ANOMALY MODEL LAB
// ---------------------------------------------------------------------------
function ModelLab({ lots }) {
  const [threshold, setThreshold] = useState(5.0);

  // Compute live confusion matrix dynamically across lots
  const evaluation = useMemo(() => {
    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;

    lots.forEach((lot) => {
      const isGroundTruthAnomaly = lot.scenario_label !== "NORMAL";
      const analysis = calculateLotAnalysis(lot, lots, threshold);
      const isPredictedAnomaly = analysis.status === "ALERT";

      if (isPredictedAnomaly && isGroundTruthAnomaly) tp++;
      else if (isPredictedAnomaly && !isGroundTruthAnomaly) fp++;
      else if (!isPredictedAnomaly && !isGroundTruthAnomaly) tn++;
      else if (!isPredictedAnomaly && isGroundTruthAnomaly) fn++;
    });

    const precision = tp + fp > 0 ? (tp / (tp + fp)).toFixed(4) : "0.0000";
    const recall = tp + fn > 0 ? (tp / (tp + fn)).toFixed(4) : "0.0000";
    const specificity = tn + fp > 0 ? (tn / (tn + fp)).toFixed(4) : "0.0000";
    const f1 =
      Number(precision) + Number(recall) > 0
        ? ((2 * Number(precision) * Number(recall)) / (Number(precision) + Number(recall))).toFixed(4)
        : "0.0000";
    const accuracy = lots.length > 0 ? ((tp + tn) / lots.length).toFixed(4) : "0.0000";

    return { tp, fp, tn, fn, precision, recall, specificity, f1, accuracy };
  }, [lots, threshold]);

  return (
    <>
      <PageIntro
        eyebrow="DETECTION ALGORITHM EVALUATION"
        title="Anomaly Model Lab"
        description="Simulate alert thresholds against the synthetic benchmark dataset and observe precision, recall, and false-alarm tradeoffs."
      />

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Deviation Alert Threshold Simulator</h2>
            <p>Adjust the minimum percentage-point drop required to trigger an engineering yield alert.</p>
          </div>
          <span className="badge-highlight">{threshold.toFixed(1)} Percentage Points</span>
        </div>

        <div className="slider-box">
          <div className="slider-scale">
            <span>1.0 pp (High Sensitivity)</span>
            <span>5.0 pp (Baseline Standard)</span>
            <span>10.0 pp (Low Sensitivity)</span>
          </div>
          <input
            className="range-input"
            type="range"
            min="1.0"
            max="10.0"
            step="0.5"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
        </div>

        {/* Dynamic Metric Cards */}
        <div className="metrics-grid compact">
          <Metric
            label="ACTIVE THRESHOLD"
            value={`${threshold.toFixed(1)} pp`}
            note="Configurable drop cutoff"
            accent="cyan"
          />
          <Metric
            label="PRECISION"
            value={evaluation.precision}
            note="True Alerts / Total Alerts"
            accent="green"
          />
          <Metric
            label="RECALL (SENSITIVITY)"
            value={evaluation.recall}
            note="Detected Anomalies / Ground Truth"
            accent={Number(evaluation.recall) < 0.8 ? "red" : "green"}
          />
          <Metric
            label="F1 SCORE"
            value={evaluation.f1}
            note="Harmonic Mean of Precision & Recall"
            accent="purple"
          />
        </div>

        {/* Live Confusion Matrix */}
        <div className="confusion-matrix-section">
          <h3>Ground-Truth Confusion Matrix ({lots.length} Lots Evaluated)</h3>
          <div className="matrix-grid">
            <div className="matrix-cell tp">
              <label>True Positive (TP)</label>
              <strong>{evaluation.tp}</strong>
              <small>Correctly flagged excursions</small>
            </div>
            <div className="matrix-cell fp">
              <label>False Positive (FP)</label>
              <strong className={evaluation.fp > 0 ? "text-red" : ""}>{evaluation.fp}</strong>
              <small>Normal lots falsely flagged</small>
            </div>
            <div className="matrix-cell fn">
              <label>False Negative (FN)</label>
              <strong className={evaluation.fn > 0 ? "text-red" : ""}>{evaluation.fn}</strong>
              <small>Injected anomalies missed</small>
            </div>
            <div className="matrix-cell tn">
              <label>True Negative (TN)</label>
              <strong>{evaluation.tn}</strong>
              <small>Normal lots correctly passed</small>
            </div>
          </div>
        </div>
      </section>

      {/* Benchmark Reference Table from evaluate_detector.py */}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Documented Benchmark Threshold Sweep</h2>
            <p>Empirical evaluation results documented in project README from <code>scripts/evaluate_detector.py</code></p>
          </div>
          <span className="subtle-tag">60 SYNTHETIC LOTS</span>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Threshold (pp)</th>
                <th>True Positives</th>
                <th>False Positives</th>
                <th>True Negatives</th>
                <th>False Negatives</th>
                <th>Precision</th>
                <th>Recall</th>
                <th>F1 Score</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {BENCHMARK_METRICS_BY_THRESHOLD.map((row) => (
                <tr
                  key={row.threshold_pp}
                  className={row.threshold_pp === 5.0 ? "row-highlight" : ""}
                >
                  <td>
                    <strong>{row.threshold_pp.toFixed(1)} pp</strong>
                    {row.threshold_pp === 5.0 && <span className="default-pill">Default</span>}
                  </td>
                  <td className="mono">{row.TP}</td>
                  <td className="mono">{row.FP}</td>
                  <td className="mono">{row.TN}</td>
                  <td className="mono">{row.FN}</td>
                  <td className="mono font-bold">{row.precision.toFixed(2)}</td>
                  <td className="mono font-bold">{row.recall.toFixed(2)}</td>
                  <td className="mono font-bold">{row.f1.toFixed(2)}</td>
                  <td className="mono">{row.accuracy.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="notice">
          <strong>Engineering Takeaway:</strong> At a 5.0 pp drop threshold, the detector achieves perfect 1.00 recall and 1.00 precision on the synthetic benchmark. When raised to 7.0 pp, recall falls to 0.50, and at 10.0 pp all injected excursions are missed.
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// VIEW 8: AUTHENTICATION & PREFERENCES
// ---------------------------------------------------------------------------
function AuthPage({ userSession, onAuthStateChange }) {
  return (
    <div className="auth-wrap">
      <section className="panel auth-panel">
        <PreferencesConsole
          initialUser={userSession}
          onAuthStateChange={onAuthStateChange}
        />
        <p className="auth-switch">
          New user? <NavLink to="/signup">Create a Cognito account ↗</NavLink>
        </p>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VIEW 9: SIGN UP & CONFIRMATION
// ---------------------------------------------------------------------------
function SignUpPage() {
  return (
    <div className="auth-wrap">
      <section className="panel auth-panel">
        <SignUpConsole />
      </section>
    </div>
  );
}

function App() {
  const [lots, setLots] = useState(BENCHMARK_LOTS);
  const [userSession, setUserSession] = useState(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("waferiq-theme") || "titanium";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("waferiq-theme", theme);
  }, [theme]);

  useEffect(() => {
    restoreUserSession().then((s) => {
      if (s) setUserSession(s);
    });
  }, []);

  const handleAddLot = (analyzedLot) => {
    const a = analyzedLot.analysis || {};
    const formattedLot = {
      lot_id: analyzedLot.lot_id,
      product_id: analyzedLot.product_id,
      tested_dies: analyzedLot.tested_dies,
      passing_dies: analyzedLot.passing_dies,
      failed_dies: analyzedLot.failed_dies,
      yield: Number(analyzedLot.yield ?? analyzedLot.final_test_yield?.toFixed(2) ?? a.observed_yield_pct),
      baseline: analyzedLot.baseline ?? a.baseline_yield_pct,
      yield_drop_pp: analyzedLot.yield_drop_pp ?? a.yield_drop_pp ?? a.yield_drop_percentage_points,
      status: analyzedLot.status || a.status || "NORMAL",
      process_step: analyzedLot.process_step || "Final Test",
      equipment_id: analyzedLot.equipment_id || "TESTER-01",
      recipe_revision: analyzedLot.recipe_revision || "REV-A",
      wafer_lot_id: analyzedLot.wafer_lot_id || `WAF-${analyzedLot.lot_id.slice(-4)}`,
      wafer_count: analyzedLot.wafer_count || 24,
      wafer_diameter_mm: 300,
      plant_id: "FAB-01",
      scenario_label: analyzedLot.scenario_label || ((analyzedLot.status || a.status) === "ALERT" ? "INJECTED_YIELD_DROP" : "NORMAL"),
      event_timestamp: analyzedLot.event_timestamp || new Date().toISOString(),
      defect_counts: analyzedLot.defect_counts || {
        "Particle contamination": 85,
        "Lithography pattern defect": 42,
        "Overlay/alignment deviation": 28,
        "Electrical test failure": 140,
        "Contact/via resistance": 35,
        "Parametric outlier": 50,
      },
      investigation_note:
        analyzedLot.investigation_note ||
        analyzedLot.ai_investigation?.summary ||
        "Newly analyzed lot from live analysis console.",
      ai_investigation: analyzedLot.ai_investigation,
      is_synthetic: true,
    };

    setLots((prev) => [formattedLot, ...prev.filter((l) => l.lot_id !== formattedLot.lot_id)]);
  };

  return (
    <BrowserRouter>
      <Layout
        lots={lots}
        onAddLot={handleAddLot}
        userSession={userSession}
        setUserSession={setUserSession}
        theme={theme}
        onThemeChange={setTheme}
      />
    </BrowserRouter>
  );
}

export default App;
