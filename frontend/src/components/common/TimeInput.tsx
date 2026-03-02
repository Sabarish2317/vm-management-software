import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from 'react'

interface TimeInputProps {
  title: string
  value: string
  onChange: (val: string) => void
  name?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  direction?: 'left' | 'right' | 'up' | 'down'
  className?: string
}

export const TimeInput: React.FC<TimeInputProps> = ({
  title,
  value,
  onChange,
  name = '',
  placeholder = 'Select time',
  required = false,
  disabled = false,
  direction = 'down',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [tempHour, setTempHour] = useState(0)
  const [tempMinute, setTempMinute] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // portal refs & style
  const portalRef = useRef<HTMLDivElement | null>(null)
  const [portalStyle, setPortalStyle] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)

  // Parse existing value when component mounts or value changes
  useEffect(() => {
    if (value) {
      const [hours, minutes] = value.split(':').map(Number)
      if (!isNaN(hours) && !isNaN(minutes)) {
        setTempHour(hours)
        setTempMinute(minutes)
      }
    }
  }, [value])

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

    if (direction === 'up') {
      top = rect.top + scrollY - portalHeightEstimate - 18
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

  // Handle clicks outside to close picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

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

  const formatDisplayValue = () => {
    if (!value) return placeholder

    const [hours, minutes] = value.split(':').map(Number)
    if (isNaN(hours) || isNaN(minutes)) return placeholder

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  const handleApply = () => {
    const timeString = `${tempHour.toString().padStart(2, '0')}:${tempMinute.toString().padStart(2, '0')}`
    onChange(timeString)
    setIsOpen(false)
  }

  const incrementHour = () => {
    setTempHour((prev) => (prev === 23 ? 0 : prev + 1))
  }

  const decrementHour = () => {
    setTempHour((prev) => (prev === 0 ? 23 : prev - 1))
  }

  const incrementMinute = () => {
    setTempMinute((prev) => (prev === 59 ? 0 : prev + 1))
  }

  const decrementMinute = () => {
    setTempMinute((prev) => (prev === 0 ? 59 : prev - 1))
  }

  return (
    <div
      className="relative w-full min-w-[180px] self-stretch"
      style={{
        opacity: disabled ? 0.7 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      ref={containerRef}
    >
      <h3
        className={`mb-0.5 w-full justify-start text-xs leading-loose font-semibold text-slate-700 ${disabled ? 'opacity-65' : ''}`}
      >
        {title}
      </h3>

      <div
        className={`input-container group flex cursor-pointer flex-row items-center justify-between gap-2 overflow-clip rounded-xl border-2 border-[#F1F1F1] bg-white shadow-sm transition-all ${
          !disabled && 'focus-within:border-slate-500'
        } ${isOpen ? 'border-slate-500' : ''} ${className}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="min-h-max w-full cursor-pointer px-3 py-3 text-start text-sm font-medium text-slate-600">
          {formatDisplayValue()}
        </div>
        <div className="pr-3">
          <svg
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
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
          </svg>
        </div>
      </div>

      {/* Custom Time Picker Popup */}
      {isOpen && portalStyle && (
        <div
          ref={portalRef}
          className="animate-in fade-in-0 zoom-in-95 fixed z-50 overflow-hidden rounded-xl border-2 border-[#F1F1F1] bg-white shadow-2xl duration-200"
          style={{
            // animation: 'slideDown 0.2s ease-out forwards',
            top: `${portalStyle.top + 5}px`,
            left: `${portalStyle.left}px`,
            width: `${portalStyle.width}px`,
          }}
        >
          <style>{`
            @keyframes slideDown {
              from {
                opacity: 0;
                transform: translateY(-10px) scale(0.95);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }

            @keyframes pulse {
              0%,
              100% {
                transform: scale(1);
              }
              50% {
                transform: scale(1.05);
              }
            }

            .pulse-animation {
              animation: pulse 0.15s ease-in-out;
            }
          `}</style>

          <div className="p-4">
            <div className="mb-4 flex items-center justify-center gap-4">
              {/* Hour Selection */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={incrementHour}
                  className="rounded-lg p-2 transition-colors duration-150 hover:bg-slate-100 active:bg-slate-200"
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
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                </button>
                <input
                  min={0}
                  max={23}
                  type="number"
                  className="flex h-12 w-16 items-center justify-center rounded-lg border-2 border-[#F1F1F1] bg-slate-50 text-center text-lg font-bold text-slate-700 select-none"
                  value={tempHour.toString().padStart(2, '0')}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    if (!isNaN(val)) {
                      if (val < 0) {
                        setTempHour(0)
                      } else if (val > 23) {
                        setTempHour(23)
                      } else {
                        setTempHour(Number(val))
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleApply()
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={decrementHour}
                  className="rounded-lg p-2 transition-colors duration-150 hover:bg-slate-100 active:bg-slate-200"
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
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <span className="mt-1 text-xs text-slate-500">Hours</span>
              </div>

              <div className="self-center pb-6 text-2xl font-bold text-slate-400">
                :
              </div>

              {/* Minute Selection */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={incrementMinute}
                  className="rounded-lg p-2 transition-colors duration-150 hover:bg-slate-100 active:bg-slate-200"
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
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                </button>
                <input
                  min={0}
                  max={59}
                  type="number"
                  className="flex h-12 w-16 items-center justify-center rounded-lg border-2 border-[#F1F1F1] bg-slate-50 text-center text-lg font-bold text-slate-700 select-none"
                  value={tempMinute.toString().padStart(2, '0')}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    if (!isNaN(val)) {
                      if (val < 0) {
                        setTempMinute(0)
                      } else if (val > 59) {
                        setTempMinute(59)
                      } else {
                        setTempMinute(Number(val))
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleApply()
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={decrementMinute}
                  className="rounded-lg p-2 transition-colors duration-150 hover:bg-slate-100 active:bg-slate-200"
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
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <span className="mt-1 text-xs text-slate-500">Minutes</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 border-t border-[#F1F1F1] pt-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-lg transition-colors duration-150 hover:bg-blue-600 hover:shadow-xl"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden input for form compatibility */}
      <input type="hidden" name={name} value={value} required={required} />
    </div>
  )
}

export default TimeInput
