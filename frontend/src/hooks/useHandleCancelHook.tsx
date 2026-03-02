import { useEffect } from 'react'

/**
 * Listens for Escape key presses and triggers the provided callback
 * while the supplied state flag is truthy.
 */
export const useHandleCancelHook = (
  activeState: unknown,
  onCancel: () => void
) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!activeState) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault()
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeState, onCancel])
}
