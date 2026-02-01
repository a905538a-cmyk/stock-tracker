-- =============================================
-- 台股每日股價資料庫結構
-- 支援 PostgreSQL / MySQL
-- =============================================

-- 股票基本資料
CREATE TABLE IF NOT EXISTS stocks (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  market VARCHAR(10) DEFAULT 'tse',  -- tse=上市, otc=上櫃
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 每日股價記錄
CREATE TABLE IF NOT EXISTS stock_daily (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  name VARCHAR(50),
  trade_date DATE NOT NULL,
  open_price DECIMAL(10,2),
  high_price DECIMAL(10,2),
  low_price DECIMAL(10,2),
  close_price DECIMAL(10,2),
  change_amount VARCHAR(20),
  volume BIGINT,
  turnover BIGINT,
  transactions INTEGER,
  limit_up DECIMAL(10,2),
  limit_down DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 確保同一天同一股票只有一筆
  UNIQUE(code, trade_date)
);

-- 建立索引加速查詢
CREATE INDEX IF NOT EXISTS idx_stock_daily_code ON stock_daily(code);
CREATE INDEX IF NOT EXISTS idx_stock_daily_date ON stock_daily(trade_date);
CREATE INDEX IF NOT EXISTS idx_stock_daily_code_date ON stock_daily(code, trade_date);

-- 插入預設追蹤股票
INSERT INTO stocks (code, name, market) VALUES
  ('00918', '大華優利高填息30', 'tse'),
  ('00929', '復華台灣科技優息', 'tse'),
  ('00922', '國泰台灣領袖50', 'tse'),
  ('1229', '聯華', 'tse'),
  ('2324', '仁寶', 'tse'),
  ('5880', '合庫金', 'tse'),
  ('5410', '國眾', 'otc'),
  ('6186', '新潤', 'otc')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- 查詢範例
-- =============================================

-- 查詢最新股價
-- SELECT * FROM stock_daily WHERE trade_date = (SELECT MAX(trade_date) FROM stock_daily);

-- 查詢特定股票歷史
-- SELECT * FROM stock_daily WHERE code = '00918' ORDER BY trade_date DESC LIMIT 30;

-- 查詢今日漲幅最大
-- SELECT * FROM stock_daily 
-- WHERE trade_date = (SELECT MAX(trade_date) FROM stock_daily)
-- ORDER BY CAST(REPLACE(change_amount, '+', '') AS DECIMAL) DESC;
