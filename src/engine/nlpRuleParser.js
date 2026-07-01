const SYSTEM_PROMPT = `You are a discount rule parser for an e-commerce platform. Convert natural language discount descriptions into structured JSON.

Output ONLY valid JSON matching this schema:
{
  "success": boolean,
  "rule": {
    "scope": "brand" | "platform" | "cart",
    "appliesTo": string (brand name, platform name, or "" for cart rules),
    "type": "percentage" | "flat",
    "value": number (percentage as integer e.g. 15 for 15%, or flat amount in rupees),
    "stackable": boolean,
    "minCartValue": number | null (only for cart-scope rules)
  },
  "confidence": number (0-1, how confident you are in the parsing),
  "ambiguities": string[] (list of unclear aspects, empty if none),
  "error": string | null (explanation if success is false)
}

Rules:
- "brand" scope: applies to all products of a specific brand
- "platform" scope: applies to all items on a specific platform (Amazon India, Flipkart, Noon, etc.)
- "cart" scope: applies to entire cart total, usually has a minimum cart value condition
- Default stackable to false unless explicitly stated as stackable
- If the input is too vague (missing discount value or target), set success to false and explain what's missing
- For percentage: value is the integer (20 means 20%)
- For flat: value is in rupees

Examples:
- "20% off for Natura Casa brand, stackable" → scope: brand, appliesTo: Natura Casa, type: percentage, value: 20, stackable: true
- "Rs.100 off on Flipkart" → scope: platform, appliesTo: Flipkart, type: flat, value: 100, stackable: false
- "10% off if cart value exceeds Rs.5000" → scope: cart, appliesTo: "", type: percentage, value: 10, stackable: false, minCartValue: 5000`

/**
 * Local regex-based NLP parser — handles common discount rule patterns
 * without requiring an API key. Returns null if it can't parse the input.
 */
