import { AnimatePresence, motion } from 'framer-motion'
import React from 'react'
import { Search } from 'lucide-react'
import { useDebounce } from '../../utils/useDebounce'

interface SearchSm {
  inputValue: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSearch: (query: string) => void
  placeholder?: string
  debounceDelay?: number
  onClear?: () => void
  containerClassName?: string
}

const SearchSm: React.FC<SearchSm> = ({
  inputValue,
  onChange,
  onSearch,
  placeholder = 'Search',
  debounceDelay = 400,
  onClear,
  containerClassName,
}) => {
  const [isFocused, setIsFocused] = React.useState(false)
  const debouncedInput = useDebounce(inputValue, debounceDelay)

  React.useEffect(() => {
    if (debouncedInput.trim()) {
      onSearch(debouncedInput)
    }
  }, [debouncedInput])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      onSearch(inputValue.trim())
    }
  }

  const handleSearchIconClick = () => {
    if (inputValue.trim()) {
      onSearch(inputValue.trim())
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className={`relative min-w-40 select-none ${containerClassName}`}
    >
      <motion.div
        animate={{ scale: isFocused ? 1.02 : 1 }}
        transition={{ duration: 0.2 }}
        className="focus-visible::border-slate-400 relative rounded-xl border-2 border-[#F1F1F1] bg-white shadow-sm focus:scale-[1.01]"
      >
        <div
          className="absolute inset-y-0 left-0 flex cursor-pointer items-center pl-3"
          onClick={handleSearchIconClick}
        >
          <motion.div
            animate={{
              color: isFocused ? '#3b82f6' : '#6b7280',
              scale: isFocused ? 1.1 : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            <Search
              className="h-5 w-5 text-slate-500 hover:scale-105"
              color="#6b7280"
            />
          </motion.div>
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full rounded-xl py-3 pr-4 pl-10 text-sm font-medium text-slate-700 transition-all duration-200 select-text focus:border-transparent focus:ring-1 focus:ring-slate-500 focus:outline-none"
        />

        {/* Clear button */}
        <AnimatePresence>
          {inputValue && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              onClick={onClear}
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
      </motion.div>
    </motion.div>
  )
}

export default SearchSm
