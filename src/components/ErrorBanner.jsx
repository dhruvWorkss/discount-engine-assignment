export default function ErrorBanner({ errors }) {
  if (!errors || errors.length === 0) return null
  return (
    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 border-l-4 border-l-red-500 rounded-md p-3 mt-2">
      <div className="font-bold text-xs text-red-800 dark:text-red-300 mb-1">
        {errors.length} issue{errors.length > 1 ? 's' : ''} found
      </div>
      {errors.map((e, i) => (
        <div key={i} className="text-xs text-red-700 dark:text-red-400 mt-0.5">
          {e}
        </div>
      ))}
    </div>
  )
}
