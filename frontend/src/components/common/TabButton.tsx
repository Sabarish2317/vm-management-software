import React from 'react'
import { motion } from 'framer-motion'

interface TabButtonProps {
  labelText: string
  isActive: boolean
  onClick: () => void
  isDiabled?: boolean
}

const TabButton: React.FC<TabButtonProps> = ({
  labelText,
  isActive,
  onClick,
  isDiabled,
}) => {
  return (
    <motion.main
      onClick={onClick}
      initial={false}
      style={isDiabled ? { pointerEvents: 'none', opacity: 0.7 } : {}}
      animate={{
        backgroundColor: isActive ? '#3B82F6' : '#ffffff',
        borderTopLeftRadius: isActive ? 12 : 12,
        borderTopRightRadius: isActive ? 12 : 12,
        borderBottomRightRadius: isActive ? 0 : 12,
        borderBottomLeftRadius: isActive ? 0 : 12,
        boxShadow: isActive
          ? '0 0 0 rgba(0,0,0,0)'
          : '0px 2px 6px rgba(0,0,0,0.06)',
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="flex cursor-pointer px-4 py-3.5 select-none"
    >
      <motion.p
        initial={false}
        animate={{
          color: isActive ? '#ffffff' : '#1e293b',
        }}
        className="text-base font-medium"
      >
        {labelText}
      </motion.p>
    </motion.main>
  )
}

export const DummyTabButton: React.FC<TabButtonProps> = ({
  labelText,
  isActive,
  onClick,
}) => {
  return (
    <motion.main
      onClick={onClick}
      initial={false}
      animate={{
        opacity: isActive ? 1 : 0,
        height: isActive ? 40 : 0,
        backgroundColor: isActive ? '#3B82F6' : 'transparent',
      }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="z-0 flex overflow-hidden px-4"
    >
      <motion.p
        initial={false}
        animate={{
          opacity: isActive ? 1 : 0,
          scale: isActive ? 1 : 0.95,
        }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
        className="text-base font-medium text-blue-600 opacity-0"
      >
        {labelText}
      </motion.p>
    </motion.main>
  )
}

export default TabButton
