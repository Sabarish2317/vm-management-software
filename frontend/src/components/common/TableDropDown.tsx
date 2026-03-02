import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'

import type { DropdownOption } from './DropDown'

interface TableDropdownProps {
  title?: string
  options: DropdownOption[]
  selected?: DropdownOption | null
  placeholder?: string
  isEditMode?: boolean
  disabled?: boolean
  required?: boolean
  className?: string
  dropdownClassName?: string
  onChange: (option: DropdownOption) => void
}

/**
 * Lightweight dropdown built for inline table edits. Mirrors the larger dropdown
 * component's API but keeps rendering local to the cell and locks interactions
 * when the row is not in edit mode.
 */
const TableDropDown: React.FC<TableDropdownProps> = ({
  title,
  options,
  selected,
  placeholder = 'Select option',
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

  const displayOption = useMemo<DropdownOption>(() => {
    if (selected) return selected
    return { id: 0, label: '' }
  }, [selected])

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

  const handleSelect = (option: DropdownOption) => {
    onChange(option)
    setIsOpen(false)
  }

  const displayLabel =
    displayOption.id === 0 && displayOption.label.length === 0
      ? placeholder
      : displayOption.label

  return (
    <motion.div
      initial={{ y: -8 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
      ref={containerRef}
      className={`relative w-full min-w-20 ${className}`}
    >
      {title && (
        <h3 className="mb-0.5 text-xs font-semibold text-slate-600">
          {title}
          {required && <span className="text-red-500"> *</span>}
        </h3>
      )}

      <input
        id={`table-dropdown-${title ?? 'field'}`}
        type="text"
        className="hidden"
        required={required}
        value={displayOption.id === 0 ? '' : displayOption.id}
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
        <span className={displayOption.id === 0 ? 'text-slate-400' : ''}>
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
        <motion.ul
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className={`absolute left-0 z-50 mt-3 max-h-48 w-full overflow-y-auto rounded-sm border border-zinc-100 bg-white text-sm ${dropdownClassName}`}
        >
          {options.length === 0 && (
            <li className="px-3 py-2 text-slate-500">No options available</li>
          )}
          {options.map((option) => {
            const isActive = option.id === displayOption.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option)}
                className={`flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left transition-colors ${
                  isActive
                    ? 'bg-orange-500/5 text-orange-700'
                    : 'text-zinc-500 hover:bg-zinc-50'
                }`}
              >
                <span>{option.label}</span>
                {isActive && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            )
          })}
        </motion.ul>
      )}
    </motion.div>
  )
}

export default TableDropDown
