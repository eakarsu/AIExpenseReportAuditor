// === Batch 03 Gaps & Frontend Mounts ===
// Auto-generated frontend page (lean v0). Wires Custom Feature Suggestions
// and Gap endpoints (AI counterparts + non-AI features) to backend routes.
import React, { useState } from 'react';

const API_BASE = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) || 'http://localhost:4000/api';

const FEATURES = [
  { kind: 'cfs', slug: 'cf-agentic-auditor', label: 'Agentic auditor', desc: '"Flag all high-risk expenses from Q3" → agent runs multiple analyses, generates audit summary with recommendations', endpoint: '/cf-agentic-auditor' },
  { kind: 'cfs', slug: 'cf-synthetic-receipt-fraud-detection', label: 'Synthetic receipt fraud detection', desc: 'Identify AI-generated fake receipts (deepfakes)', endpoint: '/cf-synthetic-receipt-fraud-detection' },
  { kind: 'cfs', slug: 'cf-real-time-expense-monitoring', label: 'Real-time expense monitoring', desc: 'Alert manager immediately on suspicious expense (out-of-policy, unusual vendor)', endpoint: '/cf-real-time-expense-monitoring' },
  { kind: 'cfs', slug: 'cf-compliance-automation', label: 'Compliance automation', desc: 'Auto-reject non-compliant expenses, notify employee', endpoint: '/cf-compliance-automation' },
  { kind: 'cfs', slug: 'cf-tax-optimization', label: 'Tax optimization', desc: 'Recommend timing of expenses for tax efficiency', endpoint: '/cf-tax-optimization' },
  { kind: 'cfs', slug: 'cf-vendor-fraud-detection', label: 'Vendor fraud detection', desc: 'Link expenses across employees, identify kickback schemes', endpoint: '/cf-vendor-fraud-detection' },
  { kind: 'cfs', slug: 'cf-travel-policy-enforcement', label: 'Travel policy enforcement', desc: 'Enforce preferred hotel/airline, auto-approve or auto-reject based on policy', endpoint: '/cf-travel-policy-enforcement' },
  { kind: 'gap-ai', slug: 'gap-ai-no-batch-receipt-ocr-pipeline', label: 'No batch-receipt OCR pipeline', desc: 'No batch-receipt OCR pipeline', endpoint: '/gap-no-batch-receipt-ocr-pipeline' },
  { kind: 'gap-ai', slug: 'gap-ai-no-mileage-route-verifier-compare-claim-vs-gps-route', label: 'No mileage-route verifier (compare claim vs GPS route)', desc: 'No mileage-route verifier (compare claim vs GPS route)', endpoint: '/gap-no-mileage-route-verifier-compare-claim-vs-gps-route' },
  { kind: 'gap-ai', slug: 'gap-ai-no-synthetic-receipt-deepfake-detector', label: 'No synthetic-receipt (deepfake) detector', desc: 'No synthetic-receipt (deepfake) detector', endpoint: '/gap-no-synthetic-receipt-deepfake-detector' },
  { kind: 'gap-non', slug: 'gap-non-limited-accounting-software-integration-only-stub-no-quic', label: 'Limited accounting-software integration (only stub — no Quic', desc: 'Limited accounting-software integration (only stub — no QuickBooks/NetSuite full sync)', endpoint: '/gap-limited-accounting-software-integration-only-stub-no-quic' },
  { kind: 'gap-non', slug: 'gap-non-no-reimbursement-payout-workflow', label: 'No reimbursement-payout workflow', desc: 'No reimbursement-payout workflow', endpoint: '/gap-no-reimbursement-payout-workflow' },
  { kind: 'gap-non', slug: 'gap-non-no-corporate-card-transaction-ingest', label: 'No corporate-card transaction ingest', desc: 'No corporate-card transaction ingest', endpoint: '/gap-no-corporate-card-transaction-ingest' },
  { kind: 'gap-non', slug: 'gap-non-limited-multi-currency-support', label: 'Limited multi-currency support', desc: 'Limited multi-currency support', endpoint: '/gap-limited-multi-currency-support' },
  { kind: 'gap-non', slug: 'gap-non-no-webhooks', label: 'No webhooks', desc: 'No webhooks', endpoint: '/gap-no-webhooks' },
  { kind: 'gap-non', slug: 'gap-non-no-travel-policy-enforcement-plug-in-concur-style', label: 'No travel-policy enforcement plug-in (Concur-style)', desc: 'No travel-policy enforcement plug-in (Concur-style)', endpoint: '/gap-no-travel-policy-enforcement-plug-in-concur-style' },
];

