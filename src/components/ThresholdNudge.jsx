import { motion } from 'framer-motion'

export default function ThresholdNudge({ subtotal, cartRules }) {
  if (!cartRules || cartRules.length === 0) return null

  const missedRules = cartRules.filter(
    (r) => r.scope === 'cart' && r.minCartValue && subtotal < r.minCartValue
  )

  if (missedRules.length === 0) return null

  const closest = missedRules.reduce((best, r) =>
    (r.minCartValue - subtotal) < (best.minCartValue - subtotal) ? r : best
  )

  const gap = closest.minCartValue - subtotal

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg text-sm"
    >
      <span className="text-lg">💡</span>
      <span className="text-amber-800 dark:text-amber-200">
        Add <strong className="text-amber-900 dark:text-orange-300">Rs.{gap.toLocaleString('en-IN')}</strong> more to unlock{' '}
        <strong className="text-amber-900 dark:text-orange-300">{closest.value}% off</strong> your entire cart!
      </span>
    </motion.div>
  )
}
