import { motion, AnimatePresence } from 'framer-motion'
import { Search } from 'lucide-react'
import React from 'react'

interface SearchBarProps {
  isSearchable?: boolean
  className?: string
  filters: string[]
  onFilterChange: (filter: string) => void
  onSearch: (query: string) => void
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const SearchBarWithFilter: React.FC<SearchBarProps> = ({
  className,
  filters,
  onFilterChange,
  onSearch,
  value,
  onChange,
}) => {
  const [isFocused, setIsFocused] = React.useState(false)
  const [selectedFilter, setSelectedFilter] = React.useState(filters[0] || '')
  const [sliderStyle, setSliderStyle] = React.useState({ width: 0, left: 0 })
  const containerRef = React.useRef<HTMLDivElement>(null)
  const buttonRefs = React.useRef<(HTMLButtonElement | null)[]>([])

  React.useEffect(() => {
    const updateSliderPosition = () => {
      const selectedIndex = filters.indexOf(selectedFilter)
      const selectedButton = buttonRefs.current[selectedIndex]
      const container = containerRef.current

      if (selectedButton && container) {
        const containerRect = container.getBoundingClientRect()
        const buttonRect = selectedButton.getBoundingClientRect()

        setSliderStyle({
          width: buttonRect.width,
          left: buttonRect.left - containerRect.left,
        })
      }
    }

    updateSliderPosition()

    // Update on window resize
    window.addEventListener('resize', updateSliderPosition)
    return () => window.removeEventListener('resize', updateSliderPosition)
  }, [selectedFilter, filters])

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
      className={`w-full bg-white ${className}`}
      style={{ backgroundColor: 'white' }}
    >
      <motion.div
        layout
        transition={{
          duration: 0.3,
          ease: [0.4, 0.0, 0.2, 1], // Custom cubic-bezier for smooth animation
        }}
        className={`group relative flex items-center overflow-hidden rounded-xl border-2 bg-white shadow-sm/2 transition-all duration-300 ease-out ${
          isFocused
            ? 'border-slate-500 bg-white shadow-sm ring-4 shadow-blue-100/50 ring-blue-100/30'
            : 'border-[#F1F1F1] bg-white hover:border-slate-300 hover:shadow-sm'
        }`}
      >
        {/* Search Icon Button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeInOut' }}
          className={`flex h-full w-12 items-center justify-center transition-all duration-300 ease-out`}
        >
          <motion.div
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={`h-6 w-6 ${isFocused ? 'scale-[105%]' : 'scale-[105%]'}`}
          >
            <Search
              className="h-6 w-6 text-slate-500 hover:scale-105"
              color="#6b7280"
            />
          </motion.div>
        </motion.button>

        {/* Input field */}
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={onChange}
            onKeyDown={(e) => e.key === 'Enter' && onSearch(value)}
            placeholder={`Search by ${selectedFilter}`}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full bg-transparent py-3 text-base font-medium text-slate-700 placeholder-slate-400 focus:outline-none"
          />

          {/* Clear button */}
          <AnimatePresence>
            {value && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                onClick={() =>
                  onChange({
                    target: { value: '' },
                  } as React.ChangeEvent<HTMLInputElement>)
                }
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-slate-200" />

        {/* Filter Selection */}
        <div className="flex items-center px-2 py-1">
          <div
            ref={containerRef}
            className="relative flex rounded-lg bg-slate-100"
          >
            {/* Background slider */}
            <motion.div
              animate={{
                width: sliderStyle.width,
                x: sliderStyle.left,
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
              }}
              className="absolute top-1 bottom-1 rounded-md bg-blue-500 shadow-sm"
            />

            {/* Filter buttons */}
            {filters.map((filter, index) => (
              <motion.button
                key={index}
                ref={(el) => {
                  buttonRefs.current[index] = el
                }}
                onClick={() => {
                  setSelectedFilter(filter)
                  onFilterChange(filter)
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className={`relative z-10 cursor-pointer rounded-md px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  selectedFilter === filter
                    ? 'text-white'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="relative z-10">{filter}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Search suggestions or results indicator */}
      <div className="relative hidden min-w-full">
        <AnimatePresence>
          {isFocused && value && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute z-50 mt-2 w-full rounded-lg border border-[#F1F1F1] bg-white p-3 shadow-sm"
            >
              <div className="flex items-center gap-2 text-sm text-slate-500">
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
                Searching for "{value}" in {selectedFilter}...
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default SearchBarWithFilter
