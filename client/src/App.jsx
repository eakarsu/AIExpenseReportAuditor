import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ExpenseReports from './pages/ExpenseReports'
import ReportDetail from './pages/ReportDetail'
import Employees from './pages/Employees'
import Departments from './pages/Departments'
import Categories from './pages/Categories'
import Vendors from './pages/Vendors'
import Policies from './pages/Policies'
import Budgets from './pages/Budgets'
import TripPlans from './pages/TripPlans'
import Approvals from './pages/Approvals'
import AuditLogs from './pages/AuditLogs'
import AIFraudDetection from './pages/AIFraudDetection'
import AIPolicyCheck from './pages/AIPolicyCheck'
import AIDuplicateDetection from './pages/AIDuplicateDetection'
import AICategoriztion from './pages/AICategorization'
import AIBudgetForecast from './pages/AIBudgetForecast'
import AITripPlanner from './pages/AITripPlanner'
import AIVendorRisk from './pages/AIVendorRisk'
import AISpendingAnalysis from './pages/AISpendingAnalysis'
import AISmartSearch from './pages/AISmartSearch'
import AIReceiptAnalysis from './pages/AIReceiptAnalysis'
import AIReportSummary from './pages/AIReportSummary'
import AIEmployeeRisk from './pages/AIEmployeeRisk'
import AIDepartmentBenchmark from './pages/AIDepartmentBenchmark'
import AIApprovalRecommendation from './pages/AIApprovalRecommendation'
import AIAnomalyDetection from './pages/AIAnomalyDetection'
import AIPolicySuggestions from './pages/AIPolicySuggestions'
import AICostOptimization from './pages/AICostOptimization'
import AITaxDeductions from './pages/AITaxDeductions'
import AIAuditReport from './pages/AIAuditReport'
import AICurrencyValidator from './pages/AICurrencyValidator'

