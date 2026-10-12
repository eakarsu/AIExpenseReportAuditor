import FormattedAIReport from "../components/FormattedAIReport";
import React, { useEffect, useState } from 'react'
import AIResultDisplay from '../components/AIResultDisplay'
import { api } from '../services/api'

/**
 * Apply pass 5 wave-1 — agentic audit + synthetic-receipt detector.
 *
 *   POST /api/ai/agentic-audit/:reportId
 *   POST /api/ai/synthetic-receipt-detect  (multipart -> base64)
 *
 * Style follows AIAdminTools.jsx / AIBatchTools.jsx (page-header / detail-card / form-group / btn / AIResultDisplay).
 * JWT bearer from localStorage. 503 surfaced inline.
 */
function getHeaders() {
  const token = localStorage.getItem('token')
  return { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }
}

async function postJSON(url, body) {
  const res = await fetch(url, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (res.status === 503) throw new Error(data.error || 'AI not configured (503). Set OPENROUTER_API_KEY in server .env.')
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('Could not read file'))
    r.readAsDataURL(file)
  })
}

export default function AIAgenticAudit() {
  // ----- Agentic Audit -----
  const [reportId, setReportId] = useState('')
  const [reports, setReports] = useState([])
  const [auditResult, setAuditResult] = useState(null)
  const [auditError, setAuditError] = useState('')
  const [auditLoading, setAuditLoading] = useState(false)

  useEffect(() => {
    api.getReports().then(setReports).catch(() => {})
  }, [])

  const runAudit = async (e) => {
    e.preventDefault()
    if (!reportId) { setAuditError('reportId is required'); return }
    setAuditLoading(true); setAuditError(''); setAuditResult(null)
    try {
      const out = await postJSON(`/api/ai/agentic-audit/${encodeURIComponent(reportId)}`, {})
      setAuditResult(out)
    } catch (err) { setAuditError(err.message) }
    setAuditLoading(false)
  }

  // ----- Synthetic Receipt Detect -----
  const [file, setFile] = useState(null)
  const [synthResult, setSynthResult] = useState(null)
  const [synthError, setSynthError] = useState('')
  const [synthLoading, setSynthLoading] = useState(false)

  const runSynth = async (e) => {
    e.preventDefault()
    if (!file) { setSynthError('Select a receipt image'); return }
    setSynthLoading(true); setSynthError(''); setSynthResult(null)
    try {
      const dataUrl = await fileToBase64(file)
      const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
      if (!m) throw new Error('Could not parse data URL')
      const out = await postJSON('/api/ai/synthetic-receipt-detect', { mime_type: m[1], image_base64: m[2] })
      setSynthResult(out)
    } catch (err) { setSynthError(err.message) }
    setSynthLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <h1>AI Agentic Audit & Synthetic-Receipt Detection</h1>
        <p>Two pass-5 utilities. Agentic Audit orchestrates fraud + policy + duplicates + anomalies + cost-optimization on a report. Synthetic-Receipt scans a single image for AI-fabrication signals.</p>
      </div>

      <div className="detail-card">
        <h2>Agentic Audit (one report)</h2>
        <form onSubmit={runAudit}>
          <div className="form-group">
            <label>Expense report</label>
            <select data-ai-field="reportId" value={reportId} onChange={(e) => setReportId(e.target.value)} required>
              <option value="">Choose an existing report...</option>
              {reports.map((report) => (
                <option key={report.id} value={report.id}>{report.report_number} — {report.title}</option>
              ))}
            </select>
          </div>
          <button className="btn" type="submit" disabled={auditLoading}>{auditLoading ? 'Auditing...' : 'Run Agentic Audit'}</button>
        </form>
        {auditError && <p className="error" style={{ color: '#c0392b', marginTop: 12 }}>{auditError}</p>}
        {auditResult && (
          <div style={{ marginTop: 16 }}>
            <h3>Result</h3>
            <FormattedAIReport response={{ stats: auditResult.stats, audit: auditResult.audit }} />
            {auditResult.raw_analysis && <AIResultDisplay result={{ analysis: auditResult.raw_analysis, model: auditResult.model, usage: auditResult.usage }} />}
          </div>
        )}
      </div>

      <div className="detail-card" style={{ marginTop: 16 }}>
        <h2>Synthetic-Receipt Detection</h2>
        <p style={{ color: '#7a7a8a', fontSize: 13 }}>Heuristic: NOT a forensic determination. Flag for human review.</p>
        <form onSubmit={runSynth}>
          <div className="form-group">
            <label>Receipt image (jpg/png/webp)</label>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <button className="btn" type="submit" disabled={synthLoading}>{synthLoading ? 'Detecting...' : 'Detect Synthetic'}</button>
        </form>
        {synthError && <p className="error" style={{ color: '#c0392b', marginTop: 12 }}>{synthError}</p>}
        {synthResult && (
          <div style={{ marginTop: 16 }}>
            <h3>Detection</h3>
            <FormattedAIReport response={synthResult.detection} />
            <p style={{ fontSize: 12, color: '#7a7a8a', marginTop: 8 }}>{synthResult.disclaimer}</p>
          </div>
        )}
      </div>
    </div>
  )
}
