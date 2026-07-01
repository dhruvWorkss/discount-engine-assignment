import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { parseNaturalLanguageRule, generateRuleId } from '../engine/nlpRuleParser.js'

export default function NlpRuleInput({ rules, onAddRule, apiKey, onApiKeyChange }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState(null)
  const [parseMethod, setParseMethod] = useState(null)

  async function handleParse() {
    if (!input.trim()) return

    setLoading(true)
    setError(null)
    setParsed(null)
    setParseMethod(null)

    try {
      const result = await parseNaturalLanguageRule(input.trim(), apiKey)

      if (!result.success) {
        setError(result.error || 'Could not parse this rule. Please be more specific.')
        if (result.ambiguities?.length > 0) {
          setError(prev => `${prev}\n\nMissing details: ${result.ambiguities.join(', ')}`)
        }
        return
      }

      setParsed(result)
      setParseMethod(result.method || 'api')
    } catch (err) {
      setError(err.message || 'Failed to parse rule')
    } finally {
      setLoading(false)
    }
  }

  function handleConfirm() {
    if (!parsed?.rule) return
    const newRule = {
      ruleId: generateRuleId(rules),
      ...parsed.rule,
    }
    onAddRule(newRule)
    setParsed(null)
    setInput('')
    setParseMethod(null)
  }

  function handleDiscard() {
    setParsed(null)
    setError(null)
    setParseMethod(null)
  }

  const confidence = parsed?.confidence || 0
  const confidenceColor = confidence >= 0.8 ? 'text-green-600 dark:text-emerald-400' : confidence >= 0.5 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
  const confidenceBg = confidence >= 0.8
    ? 'bg-green-50 border-green-200 dark:bg-emerald-900/20 dark:border-emerald-500/40'
    : confidence >= 0.5
      ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-500/40'
      : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-500/40'

  return (
    <div className="space-y-3">
      {/* API Key input */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
          Anthropic API Key <span className="normal-case text-slate-400 dark:text-slate-500">(optional — local parsing works without it)</span>
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="sk-ant-... (only needed for complex rules)"
          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600/60 rounded-md bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
        />
      </div>

      {/* Rule input */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wide mb-1">
          Describe a discount rule
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleParse()}
            placeholder='e.g. "20% off for Natura Casa brand, stackable"'
            className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600/60 rounded-md bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
            disabled={loading}
          />
          <button
            onClick={handleParse}
            disabled={loading || !input.trim()}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#131A48] dark:bg-orange-600 rounded-md hover:bg-[#1e2560] dark:hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Parsing...
              </span>
            ) : 'Parse Rule'}
          </button>
        </div>
      </div>

      {/* Error state */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/40 rounded-md"
          >
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">Could not parse rule</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1 whitespace-pre-line">{error}</p>
            <p className="text-xs text-red-500 dark:text-red-400/70 mt-2 italic">
              Try being more specific — include the discount value, target (brand/platform), and type (% or flat).
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parsed confirmation */}
      <AnimatePresence>
        {parsed && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 border rounded-lg ${confidenceBg}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-200">Parsed Rule</span>
                {parseMethod && (
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                    parseMethod === 'local'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/40'
                      : 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-400/40'
                  }`}>
                    {parseMethod === 'local' ? 'Local' : 'AI'}
                  </span>
                )}
              </div>
              <span className={`text-xs font-bold ${confidenceColor}`}>
                {Math.round(confidence * 100)}% confidence
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <Field label="Scope" value={parsed.rule.scope} />
              <Field label="Applies To" value={parsed.rule.appliesTo || '(entire cart)'} />
              <Field label="Type" value={parsed.rule.type} />
              <Field label="Value" value={parsed.rule.type === 'percentage' ? `${parsed.rule.value}%` : `Rs.${parsed.rule.value}`} />
              <Field label="Stackable" value={parsed.rule.stackable ? 'Yes' : 'No'} />
              {parsed.rule.minCartValue && (
                <Field label="Min Cart Value" value={`Rs.${parsed.rule.minCartValue.toLocaleString('en-IN')}`} />
              )}
            </div>

            {parsed.ambiguities?.length > 0 && (
              <div className="mt-2 p-2 bg-amber-100 dark:bg-amber-900/30 rounded text-xs text-amber-700 dark:text-amber-300">
                <strong>Note:</strong> {parsed.ambiguities.join('; ')}
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button
                onClick={handleConfirm}
                className="flex-1 px-3 py-2 text-sm font-semibold text-white bg-green-600 dark:bg-emerald-600 rounded-md hover:bg-green-700 dark:hover:bg-emerald-700 transition-colors"
              >
                Confirm & Add Rule
              </button>
              <button
                onClick={handleDiscard}
                className="px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
              >
                Discard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <span className="block font-medium text-slate-800 dark:text-white capitalize">{value}</span>
    </div>
  )
}
