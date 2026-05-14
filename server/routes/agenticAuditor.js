// Agentic auditor: NL like "flag all high-risk expenses from Q3" → chained
// analyses + audit summary.
const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { callOpenRouter } = require('../services/openrouter');
const router = express.Router();
router.use(aiRateLimiter);

// POST /api/agentic-auditor/run { question, period? }
router.post('/run', auth, async (req, res) => {
  try {
    const { question, period } = req.body || {};
    if (!question) return res.status(400).json({ error: 'question required' });
    const expenses = await db.query(`SELECT * FROM expenses ${period ? 'WHERE created_at >= $1' : ''} ORDER BY created_at DESC LIMIT 500`, period ? [new Date(period.from || period)] : []).catch(() => ({ rows: [] }));
    const policies = await db.query(`SELECT * FROM policies`).catch(() => ({ rows: [] }));

    const system = 'You are a senior internal auditor. Use the supplied expense data and policies to answer. Output JSON {"answer":"...","flagged_expense_ids":[ids],"audit_findings":["..."],"recommended_actions":["..."]}.';
    let parsed;
    try {
      const raw = await callOpenRouter([{ role: 'system', content: system }, { role: 'user', content: `Question: ${question}\nExpenses(sample): ${JSON.stringify(expenses.rows.slice(0, 60))}\nPolicies: ${JSON.stringify(policies.rows).slice(0, 2000)}` }]);
      try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw); } catch { parsed = { raw }; }
    } catch (e) {
      return res.status(503).json({ error: 'LLM unavailable', detail: e.message });
    }
    return res.json({ question, expense_count: expenses.rows.length, findings: parsed });
  } catch (e) {
    return res.status(500).json({ error: 'audit run failed' });
  }
});

module.exports = router;
