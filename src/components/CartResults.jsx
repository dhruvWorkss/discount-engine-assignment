import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'

function AnimatedCounter({ value, duration = 800 }) {
  const [displayValue, setDisplayValue] = useState(0)
  const prevValue = useRef(0)

  useEffect(() => {
    const start = prevValue.current
    const end = value
    const startTime = performance.now()

    function animate(currentTime) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(start + (end - start) * eased)
      setDisplayValue(current)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        prevValue.current = end
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration])

  return <>{displayValue.toLocaleString('en-IN')}</>
}

function exportToCSV(summary) {
  const { itemResults, subtotal, cartOffer, finalTotal, totalSavings } = summary
  const headers = ['Item ID', 'Product', 'Brand', 'Platform', 'Base Price', 'Final Price', 'Discount', 'Offer Applied', 'Status']
  const rows = itemResults.map(item => [
    item.itemId,
    item.product,
    item.brand,
    item.platform,
    item.basePrice,
    item.finalPrice,
    item.totalDiscount,
    item.reasoning,
    item.status,
  ])

  rows.push([])
  rows.push(['Subtotal', '', '', '', '', subtotal, '', '', ''])
  if (cartOffer) {
    rows.push(['Cart Offer', '', '', '', '', `-${cartOffer.discount}`, '', cartOffer.reasoning, ''])
  }
  rows.push(['FINAL TOTAL', '', '', '', '', finalTotal, totalSavings, `Total Savings: Rs.${totalSavings}`, ''])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `cart-summary-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function CartResults({ summary }) {
  if (!summary) return null

  const { itemResults, subtotal, cartOffer, finalTotal, totalSavings } = summary

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#141c2e] border border-slate-200 dark:border-slate-600/40 rounded-xl overflow-hidden shadow-sm dark:shadow-black/20"
    >
      {/* Header */}
      <div className="px-5 py-3 bg-[#131A48] dark:bg-[#1a2444]">
        <h2 className="text-white font-bold text-sm tracking-wide">Cart Summary</h2>
      </div>

      {/* Item results */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-600/50 bg-slate-50 dark:bg-[#111827]">
              <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Item</th>
              <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Product</th>
              <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Base Price</th>
              <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Final Price</th>
              <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Saved</th>
              <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Offer Applied</th>
              <th className="px-4 py-2.5 text-center text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {itemResults.map((item, i) => (
              <motion.tr
                key={item.itemId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`border-b border-slate-100 dark:border-slate-700/50 ${i % 2 === 0 ? 'bg-white dark:bg-[#141c2e]' : 'bg-slate-50/50 dark:bg-[#111827]'}`}
              >
                <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 font-mono">{item.itemId}</td>
                <td className="px-4 py-2.5">
                  <div className="font-medium text-slate-800 dark:text-white">{item.product}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">{item.brand} · {item.platform}</div>
                </td>
                <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                  Rs.{item.basePrice.toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className={`font-bold ${item.totalDiscount > 0 ? 'text-[#131A48] dark:text-orange-300' : 'text-slate-600 dark:text-slate-300'}`}>
                    Rs.{item.finalPrice.toLocaleString('en-IN')}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  {item.totalDiscount > 0 ? (
                    <span className="text-green-600 dark:text-emerald-400 font-semibold">
                      −Rs.{item.totalDiscount.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200">
                  {item.reasoning === 'No offers available' ? (
                    <span className="text-slate-400 dark:text-slate-500 italic text-xs">No offers available</span>
                  ) : (
                    <span className="text-xs">{item.reasoning}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <StatusBadge status={item.status} />
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals section */}
      <div className="border-t-2 border-[#131A48] dark:border-orange-500/50 px-5 py-4 space-y-2 bg-white dark:bg-[#111827]">
        {/* Subtotal */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-600 dark:text-slate-300">Subtotal (after item discounts)</span>
          <span className="font-semibold text-slate-800 dark:text-white">Rs.{subtotal.toLocaleString('en-IN')}</span>
        </div>

        {/* Cart offer line */}
        {cartOffer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-between items-center text-sm p-2.5 bg-green-50 dark:bg-emerald-900/30 rounded-md border border-green-200 dark:border-emerald-500/40"
          >
            <span className="text-green-700 dark:text-emerald-300 font-medium flex items-center gap-1.5">
              <span className="text-base">🎉</span>
              {cartOffer.reasoning}
            </span>
            <span className="font-bold text-green-700 dark:text-emerald-300">
              −Rs.{cartOffer.discount.toLocaleString('en-IN')}
            </span>
          </motion.div>
        )}

        {/* Final total */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-600/50">
          <span className="font-bold text-[#131A48] dark:text-white text-base">Final Cart Total</span>
          <div className="text-right">
            <span className="font-bold text-[#131A48] dark:text-orange-300 text-xl">
              Rs.<AnimatedCounter value={finalTotal} />
            </span>
            {totalSavings > 0 && (
              <div className="text-xs text-green-600 dark:text-emerald-400 font-semibold mt-0.5">
                Total savings: Rs.{totalSavings.toLocaleString('en-IN')}
              </div>
            )}
          </div>
        </div>

        {/* Export CSV */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50">
          <button
            onClick={() => exportToCSV(summary)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function StatusBadge({ status }) {
  const config = {
    'Max discount': {
      light: 'bg-blue-100 text-blue-700 border-blue-200',
      dark: 'dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/40',
    },
    'Stacked': {
      light: 'bg-green-100 text-green-700 border-green-200',
      dark: 'dark:bg-green-500/20 dark:text-green-300 dark:border-green-400/40',
    },
    'Discount applied': {
      light: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      dark: 'dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/40',
    },
    'No offer': {
      light: 'bg-slate-100 text-slate-500 border-slate-200',
      dark: 'dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600',
    },
  }

  const c = config[status] || config['No offer']

  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border ${c.light} ${c.dark} uppercase tracking-wide whitespace-nowrap`}>
      {status}
    </span>
  )
}
