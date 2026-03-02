import { useEffect, useRef, useState } from 'react'

const useClickOutside = (
  initialState: boolean
): [
  React.RefObject<HTMLDivElement>,
  boolean,
  React.Dispatch<React.SetStateAction<boolean>>,
] => {
  const [isVisible, setIsVisible] = useState<boolean>(initialState)
  const ref = useRef<HTMLDivElement>(null) // 👈 Specific to HTMLDivElement

  useEffect(() => {
    if (!isVisible) return

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsVisible(false)
      }
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsVisible(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscapeKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isVisible])

  return [ref as React.RefObject<HTMLDivElement>, isVisible, setIsVisible]
}

export default useClickOutside
