import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CsvUploader from './components/CsvUploader.jsx'
import DataTable from './components/DataTable.jsx'
import ErrorBanner from './components/ErrorBanner.jsx'
import NlpRuleInput from './components/NlpRuleInput.jsx'
import PdfUploader from './components/PdfUploader.jsx'
import CartResults from './components/CartResults.jsx'
import ThresholdNudge from './components/ThresholdNudge.jsx'
import { parseRulesCSV, parseCartCSV } from './engine/csvParser.js'
import { calculateCartSummary } from './engine/discountEngine.js'

const RULES_COLUMNS = [
  { key: 'ruleId', label: 'Rule ID' },
  { key: 'scope', label: 'Scope', render: (v) => v.charAt(0).toUpperCase() + v.slice(1) },
  { key: 'appliesTo', label: 'Applies To', render: (v) => v || '(entire cart)' },
  { key: 'type', label: 'Type', render: (v) => v.charAt(0).toUpperCase() + v.slice(1) },
  {
    key: 'value',
    label: 'Value',
    render: (v, row) => row.type === 'percentage' ? `${v}% off` : `Rs.${v} off`,
  },
  { key: 'stackable', label: 'Stackable', render: (v) => (v ? 'Yes' : 'No') },
  {
    key: 'minCartValue',
    label: 'Condition',
    render: (v) => v ? `Cart >= Rs.${v.toLocaleString('en-IN')}` : '--',
  },
]

const CART_COLUMNS = [
  { key: 'itemId', label: 'Item' },
  { key: 'product', label: 'Product' },
  { key: 'brand', label: 'Brand' },
  { key: 'platform', label: 'Platform' },
  { key: 'basePrice', label: 'Base Price', render: (v) => `Rs.${v.toLocaleString('en-IN')}` },
]

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('discount-engine-dark')
    if (stored !== null) return stored === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('discount-engine-dark', String(dark))
  }, [dark])

  return [dark, setDark]
}