export function parseLocally(input) {
  const text = input.trim().toLowerCase()
  const stackable = /stackable/.test(text)

  // Pattern 1: "X% off for [brand]" or "X% off on [brand] brand"
  const pctBrand = text.match(/(\d+)\s*%\s*off\s+(?:for|on)\s+(.+?)(?:\s+brand)?(?:,|\s*$|\s+stackable)/)
  if (pctBrand && !text.includes('platform') && !text.includes('cart') && !text.includes('if cart')) {
    const brandName = pctBrand[2].replace(/\s*,\s*$/, '').replace(/\s+brand$/, '').trim()
    return {
      success: true,
      rule: {
        scope: 'brand',
        appliesTo: titleCase(brandName),
        type: 'percentage',
        value: parseInt(pctBrand[1]),
        stackable,
        minCartValue: null,
      },
      confidence: 0.9,
      ambiguities: [],
      method: 'local',
    }
  }

  // Pattern 2: "Rs.X off on [platform]" or "Rs X off on [platform]"
  const flatPlatform = text.match(/rs\.?\s*(\d+)\s*off\s+(?:on|for)\s+(.+?)(?:,|\s*$|\s+stackable)/)
  if (flatPlatform && !text.includes('brand') && !text.includes('if cart')) {
    const platform = flatPlatform[2].replace(/\s*,\s*$/, '').trim()
    return {
      success: true,
      rule: {
        scope: 'platform',
        appliesTo: titleCase(platform),
        type: 'flat',
        value: parseInt(flatPlatform[1]),
        stackable,
        minCartValue: null,
      },
      confidence: 0.85,
      ambiguities: [],
      method: 'local',
    }
  }

  // Pattern 3: "X% off on [platform]" (percentage on platform)
  const pctPlatform = text.match(/(\d+)\s*%\s*off\s+(?:on|for)\s+(.+?)(?:,|\s*$|\s+stackable)/)
  if (pctPlatform && (text.includes('platform') || ['amazon', 'flipkart', 'noon', 'myntra', 'meesho', 'ajio'].some(p => text.includes(p)))) {
    const platform = pctPlatform[2].replace(/\s*,\s*$/, '').replace(/\s+platform$/, '').trim()
    return {
      success: true,
      rule: {
        scope: 'platform',
        appliesTo: titleCase(platform),
        type: 'percentage',
        value: parseInt(pctPlatform[1]),
        stackable,
        minCartValue: null,
      },
      confidence: 0.85,
      ambiguities: [],
      method: 'local',
    }
  }

  // Pattern 4: "X% off if cart > Rs.Y" or "X% off if cart value exceeds Rs.Y"
  const pctCart = text.match(/(\d+)\s*%\s*off\s+(?:if|when)\s+cart\s*(?:value)?\s*(?:>|exceeds|above|over|>=)\s*rs\.?\s*([\d,]+)/)
  if (pctCart) {
    return {
      success: true,
      rule: {
        scope: 'cart',
        appliesTo: '',
        type: 'percentage',
        value: parseInt(pctCart[1]),
        stackable,
        minCartValue: parseInt(pctCart[2].replace(/,/g, '')),
      },
      confidence: 0.9,
      ambiguities: [],
      method: 'local',
    }
  }

  // Pattern 5: "Rs.X off if cart > Rs.Y" (flat cart discount)
  const flatCart = text.match(/rs\.?\s*(\d+)\s*off\s+(?:if|when)\s+cart\s*(?:value)?\s*(?:>|exceeds|above|over|>=)\s*rs\.?\s*([\d,]+)/)
  if (flatCart) {
    return {
      success: true,
      rule: {
        scope: 'cart',
        appliesTo: '',
        type: 'flat',
        value: parseInt(flatCart[1]),
        stackable,
        minCartValue: parseInt(flatCart[2].replace(/,/g, '')),
      },
      confidence: 0.9,
      ambiguities: [],
      method: 'local',
    }
  }

  // Pattern 6: "flat Rs.X off on [brand/platform]"
  const flatGeneric = text.match(/(?:flat\s+)?rs\.?\s*(\d+)\s*(?:flat\s+)?(?:discount|off)\s+(?:on|for)\s+(.+?)(?:,|\s*$|\s+stackable)/)
  if (flatGeneric) {
    const target = flatGeneric[2].replace(/\s*,\s*$/, '').trim()
    const isPlatform = ['amazon', 'flipkart', 'noon', 'myntra', 'meesho', 'ajio'].some(p => target.toLowerCase().includes(p))
    return {
      success: true,
      rule: {
        scope: isPlatform ? 'platform' : 'brand',
        appliesTo: titleCase(target),
        type: 'flat',
        value: parseInt(flatGeneric[1]),
        stackable,
        minCartValue: null,
      },
      confidence: 0.75,
      ambiguities: isPlatform ? [] : ['Assumed brand scope — specify "platform" if this is a platform'],
      method: 'local',
    }
  }

  // Pattern 7: simple "X% off for [brand]" without "off" keyword variant
  const simplePct = text.match(/(\d+)\s*%\s*(?:discount)?\s+(?:for|on)\s+(.+?)(?:,|\s*$|\s+stackable)/)
  if (simplePct) {
    const target = simplePct[2].replace(/\s*,\s*$/, '').trim()
    const isPlatform = ['amazon', 'flipkart', 'noon', 'myntra', 'meesho', 'ajio'].some(p => target.toLowerCase().includes(p))
    return {
      success: true,
      rule: {
        scope: isPlatform ? 'platform' : 'brand',
        appliesTo: titleCase(target),
        type: 'percentage',
        value: parseInt(simplePct[1]),
        stackable,
        minCartValue: null,
      },
      confidence: 0.7,
      ambiguities: ['Assumed brand scope — specify "platform" if this is a platform'],
      method: 'local',
    }
  }

  // Could not parse locally
  return null
}

function titleCase(str) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase())
}

export async function parseNaturalLanguageRule(input, apiKey) {
  // Try local parsing first
  const localResult = parseLocally(input)
  if (localResult) {
    return localResult
  }

  // Fall back to API if local parsing failed
  if (!apiKey) {
    throw new Error('Could not parse locally. Please provide an API key for complex rules.')
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: input }],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const text = data.content[0].text

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text]
  const parsed = JSON.parse(jsonMatch[1].trim())

  return { ...parsed, method: 'api' }
}

export function generateRuleId(existingRules) {
  const maxNum = existingRules.reduce((max, r) => {
    const match = r.ruleId.match(/RULE-(\d+)/)
    return match ? Math.max(max, parseInt(match[1])) : max
  }, 0)
  return `RULE-${String(maxNum + 1).padStart(2, '0')}`
}
