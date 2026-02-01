<script setup>
import { ref, computed, onMounted, watch } from 'vue'

// 交易記錄
const transactions = ref([])
const dividends = ref([])

// 表單
const form = ref({
  date: '',
  type: 'buy',
  shares: '',
  price: '',
  fee: 1,
  amount: ''
})

// 配息設定
const dividendRates = ref([
  { exDate: '2024-12-19', rate: 0.84 },
  { exDate: '2025-03-20', rate: 0.70 },
  { exDate: '2025-06-19', rate: 0.70 },
  { exDate: '2025-09-18', rate: 0.52 },
  { exDate: '2025-12-18', rate: 0.565 }
])

// 當前股價
const currentPrice = ref(22.92)

// 編輯模式
const editingId = ref(null)

// 自動計算金額
const autoAmount = computed(() => {
  if (form.value.shares && form.value.price) {
    return Math.round(parseFloat(form.value.shares) * parseFloat(form.value.price) + parseFloat(form.value.fee || 1))
  }
  return ''
})

// 新增交易
const addTransaction = () => {
  if (!form.value.date || !form.value.shares || !form.value.price) {
    alert('請填寫完整資料')
    return
  }
  
  const transaction = {
    id: editingId.value || Date.now(),
    date: form.value.date,
    type: form.value.type,
    shares: parseInt(form.value.shares),
    price: parseFloat(form.value.price),
    fee: parseFloat(form.value.fee) || 1,
    amount: parseFloat(form.value.amount) || autoAmount.value
  }
  
  if (editingId.value) {
    const idx = transactions.value.findIndex(t => t.id === editingId.value)
    if (idx !== -1) transactions.value[idx] = transaction
    editingId.value = null
  } else {
    transactions.value.push(transaction)
  }
  
  // 按日期排序
  transactions.value.sort((a, b) => new Date(a.date) - new Date(b.date))
  
  saveData()
  clearForm()
  calculateDividends()
}

// 編輯交易
const editTransaction = (t) => {
  form.value = { ...t }
  editingId.value = t.id
}

// 刪除交易
const deleteTransaction = (id) => {
  if (confirm('確定要刪除這筆交易？')) {
    transactions.value = transactions.value.filter(t => t.id !== id)
    saveData()
    calculateDividends()
  }
}

// 清除表單
const clearForm = () => {
  form.value = {
    date: '',
    type: 'buy',
    shares: '',
    price: '',
    fee: 1,
    amount: ''
  }
  editingId.value = null
}

// 計算各除息日持股數
const getSharesAtDate = (targetDate) => {
  return transactions.value
    .filter(t => new Date(t.date) < new Date(targetDate))
    .reduce((sum, t) => sum + t.shares, 0)
}

// 計算配息
const calculateDividends = () => {
  dividends.value = dividendRates.value.map(d => {
    const sharesHeld = getSharesAtDate(d.exDate)
    return {
      exDate: d.exDate,
      rate: d.rate,
      sharesHeld,
      amount: Math.round(sharesHeld * d.rate)
    }
  }).filter(d => d.sharesHeld > 0)
}

// 統計數據
const stats = computed(() => {
  const totalShares = transactions.value.reduce((sum, t) => sum + t.shares, 0)
  const totalInvested = transactions.value.reduce((sum, t) => sum + t.amount, 0)
  const cashInvested = transactions.value
    .filter(t => t.type === 'buy')
    .reduce((sum, t) => sum + t.amount, 0)
  const reinvested = transactions.value
    .filter(t => t.type === 'reinvest')
    .reduce((sum, t) => sum + t.amount, 0)
  const reinvestShares = transactions.value
    .filter(t => t.type === 'reinvest')
    .reduce((sum, t) => sum + t.shares, 0)
  
  const currentValue = totalShares * currentPrice.value
  const totalDividends = dividends.value.reduce((sum, d) => sum + d.amount, 0)
  const paperGain = currentValue - totalInvested
  const totalReturn = totalDividends + paperGain
  const roi = cashInvested > 0 ? (totalReturn / cashInvested * 100) : 0
  
  return {
    totalShares,
    totalInvested,
    cashInvested,
    reinvested,
    reinvestShares,
    currentValue,
    totalDividends,
    paperGain,
    totalReturn,
    roi
  }
})

// 無再投入的假設情境
const withoutReinvest = computed(() => {
  const buyOnly = transactions.value.filter(t => t.type === 'buy')
  const shares = buyOnly.reduce((sum, t) => sum + t.shares, 0)
  const invested = buyOnly.reduce((sum, t) => sum + t.amount, 0)
  const currentValue = shares * currentPrice.value
  
  // 重新計算配息（不含再投入的股數）
  let cumulativeShares = 0
  const dividendsWithoutReinvest = dividendRates.value.map(d => {
    const sharesAtDate = buyOnly
      .filter(t => new Date(t.date) < new Date(d.exDate))
      .reduce((sum, t) => sum + t.shares, 0)
    return {
      exDate: d.exDate,
      rate: d.rate,
      sharesHeld: sharesAtDate,
      amount: Math.round(sharesAtDate * d.rate)
    }
  }).filter(d => d.sharesHeld > 0)
  
  const totalDividends = dividendsWithoutReinvest.reduce((sum, d) => sum + d.amount, 0)
  const paperGain = currentValue - invested
  const totalReturn = totalDividends + paperGain
  const roi = invested > 0 ? (totalReturn / invested * 100) : 0
  
  return {
    shares,
    invested,
    currentValue,
    totalDividends,
    paperGain,
    totalReturn,
    roi
  }
})

