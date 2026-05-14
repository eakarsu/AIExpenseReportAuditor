# Audit Notes — AIExpenseReportAuditor

Audit source: `_AUDIT/reports/batch_03.md` § 22 (substantive, 20 AI endpoints).

## Original audit recommendations

### Missing AI counterparts
- `/receipt-ocr-batch` — batch receipt processing.
- `/mileage-verify` — mileage claim verification against actual routes.

### Missing non-AI features
- Accounting software integration (QuickBooks, NetSuite).
- Reimbursement workflow.
- Corporate card system integration.
- Multi-currency support (full).

### Custom feature suggestions
- Agentic auditor.
- Synthetic / AI-generated receipt detection.
- Real-time expense monitoring.
- Compliance auto-rejection.
- Tax-timing optimization.
- Vendor fraud / kickback scheme detection.
- Travel-policy enforcement.

## Implementations applied this pass

None — 20 AI endpoints already present (fraud-detection, policy-check,
duplicate-detection, categorize, budget-forecast, trip-planner, vendor-risk,
spending-analysis, smart-search, receipt-analysis, report-summary,
employee-risk, department-benchmark, approval-recommendation,
anomaly-detection, policy-suggestions, cost-optimization, tax-deductions,
audit-report, currency-validator).

## Prioritized backlog

1. **MECHANICAL** — Add `/api/ai/receipt-ocr-batch` taking a list of
   `expense_ids` and pipelining the existing receipt-analysis logic.
2. **MECHANICAL** — Add `/api/ai/mileage-verify` that compares submitted
   mileage to a haversine distance between origin/destination on the
   `trips` row.
3. **NEEDS-CREDS** — Accounting integration (QuickBooks / NetSuite) needs
   per-tenant OAuth.
4. **NEEDS-CREDS** — Corporate card feeds (Visa Commercial / SAP Concur)
   require contracts.
5. **TOO-RISKY** — Auto-rejection at submission time can disrupt expense
   workflows; needs UX with explicit override.

## Apply pass 3 (frontend)

**Action:** LEFT-AS-IS — FE already wired.

Inspection: `client/src/services/api.js` includes a wrapper for each of the 20 AI endpoints in `server/routes/ai.js`, and `client/src/pages/` ships a corresponding `AI*.jsx` page for each (FraudDetection, AnomalyDetection, DuplicateDetection, VendorRisk, EmployeeRisk, PolicyCheck, PolicySuggestions, ApprovalRecommendation, TaxDeductions, SpendingAnalysis, BudgetForecast, DepartmentBenchmark, CostOptimization, SmartSearch, Categorization, ReceiptAnalysis, ReportSummary, TripPlanner, CurrencyValidator, AuditReport). All wired in `App.jsx` under `/ai/...` routes with JWT pulled from `localStorage.getItem('token')` in the shared `getHeaders()` fetch wrapper. The 3 utility endpoints in `aiNew.js` (`receipt-ocr`, `schedule-anomaly-scan`, `apply-policy-suggestions`) are admin/internal and not surfaced as standalone pages — left as-is. The audit backlog items `/receipt-ocr-batch` and `/mileage-verify` were not added on the backend in apply pass 2; still MECHANICAL backlog.

## Apply pass 3 (Group A)

**Action:** CREATED-FE — surfaced the 3 unwired `aiNew.js` endpoints on a single Admin Tools page.

Decision: the three endpoints (`receipt-ocr`, `schedule-anomaly-scan`, `apply-policy-suggestions`) are administrator/utility-grade, not per-record pages. Rather than three thin pages, they're consolidated under one `AIAdminTools.jsx` accessible from a new "AI - Admin" sidebar section.

**Files modified:**
- `client/src/pages/AIAdminTools.jsx` (NEW) — three sections, each a small form bound to the corresponding endpoint. Receipt OCR uploads an image as base64 + mime_type (matches the backend contract). Schedule scan picks `daily|weekly|monthly`. Apply policy suggestions has no body. JWT bearer is read from `localStorage` matching the existing `services/api.js` pattern. 503 detection: response body is parsed and surfaced inline; specifically a 503 yields "AI not configured (503)…" guidance.
- `client/src/App.jsx` — added import, sidebar section "AI - Admin", and `/ai/admin-tools` route under `<P>` protected wrapper.

**Syntax check:** `@babel/parser` (jsx plugin) PASS on both files.

**Notes:** The OCR page reuses the existing `<AIResultDisplay>` component for the raw analysis text. Result JSON is shown in a dark-monospace block matching no specific existing pattern but consistent with the project's card-based detail layout.

## Apply pass 4 (mechanical backlog)

**Action:** IMPLEMENTED — both remaining MECHANICAL backlog items.

**Features added (2):**

| # | Item | BE | FE |
|---|------|----|----|
| 1 | Receipt OCR Batch — `POST /api/ai/receipt-ocr-batch` | `server/routes/aiNew.js` | `client/src/pages/AIBatchTools.jsx` |
| 2 | Mileage Verify — `POST /api/ai/mileage-verify` | `server/routes/aiNew.js` | `client/src/pages/AIBatchTools.jsx` |

Both endpoints:
- Reuse existing helpers (`callOpenRouter`, `callOpenRouterVision`).
- Short-circuit with **HTTP 503** when `OPENROUTER_API_KEY` is missing (`checkAIKey()` helper added at top of `aiNew.js`).
- Persist results into `ai_analysis_results` (tolerant of missing table).
- Are auth-gated by the existing `auth` middleware.

The new FE page `AIBatchTools.jsx` follows the `AIAdminTools.jsx` pattern (page-header / detail-card / form-group / btn / `AIResultDisplay`), reads JWT from `localStorage`, and surfaces 503 inline. App.jsx wires it as `/ai/batch-tools` under the existing "AI - Admin" sidebar group.

**Smoke test:** PASS. Started backend; logged in as `admin@company.com / password123`; `POST /api/ai/mileage-verify` (Boston → NYC, claimed 500 mi) returned **HTTP 200** with structured `verification` JSON (`estimated_miles_one_way: 215, verdict: "over_claimed"`).

**Backlog deferred:** Accounting integration (NEEDS-CREDS), corporate card feeds (NEEDS-CREDS), auto-rejection (TOO-RISKY).
