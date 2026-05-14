export default function Pagination({
  page,
  totalPages,
  onPageChange,
  perPage,
  onPerPageChange,
  totalItems,
  pageSizeOptions = [5, 10, 20, 50],
}) {
  if (totalItems === 0) return null

  const maxVisible = 5
  let start = Math.max(1, page - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages, start + maxVisible - 1)
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)

  const pages = []
  for (let i = start; i <= end; i++) pages.push(i)

  const from = Math.min((page - 1) * perPage + 1, totalItems)
  const to = Math.min(page * perPage, totalItems)

  return (
    <div className="adm-pagination">
      <div className="adm-pagination-info">
        Hatudu <strong>{from}–{to}</strong> husi <strong>{totalItems}</strong>
      </div>

      <div className="adm-pagination-controls">
        <button
          className="adm-pag-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          title="Pajina dahuluk"
        >
          «
        </button>
        <button
          className="adm-pag-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          title="Prev"
        >
          ‹
        </button>

        {start > 1 && <span className="adm-pag-ellipsis">…</span>}

        {pages.map((p) => (
          <button
            key={p}
            className={`adm-pag-btn${p === page ? ' active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}

        {end < totalPages && <span className="adm-pag-ellipsis">…</span>}

        <button
          className="adm-pag-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          title="Next"
        >
          ›
        </button>
        <button
          className="adm-pag-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Pajina ikus"
        >
          »
        </button>
      </div>

      <div className="adm-pagination-perpage">
        <select
          value={perPage}
          onChange={(e) => {
            onPerPageChange(Number(e.target.value))
            onPageChange(1)
          }}
        >
          {pageSizeOptions.map((s) => (
            <option key={s} value={s}>
              {s} / Pajina
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