// 再投入效益
const reinvestBenefit = computed(() => {
  return {
    extraShares: stats.value.reinvestShares,
    extraReturn: stats.value.totalReturn - withoutReinvest.value.totalReturn,
    extraRoi: stats.value.roi - withoutReinvest.value.roi
  }
})

// 儲存資料到 localStorage
const saveData = () => {
  localStorage.setItem('stock-transactions', JSON.stringify(transactions.value))
  localStorage.setItem('stock-dividendRates', JSON.stringify(dividendRates.value))
  localStorage.setItem('stock-currentPrice', currentPrice.value)
}

// 載入資料
const loadData = () => {
  const saved = localStorage.getItem('stock-transactions')
  if (saved) {
    transactions.value = JSON.parse(saved)
  }
  const savedRates = localStorage.getItem('stock-dividendRates')
  if (savedRates) {
    dividendRates.value = JSON.parse(savedRates)
  }
  const savedPrice = localStorage.getItem('stock-currentPrice')
  if (savedPrice) {
    currentPrice.value = parseFloat(savedPrice)
  }
  calculateDividends()
}

// 匯出資料
const exportData = () => {
  const data = {
    transactions: transactions.value,
    dividendRates: dividendRates.value,
    currentPrice: currentPrice.value,
    exportDate: new Date().toISOString()
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `stock-data-${new Date().toISOString().split('T')[0]}.json`
  a.click()
}

// 匯入資料
const importData = (event) => {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        if (data.transactions) transactions.value = data.transactions
        if (data.dividendRates) dividendRates.value = data.dividendRates
        if (data.currentPrice) currentPrice.value = data.currentPrice
        saveData()
        calculateDividends()
        alert('匯入成功！')
      } catch (err) {
        alert('匯入失敗：' + err.message)
      }
    }
    reader.readAsText(file)
  }
}

// 格式化數字
const formatNumber = (num) => {
  return new Intl.NumberFormat('zh-TW').format(Math.round(num))
}

