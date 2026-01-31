<script setup>
import { ref, computed } from 'vue'

// 表單資料
const stockName = ref('')
const price = ref('')
const quantity = ref('')  // 張數
const feeRate = ref(0.1425)  // 手續費率 0.1425%
const feeDiscount = ref(0.6)  // 券商折扣 (例如 6 折)

// 交易記錄
const transactions = ref([])

// 台灣股票交易稅率 (賣出時收取)
const TAX_RATE = 0.003  // 0.3%

// 計算買進金額
const calculateBuy = () => {
  if (!stockName.value || !price.value || !quantity.value) {
    alert('請填寫完整資料')
    return
  }
  
  const shares = parseFloat(quantity.value) * 1000  // 張數轉股數
  const stockPrice = parseFloat(price.value)
  const totalAmount = stockPrice * shares
  
  // 手續費 = 成交金額 × 0.1425% × 折扣，最低 20 元
  const fee = Math.max(20, Math.round(totalAmount * (feeRate.value / 100) * feeDiscount.value))
  
  // 買進時不收交易稅
  const tax = 0
  
  // 實際支出 = 成交金額 + 手續費
  const netAmount = totalAmount + fee
  
  const transaction = {
    id: Date.now(),
    type: 'buy',
    stockName: stockName.value,
    price: stockPrice,
    quantity: parseFloat(quantity.value),
    shares: shares,
    totalAmount: totalAmount,
    fee: fee,
    tax: tax,
    netAmount: netAmount,
    date: new Date().toLocaleString('zh-TW')
  }
  
  transactions.value.unshift(transaction)
  clearForm()
  
  return transaction
}

// 計算賣出金額
const calculateSell = () => {
  if (!stockName.value || !price.value || !quantity.value) {
    alert('請填寫完整資料')
    return
  }
  
  const shares = parseFloat(quantity.value) * 1000
  const stockPrice = parseFloat(price.value)
  const totalAmount = stockPrice * shares
  
  // 手續費
  const fee = Math.max(20, Math.round(totalAmount * (feeRate.value / 100) * feeDiscount.value))
  
  // 交易稅 = 成交金額 × 0.3%
  const tax = Math.round(totalAmount * TAX_RATE)
  
  // 實際進帳 = 成交金額 - 手續費 - 交易稅
  const netAmount = totalAmount - fee - tax
  
  const transaction = {
    id: Date.now(),
    type: 'sell',
    stockName: stockName.value,
    price: stockPrice,
    quantity: parseFloat(quantity.value),
    shares: shares,
    totalAmount: totalAmount,
    fee: fee,
    tax: tax,
    netAmount: netAmount,
    date: new Date().toLocaleString('zh-TW')
  }
  
  transactions.value.unshift(transaction)
  clearForm()
  
  return transaction
}

// 清除表單
const clearForm = () => {
  stockName.value = ''
  price.value = ''
  quantity.value = ''
}

// 刪除交易記錄
const deleteTransaction = (id) => {
  transactions.value = transactions.value.filter(t => t.id !== id)
}

// 統計資料
const summary = computed(() => {
  const buyTotal = transactions.value
    .filter(t => t.type === 'buy')
    .reduce((sum, t) => sum + t.netAmount, 0)
  
  const sellTotal = transactions.value
    .filter(t => t.type === 'sell')
    .reduce((sum, t) => sum + t.netAmount, 0)
  
  const totalFee = transactions.value.reduce((sum, t) => sum + t.fee, 0)
  const totalTax = transactions.value.reduce((sum, t) => sum + t.tax, 0)
  
  return {
    buyTotal,
    sellTotal,
    profitLoss: sellTotal - buyTotal,
    totalFee,
    totalTax,
    totalCost: totalFee + totalTax
  }
})

// 即時試算
const preview = computed(() => {
  if (!price.value || !quantity.value) return null
  
  const shares = parseFloat(quantity.value) * 1000
  const stockPrice = parseFloat(price.value)
  const totalAmount = stockPrice * shares
  const fee = Math.max(20, Math.round(totalAmount * (feeRate.value / 100) * feeDiscount.value))
  const tax = Math.round(totalAmount * TAX_RATE)
  
  return {
    totalAmount,
    fee,
    tax,
    buyNet: totalAmount + fee,
    sellNet: totalAmount - fee - tax
  }
})

// 格式化數字
const formatNumber = (num) => {
  return new Intl.NumberFormat('zh-TW').format(Math.round(num))
}
</script>

