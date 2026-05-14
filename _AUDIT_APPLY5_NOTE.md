# Apply Pass 5 wave-1 — AIExpenseReportAuditor

- **Date:** 2026-05-08
- **Project:** AIExpenseReportAuditor
- **Stack:** Node.js + Express, PostgreSQL, React (Vite frontend, JSX).
- **Audit source:** `_AUDIT/reports/batch_03.md` § 22.

## Verified-present (from prior passes)

The audit listed 20 AI endpoints — all present in `server/routes/ai.js`:
fraud-detection, policy-check, duplicate-detection, categorize, budget-forecast, trip-planner, vendor-risk, spending-analysis, smart-search, receipt-analysis, report-summary, employee-risk, department-benchmark, approval-recommendation, anomaly-detection, policy-suggestions, cost-optimization, tax-deductions, audit-report, currency-validator.

`server/routes/aiNew.js` adds receipt-ocr, schedule-anomaly-scan, apply-policy-suggestions, receipt-ocr-batch, mileage-verify (the 2 audit "missing AI counterparts" are covered).

`server/routes/integrations.js` covers QuickBooks export, NetSuite export, Concur sync. `server/routes/expenses.js` covers `auto-reject/scan` (TOO-RISKY behaviour gated).

## Implemented this pass (2 features, MECHANICAL)

| # | Item | File | Endpoint |
|---|------|------|----------|
| 1 | Agentic auditor (orchestrates fraud + policy + duplicates + anomalies + cost-optimization in one call) | `server/routes/aiNew.js` (appended) | `POST /api/ai/agentic-audit/:reportId` |
| 2 | Synthetic-receipt detector (vision heuristic for AI-generated forgeries) | `server/routes/aiNew.js` (appended) | `POST /api/ai/synthetic-receipt-detect` |

Both:
- Use existing `auth` middleware + `aiRateLimiter`.
- Reuse existing `callOpenRouter` / `callOpenRouterVision` helpers.
- Call `checkAIKey(res)` -> **HTTP 503** when `OPENROUTER_API_KEY` is missing.
- `agentic-audit` persists into `ai_analysis_results`, tolerant of missing table.
- `synthetic-receipt-detect` includes an explicit "AI heuristic only — not forensic-grade" disclaimer in the response.

**Frontend:**
- New `client/src/pages/AIAgenticAudit.jsx` (one page, two sections matching `AIBatchTools.jsx` styling).
- `App.jsx`: import + new sidebar entry under "AI - Admin" + new `/ai/agentic-audit` route.

## Deferred backlog

| Item | Category | Reason |
|------|----------|--------|
| Real-time expense monitoring (push) | NEEDS-PRODUCT-DECISION | Channel choice (in-app, Slack, email) undefined. |
| Tax-timing optimization | NEEDS-PRODUCT-DECISION | Per-employee tax bracket data not in schema. |
| Vendor cross-link kickback detection | TOO-RISKY | Requires cross-tenant entity resolution; out of scope. |
| Travel-policy auto-enforcement | verified-present | `auto-reject/scan` already shipped. |
| Accounting integrations | verified-present | `quickbooks/export`, `netsuite/export`, `concur/sync` already shipped. |

## Files changed

- `server/routes/aiNew.js` (+~125 lines, two new endpoints appended)
- `client/src/pages/AIAgenticAudit.jsx` (NEW, ~110 lines)
- `client/src/App.jsx` (+3 lines: import, sidebar entry, route)

## Smoke test

- `node --check server/routes/aiNew.js` -> OK.
- `@babel/parser` (jsx) -> OK on `App.jsx` and `AIAgenticAudit.jsx`.
- 503-on-no-key contract preserved via existing `checkAIKey`.
