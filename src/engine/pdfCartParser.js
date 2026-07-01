import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

export async function parsePdfCart(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let allText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const lines = extractLines(content.items)
    allText += lines.join('\n') + '\n'
  }

  return extractCartItems(allText)
}

function extractLines(items) {
  if (items.length === 0) return []

  // Group items by Y position (same line)
  const lineMap = new Map()
  for (const item of items) {
    const y = Math.round(item.transform[5])
    if (!lineMap.has(y)) lineMap.set(y, [])
    lineMap.get(y).push(item)
  }

  // Sort lines top to bottom (higher Y = higher on page)
  const sortedYs = [...lineMap.keys()].sort((a, b) => b - a)

  return sortedYs.map((y) => {
    const lineItems = lineMap.get(y).sort((a, b) => a.transform[4] - b.transform[4])
    return lineItems.map((i) => i.str).join(' ').trim()
  })
}

function extractCartItems(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const items = []
  const errors = []

  // Find column headers
  const headerPatterns = [
    /product/i, /brand/i, /platform/i, /(?:base\s*)?price/i
  ]

  let dataStartIndex = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase()
    if (headerPatterns.every((p) => p.test(line))) {
      dataStartIndex = i + 1
      break
    }
  }

  // Skip separator lines
  while (dataStartIndex < lines.length && /^[─\-═=\s]+$/.test(lines[dataStartIndex])) {
    dataStartIndex++
  }

  let itemCounter = 1
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i]
    if (/^[─\-═=\s]+$/.test(line)) continue
    if (!line || line.length < 5) continue

    const parsed = parseCartLine(line)
    if (parsed) {
      items.push({
        itemId: `ITEM-${String(itemCounter).padStart(2, '0')}`,
        ...parsed,
      })
      itemCounter++
    } else {
      errors.push(`Could not parse line: "${line.substring(0, 60)}"`)
    }
  }

  return { items, errors }
}

function parseCartLine(line) {
  // Try to extract price first (Rs.X,XXX or Rs.XXX or just numbers at end)
  const priceMatch = line.match(/Rs\.?\s*([\d,]+(?:\.\d+)?)\s*$/)
  if (!priceMatch) return null

  const basePrice = Math.round(parseFloat(priceMatch[1].replace(/,/g, '')))
  if (isNaN(basePrice) || basePrice <= 0) return null

  const beforePrice = line.substring(0, priceMatch.index).trim()

  // Known platforms to look for
  const platforms = ['Amazon India', 'Flipkart', 'Noon', 'Myntra', 'Ajio', 'Meesho', 'Nykaa']
  let platform = ''
  let remaining = beforePrice

  for (const p of platforms) {
    const idx = remaining.toLowerCase().lastIndexOf(p.toLowerCase())
    if (idx !== -1) {
      platform = p
      remaining = (remaining.substring(0, idx) + remaining.substring(idx + p.length)).trim()
      break
    }
  }

  if (!platform) {
    // Try splitting by multiple spaces or tabs
    const parts = remaining.split(/\s{2,}|\t+/)
    if (parts.length >= 3) {
      platform = parts.pop().trim()
      remaining = parts.join('  ')
    }
  }

  // Split remaining into product and brand
  const parts = remaining.split(/\s{2,}|\t+/).filter(Boolean)
  let product, brand

  if (parts.length >= 2) {
    product = parts[0].trim()
    brand = parts.slice(1).join(' ').trim()
  } else {
    // Single chunk — try known brand patterns
    product = remaining.trim()
    brand = 'Unknown'
  }

  if (!product || !platform) return null

  return { product, brand, platform, basePrice }
}
