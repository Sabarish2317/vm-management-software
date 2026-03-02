import React from 'react'
import { motion } from 'framer-motion'

interface SwitchProps {
  title: string
  checked: boolean
  onChange: (value: boolean) => void
  name?: string
  disabled?: boolean
  required?: boolean
  viewMode?: boolean
  className?: string
  checkedContent?: string
  uncheckedContent?: string
}

const Switch: React.FC<SwitchProps> = ({
  required = false,
  title,
  checked,
  onChange,
  name = '',
  className = '',
  disabled = false,
  checkedContent = 'on',
  uncheckedContent = 'off',
  viewMode = false,
}) => {
  const handleToggle = () => {
    if (!disabled && !viewMode) {
      onChange(!checked)
    }
  }

  return (
    <div className={`relative w-full min-w-[180px] self-stretch ${className}`}>
      {/* Title */}
      <h3
        className={`mb-0.5 w-full justify-start ${
          viewMode
            ? 'text-base font-medium text-slate-600'
            : 'text-xs leading-loose font-semibold text-slate-700'
        }`}
      >
        {title} {required && <span className="text-red-500"> *</span>}
      </h3>

      <div
        className={`input-container flex cursor-text flex-row items-center justify-center gap-0 overflow-clip rounded-xl p-2.5 ${viewMode ? '' : 'border-2 border-slate-300 bg-white transition-all focus-within:border-slate-500'} `}
      >
        {/* Switch container */}
        <div
          className={`flex w-full flex-row items-center justify-between gap-3 ${viewMode ? 'opacity-70' : ''}`}
        >
          {/* Label text next to switch */}
          <motion.span
            key={String(checked)}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className={`text-sm font-medium ${
              checked ? 'text-slate-900' : 'text-slate-500'
            } ${viewMode ? 'blur-[0.5px]' : ''}`}
          >
            {checked ? checkedContent : uncheckedContent}
          </motion.span>

          <motion.button
            type="button"
            name={name}
            onClick={handleToggle}
            disabled={disabled}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`relative h-6 w-11 cursor-pointer rounded-full focus:outline-none ${
              disabled ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            {/* Background track animates color */}
            <motion.span
              className="absolute inset-0 rounded-full"
              animate={{ backgroundColor: checked ? '#3b82f6' : '#d1d5db' }} // blue-500 / slate-300
              transition={{ duration: 0.25 }}
            />

            {/* Circle knob */}
            <motion.span
              layout
              className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md"
              animate={{ x: checked ? 20 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              whileTap={{ scale: 0.9 }}
            />
          </motion.button>
        </div>
      </div>
    </div>
  )
}

export default Switch
