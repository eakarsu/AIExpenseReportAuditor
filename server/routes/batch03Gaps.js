// ============================================================
// === Batch 03 Gaps & Frontend Mounts ===
// Auto-generated Gap-feature endpoints (lean v0).
// TODO: configure credentials (set OPENROUTER_API_KEY).
// ============================================================
const express = require('express');
const router = express.Router();

let _gfReady = false;
async function ensureGapTable(pool) {
  if (_gfReady || !pool) return;
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS gap_features (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(120) NOT NULL,
      user_id INT,
      input JSONB,
      output JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    _gfReady = true;
  } catch (_) { /* tolerant of missing DB */ }
}

async function callAI(prompt) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { ok: false, status: 503, error: 'AI service unavailable. Set OPENROUTER_API_KEY (TODO: configure credentials).' };
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
      }),
    });
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || '';
    return { ok: r.ok, status: r.status, text, raw: data };
  } catch (e) {
    return { ok: false, status: 500, error: String(e.message || e) };
  }
}

function buildHandler(slug, label, hint) {
  return async (req, res) => {
    const body = req.body || {};
    const userId = req.user?.id || null;
    const prompt = `Feature: ${label}\nContext hint: ${hint}\nUser input:\n${JSON.stringify(body, null, 2)}\n\nProduce a concise, actionable response.`;
    const ai = await callAI(prompt);
    try {
      const pool = req.app.locals.pool || req.app.get('pool') || null;
      if (pool) {
        await ensureGapTable(pool);
        await pool.query('INSERT INTO gap_features(slug, user_id, input, output) VALUES ($1,$2,$3,$4)',
          [slug, userId, body, { text: ai.text || ai.error || null }]);
      }
    } catch (_) { /* tolerant */ }
    if (!ai.ok) return res.status(ai.status || 500).json({ error: ai.error || ai.text || `Upstream error (${ai.status})`, slug });
    res.json({ slug, label, result: ai.text });
  };
}

router.post('/gap-no-batch-receipt-ocr-pipeline', buildHandler('gap-ai-no-batch-receipt-ocr-pipeline', 'No batch-receipt OCR pipeline', 'No batch-receipt OCR pipeline'));
router.post('/gap-no-mileage-route-verifier-compare-claim-vs-gps-route', buildHandler('gap-ai-no-mileage-route-verifier-compare-claim-vs-gps-route', 'No mileage-route verifier (compare claim vs GPS route)', 'No mileage-route verifier (compare claim vs GPS route)'));
router.post('/gap-no-synthetic-receipt-deepfake-detector', buildHandler('gap-ai-no-synthetic-receipt-deepfake-detector', 'No synthetic-receipt (deepfake) detector', 'No synthetic-receipt (deepfake) detector'));
router.post('/gap-limited-accounting-software-integration-only-stub-no-quic', buildHandler('gap-non-limited-accounting-software-integration-only-stub-no-quic', 'Limited accounting-software integration (only stub — no Quic', 'Limited accounting-software integration (only stub — no QuickBooks/NetSuite full sync)'));
router.post('/gap-no-reimbursement-payout-workflow', buildHandler('gap-non-no-reimbursement-payout-workflow', 'No reimbursement-payout workflow', 'No reimbursement-payout workflow'));
router.post('/gap-no-corporate-card-transaction-ingest', buildHandler('gap-non-no-corporate-card-transaction-ingest', 'No corporate-card transaction ingest', 'No corporate-card transaction ingest'));
router.post('/gap-limited-multi-currency-support', buildHandler('gap-non-limited-multi-currency-support', 'Limited multi-currency support', 'Limited multi-currency support'));
router.post('/gap-no-webhooks', buildHandler('gap-non-no-webhooks', 'No webhooks', 'No webhooks'));
router.post('/gap-no-travel-policy-enforcement-plug-in-concur-style', buildHandler('gap-non-no-travel-policy-enforcement-plug-in-concur-style', 'No travel-policy enforcement plug-in (Concur-style)', 'No travel-policy enforcement plug-in (Concur-style)'));

module.exports = router;
