import React, { useState } from 'react'

// Apply pass 5 — surfaces NEEDS-CREDS / PRODUCT-DECISION integration stubs.
// 503 + missing env var is rendered inline.

function getHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

async function call(url, method = 'POST', body) {
  const init = { method, headers: getHeaders() }
  if (body) init.body = JSON.stringify(body)
  const res = await fetch(url, init)
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

function Card({ title, children }) {
  return (
    <div className="detail-card" style={{ marginBottom: 16, padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {children}
    </div>
  )
}

export default function Integrations() {
  const [results, setResults] = useState({})

  const probe = async (key, url, method = 'POST', body) => {
    const r = await call(url, method, body)
    setResults((s) => ({ ...s, [key]: r }))
  }

  const Result = ({ k }) => {
    const r = results[k]
    if (!r) return null
    const isMissing = r.status === 503 && r.data?.missing
    return (
      <div style={{ marginTop: 8 }}>
        {isMissing ? (
          <div style={{ background: '#fff8e1', padding: 8, borderRadius: 4 }}>
            Not configured: set <code>{r.data.missing}</code>
          </div>
        ) : (
          <pre style={{ background: '#f7f7f7', padding: 8, borderRadius: 4, fontSize: 12 }}>
            {JSON.stringify(r.data, null, 2)}
          </pre>
        )}
      </div>
    )
  }

  return (
    <div className="page-content" style={{ padding: 20, maxWidth: 900 }}>
      <div className="page-header">
        <h2>Integrations</h2>
        <p style={{ color: '#666' }}>
          Accounting, corporate-card, and policy automation. Each call returns 503 + missing env var
          when credentials are not configured.
        </p>
      </div>

      <Card title="QuickBooks export (NEEDS-CREDS: QUICKBOOKS_CLIENT_ID)">
        <button className="btn" onClick={() => probe('qb', '/api/integrations/quickbooks/export', 'POST', {})}>
          Probe
        </button>
        <Result k="qb" />
      </Card>

      <Card title="NetSuite export (NEEDS-CREDS: NETSUITE_ACCOUNT_ID)">
        <button className="btn" onClick={() => probe('ns', '/api/integrations/netsuite/export', 'POST', {})}>
          Probe
        </button>
        <Result k="ns" />
      </Card>

      <Card title="Visa Commercial card sync (NEEDS-CREDS: VISA_COMMERCIAL_API_KEY)">
        <button className="btn" onClick={() => probe('visa', '/api/integrations/visa/sync', 'POST', {})}>
          Probe
        </button>
        <Result k="visa" />
      </Card>

      <Card title="SAP Concur card sync (NEEDS-CREDS: CONCUR_API_KEY)">
        <button className="btn" onClick={() => probe('concur', '/api/integrations/concur/sync', 'POST', {})}>
          Probe
        </button>
        <Result k="concur" />
      </Card>

      <Card title="Auto-rejection scan (PRODUCT-DECISION: dry-run by default)">
        <button
          className="btn"
          onClick={() => probe('autorej', '/api/integrations/auto-reject/scan', 'POST', { dry_run: true })}
        >
          Run dry-run scan
        </button>
        <Result k="autorej" />
      </Card>

      <Card title="Export history">
        <button className="btn" onClick={() => probe('exports', '/api/integrations/exports', 'GET')}>
          Refresh
        </button>
        <Result k="exports" />
      </Card>
    </div>
  )
}
