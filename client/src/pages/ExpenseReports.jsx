import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

export default function ExpenseReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', employee_id: 1, department_id: 1, trip_destination: '', trip_start_date: '', trip_end_date: '' })
  const navigate = useNavigate()

  const load = () => api.getReports().then(setReports).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const handleCreate = async (e) => {
    e.preventDefault()
    await api.createReport(form)
    setShowModal(false)
    setForm({ title: '', description: '', employee_id: 1, department_id: 1, trip_destination: '', trip_start_date: '', trip_end_date: '' })
    load()
  }

  if (loading) return <div className="loading"><div className="spinner"></div> Loading...</div>

  return (
    <div>
      <div className="page-header">
        <div><h1>Expense Reports</h1><div className="breadcrumb">Manage all expense reports</div></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Report</button>
      </div>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Report #</th><th>Title</th><th>Employee</th><th>Department</th><th>Destination</th><th>Amount</th><th>Status</th><th>Submitted</th></tr></thead>
          <tbody>
            {reports.map(r => (
              <tr key={r.id} onClick={() => navigate(`/expenses/${r.id}`)}>
                <td><strong>{r.report_number}</strong></td>
                <td>{r.title}</td>
                <td>{r.employee_name}</td>
                <td>{r.department_name}</td>
                <td>{r.trip_destination || '-'}</td>
                <td className="amount">{fmt(r.total_amount)}</td>
                <td><span className={`status-badge status-${r.status}`}>{r.status}</span></td>
                <td>{r.submitted_date ? new Date(r.submitted_date).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {reports.length === 0 && <div className="empty-state"><div className="icon">{'\u{1F4DD}'}</div><h3>No expense reports</h3><p>Create your first report</p></div>}
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>New Expense Report</h2><button className="btn btn-ghost" onClick={() => setShowModal(false)}>{'\u2715'}</button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group"><label>Title</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
                <div className="form-group"><label>Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} /></div>
                <div className="form-group"><label>Trip Destination</label><input value={form.trip_destination} onChange={e => setForm({...form, trip_destination: e.target.value})} /></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
                  <div className="form-group"><label>Start Date</label><input type="date" value={form.trip_start_date} onChange={e => setForm({...form, trip_start_date: e.target.value})} /></div>
                  <div className="form-group"><label>End Date</label><input type="date" value={form.trip_end_date} onChange={e => setForm({...form, trip_end_date: e.target.value})} /></div>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create Report</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
