const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { callOpenRouter } = require('../services/openrouter');
const router = express.Router();

// Apply rate limiter to all AI routes
router.use(aiRateLimiter);

// 1. AI Fraud Detection - Analyze report for fraud indicators
router.post('/fraud-detection/:reportId', auth, async (req, res) => {
  try {
    const report = await db.query(`
      SELECT er.*, e.full_name as employee_name, d.name as department_name
      FROM expense_reports er
      JOIN employees e ON er.employee_id = e.id
      LEFT JOIN departments d ON er.department_id = d.id
      WHERE er.id = $1
    `, [req.params.reportId]);
    if (report.rows.length === 0) return res.status(404).json({ error: 'Report not found' });

    const items = await db.query(`
      SELECT ei.*, c.name as category_name, v.name as vendor_name, v.is_flagged as vendor_flagged, v.risk_score as vendor_risk
      FROM expense_items ei
      LEFT JOIN categories c ON ei.category_id = c.id
      LEFT JOIN vendors v ON ei.vendor_id = v.id
      WHERE ei.report_id = $1
    `, [req.params.reportId]);

    const prompt = `You are an expert expense fraud detection AI. Analyze the following expense report for fraud indicators, anomalies, and policy violations.

Report: ${JSON.stringify(report.rows[0])}
Expense Items: ${JSON.stringify(items.rows)}

Provide a structured analysis with:
1. Overall Risk Score (1-10)
2. Summary of findings
3. List of specific flags/concerns with severity (critical/warning/info)
4. Recommendations for each flagged item
5. Pattern analysis (unusual spending patterns, round numbers, weekend charges, etc.)

Format your response as structured sections with clear headings.`;

    const result = await callOpenRouter(
      'You are a financial fraud detection expert AI assistant for an enterprise expense management system. Be thorough but fair in your analysis.',
      prompt
    );

    await db.query(
      'INSERT INTO ai_analysis_results (report_id, analysis_type, result, model_used) VALUES ($1, $2, $3, $4)',
      [req.params.reportId, 'fraud_detection', JSON.stringify({ content: result.content }), result.model]
    );

    res.json({ analysis: result.content, model: result.model, usage: result.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. AI Policy Compliance Check
router.post('/policy-check/:reportId', auth, async (req, res) => {
  try {
    const report = await db.query('SELECT * FROM expense_reports WHERE id = $1', [req.params.reportId]);
    if (report.rows.length === 0) return res.status(404).json({ error: 'Report not found' });

    const items = await db.query(`
      SELECT ei.*, c.name as category_name, c.max_amount as category_limit, v.name as vendor_name
      FROM expense_items ei
      LEFT JOIN categories c ON ei.category_id = c.id
      LEFT JOIN vendors v ON ei.vendor_id = v.id
      WHERE ei.report_id = $1
    `, [req.params.reportId]);

    const policies = await db.query('SELECT * FROM policy_rules WHERE is_active = true');

    const result = await callOpenRouter(
      'You are an expense policy compliance expert. Check expenses against company policies thoroughly.',
      `Check this expense report against company policies:

Report: ${JSON.stringify(report.rows[0])}
Items: ${JSON.stringify(items.rows)}
Active Policies: ${JSON.stringify(policies.rows)}

For each item, check:
1. Amount vs category limits
2. Receipt requirements
3. Vendor compliance
4. Date/timing issues
5. Description completeness

Provide a compliance score (0-100%), list each violation with the specific policy violated, and suggest corrective actions.`
    );

    res.json({ analysis: result.content, model: result.model, usage: result.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. AI Duplicate Detection
router.post('/duplicate-detection/:reportId', auth, async (req, res) => {
  try {
    const items = await db.query(`
      SELECT ei.*, c.name as category_name, v.name as vendor_name, er.report_number
      FROM expense_items ei
      LEFT JOIN categories c ON ei.category_id = c.id
      LEFT JOIN vendors v ON ei.vendor_id = v.id
      JOIN expense_reports er ON ei.report_id = er.id
      WHERE ei.report_id = $1
    `, [req.params.reportId]);

    // Get all other recent items for comparison
    const otherItems = await db.query(`
      SELECT ei.*, c.name as category_name, v.name as vendor_name, er.report_number, e.full_name as employee_name
      FROM expense_items ei
      LEFT JOIN categories c ON ei.category_id = c.id
      LEFT JOIN vendors v ON ei.vendor_id = v.id
      JOIN expense_reports er ON ei.report_id = er.id
      JOIN employees e ON er.employee_id = e.id
      WHERE ei.report_id != $1
      AND ei.expense_date >= NOW() - INTERVAL '90 days'
    `, [req.params.reportId]);

    const result = await callOpenRouter(
      'You are a duplicate expense detection specialist. Identify potential duplicate submissions across expense reports.',
      `Analyze these expense items for potential duplicates:

Current Report Items: ${JSON.stringify(items.rows)}
Other Recent Items (last 90 days): ${JSON.stringify(otherItems.rows)}

Check for:
1. Exact duplicates (same amount, date, vendor)
2. Near duplicates (similar amounts, same vendor, close dates)
3. Split transactions (same vendor, same day, multiple small charges)
4. Cross-report duplicates (same expense in different reports)

Rate each potential duplicate match with a confidence percentage.`
    );

    res.json({ analysis: result.content, model: result.model, usage: result.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. AI Expense Categorization
router.post('/categorize', auth, async (req, res) => {
  try {
    const { description, amount, vendor_name } = req.body;
    const categories = await db.query('SELECT id, name, code, description, max_amount FROM categories WHERE is_active = true');

    const result = await callOpenRouter(
      'You are an expense categorization AI. Suggest the best category for expenses based on description and context.',
      `Categorize this expense:
Description: ${description}
Amount: $${amount}
Vendor: ${vendor_name || 'Unknown'}

Available Categories: ${JSON.stringify(categories.rows)}

Provide:
1. Best matching category (name and code)
2. Confidence level (%)
3. Reasoning
4. Alternative categories if applicable
5. Any red flags about this expense`
    );

    res.json({ analysis: result.content, model: result.model, usage: result.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. AI Budget Forecasting
router.post('/budget-forecast', auth, async (req, res) => {
  try {
    const budgets = await db.query(`
      SELECT bl.*, d.name as department_name, c.name as category_name
      FROM budget_limits bl
      LEFT JOIN departments d ON bl.department_id = d.id
      LEFT JOIN categories c ON bl.category_id = c.id
    `);

    const spendHistory = await db.query(`
      SELECT d.name as department, c.name as category, DATE_TRUNC('month', ei.expense_date) as month,
      SUM(ei.amount) as total
      FROM expense_items ei
      JOIN expense_reports er ON ei.report_id = er.id
      LEFT JOIN departments d ON er.department_id = d.id
      LEFT JOIN categories c ON ei.category_id = c.id
      GROUP BY d.name, c.name, DATE_TRUNC('month', ei.expense_date)
      ORDER BY month DESC
    `);

    const result = await callOpenRouter(
      'You are a financial forecasting AI for corporate expense management.',
      `Analyze spending trends and provide budget forecasts:

Current Budgets: ${JSON.stringify(budgets.rows)}
Spending History: ${JSON.stringify(spendHistory.rows)}

Provide:
1. Departments at risk of exceeding budget
2. Projected spending for next quarter
3. Cost-saving recommendations
4. Unusual spending trends
5. Budget reallocation suggestions`
    );

    res.json({ analysis: result.content, model: result.model, usage: result.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. AI Trip Budget Planner
router.post('/trip-planner', auth, async (req, res) => {
  try {
    const { destination, start_date, end_date, purpose, travelers } = req.body;

    const result = await callOpenRouter(
      'You are a corporate travel budget planning expert. Create detailed day-by-day trip plans with realistic budgets.',
      `Create a detailed day-by-day trip budget plan:

Destination: ${destination}
Dates: ${start_date} to ${end_date}
Purpose: ${purpose || 'Business trip'}
Number of travelers: ${travelers || 1}

For each day provide:
1. Estimated flight costs (if applicable)
2. Hotel accommodation
3. Meals (breakfast, lunch, dinner)
4. Ground transportation
5. Meeting/conference costs
6. Miscellaneous expenses

Also provide:
- Total estimated budget
- Cost-saving tips
- Policy compliance notes
- Recommended vendors/hotels
- Visa/documentation requirements if international`
    );

    res.json({ analysis: result.content, model: result.model, usage: result.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. AI Vendor Risk Assessment
router.post('/vendor-risk/:vendorId', auth, async (req, res) => {
  try {
    const vendor = await db.query('SELECT * FROM vendors WHERE id = $1', [req.params.vendorId]);
    if (vendor.rows.length === 0) return res.status(404).json({ error: 'Vendor not found' });

    const transactions = await db.query(`
      SELECT ei.*, er.report_number, e.full_name as employee_name
      FROM expense_items ei
      JOIN expense_reports er ON ei.report_id = er.id
      JOIN employees e ON er.employee_id = e.id
      WHERE ei.vendor_id = $1
      ORDER BY ei.expense_date DESC
    `, [req.params.vendorId]);

    const result = await callOpenRouter(
      'You are a vendor risk assessment AI for corporate expense management.',
      `Assess the risk level of this vendor:

Vendor: ${JSON.stringify(vendor.rows[0])}
Transaction History: ${JSON.stringify(transactions.rows)}

Analyze:
1. Overall risk score (1-10)
2. Transaction patterns (frequency, amounts, timing)
3. Red flags (unusual amounts, frequency changes, employee concentration)
4. Comparison to industry norms
5. Recommendations (approve, monitor, flag, block)
6. Specific concerns or positive indicators`
    );

    res.json({ analysis: result.content, model: result.model, usage: result.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. AI Spending Pattern Analysis
router.post('/spending-analysis', auth, async (req, res) => {
  try {
    const { employee_id, department_id } = req.body;

    let query = `
      SELECT ei.*, c.name as category_name, v.name as vendor_name,
      er.report_number, e.full_name as employee_name, d.name as department_name
      FROM expense_items ei
      JOIN expense_reports er ON ei.report_id = er.id
      JOIN employees e ON er.employee_id = e.id
      LEFT JOIN categories c ON ei.category_id = c.id
      LEFT JOIN vendors v ON ei.vendor_id = v.id
      LEFT JOIN departments d ON er.department_id = d.id
    `;
    const params = [];
    if (employee_id) { query += ' WHERE er.employee_id = $1'; params.push(employee_id); }
    else if (department_id) { query += ' WHERE er.department_id = $1'; params.push(department_id); }
    query += ' ORDER BY ei.expense_date DESC LIMIT 200';

    const expenses = await db.query(query, params);

    const result = await callOpenRouter(
      'You are a spending pattern analysis AI. Identify trends, anomalies, and optimization opportunities.',
      `Analyze these expense patterns:

Expenses: ${JSON.stringify(expenses.rows)}

Provide:
1. Spending trends over time
2. Top spending categories and vendors
3. Anomalies and outliers
4. Employee spending patterns
5. Seasonal trends
6. Cost optimization opportunities
7. Benchmark comparisons
8. Risk indicators`
    );

    res.json({ analysis: result.content, model: result.model, usage: result.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. AI Natural Language Search
router.post('/smart-search', auth, async (req, res) => {
  try {
    const { query: searchQuery } = req.body;

    // Get summary data for context
    const reports = await db.query(`
      SELECT er.id, er.report_number, er.title, er.status, er.total_amount, er.trip_destination,
      e.full_name as employee_name, d.name as department_name
      FROM expense_reports er
      JOIN employees e ON er.employee_id = e.id
      LEFT JOIN departments d ON er.department_id = d.id
      ORDER BY er.created_at DESC
    `);

    const result = await callOpenRouter(
      'You are a smart search assistant for an expense management system. Help users find expenses using natural language.',
      `User query: "${searchQuery}"

Available expense reports: ${JSON.stringify(reports.rows)}

Based on the user query:
1. Identify which reports/items match
2. Explain why they match
3. Provide relevant summary statistics
4. Suggest related queries the user might find useful`
    );

    res.json({ analysis: result.content, model: result.model, usage: result.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. AI Receipt Analyzer (text-based simulation)
router.post('/receipt-analysis', auth, async (req, res) => {
  try {
    const { receipt_text, vendor_name, amount } = req.body;

    const result = await callOpenRouter(
      'You are an OCR and receipt analysis AI. Extract and validate expense information from receipt data.',
      `Analyze this receipt information:

Receipt Text/Description: ${receipt_text}
Vendor: ${vendor_name || 'Unknown'}
Claimed Amount: $${amount || 'Unknown'}

Extract and validate:
1. Vendor name and type
2. Date of transaction
3. Itemized charges
4. Tax amount
5. Tip/gratuity
6. Total amount
7. Payment method
8. Any discrepancies between receipt and claimed amount
9. Suggested expense category
10. Policy compliance notes`
    );

    res.json({ analysis: result.content, model: result.model, usage: result.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. AI Report Summary Generator
router.post('/report-summary/:reportId', auth, async (req, res) => {
  try {
    const report = await db.query(`
      SELECT er.*, e.full_name as employee_name, d.name as department_name
      FROM expense_reports er
      JOIN employees e ON er.employee_id = e.id
      LEFT JOIN departments d ON er.department_id = d.id
      WHERE er.id = $1
    `, [req.params.reportId]);
    if (report.rows.length === 0) return res.status(404).json({ error: 'Report not found' });

    const items = await db.query(`
      SELECT ei.*, c.name as category_name, v.name as vendor_name
      FROM expense_items ei
      LEFT JOIN categories c ON ei.category_id = c.id
      LEFT JOIN vendors v ON ei.vendor_id = v.id
      WHERE ei.report_id = $1
    `, [req.params.reportId]);

    const result = await callOpenRouter(
      'You are an executive summary writer for expense reports. Create clear, professional summaries.',
      `Generate a professional executive summary for this expense report:

Report: ${JSON.stringify(report.rows[0])}
Items: ${JSON.stringify(items.rows)}

Include:
1. Executive overview (2-3 sentences)
2. Key metrics (total, average per day, highest category)
3. Category breakdown with percentages
4. Notable items or concerns
5. Recommendation (approve/review/reject)
6. Comparison to typical reports for this type of trip`
    );

    res.json({ analysis: result.content, model: result.model, usage: result.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. AI Employee Risk Profiling
router.post('/employee-risk/:employeeId', auth, async (req, res) => {
  try {
    const employee = await db.query(`
      SELECT e.*, d.name as department_name FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id WHERE e.id = $1
    `, [req.params.employeeId]);
    if (employee.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });

    const reports = await db.query(`
      SELECT er.*, (SELECT COUNT(*) FROM expense_items ei WHERE ei.report_id = er.id AND ei.is_flagged = true) as flagged_count
      FROM expense_reports er WHERE er.employee_id = $1 ORDER BY er.created_at DESC
    `, [req.params.employeeId]);

    const items = await db.query(`
      SELECT ei.*, c.name as category_name, v.name as vendor_name, v.is_flagged as vendor_flagged
      FROM expense_items ei
      JOIN expense_reports er ON ei.report_id = er.id
      LEFT JOIN categories c ON ei.category_id = c.id
      LEFT JOIN vendors v ON ei.vendor_id = v.id
      WHERE er.employee_id = $1 ORDER BY ei.expense_date DESC
    `, [req.params.employeeId]);

    const result = await callOpenRouter(
      'You are an employee expense risk profiling AI for corporate fraud prevention.',
      `Create a comprehensive risk profile for this employee:

Employee: ${JSON.stringify(employee.rows[0])}
Expense Reports: ${JSON.stringify(reports.rows)}
All Expense Items: ${JSON.stringify(items.rows)}

Analyze:
1. Overall employee risk score (1-10)
2. Spending behavior patterns (frequency, amounts, categories)
3. Policy violation history
4. Vendor usage patterns (any suspicious vendor relationships)
5. Comparison to peer group spending
6. Weekend/off-hours expense patterns
7. Receipt compliance rate
8. Red flags and concerns
9. Positive compliance indicators
10. Recommendations (no action, monitor, investigate, restrict)`
    );

    res.json({ analysis: result.content, model: result.model, usage: result.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13. AI Department Benchmarking
router.post('/department-benchmark', auth, async (req, res) => {
  try {
    const departments = await db.query(`
      SELECT d.*, COUNT(DISTINCT e.id) as emp_count,
      COUNT(DISTINCT er.id) as report_count,
      COALESCE(SUM(er.total_amount), 0) as total_spent
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id
      LEFT JOIN expense_reports er ON d.id = er.department_id
      GROUP BY d.id ORDER BY d.name
    `);

    const categorySpend = await db.query(`
      SELECT d.name as department, c.name as category, SUM(ei.amount) as total
      FROM expense_items ei
      JOIN expense_reports er ON ei.report_id = er.id
      JOIN departments d ON er.department_id = d.id
      LEFT JOIN categories c ON ei.category_id = c.id
      GROUP BY d.name, c.name ORDER BY d.name, total DESC
    `);

    const flaggedByDept = await db.query(`
      SELECT d.name as department, COUNT(*) as flagged_count
      FROM expense_items ei
      JOIN expense_reports er ON ei.report_id = er.id
      JOIN departments d ON er.department_id = d.id
      WHERE ei.is_flagged = true
      GROUP BY d.name
    `);

    const result = await callOpenRouter(
      'You are a department spending benchmarking AI for corporate finance.',
      `Benchmark and compare department spending:

Departments: ${JSON.stringify(departments.rows)}
Spending by Category: ${JSON.stringify(categorySpend.rows)}
Flagged Items by Department: ${JSON.stringify(flaggedByDept.rows)}

Provide:
1. Department rankings by efficiency (spend per employee)
2. Budget utilization comparison
3. Category spending comparison across departments
4. Departments with most policy violations
5. Best practices from top-performing departments
6. Outlier departments requiring attention
7. Recommendations for budget reallocation
8. Cross-department spending anomalies`
    );

    res.json({ analysis: result.content, model: result.model, usage: result.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14. AI Approval Recommendation
router.post('/approval-recommendation/:reportId', auth, async (req, res) => {
  try {
    const report = await db.query(`
      SELECT er.*, e.full_name as employee_name, d.name as department_name
      FROM expense_reports er
      JOIN employees e ON er.employee_id = e.id
      LEFT JOIN departments d ON er.department_id = d.id
      WHERE er.id = $1
    `, [req.params.reportId]);
    if (report.rows.length === 0) return res.status(404).json({ error: 'Report not found' });

    const items = await db.query(`
      SELECT ei.*, c.name as category_name, c.max_amount as category_limit, v.name as vendor_name, v.is_flagged as vendor_flagged
      FROM expense_items ei
      LEFT JOIN categories c ON ei.category_id = c.id
      LEFT JOIN vendors v ON ei.vendor_id = v.id
      WHERE ei.report_id = $1
    `, [req.params.reportId]);

    const policies = await db.query('SELECT * FROM policy_rules WHERE is_active = true');
    const budgets = await db.query(`
      SELECT bl.*, d.name as department_name, c.name as category_name
      FROM budget_limits bl LEFT JOIN departments d ON bl.department_id = d.id
      LEFT JOIN categories c ON bl.category_id = c.id
      WHERE bl.department_id = $1
    `, [report.rows[0].department_id]);

    // Past reports from same employee
    const history = await db.query(`
      SELECT status, COUNT(*) as count, SUM(total_amount) as total
      FROM expense_reports WHERE employee_id = $1 AND id != $2
      GROUP BY status
    `, [report.rows[0].employee_id, req.params.reportId]);

    const result = await callOpenRouter(
      'You are an intelligent expense approval recommendation engine.',
      `Provide a detailed approval recommendation for this expense report:

Report: ${JSON.stringify(report.rows[0])}
Items: ${JSON.stringify(items.rows)}
Active Policies: ${JSON.stringify(policies.rows)}
Department Budgets: ${JSON.stringify(budgets.rows)}
Employee History: ${JSON.stringify(history.rows)}

Provide:
1. RECOMMENDATION: APPROVE / APPROVE WITH CONDITIONS / REQUEST REVISION / REJECT
2. Confidence level (%)
3. Policy compliance summary
4. Budget impact analysis
5. Risk assessment score (1-10)
6. Specific items requiring attention
7. Conditions for approval (if applicable)
8. Suggested comments for the approver
9. Comparison to typical reports
10. Priority level (routine/elevated/urgent)`
    );

    res.json({ analysis: result.content, model: result.model, usage: result.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 15. AI Anomaly Detection (global)
router.post('/anomaly-detection', auth, async (req, res) => {
  try {
    const recentItems = await db.query(`
      SELECT ei.*, c.name as category_name, v.name as vendor_name, v.risk_score as vendor_risk,
      er.report_number, e.full_name as employee_name, d.name as department_name
      FROM expense_items ei
      JOIN expense_reports er ON ei.report_id = er.id
      JOIN employees e ON er.employee_id = e.id
      LEFT JOIN categories c ON ei.category_id = c.id
      LEFT JOIN vendors v ON ei.vendor_id = v.id
      LEFT JOIN departments d ON er.department_id = d.id
      ORDER BY ei.created_at DESC LIMIT 300
    `);

    const stats = await db.query(`
      SELECT c.name as category, AVG(ei.amount) as avg_amount, STDDEV(ei.amount) as stddev_amount,
      MAX(ei.amount) as max_amount, MIN(ei.amount) as min_amount, COUNT(*) as count
      FROM expense_items ei
      LEFT JOIN categories c ON ei.category_id = c.id
      GROUP BY c.name
    `);

    const result = await callOpenRouter(
      'You are an anomaly detection AI specializing in corporate expense data. Use statistical methods to find outliers.',
      `Detect anomalies across all recent expense data:

Recent Expense Items: ${JSON.stringify(recentItems.rows)}
Category Statistics: ${JSON.stringify(stats.rows)}

Detect:
1. Statistical outliers (items > 2 standard deviations from category mean)
2. Unusual patterns (same amount repeated, round numbers, sequential amounts)
3. Time-based anomalies (clusters of expenses, off-hours submissions)
4. Employee anomalies (spending spikes, behavior changes)
5. Vendor anomalies (new vendors with high amounts, concentration risk)
6. Category anomalies (miscategorized expenses, unusual category usage)
7. Geographic anomalies (expenses from unexpected locations)
8. Cross-reference anomalies (conflicting information)

For each anomaly provide: severity, description, affected items, and recommended action.`
    );

    res.json({ analysis: result.content, model: result.model, usage: result.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 16. AI Policy Suggestion
router.post('/policy-suggestions', auth, async (req, res) => {
  try {
    const currentPolicies = await db.query('SELECT * FROM policy_rules ORDER BY name');
    const violations = await db.query(`
      SELECT ei.flag_reason, COUNT(*) as count FROM expense_items ei
      WHERE ei.is_flagged = true AND ei.flag_reason IS NOT NULL
      GROUP BY ei.flag_reason ORDER BY count DESC
    `);

    const spendingPatterns = await db.query(`
      SELECT c.name as category, AVG(ei.amount) as avg, MAX(ei.amount) as max,
      COUNT(*) as count, SUM(CASE WHEN ei.is_flagged THEN 1 ELSE 0 END) as flagged
      FROM expense_items ei
      LEFT JOIN categories c ON ei.category_id = c.id
      GROUP BY c.name ORDER BY flagged DESC
    `);

    const result = await callOpenRouter(
      'You are a corporate expense policy optimization AI.',
      `Analyze current policies and suggest improvements:

Current Policies: ${JSON.stringify(currentPolicies.rows)}
Common Violations: ${JSON.stringify(violations.rows)}
Spending Patterns: ${JSON.stringify(spendingPatterns.rows)}

Provide:
1. Policy gaps (areas without adequate coverage)
2. Overly strict policies (too many false positives)
3. Overly lenient policies (limits too high)
4. New policy recommendations with specific thresholds
5. Policy consolidation opportunities
6. Industry best practice comparison
7. Priority ranking for policy changes
8. Estimated impact of each recommendation`
    );

    // Persist to ai_analysis_results so apply-policy-suggestions can use it
    await db.query(
      'INSERT INTO ai_analysis_results (analysis_type, result, model_used) VALUES ($1, $2, $3)',
      ['policy_suggestions', JSON.stringify({ content: result.content }), result.model]
    );

    res.json({ analysis: result.content, model: result.model, usage: result.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 17. AI Cost Optimization
router.post('/cost-optimization', auth, async (req, res) => {
  try {
    const spending = await db.query(`
      SELECT c.name as category, v.name as vendor, v.is_preferred,
      SUM(ei.amount) as total, COUNT(*) as count, AVG(ei.amount) as avg
      FROM expense_items ei
      LEFT JOIN categories c ON ei.category_id = c.id
      LEFT JOIN vendors v ON ei.vendor_id = v.id
      GROUP BY c.name, v.name, v.is_preferred
      ORDER BY total DESC
    `);

    const deptSpend = await db.query(`
      SELECT d.name as department, d.budget, SUM(er.total_amount) as spent,
      COUNT(er.id) as report_count
      FROM departments d
      LEFT JOIN expense_reports er ON d.id = er.department_id
      GROUP BY d.name, d.budget ORDER BY spent DESC
    `);

    const preferredVsNon = await db.query(`
      SELECT v.is_preferred, COUNT(*) as count, SUM(ei.amount) as total, AVG(ei.amount) as avg
      FROM expense_items ei
      LEFT JOIN vendors v ON ei.vendor_id = v.id
      GROUP BY v.is_preferred
    `);

    const result = await callOpenRouter(
      'You are a corporate cost optimization AI specializing in travel and expense management.',
      `Analyze spending data and identify cost optimization opportunities:

Spending by Category & Vendor: ${JSON.stringify(spending.rows)}
Department Spending: ${JSON.stringify(deptSpend.rows)}
Preferred vs Non-Preferred Vendor Usage: ${JSON.stringify(preferredVsNon.rows)}

Provide:
1. Top 10 cost-saving opportunities with estimated savings
2. Vendor consolidation recommendations
3. Preferred vendor adoption gaps
4. Category-specific savings strategies
5. Travel booking optimization tips
6. Meal and entertainment reduction strategies
7. Technology and process improvements
8. Estimated total annual savings potential
9. Quick wins vs long-term initiatives
10. ROI analysis for each recommendation`
    );

    res.json({ analysis: result.content, model: result.model, usage: result.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 18. AI Tax Deduction Analyzer
router.post('/tax-deductions/:reportId', auth, async (req, res) => {
  try {
    const report = await db.query(`
      SELECT er.*, e.full_name as employee_name, d.name as department_name
      FROM expense_reports er
      JOIN employees e ON er.employee_id = e.id
      LEFT JOIN departments d ON er.department_id = d.id
      WHERE er.id = $1
    `, [req.params.reportId]);
    if (report.rows.length === 0) return res.status(404).json({ error: 'Report not found' });

    const items = await db.query(`
      SELECT ei.*, c.name as category_name, v.name as vendor_name
      FROM expense_items ei
      LEFT JOIN categories c ON ei.category_id = c.id
      LEFT JOIN vendors v ON ei.vendor_id = v.id
      WHERE ei.report_id = $1
    `, [req.params.reportId]);

    const result = await callOpenRouter(
      'You are a tax deduction analysis AI specializing in US corporate business expense deductions.',
      `Analyze these business expenses for tax deduction eligibility:

Report: ${JSON.stringify(report.rows[0])}
Expense Items: ${JSON.stringify(items.rows)}

For each expense item:
1. Tax deductible? (Yes/No/Partial)
2. Deduction category (Travel, Meals 50%, Entertainment, Business Supplies, etc.)
3. Deduction percentage applicable
4. Documentation requirements met?
5. IRS compliance notes

Also provide:
- Total deductible amount
- Total non-deductible amount
- Partially deductible items with percentages
- Missing documentation that would affect deductibility
- Tax optimization recommendations
- Common audit triggers to watch for`
    );

    res.json({ analysis: result.content, model: result.model, usage: result.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 19. AI Audit Report Generator
router.post('/audit-report', auth, async (req, res) => {
  try {
    const reports = await db.query(`
      SELECT er.*, e.full_name as employee_name, d.name as department_name
      FROM expense_reports er
      JOIN employees e ON er.employee_id = e.id
      LEFT JOIN departments d ON er.department_id = d.id
      ORDER BY er.created_at DESC
    `);

    const flaggedItems = await db.query(`
      SELECT ei.*, c.name as category_name, v.name as vendor_name, er.report_number, e.full_name as employee_name
      FROM expense_items ei
      JOIN expense_reports er ON ei.report_id = er.id
      JOIN employees e ON er.employee_id = e.id
      LEFT JOIN categories c ON ei.category_id = c.id
      LEFT JOIN vendors v ON ei.vendor_id = v.id
      WHERE ei.is_flagged = true
    `);

    const rejectedReports = await db.query(`
      SELECT er.*, e.full_name as employee_name, aw.comments as rejection_reason
      FROM expense_reports er
      JOIN employees e ON er.employee_id = e.id
      LEFT JOIN approval_workflows aw ON er.id = aw.report_id AND aw.status = 'rejected'
      WHERE er.status = 'rejected'
    `);

    const budgetStatus = await db.query(`
      SELECT bl.*, d.name as department_name, c.name as category_name
      FROM budget_limits bl
      LEFT JOIN departments d ON bl.department_id = d.id
      LEFT JOIN categories c ON bl.category_id = c.id
      WHERE bl.spent_amount > bl.limit_amount * bl.alert_threshold / 100
    `);

    const result = await callOpenRouter(
      'You are a professional internal audit report writer for corporate expense management.',
      `Generate a comprehensive audit report for the expense management system:

All Reports: ${JSON.stringify(reports.rows)}
Flagged Items: ${JSON.stringify(flaggedItems.rows)}
Rejected Reports: ${JSON.stringify(rejectedReports.rows)}
Budget Alerts: ${JSON.stringify(budgetStatus.rows)}

Generate a professional audit report with:
1. Executive Summary
2. Scope and Methodology
3. Key Findings (numbered, with severity)
4. Statistical Overview (total spend, approval rates, flag rates)
5. High-Risk Areas
6. Policy Compliance Assessment
7. Budget Variance Analysis
8. Vendor Risk Summary
9. Recommendations (prioritized)
10. Action Items with assigned responsibility
11. Conclusion`
    );

    res.json({ analysis: result.content, model: result.model, usage: result.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 20. AI Currency Converter & Validator
router.post('/currency-validator', auth, async (req, res) => {
  try {
    const { amount, from_currency, to_currency, expense_date, description } = req.body;

    const result = await callOpenRouter(
      'You are a corporate expense currency conversion and validation AI.',
      `Validate and convert this foreign currency expense:

Amount: ${amount} ${from_currency || 'USD'}
Target Currency: ${to_currency || 'USD'}
Expense Date: ${expense_date || 'today'}
Description: ${description || 'Business expense'}

Provide:
1. Estimated conversion rate for the expense date
2. Converted amount in target currency
3. Rate source and confidence
4. Whether the amount seems reasonable for the described expense
5. Common currency fraud indicators to check
6. Per diem comparison for the origin country
7. Tax implications of foreign currency expenses
8. Documentation requirements for foreign expenses
9. Exchange rate variance alert (if rate seems off)
10. Recommended reimbursement amount`
    );

    res.json({ analysis: result.content, model: result.model, usage: result.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
