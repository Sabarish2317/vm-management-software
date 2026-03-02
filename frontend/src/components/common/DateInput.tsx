import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  useCallback,
} from 'react'
import ReactDOM from 'react-dom'

import { motion, AnimatePresence } from 'framer-motion'

interface DateInputProps {
  title?: string
  value: string
  direction?: 'bottom' | 'top' | 'left' | 'right'
  onChange: (val: string) => void
  name?: string
  onError?: () => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  maxDate?: string
  minDate?: string
  disabledDates?: string[] // 'YYYY-MM-DD' strings expected
  className?: string // NEW: applies to inner input/display wrapper (not portal)
  isError?: boolean // NEW: show red outline + scroll into view when true
}

// Parse various date inputs into a local Date at midnight (local timezone).
const parseDateString = (input?: string | Date | null): Date => {
  if (!input) return new Date(NaN)

  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate())
  }

  const s = String(input)
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10)
    const m = parseInt(isoMatch[2], 10) - 1
    const d = parseInt(isoMatch[3], 10)
    return new Date(y, m, d)
  }

  // fallback to Date parse then normalize
  const parsed = new Date(s)
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  }

  return new Date(NaN)
}

// Format a Date -> 'YYYY-MM-DD' (local date)
const formatDateToInput = (date: Date) => {
  if (!date || isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Friendly display format (uses local Date)
const formatDisplayLocal = (date: Date) => {
  if (!date || isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export const DateInput: React.FC<DateInputProps> = ({
  title,
  value,
  onChange,
  name = '',
  placeholder = 'Select date',
  required = false,
  direction = 'bottom',
  disabled = false,
  maxDate,
  minDate,
  onError = () => {},
  disabledDates = [],
  className = '', // NEW
  isError = false, // NEW
}) => {
  const todayLocal = new Date()
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState<number>(
    todayLocal.getMonth()
  )
  const [currentYear, setCurrentYear] = useState<number>(
    todayLocal.getFullYear()
  )
  const [showYearPicker, setShowYearPicker] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const yearGridRef = useRef<HTMLDivElement>(null)

  // portal refs & style
  const portalRef = useRef<HTMLDivElement | null>(null)
  const [portalStyle, setPortalStyle] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)

  // Robust update for portal position with viewport clamping
  const updatePortalPosition = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const scrollX = window.scrollX || window.pageXOffset
    const scrollY = window.scrollY || window.pageYOffset

    // base width: at least the trigger width, but not absurdly large
    const baseWidth = Math.max(rect.width, 280)
    const maxAvailable = Math.max(window.innerWidth - 16, 200)
    const portalWidth = Math.min(baseWidth, maxAvailable)

    // estimate portal height (if we have ref we can use it)
    const portalHeightEstimate =
      portalRef.current?.getBoundingClientRect().height ?? 360

    let top = rect.bottom + scrollY
    let left = rect.left + scrollX

    if (direction === 'top') {
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

    // clamp to viewport (add 8px margin)
    const minLeft = scrollX + 8
    const maxLeft = scrollX + window.innerWidth - portalWidth - 8
    left = Math.min(Math.max(left, minLeft), Math.max(minLeft, maxLeft))

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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setShowYearPicker(false)
      }
    }

    // use capture for scroll for ancestor scrolls
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen, updatePortalPosition])

  // Normalize disabledDates to 'YYYY-MM-DD' local strings
  const normalizedDisabledDates = useMemo(() => {
    return (disabledDates || [])
      .map((d) => {
        const pd = parseDateString(d)
        return isNaN(pd.getTime()) ? null : formatDateToInput(pd)
      })
      .filter(Boolean) as string[]
  }, [disabledDates])

  // Parse minDate once
  const minDateObj = useMemo(() => {
    if (!minDate) return null
    const md = parseDateString(minDate)
    return isNaN(md.getTime()) ? null : md
  }, [minDate])

  // Parse maxDate once
  const maxDateObj = useMemo(() => {
    if (!maxDate) return null
    const md = parseDateString(maxDate)
    return isNaN(md.getTime()) ? null : md
  }, [maxDate])

  // When value changes (or mounts), set displayed month/year based on selected value (local)
  useEffect(() => {
    if (!value) return
    const parsed = parseDateString(value)
    if (!isNaN(parsed.getTime())) {
      setCurrentMonth(parsed.getMonth())
      setCurrentYear(parsed.getFullYear())
    }
  }, [value])

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        portalRef.current &&
        !portalRef.current.contains(target)
      ) {
        setIsOpen(false)
        setShowYearPicker(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }
  }, [isOpen])

  // Scroll to selected year when year picker opens
  useEffect(() => {
    if (showYearPicker && yearGridRef.current) {
      const selectedButton = yearGridRef.current.querySelector(
        `[data-year="${currentYear}"]`
      )
      if (selectedButton) {
        ;(selectedButton as HTMLElement).scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }
    }
  }, [showYearPicker, currentYear])

  // If isError becomes true, bring the component into view (and optionally open)
  useEffect(() => {
    if (isError) {
      // scroll into view and also briefly flash (visual) via border (handled by classes)
      scrollToView('smooth')
      onError()
      // Optionally open the calendar when there's an error to help user fix it:
      // setIsOpen(true)
    }
  }, [isError, scrollToView])

  const formatDisplayValue = () => {
    if (!value) return placeholder
    const parsed = parseDateString(value)
    if (isNaN(parsed.getTime())) return placeholder
    return formatDisplayLocal(parsed)
  }

  const isDateDisabled = (date: Date) => {
    if (!date || isNaN(date.getTime())) return true

    // minDate check (local)
    if (minDateObj && date < minDateObj) return true

    // maxDate check (local)
    if (maxDateObj && date > maxDateObj) return true

    // disabledDates check (normalized)
    const ds = formatDateToInput(date)
    if (normalizedDisabledDates.includes(ds)) return true

    return false
  }

  const isSelectedDate = (date: Date) => {
    if (!value) return false
    const selected = parseDateString(value)
    if (isNaN(selected.getTime())) return false
    return (
      date.getFullYear() === selected.getFullYear() &&
      date.getMonth() === selected.getMonth() &&
      date.getDate() === selected.getDate()
    )
  }

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return
    const dateString = formatDateToInput(date) // local YYYY-MM-DD
    onChange(dateString)
    setIsOpen(false)
    setShowYearPicker(false)
    // reflect selection in calendar
    setCurrentMonth(date.getMonth())
    setCurrentYear(date.getFullYear())
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  const handleYearClick = (year: number) => {
    setCurrentYear(year)
    setShowYearPicker(false)
  }

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay()
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear)
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
    const days: React.ReactNode[] = []
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8" />)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day) // local midnight
      const isSelected = isSelectedDate(date)
      const disabled = isDateDisabled(date)

      days.push(
        <motion.button
          key={day}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleDateClick(date)
          }}
          disabled={disabled}
          whileHover={!disabled ? { scale: 1.05 } : {}}
          whileTap={!disabled ? { scale: 0.95 } : {}}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={`relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-sm font-medium transition-all duration-150 ${
            isSelected && disabled
              ? 'bg-red-500 text-white hover:bg-red-100 active:bg-red-200'
              : isSelected
                ? 'bg-blue-500 text-white shadow-lg'
                : disabled
                  ? 'cursor-not-allowed text-gray-400 opacity-50'
                  : 'text-slate-700 hover:bg-slate-100 active:bg-slate-200'
          }`}
        >
          {day}
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 transform rounded-full bg-white"
            />
          )}
        </motion.button>
      )
    }

    return (
      <>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F1F1F1] p-4">
          <motion.button
            type="button"
            onClick={handlePrevMonth}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="cursor-pointer rounded-lg p-2 transition-colors duration-150 hover:bg-slate-100 active:bg-slate-200"
          >
            <svg
              className="h-4 w-4 text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </motion.button>

          <motion.button
            type="button"
            onClick={() => setShowYearPicker(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="cursor-pointer rounded-lg px-3 py-1 text-lg font-bold text-slate-700 transition-colors duration-150 hover:bg-slate-100"
          >
            {monthNames[currentMonth]} {currentYear}
          </motion.button>

          <motion.button
            type="button"
            onClick={handleNextMonth}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="cursor-pointer rounded-lg p-2 transition-colors duration-150 hover:bg-slate-100 active:bg-slate-200"
          >
            <svg
              className="h-4 w-4 text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </motion.button>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          <div className="mb-2 grid grid-cols-7 gap-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div
                key={d}
                className="flex h-8 w-8 items-center justify-center text-xs font-medium text-slate-500"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">{days}</div>
        </div>

        {/* Actions */}
        {/* <div className="flex gap-2 border-t border-[#F1F1F1] p-4">
          <motion.button
            type="button"
            onClick={() => {
              setIsOpen(false)
              setShowYearPicker(false)
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex-1 cursor-pointer rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-200"
          >
            Cancel
          </motion.button>
          <motion.button
            type="button"
            onClick={() => setIsOpen(false)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex-1 cursor-pointer rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-lg transition-colors duration-150 hover:bg-blue-600 hover:shadow-xl"
          >
            Done
          </motion.button>
        </div> */}
      </>
    )
  }

  const renderYearPicker = () => {
    const today = new Date()
    const selectedYear = currentYear
    const rangeSize = 20 // show selectedYear +/- 10 (total 21)
    let startYear = selectedYear - 10
    let endYear = selectedYear + 10

    const minAllowedYear = today.getFullYear() - 70
    const maxAllowedYear = today.getFullYear() + 5

    if (startYear < minAllowedYear) {
      startYear = minAllowedYear
      endYear = Math.min(startYear + rangeSize, maxAllowedYear)
    }

    if (endYear > maxAllowedYear) {
      endYear = maxAllowedYear
      startYear = Math.max(endYear - rangeSize, minAllowedYear)
    }

    // Respect maxDate if provided
    if (minDateObj) {
      startYear = Math.max(startYear, minDateObj.getFullYear())
      if (endYear < startYear) endYear = startYear
    }

    if (maxDateObj) {
      endYear = Math.min(endYear, maxDateObj.getFullYear())
      if (startYear > endYear) startYear = endYear
    }

    const years = []
    for (let y = startYear; y <= endYear; y++) {
      const isCurrentYear = y === currentYear
      const isYearDisabled = !!(
        (maxDateObj && y > maxDateObj.getFullYear()) ||
        (minDateObj && y < minDateObj.getFullYear())
      )

      years.push(
        <motion.button
          key={y}
          type="button"
          data-year={y}
          onClick={() => !isYearDisabled && handleYearClick(y)}
          disabled={isYearDisabled}
          whileHover={!isYearDisabled ? { scale: 1.05 } : {}}
          whileTap={!isYearDisabled ? { scale: 0.95 } : {}}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={`flex h-10 w-16 cursor-pointer items-center justify-center rounded-lg text-sm font-medium transition-all duration-150 ${
            isCurrentYear
              ? 'bg-blue-500 text-white shadow-lg'
              : isYearDisabled
                ? 'cursor-not-allowed text-slate-300 opacity-50'
                : 'text-slate-700 hover:bg-slate-100 active:bg-slate-200'
          }`}
        >
          {y}
        </motion.button>
      )
    }

    return (
      <>
        <div className="flex items-center justify-between border-b border-[#F1F1F1] p-4">
          <motion.button
            type="button"
            onClick={() => setShowYearPicker(false)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="cursor-pointer rounded-lg p-2 transition-colors duration-150 hover:bg-slate-100 active:bg-slate-200"
          >
            <svg
              className="h-4 w-4 text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </motion.button>

          <h3 className="text-lg font-bold text-slate-700">Select Year</h3>

          <div className="w-8" />
        </div>

        <div className="max-h-64 overflow-y-auto p-4" ref={yearGridRef}>
          <div className="grid grid-cols-4 gap-2">{years}</div>
        </div>

        <div className="flex gap-2 border-t border-[#F1F1F1] p-4">
          <motion.button
            type="button"
            onClick={() => setShowYearPicker(false)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="flex-1 cursor-pointer rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-200"
          >
            Cancel
          </motion.button>
        </div>
      </>
    )
  }

  return (
    <div
      className="relative self-stretch"
      ref={containerRef}
      // keep this wrapper small by default; the inner className controls width/scale
    >
      {
        <h3
          className={`mb-0.5 w-full justify-start text-xs leading-loose font-semibold text-slate-700 ${disabled ? 'opacity-65' : ''}`}
        >
          {title} {required && <span className="text-red-500">*</span>}
        </h3>
      }

      {/* INNER WRAPPER: this gets user-provided className so you can scale / size it */}
      <div className={`${className} min-w-[180px]`}>
        <div
          className={`input-container group flex cursor-pointer flex-row items-center justify-between gap-2 overflow-clip rounded-xl border-2 bg-white shadow-sm transition-all ${
            !disabled && 'focus-within:border-slate-500'
          } ${
            isError
              ? 'border-red-500 ring-1 ring-red-200'
              : isOpen
                ? 'border-slate-500'
                : 'border-[#F1F1F1]'
          } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            if (!disabled) setIsOpen((o) => !o)
          }}
          aria-invalid={isError}
          role="button"
        >
          <div className="min-h-max w-full cursor-pointer px-3 py-3 text-start text-sm font-medium text-slate-600">
            {formatDisplayValue()}
          </div>
          <div className="cursor-pointer pr-3">
            <motion.svg
              className={`h-4 w-4 text-slate-400 transition-transform duration-200`}
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </motion.svg>
          </div>
        </div>
      </div>

      {ReactDOM.createPortal(
        <AnimatePresence>
          {isOpen && portalStyle && (
            <motion.div
              onClick={(e) => e.stopPropagation()}
              ref={portalRef}
              style={{
                position: 'absolute',
                top: portalStyle.top,
                left: portalStyle.left,
                width:
                  direction === 'left' || direction === 'right'
                    ? 'auto'
                    : portalStyle.width,
                minWidth: 280,
                zIndex: 9999,
              }}
              className="mt-1 overflow-hidden rounded-xl border-2 border-[#F1F1F1] bg-white shadow-2xl"
            >
              {showYearPicker ? renderYearPicker() : renderCalendar()}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <input
        type="hidden"
        onClick={(e) => e.stopPropagation()}
        name={name}
        value={value}
        required={required}
      />
    </div>
  )
}

export default DateInput
