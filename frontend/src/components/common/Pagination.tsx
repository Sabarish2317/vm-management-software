import React from 'react'

interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const getPageNumbers = () => {
    const pages: (number | string)[] = []

    if (totalPages <= 5) {
      // Show all pages if <= 5
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first
      pages.push(1)

      // Ellipsis before current range
      if (currentPage > 3) {
        pages.push('...')
      }

      // Show current ±1 (middle range)
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        pages.push(i)
      }

      // Ellipsis after current range
      if (currentPage < totalPages - 2) {
        pages.push('...')
      }

      // Always show last
      pages.push(totalPages)
    }

    return pages
  }

  const pages = getPageNumbers()

  return (
    <div className="flex items-center gap-2">
      {/* Prev button */}
      <button
        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        disabled={currentPage === 1}
        className={`cursor-pointer rounded px-2 py-1 text-sm font-medium transition ${
          currentPage === 1
            ? 'cursor-not-allowed text-gray-400'
            : 'text-slate-800 hover:bg-gray-200'
        }`}
      >
        <img
          className="h-5 w-5 rotate-90"
          src="/icons/arrow-icon.svg"
          alt="Prev"
        />
      </button>

      {/* Page buttons */}
      {pages.map((p, idx) =>
        p === '...' ? (
          <span
            key={`ellipsis-${idx}`}
            className="px-2 text-sm font-semibold text-gray-500"
          >
            ...
          </span>
        ) : (
          <button
            key={`page-${p}`}
            onClick={() => onPageChange(p as number)}
            className={`h-8 w-8 cursor-pointer rounded text-sm font-semibold transition ${
              currentPage === p
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 shadow-sm hover:bg-gray-200'
            }`}
          >
            {p}
          </button>
        )
      )}

      {/* Next button */}
      <button
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        disabled={currentPage === totalPages}
        className={`cursor-pointer rounded px-2 py-1 text-sm font-medium transition ${
          currentPage === totalPages
            ? 'cursor-not-allowed text-gray-400'
            : 'text-slate-800 hover:bg-gray-200'
        }`}
      >
        <img className="h-5 w-5" src="/icons/arrow-icon-2.svg" alt="Next" />
      </button>
    </div>
  )
}

export default PaginationControls