// 監聽股價變動
watch(currentPrice, () => {
  saveData()
})

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="app">
    <!-- Header -->
    <header class="header">
      <h1>📈 00918 投資追蹤</h1>
      <p>大華優利高填息30 損益分析</p>
    </header>

    <!-- 統計卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">總股數</div>
        <div class="stat-value">{{ formatNumber(stats.totalShares) }}</div>
        <div class="stat-sub">股</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">現金投入</div>
        <div class="stat-value">{{ formatNumber(stats.cashInvested) }}</div>
        <div class="stat-sub">元</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">目前市值</div>
        <div class="stat-value">{{ formatNumber(stats.currentValue) }}</div>
        <div class="stat-sub">元</div>
      </div>
      <div class="stat-card highlight">
        <div class="stat-label">總報酬</div>
        <div class="stat-value" :class="stats.totalReturn >= 0 ? 'positive' : 'negative'">
          {{ stats.totalReturn >= 0 ? '+' : '' }}{{ formatNumber(stats.totalReturn) }}
        </div>
        <div class="stat-sub">{{ stats.roi.toFixed(2) }}%</div>
      </div>
    </div>

    <!-- 當前股價 -->
    <div class="card price-card">
      <label>當前股價</label>
      <input type="number" v-model.number="currentPrice" step="0.01" />
      <span class="price-hint">更新股價以計算即時損益</span>
    </div>

    <!-- 新增交易 -->
    <div class="card">
      <h2 class="card-title">{{ editingId ? '✏️ 編輯交易' : '➕ 新增交易' }}</h2>
      
      <div class="form-grid">
        <div class="form-group">
          <label>日期</label>
          <input type="date" v-model="form.date" />
        </div>
        <div class="form-group">
          <label>類型</label>
          <select v-model="form.type">
            <option value="buy">買進</option>
            <option value="reinvest">配息再投入</option>
          </select>
        </div>
        <div class="form-group">
          <label>股數</label>
          <input type="number" v-model="form.shares" placeholder="股數" />
        </div>
        <div class="form-group">
          <label>均價</label>
          <input type="number" v-model="form.price" step="0.01" placeholder="均價" />
        </div>
        <div class="form-group">
          <label>手續費</label>
          <input type="number" v-model="form.fee" />
        </div>
        <div class="form-group">
          <label>投入金額</label>
          <input type="number" v-model="form.amount" :placeholder="autoAmount || '自動計算'" />
        </div>
      </div>
      
      <div class="btn-group">
        <button class="btn btn-primary" @click="addTransaction">
          {{ editingId ? '💾 儲存' : '➕ 新增' }}
        </button>
        <button v-if="editingId" class="btn btn-secondary" @click="clearForm">取消</button>
      </div>
    </div>

    <!-- 交易記錄 -->
    <div class="card">
      <h2 class="card-title">📋 交易記錄（{{ transactions.length }} 筆）</h2>
      
      <div v-if="transactions.length === 0" class="empty-state">
        <p>尚無交易記錄</p>
      </div>
      
      <div v-else class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>日期</th>
              <th>類型</th>
              <th>股數</th>
              <th>均價</th>
              <th>金額</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(t, idx) in transactions" :key="t.id">
              <td>{{ idx + 1 }}</td>
              <td>{{ t.date }}</td>
              <td>
                <span class="badge" :class="t.type">
                  {{ t.type === 'buy' ? '買進' : '🔄再投入' }}
                </span>
              </td>
              <td>{{ formatNumber(t.shares) }}</td>
              <td>{{ t.price }}</td>
              <td>{{ formatNumber(t.amount) }}</td>
              <td>
                <button class="icon-btn" @click="editTransaction(t)">✏️</button>
                <button class="icon-btn" @click="deleteTransaction(t.id)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 配息紀錄 -->
    <div class="card">
      <h2 class="card-title">💰 配息紀錄</h2>
      
      <div v-if="dividends.length === 0" class="empty-state">
        <p>尚無配息紀錄</p>
      </div>
      
      <div v-else class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>除息日</th>
              <th>每股配息</th>
              <th>持股數</th>
              <th>配息金額</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in dividends" :key="d.exDate">
              <td>{{ d.exDate }}</td>
              <td>{{ d.rate }}</td>
              <td>{{ formatNumber(d.sharesHeld) }}</td>
              <td class="positive">+{{ formatNumber(d.amount) }}</td>
            </tr>
            <tr class="total-row">
              <td colspan="3"><strong>合計</strong></td>
              <td class="positive"><strong>+{{ formatNumber(stats.totalDividends) }}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 再投入比較 -->
    <div class="card">
      <h2 class="card-title">🔄 配息再投入效益分析</h2>
      
      <div class="compare-grid">
        <div class="compare-card">
          <h3>有再投入（實際）</h3>
          <div class="compare-item">
            <span>持股</span>
            <strong>{{ formatNumber(stats.totalShares) }} 股</strong>
          </div>
          <div class="compare-item">
            <span>市值</span>
            <strong>{{ formatNumber(stats.currentValue) }} 元</strong>
          </div>
          <div class="compare-item">
            <span>總配息</span>
            <strong>{{ formatNumber(stats.totalDividends) }} 元</strong>
          </div>
          <div class="compare-item highlight">
            <span>總報酬</span>
            <strong class="positive">+{{ formatNumber(stats.totalReturn) }} 元</strong>
          </div>
          <div class="compare-item highlight">
            <span>報酬率</span>
            <strong class="positive">{{ stats.roi.toFixed(2) }}%</strong>
          </div>
        </div>
        
        <div class="compare-card muted">
          <h3>沒再投入（假設）</h3>
          <div class="compare-item">
            <span>持股</span>
            <strong>{{ formatNumber(withoutReinvest.shares) }} 股</strong>
          </div>
          <div class="compare-item">
            <span>市值</span>
            <strong>{{ formatNumber(withoutReinvest.currentValue) }} 元</strong>
          </div>
          <div class="compare-item">
            <span>總配息</span>
            <strong>{{ formatNumber(withoutReinvest.totalDividends) }} 元</strong>
          </div>
          <div class="compare-item">
            <span>總報酬</span>
            <strong>+{{ formatNumber(withoutReinvest.totalReturn) }} 元</strong>
          </div>
          <div class="compare-item">
            <span>報酬率</span>
            <strong>{{ withoutReinvest.roi.toFixed(2) }}%</strong>
          </div>
        </div>
      </div>
      
      <div class="benefit-summary">
        <h4>🎯 再投入效益</h4>
        <div class="benefit-grid">
          <div class="benefit-item">
            <span>多出股數</span>
            <strong>+{{ formatNumber(reinvestBenefit.extraShares) }} 股</strong>
          </div>
          <div class="benefit-item">
            <span>多賺</span>
            <strong class="positive">+{{ formatNumber(reinvestBenefit.extraReturn) }} 元</strong>
          </div>
          <div class="benefit-item">
            <span>報酬率提升</span>
            <strong class="positive">+{{ reinvestBenefit.extraRoi.toFixed(2) }}%</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- 匯入匯出 -->
    <div class="card">
      <h2 class="card-title">💾 資料管理</h2>
      <div class="btn-group">
        <button class="btn btn-secondary" @click="exportData">📤 匯出資料</button>
        <label class="btn btn-secondary">
          📥 匯入資料
          <input type="file" accept=".json" @change="importData" style="display: none" />
        </label>
      </div>
    </div>

    <footer class="footer">
      <p>資料儲存於瀏覽器本地，請定期匯出備份</p>
    </footer>
  </div>
</template>
