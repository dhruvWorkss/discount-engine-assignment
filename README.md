# Opptra Discount Engine

A customer-facing cart pricing engine that calculates optimal discounts across brand offers, platform offers, and cart-level promotions — with natural language rule creation and PDF cart upload.

**Live Demo:** [Deployment URL here]

---

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/discount-engine.git
cd discount-engine
npm install && npm run dev
```

Open http://localhost:5173 — upload the sample CSVs from `sample-data/` and click "Calculate Discounts".

---

## Features

### Foundation — Discount Engine
- Handles brand, platform, and cart-level discount rules
- Picks the maximum-saving non-stackable rule per item
- Stacks stackable rules on top of the winner
- Shows customer-readable explanations for every decision

### Task 1 — Cart-Level Offers
- Cart rules evaluated after all item-level discounts
- Threshold-based triggers (e.g., "10% off if cart ≥ Rs.4,000")
- Separate cart offer row in results with clear savings display
- "Add Rs.X more to unlock Y% off" nudge when cart is close to threshold

### Task 2 — Natural Language Rule Input
- Type a discount rule in plain English → Claude API parses it into a structured rule
- Confidence scoring: high-confidence fields in green, uncertain fields in amber
- Ambiguous inputs surface specific feedback ("missing discount value")
- Editable confirmation step before rule is applied
- Engine re-runs automatically with the new rule

### Task 3 — PDF Cart Upload
- Client-side PDF parsing (pdf.js) — no backend needed
- Extracts Product, Brand, Platform, Base Price from table-format PDFs
- Preview with validation indicators before confirming
- Handles partial/malformed data gracefully with row-level errors

---

## Architecture

```
src/
├── engine/              # Pure logic — no UI, no side effects
│   ├── discountEngine.js   # Core discount calculation
│   ├── csvParser.js        # CSV → typed objects
│   ├── nlpRuleParser.js    # Natural language → DiscountRule
│   └── pdfCartParser.js    # PDF → CartItem[]
├── components/          # UI layer
│   ├── CartResults.jsx     # Results display with cart offer
│   ├── NlpRuleInput.jsx    # NLP text input + confirmation
│   ├── PdfUploader.jsx     # PDF upload + preview
│   ├── ThresholdNudge.jsx  # "Add X more" incentive
│   ├── CsvUploader.jsx     # CSV file input
│   ├── DataTable.jsx       # Reusable table
│   └── ErrorBanner.jsx     # Error display
└── App.jsx              # State management + layout
```

Input adapters (CSV, NLP, PDF) are completely independent of the engine. Adding a fourth input mode means writing one new adapter — the calculator stays untouched.

---

## Design Decisions

### Why client-side PDF parsing?
The assignment says "a backend is optional — both tasks can be done client-side." pdf.js handles the parsing without any server, reducing deployment complexity and eliminating CORS/auth concerns. Tradeoff: complex multi-page PDFs with unusual layouts may need server-side OCR — but for the expected table format, client-side is reliable and fast.

### Why confidence scoring on NLP output?
An LLM can hallucinate or misinterpret ambiguous inputs. Rather than silently applying a bad rule, the confidence score gives users a signal about parsing reliability. Fields with <80% confidence are highlighted so users know to double-check before confirming.

### Why show "unresolvable" errors instead of guessing?
"Give a discount for big orders" has no value or threshold. Instead of inventing one (which would be wrong), the system explains exactly what's missing and suggests a rewrite. This matches how a real product should behave — no surprises for the customer.

### Cart offer applied after item discounts
This is a deliberate ordering: item-level discounts reduce individual prices first, then the cart-level rule checks the post-discount subtotal against its threshold. This means the threshold is harder to meet (which protects margins) and the cart discount compounds on already-reduced prices.

### Flat discount capped at item price
A Rs.150 flat discount on a Rs.100 item returns Rs.0, not Rs.-50. The engine caps flat discounts at the current price to prevent negative amounts.

---

## Edge Cases Handled

- **Cart just below threshold**: Shows a nudge ("Add Rs.68 more to unlock 10% off")
- **LLM returns invalid JSON**: Caught and surfaced as a parse error with retry guidance
- **PDF with missing columns**: Partial extraction + per-row error messages
- **Multiple non-stackable rules**: Largest saving wins, regardless of scope
- **No rules match an item**: Returns base price with "No offers available"
- **Zero/negative values in CSV**: Rejected at parse time with specific error messages
- **Duplicate rule IDs from NLP**: Auto-generates next sequential ID

---

## Tech Stack

- **Vite** + **React 18** — fast dev, instant HMR
- **Tailwind CSS v4** — utility-first styling
- **pdf.js** — client-side PDF text extraction
- **Claude API** (Anthropic) — natural language rule parsing
- **Framer Motion** — subtle animations on state changes
- **PapaParse** — robust CSV parsing

---

## Discount Logic

- When multiple non-stackable rules match an item, the one giving the **largest saving in rupees** is applied.
- Rules marked `stackable: true` apply **on top of** the winning non-stackable rule.
- If no rules match, the base price is returned with a "No offers available" note.
- **Cart-level rules** apply to the entire cart total after all item-level discounts, provided the threshold is met.

## Expected Results (Sample Data)

| Item    | Base Price | Final Price | Status         |
|---------|-----------|-------------|----------------|
| ITEM-01 | Rs.1,299  | Rs.1,104    | Max discount   |
| ITEM-02 | Rs.849    | Rs.629      | Stacked        |
| ITEM-03 | Rs.599    | Rs.509      | Discount applied |
| ITEM-04 | Rs.2,499  | Rs.2,499    | No offer       |
| ITEM-05 | Rs.449    | Rs.382      | Discount applied |
| ITEM-06 | Rs.899    | Rs.809      | Discount applied |
| **Subtotal** | | **Rs.5,932** | |
| Cart Offer (RULE-04) | | −Rs.593 | 10% off |
| **Final Total** | | **Rs.5,339** | |

---

## API Key

The natural language feature requires an Anthropic API key. Enter it in the UI field (stored in memory only — never persisted or sent anywhere except Anthropic's API).
