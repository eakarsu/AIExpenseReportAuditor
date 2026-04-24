import React, { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function Approvals() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ report_id: '', approver_id: '', level: 1 })
  const [reports, setReports] = useState([])
  const [employees, setEmployees] = useState([])

  const load = () => api.getApprovals().then(setItems).finally(() => setLoading(false))
  useEffect(() => { load(); api.getReports().then(setReports).catch(()=>{}); api.getEmployees().then(setEmployees).catch(()=>{}) }, [])
  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const handleCreate = async (e) => { e.preventDefault(); await api.createApproval(form); setShowModal(false); setForm({ report_id: '', approver_id: '', level: 1 }); load() }
  const handleAction = async (id, status, comments) => { await api.updateApproval(id, { status, comments: comments || '' }); setSelected(null); load() }
  const handleDelete = async (id) => { if (!confirm('Delete?')) return; await api.deleteApproval(id); setSelected(null); load() }

  if (loading) return <div className="loading"><div className="spinner"></div> Loading...</div>
  return (
    <div>
      <div className="page-header"><div><h1>Approval Workflows</h1><div className="breadcrumb">Expense report approval management</div></div><button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Approval</button></div>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Report</th><th>Title</th><th>Submitter</th><th>Approver</th><th>Amount</th><th>Level</th><th>Status</th></tr></thead>
          <tbody>{items.map(i => (
            <tr key={i.id} onClick={() => setSelected(i)}>
              <td><strong>{i.report_number}</strong></td><td>{i.report_title}</td><td>{i.submitter_name}</td><td>{i.approver_name}</td>
              <td className="amount">{fmt(i.total_amount)}</td><td>Level {i.level}</td>
              <td><span className={`status-badge status-${i.status}`}>{i.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {selected && <div className="modal-overlay" onClick={() => setSelected(null)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Approval Details</h2><button className="btn btn-ghost" onClick={() => setSelected(null)}>{'\u2715'}</button></div>
        <div className="modal-body"><div className="detail-grid">
          <div className="detail-field"><label>Report</label><div className="value">{selected.report_number} - {selected.report_title}</div></div>
          <div className="detail-field"><label>Amount</label><div className="value amount">{fmt(selected.total_amount)}</div></div>
          <div className="detail-field"><label>Submitter</label><div className="value">{selected.submitter_name}</div></div>
          <div className="detail-field"><label>Approver</label><div className="value">{selected.approver_name}</div></div>
          <div className="detail-field"><label>Level</label><div className="value">Level {selected.level}</div></div>
          <div className="detail-field"><label>Status</label><div className="value"><span className={`status-badge status-${selected.status}`}>{selected.status}</span></div></div>
        </div>
        {selected.comments && <p style={{marginTop:'16px',color:'#64748b'}}>Comments: {selected.comments}</p>}
        {selected.action_date && <p style={{color:'#64748b',fontSize:'13px'}}>Action Date: {new Date(selected.action_date).toLocaleString()}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button>
          {selected.status === 'pending' && <>
            <button className="btn btn-danger btn-sm" onClick={() => handleAction(selected.id, 'rejected', prompt('Rejection reason:'))}>Reject</button>
            <button className="btn btn-success btn-sm" onClick={() => handleAction(selected.id, 'approved', 'Approved')}>Approve</button>
          </>}
        </div>
      </div></div>}

      {showModal && <div className="modal-overlay" onClick={() => setShowModal(false)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>New Approval</h2><button className="btn btn-ghost" onClick={() => setShowModal(false)}>{'\u2715'}</button></div>
        <form onSubmit={handleCreate}><div className="modal-body">
          <div className="form-group"><label>Report</label><select value={form.report_id} onChange={e => setForm({...form, report_id: e.target.value})} required><option value="">Select...</option>{reports.map(r => <option key={r.id} value={r.id}>{r.report_number} - {r.title}</option>)}</select></div>
          <div className="form-group"><label>Approver</label><select value={form.approver_id} onChange={e => setForm({...form, approver_id: e.target.value})} required><option value="">Select...</option>{employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
          <div className="form-group"><label>Level</label><input type="number" min="1" value={form.level} onChange={e => setForm({...form, level: e.target.value})} /></div>
        </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div></form>
      </div></div>}
    </div>
  )
}
