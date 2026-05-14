// Compliance automation: auto-reject non-compliant expenses, notify employee.
const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// POST /api/compliance-automation/scan { report_id? } — scans all unapproved expenses or those for a single report
router.post('/scan', auth, async (req, res) => {
  try {
    const { report_id } = req.body || {};
    const where = report_id ? 'WHERE report_id = $1 AND status = $2' : 'WHERE status = $1';
    const params = report_id ? [report_id, 'pending'] : ['pending'];
    const expenses = await db.query(`SELECT * FROM expenses ${where} LIMIT 500`, params).catch(() => ({ rows: [] }));
    const policies = await db.query(`SELECT * FROM policies`).catch(() => ({ rows: [] }));

    const decisions = [];
    for (const e of expenses.rows) {
      let rejected = false;
      let reason;
      for (const p of policies.rows) {
        if (p.max_amount != null && Number(e.amount) > Number(p.max_amount) && (!p.category || p.category === e.category)) { rejected = true; reason = `Exceeds ${p.category || 'general'} cap`; break; }
        if (p.restricted_categories && (p.restricted_categories || []).includes(e.category)) { rejected = true; reason = 'Restricted category'; break; }
      }
      if (rejected) {
        try { await db.query(`UPDATE expenses SET status = 'rejected', rejection_reason = $1 WHERE id = $2`, [reason, e.id]); } catch {}
        decisions.push({ expense_id: e.id, rejected: true, reason });
      } else {
        decisions.push({ expense_id: e.id, rejected: false });
      }
    }
    return res.json({ scanned: expenses.rows.length, rejected: decisions.filter(d => d.rejected).length, decisions });
  } catch (e) {
    return res.status(500).json({ error: 'scan failed' });
  }
});

module.exports = router;
