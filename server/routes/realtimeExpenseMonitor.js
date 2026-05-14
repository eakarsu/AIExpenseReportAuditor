// Real-time expense monitoring: alert manager on suspicious expense.
const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// POST /api/realtime-expense-monitor/check { expense_id }
router.post('/check', auth, async (req, res) => {
  try {
    const { expense_id } = req.body || {};
    if (!expense_id) return res.status(400).json({ error: 'expense_id required' });
    const r = await db.query(`SELECT * FROM expenses WHERE id = $1`, [expense_id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'expense not found' });
    const e = r.rows[0];

    const flags = [];
    if (Number(e.amount) > Number(process.env.EXPENSE_FLAG_AMOUNT || 1000)) flags.push('amount_over_threshold');
    if (e.is_weekend) flags.push('weekend_charge');
    try {
      const v = await db.query(`SELECT count(*) FROM expenses WHERE vendor_id = $1 AND employee_id = $2 AND created_at > NOW() - INTERVAL '7 days'`, [e.vendor_id, e.employee_id]);
      if (Number(v.rows[0].count) > 5) flags.push('vendor_frequency_high');
    } catch {}

    if (flags.length) {
      try {
        await db.query(`INSERT INTO audit_logs (expense_id, kind, payload, created_at) VALUES ($1,'realtime_alert',$2,NOW())`, [expense_id, JSON.stringify(flags)]);
      } catch {}
    }
    return res.json({ expense_id, flags, requires_manager_review: flags.length >= 2 });
  } catch (e) {
    return res.status(500).json({ error: 'check failed' });
  }
});

module.exports = router;
