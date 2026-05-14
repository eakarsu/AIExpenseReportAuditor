// Vendor fraud detection: link expenses across employees, identify
// kickback schemes (same vendor, multiple submitters, unusual amounts).
const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/vendor-fraud-detection/suspicious
router.get('/suspicious', auth, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT vendor_id, COUNT(DISTINCT employee_id) as employees, COUNT(*) AS expense_count,
             AVG(amount) as avg_amount, STDDEV(amount) as sd_amount, SUM(amount) as total
      FROM expenses
      WHERE created_at > NOW() - INTERVAL '90 days'
      GROUP BY vendor_id
      HAVING COUNT(*) > 5
    `).catch(() => ({ rows: [] }));

    const suspicious = r.rows.map(row => {
      const cv = row.sd_amount && row.avg_amount ? Number(row.sd_amount) / Number(row.avg_amount) : 0;
      const score = (Number(row.employees) >= 5 ? 0.4 : 0) + (cv > 1 ? 0.3 : 0) + (Number(row.total) > 50000 ? 0.3 : 0);
      return { vendor_id: row.vendor_id, employees: Number(row.employees), expense_count: Number(row.expense_count), total: Math.round(Number(row.total)), suspicion_score: Math.round(score * 100) / 100 };
    }).filter(x => x.suspicion_score >= 0.4).sort((a, b) => b.suspicion_score - a.suspicion_score);
    return res.json({ count: suspicious.length, suspicious });
  } catch (e) {
    return res.status(500).json({ error: 'analysis failed' });
  }
});

module.exports = router;
