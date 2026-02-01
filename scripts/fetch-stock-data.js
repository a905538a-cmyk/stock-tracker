/**
 * 台股股價抓取腳本
 * 使用證交所 TWSE API 取得每日股價資料
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 要追蹤的股票清單
const STOCK_LIST = [
  { code: '00918', name: '大華優利高填息30', market: 'tse' },
  { code: '00929', name: '復華台灣科技優息', market: 'tse' },
  { code: '00922', name: '國泰台灣領袖50', market: 'tse' },
  { code: '1229', name: '聯華', market: 'tse' },
  { code: '2324', name: '仁寶', market: 'tse' },
  { code: '5880', name: '合庫金', market: 'tse' },
  { code: '5410', name: '國眾', market: 'otc' },
  { code: '6186', name: '新潤', market: 'otc' }
];

// 取得查詢日期 (台灣時間，若假日則往回找)
function getQueryDate() {
  const now = new Date();
  const taiwanTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  
  // 如果是週六日，往回找到週五
  const day = taiwanTime.getDay();
  if (day === 0) taiwanTime.setDate(taiwanTime.getDate() - 2); // 週日 -> 週五
  if (day === 6) taiwanTime.setDate(taiwanTime.getDate() - 1); // 週六 -> 週五
  
  return taiwanTime.toISOString().split('T')[0].replace(/-/g, '');
}

// 從證交所 API 取得股價 (上市)
async function fetchTWSE(stockCode, date) {
  const url = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${date}&stockNo=${stockCode}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const data = await response.json();
    
    if (data.stat !== 'OK' || !data.data || data.data.length === 0) {
      console.log(`  ⚠️ ${stockCode}: 無資料`);
      return null;
    }
    
    // 取得最後一筆資料（最新日期）
    const latest = data.data[data.data.length - 1];
    
    // 資料格式: [日期, 成交股數, 成交金額, 開盤價, 最高價, 最低價, 收盤價, 漲跌價差, 成交筆數]
    return {
      date: latest[0],
      volume: parseInt(latest[1].replace(/,/g, '')),
      turnover: parseInt(latest[2].replace(/,/g, '')),
      open: parseFloat(latest[3].replace(/,/g, '')),
      high: parseFloat(latest[4].replace(/,/g, '')),
      low: parseFloat(latest[5].replace(/,/g, '')),
      close: parseFloat(latest[6].replace(/,/g, '')),
      change: latest[7],
      transactions: parseInt(latest[8].replace(/,/g, ''))
    };
  } catch (error) {
    console.error(`  ❌ ${stockCode}: ${error.message}`);
    return null;
  }
}

// 從櫃買中心 API 取得股價 (上櫃)
async function fetchTPEx(stockCode, date) {
  const year = parseInt(date.substring(0, 4)) - 1911;
  const month = date.substring(4, 6);
  const url = `https://www.tpex.org.tw/web/stock/aftertrading/daily_trading_info/st43_result.php?l=zh-tw&d=${year}/${month}&stkno=${stockCode}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const text = await response.text();
    if (text.startsWith('<!DOCTYPE')) {
      console.log(`  ⚠️ ${stockCode}: API 暫時無法使用`);
      return null;
    }
    
    const data = JSON.parse(text);
    
    if (!data.aaData || data.aaData.length === 0) {
      console.log(`  ⚠️ ${stockCode}: 無資料`);
      return null;
    }
    
    const latest = data.aaData[data.aaData.length - 1];
    
    return {
      date: latest[0],
      volume: parseInt(String(latest[1]).replace(/,/g, '')),
      turnover: parseInt(String(latest[2]).replace(/,/g, '')),
      open: parseFloat(String(latest[3]).replace(/,/g, '')),
      high: parseFloat(String(latest[4]).replace(/,/g, '')),
      low: parseFloat(String(latest[5]).replace(/,/g, '')),
      close: parseFloat(String(latest[6]).replace(/,/g, '')),
      change: latest[7],
      transactions: parseInt(String(latest[8]).replace(/,/g, ''))
    };
  } catch (error) {
    console.error(`  ❌ ${stockCode}: ${error.message}`);
    return null;
  }
}

// 計算漲跌停價
function calculateLimits(price) {
  const limitUp = Math.round(price * 1.1 * 100) / 100;
  const limitDown = Math.round(price * 0.9 * 100) / 100;
  return { limitUp, limitDown };
}

// 主程式
async function main() {
  console.log('📈 開始抓取股價資料...\n');
  
  const date = getQueryDate();
  console.log(`📅 查詢日期: ${date}\n`);
  
  const results = [];
  
  for (const stock of STOCK_LIST) {
    console.log(`🔍 ${stock.code} ${stock.name}...`);
    
    let data;
    if (stock.market === 'tse') {
      data = await fetchTWSE(stock.code, date);
    } else {
      data = await fetchTPEx(stock.code, date);
    }
    
    if (data) {
      const limits = calculateLimits(data.close);
      results.push({
        code: stock.code,
        name: stock.name,
        market: stock.market,
        ...data,
        limitUp: limits.limitUp,
        limitDown: limits.limitDown,
        fetchedAt: new Date().toISOString()
      });
      console.log(`  ✅ 收盤: ${data.close} | 漲跌: ${data.change}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 800));
  }
  
  // 儲存結果
  const outputDir = path.join(__dirname, '..', 'public', 'stock-data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 儲存當日資料
  const dateForFile = date;
  const todayFile = path.join(outputDir, `${dateForFile}.json`);
  fs.writeFileSync(todayFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 已儲存: ${todayFile}`);
  
  // 更新最新資料
  const latestFile = path.join(outputDir, 'latest.json');
  fs.writeFileSync(latestFile, JSON.stringify({
    date: dateForFile,
    updatedAt: new Date().toISOString(),
    stocks: results
  }, null, 2));
  console.log(`💾 已更新: ${latestFile}`);
  
  // 更新歷史紀錄索引
  const historyFile = path.join(outputDir, 'history.json');
  let history = [];
  if (fs.existsSync(historyFile)) {
    history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
  }
  if (!history.includes(dateForFile)) {
    history.push(dateForFile);
    history.sort().reverse();
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
  }
  
  console.log('\n✅ 完成！');
}

main().catch(console.error);
