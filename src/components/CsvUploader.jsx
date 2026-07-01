import { useRef } from 'react'

export default function CsvUploader({ label, description, onLoad, hasData, fileName }) {
  const inputRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => onLoad(evt.target.result, file.name)
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-4 cursor-pointer transition-all ${
        hasData
          ? 'border-emerald-400 dark:border-emerald-500/60 bg-emerald-50 dark:bg-emerald-900/20'
          : 'border-slate-300 dark:border-slate-500/50 bg-slate-50 dark:bg-slate-800/50 hover:border-orange-400 dark:hover:border-orange-400/70 hover:bg-orange-50/30 dark:hover:bg-orange-500/5'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        onChange={handleFile}
        className="hidden"
      />
      <div className="flex items-center gap-3">
        <span className="text-xl">{hasData ? '✅' : '📄'}</span>
        <div>
          <div className="font-bold text-sm text-[#131A48] dark:text-white">{label}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {hasData ? fileName : description}
          </div>
        </div>
        <span className={`ml-auto text-xs font-bold uppercase tracking-wide ${
          hasData ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'
        }`}>
          {hasData ? 'Change' : 'Upload'}
        </span>
      </div>
    </div>
  )
}
