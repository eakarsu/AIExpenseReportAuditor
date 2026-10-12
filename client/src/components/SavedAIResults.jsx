import React, { useState } from 'react'
import { api } from '../services/api'
import FormattedAIReport, { readableLabel } from './FormattedAIReport'

export default function SavedAIResults() {
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const nextOpen = !open
    setOpen(nextOpen)
    if (!nextOpen || results.length) return
    setLoading(true)
    setError('')
    try {
      const data = await api.getAIResults()
      setResults(Array.isArray(data.results) ? data.results : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="ai-history" data-saved-ai-results>
      <div className="ai-history-heading">
        <div>
          <span className="ai-eyebrow">Saved analyses</span>
          <h2>AI result history</h2>
          <p>Review persisted results with the same sections, cards, lists, and tables used for new responses.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={load} aria-expanded={open}>
          {open ? 'Hide saved results' : 'View saved results'}
        </button>
      </div>
      {open && (
        <div className="saved-ai-results-list">
          {loading && <p role="status">Loading saved AI results…</p>}
          {error && <div className="ai-alert" role="alert">{error}</div>}
          {!loading && !error && results.length === 0 && <p className="ai-muted">No saved AI results yet.</p>}
          {results.map((entry) => (
            <article className="saved-ai-result-card" data-saved-ai-result key={entry.id}>
              <header>
                <div>
                  <span className="ai-eyebrow">{readableLabel(entry.analysis_type || 'analysis')}</span>
                  <h3>Saved result #{entry.id}</h3>
                </div>
                <div className="saved-ai-result-meta">
                  {entry.report_id && <span>Report #{entry.report_id}</span>}
                  {entry.item_id && <span>Item #{entry.item_id}</span>}
                  {entry.created_at && <time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString()}</time>}
                </div>
              </header>
              <FormattedAIReport
                title={readableLabel(entry.analysis_type || 'AI analysis')}
                response={entry.result}
                model={entry.model_used}
              />
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
