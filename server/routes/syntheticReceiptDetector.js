// Synthetic receipt (deepfake) detection: identify AI-generated fake receipts.
const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

async function analyseImage(imageUrl, base64) {
  // TODO: configure credentials — OPENAI_API_KEY (vision)
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const content = [
    { type: 'text', text: 'Inspect a receipt image. Flag indicators of generation/forgery (font inconsistency, blurry totals, impossible alignment, mismatched merchant address). Output JSON {"is_synthetic_probability":0..1,"indicators":["..."]}.' },
    imageUrl ? { type: 'image_url', image_url: { url: imageUrl } } : { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } },
  ];
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content }], max_tokens: 400 }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.choices?.[0]?.message?.content;
}

// POST /api/synthetic-receipt/check { expense_id, image_url? OR image_base64? }
router.post('/check', auth, aiRateLimiter, async (req, res) => {
  try {
    const { expense_id, image_url, image_base64 } = req.body || {};
    if (!expense_id || (!image_url && !image_base64)) return res.status(400).json({ error: 'expense_id + image required' });
    const raw = await analyseImage(image_url, image_base64);
    if (!raw) return res.status(503).json({ error: 'Vision API not configured' });
    let parsed;
    try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw); } catch { parsed = { raw }; }
    try {
      await db.query(`INSERT INTO ai_analyses (expense_id, analysis_type, payload, created_at) VALUES ($1,'synthetic_receipt',$2,NOW())`, [expense_id, JSON.stringify(parsed)]);
    } catch {}
    return res.json({ expense_id, analysis: parsed });
  } catch (e) {
    return res.status(500).json({ error: 'check failed' });
  }
});

module.exports = router;
