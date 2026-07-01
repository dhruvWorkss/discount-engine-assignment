/**
 * discountEngine.js
 *
 * Pure discount calculation logic. No UI, no side effects.
 *
 * Data shapes:
 *
 * DiscountRule {
 *   ruleId:       string
 *   scope:        "brand" | "platform" | "cart"
 *   appliesTo:    string       — e.g. "Natura Casa", "Amazon India", "" for cart
 *   type:         "percentage" | "flat"
 *   value:        number       — percentage as integer (15 = 15%), flat in rupees
 *   stackable:    boolean
 *   minCartValue: number|null  — minimum cart total for cart-level rules
 * }
 *
 * CartItem {
 *   itemId:    string
 *   product:   string
 *   brand:     string
 *   platform:  string
 *   basePrice: number
 * }
 *
 * DiscountResult {
 *   itemId:        string
 *   product:       string
 *   brand:         string
 *   platform:      string
 *   basePrice:     number
 *   finalPrice:    number
 *   totalDiscount: number
 *   appliedRules:  string[]
 *   skippedRules:  string[]
 *   reasoning:     string
 *   status:        string
 * }
 *
 * CartSummary {
 *   itemResults:      DiscountResult[]
 *   subtotal:         number
 *   cartOffer:        { ruleId, discount, reasoning } | null
 *   finalTotal:       number
 *   totalSavings:     number
 * }
 */

export function ruleMatchesItem(item, rule) {
  if (rule.scope === 'cart') return false
  const normalise = (s) => s.trim().toLowerCase()
  if (rule.scope === 'brand') {
    return normalise(item.brand) === normalise(rule.appliesTo)
  }
  if (rule.scope === 'platform') {
    return normalise(item.platform) === normalise(rule.appliesTo)
  }
  return false
}

export function calculateDiscountAmount(price, rule) {
  if (rule.type === 'percentage') {
    return Math.round(price * rule.value / 100)
  }
  if (rule.type === 'flat') {
    return Math.min(rule.value, price)
  }
  return 0
}

function ruleToReasoning(rule, discountAmount) {
  const scopeLabel = rule.scope === 'brand' ? 'Brand' : 'Platform'
  if (rule.type === 'percentage') {
    return `${scopeLabel} offer: ${rule.value}% off (−Rs.${discountAmount})`
  }
  if (rule.type === 'flat') {
    return `${scopeLabel} offer: Rs.${rule.value} off`
  }
  return `${scopeLabel} offer applied`
}

function getStatus(appliedRules, skippedRules, stackable) {
  if (appliedRules.length === 0) return 'No offer'
  if (appliedRules.length > 1) return 'Stacked'
  if (skippedRules.length > 0) return 'Max discount'
  return 'Discount applied'
}

export function applyDiscounts(item, rules) {
  const matchingRules = rules.filter((r) => ruleMatchesItem(item, r))

  if (matchingRules.length === 0) {
    return {
      itemId: item.itemId,
      product: item.product,
      brand: item.brand,
      platform: item.platform,
      basePrice: item.basePrice,
      finalPrice: item.basePrice,
      totalDiscount: 0,
      appliedRules: [],
      skippedRules: [],
      reasoning: 'No offers available',
      status: 'No offer',
    }
  }

  const nonStackable = matchingRules.filter((r) => !r.stackable)
  const stackable = matchingRules.filter((r) => r.stackable)

  let winner = null
  let skipped = []

  if (nonStackable.length > 0) {
    const sorted = [...nonStackable].sort(
      (a, b) =>
        calculateDiscountAmount(item.basePrice, b) -
        calculateDiscountAmount(item.basePrice, a)
    )
    winner = sorted[0]
    skipped = sorted.slice(1)
  }

  let price = item.basePrice
  const appliedRules = []
  const reasoningParts = []

  if (winner) {
    const disc = calculateDiscountAmount(price, winner)
    price -= disc
    appliedRules.push(winner.ruleId)
    reasoningParts.push(ruleToReasoning(winner, disc))
  }

  for (const rule of stackable) {
    const disc = calculateDiscountAmount(price, rule)
    price -= disc
    appliedRules.push(rule.ruleId)
    reasoningParts.push(ruleToReasoning(rule, disc))
  }

  const finalPrice = Math.round(price)
  const status = getStatus(appliedRules, skipped, stackable.length > 0)

  return {
    itemId: item.itemId,
    product: item.product,
    brand: item.brand,
    platform: item.platform,
    basePrice: item.basePrice,
    finalPrice,
    totalDiscount: item.basePrice - finalPrice,
    appliedRules,
    skippedRules: skipped.map((r) => r.ruleId),
    reasoning: reasoningParts.join(' + '),
    status,
  }
}

export function processCart(cartItems, rules) {
  return cartItems.map((item) => applyDiscounts(item, rules))
}

export function cartTotal(results) {
  return results.reduce((sum, r) => sum + r.finalPrice, 0)
}

/**
 * Full cart calculation including cart-level offers.
 * Returns a CartSummary object.
 */
export function calculateCartSummary(cartItems, rules) {
  const itemRules = rules.filter((r) => r.scope !== 'cart')
  const cartRules = rules.filter((r) => r.scope === 'cart')

  const itemResults = processCart(cartItems, itemRules)
  const subtotal = cartTotal(itemResults)

  let cartOffer = null

  // Find the best applicable cart-level rule
  const applicableCartRules = cartRules.filter(
    (r) => !r.minCartValue || subtotal >= r.minCartValue
  )

  if (applicableCartRules.length > 0) {
    // Pick the one that gives the biggest discount
    const best = applicableCartRules.reduce((best, rule) => {
      const disc = calculateDiscountAmount(subtotal, rule)
      const bestDisc = calculateDiscountAmount(subtotal, best)
      return disc > bestDisc ? rule : best
    })

    const discount = calculateDiscountAmount(subtotal, best)
    cartOffer = {
      ruleId: best.ruleId,
      discount,
      percentage: best.type === 'percentage' ? best.value : null,
      minCartValue: best.minCartValue,
      reasoning: best.type === 'percentage'
        ? `Cart offer: ${best.value}% off entire cart — Rs.${discount} saved`
        : `Cart offer: Rs.${discount} off entire cart`,
    }
  }

  const finalTotal = subtotal - (cartOffer?.discount || 0)
  const baseTotal = cartItems.reduce((sum, item) => sum + item.basePrice, 0)
  const totalSavings = baseTotal - finalTotal

  return {
    itemResults,
    subtotal,
    cartOffer,
    finalTotal,
    totalSavings,
  }
}
