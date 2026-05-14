import React, { useState } from 'react'
import AIResultDisplay from '../components/AIResultDisplay'

/**
 * Batch / utility tools backed by `server/routes/aiNew.js`:
 *   - POST /api/ai/receipt-ocr-batch  (vision OCR over a list of receipts)
 *   - POST /api/ai/mileage-verify     (LLM-based mileage claim sanity check)
 *
 * Matches existing AIAdminTools.jsx page conventions: page-header / detail-card /
 * form-group / btn / AIResultDisplay; JWT bearer pulled from localStorage; 503
 * surfaced inline.
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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('Could not read file'))
    r.readAsDataURL(file)
  })
}

export default function AIBatchTools() {
  // ----- Receipt OCR Batch -----
  const [batchFiles, setBatchFiles] = useState([])
  const [batchResult, setBatchResult] = useState(null)
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchError, setBatchError] = useState('')

  const onBatchFiles = (e) => {
    const files = Array.from(e.target.files || [])
    setBatchFiles(files)
    setBatchResult(null); setBatchError('')
  }

  const runBatch = async (e) => {
    e.preventDefault()
    if (batchFiles.length === 0) return
    if (batchFiles.length > 20) {
      setBatchError('Please select 20 or fewer files.')
      return
    }
    setBatchLoading(true); setBatchError(''); setBatchResult(null)
    try {
      const items = []
      for (const f of batchFiles) {
        const dataUrl = await fileToBase64(f)
        const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/)
        if (!m) throw new Error(`Could not encode file: ${f.name}`)
        items.push({ label: f.name, mime_type: m[1], image_base64: m[2] })
      }
      const data = await postJSON('/api/ai/receipt-ocr-batch', { items })
      setBatchResult(data)
    } catch (err) { setBatchError(err.message) }
    setBatchLoading(false)
  }

  // ----- Mileage Verify -----
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [claimedMiles, setClaimedMiles] = useState('')
  const [vehicle, setVehicle] = useState('')
  const [ratePerMile, setRatePerMile] = useState('')
  const [mileageNotes, setMileageNotes] = useState('')
  const [mileageResult, setMileageResult] = useState(null)
  const [mileageLoading, setMileageLoading] = useState(false)
  const [mileageError, setMileageError] = useState('')

  const runMileage = async (e) => {
    e.preventDefault()
    if (!origin || !destination || claimedMiles === '') return
    setMileageLoading(true); setMileageError(''); setMileageResult(null)
    try {
      const body = {
        origin,
        destination,
        claimed_miles: Number(claimedMiles),
        vehicle: vehicle || undefined,
        rate_per_mile: ratePerMile !== '' ? Number(ratePerMile) : undefined,
        notes: mileageNotes || undefined,
      }
      const data = await postJSON('/api/ai/mileage-verify', body)
      setMileageResult(data)
    } catch (err) { setMileageError(err.message) }
    setMileageLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{'\u{1F9F0}'} AI Batch & Verification Tools</h1>
          <div className="breadcrumb">Batch receipt OCR and mileage claim verification</div>
        </div>
      </div>

      <div className="alert" style={{ background: '#fef3c7', color: '#92400e', padding: 12, borderRadius: 8, marginBottom: 16 }}>
        Each tool requires <code>OPENROUTER_API_KEY</code> on the server. 503 / errors are shown inline below each tool.
      </div>

      {/* Receipt OCR Batch */}
      <div className="detail-card" style={{ marginBottom: 16 }}>
        <div className="detail-body">
          <h2 style={{ marginTop: 0 }}>{'\u{1F9FE}'} Receipt OCR (Batch)</h2>
          <div style={{ color: '#64748b', fontSize: 13, marginBottom: 12 }}>
            Upload up to 20 receipt images. Each is processed by the vision model in turn.
            Each result is persisted in <code>ai_analysis_results</code> as <code>receipt_ocr_batch</code>.
          </div>
          <form onSubmit={runBatch}>
            <div className="form-group">
              <label>Receipt Images (multi-select)</label>
              <input type="file" accept="image/*" multiple onChange={onBatchFiles} required />
              {batchFiles.length > 0 && (
                <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>{batchFiles.length} file(s) selected</div>
              )}
            </div>
            <button type="submit" className="btn btn-primary" disabled={batchLoading || batchFiles.length === 0}>
              {batchLoading ? `Processing ${batchFiles.length} receipt(s)...` : 'Run Batch OCR'}
            </button>
          </form>
          {batchError && <div className="error-msg" style={{ marginTop: 12 }}>{batchError}</div>}
          {batchResult && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ marginBottom: 8 }}>
                {batchResult.succeeded}/{batchResult.count} succeeded
              </h4>
              <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 12, borderRadius: 6, overflow: 'auto', fontSize: 12, maxHeight: 360 }}>
                {JSON.stringify(batchResult.results, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Mileage Verify */}
      <div className="detail-card" style={{ marginBottom: 16 }}>
        <div className="detail-body">
          <h2 style={{ marginTop: 0 }}>{'\u{1F4CD}'} Mileage Verify</h2>
          <div style={{ color: '#64748b', fontSize: 13, marginBottom: 12 }}>
            Asks the model to estimate the typical driving distance between origin and destination,
            and compare it to the claimed miles. Returns a verdict and confidence.
          </div>
          <form onSubmit={runMileage}>
            <div className="form-group">
              <label>Origin</label>
              <input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="123 Main St, Boston, MA" required />
            </div>
            <div className="form-group">
              <label>Destination</label>
              <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="500 5th Ave, New York, NY" required />
            </div>
            <div className="form-group">
              <label>Claimed Miles</label>
              <input type="number" step="0.1" value={claimedMiles} onChange={(e) => setClaimedMiles(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Vehicle (optional)</label>
              <input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="Personal sedan" />
            </div>
            <div className="form-group">
              <label>Rate per Mile (optional)</label>
              <input type="number" step="0.01" value={ratePerMile} onChange={(e) => setRatePerMile(e.target.value)} placeholder="0.67" />
            </div>
            <div className="form-group">
              <label>Notes (optional)</label>
              <textarea value={mileageNotes} onChange={(e) => setMileageNotes(e.target.value)} rows={2} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={mileageLoading}>
              {mileageLoading ? 'Verifying...' : 'Verify Mileage'}
            </button>
          </form>
          {mileageError && <div className="error-msg" style={{ marginTop: 12 }}>{mileageError}</div>}
          {mileageResult && (
            <div style={{ marginTop: 16 }}>
              {mileageResult.verification && (
                <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 12, borderRadius: 6, overflow: 'auto', fontSize: 12 }}>
                  {JSON.stringify(mileageResult.verification, null, 2)}
                </pre>
              )}
              {mileageResult.raw_analysis && (
                <AIResultDisplay
                  result={{ analysis: mileageResult.raw_analysis, model: mileageResult.model, usage: mileageResult.usage }}
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
