// Tax optimization: recommend timing of expenses for tax efficiency.
const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/tax-optimization/:report_id/recommendations
router.get('/:report_id/recommendations', auth, async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM expenses WHERE report_id = $1`, [req.params.report_id]).catch(() => ({ rows: [] }));
    const recs = [];
    for (const e of r.rows) {
      const cat = (e.category || '').toLowerCase();
      if (cat.includes('meal')) recs.push({ expense_id: e.id, note: 'Business meals are 50% deductible — verify documentation.' });
      if (cat.includes('client_entertainment')) recs.push({ expense_id: e.id, note: 'Client entertainment expenses are generally non-deductible after TCJA.' });
      if (cat.includes('vehicle')) recs.push({ expense_id: e.id, note: 'Track business mileage to leverage IRS standard rate.' });
      if (cat.includes('equipment') && Number(e.amount) > 2500) recs.push({ expense_id: e.id, note: 'May qualify for Section 179 expensing or bonus depreciation.' });
    }
    return res.json({ report_id: req.params.report_id, count: recs.length, recommendations: recs });
  } catch (e) {
    return res.status(500).json({ error: 'recommendations failed' });
  }
});

module.exports = router;