function authHeaders() {
  const t = (typeof window !== 'undefined') ? localStorage.getItem('token') : null;
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

export default function Batch03Features() {
  const [active, setActive] = useState(FEATURES[0]?.slug);
  const [input, setInput] = useState('');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sampleRequests = [
      {
          "label": "Scenario",
          "value": "Run Batch03 Features for a realistic customer case.\nContext: a team needs a practical recommendation based on incomplete operating data.\nGoal: identify the best action, key risks, missing information, and expected business impact.\nReturn: summary, prioritized action plan, assumptions, and follow-up questions."
      },
      {
          "label": "Data sample",
          "value": "Analyze this Batch03 Features data sample.\nInput records:\n- Record 1: urgent, customer impact high, owner unassigned\n- Record 2: medium priority, blocked by missing data\n- Record 3: recurring issue, automation opportunity\nReturn structured findings, anomalies, recommendations, and confidence."
      },
      {
          "label": "Executive review",
          "value": "Prepare an executive review for Batch03 Features.\nAudience: business owner, operations lead, and implementation team.\nInclude impact, risk, estimated effort, decision points, and a concise next-step plan."
      }
  ];

  const applySampleRequest = (value) => {
    setInput(value);
    setError(null);
  };
  const current = FEATURES.find(f => f.slug === active) || FEATURES[0];

  async function run() {
    if (!current) return;
    setLoading(true); setError(null);
    try {
      let parsed;
      try { parsed = input ? JSON.parse(input) : {}; } catch { parsed = { input }; }
      const r = await fetch(`${API_BASE}${current.endpoint}`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(parsed)
      });
      let body; try { body = await r.json(); } catch { body = { raw: await r.text() }; }
      if (!r.ok) setError(body.error || `HTTP ${r.status}`);
      setResults(prev => ({ ...prev, [current.slug]: body }));
    } catch (e) {
      setError(String(e.message || e));
    } finally { setLoading(false); }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ marginTop: 0 }}>Batch 03 Features <small style={{ color: '#64748b', fontWeight: 400 }}>(AIExpenseReportAuditor)</small></h2>
      <p style={{ color: '#475569', maxWidth: 720 }}>
        Audit-driven AI counterparts, non-AI feature gaps, and custom feature suggestions.
        Backend endpoints prefixed <code>/api/cf-*</code> (custom features) and <code>/api/gap-*</code> (gap fills).
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0' }}>
        {FEATURES.map(f => (
          <button key={f.slug} onClick={() => setActive(f.slug)}
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1',
                     background: active === f.slug ? '#1e40af' : '#f8fafc',
                     color: active === f.slug ? 'white' : '#0f172a', cursor: 'pointer', fontSize: 12 }}>
            <span style={{ opacity: 0.7, marginRight: 4 }}>[{f.kind}]</span>{f.label}
          </button>
        ))}
      </div>
      {current && (
        <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: 8 }}>
            <strong>{current.label}</strong>
            <div style={{ color: '#475569', fontSize: 13 }}>{current.desc}</div>
            <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>POST <code>{current.endpoint}</code></div>
          </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {sampleRequests.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => applySampleRequest(sample.value)}
              style={{ padding: '6px 10px', background: '#eef2ff', color: '#1e3a8a', border: '1px solid #c7d2fe', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              {sample.label}
            </button>
          ))}
        </div>

          <textarea value={input} onChange={e => setInput(e.target.value)}
            placeholder='Optional JSON input (e.g. {"query":"..."})'
            style={{ width: '100%', minHeight: 80, padding: 8, fontFamily: 'monospace', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4 }} />
          <div style={{ marginTop: 8 }}>
            <button onClick={run} disabled={loading}
              style={{ padding: '8px 16px', background: '#1e40af', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Running…' : 'Run'}
            </button>
          </div>
          {error && (<div style={{ marginTop: 12, padding: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 4, fontSize: 13 }}>{error}</div>)}
          {results[current.slug] && (
            <pre style={{ marginTop: 12, padding: 10, background: '#0b1020', color: '#cbd5e1', borderRadius: 4, overflow: 'auto', maxHeight: 360, fontSize: 12 }}>
              {typeof results[current.slug] === 'string' ? results[current.slug] : JSON.stringify(results[current.slug], null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
