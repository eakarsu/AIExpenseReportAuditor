import React, { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function AuditLogs() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => { api.getAuditLogs().then(setItems).finally(() => setLoading(false)) }, [])

  const actionColors = { create_report: '#10b981', submit_report: '#3b82f6', approve_report: '#10b981', reject_report: '#ef4444', flag_item: '#f59e0b', run_audit: '#8b5cf6', run_analysis: '#8b5cf6', update_policy: '#f59e0b', add_vendor: '#3b82f6', update_budget: '#f59e0b' }

  if (loading) return <div className="loading"><div className="spinner"></div> Loading...</div>
  return (
    <div>
      <div className="page-header"><div><h1>Audit Trail</h1><div className="breadcrumb">System activity and change log</div></div></div>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Entity</th><th>Entity ID</th></tr></thead>
          <tbody>{items.map(i => (
            <tr key={i.id} onClick={() => setSelected(i)}>
              <td>{new Date(i.created_at).toLocaleString()}</td><td>{i.user_name||'-'}</td>
              <td><span style={{color:actionColors[i.action]||'#64748b',fontWeight:600}}>{i.action.replace(/_/g,' ')}</span></td>
              <td>{i.entity_type?.replace(/_/g,' ')||'-'}</td><td>{i.entity_id||'-'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {selected && <div className="modal-overlay" onClick={() => setSelected(null)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Audit Log Details</h2><button className="btn btn-ghost" onClick={() => setSelected(null)}>{'\u2715'}</button></div>
        <div className="modal-body"><div className="detail-grid">
          <div className="detail-field"><label>Timestamp</label><div className="value">{new Date(selected.created_at).toLocaleString()}</div></div>
          <div className="detail-field"><label>User</label><div className="value">{selected.user_name} ({selected.user_email})</div></div>
          <div className="detail-field"><label>Action</label><div className="value" style={{color:actionColors[selected.action],fontWeight:600}}>{selected.action.replace(/_/g,' ')}</div></div>
          <div className="detail-field"><label>Entity</label><div className="value">{selected.entity_type?.replace(/_/g,' ')} #{selected.entity_id}</div></div>
        </div>
        {selected.details && <div style={{marginTop:'16px'}}><label style={{fontSize:'12px',fontWeight:600,color:'#64748b'}}>DETAILS</label>
          <div style={{marginTop:'8px',background:'#f8fafc',padding:'16px',borderRadius:'8px',border:'1px solid #e2e8f0'}}>
            {Object.entries(typeof selected.details === 'string' ? JSON.parse(selected.details) : selected.details).map(([k,v]) => (
              <div key={k} style={{marginBottom:'4px'}}><strong style={{color:'#4f46e5'}}>{k}:</strong> {typeof v === 'object' ? JSON.stringify(v) : String(v)}</div>
            ))}
          </div>
        </div>}
        </div>
      </div></div>}
    </div>
  )
}
