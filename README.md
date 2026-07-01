# Opptra Discount Engine

A customer-facing cart pricing engine that resolves competing discount rules — brand vs platform vs cart-level — and surfaces the best deal to the customer with a clear explanation. Built for the Opptra FDE Intern assignment.

> **[Live Demo](https://discount-engine-iota.vercel.app)** · **[Video Walkthrough](https://www.loom.com/share/eb892fe1087c4526951ab105981b6081)**

---

## Quick Start

```bash
git clone https://github.com/dhruvWorkss/discount-engine-assignment.git
cd discount-engine-assignment
npm install && npm run dev
```

Open `http://localhost:5173` → upload sample CSVs from `sample-data/` → click **Calculate Discounts**.

---

## What It Does

| Requirement | Implementation |
|---|---|
| **Foundation** | Picks max-saving rule per item, stacks stackable rules on top, produces customer-readable reasoning |
| **Task 1 — Cart Offer** | Evaluates cart-level rules post item-discounts; shows as a separate savings row; nudges user when near threshold |
| **Task 2 — NLP Rules** | Plain-English → structured rule via local regex + Claude API fallback; confidence scoring; confirmation step; ambiguity handling |
| **Task 3 — PDF Upload** | Client-side pdf.js extraction; preview table with validation; graceful partial-failure handling |

---

## Architecture

```
src/
├── engine/                  ← Pure logic, zero UI
│   ├── discountEngine.js        Core discount math
│   ├── csvParser.js             CSV → typed objects
│   ├── nlpRuleParser.js         NL → DiscountRule (local + API)
│   └── pdfCartParser.js         PDF → CartItem[]
│
├── components/              ← Presentation layer
│   ├── CartResults.jsx          Results + cart offer + export
│   ├── NlpRuleInput.jsx         Text input + confirmation card
│   ├── PdfUploader.jsx          PDF upload + preview
│   ├── ThresholdNudge.jsx       "Add Rs.X more" incentive
│   ├── CsvUploader.jsx          File input
│   ├── DataTable.jsx            Reusable table
│   └── ErrorBanner.jsx          Validation errors
│
└── App.jsx                  ← State + layout + dark mode
```

**Key principle:** Input adapters are fully decoupled from the engine. Adding a fifth input method (API endpoint, voice, barcode scan) means writing one adapter — the discount calculator stays untouched.

---

## Discount Selection Logic

```
1. Find all rules matching an item (by brand or platform scope)
2. Among non-stackable matches → pick the one giving the LARGEST rupee saving
3. Apply stackable rules on top of the reduced price (compound, in sequence)
4. After all items are priced → check cart-level rules against post-discount subtotal
5. If threshold met → apply cart discount on the full subtotal
```

### Expected Output (Sample Data)

| Item | Base Price | Final Price | What Happened |
|------|-----------|-------------|---------------|
| ITEM-01 | Rs.1,299 | **Rs.1,104** | Platform 15% beats brand Rs.150 (saves Rs.195 vs Rs.150) |
| ITEM-02 | Rs.849 | **Rs.629** | Brand Rs.150 off → then platform 10% stacked on top |
| ITEM-03 | Rs.599 | **Rs.509** | Platform 15% off |
| ITEM-04 | Rs.2,499 | **Rs.2,499** | No rules match — full price |
| ITEM-05 | Rs.449 | **Rs.382** | Platform 15% off |
| ITEM-06 | Rs.899 | **Rs.809** | Platform 10% off (stackable, applies alone) |
| | | | |
| **Subtotal** | | **Rs.5,932** | Sum of final item prices |
| **Cart Offer** | | **−Rs.593** | RULE-04: 10% off (Rs.5,932 ≥ Rs.4,000 threshold) |
| **Final Total** | | **Rs.5,339** | |

---

## Design Decisions

### Cart offer applied after item discounts
Item-level discounts reduce prices first, then the cart rule checks the post-discount subtotal against its threshold. This protects margins — the threshold is harder to hit — and the cart discount compounds on already-reduced prices. The alternative (checking against base prices) would be more generous to customers but isn't how the spec defines it.

### Local-first NLP parsing
Common patterns (`"20% off for X brand, stackable"`, `"Rs.100 off on Flipkart"`) are parsed with regex locally — no API key, no latency, no cost. The Claude API is a fallback for complex or ambiguous inputs only. This means the feature works out of the box for evaluators without needing credentials.

### Confidence scoring on parsed rules
An LLM (or regex) can misinterpret ambiguous input. Rather than silently applying a bad rule, the confidence score (shown in the confirmation card) signals parsing reliability. Below 80% → amber warning. This gives the user agency before the rule touches their cart.

### "Unresolvable" over "guess"
`"Give a discount for big orders"` has no value or threshold. Instead of inventing one, the system explains what's missing and suggests a rewrite. A real product shouldn't surprise customers — same principle applies to the admin creating rules.

### Client-side PDF parsing
No backend = simpler deployment, no CORS issues, no auth. pdf.js handles standard table-format PDFs reliably. Tradeoff: unusual layouts or scanned images would need server-side OCR — documented, not silently broken.

### Flat discount capped at item price
`Rs.150 off` on a `Rs.100` item → `Rs.0`, not `-Rs.50`. Prevents negative line items from reaching the customer.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Cart just below threshold | Shows "Add Rs.X more to unlock Y% off" nudge |
| Ambiguous NLP input | Rejects with specific feedback, suggests rewrite |
| Invalid/malformed PDF rows | Skipped with visible warning, valid rows still extracted |
| Multiple non-stackable rules | Largest rupee saving wins, scope is irrelevant |
| No rules match | Base price returned, "No offers available" shown |
| Zero or negative CSV values | Rejected at parse time with row-level error |
| LLM returns invalid JSON | Caught, surfaced as parse error with retry guidance |

---

## Tech Stack

| Layer | Tool | Why |
|-------|------|-----|
| Build | Vite 5 | Fast dev server, instant HMR |
| UI | React 18 | Component model, hooks for state |
| Styling | Tailwind CSS v4 | Utility-first, dark mode via class strategy |
| CSV Parsing | PapaParse | Handles edge cases (quoted commas, BOM) |
| PDF Parsing | pdf.js | Client-side, no backend dependency |
| NLP | Local regex + Claude API | Works without API key; API for complex cases |
| Animation | Framer Motion | Subtle transitions on state changes |

---

## Running Locally

```bash
npm install          # install dependencies
npm run dev          # start dev server at localhost:5173
npm run build        # production build → dist/
```

No environment variables required. The Anthropic API key (for complex NLP rules only) is entered at runtime in the UI — never stored.

---

## Submission

- **GitHub:** [github.com/dhruvWorkss/discount-engine-assignment](https://github.com/dhruvWorkss/discount-engine-assignment)
- **Live Demo:** [discount-engine-iota.vercel.app](https://discount-engine-iota.vercel.app)
- **Loom Walkthrough:** [Watch here](https://www.loom.com/share/eb892fe1087c4526951ab105981b6081)
