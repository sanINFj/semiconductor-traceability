import React, { useState } from "react";
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import "./App.css";

const navigation = [
  { label: "WORKSPACE", items: [
    { to: "/overview", icon: "◈", label: "Overview" },
    { to: "/lots", icon: "▦", label: "Lot explorer" },
    { to: "/investigations", icon: "⌕", label: "Investigations" },
  ]},
  { label: "INTELLIGENCE", items: [
    { to: "/process-intelligence", icon: "⌁", label: "Process intelligence" },
    { to: "/model-lab", icon: "⌘", label: "Model lab" },
  ]},
];

const sampleLots = [
  { id: "LOT-004", product: "CHIP-A", step: "Final test", equipment: "TESTER-03", yield: 82, baseline: 95, status: "ALERT" },
  { id: "LOT-005", product: "CHIP-A", step: "Final test", equipment: "TESTER-01", yield: null, baseline: 95, status: "INSUFFICIENT DATA" },
  { id: "LOT-006", product: "CHIP-B", step: "Wafer sort", equipment: "SORTER-02", yield: 97.4, baseline: 96, status: "NORMAL" },
  { id: "LOT-007", product: "CHIP-A", step: "Final test", equipment: "TESTER-02", yield: 94.2, baseline: 95, status: "NORMAL" },
];

function Badge({ status }) {
  const cls = status.toLowerCase().replaceAll(" ", "-");
  return <span className={`badge ${cls}`}>{status}</span>;
}

function Header() {
  const location = useLocation();
  const names = {
    "/overview": "Quality overview",
    "/lots": "Lot explorer",
    "/investigations": "Investigation center",
    "/process-intelligence": "Process intelligence",
    "/model-lab": "Anomaly model lab",
    "/login": "Sign in",
    "/signup": "Create account",
  };
  const title = names[location.pathname] || (location.pathname.startsWith("/lots/") ? "Lot details" : "Quality intelligence");
  return <header className="topbar">
    <div className="breadcrumb">WAFERIQ <span>/</span> <strong>{title}</strong></div>
    <div className="top-actions">
      <span className="region">AWS · ap-southeast-2</span>
      <NavLink className="account-link" to="/login">Sign in ↗</NavLink>
    </div>
  </header>;
}

