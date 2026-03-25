-- ============================================================
-- ACREAGE BROTHERS FLIP TRACKER
-- Supabase Migration Script
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ============================================================
-- 1. CUSTOM TYPES (ENUMS)
-- ============================================================

CREATE TYPE deal_status AS ENUM (
  'looking',
  'under_contract',
  'in_rehab',
  'listed',
  'sold',
  'closed'
);

CREATE TYPE expense_category AS ENUM (
  'materials',
  'labor',
  'permits',
  'utilities',
  'insurance',
  'taxes',
  'loan_payments',
  'closing_costs',
  'other'
);


-- ============================================================
-- 2. DEALS TABLE
-- ============================================================

CREATE TABLE deals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Property info
  address       TEXT NOT NULL,
  beds          INT,
  baths         NUMERIC(3,1),
  sqft          INT,
  year_built    INT,

  -- Purchase info
  purchase_price    NUMERIC(12,2) DEFAULT 0,
  purchase_date     DATE,

  -- Rehab & valuation
  rehab_budget      NUMERIC(12,2) DEFAULT 0,
  estimated_arv     NUMERIC(12,2) DEFAULT 0,

  -- Status
  status            deal_status NOT NULL DEFAULT 'looking',

  -- Holding costs
  monthly_holding_cost  NUMERIC(10,2) DEFAULT 1500,

  -- Financing
  financing_notes   TEXT DEFAULT '',

  -- Sale info (populated when sold)
  sale_price            NUMERIC(12,2),
  sale_date             DATE,
  actual_closing_costs  NUMERIC(12,2),

  -- General notes
  notes TEXT DEFAULT ''
);

-- Index for dashboard sorting
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_updated ON deals(updated_at DESC);


-- ============================================================
-- 3. EXPENSES TABLE
-- ============================================================

CREATE TABLE expenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  deal_id       UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  category      expense_category NOT NULL,
  vendor        TEXT,
  note          TEXT,
  expense_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  entered_by    TEXT DEFAULT ''
);

-- Indexes for common queries
CREATE INDEX idx_expenses_deal ON expenses(deal_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX idx_expenses_category ON expenses(category);


-- ============================================================
-- 4. DEAL NOTES TABLE
-- ============================================================

CREATE TABLE deal_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  deal_id     UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  author      TEXT DEFAULT ''
);

CREATE INDEX idx_deal_notes_deal ON deal_notes(deal_id);


-- ============================================================
-- 5. AUTO-UPDATE updated_at ON DEALS
-- ============================================================

CREATE OR REPLACE FUNCTION update_deal_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_timestamp();

-- Also update deal's updated_at when an expense is added
CREATE OR REPLACE FUNCTION update_deal_on_expense()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE deals SET updated_at = now() WHERE id = NEW.deal_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expense_updates_deal
  AFTER INSERT ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_on_expense();


-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================
-- For Phase 1: all authenticated users see everything.
-- No role-based permissions yet.

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_notes ENABLE ROW LEVEL SECURITY;

-- Deals: any authenticated user can do anything
CREATE POLICY "Authenticated users full access to deals"
  ON deals FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Expenses: any authenticated user can do anything
CREATE POLICY "Authenticated users full access to expenses"
  ON expenses FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Deal notes: any authenticated user can do anything
CREATE POLICY "Authenticated users full access to deal_notes"
  ON deal_notes FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ============================================================
-- 7. HELPFUL VIEWS (optional — for quick dashboard queries)
-- ============================================================

CREATE OR REPLACE VIEW deal_financials AS
SELECT
  d.id,
  d.address,
  d.status,
  d.purchase_price,
  d.rehab_budget,
  d.estimated_arv,
  d.sale_price,
  d.actual_closing_costs,
  d.purchase_date,
  d.sale_date,

  -- Rehab spent (materials, labor, permits, closing_costs, other)
  COALESCE(SUM(e.amount) FILTER (
    WHERE e.category NOT IN ('loan_payments', 'insurance', 'taxes', 'utilities')
  ), 0) AS rehab_spent,

  -- Holding spent (loan_payments, insurance, taxes, utilities)
  COALESCE(SUM(e.amount) FILTER (
    WHERE e.category IN ('loan_payments', 'insurance', 'taxes', 'utilities')
  ), 0) AS holding_spent,

  -- Total all expenses
  COALESCE(SUM(e.amount), 0) AS total_spent,

  -- Budget usage ratio
  CASE WHEN d.rehab_budget > 0 THEN
    COALESCE(SUM(e.amount) FILTER (
      WHERE e.category NOT IN ('loan_payments', 'insurance', 'taxes', 'utilities')
    ), 0) / d.rehab_budget
  ELSE 0 END AS budget_ratio,

  -- Estimated profit (for active deals)
  CASE WHEN d.status NOT IN ('sold', 'closed') THEN
    d.estimated_arv
    - d.purchase_price
    - COALESCE(SUM(e.amount), 0)
    - (d.estimated_arv * 0.08)
  ELSE
    d.sale_price
    - d.purchase_price
    - COALESCE(SUM(e.amount), 0)
    - COALESCE(d.actual_closing_costs, 0)
  END AS estimated_profit

FROM deals d
LEFT JOIN expenses e ON e.deal_id = d.id
GROUP BY d.id;


-- ============================================================
-- 8. DONE
-- ============================================================
-- After running this migration:
--
-- 1. Go to Authentication → Users → "Add user" and create:
--    - collin@acreagebrothers.com
--    - tyler@acreagebrothers.com
--    - roxy@acreagebrothers.com
--    (Set passwords, check "Auto Confirm")
--
-- 2. Go to Project Settings → API and copy:
--    - Project URL  → paste into NEXT_PUBLIC_SUPABASE_URL
--    - anon key     → paste into NEXT_PUBLIC_SUPABASE_ANON_KEY
--
-- 3. Deploy your Next.js app to Vercel and add those env vars.
-- ============================================================
