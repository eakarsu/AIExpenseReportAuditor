import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.getStats().then(data => { setStats(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const managementFeatures = [
    { path: '/expenses', icon: '\u{1F4DD}', title: 'Expense Reports', desc: 'View, create and manage expense reports', badge: 'manage', bg: '#eff6ff' },
    { path: '/employees', icon: '\u{1F465}', title: 'Employees', desc: 'Manage employee profiles and spending', badge: 'manage', bg: '#f0fdf4' },
    { path: '/departments', icon: '\u{1F3E2}', title: 'Departments', desc: 'Department budgets and analytics', badge: 'manage', bg: '#fffbeb' },
    { path: '/categories', icon: '\u{1F3F7}\uFE0F', title: 'Categories', desc: 'Expense categories and limits', badge: 'manage', bg: '#fef2f2' },
    { path: '/vendors', icon: '\u{1F3EA}', title: 'Vendors', desc: 'Vendor management and risk scores', badge: 'manage', bg: '#faf5ff' },
    { path: '/policies', icon: '\u{1F4DC}', title: 'Policy Rules', desc: 'Compliance rules and thresholds', badge: 'manage', bg: '#f0fdfa' },
    { path: '/budgets', icon: '\u{1F4B0}', title: 'Budget Limits', desc: 'Department and category budgets', badge: 'analytics', bg: '#fff7ed' },
    { path: '/trips', icon: '\u2708\uFE0F', title: 'Trip Plans', desc: 'Business trip planning and budgets', badge: 'manage', bg: '#eff6ff' },
    { path: '/approvals', icon: '\u2705', title: 'Approvals', desc: 'Expense report approval workflows', badge: 'manage', bg: '#ecfdf5' },
    { path: '/audit-logs', icon: '\u{1F4CB}', title: 'Audit Trail', desc: 'System activity and change log', badge: 'analytics', bg: '#f5f3ff' },
  ]

  const aiFeatures = [
    { path: '/ai/fraud-detection', icon: '\u{1F6E1}\uFE0F', title: 'AI Fraud Detection', desc: 'AI-powered fraud and anomaly detection', badge: 'ai', bg: '#faf5ff' },
    { path: '/ai/anomaly-detection', icon: '\u{1F6A8}', title: 'AI Anomaly Detection', desc: 'Statistical outlier and pattern detection', badge: 'ai', bg: '#fef2f2' },
    { path: '/ai/duplicates', icon: '\u{1F50D}', title: 'AI Duplicate Detection', desc: 'Find duplicate expense submissions', badge: 'ai', bg: '#e0e7ff' },
    { path: '/ai/vendor-risk', icon: '\u26A0\uFE0F', title: 'AI Vendor Risk', desc: 'AI vendor risk assessment', badge: 'ai', bg: '#faf5ff' },
    { path: '/ai/employee-risk', icon: '\u{1F464}', title: 'AI Employee Risk', desc: 'Employee spending risk profiling', badge: 'ai', bg: '#fef2f2' },
    { path: '/ai/policy-check', icon: '\u2696\uFE0F', title: 'AI Policy Compliance', desc: 'Automated policy compliance checking', badge: 'ai', bg: '#ede9fe' },
    { path: '/ai/policy-suggestions', icon: '\u{1F4A1}', title: 'AI Policy Suggestions', desc: 'AI-driven policy optimization and gaps', badge: 'ai', bg: '#fffbeb' },
    { path: '/ai/approval-recommendation', icon: '\u{1F4CB}', title: 'AI Approval Recommender', desc: 'AI recommends approve or reject', badge: 'ai', bg: '#ecfdf5' },
    { path: '/ai/tax-deductions', icon: '\u{1F4B3}', title: 'AI Tax Deductions', desc: 'Identify tax-deductible expenses', badge: 'ai', bg: '#f0fdf4' },
    { path: '/ai/spending-analysis', icon: '\u{1F9E0}', title: 'AI Spending Analysis', desc: 'Pattern analysis and insights', badge: 'ai', bg: '#ede9fe' },
    { path: '/ai/budget-forecast', icon: '\u{1F4C8}', title: 'AI Budget Forecast', desc: 'Predictive budget analytics', badge: 'ai', bg: '#ede9fe' },
    { path: '/ai/department-benchmark', icon: '\u{1F3C6}', title: 'AI Dept Benchmark', desc: 'Compare department efficiency', badge: 'ai', bg: '#fffbeb' },
    { path: '/ai/cost-optimization', icon: '\u{1F4B2}', title: 'AI Cost Optimization', desc: 'Find savings and reduce costs', badge: 'ai', bg: '#f0fdf4' },
    { path: '/ai/smart-search', icon: '\u{1F50E}', title: 'AI Smart Search', desc: 'Natural language expense search', badge: 'ai', bg: '#e0e7ff' },
    { path: '/ai/categorize', icon: '\u{1F916}', title: 'AI Categorization', desc: 'Smart expense categorization', badge: 'ai', bg: '#faf5ff' },
    { path: '/ai/receipt-analysis', icon: '\u{1F9FE}', title: 'AI Receipt Analyzer', desc: 'Extract and validate receipt data', badge: 'ai', bg: '#faf5ff' },
    { path: '/ai/report-summary', icon: '\u{1F4D1}', title: 'AI Report Summary', desc: 'Generate executive summaries', badge: 'ai', bg: '#ede9fe' },
    { path: '/ai/trip-planner', icon: '\u{1F5FA}\uFE0F', title: 'AI Trip Planner', desc: 'Generate day-by-day trip budgets', badge: 'ai', bg: '#e0e7ff' },
    { path: '/ai/currency-validator', icon: '\u{1F4B1}', title: 'AI Currency Converter', desc: 'Foreign currency validation', badge: 'ai', bg: '#f0fdfa' },
    { path: '/ai/audit-report', icon: '\u{1F4D3}', title: 'AI Audit Report Gen', desc: 'Generate full audit reports', badge: 'ai', bg: '#fef2f2' },
  ]

  if (loading) return <div className="loading"><div className="spinner"></div> Loading dashboard...</div>

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <div className="breadcrumb">Welcome back! Here's your expense overview.</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">{'\u{1F4DD}'}</div>
          <div className="stat-value">{stats?.totalReports || 0}</div>
          <div className="stat-label">Total Reports</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">{'\u{23F3}'}</div>
          <div className="stat-value">{stats?.pendingReports || 0}</div>
          <div className="stat-label">Pending Review</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">{'\u{1F6A9}'}</div>
          <div className="stat-value">{stats?.flaggedItems || 0}</div>
          <div className="stat-label">Flagged Items</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">{'\u{1F4B5}'}</div>
          <div className="stat-value">{fmt(stats?.totalSpent || 0)}</div>
          <div className="stat-label">Total Spent</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">{'\u{1F465}'}</div>
          <div className="stat-value">{stats?.totalEmployees || 0}</div>
          <div className="stat-label">Employees</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon teal">{'\u{1F3E2}'}</div>
          <div className="stat-value">{stats?.totalDepartments || 0}</div>
          <div className="stat-label">Departments</div>
        </div>
      </div>

      {/* Recent Reports */}
      {stats?.recentReports?.length > 0 && (
        <div className="data-table-wrapper mb-24">
          <div className="data-table-header">
            <h3>Recent Expense Reports</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/expenses')}>View All</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Report #</th>
                <th>Title</th>
                <th>Employee</th>
                <th>Department</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentReports.map(r => (
                <tr key={r.id} onClick={() => navigate(`/expenses/${r.id}`)}>
                  <td><strong>{r.report_number}</strong></td>
                  <td>{r.title}</td>
                  <td>{r.employee_name}</td>
                  <td>{r.department_name}</td>
                  <td className="amount">{fmt(r.total_amount)}</td>
                  <td><span className={`status-badge status-${r.status}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Spending by Department */}
      {stats?.spendByDepartment?.length > 0 && (
        <div className="data-table-wrapper mb-24">
          <div className="data-table-header">
            <h3>Spending by Department</h3>
          </div>
          <div style={{ padding: '20px' }}>
            {stats.spendByDepartment.map(d => {
              const max = Math.max(...stats.spendByDepartment.map(x => parseFloat(x.total)))
              const pct = max > 0 ? (parseFloat(d.total) / max * 100) : 0
              return (
                <div key={d.name} style={{ marginBottom: '12px' }}>
                  <div className="flex-between" style={{ marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{d.name}</span>
                    <span className="amount" style={{ fontSize: '14px' }}>{fmt(d.total)}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="fill green" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* AI Features Section */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderRadius: '16px', padding: '32px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc)', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, color: 'white', letterSpacing: '0.5px' }}>AI POWERED</span>
          <span style={{ color: '#c4b5fd', fontSize: '14px' }}>20 AI Features</span>
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>AI Intelligence Suite</h2>
        <p style={{ color: '#a5b4fc', marginBottom: '24px', fontSize: '15px' }}>Fraud detection, compliance, forecasting, optimization, and more - all powered by AI</p>
        <div className="feature-grid">
          {aiFeatures.map(f => (
            <div key={f.path} className="feature-card" onClick={() => navigate(f.path)} style={{ background: 'rgba(255,255,255,0.95)' }}>
              <div className="card-icon" style={{ background: f.bg }}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
              <span className="card-badge badge-ai">AI Powered</span>
            </div>
          ))}
        </div>
      </div>

      {/* Management Features */}
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Management Features</h2>
      <div className="feature-grid">
        {managementFeatures.map(f => (
          <div key={f.path} className="feature-card" onClick={() => navigate(f.path)}>
            <div className="card-icon" style={{ background: f.bg }}>{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
            <span className={`card-badge badge-${f.badge}`}>
              {f.badge === 'analytics' ? 'Analytics' : 'Management'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
