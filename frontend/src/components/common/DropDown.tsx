import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from 'react'
import { motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import Spinner from './Spinner'

export interface DropdownOption {
  label: string
  id: number
}

interface DropdownSelectProps {
  title?: string
  options: DropdownOption[]
  selected: DropdownOption
  placeholder?: string
  defaultOptions?: DropdownOption[]
  onChange: (option: DropdownOption) => void
  required?: boolean
  disabled?: boolean
  isLoading?: boolean
  // class for the main container's parent this is mainly for changing relatice and postion
  className?: string
  direction?: 'down' | 'up' | 'left' | 'right'
  allowClear?: boolean
  // class for the main dropdown container mainly for styling
  MainclassName?: string
  //class of the dropdown list opening
  dropDownClassName?: string
}

const DropdownSelect: React.FC<DropdownSelectProps> = ({
  disabled = false,
  title,
  options,
  selected,
  placeholder = 'Select Option',
  defaultOptions,
  onChange,
  required = false,
  className = '',
  direction = 'down',
  allowClear = false,
  MainclassName = '',
  dropDownClassName = '',
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [shake, setShake] = useState(false)
  const [wasSubmitted, setWasSubmitted] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState<number>(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  // portal refs & style
  const portalRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [portalStyle, setPortalStyle] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)

  const _placeholder = title ? `Select ${title || 'Option'}` : placeholder

  // Robust update for portal position with viewport clamping
  const updatePortalPosition = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const scrollX = window.scrollX || window.pageXOffset
    const scrollY = window.scrollY || window.pageYOffset

    // Use the exact width of the parent container for proper alignment
    const portalWidth = rect.width

    // estimate portal height (if we have ref we can use it)
    const portalHeightEstimate =
      portalRef.current?.getBoundingClientRect().height ?? 250

    let top = rect.bottom + scrollY
    let left = rect.left + scrollX

    if (direction === 'up') {
      top = rect.top + scrollY - portalHeightEstimate
    }
    if (direction === 'left') {
      left = rect.left + scrollX - portalWidth
      top = rect.top + scrollY
    }
    if (direction === 'right') {
      left = rect.right + scrollX
      top = rect.top + scrollY
    }

    // clamp to viewport (add 8px margin) while maintaining alignment with parent
    const minLeft = scrollX + 8
    const maxLeft = scrollX + window.innerWidth - portalWidth - 8
    // Only clamp if dropdown would go outside viewport
    if (
      left < minLeft ||
      left + portalWidth > scrollX + window.innerWidth - 8
    ) {
      left = Math.min(Math.max(left, minLeft), Math.max(minLeft, maxLeft))
    }

    const minTop = scrollY + 8
    const maxTop = scrollY + window.innerHeight - portalHeightEstimate - 8
    top = Math.min(Math.max(top, minTop), Math.max(minTop, maxTop))

    // Use requestAnimationFrame for smoother layout updates
    requestAnimationFrame(() => {
      setPortalStyle({ top, left, width: portalWidth })
    })
  }, [direction])

  // improved scrollIntoView that works even inside scrollable containers
  const scrollToView = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      const el = containerRef.current
      if (!el) return

      try {
        // Prefer element scrollIntoView with center block
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        })
        // After scrolling, ensure portal positioning updated
        setTimeout(() => updatePortalPosition(), 200)
        return
      } catch {
        // fallback to window scroll calculation
      }

      const rect = el.getBoundingClientRect()
      const viewHeight =
        window.innerHeight || document.documentElement.clientHeight
      // If element is fully visible, do nothing
      if (rect.top >= 0 && rect.bottom <= viewHeight) {
        // still update portal position
        updatePortalPosition()
        return
      }

      // center it in viewport
      const scrollY =
        window.scrollY + rect.top - viewHeight / 2 + rect.height / 2
      window.scrollTo({ top: Math.max(0, scrollY), behavior })
      setTimeout(() => updatePortalPosition(), 200)
    },
    [updatePortalPosition]
  )

  useLayoutEffect(() => {
    if (isOpen) {
      // ensure trigger is visible when opening
      scrollToView('auto') // instant so layout is ready; updatePortalPosition invoked after
      // update portal bounds immediately after layout
      setTimeout(() => updatePortalPosition(), 40)
    }
    // no cleanup needed
  }, [isOpen, scrollToView, updatePortalPosition])

  // when isOpen, rebind scroll/resize handlers to keep portal positioned
  useEffect(() => {
    if (!isOpen) return
    const onScroll = () => updatePortalPosition()
    const onResize = () => updatePortalPosition()
    const onKeyEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    // use capture for scroll for ancestor scrolls
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', onKeyEscape)

    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKeyEscape)
    }
  }, [isOpen, updatePortalPosition])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        portalRef.current &&
        !portalRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setHighlightIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const inputId = `dropdown-hidden-${title}`
    const input = document.getElementById(inputId)

    const handleInvalid = (event: Event) => {
      event.preventDefault()
      setWasSubmitted(true)
      setShake(true)
      setTimeout(() => setShake(false), 400)
    }

    input?.addEventListener('invalid', handleInvalid)
    return () => {
      input?.removeEventListener('invalid', handleInvalid)
    }
  }, [selected.id, required, title])

  useEffect(() => {
    if (highlightIndex >= 0 && optionRefs.current[highlightIndex]) {
      optionRefs.current[highlightIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [highlightIndex])

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen((prev) => !prev)
      setHighlightIndex(-1)
    }
  }

  const handleSelect = (option: DropdownOption) => {
    onChange(option)
    setIsOpen(false)
    setWasSubmitted(false)
    setHighlightIndex(-1)
  }

  const isInvalid = required && selected.id === 0 && wasSubmitted

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
      setHighlightIndex((prev) => (prev + 1) % options.length)
      e.preventDefault()
    } else if (e.key === 'ArrowUp') {
      setHighlightIndex((prev) => (prev === 0 ? options.length - 1 : prev - 1))
      e.preventDefault()
    } else if (e.key === 'Enter') {
      if (highlightIndex >= 0) {
        handleSelect(options[highlightIndex])
      }
      e.preventDefault()
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setHighlightIndex(-1)
    }
  }

  return (
    <motion.div
      initial={{ y: -10 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className={`relative ${className}`}
      ref={(el) => {
        dropdownRef.current = el
        containerRef.current = el
      }}
      style={{
        opacity: disabled ? 0.7 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {title && (
        <h3 className="mb-0.5 w-full justify-start text-xs leading-loose font-semibold text-slate-700">
          {title}
          {required && <span className="text-red-500">*</span>}
        </h3>
      )}

      <input
        id={`dropdown-hidden-${title}`}
        type="text"
        required={required}
        value={selected.id === 0 ? '' : selected.id}
        onChange={() => {}}
        disabled={disabled}
        className="hidden"
        tabIndex={-1}
      />

      <motion.div
        onClick={toggleDropdown}
        animate={shake ? { x: [-5, 5, -5, 5, 0] } : {}}
        transition={{ duration: 0.4 }}
        className={`input-container flex cursor-pointer flex-row items-center justify-between rounded-xl border-2 bg-white px-3 py-3 shadow-sm transition-all ${
          isInvalid
            ? 'border-red-500'
            : isOpen
              ? 'border-[#F1F1F1]'
              : 'border-[#F1F1F1]'
        } ${disabled ? 'pointer-events-none' : ''} ${MainclassName}`}
      >
        <span
          className={`text-sm font-medium ${
            selected.id === 0 ? 'text-slate-400' : 'text-[#1F1F21]'
          }`}
        >
          {selected.id === 0 ? _placeholder : selected.label}
        </span>
        <div className="flex items-center gap-2 pl-2">
          {isLoading && (
            <div className="text-blue-600">
              <Spinner size="sm" />
            </div>
          )}
          <img
            src="/icons/dropdown.svg"
            alt="Dropdown icon"
            className="h-4 w-4 select-none"
          />
        </div>
      </motion.div>

      {isOpen &&
        portalStyle &&
        createPortal(
          <div
            ref={portalRef}
            className={`scrollbar-visible custom-scrollbar z-[99999999999] mt-1 max-h-[250px] overflow-y-scroll rounded-xl border border-[#F1F1F1] bg-white text-sm shadow-lg ${dropDownClassName}`}
            style={{
              position: 'absolute',
              top: portalStyle.top,
              left: portalStyle.left,
              width: portalStyle.width,
              zIndex: 99999999999,
            }}
          >
            {/* ✅ Show clear option only if allowClear is true */}
            {allowClear && selected.id !== 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  handleSelect({ id: 0, label: _placeholder })
                }}
                className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-2 text-red-600 hover:bg-slate-100"
              >
                Clear
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
            {options.length > 0 ? (
              <>
                {options.map((option, idx) => (
                  <button
                    key={option.label}
                    ref={(el) => {
                      optionRefs.current[idx] = el
                    }}
                    onClick={() => handleSelect(option)}
                    className={`flex w-full cursor-pointer items-center justify-between px-4 py-3 hover:bg-slate-100 ${
                      highlightIndex === idx
                        ? 'bg-slate-100'
                        : selected.label === option.label
                          ? 'font-semibold text-orange-500'
                          : 'text-slate-700'
                    }`}
                  >
                    <span className="">{option.label}</span>
                    {selected.label === option.label && (
                      <img
                        src="/icons/tick-icon-dark.svg"
                        alt="Selected"
                        className="h-4 w-4"
                      />
                    )}
                  </button>
                ))}
              </>
            ) : (
              <>
                <button
                  className={`flex w-full cursor-pointer items-center justify-between bg-slate-50 px-4 py-3 hover:bg-slate-100`}
                >
                  <span className="font-semibold text-slate-500">
                    No {title?.split(' ').at(0)} found{' '}
                  </span>
                </button>
              </>
            )}
            {defaultOptions &&
              defaultOptions.map((option, idx) => (
                <button
                  key={option.label}
                  onClick={() => handleSelect(option)}
                  className={`flex w-full cursor-pointer items-center justify-between ${idx == 0 ? 'mt-2 border-t-2 border-[#F1F1F1]' : ''} px-4 py-3 hover:bg-slate-100 ${
                    selected.label === option.label
                      ? 'font-semibold text-blue-600'
                      : 'text-slate-700'
                  }`}
                >
                  <span className="">{option.label}</span>
                  {selected.label === option.label && (
                    <img
                      src="/icons/tick-icon-dark.svg"
                      alt="Selected"
                      className="h-4 w-4"
                    />
                  )}
                </button>
              ))}
          </div>,
          document.body
        )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #94a3b8;
          border-radius: 4px;
          border: 2px solid #f1f5f9;
        }
      `}</style>
    </motion.div>
  )
}

export default DropdownSelect
