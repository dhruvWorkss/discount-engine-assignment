import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { parsePdfCart } from '../engine/pdfCartParser.js'

export default function PdfUploader({ onCartLoaded }) {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [errors, setErrors] = useState([])
  const [fileName, setFileName] = useState('')
  const inputRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''

    if (file.type !== 'application/pdf') {
      setErrors(['Please upload a PDF file'])
      return
    }

    setLoading(true)
    setErrors([])
    setFileName(file.name)

    try {
      const { items, errors: parseErrors } = await parsePdfCart(file)
      setErrors(parseErrors)

      if (items.length > 0) {
        setPreview(items)
      } else {
        setErrors(['No cart items found in this PDF. Expected columns: Product, Brand, Platform, Base Price'])
      }
    } catch (err) {
      setErrors([`Failed to parse PDF: ${err.message}`])
    } finally {
      setLoading(false)
    }
  }

  function handleConfirm() {
    if (preview) {
      onCartLoaded(preview)
      setPreview(null)
      setFileName('')
    }
  }

  function handleDiscard() {
    setPreview(null)
    setErrors([])
    setFileName('')
  }

  return (
    <div className="space-y-3">
      {/* Upload area */}
      <div
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-4 cursor-pointer transition-all ${
          loading
            ? 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50'
            : 'border-slate-300 dark:border-slate-500/50 bg-slate-50 dark:bg-slate-800/50 hover:border-orange-400 dark:hover:border-orange-400/70 hover:bg-orange-50/30 dark:hover:bg-orange-500/5'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          onChange={handleFile}
          className="hidden"
        />
        <div className="flex items-center gap-3">
          <div className="text-2xl">{loading ? '⏳' : '📑'}</div>
          <div>
            <div className="font-semibold text-sm text-[#131A48] dark:text-white">
              {loading ? 'Parsing PDF...' : 'Upload Cart PDF'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {fileName || 'Expected format: Product, Brand, Platform, Base Price columns'}
            </div>
          </div>
          {!loading && (
            <span className="ml-auto text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">
              Upload
            </span>
          )}
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/40 rounded-md">
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-red-600 dark:text-red-400">{err}</p>
          ))}
        </div>
      )}

      {/* Preview */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="border border-slate-200 dark:border-slate-600/40 rounded-lg overflow-hidden"
          >
            <div className="px-3 py-2 bg-slate-50 dark:bg-[#111827] border-b border-slate-200 dark:border-slate-600/40 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-200">
                Extracted {preview.length} items from PDF
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{fileName}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-[#1a2444]">
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Product</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Brand</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Platform</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Base Price</th>
                    <th className="px-3 py-2 text-center font-semibold text-slate-600 dark:text-slate-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((item, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-[#141c2e]' : 'bg-slate-50 dark:bg-[#111827]'}>
                      <td className="px-3 py-1.5 text-slate-800 dark:text-white">{item.product}</td>
                      <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300">{item.brand}</td>
                      <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300">{item.platform}</td>
                      <td className="px-3 py-1.5 text-right text-slate-800 dark:text-white font-medium">
                        Rs.{item.basePrice.toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <span className="text-green-500 dark:text-emerald-400">✓</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-3 py-2 bg-slate-50 dark:bg-[#111827] border-t border-slate-200 dark:border-slate-600/40 flex gap-2">
              <button
                onClick={handleConfirm}
                className="flex-1 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 dark:bg-emerald-600 rounded hover:bg-green-700 dark:hover:bg-emerald-700 transition-colors"
              >
                Use This Cart
              </button>
              <button
                onClick={handleDiscard}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
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
