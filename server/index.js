const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/policies', require('./routes/policies'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/trips', require('./routes/trips'));
app.use('/api/approvals', require('./routes/approvals'));
app.use('/api/audit-logs', require('./routes/audit-logs'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/ai', require('./routes/aiNew'));
app.use('/api/scheduled-scans', require('./routes/scheduledScans'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/agentic-auditor', require('./routes/agenticAuditor'));
app.use('/api/synthetic-receipt', require('./routes/syntheticReceiptDetector'));
app.use('/api/realtime-expense-monitor', require('./routes/realtimeExpenseMonitor'));
app.use('/api/compliance-automation', require('./routes/complianceAutomation'));
app.use('/api/tax-optimization', require('./routes/taxOptimization'));
app.use('/api/vendor-fraud-detection', require('./routes/vendorFraudDetection'));
app.use('/api/travel-policy', require('./routes/travelPolicyEnforcement'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));


// === Batch 03 Gaps & Frontend Mounts ===
try {
  const _batch03 = require('./routes/batch03Gaps');
  if (typeof authenticateToken === 'function') app.use('/api', authenticateToken, _batch03);
  else app.use('/api', _batch03);
} catch (_e) { /* batch03 gap routes optional */ }

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
