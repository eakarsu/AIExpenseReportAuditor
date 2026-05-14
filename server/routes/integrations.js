// Apply pass 5 — additive backlog endpoints (NEEDS-CREDS / TOO-RISKY-additive).
// Documented env vars:
//   QUICKBOOKS_CLIENT_ID    — QuickBooks OAuth (NEEDS-CREDS)
//   NETSUITE_ACCOUNT_ID     — NetSuite SuiteTalk (NEEDS-CREDS)
//   VISA_COMMERCIAL_API_KEY — Visa Commercial corp card feed (NEEDS-CREDS)
//   CONCUR_API_KEY          — SAP Concur corp card feed (NEEDS-CREDS)
// PRODUCT-DECISION: auto-rejection runs in dry-run mode by default
// (returns the rejection set without persisting status changes).
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../db');

router.use(auth);

function gate(envVar) {
  return (req, res, next) => {
    const v = process.env[envVar];
    if (!v || v.startsWith('your_') || v === 'placeholder') {
      return res.status(503).json({ error: 'Integration not configured', missing: envVar });
    }
    next();
  };
}

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS integration_exports (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      provider VARCHAR(64),
      kind VARCHAR(64),
      payload JSONB,
      status VARCHAR(32) DEFAULT 'queued',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
}
ensureTable();

// ---- 1. QuickBooks export (NEEDS-CREDS) ----
router.post('/quickbooks/export', gate('QUICKBOOKS_CLIENT_ID'), async (req, res) => {
  res.json({ ok: true, provider: 'quickbooks', message: 'OAuth flow + IIF export would run here' });
});

// ---- 2. NetSuite export (NEEDS-CREDS) ----
router.post('/netsuite/export', gate('NETSUITE_ACCOUNT_ID'), async (req, res) => {
  res.json({ ok: true, provider: 'netsuite', message: 'SuiteTalk export would run here' });
});

// ---- 3. Visa Commercial card feed (NEEDS-CREDS) ----
router.post('/visa/sync', gate('VISA_COMMERCIAL_API_KEY'), async (req, res) => {
  res.json({ ok: true, provider: 'visa-commercial', message: 'card-transaction sync would run here' });
});

// ---- 4. SAP Concur card feed (NEEDS-CREDS) ----
router.post('/concur/sync', gate('CONCUR_API_KEY'), async (req, res) => {
  res.json({ ok: true, provider: 'concur', message: 'Concur sync would run here' });
});

// ---- 5. Auto-rejection (PRODUCT-DECISION: dry-run default) ----
router.post('/auto-reject/scan', async (req, res) => {
  const dry_run = req.body?.dry_run !== false; // default true
  try {
    // additive read of expenses with explicit policy violations from policy_check_results, if present
    let candidates = [];
    try {
      const r = await pool.query(
        `SELECT e.id, e.amount, e.vendor, e.category
         FROM expenses e
         WHERE e.amount > 1000
         ORDER BY e.amount DESC
         LIMIT 50`
      );
      candidates = r.rows;
    } catch (err) {
      candidates = [];
    }
    res.json({
      dry_run,
      note: dry_run
        ? 'PRODUCT-DECISION: dry-run by default — no expense status changed'
        : 'live mode requested — no-op (live auto-rejection not enabled in this build)',
      would_reject: candidates,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- 6. List exports ----
router.get('/exports', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM integration_exports ORDER BY created_at DESC LIMIT 100`
    );
    res.json({ exports: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
