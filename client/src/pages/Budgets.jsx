import React, { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function Budgets() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [departments, setDepartments] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({ department_id: '', category_id: '', period: 'monthly', limit_amount: '', alert_threshold: 80, fiscal_year: 2024 })

  const load = () => api.getBudgets().then(setItems).finally(() => setLoading(false))
  useEffect(() => { load(); api.getDepartments().then(setDepartments).catch(()=>{}); api.getCategories().then(setCategories).catch(()=>{}) }, [])
  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)

  const handleCreate = async (e) => { e.preventDefault(); await api.createBudget(form); setShowModal(false); setForm({ department_id: '', category_id: '', period: 'monthly', limit_amount: '', alert_threshold: 80, fiscal_year: 2024 }); load() }
  const handleEdit = async (e) => { e.preventDefault(); await api.updateBudget(editing.id, editing); setEditing(null); load() }
  const handleDelete = async (id) => { if (!confirm('Delete?')) return; await api.deleteBudget(id); setSelected(null); load() }

  if (loading) return <div className="loading"><div className="spinner"></div> Loading...</div>
  return (
    <div>
      <div className="page-header"><div><h1>Budget Limits</h1><div className="breadcrumb">Department and category budget management</div></div><button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Budget</button></div>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Department</th><th>Category</th><th>Period</th><th>Limit</th><th>Spent</th><th>Utilization</th><th>Year</th></tr></thead>
          <tbody>{items.map(i => {
            const pct = parseFloat(i.limit_amount) > 0 ? (parseFloat(i.spent_amount)/parseFloat(i.limit_amount)*100) : 0
            return (
            <tr key={i.id} onClick={() => setSelected(i)} style={pct > parseFloat(i.alert_threshold) ? {background:'#fffbeb'} : {}}>
              <td><strong>{i.department_name||'-'}</strong></td><td>{i.category_name||'-'}</td><td>{i.period}</td>
              <td className="amount">{fmt(i.limit_amount)}</td><td className="amount">{fmt(i.spent_amount)}</td>
              <td><div style={{display:'flex',alignItems:'center',gap:'8px'}}><div className="progress-bar" style={{width:'80px',height:'8px'}}><div className={`fill ${pct>90?'red':pct>70?'yellow':'green'}`} style={{width:`${Math.min(pct,100)}%`}}></div></div><span style={{fontSize:'13px',fontWeight:600}}>{pct.toFixed(0)}%</span></div></td>
              <td>{i.fiscal_year}</td>
            </tr>)
          })}</tbody>
        </table>
      </div>

      {selected && <div className="modal-overlay" onClick={() => setSelected(null)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Budget Details</h2><button className="btn btn-ghost" onClick={() => setSelected(null)}>{'\u2715'}</button></div>
        <div className="modal-body"><div className="detail-grid">
          <div className="detail-field"><label>Department</label><div className="value">{selected.department_name||'-'}</div></div>
          <div className="detail-field"><label>Category</label><div className="value">{selected.category_name||'-'}</div></div>
          <div className="detail-field"><label>Period</label><div className="value">{selected.period}</div></div>
          <div className="detail-field"><label>Limit</label><div className="value amount">{fmt(selected.limit_amount)}</div></div>
          <div className="detail-field"><label>Spent</label><div className="value amount">{fmt(selected.spent_amount)}</div></div>
          <div className="detail-field"><label>Remaining</label><div className="value amount">{fmt(parseFloat(selected.limit_amount)-parseFloat(selected.spent_amount))}</div></div>
          <div className="detail-field"><label>Alert Threshold</label><div className="value">{selected.alert_threshold}%</div></div>
          <div className="detail-field"><label>Fiscal Year</label><div className="value">{selected.fiscal_year}</div></div>
        </div>
        <div style={{marginTop:'16px'}}><label style={{fontSize:'12px',fontWeight:600,color:'#64748b'}}>UTILIZATION</label>
          {(() => { const p = parseFloat(selected.limit_amount)>0?(parseFloat(selected.spent_amount)/parseFloat(selected.limit_amount)*100):0; return (<><div className="progress-bar" style={{height:'14px'}}><div className={`fill ${p>90?'red':p>70?'yellow':'green'}`} style={{width:`${Math.min(p,100)}%`}}></div></div><div style={{fontSize:'14px',fontWeight:600,marginTop:'4px'}}>{p.toFixed(1)}%</div></>)})()}
        </div></div>
        <div className="modal-footer"><button className="btn btn-danger btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button><button className="btn btn-primary btn-sm" onClick={() => { setEditing({...selected}); setSelected(null) }}>Edit</button></div>
      </div></div>}

      {showModal && <div className="modal-overlay" onClick={() => setShowModal(false)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>New Budget Limit</h2><button className="btn btn-ghost" onClick={() => setShowModal(false)}>{'\u2715'}</button></div>
        <form onSubmit={handleCreate}><div className="modal-body">
          <div className="form-group"><label>Department</label><select value={form.department_id} onChange={e => setForm({...form, department_id: e.target.value})} required><option value="">Select...</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          <div className="form-group"><label>Category</label><select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} required><option value="">Select...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="form-group"><label>Period</label><select value={form.period} onChange={e => setForm({...form, period: e.target.value})}><option>monthly</option><option>quarterly</option><option>annual</option></select></div>
          <div className="form-group"><label>Limit Amount ($)</label><input type="number" value={form.limit_amount} onChange={e => setForm({...form, limit_amount: e.target.value})} required /></div>
          <div className="form-group"><label>Alert Threshold (%)</label><input type="number" value={form.alert_threshold} onChange={e => setForm({...form, alert_threshold: e.target.value})} /></div>
        </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div></form>
      </div></div>}

      {editing && <div className="modal-overlay" onClick={() => setEditing(null)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Edit Budget</h2><button className="btn btn-ghost" onClick={() => setEditing(null)}>{'\u2715'}</button></div>
        <form onSubmit={handleEdit}><div className="modal-body">
          <div className="form-group"><label>Limit Amount ($)</label><input type="number" value={editing.limit_amount} onChange={e => setEditing({...editing, limit_amount: e.target.value})} required /></div>
          <div className="form-group"><label>Alert Threshold (%)</label><input type="number" value={editing.alert_threshold} onChange={e => setEditing({...editing, alert_threshold: e.target.value})} /></div>
          <div className="form-group"><label>Period</label><select value={editing.period} onChange={e => setEditing({...editing, period: e.target.value})}><option>monthly</option><option>quarterly</option><option>annual</option></select></div>
        </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div></form>
      </div></div>}
    </div>
  )
}
