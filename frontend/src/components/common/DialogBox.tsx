import { motion } from 'motion/react'
import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import useClickOutside from '../../hooks/useClickOutside'

const popUpVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
}

const sideDrawerVariants = {
  hidden: { opacity: 0, x: -100, scale: 1 },
  visible: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -100, scale: 1 },
}

interface DialogBoxProps {
  children: React.ReactNode
  isSideDrawer?: boolean
  width?: string
  setToggleDialogueBox: React.Dispatch<React.SetStateAction<boolean>>
}

const DialogBox: React.FC<DialogBoxProps> = ({
  setToggleDialogueBox,
  children,
  isSideDrawer = false,
  width,
}) => {
  const [domReady, setDomReady] = useState(false)

  //handle tap outisde
  const [isVisible] = useClickOutside(true)

  useEffect(() => {
    if (!isVisible) {
      setToggleDialogueBox(false)
    }
  }, [isVisible, setToggleDialogueBox])

  useEffect(() => {
    // Close dialog when Escape key is pressed
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setToggleDialogueBox(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [setToggleDialogueBox])

  useEffect(() => {
    setDomReady(true)
    // Lock body scroll when dialog is open
    document.body.style.overflow = 'hidden'

    return () => {
      // Restore scroll when component unmounts
      document.body.style.overflow = 'auto'
    }
  }, [])

  // Early return before DOM is ready (for SSR compatibility)
  if (!domReady) return null

  // Determine the width based on props
  const defaultWidth = isSideDrawer ? '350px' : '350px'
  const componentWidth = width || defaultWidth

  const DialogBoxContent = (
    <motion.div
      variants={isSideDrawer ? sideDrawerVariants : popUpVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{
        duration: 0.3,
        ease: 'easeInOut',
      }}
      className={`fixed z-100 backdrop-blur-sm ${
        isSideDrawer
          ? 'inset-y-0 left-0 flex items-stretch'
          : 'inset-0 flex items-center justify-center'
      }`}
      //didnnt use childrens direcly as exit animations didnt work i dont know why
      //top positipon is handled via motion variant props y distance
    >
      <div
        // ref={containerRef}
        className={`flex flex-col bg-white outline-1 outline-gray-300 backdrop-blur-sm ${
          isSideDrawer
            ? `h-screen p-6 shadow-xl ${width ? `${width === '100vw' ? 'px-4! py-3!' : width}` : 'w-[350px]'}`
            : 'w-[350px] items-center gap-4 rounded-[20px] p-8 md:w-[400px] lg:w-[500px]'
        }`}
        style={width ? { width: componentWidth } : {}}
      >
        {children}
      </div>
    </motion.div>
  )

  // Create portal to render the dialog at the document body level
  return ReactDOM.createPortal(DialogBoxContent, document.body)
}

export default DialogBox
