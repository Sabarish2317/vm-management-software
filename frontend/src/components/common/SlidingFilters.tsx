import { motion } from 'framer-motion'
import React from 'react'

interface SlidingFilterProps {
  filters: string[]
  selectedFilter: string
  onFilterChange: (filter: string) => void
  className?: string
  accentColor?: string
}

const SlidingFilter: React.FC<SlidingFilterProps> = ({
  filters,
  selectedFilter,
  onFilterChange,
  className = '',
  accentColor = 'bg-blue-500',
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const buttonsContainerRef = React.useRef<HTMLDivElement>(null)
  const buttonRefs = React.useRef<(HTMLButtonElement | null)[]>([])
  const [sliderStyle, setSliderStyle] = React.useState({ width: 0, left: 0 })

  React.useEffect(() => {
    const updateSliderPosition = () => {
      const selectedIndex = filters.indexOf(selectedFilter)
      const selectedButton = buttonRefs.current[selectedIndex]
      const buttonsContainer = buttonsContainerRef.current

      if (selectedButton && buttonsContainer) {
        // Get the button's position relative to its positioned parent (the buttons container)
        const buttonLeft = selectedButton.offsetLeft
        const buttonWidth = selectedButton.offsetWidth

        setSliderStyle({
          width: buttonWidth,
          left: buttonLeft,
        })
      }
    }

    // Small delay to ensure layout is complete
    const timer = setTimeout(updateSliderPosition, 0)

    window.addEventListener('resize', updateSliderPosition)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateSliderPosition)
    }
  }, [selectedFilter, filters])

  return (
    <div className={`flex items-center ${className}`}>
      <div ref={containerRef} className="relative rounded-lg bg-gray-100 p-1">
        <div ref={buttonsContainerRef} className="relative flex">
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
            className={`absolute inset-y-0 rounded-md ${accentColor} shadow-md`}
          />

          {/* Filter buttons */}
          {filters.map((filter, index) => (
            <motion.button
              key={filter}
              ref={(el) => {
                buttonRefs.current[index] = el
              }}
              onClick={() => onFilterChange(filter)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className={`relative z-10 cursor-pointer rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
                selectedFilter === filter
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {filter}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SlidingFilter
