-- Migration: 0001_initial_schema.sql
-- Description: D1 SQLite schema for VietFi Advisor (FinHackathon WDA2026)

-- 1. Users table (Cloudflare-native / JWT auth)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Financial Profiles
CREATE TABLE IF NOT EXISTS financial_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    monthly_income REAL DEFAULT 0,
    monthly_expenses REAL DEFAULT 0,
    emergency_fund REAL DEFAULT 0,
    risk_tolerance TEXT DEFAULT 'BALANCED',
    financial_dna TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Financial Accounts (Cash, Bank, Wallet, Vault)
CREATE TABLE IF NOT EXISTS financial_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'CASH', 'BANK', 'INVESTMENT', 'CREDIT'
    balance REAL DEFAULT 0,
    currency TEXT DEFAULT 'VND',
    is_active INTEGER DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Budget Pots (Hũ ngân sách 6 lọ / Tùy chỉnh)
CREATE TABLE IF NOT EXISTS budget_pots (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount REAL DEFAULT 0,
    current_amount REAL DEFAULT 0,
    color TEXT,
    icon TEXT,
    is_system INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Transactions / Ledger (Sổ giao dịch thu chi)
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pot_id TEXT REFERENCES budget_pots(id) ON DELETE SET NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL, -- 'EXPENSE', 'INCOME', 'TRANSFER'
    category TEXT,
    note TEXT,
    transaction_date TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Debts (Quản lý nợ Snowball / Avalanche / Cấp cứu DTI)
CREATE TABLE IF NOT EXISTS debts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creditor_name TEXT NOT NULL,
    principal_amount REAL NOT NULL,
    remaining_amount REAL NOT NULL,
    interest_rate_pct REAL NOT NULL,
    minimum_payment REAL NOT NULL,
    payment_day INTEGER DEFAULT 1,
    strategy_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Goals (Mục tiêu tài chính)
CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0,
    target_date TEXT,
    priority TEXT DEFAULT 'MEDIUM', -- 'HIGH', 'MEDIUM', 'LOW'
    status TEXT DEFAULT 'IN_PROGRESS', -- 'IN_PROGRESS', 'ACHIEVED', 'CANCELLED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Decision Scenarios (Lưu trữ kịch bản mô phỏng Before vs After)
CREATE TABLE IF NOT EXISTS decision_scenarios (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    cost_amount REAL NOT NULL,
    payment_method TEXT NOT NULL, -- 'CASH', 'INSTALLMENT', 'HYBRID'
    duration_months INTEGER DEFAULT 0,
    before_state_json TEXT NOT NULL,
    after_state_json TEXT NOT NULL,
    ai_verdict TEXT,
    smart_alternative TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Gamification States
CREATE TABLE IF NOT EXISTS gamification_states (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    xp INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    badges_json TEXT DEFAULT '[]',
    quests_json TEXT DEFAULT '[]',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Stock Tickers
CREATE TABLE IF NOT EXISTS tickers (
    symbol TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    exchange TEXT NOT NULL,
    industry TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Daily OHLCV Bars (Nến lịch sử chứng khoán phục vụ Backtest)
CREATE TABLE IF NOT EXISTS daily_ohlcv (
    ticker TEXT NOT NULL REFERENCES tickers(symbol) ON DELETE CASCADE,
    trade_date TEXT NOT NULL,
    open REAL NOT NULL,
    high REAL NOT NULL,
    low REAL NOT NULL,
    close REAL NOT NULL,
    volume REAL NOT NULL,
    PRIMARY KEY (ticker, trade_date)
);

-- 12. Market Snapshots (Bộ đệm dữ liệu thị trường vĩ mô)
CREATE TABLE IF NOT EXISTS market_snapshots (
    snapshot_key TEXT PRIMARY KEY, -- 'live', 'morning_brief', 'macro'
    data_json TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning-fast lookups
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_debts_user ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_pots_user ON budget_pots(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_ohlcv_date ON daily_ohlcv(trade_date DESC);
