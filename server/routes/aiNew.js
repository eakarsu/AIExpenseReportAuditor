const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { callOpenRouter, callOpenRouterVision } = require('../services/openrouter');
const router = express.Router();

// Apply rate limiter to all routes in this file
router.use(aiRateLimiter);

// Receipt OCR via vision
// POST /api/ai/receipt-ocr
// Body: { image_base64, mime_type }
router.post('/receipt-ocr', auth, async (req, res) => {
  try {
    const { image_base64, mime_type } = req.body;
    if (!image_base64 || !mime_type) {
      return res.status(400).json({ error: 'image_base64 and mime_type are required' });
    }

    const systemPrompt = `You are a receipt OCR and data extraction AI. Extract structured information from receipt images and return it in a clean, structured format.`;
    const userPrompt = `Extract the following information from this receipt image:
1. Vendor name
2. Total amount
3. Date of transaction
4. Category (e.g., Meals, Travel, Office Supplies, Hotel, Transportation, Entertainment)
5. Line items (itemized list with description and price if visible)

Return your response as JSON with these exact keys:
{
  "vendor": "string",
  "amount": number,
  "date": "YYYY-MM-DD string or null",
  "category": "string",
  "line_items": [{"description": "string", "amount": number}]
}

If a field cannot be determined from the image, use null for that field.`;

    const result = await callOpenRouterVision(systemPrompt, userPrompt, image_base64, mime_type);

    // Attempt to parse structured JSON from the response
    let extracted = { vendor: null, amount: null, date: null, category: null, line_items: [] };
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      // Return raw content if JSON parsing fails
    }

    await db.query(
      'INSERT INTO ai_analysis_results (analysis_type, result, model_used) VALUES ($1, $2, $3)',
      ['receipt_ocr', JSON.stringify({ content: result.content, extracted }), result.model]
    );

    res.json({
      extracted,
      raw_analysis: result.content,
      model: result.model,
      usage: result.usage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Schedule anomaly scan
// POST /api/ai/schedule-anomaly-scan
// Body: { frequency } (e.g., "daily", "weekly", "monthly")
router.post('/schedule-anomaly-scan', auth, async (req, res) => {
  try {
    const { frequency = 'daily' } = req.body;

    // Ensure scheduled_scans table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS scheduled_scans (
        id SERIAL PRIMARY KEY,
        scan_type VARCHAR(100),
        frequency VARCHAR(50),
        last_run TIMESTAMP,
        next_run TIMESTAMP,
        created_by INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Compute next_run based on frequency
    let nextRunInterval = '1 day';
    if (frequency === 'weekly') nextRunInterval = '7 days';
    else if (frequency === 'monthly') nextRunInterval = '30 days';

    const result = await db.query(`
      INSERT INTO scheduled_scans (scan_type, frequency, next_run, created_by)
      VALUES ($1, $2, NOW() + INTERVAL '${nextRunInterval}', $3)
      RETURNING *
    `, ['anomaly_detection', frequency, req.user.id]);

    res.status(201).json({
      message: 'Anomaly scan scheduled successfully',
      scan: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI-generated policy rules from policy suggestions
// POST /api/ai/apply-policy-suggestions
router.post('/apply-policy-suggestions', auth, async (req, res) => {
  try {
    // Fetch recent policy suggestion results from ai_analysis_results
    const recentSuggestions = await db.query(`
      SELECT result, created_at FROM ai_analysis_results
      WHERE analysis_type = 'policy_suggestions'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (recentSuggestions.rows.length === 0) {
      return res.status(404).json({ error: 'No policy suggestion analyses found. Run /api/ai/policy-suggestions first.' });
    }

    const suggestionContent = recentSuggestions.rows.map((r, i) => {
      const parsed = typeof r.result === 'string' ? JSON.parse(r.result) : r.result;
      return `Analysis ${i + 1} (${r.created_at.toISOString().split('T')[0]}):\n${parsed.content || JSON.stringify(parsed)}`;
    }).join('\n\n---\n\n');

    const systemPrompt = `You are a corporate expense policy rules engine. Convert policy suggestions into structured, enforceable rules.`;
    const userPrompt = `Based on these recent AI policy suggestion analyses, generate structured policy rules that can be added to the system.

Policy Suggestion Analyses:
${suggestionContent}

For each distinct policy rule, provide:
- rule_name: Short descriptive name
- rule_type: One of (amount_limit, category_restriction, vendor_restriction, frequency_limit, documentation_required, approval_required)
- conditions: JSON-compatible conditions object (e.g., {"category": "Meals", "max_amount": 75})
- description: Human-readable description of the rule

Return as a JSON array of rule objects. Example:
[
  {
    "rule_name": "Meal Expense Limit",
    "rule_type": "amount_limit",
    "conditions": {"category": "Meals", "max_amount": 75, "per": "day"},
    "description": "Meal expenses are limited to $75 per day per employee"
  }
]`;

    const aiResult = await callOpenRouter(systemPrompt, userPrompt);

    // Parse rules from AI response
    let rules = [];
    try {
      const jsonMatch = aiResult.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        rules = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      // Could not parse structured rules
    }

    // Insert rules into policy_rules table with status='pending_review'
    const insertedRules = [];
    for (const rule of rules) {
      try {
        const inserted = await db.query(`
          INSERT INTO policy_rules (name, description, rule_type, conditions, status, is_active)
          VALUES ($1, $2, $3, $4, 'pending_review', false)
          ON CONFLICT DO NOTHING
          RETURNING *
        `, [
          rule.rule_name || 'AI Suggested Rule',
          rule.description || '',
          rule.rule_type || 'amount_limit',
          JSON.stringify(rule.conditions || {}),
        ]);
        if (inserted.rows.length > 0) insertedRules.push(inserted.rows[0]);
      } catch (rowErr) {
        // Skip if insert fails for individual rule
      }
    }

    // Persist AI analysis result
    await db.query(
      'INSERT INTO ai_analysis_results (analysis_type, result, model_used) VALUES ($1, $2, $3)',
      ['apply_policy_suggestions', JSON.stringify({ content: aiResult.content, rules_created: insertedRules.length }), aiResult.model]
    );

    res.json({
      message: `Created ${insertedRules.length} policy rules with status pending_review`,
      rules_created: insertedRules,
      raw_analysis: aiResult.content,
      model: aiResult.model,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: 503 if OPENROUTER_API_KEY missing
function checkAIKey(res) {
  if (!process.env.OPENROUTER_API_KEY) {
    res.status(503).json({ error: 'AI not configured. Set OPENROUTER_API_KEY in server .env.' });
    return false;
  }
  return true;
}

// Receipt OCR Batch
// POST /api/ai/receipt-ocr-batch
// Body: { items: [{ expense_id?, image_base64, mime_type, label? }] }
// Pipelines existing receipt-OCR vision logic over a list of receipt images.
router.post('/receipt-ocr-batch', auth, async (req, res) => {
  try {
    if (!checkAIKey(res)) return;
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array required' });
    }
    if (items.length > 20) {
      return res.status(400).json({ error: 'maximum 20 items per batch' });
    }

    const systemPrompt = `You are a receipt OCR and data extraction AI. Extract structured information from receipt images and return it in a clean, structured format.`;
    const userPromptTemplate = `Extract the following information from this receipt image:
1. Vendor name
2. Total amount
3. Date of transaction
4. Category
5. Line items

Return your response as JSON with these exact keys:
{ "vendor": "string", "amount": number, "date": "YYYY-MM-DD string or null", "category": "string", "line_items": [{"description": "string", "amount": number}] }

If a field cannot be determined, use null.`;

    const results = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i] || {};
      try {
        if (!it.image_base64 || !it.mime_type) {
          results.push({ index: i, expense_id: it.expense_id || null, label: it.label || null, error: 'image_base64 and mime_type required' });
          continue;
        }
        const result = await callOpenRouterVision(systemPrompt, userPromptTemplate, it.image_base64, it.mime_type);
        let extracted = { vendor: null, amount: null, date: null, category: null, line_items: [] };
        try {
          const jsonMatch = result.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
        } catch (parseErr) { /* ignore */ }
        try {
          await db.query(
            'INSERT INTO ai_analysis_results (analysis_type, result, model_used) VALUES ($1, $2, $3)',
            ['receipt_ocr_batch', JSON.stringify({ extracted, expense_id: it.expense_id || null }), result.model]
          );
        } catch (dbErr) { /* tolerate db unavailability */ }
        results.push({ index: i, expense_id: it.expense_id || null, label: it.label || null, extracted, raw_analysis: result.content, model: result.model });
      } catch (errInner) {
        results.push({ index: i, expense_id: it.expense_id || null, label: it.label || null, error: errInner.message });
      }
    }

    res.json({ count: items.length, succeeded: results.filter(r => !r.error).length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mileage Verify
// POST /api/ai/mileage-verify
// Body: { origin, destination, claimed_miles, vehicle?, rate_per_mile?, notes? }
// Uses LLM to estimate the road-distance between two locations and compare to the claim.
router.post('/mileage-verify', auth, async (req, res) => {
  try {
    if (!checkAIKey(res)) return;
    const { origin, destination, claimed_miles, vehicle, rate_per_mile, notes } = req.body || {};
    if (!origin || !destination || claimed_miles === undefined || claimed_miles === null) {
      return res.status(400).json({ error: 'origin, destination, and claimed_miles are required' });
    }
    const numericClaim = Number(claimed_miles);
    if (Number.isNaN(numericClaim)) {
      return res.status(400).json({ error: 'claimed_miles must be a number' });
    }

    const systemPrompt = `You verify business mileage reimbursement claims. Be precise and skeptical. Return ONLY JSON.`;
    const userPrompt = `Verify this mileage claim.

Origin: ${origin}
Destination: ${destination}
Claimed miles: ${numericClaim}
Vehicle: ${vehicle || 'unspecified'}
Rate per mile: ${rate_per_mile != null ? rate_per_mile : 'not provided'}
Employee notes: ${notes || 'none'}

Estimate the typical one-way driving distance in miles between these two locations. Compare the claim to your estimate.

Return JSON exactly in this shape:
{
  "estimated_miles_one_way": number,
  "estimated_miles_round_trip": number,
  "claimed_miles": number,
  "deviation_percent": number,
  "verdict": "reasonable | over_claimed | under_claimed | unable_to_verify",
  "confidence": "low | medium | high",
  "explanation": "string",
  "flags": ["string"]
}`;

    const aiResult = await callOpenRouter(systemPrompt, userPrompt);

    let parsed = null;
    try {
      const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch (parseErr) { /* ignore */ }

    try {
      await db.query(
        'INSERT INTO ai_analysis_results (analysis_type, result, model_used) VALUES ($1, $2, $3)',
        ['mileage_verify', JSON.stringify({ origin, destination, claimed_miles: numericClaim, parsed, content: aiResult.content }), aiResult.model]
      );
    } catch (dbErr) { /* tolerate */ }

    res.json({
      origin,
      destination,
      claimed_miles: numericClaim,
      verification: parsed,
      raw_analysis: aiResult.content,
      model: aiResult.model,
      usage: aiResult.usage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// Apply pass 5 wave-1 — agentic-audit + synthetic-receipt-detect
// =============================================================

// POST /api/ai/agentic-audit/:reportId
// Orchestrates fraud + policy + duplicate + anomaly + cost-optimization for a single report.
router.post('/agentic-audit/:reportId', auth, async (req, res) => {
  try {
    if (!checkAIKey(res)) return;
    const reportId = req.params.reportId;

    const [reportResult, itemsResult] = await Promise.all([
      db.query(
        `SELECT er.*, e.full_name as employee_name, d.name as department_name
         FROM expense_reports er
         JOIN employees e ON er.employee_id = e.id
         LEFT JOIN departments d ON er.department_id = d.id
         WHERE er.id = $1`,
        [reportId]
      ),
      db.query(
        `SELECT ei.*, c.name as category_name, v.name as vendor_name, v.is_flagged as vendor_flagged
         FROM expense_items ei
         LEFT JOIN categories c ON ei.category_id = c.id
         LEFT JOIN vendors v ON ei.vendor_id = v.id
         WHERE ei.report_id = $1`,
        [reportId]
      ),
    ]);

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = reportResult.rows[0];
    const items = itemsResult.rows;

    const stats = {
      item_count: items.length,
      total_amount: +(items.reduce((a, b) => a + parseFloat(b.amount || 0), 0)).toFixed(2),
      vendor_flagged_count: items.filter(i => i.vendor_flagged).length,
      receipt_missing_count: items.filter(i => !i.receipt_url).length,
    };

    const systemPrompt = `You are an agentic expense auditor. Orchestrate fraud detection, policy compliance, duplicates, anomalies, and cost optimization in a single coherent pass. Cite specific item ids when relevant.`;
    const userPrompt = `REPORT: ${JSON.stringify(report).substring(0, 2000)}
ITEMS (up to 80): ${JSON.stringify(items.slice(0, 80)).substring(0, 6000)}
DETERMINISTIC_STATS: ${JSON.stringify(stats)}

Return strict JSON:
{
  "overall_recommendation": "approve|approve_with_conditions|return_for_revision|reject",
  "confidence": 0.0-1.0,
  "fraud_signals": [{"item_id": <id>, "signal": "...", "severity": "low|medium|high"}],
  "policy_issues": [{"item_id": <id>, "policy_name": "...", "issue": "..."}],
  "duplicate_candidates": [{"item_ids": [<id>,<id>], "reason": "..."}],
  "anomalies": [{"item_id": <id>, "stat": "...", "context": "..."}],
  "cost_optimization": [{"action": "...", "estimated_savings": <number>}],
  "executive_summary": "<3-5 sentence narrative>"
}`;

    const aiResult = await callOpenRouter(systemPrompt, userPrompt);

    try {
      await db.query(
        `INSERT INTO ai_analysis_results (report_id, analysis_type, ai_analysis, raw_analysis, model)
         VALUES ($1, $2, $3, $4, $5)`,
        [reportId, 'agentic-audit', aiResult.content, aiResult.content, aiResult.model]
      );
    } catch (_) {}

    let parsed = null;
    try { parsed = JSON.parse(aiResult.content); } catch {
      const m = aiResult.content.match(/\{[\s\S]*\}/);
      if (m) try { parsed = JSON.parse(m[0]); } catch {}
    }

    res.json({
      report_id: reportId,
      stats,
      audit: parsed || { raw_analysis: aiResult.content },
      raw_analysis: aiResult.content,
      model: aiResult.model,
      usage: aiResult.usage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/synthetic-receipt-detect
// Body: { image_base64, mime_type }
// Heuristic+vision check for AI-generated / synthetic receipts.
router.post('/synthetic-receipt-detect', auth, async (req, res) => {
  try {
    if (!checkAIKey(res)) return;
    const { image_base64, mime_type } = req.body || {};
    if (!image_base64 || !mime_type) {
      return res.status(400).json({ error: 'image_base64 and mime_type are required' });
    }

    const systemPrompt = `You are an expert in detecting AI-generated / synthetic / forged receipts. Evaluate fonts, alignment, ink saturation, paper texture, watermark/registration mark presence, line-item arithmetic consistency, vendor metadata, and typical generative-AI artifacts. NOT a forensic determination — return confidence and rationale.`;
    const userPrompt = `Examine this receipt image for signs it is AI-generated or fabricated. Return strict JSON:
{
  "verdict": "likely_authentic|suspicious|likely_synthetic",
  "confidence": 0.0-1.0,
  "synthetic_signals": [{"signal": "...", "weight": "low|medium|high"}],
  "authenticity_signals": [{"signal": "...", "weight": "low|medium|high"}],
  "arithmetic_check": "consistent|inconsistent|not_visible",
  "recommend_human_review": true,
  "disclaimer": "AI heuristic only — not forensic-grade."
}`;

    const aiResult = await callOpenRouterVision(systemPrompt, userPrompt, image_base64, mime_type);

    let parsed = null;
    try { parsed = JSON.parse(aiResult.content); } catch {
      const m = aiResult.content.match(/\{[\s\S]*\}/);
      if (m) try { parsed = JSON.parse(m[0]); } catch {}
    }

    res.json({
      detection: parsed || { raw_analysis: aiResult.content },
      raw_analysis: aiResult.content,
      model: aiResult.model,
      usage: aiResult.usage,
      disclaimer: 'AI heuristic only — not forensic-grade. Always combine with vendor/transaction validation before action.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