function Layout() {
  return <div className="app-shell">
    <aside className="sidebar">
      <NavLink to="/overview" className="brand">
        <span className="brand-icon">W</span>
        <span className="brand-name">wafer<span>IQ</span></span>
      </NavLink>
      {navigation.map(group => <section className="nav-group" key={group.label}>
        <div className="eyebrow">{group.label}</div>
        {group.items.map(item => <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          <span className="nav-icon">{item.icon}</span>{item.label}
        </NavLink>)}
      </section>)}
      <div className="sidebar-bottom">
        <div className="cloud-card">
          <div className="eyebrow">PROJECT STATUS</div>
          <p><span className="online-dot" /> Frontend prototype</p>
          <small>Sample data only · AWS actions are not connected on these pages yet.</small>
        </div>
        <div className="version">WAFERIQ · QUALITY INTELLIGENCE</div>
      </div>
    </aside>
    <main className="main-area">
      <Header />
      <div className="page-content">
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/lots" element={<Lots />} />
          <Route path="/lots/:lotId" element={<LotDetails />} />
          <Route path="/investigations" element={<Investigations />} />
          <Route path="/process-intelligence" element={<ProcessIntelligence />} />
          <Route path="/model-lab" element={<ModelLab />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
        <footer className="footer"><span>WaferIQ · Semiconductor quality intelligence</span><span>Prototype interface · Verify findings before acting</span></footer>
      </div>
    </main>
  </div>;
}

function PageIntro({ eyebrow, title, description, action }) {
  return <div className="page-intro">
    <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>
    {action}
  </div>;
}

function Metric({ label, value, note, accent = "cyan" }) {
  return <div className={`metric accent-${accent}`}>
    <div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">{note}</div>
  </div>;
}

function Overview() {
  const navigate = useNavigate();
  const alerts = sampleLots.filter(l => l.status === "ALERT");
  return <>
    <PageIntro eyebrow="SEMICONDUCTOR OPERATIONS / QUALITY" title={<>Yield, <span className="gradient">in focus.</span></>} description="Explore manufacturing lot performance, identify yield deviations, and organize follow-up investigations." action={<button className="btn btn-primary" onClick={() => navigate("/lots")}>Explore lots ↗</button>} />
    <div className="metrics-grid">
      <Metric label="LOTS IN SAMPLE" value="04" note="Illustrative prototype records" />
      <Metric label="YIELD ALERTS" value={alerts.length.toString().padStart(2, "0")} note="In sample data" accent="red" />
      <Metric label="NORMAL LOTS" value={sampleLots.filter(l => l.status === "NORMAL").length.toString().padStart(2, "0")} note="In sample data" accent="green" />
      <Metric label="NEEDS REVIEW" value={sampleLots.filter(l => l.status === "INSUFFICIENT DATA").length.toString().padStart(2, "0")} note="In sample data" accent="purple" />
    </div>
    <div className="two-column">
      <section className="panel">
        <div className="panel-heading"><div><h2>Recent lot activity</h2><p>Illustrative records for layout development</p></div><NavLink className="text-link" to="/lots">View all →</NavLink></div>
        <LotTable lots={sampleLots.slice(0, 3)} />
      </section>
      <section className="panel">
        <div className="panel-heading"><div><h2>Quality status</h2><p>Distribution in sample records</p></div></div>
        {["ALERT", "NORMAL", "INSUFFICIENT DATA"].map(status => {
          const count = sampleLots.filter(l => l.status === status).length;
          return <div className="status-row" key={status}><span>{status}</span><div className="bar-track"><div className={`bar-fill ${status.toLowerCase().replaceAll(" ", "-")}`} style={{ width: `${count / sampleLots.length * 100}%` }} /></div><strong>{count}</strong></div>;
        })}
        <div className="notice">Prototype data only. These metrics do not query DynamoDB or your live AWS API.</div>
      </section>
    </div>
    <section className="panel trend-panel">
      <div className="panel-heading"><div><h2>Yield snapshot</h2><p>Observed yields from the illustrative records</p></div><span className="subtle-tag">SAMPLE DATA</span></div>
      <div className="yield-snapshot">{sampleLots.filter(l => l.yield !== null).map(l => <div className="yield-item" key={l.id}><div className="yield-number">{l.yield}%</div><div className="yield-track"><div className={`yield-column ${l.status.toLowerCase()}`} style={{ height: `${l.yield}%` }} /></div><div className="yield-label">{l.id}</div></div>)}</div>
    </section>
  </>;
}

function LotTable({ lots }) {
  return <div className="table-scroll"><table><thead><tr><th>Lot ID</th><th>Product</th><th>Yield</th><th>Baseline</th><th>Status</th></tr></thead><tbody>
    {lots.map(l => <tr key={l.id}><td><NavLink className="lot-link" to={`/lots/${l.id}`}>{l.id}</NavLink></td><td>{l.product}</td><td>{l.yield === null ? "—" : `${l.yield}%`}</td><td>{l.baseline}%</td><td><Badge status={l.status} /></td></tr>)}
  </tbody></table></div>;
}

function Lots() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("id");
  const filtered = sampleLots.filter(l => (status === "ALL" || l.status === status) && `${l.id} ${l.product} ${l.equipment}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sort === "yield" ? (b.yield ?? -1) - (a.yield ?? -1) : a.id.localeCompare(b.id));
  return <>
    <PageIntro eyebrow="MANUFACTURING DATA" title="Lot explorer" description="Search, filter, and inspect sample manufacturing lots." />
    <section className="panel">
      <div className="toolbar"><input aria-label="Search lots" placeholder="Search lot, product, or equipment…" value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="Filter by status" value={status} onChange={e => setStatus(e.target.value)}><option value="ALL">All statuses</option><option value="ALERT">Alert</option><option value="NORMAL">Normal</option><option value="INSUFFICIENT DATA">Insufficient data</option></select><select aria-label="Sort lots" value={sort} onChange={e => setSort(e.target.value)}><option value="id">Sort by lot ID</option><option value="yield">Sort by yield</option></select></div>
      <LotTable lots={filtered} />
      {!filtered.length && <div className="empty-state">No sample lots match your filters.</div>}
      <p className="notice">This explorer currently uses illustrative sample records. Live lot retrieval is not connected yet.</p>
    </section>
  </>;
}

function LotDetails() {
  const { lotId } = useParams();
  const lot = sampleLots.find(l => l.id.toLowerCase() === lotId.toLowerCase());
  if (!lot) return <PageIntro eyebrow="LOT RECORD" title={`Lot ${lotId}`} description="No matching prototype record was found. Live lot lookup is not connected yet." action={<NavLink className="btn" to="/lots">← Back to lots</NavLink>} />;
  return <>
    <PageIntro eyebrow="LOT RECORD" title={lot.id} description={`${lot.product} · ${lot.step} · ${lot.equipment}`} action={<NavLink className="btn" to="/lots">← Back to lots</NavLink>} />
    <div className="metrics-grid"><Metric label="OBSERVED YIELD" value={lot.yield === null ? "—" : `${lot.yield}%`} note="Sample record" accent={lot.status === "ALERT" ? "red" : "cyan"} /><Metric label="BASELINE" value={`${lot.baseline}%`} note="Illustrative baseline" /><Metric label="DEVIATION" value={lot.yield === null ? "—" : `${(lot.yield - lot.baseline).toFixed(1)} pp`} note="Yield minus baseline" accent={lot.status === "ALERT" ? "red" : "green"} /><Metric label="STATUS" value={lot.status} note="Prototype classification" accent="purple" /></div>
    <section className="panel"><h2>Record context</h2><p>Process step: {lot.step}</p><p>Equipment: {lot.equipment}</p><p className="notice">No verified root cause is attached to this sample record. Do not infer causation from yield deviation alone.</p></section>
  </>;
}

function Investigations() {
  return <><PageIntro eyebrow="QUALITY WORKFLOW" title="Investigation center" description="A home for evidence-backed quality investigations and follow-up actions." /><section className="panel"><h2>Investigation queue</h2><p className="muted">No persistent investigation service is connected yet.</p><div className="notice">Next integration: authenticated backend storage for owners, evidence, status, and resolution notes.</div><LotTable lots={sampleLots.filter(l => l.status === "ALERT" || l.status === "INSUFFICIENT DATA")} /></section></>;
}

function ProcessIntelligence() {
  return <><PageIntro eyebrow="PROCESS MONITORING" title="Process intelligence" description="Explore yield variation and equipment-level signals without confusing correlation with root cause." /><div className="metrics-grid"><Metric label="SAMPLE EQUIPMENT" value="03" note="Distinct equipment IDs" /><Metric label="ALERT RECORDS" value="01" note="In sample data" accent="red" /><Metric label="LIVE SIGNALS" value="0" note="No live feed connected" accent="purple" /><Metric label="CONFIRMED CAUSES" value="0" note="No causal evidence supplied" accent="green" /></div><section className="panel"><h2>Equipment snapshot</h2><div className="table-scroll"><table><thead><tr><th>Equipment</th><th>Sample lots</th><th>Observed signal</th><th>Interpretation</th></tr></thead><tbody><tr><td>TESTER-03</td><td>1</td><td>82% yield</td><td><Badge status="ALERT" /></td></tr><tr><td>TESTER-01</td><td>2</td><td>97.4% / missing yield</td><td><Badge status="INSUFFICIENT DATA" /></td></tr><tr><td>TESTER-02</td><td>1</td><td>94.2% yield</td><td><Badge status="NORMAL" /></td></tr></tbody></table></div><p className="notice">Illustrative records only. Equipment-level differences here are not sufficient to establish an equipment-caused defect.</p></section></>;
}

function ModelLab() {
  const [threshold, setThreshold] = React.useState(3);
  return <><PageIntro eyebrow="MODEL EVALUATION" title="Anomaly model lab" description="Explore how an illustrative alert threshold changes sensitivity. This is not connected to a deployed model." /><section className="panel"><div className="panel-heading"><div><h2>Deviation threshold</h2><p>Adjust the hypothetical yield-drop threshold.</p></div><span className="subtle-tag">{threshold} percentage points</span></div><label className="slider-label">Alert when yield drops by at least {threshold} percentage points</label><input className="range-input" type="range" min="1" max="10" value={threshold} onChange={e => setThreshold(Number(e.target.value))} /><div className="metrics-grid compact"><Metric label="HYPOTHETICAL THRESHOLD" value={`${threshold} pp`} note="User-controlled experiment" /><Metric label="VALIDATED PRECISION" value="—" note="No evaluation run" accent="purple" /><Metric label="VALIDATED RECALL" value="—" note="No evaluation run" accent="green" /></div><p className="notice">Threshold changes here do not alter the backend or deployed quality engine. Valid precision/recall require labeled evaluation data.</p></section></>;
}

function AuthPage({ mode }) {
  const signup = mode === "signup";
  return <div className="auth-wrap"><section className="panel auth-panel"><div className="eyebrow">WAFERIQ ACCOUNT</div><h1>{signup ? "Create your account" : "Welcome back."}</h1><p className="muted">{signup ? "Set up access to your quality workspace." : "Sign-in UI prototype. Authentication is not wired up on this React page yet."}</p><form onSubmit={e => e.preventDefault()}><label>Email address<input type="email" placeholder="you@company.com" required /></label><label>Password<input type="password" placeholder="Enter password" minLength="8" required /></label>{signup && <label>Confirm password<input type="password" placeholder="Repeat password" minLength="8" required /></label>}<button className="btn btn-primary full-button" type="submit">{signup ? "Create account" : "Sign in"} ↗</button></form><p className="auth-switch">{signup ? "Already registered?" : "New to WaferIQ?"} <NavLink to={signup ? "/login" : "/signup"}>{signup ? "Sign in" : "Create an account"}</NavLink></p><p className="notice">Demo interface only. No credentials are submitted or stored.</p></section></div>;
}

function App() {
  return <BrowserRouter><Layout /></BrowserRouter>;
}

export default App;
