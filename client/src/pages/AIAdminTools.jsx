import React, { useState } from 'react'
import AIResultDisplay from '../components/AIResultDisplay'

/**
 * Admin / utility tools backed by `server/routes/aiNew.js`:
 *   - POST /api/ai/receipt-ocr               (vision OCR)
 *   - POST /api/ai/schedule-anomaly-scan     (admin scheduler)
 *   - POST /api/ai/apply-policy-suggestions  (admin: convert prior policy-suggestions runs into pending rules)
 *
 * These are admin/internal helpers — surfaced here so the endpoints are reachable from the UI
 * without retrofitting the existing per-feature pages. Matches the existing pages' patterns
 * (page-header / detail-card / form-group / btn / AIResultDisplay).
 */
function getHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

async function postJSON(url, body) {
  const res = await fetch(url, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (res.status === 503) throw new Error(data.error || 'AI not configured (503). Set OPENROUTER_API_KEY in server .env.')
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export default function AIAdminTools() {
  // ----- Receipt OCR (vision) -----
  const [ocrFile, setOcrFile] = useState(null)
  const [ocrPreview, setOcrPreview] = useState('')
  const [ocrResult, setOcrResult] = useState(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState('')

  const onOcrFile = (e) => {
    const f = e.target.files?.[0]
    setOcrFile(f || null)
    setOcrResult(null); setOcrError('')
    if (f) {
      const r = new FileReader()
      r.onload = () => setOcrPreview(String(r.result))
      r.readAsDataURL(f)
    } else {
      setOcrPreview('')
    }
  }

  const runOcr = async (e) => {
    e.preventDefault()
    if (!ocrFile) return
    setOcrLoading(true); setOcrError(''); setOcrResult(null)
    try {
      const dataUrl = ocrPreview || ''
      const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/)
      if (!m) throw new Error('Could not read image as base64')
      const mime_type = m[1]
      const image_base64 = m[2]
      const data = await postJSON('/api/ai/receipt-ocr', { image_base64, mime_type })
      setOcrResult(data)
    } catch (err) { setOcrError(err.message) }
    setOcrLoading(false)
  }

  // ----- Schedule anomaly scan -----
  const [schedFreq, setSchedFreq] = useState('daily')
  const [schedResult, setSchedResult] = useState(null)
  const [schedLoading, setSchedLoading] = useState(false)
  const [schedError, setSchedError] = useState('')

  const runSchedule = async (e) => {
    e.preventDefault()
    setSchedLoading(true); setSchedError(''); setSchedResult(null)
    try {
      const data = await postJSON('/api/ai/schedule-anomaly-scan', { frequency: schedFreq })
      setSchedResult(data)
    } catch (err) { setSchedError(err.message) }
    setSchedLoading(false)
  }

  // ----- Apply policy suggestions -----
  const [applyResult, setApplyResult] = useState(null)
  const [applyLoading, setApplyLoading] = useState(false)
  const [applyError, setApplyError] = useState('')

  const runApply = async () => {
    setApplyLoading(true); setApplyError(''); setApplyResult(null)
    try {
      const data = await postJSON('/api/ai/apply-policy-suggestions', {})
      setApplyResult(data)
    } catch (err) { setApplyError(err.message) }
    setApplyLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{'\u{1F527}'} AI Admin Tools</h1>
          <div className="breadcrumb">Receipt OCR (vision), scheduled scans, and bulk policy-rule generation</div>
        </div>
      </div>

      <div className="alert" style={{ background: '#fef3c7', color: '#92400e', padding: 12, borderRadius: 8, marginBottom: 16 }}>
        Admin / utility endpoints. Each requires <code>OPENROUTER_API_KEY</code> on the server (or DB tables). 503 / errors will be shown inline below each tool.
      </div>

      {/* Receipt OCR */}
      <div className="detail-card" style={{ marginBottom: 16 }}>
        <div className="detail-body">
          <h2 style={{ marginTop: 0 }}>{'\u{1F9FE}'} Receipt OCR (Vision)</h2>
          <div style={{ color: '#64748b', fontSize: 13, marginBottom: 12 }}>
            Upload a receipt image. Vision model extracts vendor, amount, date, category, and line items.
            Result is persisted in <code>ai_analysis_results</code> as <code>receipt_ocr</code>.
          </div>
          <form onSubmit={runOcr}>
            <div className="form-group">
              <label>Receipt Image</label>
              <input type="file" accept="image/*" onChange={onOcrFile} required />
            </div>
            {ocrPreview && (
              <div style={{ marginBottom: 12 }}>
                <img src={ocrPreview} alt="receipt preview" style={{ maxHeight: 240, border: '1px solid #e2e8f0', borderRadius: 6 }} />
              </div>
            )}
            <button type="submit" className="btn btn-primary" disabled={ocrLoading || !ocrFile}>
              {ocrLoading ? 'Extracting...' : 'Extract Receipt Data'}
            </button>
          </form>
          {ocrError && <div className="error-msg" style={{ marginTop: 12 }}>{ocrError}</div>}
          {ocrResult && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ marginBottom: 8 }}>Extracted</h4>
              <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 12, borderRadius: 6, overflow: 'auto', fontSize: 12 }}>
                {JSON.stringify(ocrResult.extracted, null, 2)}
              </pre>
              {ocrResult.raw_analysis && (
                <AIResultDisplay
                  result={{ analysis: ocrResult.raw_analysis, model: ocrResult.model, usage: ocrResult.usage }}
                  loading={false}
                  error=""
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Schedule anomaly scan */}
      <div className="detail-card" style={{ marginBottom: 16 }}>
        <div className="detail-body">
          <h2 style={{ marginTop: 0 }}>{'\u{1F4C5}'} Schedule Anomaly Scan</h2>
          <div style={{ color: '#64748b', fontSize: 13, marginBottom: 12 }}>
            Inserts a row in <code>scheduled_scans</code> with the chosen frequency.
            (Worker process to actually run scheduled scans is a separate concern.)
          </div>
          <form onSubmit={runSchedule}>
            <div className="form-group">
              <label>Frequency</label>
              <select value={schedFreq} onChange={(e) => setSchedFreq(e.target.value)}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={schedLoading}>
              {schedLoading ? 'Scheduling...' : 'Schedule Scan'}
            </button>
          </form>
          {schedError && <div className="error-msg" style={{ marginTop: 12 }}>{schedError}</div>}
          {schedResult && (
            <div style={{ marginTop: 12 }}>
              <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 12, borderRadius: 6, overflow: 'auto', fontSize: 12 }}>
                {JSON.stringify(schedResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Apply policy suggestions */}
      <div className="detail-card" style={{ marginBottom: 16 }}>
        <div className="detail-body">
          <h2 style={{ marginTop: 0 }}>{'\u{1F4DC}'} Apply Recent Policy Suggestions</h2>
          <div style={{ color: '#64748b', fontSize: 13, marginBottom: 12 }}>
            Reads up to 5 recent <code>policy_suggestions</code> AI runs and asks the model to convert them into
            structured rules; rules are inserted as <code>pending_review</code> (not yet active). Run
            "Policy Suggestions" first to populate input.
          </div>
          <button type="button" className="btn btn-primary" disabled={applyLoading} onClick={runApply}>
            {applyLoading ? 'Generating rules...' : 'Generate & Insert Pending Rules'}
          </button>
          {applyError && <div className="error-msg" style={{ marginTop: 12 }}>{applyError}</div>}
          {applyResult && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ marginBottom: 8 }}>{applyResult.message}</h4>
              <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 12, borderRadius: 6, overflow: 'auto', fontSize: 12, maxHeight: 280 }}>
                {JSON.stringify(applyResult.rules_created, null, 2)}
              </pre>
              {applyResult.raw_analysis && (
                <AIResultDisplay
                  result={{ analysis: applyResult.raw_analysis, model: applyResult.model }}
                  loading={false}
                  error=""
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
