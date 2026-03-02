import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, X } from 'lucide-react'

export interface DropdownSearchOption {
  label: string
  id: number | string
}

interface DebouncedSearchDropdownProps {
  title?: string
  selected?: DropdownSearchOption
  value?: DropdownSearchOption
  onChange: (option: DropdownSearchOption) => void
  fetchOptions: (
    query?: string
  ) => Promise<DropdownSearchOption[]> | DropdownSearchOption[]
  required?: boolean
  disabled?: boolean
  className?: string
  delay?: number
  isLoading?: boolean
  placeholder?: string
  direction?: 'down' | 'up' | 'left' | 'right'
  limit?: number
}

const DebouncedSearchDropdown: React.FC<DebouncedSearchDropdownProps> = ({
  title,
  selected,
  value,
  onChange,
  fetchOptions,
  required = false,
  disabled = false,
  className = '',
  delay = 400,
  limit = 5,
  isLoading: externalLoading = false,
  placeholder = 'Type to search...',
  direction = 'down',
}) => {
  const selectedOption = selected ?? value ?? { id: '', label: '' }

  const [isOpen, setIsOpen] = useState(false)
  const [shake, setShake] = useState(false)
  const [wasSubmitted, setWasSubmitted] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState<number>(-1)
  const [query, setQuery] = useState<string>(selectedOption.label ?? '')
  const [options, setOptions] = useState<DropdownSearchOption[]>([])
  const [loading, setLoading] = useState(false)
  const [fullLoading, setFullLoading] = useState(true) // NEW: loading for initial preload

  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [fullOptions, setFullOptions] = useState<DropdownSearchOption[]>([])

  // Preload all options once
  useEffect(() => {
    let alive = true
    const loadAll = async () => {
      try {
        setFullLoading(true) // NEW
        const maybe = fetchOptions('')
        const resolved =
          maybe && typeof (maybe as any).then === 'function'
            ? await (maybe as any)
            : (maybe as any)
        if (!alive) return
        setFullOptions(resolved || [])
      } catch {
        if (!alive) return
        setFullOptions([])
      } finally {
        if (alive) setFullLoading(false) // NEW
      }
    }
    loadAll()
    return () => {
      alive = false
    }
  }, [fetchOptions])

  const filterAndSortOptions = (qStr: string) => {
    if (!qStr) return fullOptions
    const q = qStr.toLowerCase()
    return [...fullOptions]
      .map((o) => {
        const label = o.label.toLowerCase()
        let score = 0
        if (label.startsWith(q)) score += 3
        if (label.includes(q)) score += 1
        return { ...o, _score: score }
      })
      .filter((o: any) => o._score > 0)
      .sort((a: any, b: any) => b._score - a._score)
  }

  // keep input in sync
  useEffect(() => {
    if ((selectedOption.label ?? '') !== query) {
      setQuery(selectedOption.label ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOption?.id, selectedOption?.label])

  // close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
        setHighlightIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // native validation shake
  useEffect(() => {
    const inputId = `dropdown-hidden-${title}`
    const input = document.getElementById(inputId)
    const onInvalid = (ev: Event) => {
      ev.preventDefault()
      setWasSubmitted(true)
      setShake(true)
      setTimeout(() => setShake(false), 400)
    }
    input?.addEventListener('invalid', onInvalid)
    return () => input?.removeEventListener('invalid', onInvalid)
  }, [selectedOption?.id, required, title])

  // scroll highlighted into view
  useEffect(() => {
    if (highlightIndex >= 0 && optionRefs.current[highlightIndex]) {
      optionRefs.current[highlightIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [highlightIndex])

  useEffect(() => {
    optionRefs.current = []
  }, [options])

  // Debounced client-side filter
  // Debounced client-side filter
  useEffect(() => {
    if (!isOpen) return

    if (query.trim() === '') {
      // if query is empty → show all preloaded options without debounce
      setOptions(limit ? fullOptions.slice(0, limit) : fullOptions)
      setLoading(false)
      return
    }

    setLoading(true) // NEW: only set loading if non-empty query

    const handler = setTimeout(() => {
      const filtered = filterAndSortOptions(query)
      setOptions(limit ? filtered.slice(0, limit) : filtered)
      setLoading(false)
    }, delay)

    return () => clearTimeout(handler)
  }, [query, delay, isOpen, fullOptions, limit])

  const handleSelect = (option: DropdownSearchOption) => {
    onChange(option)
    setQuery(option.label)
    setOptions([])
    setIsOpen(false)
    setHighlightIndex(-1)
    setWasSubmitted(false)
  }

  const getDirectionClass = () => {
    switch (direction) {
      case 'up':
        return 'bottom-full mb-2'
      case 'left':
        return 'right-full mr-2 top-0'
      case 'right':
        return 'left-full ml-2 top-0'
      case 'down':
      default:
        return 'top-full mt-2'
    }
  }

  const isInvalid =
    required &&
    (selectedOption.id === 0 ||
      selectedOption.id === '' ||
      selectedOption.id == null) &&
    wasSubmitted

  // keyboard nav
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true)
        setHighlightIndex(0)
        e.preventDefault()
      }
      return
    }

    if (e.key === 'ArrowDown') {
      setHighlightIndex((prev) =>
        options.length ? (prev + 1) % options.length : 0
      )
      e.preventDefault()
    } else if (e.key === 'ArrowUp') {
      setHighlightIndex((prev) =>
        options.length ? (prev <= 0 ? options.length - 1 : prev - 1) : 0
      )
      e.preventDefault()
    } else if (e.key === 'Enter') {
      if (highlightIndex >= 0 && options[highlightIndex]) {
        handleSelect(options[highlightIndex])
      } else if (options.length > 0) {
        handleSelect(options[0])
      }
      e.preventDefault()
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setHighlightIndex(-1)
    }
  }

  return (
    <div
      className={`relative ${className} mt-auto ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      ref={dropdownRef}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {title && (
        <h3 className="mt-auto mb-1.5 w-full text-xs font-semibold text-slate-700">
          {title}
          {required && <span className="text-red-500">*</span>}
        </h3>
      )}

      {/* hidden input for native form validation */}
      <input
        id={`dropdown-hidden-${title}`}
        type="hidden"
        required={required}
        value={selectedOption.id ?? ''}
        onChange={() => {}}
        disabled={disabled}
      />

      <motion.div
        onClick={() => {
          if (!disabled) {
            setIsOpen(true)
            setLoading(true) // NEW: show spinner immediately on first open
          }
        }}
        animate={shake ? { x: [-5, 5, -5, 5, 0] } : {}}
        transition={{ duration: 0.4 }}
        className={`input-container flex cursor-text flex-row items-center gap-2 rounded-xl border-2 bg-white px-3 py-3 transition-all ${
          isInvalid
            ? 'border-red-500'
            : isOpen
              ? 'border-slate-500'
              : 'border-slate-300'
        } `}
      >
        <Search color="#9CA3AF" size={18} />
        <input
          type="text"
          value={query}
          disabled={disabled}
          onFocus={() => {
            setIsOpen(true)
            setLoading(true) // NEW: also when focusing
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          placeholder={placeholder}
          className="w-full border-none bg-transparent text-sm font-medium text-slate-600"
        />
        <X
          onClick={() => {
            setQuery('')
            setIsOpen(true)
          }}
          className="cursor-pointer text-[#9CA3AF] hover:scale-3d hover:scale-[1.01] hover:text-[#61666f]"
          size={18}
        />
      </motion.div>

      {isOpen && (
        <div
          className={`scrollbar-visible absolute z-10 max-h-[200px] w-full overflow-y-auto rounded-xl border border-[#F1F1F1] bg-white shadow-lg ${getDirectionClass()} custom-scrollbar`}
        >
          {(loading || externalLoading || fullLoading) &&
          query.trim() !== '' ? (
            <div className="flex items-center gap-2 p-3 text-sm text-slate-500">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="h-4 w-4"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </motion.div>
              Searching for "{query}" in {title}...
            </div>
          ) : options.length > 0 ? (
            options.map((option, idx) => (
              <button
                key={`${option.id}-${idx}`}
                ref={(el) => {
                  optionRefs.current[idx] = el
                }}
                onClick={() => handleSelect(option)}
                type="button"
                className={`flex w-full cursor-pointer items-center justify-between px-4 py-3 hover:bg-slate-100 ${
                  highlightIndex === idx
                    ? 'bg-slate-100'
                    : selectedOption?.id === option.id
                      ? 'font-semibold text-blue-600'
                      : 'text-slate-700'
                }`}
              >
                <span className="text-sm">{option.label}</span>
                {selectedOption?.id === option.id && (
                  <img
                    src="/icons/tick-icon-dark.svg"
                    alt="Selected"
                    className="h-4 w-4"
                  />
                )}
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-slate-500">
              No results found
            </div>
          )}
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #94a3b8;
          border-radius: 4px;
          border: 2px solid #f1f5f9;
        }
      `}</style>
    </div>
  )
}

export default DebouncedSearchDropdown
