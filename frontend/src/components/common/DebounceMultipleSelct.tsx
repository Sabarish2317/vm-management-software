import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Search } from 'lucide-react'

export interface DropdownSearchOption {
  label: string
  id: number | string
}

interface DebounceMultipleSearchProps {
  title?: string
  selected?: DropdownSearchOption | DropdownSearchOption[]
  value?: DropdownSearchOption | DropdownSearchOption[]
  onChange: (option: DropdownSearchOption | DropdownSearchOption[]) => void
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
  multiple?: boolean
  enableMultiple?: boolean // New prop to enable multiple selection
}

const DebounceMultipleSearch: React.FC<DebounceMultipleSearchProps> = ({
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
  multiple = false,
  enableMultiple = false, // Default to false (single selection)
}) => {
  // Determine if multiple selection is enabled (either prop can activate it)
  const isMultipleMode = multiple || enableMultiple

  // Handle both single and multiple selection
  const selectedOptions = isMultipleMode
    ? Array.isArray(selected)
      ? selected
      : Array.isArray(value)
        ? value
        : []
    : (selected ?? value ?? { id: '', label: '' })

  const [isOpen, setIsOpen] = useState(false)
  const [shake, setShake] = useState(false)
  const [wasSubmitted, setWasSubmitted] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState<number>(-1)
  const [query, setQuery] = useState<string>('')
  const [options, setOptions] = useState<DropdownSearchOption[]>([])
  const [loading, setLoading] = useState(false)
  const [fullLoading, setFullLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [fullOptions, setFullOptions] = useState<DropdownSearchOption[]>([])

  // Preload all options once
  useEffect(() => {
    let alive = true
    const loadAll = async () => {
      try {
        setFullLoading(true)
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
        if (alive) setFullLoading(false)
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

  // close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
        setHighlightIndex(-1)
        setQuery('')
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
  }, [selectedOptions, required, title])

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
  useEffect(() => {
    if (!isOpen) return

    if (query.trim() === '') {
      setOptions(limit ? fullOptions.slice(0, limit) : fullOptions)
      setLoading(false)
      return
    }

    setLoading(true)

    const handler = setTimeout(() => {
      const filtered = filterAndSortOptions(query)
      setOptions(limit ? filtered.slice(0, limit) : filtered)
      setLoading(false)
    }, delay)

    return () => clearTimeout(handler)
  }, [query, delay, isOpen, fullOptions, limit])

  const handleSelect = (option: DropdownSearchOption) => {
    if (isMultipleMode) {
      const currentSelected = Array.isArray(selectedOptions)
        ? selectedOptions
        : []
      const isAlreadySelected = currentSelected.some(
        (item) => item.id === option.id
      )

      let newSelected: DropdownSearchOption[]
      if (isAlreadySelected) {
        newSelected = currentSelected.filter((item) => item.id !== option.id)
      } else {
        newSelected = [...currentSelected, option]
      }
      onChange(newSelected)
    } else {
      onChange(option)
      setIsOpen(false)
      inputRef.current?.blur() // 👈 force blur to close dropdown
    }

    setQuery('')
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

  const isInvalid = () => {
    if (!required) return false

    if (isMultipleMode) {
      return Array.isArray(selectedOptions)
        ? selectedOptions.length === 0 && wasSubmitted
        : wasSubmitted
    } else {
      const singleOption = selectedOptions as DropdownSearchOption
      return (
        (singleOption.id === 0 ||
          singleOption.id === '' ||
          singleOption.id == null) &&
        wasSubmitted
      )
    }
  }

  const getHiddenInputValue = () => {
    if (isMultipleMode) {
      return Array.isArray(selectedOptions)
        ? selectedOptions.map((item) => item.id).join(',')
        : ''
    } else {
      const singleOption = selectedOptions as DropdownSearchOption
      return singleOption.id ?? ''
    }
  }

  const isOptionSelected = (option: DropdownSearchOption) => {
    if (isMultipleMode) {
      return Array.isArray(selectedOptions)
        ? selectedOptions.some((item) => item.id === option.id)
        : false
    } else {
      const singleOption = selectedOptions as DropdownSearchOption
      return singleOption.id === option.id
    }
  }

  const getDisplayValue = () => {
    if (isMultipleMode) {
      return Array.isArray(selectedOptions) && selectedOptions.length > 0
        ? `${selectedOptions.length} selected`
        : placeholder
    } else {
      const singleOption = selectedOptions as DropdownSearchOption
      return singleOption?.label || placeholder
    }
  }

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
      setQuery('')
    }
  }

  return (
    <div
      className={`relative ${className} ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      ref={dropdownRef}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {title && (
        <h3 className="mb-1.5 w-full text-xs font-semibold text-slate-700">
          {title}
          {required && <span className="text-red-500">*</span>}
          {/* {isMultipleMode && <span className="ml-1 text-xs text-slate-500">(Multiple)</span>} */}
        </h3>
      )}
      {/* hidden input for native form validation */}
      <input
        id={`dropdown-hidden-${title}2`}
        key={`dropdown-hidden-${title}-key2`}
        name="employee"
        type="hidden"
        required={required}
        value={getHiddenInputValue()}
        onChange={() => {}}
        disabled={disabled}
      />

      {/* Selected items display for multiple selection */}

      <motion.div
        onClick={() => {
          if (!disabled) {
            setIsOpen(true)
            setLoading(true)
          }
        }}
        animate={shake ? { x: [-5, 5, -5, 5, 0] } : {}}
        transition={{ duration: 0.4 }}
        className={`input-container flex cursor-text items-center rounded-xl border-2 bg-white px-3 py-3 transition-all ${
          isInvalid()
            ? 'border-red-500'
            : isOpen
              ? 'border-slate-500'
              : 'border-slate-300'
        }`}
      >
        <input
          type="text"
          value={query}
          disabled={disabled}
          onFocus={() => {
            setIsOpen(true)
            setLoading(true)
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          placeholder={getDisplayValue()}
          className="w-full bg-transparent text-sm font-medium text-slate-600 outline-none placeholder:text-slate-400"
        />
        <Search color="#9CA3AF" size={21} />
      </motion.div>
      {/*   
            {isMultipleMode && Array.isArray(selectedOptions) && selectedOptions.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {selectedOptions.map((item) => (
            <div
              key={item.id}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800"
            >
              <span>{item.label}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeSelectedItem(item)
                }}
                className="hover:bg-blue-200 rounded-full p-0.5 hover:text-blue-900"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}     */}

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
                    : isOptionSelected(option)
                      ? 'font-medium text-blue-600'
                      : 'font-medium text-slate-700'
                }`}
              >
                <span className="text-sm">{option.label}</span>
                {
                  <div className="flex items-center">
                    {isOptionSelected(option) ? (
                      <Check size={16} color="#2563EB" />
                    ) : (
                      <div className="square h-4 w-4 rounded-sm border-2 border-slate-300 bg-white text-black"></div>
                    )}
                  </div>
                }
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-slate-500">
              No results found for "{query}"
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

export default DebounceMultipleSearch
