import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'

export default function ReportDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState(null)
  const [showAddItem, setShowAddItem] = useState(false)
  const [editingReport, setEditingReport] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [categories, setCategories] = useState([])
  const [vendors, setVendors] = useState([])
  const [itemForm, setItemForm] = useState({ description: '', amount: '', category_id: '', vendor_id: '', expense_date: '', has_receipt: false, notes: '' })
  const [reportForm, setReportForm] = useState({})

  const load = () => api.getReport(id).then(data => { setReport(data); setLoading(false) }).catch(() => setLoading(false))
  useEffect(() => { load(); api.getCategories().then(setCategories).catch(()=>{}); api.getVendors().then(setVendors).catch(()=>{}) }, [id])

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const handleAddItem = async (e) => {
    e.preventDefault()
    await api.createItem({ ...itemForm, report_id: parseInt(id) })
    setShowAddItem(false)
    setItemForm({ description: '', amount: '', category_id: '', vendor_id: '', expense_date: '', has_receipt: false, notes: '' })
    load()
  }

  const handleDeleteItem = async (itemId) => { if (!confirm('Delete this item?')) return; await api.deleteItem(itemId); setSelectedItem(null); load() }
  const handleDeleteReport = async () => { if (!confirm('Delete this entire report?')) return; await api.deleteReport(id); navigate('/expenses') }
  const handleStatusChange = async (status) => { await api.updateReport(id, { status }); load() }

  const handleEditItem = async (e) => { e.preventDefault(); await api.updateItem(editingItem.id, editingItem); setEditingItem(null); load() }
  const handleEditReport = async (e) => { e.preventDefault(); await api.updateReport(id, reportForm); setEditingReport(false); load() }

  if (loading) return <div className="loading"><div className="spinner"></div> Loading...</div>
  if (!report) return <div className="empty-state"><h3>Report not found</h3></div>

  return (
    <div>
      <div className="page-header">
        <div><h1>{report.report_number}</h1><div className="breadcrumb">Expense Reports / {report.title}</div></div>
        <div className="actions">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/expenses')}>{'\u2190'} Back</button>
          <button className="btn btn-secondary btn-sm" onClick={() => { setReportForm({ title: report.title, description: report.description, trip_destination: report.trip_destination }); setEditingReport(true) }}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={handleDeleteReport}>Delete</button>
        </div>
      </div>

      <div className="detail-card">
        <div className="detail-header">
          <h2>{report.title}</h2>
          <div className="actions">
            <span className={`status-badge status-${report.status}`}>{report.status}</span>
            {report.status === 'draft' && <button className="btn btn-primary btn-sm" onClick={() => handleStatusChange('submitted')}>Submit</button>}
            {(report.status === 'submitted' || report.status === 'pending') && <>
              <button className="btn btn-success btn-sm" onClick={() => handleStatusChange('approved')}>Approve</button>
              <button className="btn btn-danger btn-sm" onClick={() => handleStatusChange('rejected')}>Reject</button>
            </>}
          </div>
        </div>
        <div className="detail-body">
          <div className="detail-grid">
            <div className="detail-field"><label>Employee</label><div className="value">{report.employee_name}</div></div>
            <div className="detail-field"><label>Department</label><div className="value">{report.department_name}</div></div>
            <div className="detail-field"><label>Total Amount</label><div className="value amount" style={{fontSize:'24px',color:'#4f46e5'}}>{fmt(report.total_amount)}</div></div>
            <div className="detail-field"><label>Destination</label><div className="value">{report.trip_destination || '-'}</div></div>
            <div className="detail-field"><label>Trip Dates</label><div className="value">{report.trip_start_date ? `${new Date(report.trip_start_date).toLocaleDateString()} - ${new Date(report.trip_end_date).toLocaleDateString()}` : '-'}</div></div>
            <div className="detail-field"><label>Submitted</label><div className="value">{report.submitted_date ? new Date(report.submitted_date).toLocaleDateString() : 'Not submitted'}</div></div>
          </div>
          {report.description && <p style={{marginTop:'16px',color:'#64748b'}}>{report.description}</p>}
        </div>
      </div>

      <div className="data-table-wrapper">
        <div className="data-table-header">
          <h3>Expense Items ({report.items?.length || 0})</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddItem(true)}>+ Add Item</button>
        </div>
        <table className="data-table">
          <thead><tr><th>Description</th><th>Category</th><th>Vendor</th><th>Date</th><th>Amount</th><th>Receipt</th><th>Flag</th></tr></thead>
          <tbody>
            {(report.items || []).map(item => (
              <tr key={item.id} onClick={() => setSelectedItem(item)} style={item.is_flagged ? {background:'#fef2f2'} : {}}>
                <td>{item.description}</td><td>{item.category_name || '-'}</td><td>{item.vendor_name || '-'}</td>
                <td>{new Date(item.expense_date).toLocaleDateString()}</td><td className="amount">{fmt(item.amount)}</td>
                <td>{item.has_receipt ? '\u2705' : '\u274C'}</td><td>{item.is_flagged ? '\u{1F6A9}' : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!report.items || report.items.length === 0) && <div className="empty-state"><h3>No expense items</h3><p>Add your first expense item</p></div>}
      </div>

      {report.approvals && report.approvals.length > 0 && (
        <div className="detail-card mt-24">
          <div className="detail-header"><h2>Approval History</h2></div>
          <div className="detail-body">
            {report.approvals.map(a => (
              <div key={a.id} style={{padding:'12px 0',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><strong>{a.approver_name}</strong> - Level {a.level}{a.comments && <p style={{color:'#64748b',fontSize:'14px',marginTop:'4px'}}>{a.comments}</p>}</div>
                <div style={{textAlign:'right'}}><span className={`status-badge status-${a.status}`}>{a.status}</span>{a.action_date && <div style={{fontSize:'12px',color:'#94a3b8',marginTop:'4px'}}>{new Date(a.action_date).toLocaleDateString()}</div>}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Expense Item Details</h2><button className="btn btn-ghost" onClick={() => setSelectedItem(null)}>{'\u2715'}</button></div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-field"><label>Description</label><div className="value">{selectedItem.description}</div></div>
                <div className="detail-field"><label>Amount</label><div className="value amount">{fmt(selectedItem.amount)}</div></div>
                <div className="detail-field"><label>Category</label><div className="value">{selectedItem.category_name || '-'}</div></div>
                <div className="detail-field"><label>Vendor</label><div className="value">{selectedItem.vendor_name || '-'}</div></div>
                <div className="detail-field"><label>Date</label><div className="value">{new Date(selectedItem.expense_date).toLocaleDateString()}</div></div>
                <div className="detail-field"><label>Receipt</label><div className="value">{selectedItem.has_receipt ? 'Yes' : 'No'}</div></div>
              </div>
              {selectedItem.is_flagged && <div className="error-msg mt-16">{'\u{1F6A9}'} Flagged: {selectedItem.flag_reason}</div>}
              {selectedItem.notes && <p style={{marginTop:'16px',color:'#64748b'}}>Notes: {selectedItem.notes}</p>}
              {selectedItem.ai_risk_score > 0 && <div style={{marginTop:'16px'}}><label style={{fontSize:'12px',fontWeight:600,color:'#64748b'}}>AI RISK SCORE</label><div className={`value ${selectedItem.ai_risk_score >= 7 ? 'risk-high' : selectedItem.ai_risk_score >= 4 ? 'risk-medium' : 'risk-low'}`} style={{fontSize:'20px',fontWeight:700}}>{selectedItem.ai_risk_score}/10</div></div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteItem(selectedItem.id)}>Delete</button>
              <button className="btn btn-primary btn-sm" onClick={() => { setEditingItem({...selectedItem}); setSelectedItem(null) }}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {showAddItem && (
        <div className="modal-overlay" onClick={() => setShowAddItem(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Add Expense Item</h2><button className="btn btn-ghost" onClick={() => setShowAddItem(false)}>{'\u2715'}</button></div>
            <form onSubmit={handleAddItem}>
              <div className="modal-body">
                <div className="form-group"><label>Description</label><input value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} required /></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
                  <div className="form-group"><label>Amount ($)</label><input type="number" step="0.01" value={itemForm.amount} onChange={e => setItemForm({...itemForm, amount: e.target.value})} required /></div>
                  <div className="form-group"><label>Date</label><input type="date" value={itemForm.expense_date} onChange={e => setItemForm({...itemForm, expense_date: e.target.value})} required /></div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
                  <div className="form-group"><label>Category</label><select value={itemForm.category_id} onChange={e => setItemForm({...itemForm, category_id: e.target.value})}><option value="">Select...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  <div className="form-group"><label>Vendor</label><select value={itemForm.vendor_id} onChange={e => setItemForm({...itemForm, vendor_id: e.target.value})}><option value="">Select...</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
                </div>
                <div className="form-group"><label>Notes</label><textarea value={itemForm.notes} onChange={e => setItemForm({...itemForm, notes: e.target.value})} rows={2} /></div>
                <div className="form-group"><label><input type="checkbox" checked={itemForm.has_receipt} onChange={e => setItemForm({...itemForm, has_receipt: e.target.checked})} style={{width:'auto',marginRight:'8px'}} />Has Receipt</label></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowAddItem(false)}>Cancel</button><button type="submit" className="btn btn-primary">Add Item</button></div>
            </form>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Edit Expense Item</h2><button className="btn btn-ghost" onClick={() => setEditingItem(null)}>{'\u2715'}</button></div>
            <form onSubmit={handleEditItem}>
              <div className="modal-body">
                <div className="form-group"><label>Description</label><input value={editingItem.description} onChange={e => setEditingItem({...editingItem, description: e.target.value})} required /></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
                  <div className="form-group"><label>Amount ($)</label><input type="number" step="0.01" value={editingItem.amount} onChange={e => setEditingItem({...editingItem, amount: e.target.value})} required /></div>
                  <div className="form-group"><label>Date</label><input type="date" value={editingItem.expense_date?.split('T')[0]} onChange={e => setEditingItem({...editingItem, expense_date: e.target.value})} required /></div>
                </div>
                <div className="form-group"><label>Notes</label><textarea value={editingItem.notes || ''} onChange={e => setEditingItem({...editingItem, notes: e.target.value})} rows={2} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setEditingItem(null)}>Cancel</button><button type="submit" className="btn btn-primary">Save Changes</button></div>
            </form>
          </div>
        </div>
      )}

      {editingReport && (
        <div className="modal-overlay" onClick={() => setEditingReport(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Edit Report</h2><button className="btn btn-ghost" onClick={() => setEditingReport(false)}>{'\u2715'}</button></div>
            <form onSubmit={handleEditReport}>
              <div className="modal-body">
                <div className="form-group"><label>Title</label><input value={reportForm.title || ''} onChange={e => setReportForm({...reportForm, title: e.target.value})} required /></div>
                <div className="form-group"><label>Description</label><textarea value={reportForm.description || ''} onChange={e => setReportForm({...reportForm, description: e.target.value})} rows={3} /></div>
                <div className="form-group"><label>Destination</label><input value={reportForm.trip_destination || ''} onChange={e => setReportForm({...reportForm, trip_destination: e.target.value})} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setEditingReport(false)}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
