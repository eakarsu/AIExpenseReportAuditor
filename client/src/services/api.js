const API = '/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function request(url, options = {}) {
  const res = await fetch(`${API}${url}`, {
    ...options,
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getDemoCredentials: () => request('/auth/demo-credentials'),

  // Dashboard
  getStats: () => request('/dashboard/stats'),

  // Expenses
  getReports: () => request('/expenses/reports'),
  getReport: (id) => request(`/expenses/reports/${id}`),
  createReport: (data) => request('/expenses/reports', { method: 'POST', body: JSON.stringify(data) }),
  updateReport: (id, data) => request(`/expenses/reports/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteReport: (id) => request(`/expenses/reports/${id}`, { method: 'DELETE' }),
  getReportItems: (id) => request(`/expenses/reports/${id}/items`),
  createItem: (data) => request('/expenses/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id, data) => request(`/expenses/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (id) => request(`/expenses/items/${id}`, { method: 'DELETE' }),

  // Employees
  getEmployees: () => request('/employees'),
  getEmployee: (id) => request(`/employees/${id}`),
  createEmployee: (data) => request('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id, data) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployee: (id) => request(`/employees/${id}`, { method: 'DELETE' }),

  // Departments
  getDepartments: () => request('/departments'),
  getDepartment: (id) => request(`/departments/${id}`),
  createDepartment: (data) => request('/departments', { method: 'POST', body: JSON.stringify(data) }),
  updateDepartment: (id, data) => request(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDepartment: (id) => request(`/departments/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: () => request('/categories'),
  getCategory: (id) => request(`/categories/${id}`),
  createCategory: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Vendors
  getVendors: () => request('/vendors'),
  getVendor: (id) => request(`/vendors/${id}`),
  createVendor: (data) => request('/vendors', { method: 'POST', body: JSON.stringify(data) }),
  updateVendor: (id, data) => request(`/vendors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVendor: (id) => request(`/vendors/${id}`, { method: 'DELETE' }),

  // Policies
  getPolicies: () => request('/policies'),
  getPolicy: (id) => request(`/policies/${id}`),
  createPolicy: (data) => request('/policies', { method: 'POST', body: JSON.stringify(data) }),
  updatePolicy: (id, data) => request(`/policies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePolicy: (id) => request(`/policies/${id}`, { method: 'DELETE' }),

  // Budgets
  getBudgets: () => request('/budgets'),
  getBudget: (id) => request(`/budgets/${id}`),
  createBudget: (data) => request('/budgets', { method: 'POST', body: JSON.stringify(data) }),
  updateBudget: (id, data) => request(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBudget: (id) => request(`/budgets/${id}`, { method: 'DELETE' }),

  // Trips
  getTrips: () => request('/trips'),
  getTrip: (id) => request(`/trips/${id}`),
  createTrip: (data) => request('/trips', { method: 'POST', body: JSON.stringify(data) }),
  updateTrip: (id, data) => request(`/trips/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTrip: (id) => request(`/trips/${id}`, { method: 'DELETE' }),

  // Approvals
  getApprovals: () => request('/approvals'),
  getApproval: (id) => request(`/approvals/${id}`),
  createApproval: (data) => request('/approvals', { method: 'POST', body: JSON.stringify(data) }),
  updateApproval: (id, data) => request(`/approvals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteApproval: (id) => request(`/approvals/${id}`, { method: 'DELETE' }),

  // Audit Logs
  getAuditLogs: () => request('/audit-logs'),
  getAuditLog: (id) => request(`/audit-logs/${id}`),

  // AI Features
  fraudDetection: (reportId) => request(`/ai/fraud-detection/${reportId}`, { method: 'POST' }),
  policyCheck: (reportId) => request(`/ai/policy-check/${reportId}`, { method: 'POST' }),
  duplicateDetection: (reportId) => request(`/ai/duplicate-detection/${reportId}`, { method: 'POST' }),
  categorizeExpense: (data) => request('/ai/categorize', { method: 'POST', body: JSON.stringify(data) }),
  budgetForecast: () => request('/ai/budget-forecast', { method: 'POST' }),
  tripPlanner: (data) => request('/ai/trip-planner', { method: 'POST', body: JSON.stringify(data) }),
  vendorRisk: (vendorId) => request(`/ai/vendor-risk/${vendorId}`, { method: 'POST' }),
  spendingAnalysis: (data) => request('/ai/spending-analysis', { method: 'POST', body: JSON.stringify(data) }),
  smartSearch: (query) => request('/ai/smart-search', { method: 'POST', body: JSON.stringify({ query }) }),
  receiptAnalysis: (data) => request('/ai/receipt-analysis', { method: 'POST', body: JSON.stringify(data) }),
  reportSummary: (reportId) => request(`/ai/report-summary/${reportId}`, { method: 'POST' }),
  employeeRisk: (employeeId) => request(`/ai/employee-risk/${employeeId}`, { method: 'POST' }),
  departmentBenchmark: () => request('/ai/department-benchmark', { method: 'POST' }),
  approvalRecommendation: (reportId) => request(`/ai/approval-recommendation/${reportId}`, { method: 'POST' }),
  anomalyDetection: () => request('/ai/anomaly-detection', { method: 'POST' }),
  policySuggestions: () => request('/ai/policy-suggestions', { method: 'POST' }),
  costOptimization: () => request('/ai/cost-optimization', { method: 'POST' }),
  taxDeductions: (reportId) => request(`/ai/tax-deductions/${reportId}`, { method: 'POST' }),
  auditReport: () => request('/ai/audit-report', { method: 'POST' }),
  currencyValidator: (data) => request('/ai/currency-validator', { method: 'POST', body: JSON.stringify(data) }),
};
