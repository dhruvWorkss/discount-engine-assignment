export default function DataTable({ columns, rows, emptyMessage = 'No data loaded.' }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600/40 rounded-md bg-slate-50 dark:bg-slate-800/50">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto border border-slate-200 dark:border-slate-600/40 rounded-md">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-[#131A48] dark:bg-[#1a2444] text-white">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-2.5 py-2 text-left text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-slate-100 dark:border-slate-700/50 ${
                i % 2 === 0
                  ? 'bg-white dark:bg-[#141c2e]'
                  : 'bg-slate-50 dark:bg-[#111827]'
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="px-2.5 py-1.5 text-slate-700 dark:text-slate-200 align-top"
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
