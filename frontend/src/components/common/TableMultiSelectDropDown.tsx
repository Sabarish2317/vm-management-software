import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'

import type { DropdownOption } from './DropDown'
import { CheckBox } from './Input'

interface TableMultiSelectDropDownProps {
  title?: string
  options: DropdownOption[]
  selectedValues: string[]
  placeholder?: string
  isEditMode?: boolean
  disabled?: boolean
  required?: boolean
  className?: string
  dropdownClassName?: string
  onChange: (values: string[]) => void
}

/**
 * Multi-select dropdown tailored for inline table usage. Supports keyboard-less
 * toggling while respecting the same interaction contract as TableDropDown.
 */
const TableMultiSelectDropDown: React.FC<TableMultiSelectDropDownProps> = ({
  title,
  options,
  selectedValues,
  placeholder = 'Select options',
  isEditMode = false,
  disabled = false,
  required = false,
  className = '',
  dropdownClassName = '',
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInteractive = isEditMode && !disabled
  const selectedSet = useMemo(
    () => new Set(selectedValues.map((value) => String(value))),
    [selectedValues]
  )
  const labelMap = useMemo(() => {
    const map = new Map<string, string>()
    options.forEach((option) => map.set(String(option.id), option.label))
    return map
  }, [options])

  useEffect(() => {
    if (!isOpen || !isInteractive) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, isInteractive])

  useEffect(() => {
    if (!isInteractive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(false)
    }
  }, [isInteractive])

  const handleToggleValue = (value: string) => {
    const next = new Set(selectedSet)
    if (next.has(value)) {
      next.delete(value)
    } else {
      next.add(value)
    }
    onChange(Array.from(next))
  }

  const handleClearAll = () => {
    onChange([])
    setIsOpen(false)
  }

  const resolvedLabels = selectedValues
    .map((value) => labelMap.get(String(value)) ?? String(value))
    .filter((label) => label.length > 0)

  const displayLabel = resolvedLabels.length
    ? resolvedLabels.join(', ')
    : placeholder

  return (
    <motion.div
      initial={{ y: -8 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
      ref={containerRef}
      className={`relative w-full min-w-24 ${className}`}
    >
      {title && (
        <h3 className="mb-0.5 text-xs font-semibold text-slate-600">
          {title}
          {required && <span className="text-red-500"> *</span>}
        </h3>
      )}

      <input
        id={`table-multiselect-${title ?? 'field'}`}
        type="text"
        className="hidden"
        required={required}
        value={selectedValues.join(',')}
        onChange={() => {}}
      />

      <button
        type="button"
        disabled={!isInteractive}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between bg-transparent py-2 text-left text-sm font-medium transition-colors ${
          isInteractive
            ? 'cursor-pointer border-b border-gray-300 bg-white px-2 text-[#1F1F21] hover:border-gray-400 focus:border-orange-500'
            : 'cursor-default border-transparent bg-transparent text-[#1F1F21]'
        }`}
      >
        <span className={selectedValues.length === 0 ? 'text-slate-400' : ''}>
          {displayLabel}
        </span>
        {isEditMode && (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {isInteractive && isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className={`absolute left-0 z-50 mt-3 flex max-h-52 w-full flex-col overflow-hidden rounded-sm border border-zinc-100 bg-white text-sm ${dropdownClassName}`}
        >
          <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2 text-xs font-semibold text-slate-500">
            <span>{selectedValues.length} selected</span>
            <button
              type="button"
              className="text-orange-600 transition hover:text-orange-700"
              onClick={handleClearAll}
            >
              Clear
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {options.length === 0 && (
              <p className="px-3 py-2 text-slate-400">No roles available</p>
            )}
            {options.map((option) => {
              const optionId = String(option.id)
              const isActive = selectedSet.has(optionId)
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center justify-between px-3 py-2 text-left transition-colors ${
                    isActive
                      ? 'bg-orange-500/5 text-orange-700'
                      : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <span>{option.label}</span>

                  <CheckBox
                    className="ml-3 origin-left scale-50"
                    checked={isActive}
                    onChange={() => handleToggleValue(optionId)}
                  />
                </label>
              )
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

export default TableMultiSelectDropDown