<template>
  <div class="app">
    <!-- Header -->
    <header class="header">
      <h1>📈 股票損益計算器</h1>
      <p>台股買賣試算工具</p>
    </header>

    <!-- 輸入表單 -->
    <div class="card">
      <h2 class="card-title">📝 交易輸入</h2>
      
      <div class="form-grid">
        <div class="form-group">
          <label>股票名稱/代號</label>
          <input 
            type="text" 
            v-model="stockName" 
            placeholder="例如：2330 台積電"
          >
        </div>
        
        <div class="form-group">
          <label>股價 (元)</label>
          <input 
            type="number" 
            v-model="price" 
            placeholder="例如：580"
            step="0.01"
          >
        </div>
        
        <div class="form-group">
          <label>數量 (張)</label>
          <input 
            type="number" 
            v-model="quantity" 
            placeholder="1張 = 1000股"
            step="1"
          >
        </div>
        
        <div class="form-group">
          <label>手續費折扣</label>
          <select v-model="feeDiscount">
            <option :value="1">無折扣 (100%)</option>
            <option :value="0.65">65折</option>
            <option :value="0.6">6折</option>
            <option :value="0.5">5折</option>
            <option :value="0.38">38折</option>
            <option :value="0.28">28折</option>
          </select>
        </div>
      </div>

      <!-- 即時試算預覽 -->
      <div v-if="preview" class="result-panel">
        <div class="result-title">💡 即時試算預覽</div>
        <div class="result-grid">
          <div class="result-item">
            <div class="result-item-label">成交金額</div>
            <div class="result-item-value">{{ formatNumber(preview.totalAmount) }}</div>
          </div>
          <div class="result-item">
            <div class="result-item-label">手續費</div>
            <div class="result-item-value">{{ formatNumber(preview.fee) }}</div>
          </div>
          <div class="result-item">
            <div class="result-item-label">交易稅 (賣出)</div>
            <div class="result-item-value">{{ formatNumber(preview.tax) }}</div>
          </div>
          <div class="result-item">
            <div class="result-item-label">買進支出</div>
            <div class="result-item-value negative">{{ formatNumber(preview.buyNet) }}</div>
          </div>
          <div class="result-item">
            <div class="result-item-label">賣出進帳</div>
            <div class="result-item-value positive">{{ formatNumber(preview.sellNet) }}</div>
          </div>
        </div>
      </div>

      <!-- 按鈕 -->
      <div class="btn-group">
        <button class="btn btn-buy" @click="calculateBuy">
          📉 買進 (支出)
        </button>
        <button class="btn btn-sell" @click="calculateSell">
          📈 賣出 (進帳)
        </button>
        <button class="btn btn-clear" @click="clearForm">
          🗑️ 清除
        </button>
      </div>
    </div>

    <!-- 統計摘要 -->
    <div v-if="transactions.length > 0" class="summary-grid">
      <div class="summary-item">
        <div class="summary-item-label">總買進支出</div>
        <div class="summary-item-value" style="color: var(--danger)">
          {{ formatNumber(summary.buyTotal) }}
        </div>
      </div>
      <div class="summary-item">
        <div class="summary-item-label">總賣出進帳</div>
        <div class="summary-item-value" style="color: var(--success)">
          {{ formatNumber(summary.sellTotal) }}
        </div>
      </div>
      <div class="summary-item">
        <div class="summary-item-label">損益</div>
        <div 
          class="summary-item-value" 
          :style="{ color: summary.profitLoss >= 0 ? 'var(--success)' : 'var(--danger)' }"
        >
          {{ summary.profitLoss >= 0 ? '+' : '' }}{{ formatNumber(summary.profitLoss) }}
        </div>
      </div>
    </div>

    <!-- 交易記錄 -->
    <div class="card">
      <h2 class="card-title">📋 交易記錄</h2>
      
      <div v-if="transactions.length === 0" class="empty-state">
        <div class="empty-state-icon">📊</div>
        <p>尚無交易記錄</p>
        <p>輸入資料後點擊買進或賣出按鈕</p>
      </div>
      
      <table v-else class="history-table">
        <thead>
          <tr>
            <th>類型</th>
            <th>股票</th>
            <th>價格</th>
            <th>數量</th>
            <th>成交金額</th>
            <th>手續費</th>
            <th>交易稅</th>
            <th>實際金額</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in transactions" :key="t.id">
            <td>
              <span class="badge" :class="t.type === 'buy' ? 'badge-buy' : 'badge-sell'">
                {{ t.type === 'buy' ? '買進' : '賣出' }}
              </span>
            </td>
            <td>{{ t.stockName }}</td>
            <td>{{ t.price }}</td>
            <td>{{ t.quantity }} 張</td>
            <td>{{ formatNumber(t.totalAmount) }}</td>
            <td>{{ formatNumber(t.fee) }}</td>
            <td>{{ formatNumber(t.tax) }}</td>
            <td :style="{ color: t.type === 'buy' ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }">
              {{ t.type === 'buy' ? '-' : '+' }}{{ formatNumber(t.netAmount) }}
            </td>
            <td>
              <button class="delete-btn" @click="deleteTransaction(t.id)">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <!-- 費用統計 -->
      <div v-if="transactions.length > 0" class="result-panel" style="margin-top: 1.5rem;">
        <div class="result-title">💰 費用統計</div>
        <div class="result-grid">
          <div class="result-item">
            <div class="result-item-label">總手續費</div>
            <div class="result-item-value">{{ formatNumber(summary.totalFee) }}</div>
          </div>
          <div class="result-item">
            <div class="result-item-label">總交易稅</div>
            <div class="result-item-value">{{ formatNumber(summary.totalTax) }}</div>
          </div>
          <div class="result-item">
            <div class="result-item-label">總交易成本</div>
            <div class="result-item-value" style="color: var(--warning)">{{ formatNumber(summary.totalCost) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