function Sidebar({ user, onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  const links = [
    { section: 'Overview', items: [
      { path: '/dashboard', icon: '\u{1F4CA}', label: 'Dashboard' },
    ]},
    { section: 'Management', items: [
      { path: '/expenses', icon: '\u{1F4DD}', label: 'Expense Reports' },
      { path: '/employees', icon: '\u{1F465}', label: 'Employees' },
      { path: '/departments', icon: '\u{1F3E2}', label: 'Departments' },
      { path: '/categories', icon: '\u{1F3F7}\uFE0F', label: 'Categories' },
      { path: '/vendors', icon: '\u{1F3EA}', label: 'Vendors' },
      { path: '/policies', icon: '\u{1F4DC}', label: 'Policy Rules' },
      { path: '/budgets', icon: '\u{1F4B0}', label: 'Budget Limits' },
      { path: '/trips', icon: '\u2708\uFE0F', label: 'Trip Plans' },
      { path: '/approvals', icon: '\u2705', label: 'Approvals' },
      { path: '/audit-logs', icon: '\u{1F4CB}', label: 'Audit Trail' },
    ]},
    { section: 'AI - Fraud & Risk', items: [
      { path: '/ai/fraud-detection', icon: '\u{1F6E1}\uFE0F', label: 'Fraud Detection' },
      { path: '/ai/anomaly-detection', icon: '\u{1F6A8}', label: 'Anomaly Detection' },
      { path: '/ai/duplicates', icon: '\u{1F50D}', label: 'Duplicate Detection' },
      { path: '/ai/vendor-risk', icon: '\u26A0\uFE0F', label: 'Vendor Risk' },
      { path: '/ai/employee-risk', icon: '\u{1F464}', label: 'Employee Risk Profile' },
    ]},
    { section: 'AI - Compliance & Policy', items: [
      { path: '/ai/policy-check', icon: '\u2696\uFE0F', label: 'Policy Compliance' },
      { path: '/ai/policy-suggestions', icon: '\u{1F4A1}', label: 'Policy Suggestions' },
      { path: '/ai/approval-recommendation', icon: '\u{1F4CB}', label: 'Approval AI' },
      { path: '/ai/tax-deductions', icon: '\u{1F4B3}', label: 'Tax Deductions' },
    ]},
    { section: 'AI - Analytics & Insights', items: [
      { path: '/ai/spending-analysis', icon: '\u{1F9E0}', label: 'Spending Analysis' },
      { path: '/ai/budget-forecast', icon: '\u{1F4C8}', label: 'Budget Forecast' },
      { path: '/ai/department-benchmark', icon: '\u{1F3C6}', label: 'Dept Benchmark' },
      { path: '/ai/cost-optimization', icon: '\u{1F4B2}', label: 'Cost Optimization' },
    ]},
    { section: 'AI - Tools', items: [
      { path: '/ai/smart-search', icon: '\u{1F50E}', label: 'Smart Search' },
      { path: '/ai/categorize', icon: '\u{1F916}', label: 'Smart Categorization' },
      { path: '/ai/receipt-analysis', icon: '\u{1F9FE}', label: 'Receipt Analyzer' },
      { path: '/ai/report-summary', icon: '\u{1F4D1}', label: 'Report Summary' },
      { path: '/ai/trip-planner', icon: '\u{1F5FA}\uFE0F', label: 'Trip Budget Planner' },
      { path: '/ai/currency-validator', icon: '\u{1F4B1}', label: 'Currency Converter' },
      { path: '/ai/audit-report', icon: '\u{1F4D3}', label: 'Audit Report Gen' },
    ]},
  ]

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2><span className="logo-sm">{'\u{1F4B8}'}</span> ExpenseAI</h2>
      </div>
      {links.map(section => {
        const isAI = section.section.startsWith('AI')
        return (
        <div className="sidebar-section" key={section.section} style={isAI ? { borderLeft: '2px solid #818cf8', marginLeft: '8px', paddingLeft: '0' } : {}}>
          <div className="sidebar-section-title" style={isAI ? { color: '#a5b4fc' } : {}}>
            {isAI && <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#818cf8', marginRight: '6px' }}></span>}
            {section.section}
          </div>
          {section.items.map(item => (
            <button
              key={item.path}
              className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )})}
      <div className="sidebar-user">
        <div className="avatar">{user?.full_name?.[0] || 'U'}</div>
        <div className="info">
          <div className="name">{user?.full_name}</div>
          <div className="role">{user?.role}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onLogout} title="Logout">{'\u{1F6AA}'}</button>
      </div>
    </div>
  )
}

function AppLayout({ children, user, onLogout }) {
  return (
    <div className="app-layout">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="main-content">{children}</div>
    </div>
  )
}

function ProtectedRoute({ user, onLogout, children }) {
  if (!user) return <Navigate to="/login" />
  return <AppLayout user={user} onLogout={onLogout}>{children}</AppLayout>
}

function P({ user, onLogout, children }) {
  return <ProtectedRoute user={user} onLogout={onLogout}>{children}</ProtectedRoute>
}

export default function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const saved = localStorage.getItem('user')
    if (token && saved) {
      try { setUser(JSON.parse(saved)) } catch { localStorage.clear() }
    }
  }, [])

  const handleLogin = (userData) => {
    setUser(userData.user)
    localStorage.setItem('token', userData.token)
    localStorage.setItem('user', JSON.stringify(userData.user))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.clear()
  }

  const p = { user, onLogout: handleLogout }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} />
        {/* Management */}
        <Route path="/dashboard" element={<P {...p}><Dashboard /></P>} />
        <Route path="/expenses" element={<P {...p}><ExpenseReports /></P>} />
        <Route path="/expenses/:id" element={<P {...p}><ReportDetail /></P>} />
        <Route path="/employees" element={<P {...p}><Employees /></P>} />
        <Route path="/departments" element={<P {...p}><Departments /></P>} />
        <Route path="/categories" element={<P {...p}><Categories /></P>} />
        <Route path="/vendors" element={<P {...p}><Vendors /></P>} />
        <Route path="/policies" element={<P {...p}><Policies /></P>} />
        <Route path="/budgets" element={<P {...p}><Budgets /></P>} />
        <Route path="/trips" element={<P {...p}><TripPlans /></P>} />
        <Route path="/approvals" element={<P {...p}><Approvals /></P>} />
        <Route path="/audit-logs" element={<P {...p}><AuditLogs /></P>} />
        {/* AI - Fraud & Risk */}
        <Route path="/ai/fraud-detection" element={<P {...p}><AIFraudDetection /></P>} />
        <Route path="/ai/anomaly-detection" element={<P {...p}><AIAnomalyDetection /></P>} />
        <Route path="/ai/duplicates" element={<P {...p}><AIDuplicateDetection /></P>} />
        <Route path="/ai/vendor-risk" element={<P {...p}><AIVendorRisk /></P>} />
        <Route path="/ai/employee-risk" element={<P {...p}><AIEmployeeRisk /></P>} />
        {/* AI - Compliance & Policy */}
        <Route path="/ai/policy-check" element={<P {...p}><AIPolicyCheck /></P>} />
        <Route path="/ai/policy-suggestions" element={<P {...p}><AIPolicySuggestions /></P>} />
        <Route path="/ai/approval-recommendation" element={<P {...p}><AIApprovalRecommendation /></P>} />
        <Route path="/ai/tax-deductions" element={<P {...p}><AITaxDeductions /></P>} />
        {/* AI - Analytics & Insights */}
        <Route path="/ai/spending-analysis" element={<P {...p}><AISpendingAnalysis /></P>} />
        <Route path="/ai/budget-forecast" element={<P {...p}><AIBudgetForecast /></P>} />
        <Route path="/ai/department-benchmark" element={<P {...p}><AIDepartmentBenchmark /></P>} />
        <Route path="/ai/cost-optimization" element={<P {...p}><AICostOptimization /></P>} />
        {/* AI - Tools */}
        <Route path="/ai/smart-search" element={<P {...p}><AISmartSearch /></P>} />
        <Route path="/ai/categorize" element={<P {...p}><AICategoriztion /></P>} />
        <Route path="/ai/receipt-analysis" element={<P {...p}><AIReceiptAnalysis /></P>} />
        <Route path="/ai/report-summary" element={<P {...p}><AIReportSummary /></P>} />
        <Route path="/ai/trip-planner" element={<P {...p}><AITripPlanner /></P>} />
        <Route path="/ai/currency-validator" element={<P {...p}><AICurrencyValidator /></P>} />
        <Route path="/ai/audit-report" element={<P {...p}><AIAuditReport /></P>} />
        {/* Catch-all */}
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  )
}
