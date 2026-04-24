const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop and recreate tables
    await client.query(`
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS approval_workflows CASCADE;
      DROP TABLE IF EXISTS ai_analysis_results CASCADE;
      DROP TABLE IF EXISTS expense_items CASCADE;
      DROP TABLE IF EXISTS expense_reports CASCADE;
      DROP TABLE IF EXISTS trip_plans CASCADE;
      DROP TABLE IF EXISTS budget_limits CASCADE;
      DROP TABLE IF EXISTS policy_rules CASCADE;
      DROP TABLE IF EXISTS vendors CASCADE;
      DROP TABLE IF EXISTS categories CASCADE;
      DROP TABLE IF EXISTS departments CASCADE;
      DROP TABLE IF EXISTS employees CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    // Users table
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'employee',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Departments
    await client.query(`
      CREATE TABLE departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(20) UNIQUE NOT NULL,
        budget DECIMAL(12,2) DEFAULT 0,
        manager VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Employees
    await client.query(`
      CREATE TABLE employees (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        employee_id VARCHAR(20) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        department_id INTEGER REFERENCES departments(id),
        title VARCHAR(255),
        hire_date DATE,
        manager_id INTEGER REFERENCES employees(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Categories
    await client.query(`
      CREATE TABLE categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(20) UNIQUE NOT NULL,
        description TEXT,
        max_amount DECIMAL(10,2),
        requires_receipt BOOLEAN DEFAULT true,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Vendors
    await client.query(`
      CREATE TABLE vendors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        risk_score DECIMAL(3,1) DEFAULT 0,
        total_transactions INTEGER DEFAULT 0,
        total_amount DECIMAL(12,2) DEFAULT 0,
        is_preferred BOOLEAN DEFAULT false,
        is_flagged BOOLEAN DEFAULT false,
        address TEXT,
        contact_email VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Policy Rules
    await client.query(`
      CREATE TABLE policy_rules (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        rule_type VARCHAR(50) NOT NULL,
        condition_field VARCHAR(100),
        condition_operator VARCHAR(20),
        condition_value VARCHAR(255),
        action_type VARCHAR(50),
        severity VARCHAR(20) DEFAULT 'warning',
        is_active BOOLEAN DEFAULT true,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Budget Limits
    await client.query(`
      CREATE TABLE budget_limits (
        id SERIAL PRIMARY KEY,
        department_id INTEGER REFERENCES departments(id),
        category_id INTEGER REFERENCES categories(id),
        period VARCHAR(20) DEFAULT 'monthly',
        limit_amount DECIMAL(12,2) NOT NULL,
        spent_amount DECIMAL(12,2) DEFAULT 0,
        alert_threshold DECIMAL(5,2) DEFAULT 80.00,
        fiscal_year INTEGER DEFAULT 2024,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Expense Reports
    await client.query(`
      CREATE TABLE expense_reports (
        id SERIAL PRIMARY KEY,
        report_number VARCHAR(20) UNIQUE NOT NULL,
        employee_id INTEGER REFERENCES employees(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(30) DEFAULT 'draft',
        total_amount DECIMAL(12,2) DEFAULT 0,
        submitted_date DATE,
        approved_date DATE,
        approved_by INTEGER REFERENCES employees(id),
        department_id INTEGER REFERENCES departments(id),
        trip_destination VARCHAR(255),
        trip_start_date DATE,
        trip_end_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Expense Items
    await client.query(`
      CREATE TABLE expense_items (
        id SERIAL PRIMARY KEY,
        report_id INTEGER REFERENCES expense_reports(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id),
        vendor_id INTEGER REFERENCES vendors(id),
        description VARCHAR(500) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        expense_date DATE NOT NULL,
        receipt_url VARCHAR(500),
        has_receipt BOOLEAN DEFAULT false,
        is_flagged BOOLEAN DEFAULT false,
        flag_reason TEXT,
        ai_category_suggestion VARCHAR(100),
        ai_risk_score DECIMAL(3,1) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // AI Analysis Results
    await client.query(`
      CREATE TABLE ai_analysis_results (
        id SERIAL PRIMARY KEY,
        report_id INTEGER REFERENCES expense_reports(id),
        item_id INTEGER REFERENCES expense_items(id),
        analysis_type VARCHAR(50) NOT NULL,
        result JSONB,
        confidence DECIMAL(5,2),
        model_used VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Approval Workflows
    await client.query(`
      CREATE TABLE approval_workflows (
        id SERIAL PRIMARY KEY,
        report_id INTEGER REFERENCES expense_reports(id) ON DELETE CASCADE,
        approver_id INTEGER REFERENCES employees(id),
        status VARCHAR(30) DEFAULT 'pending',
        level INTEGER DEFAULT 1,
        comments TEXT,
        action_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Trip Plans
    await client.query(`
      CREATE TABLE trip_plans (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id),
        destination VARCHAR(255) NOT NULL,
        purpose TEXT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        estimated_budget DECIMAL(12,2),
        daily_breakdown JSONB,
        status VARCHAR(30) DEFAULT 'planned',
        ai_suggestions JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Audit Logs
    await client.query(`
      CREATE TABLE audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Seed Users
    const hashedPassword = await bcrypt.hash('password123', 10);
    await client.query(`
      INSERT INTO users (email, password, full_name, role) VALUES
      ('admin@company.com', $1, 'Admin User', 'admin'),
      ('john.smith@company.com', $1, 'John Smith', 'manager'),
      ('sarah.jones@company.com', $1, 'Sarah Jones', 'employee'),
      ('mike.wilson@company.com', $1, 'Mike Wilson', 'employee'),
      ('emily.davis@company.com', $1, 'Emily Davis', 'auditor')
    `, [hashedPassword]);

    // Seed Departments
    await client.query(`
      INSERT INTO departments (name, code, budget, manager) VALUES
      ('Engineering', 'ENG', 500000.00, 'John Smith'),
      ('Marketing', 'MKT', 300000.00, 'Lisa Chen'),
      ('Sales', 'SLS', 400000.00, 'Robert Brown'),
      ('Finance', 'FIN', 200000.00, 'Maria Garcia'),
      ('Human Resources', 'HR', 150000.00, 'David Lee'),
      ('Operations', 'OPS', 350000.00, 'Anna Taylor'),
      ('Research & Development', 'R&D', 600000.00, 'James Park'),
      ('Legal', 'LEG', 180000.00, 'Patricia White'),
      ('Customer Support', 'CS', 250000.00, 'Thomas Brown'),
      ('Product', 'PRD', 280000.00, 'Jennifer Adams'),
      ('Design', 'DSG', 200000.00, 'Michelle Liu'),
      ('Data Science', 'DS', 320000.00, 'Kevin Zhang'),
      ('Security', 'SEC', 220000.00, 'Brian Martinez'),
      ('IT Infrastructure', 'IT', 400000.00, 'Steven Clark'),
      ('Executive', 'EXEC', 800000.00, 'Catherine Moore')
    `);

    // Seed Employees
    await client.query(`
      INSERT INTO employees (user_id, employee_id, full_name, email, department_id, title, hire_date) VALUES
      (1, 'EMP001', 'Admin User', 'admin@company.com', 15, 'System Administrator', '2020-01-15'),
      (2, 'EMP002', 'John Smith', 'john.smith@company.com', 1, 'Engineering Manager', '2019-03-20'),
      (3, 'EMP003', 'Sarah Jones', 'sarah.jones@company.com', 1, 'Senior Developer', '2021-06-10'),
      (4, 'EMP004', 'Mike Wilson', 'mike.wilson@company.com', 3, 'Sales Representative', '2022-01-05'),
      (5, 'EMP005', 'Emily Davis', 'emily.davis@company.com', 4, 'Financial Auditor', '2020-09-15'),
      (NULL, 'EMP006', 'Lisa Chen', 'lisa.chen@company.com', 2, 'Marketing Director', '2018-07-01'),
      (NULL, 'EMP007', 'Robert Brown', 'robert.brown@company.com', 3, 'Sales Director', '2019-02-14'),
      (NULL, 'EMP008', 'Maria Garcia', 'maria.garcia@company.com', 4, 'Finance Director', '2017-11-20'),
      (NULL, 'EMP009', 'David Lee', 'david.lee@company.com', 5, 'HR Director', '2020-04-01'),
      (NULL, 'EMP010', 'Anna Taylor', 'anna.taylor@company.com', 6, 'Operations Manager', '2021-01-10'),
      (NULL, 'EMP011', 'James Park', 'james.park@company.com', 7, 'R&D Lead', '2019-08-15'),
      (NULL, 'EMP012', 'Patricia White', 'patricia.white@company.com', 8, 'Legal Counsel', '2020-03-01'),
      (NULL, 'EMP013', 'Thomas Brown', 'thomas.brown@company.com', 9, 'Support Manager', '2021-05-20'),
      (NULL, 'EMP014', 'Jennifer Adams', 'jennifer.adams@company.com', 10, 'Product Manager', '2020-10-01'),
      (NULL, 'EMP015', 'Michelle Liu', 'michelle.liu@company.com', 11, 'Design Lead', '2021-02-15'),
      (NULL, 'EMP016', 'Kevin Zhang', 'kevin.zhang@company.com', 12, 'Data Science Lead', '2020-07-01'),
      (NULL, 'EMP017', 'Brian Martinez', 'brian.martinez@company.com', 13, 'Security Engineer', '2021-09-01'),
      (NULL, 'EMP018', 'Steven Clark', 'steven.clark@company.com', 14, 'IT Manager', '2019-06-15')
    `);

    // Seed Categories
    await client.query(`
      INSERT INTO categories (name, code, description, max_amount, requires_receipt) VALUES
      ('Airfare', 'AIR', 'Flight tickets and related fees', 5000.00, true),
      ('Hotel', 'HTL', 'Accommodation expenses', 350.00, true),
      ('Meals', 'MEL', 'Food and dining expenses', 100.00, true),
      ('Ground Transport', 'GND', 'Taxi, rideshare, rental car', 200.00, true),
      ('Conference', 'CNF', 'Conference fees and registration', 2000.00, true),
      ('Office Supplies', 'OFC', 'Office and work supplies', 500.00, true),
      ('Software', 'SFT', 'Software licenses and subscriptions', 1000.00, false),
      ('Equipment', 'EQP', 'Hardware and equipment', 3000.00, true),
      ('Client Entertainment', 'ENT', 'Client meals and entertainment', 500.00, true),
      ('Training', 'TRN', 'Professional development and training', 2500.00, true),
      ('Communication', 'COM', 'Phone, internet, postage', 150.00, false),
      ('Parking & Tolls', 'PKG', 'Parking fees and road tolls', 50.00, true),
      ('Mileage', 'MLG', 'Personal vehicle mileage reimbursement', 1000.00, false),
      ('Medical', 'MED', 'Travel-related medical expenses', 500.00, true),
      ('Miscellaneous', 'MSC', 'Other approved expenses', 200.00, true),
      ('Books & Publications', 'BKS', 'Professional books and subscriptions', 300.00, false),
      ('Visa & Travel Docs', 'VIS', 'Visa fees and travel documentation', 500.00, true),
      ('Tips & Gratuities', 'TIP', 'Service gratuities', 50.00, false)
    `);

    // Seed Vendors
    await client.query(`
      INSERT INTO vendors (name, category, risk_score, total_transactions, total_amount, is_preferred, is_flagged, address, contact_email) VALUES
      ('United Airlines', 'Airline', 1.2, 156, 234500.00, true, false, '233 S Wacker Dr, Chicago, IL', 'corporate@united.com'),
      ('Marriott Hotels', 'Hotel', 1.0, 203, 189750.00, true, false, '10400 Fernwood Rd, Bethesda, MD', 'corporate@marriott.com'),
      ('Uber Technologies', 'Transportation', 1.5, 892, 45230.00, true, false, '1455 Market St, San Francisco, CA', 'business@uber.com'),
      ('Amazon Web Services', 'Software', 0.8, 48, 156000.00, true, false, '410 Terry Ave N, Seattle, WA', 'aws-billing@amazon.com'),
      ('WeWork', 'Office Space', 2.1, 24, 72000.00, false, false, '115 W 18th St, New York, NY', 'billing@wework.com'),
      ('Delta Airlines', 'Airline', 1.1, 134, 198400.00, true, false, '1030 Delta Blvd, Atlanta, GA', 'corporate@delta.com'),
      ('Hilton Hotels', 'Hotel', 1.3, 178, 167800.00, true, false, '7930 Jones Branch Dr, McLean, VA', 'corporate@hilton.com'),
      ('Lyft', 'Transportation', 1.6, 567, 28900.00, false, false, '185 Berry St, San Francisco, CA', 'business@lyft.com'),
      ('Staples', 'Office Supplies', 0.9, 89, 12300.00, true, false, '500 Staples Dr, Framingham, MA', 'business@staples.com'),
      ('FedEx', 'Shipping', 1.0, 67, 8900.00, true, false, '942 S Shady Grove Rd, Memphis, TN', 'billing@fedex.com'),
      ('Shadyville Corp', 'Consulting', 8.5, 3, 45000.00, false, true, 'Unknown Address', 'info@shadyville.biz'),
      ('Quick Cash Services', 'Financial', 7.2, 5, 12500.00, false, true, 'PO Box 999, Somewhere', 'contact@quickcash.net'),
      ('Apple Inc', 'Technology', 0.5, 45, 89000.00, true, false, '1 Apple Park Way, Cupertino, CA', 'business@apple.com'),
      ('Microsoft', 'Software', 0.7, 56, 134000.00, true, false, '1 Microsoft Way, Redmond, WA', 'msbilling@microsoft.com'),
      ('The Ritz-Carlton', 'Hotel', 3.5, 12, 48000.00, false, false, '4445 Willard Ave, Chevy Chase, MD', 'events@ritzcarlton.com'),
      ('Local Diner XYZ', 'Restaurant', 2.8, 234, 18900.00, false, false, '123 Main St, Anytown, USA', NULL),
      ('Global Consulting Inc', 'Consulting', 1.8, 15, 225000.00, false, false, '456 Business Ave, New York, NY', 'ap@globalconsulting.com'),
      ('Office Depot', 'Office Supplies', 1.1, 78, 9800.00, true, false, '6600 N Military Trail, Boca Raton, FL', 'business@officedepot.com')
    `);

    // Seed Policy Rules
    await client.query(`
      INSERT INTO policy_rules (name, category, rule_type, condition_field, condition_operator, condition_value, action_type, severity, is_active, description) VALUES
      ('Meal Limit', 'Meals', 'amount_limit', 'amount', 'greater_than', '100', 'flag', 'warning', true, 'Flag meals exceeding $100'),
      ('Hotel Limit', 'Hotel', 'amount_limit', 'amount', 'greater_than', '350', 'flag', 'warning', true, 'Flag hotel stays exceeding $350/night'),
      ('Receipt Required', 'All', 'receipt_check', 'has_receipt', 'equals', 'false', 'block', 'error', true, 'Block expenses over $25 without receipts'),
      ('Weekend Travel', 'All', 'date_check', 'expense_date', 'is_weekend', 'true', 'flag', 'info', true, 'Flag weekend expenses for review'),
      ('Duplicate Check', 'All', 'duplicate', 'amount', 'same_day_vendor', 'true', 'flag', 'warning', true, 'Flag potential duplicate submissions'),
      ('High Value Alert', 'All', 'amount_limit', 'amount', 'greater_than', '5000', 'escalate', 'critical', true, 'Escalate expenses over $5,000'),
      ('Flagged Vendor', 'All', 'vendor_check', 'vendor_id', 'is_flagged', 'true', 'block', 'critical', true, 'Block transactions with flagged vendors'),
      ('Entertainment Limit', 'Entertainment', 'amount_limit', 'amount', 'greater_than', '500', 'flag', 'warning', true, 'Flag entertainment over $500'),
      ('First Class Air', 'Airfare', 'category_check', 'description', 'contains', 'first class', 'escalate', 'warning', true, 'Escalate first class flight bookings'),
      ('Conference Cap', 'Conference', 'amount_limit', 'amount', 'greater_than', '2000', 'flag', 'warning', true, 'Flag conference fees over $2,000'),
      ('Alcohol Policy', 'Meals', 'category_check', 'description', 'contains', 'alcohol', 'flag', 'warning', true, 'Flag expenses containing alcohol'),
      ('Same Day Multiple Meals', 'Meals', 'frequency_check', 'category', 'count_per_day', '3', 'flag', 'info', true, 'Flag more than 3 meal expenses per day'),
      ('Late Submission', 'All', 'date_check', 'submitted_date', 'days_after_expense', '30', 'flag', 'warning', true, 'Flag reports submitted 30+ days late'),
      ('Mileage Rate', 'Mileage', 'rate_check', 'amount', 'per_mile_rate', '0.67', 'flag', 'info', true, 'Check mileage reimbursement rate'),
      ('International Travel', 'All', 'approval_check', 'trip_destination', 'is_international', 'true', 'escalate', 'warning', true, 'Require VP approval for international travel')
    `);

    // Seed Expense Reports
    await client.query(`
      INSERT INTO expense_reports (report_number, employee_id, title, description, status, total_amount, submitted_date, department_id, trip_destination, trip_start_date, trip_end_date) VALUES
      ('RPT-2024-001', 3, 'AWS re:Invent 2024', 'Annual AWS conference in Las Vegas', 'approved', 4250.75, '2024-12-10', 1, 'Las Vegas, NV', '2024-12-01', '2024-12-05'),
      ('RPT-2024-002', 4, 'Q4 Client Meetings NYC', 'Client meetings and dinners in New York', 'pending', 3890.50, '2024-11-28', 3, 'New York, NY', '2024-11-18', '2024-11-22'),
      ('RPT-2024-003', 3, 'Team Offsite Portland', 'Engineering team building event', 'approved', 2150.00, '2024-10-15', 1, 'Portland, OR', '2024-10-07', '2024-10-09'),
      ('RPT-2024-004', 4, 'Sales Conference Chicago', 'Annual sales kickoff conference', 'submitted', 5670.25, '2024-11-05', 3, 'Chicago, IL', '2024-10-28', '2024-11-01'),
      ('RPT-2024-005', 6, 'Marketing Summit LA', 'Digital marketing conference', 'approved', 3420.00, '2024-09-20', 2, 'Los Angeles, CA', '2024-09-15', '2024-09-18'),
      ('RPT-2024-006', 7, 'Client Visit Boston', 'Enterprise client quarterly review', 'rejected', 8950.00, '2024-10-30', 3, 'Boston, MA', '2024-10-22', '2024-10-25'),
      ('RPT-2024-007', 10, 'Supply Chain Review', 'Supplier visits and facility tours', 'approved', 2780.50, '2024-11-12', 6, 'Detroit, MI', '2024-11-04', '2024-11-07'),
      ('RPT-2024-008', 11, 'Research Conference MIT', 'AI/ML research symposium', 'pending', 4100.00, '2024-12-01', 7, 'Cambridge, MA', '2024-11-25', '2024-11-28'),
      ('RPT-2024-009', 14, 'Product Launch Event', 'Product showcase in San Francisco', 'approved', 6200.75, '2024-10-05', 10, 'San Francisco, CA', '2024-09-28', '2024-10-02'),
      ('RPT-2024-010', 3, 'Training Workshop Denver', 'Advanced cloud architecture training', 'draft', 1850.25, NULL, 1, 'Denver, CO', '2024-12-15', '2024-12-17'),
      ('RPT-2024-011', 16, 'Data Science Summit', 'Annual data science conference', 'submitted', 3560.00, '2024-11-18', 12, 'Austin, TX', '2024-11-10', '2024-11-14'),
      ('RPT-2024-012', 17, 'Security Audit Trip', 'On-site security assessment', 'approved', 2340.75, '2024-10-20', 13, 'Washington, DC', '2024-10-14', '2024-10-16'),
      ('RPT-2024-013', 4, 'West Coast Sales Tour', 'Multi-city client visits', 'pending', 7820.00, '2024-12-05', 3, 'Seattle/Portland/SF', '2024-11-25', '2024-12-03'),
      ('RPT-2024-014', 15, 'Design Conference', 'UX design annual conference', 'approved', 2980.50, '2024-09-30', 11, 'Miami, FL', '2024-09-24', '2024-09-27'),
      ('RPT-2024-015', 8, 'Finance Summit', 'CFO quarterly finance summit', 'approved', 4560.00, '2024-11-25', 4, 'Dallas, TX', '2024-11-18', '2024-11-21'),
      ('RPT-2024-016', 12, 'Legal Conference', 'Annual compliance & law conference', 'submitted', 3200.00, '2024-10-28', 8, 'Philadelphia, PA', '2024-10-21', '2024-10-24'),
      ('RPT-2024-017', 18, 'IT Infrastructure Review', 'Data center visits and vendor meetings', 'draft', 5100.00, NULL, 14, 'Phoenix, AZ', '2024-12-10', '2024-12-13'),
      ('RPT-2024-018', 9, 'HR Conference', 'People operations conference', 'approved', 2890.25, '2024-10-10', 5, 'Nashville, TN', '2024-10-03', '2024-10-06')
    `);

    // Seed Expense Items
    await client.query(`
      INSERT INTO expense_items (report_id, category_id, vendor_id, description, amount, expense_date, has_receipt, is_flagged, flag_reason, ai_risk_score, notes) VALUES
      (1, 1, 1, 'Round-trip flight SFO to LAS', 450.00, '2024-12-01', true, false, NULL, 1.2, 'Economy class'),
      (1, 2, 2, 'Marriott Las Vegas 4 nights', 1200.00, '2024-12-01', true, false, NULL, 1.5, 'Conference rate'),
      (1, 3, NULL, 'Team dinner at STK Steakhouse', 285.75, '2024-12-02', true, true, 'Amount exceeds meal limit', 4.2, '4 people'),
      (1, 4, 3, 'Uber airport transfers', 65.00, '2024-12-01', true, false, NULL, 0.8, NULL),
      (1, 5, NULL, 'AWS re:Invent registration', 1800.00, '2024-11-01', true, false, NULL, 0.5, 'Early bird discount'),
      (1, 3, NULL, 'Working lunch Day 2', 45.00, '2024-12-02', true, false, NULL, 0.3, NULL),
      (1, 3, NULL, 'Coffee and snacks', 35.00, '2024-12-03', false, true, 'Missing receipt', 2.1, NULL),
      (1, 12, NULL, 'Hotel parking 4 days', 120.00, '2024-12-05', true, false, NULL, 0.9, NULL),
      (1, 3, NULL, 'Breakfast meeting Day 3', 62.00, '2024-12-03', true, false, NULL, 0.5, NULL),
      (1, 11, NULL, 'International call charges', 18.00, '2024-12-02', false, false, NULL, 0.2, NULL),
      (1, 15, NULL, 'Conference swag shipping', 25.00, '2024-12-05', true, false, NULL, 0.4, NULL),
      (1, 4, 3, 'Uber to conference venue', 22.00, '2024-12-02', true, false, NULL, 0.3, NULL),
      (1, 3, NULL, 'Client dinner AWS party', 78.00, '2024-12-03', true, false, NULL, 1.0, '2 people'),
      (1, 18, NULL, 'Tips and gratuities', 35.00, '2024-12-04', false, false, NULL, 0.6, NULL),
      (1, 15, NULL, 'Power adapter purchase', 10.00, '2024-12-01', true, false, NULL, 0.1, NULL),
      (2, 1, 6, 'Round-trip flight SFO to JFK', 680.00, '2024-11-18', true, false, NULL, 1.0, 'Economy plus'),
      (2, 2, 7, 'Hilton Midtown NYC 4 nights', 1560.00, '2024-11-18', true, true, 'Exceeds hotel limit', 3.8, '$390/night'),
      (2, 3, NULL, 'Client dinner at Nobu', 520.50, '2024-11-19', true, true, 'High meal expense', 6.5, '3 people with client'),
      (2, 9, NULL, 'Client entertainment - Broadway', 450.00, '2024-11-20', true, false, NULL, 2.5, '2 tickets'),
      (2, 4, 3, 'Uber rides (5 trips)', 180.00, '2024-11-21', true, false, NULL, 1.2, NULL),
      (2, 3, NULL, 'Working breakfast meeting', 85.00, '2024-11-19', true, false, NULL, 0.8, NULL),
      (2, 3, NULL, 'Lunch with prospect', 95.00, '2024-11-20', true, false, NULL, 0.7, NULL),
      (2, 18, NULL, 'Tips various', 45.00, '2024-11-22', false, false, NULL, 0.5, NULL),
      (2, 15, NULL, 'Gift for client', 175.00, '2024-11-21', true, true, 'Requires approval for gifts', 3.2, NULL),
      (2, 4, 8, 'Lyft to airport', 55.00, '2024-11-22', true, false, NULL, 0.4, NULL),
      (2, 11, NULL, 'Data roaming charges', 45.00, '2024-11-22', false, false, NULL, 0.3, NULL),
      (6, 1, 1, 'First class flight to Boston', 2800.00, '2024-10-22', true, true, 'First class requires approval', 7.5, 'First class upgrade'),
      (6, 2, 15, 'Ritz-Carlton Boston 3 nights', 2100.00, '2024-10-22', true, true, 'Luxury hotel exceeds limit', 8.2, '$700/night'),
      (6, 3, NULL, 'Dinner at expensive restaurant', 890.00, '2024-10-23', true, true, 'Excessive meal expense', 9.1, '2 people only'),
      (6, 9, NULL, 'Golf outing with client', 650.00, '2024-10-24', true, true, 'Entertainment exceeds limit', 5.5, NULL),
      (6, 4, 3, 'Luxury car service', 480.00, '2024-10-23', true, true, 'Premium transport', 6.3, 'Black car'),
      (6, 15, 11, 'Consulting services - Shadyville', 1500.00, '2024-10-24', false, true, 'Flagged vendor', 9.8, 'No receipt, flagged vendor'),
      (6, 3, NULL, 'Mini bar charges', 230.00, '2024-10-25', false, true, 'Alcohol policy', 7.0, 'Alcohol included'),
      (6, 3, NULL, 'Room service breakfast', 120.00, '2024-10-24', true, false, NULL, 3.5, NULL),
      (6, 18, NULL, 'Excessive tips', 180.00, '2024-10-25', false, true, 'Unusual tip amount', 6.8, NULL)
    `);

    // Seed Budget Limits
    await client.query(`
      INSERT INTO budget_limits (department_id, category_id, period, limit_amount, spent_amount, alert_threshold, fiscal_year) VALUES
      (1, 1, 'quarterly', 25000.00, 18500.00, 80, 2024),
      (1, 2, 'quarterly', 20000.00, 15200.00, 80, 2024),
      (1, 5, 'annual', 50000.00, 32000.00, 75, 2024),
      (3, 1, 'quarterly', 35000.00, 28900.00, 80, 2024),
      (3, 9, 'quarterly', 15000.00, 12800.00, 85, 2024),
      (2, 1, 'quarterly', 15000.00, 8900.00, 80, 2024),
      (2, 5, 'annual', 30000.00, 22000.00, 75, 2024),
      (4, 1, 'quarterly', 10000.00, 4500.00, 80, 2024),
      (7, 5, 'annual', 40000.00, 35200.00, 70, 2024),
      (10, 1, 'quarterly', 20000.00, 16800.00, 80, 2024),
      (1, 3, 'monthly', 5000.00, 3200.00, 80, 2024),
      (3, 3, 'monthly', 8000.00, 6500.00, 80, 2024),
      (12, 5, 'annual', 35000.00, 28000.00, 80, 2024),
      (14, 8, 'annual', 100000.00, 67000.00, 75, 2024),
      (15, 1, 'quarterly', 50000.00, 32000.00, 80, 2024)
    `);

    // Seed Trip Plans
    await client.query(`
      INSERT INTO trip_plans (employee_id, destination, purpose, start_date, end_date, estimated_budget, status, daily_breakdown) VALUES
      (3, 'Tokyo, Japan', 'Tech Conference & Partner Meetings', '2025-03-15', '2025-03-22', 8500.00, 'planned', '${JSON.stringify([
        {day: 1, date: '2025-03-15', items: [{type: 'Flight', amount: 1200}, {type: 'Hotel', amount: 250}, {type: 'Meals', amount: 80}, {type: 'Transport', amount: 50}]},
        {day: 2, date: '2025-03-16', items: [{type: 'Hotel', amount: 250}, {type: 'Conference', amount: 500}, {type: 'Meals', amount: 100}, {type: 'Transport', amount: 30}]},
        {day: 3, date: '2025-03-17', items: [{type: 'Hotel', amount: 250}, {type: 'Conference', amount: 0}, {type: 'Meals', amount: 100}, {type: 'Transport', amount: 30}]},
        {day: 4, date: '2025-03-18', items: [{type: 'Hotel', amount: 250}, {type: 'Client Meeting', amount: 200}, {type: 'Meals', amount: 120}, {type: 'Transport', amount: 40}]},
        {day: 5, date: '2025-03-19', items: [{type: 'Hotel', amount: 250}, {type: 'Partner Visit', amount: 0}, {type: 'Meals', amount: 100}, {type: 'Transport', amount: 60}]},
        {day: 6, date: '2025-03-20', items: [{type: 'Hotel', amount: 250}, {type: 'Sightseeing', amount: 150}, {type: 'Meals', amount: 100}, {type: 'Transport', amount: 50}]},
        {day: 7, date: '2025-03-21', items: [{type: 'Hotel', amount: 250}, {type: 'Meals', amount: 80}, {type: 'Transport', amount: 30}]},
        {day: 8, date: '2025-03-22', items: [{type: 'Flight', amount: 0}, {type: 'Meals', amount: 50}, {type: 'Transport', amount: 50}]}
      ])}'),
      (4, 'London, UK', 'Sales Kick-off & Client Entertainment', '2025-02-10', '2025-02-14', 6200.00, 'approved', '${JSON.stringify([
        {day: 1, date: '2025-02-10', items: [{type: 'Flight', amount: 900}, {type: 'Hotel', amount: 300}, {type: 'Meals', amount: 80}, {type: 'Transport', amount: 60}]},
        {day: 2, date: '2025-02-11', items: [{type: 'Hotel', amount: 300}, {type: 'Conference', amount: 450}, {type: 'Meals', amount: 100}, {type: 'Transport', amount: 40}]},
        {day: 3, date: '2025-02-12', items: [{type: 'Hotel', amount: 300}, {type: 'Client Dinner', amount: 350}, {type: 'Meals', amount: 60}, {type: 'Transport', amount: 40}]},
        {day: 4, date: '2025-02-13', items: [{type: 'Hotel', amount: 300}, {type: 'Client Meeting', amount: 0}, {type: 'Meals', amount: 100}, {type: 'Transport', amount: 50}]},
        {day: 5, date: '2025-02-14', items: [{type: 'Flight', amount: 0}, {type: 'Meals', amount: 50}, {type: 'Transport', amount: 70}]}
      ])}'),
      (11, 'Berlin, Germany', 'AI Research Symposium', '2025-04-05', '2025-04-10', 5800.00, 'planned', NULL),
      (14, 'Singapore', 'Product Launch APAC', '2025-05-12', '2025-05-17', 7200.00, 'planned', NULL),
      (2, 'Austin, TX', 'Engineering Team Retreat', '2025-01-20', '2025-01-23', 3500.00, 'approved', NULL),
      (6, 'Cannes, France', 'Advertising Festival', '2025-06-16', '2025-06-21', 9500.00, 'planned', NULL),
      (16, 'San Jose, CA', 'GPU Technology Conference', '2025-03-17', '2025-03-20', 4200.00, 'approved', NULL),
      (7, 'Dubai, UAE', 'GITEX Technology Week', '2025-10-14', '2025-10-18', 8800.00, 'planned', NULL),
      (17, 'Las Vegas, NV', 'Black Hat Security', '2025-08-02', '2025-08-07', 5500.00, 'planned', NULL),
      (8, 'New York, NY', 'Finance & Compliance Summit', '2025-04-22', '2025-04-25', 4800.00, 'approved', NULL),
      (15, 'Copenhagen, Denmark', 'Design Thinking Workshop', '2025-05-05', '2025-05-09', 6100.00, 'planned', NULL),
      (9, 'Chicago, IL', 'HR Tech Conference', '2025-09-15', '2025-09-18', 3900.00, 'planned', NULL),
      (10, 'Atlanta, GA', 'Supply Chain Expo', '2025-03-24', '2025-03-27', 3200.00, 'approved', NULL),
      (13, 'Denver, CO', 'Customer Success Summit', '2025-06-09', '2025-06-12', 3400.00, 'planned', NULL),
      (18, 'Seattle, WA', 'Cloud Infrastructure Summit', '2025-07-14', '2025-07-17', 3800.00, 'planned', NULL)
    `);

    // Seed Approval Workflows
    await client.query(`
      INSERT INTO approval_workflows (report_id, approver_id, status, level, comments, action_date) VALUES
      (1, 2, 'approved', 1, 'All expenses within policy', '2024-12-12'),
      (2, 7, 'pending', 1, NULL, NULL),
      (3, 2, 'approved', 1, 'Approved - team building', '2024-10-17'),
      (4, 7, 'pending', 1, 'Reviewing high amount', NULL),
      (5, 6, 'approved', 1, 'Standard marketing expenses', '2024-09-22'),
      (6, 7, 'rejected', 1, 'Multiple policy violations - first class, luxury hotel, flagged vendor', '2024-11-02'),
      (7, 10, 'approved', 1, 'Approved', '2024-11-14'),
      (8, 11, 'pending', 1, NULL, NULL),
      (9, 14, 'approved', 1, 'Product launch approved by VP', '2024-10-08'),
      (11, 16, 'pending', 1, NULL, NULL),
      (12, 17, 'approved', 1, 'Security audit approved', '2024-10-22'),
      (13, 7, 'pending', 1, 'West coast tour - high total', NULL),
      (14, 15, 'approved', 1, 'Design conference approved', '2024-10-02'),
      (15, 8, 'approved', 1, 'Finance summit approved', '2024-11-27'),
      (18, 9, 'approved', 1, 'HR conference standard', '2024-10-12')
    `);

    // Seed Audit Logs
    await client.query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES
      (3, 'create_report', 'expense_report', 1, '{"title": "AWS re:Invent 2024"}'),
      (3, 'submit_report', 'expense_report', 1, '{"total": 4250.75}'),
      (2, 'approve_report', 'expense_report', 1, '{"comment": "All within policy"}'),
      (4, 'create_report', 'expense_report', 2, '{"title": "Q4 Client Meetings NYC"}'),
      (4, 'submit_report', 'expense_report', 2, '{"total": 3890.50}'),
      (5, 'flag_item', 'expense_item', 3, '{"reason": "Meal exceeds limit"}'),
      (5, 'flag_item', 'expense_item', 17, '{"reason": "Hotel exceeds limit"}'),
      (1, 'update_policy', 'policy_rule', 1, '{"field": "condition_value", "old": "75", "new": "100"}'),
      (2, 'reject_report', 'expense_report', 6, '{"reason": "Multiple violations"}'),
      (5, 'run_audit', 'expense_report', 6, '{"findings": 7, "risk_score": 8.5}'),
      (1, 'add_vendor', 'vendor', 11, '{"name": "Shadyville Corp", "flagged": true}'),
      (3, 'create_report', 'expense_report', 10, '{"title": "Training Workshop Denver"}'),
      (5, 'run_analysis', 'expense_report', 2, '{"type": "fraud_detection"}'),
      (1, 'update_budget', 'budget_limit', 1, '{"new_limit": 25000}'),
      (4, 'create_report', 'expense_report', 13, '{"title": "West Coast Sales Tour"}')
    `);

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