export default function App() {
  const [dark, setDark] = useDarkMode()

  const [rules, setRules] = useState([])
  const [rulesErrors, setRulesErr] = useState([])
  const [rulesFileName, setRulesFileName] = useState('')

  const [cartItems, setCartItems] = useState([])
  const [cartErrors, setCartErrors] = useState([])
  const [cartFileName, setCartFileName] = useState('')

  const [summary, setSummary] = useState(null)
  const [apiKey, setApiKey] = useState('')
  const [activeTab, setActiveTab] = useState('csv')

  function handleRulesLoad(csvText, fileName) {
    const { data, errors } = parseRulesCSV(csvText)
    setRules(data)
    setRulesErr(errors)
    setRulesFileName(fileName)
    setSummary(null)
  }

  function handleCartLoad(csvText, fileName) {
    const { data, errors } = parseCartCSV(csvText)
    setCartItems(data)
    setCartErrors(errors)
    setCartFileName(fileName)
    setSummary(null)
  }

  function handlePdfCartLoad(items) {
    setCartItems(items)
    setCartErrors([])
    setCartFileName('PDF upload')
    setSummary(null)
  }

  const handleAddRule = useCallback((newRule) => {
    setRules((prev) => [...prev, newRule])
    setSummary(null)
  }, [])

  const handleDeleteRule = useCallback((ruleId) => {
    setRules((prev) => prev.filter((r) => r.ruleId !== ruleId))
    setSummary(null)
  }, [])

  function handleCalculate() {
    const result = calculateCartSummary(cartItems, rules)
    setSummary(result)
  }

  const canCalculate = rules.length > 0 && cartItems.length > 0

  // Add a delete column to the rules columns
  const rulesColumnsWithDelete = [
    ...RULES_COLUMNS,
    {
      key: '_delete',
      label: '',
      render: (_v, row) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleDeleteRule(row.ruleId) }}
          className="text-slate-400 hover:text-red-500 transition-colors p-0.5 rounded hover:bg-red-50"
          title="Remove rule"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-[#0c1222] dark:to-[#0a0f1a] transition-colors">
      {/* Header */}
      <header className="bg-[#131A48] dark:bg-[#0f1535] px-6 py-3 flex items-center justify-between shadow-lg dark:shadow-black/30 border-b border-transparent dark:border-slate-700/50">
        <div className="flex items-center gap-3">
          <h1 className="text-white font-serif font-bold text-lg tracking-tight">
            O<span className="text-orange-500">pp</span>tra
          </h1>
          <span className="hidden sm:inline-block text-xs text-white/40 uppercase tracking-widest">
            Discount Engine
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Dark mode toggle */}
          <button
            onClick={() => setDark((d) => !d)}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <div className="text-[10px] text-white/30 uppercase tracking-wider">
            FDE Assignment
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Input Section - Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Rules Panel */}
          <div className="bg-white dark:bg-[#141c2e] rounded-xl border border-slate-200 dark:border-slate-600/40 shadow-sm dark:shadow-black/20 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-600/40">
              <h2 className="font-serif font-bold text-[#131A48] dark:text-slate-100 text-sm">
                <span className="inline-block w-1 h-4 bg-orange-500 rounded mr-2 align-middle"></span>
                Discount Rules
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <CsvUploader
                label="rules.csv"
                description="Upload your discount rules CSV"
                onLoad={handleRulesLoad}
                hasData={rules.length > 0}
                fileName={rulesFileName}
              />
              <ErrorBanner errors={rulesErrors} />

              {/* NLP Rule Input */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-600/40">
                <div className="text-xs font-bold text-slate-500 dark:text-orange-400/80 uppercase tracking-wide mb-2">
                  Or add a rule using natural language
                </div>
                <NlpRuleInput
                  rules={rules}
                  onAddRule={handleAddRule}
                  apiKey={apiKey}
                  onApiKeyChange={setApiKey}
                />
              </div>

              {/* Rules table */}
              <AnimatePresence>
                {rules.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="text-xs text-slate-400 dark:text-slate-300 mb-1.5">
                      {rules.length} rule{rules.length > 1 ? 's' : ''} active
                    </div>
                    <DataTable columns={rulesColumnsWithDelete} rows={rules} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Cart Panel */}
          <div className="bg-white dark:bg-[#141c2e] rounded-xl border border-slate-200 dark:border-slate-600/40 shadow-sm dark:shadow-black/20 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-600/40">
              <h2 className="font-serif font-bold text-[#131A48] dark:text-slate-100 text-sm">
                <span className="inline-block w-1 h-4 bg-orange-500 rounded mr-2 align-middle"></span>
                Cart Items
              </h2>
            </div>
            <div className="p-5 space-y-4">
              {/* Tab switcher */}
              <div className="flex gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <TabButton active={activeTab === 'csv'} onClick={() => setActiveTab('csv')}>
                  CSV Upload
                </TabButton>
                <TabButton active={activeTab === 'pdf'} onClick={() => setActiveTab('pdf')}>
                  PDF Upload
                </TabButton>
              </div>

              {activeTab === 'csv' ? (
                <CsvUploader
                  label="cart.csv"
                  description="Upload your cart CSV"
                  onLoad={handleCartLoad}
                  hasData={cartItems.length > 0}
                  fileName={cartFileName}
                />
              ) : (
                <PdfUploader onCartLoaded={handlePdfCartLoad} />
              )}

              <ErrorBanner errors={cartErrors} />

              {/* Cart items table */}
              <AnimatePresence>
                {cartItems.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="text-xs text-slate-400 dark:text-slate-300 mb-1.5">
                      {cartItems.length} item{cartItems.length > 1 ? 's' : ''} in cart
                    </div>
                    <DataTable columns={CART_COLUMNS} rows={cartItems} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Calculate button */}
        <div className="text-center">
          <button
            onClick={handleCalculate}
            disabled={!canCalculate}
            className={`px-8 py-3 text-sm font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all
              ${canCalculate
                ? 'bg-orange-500 text-white hover:bg-orange-600 hover:shadow-md dark:shadow-orange-500/20 active:scale-[0.98]'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
          >
            Calculate Discounts
          </button>
          {!canCalculate && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Upload both rules and cart to calculate</p>
          )}
        </div>

        {/* Threshold nudge */}
        {summary && !summary.cartOffer && (
          <ThresholdNudge subtotal={summary.subtotal} cartRules={rules} />
        )}

        {/* Results */}
        <AnimatePresence>
          {summary && <CartResults summary={summary} />}
        </AnimatePresence>

      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-400 dark:text-slate-500/70">
        Built for Opptra FDE Intern Assignment
      </footer>
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors
        ${active
          ? 'bg-white dark:bg-orange-500/20 text-[#131A48] dark:text-orange-300 shadow-sm dark:border dark:border-orange-500/30'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
    >
      {children}
    </button>
  )
}
