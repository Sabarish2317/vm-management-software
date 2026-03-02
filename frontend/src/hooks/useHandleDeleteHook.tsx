// performs the action when enter is pressed on the keyboard

import { useEffect } from 'react'

// can be used when use html form is not possible
export const useHandleDeleteHook = (
  formState: unknown,
  onCancel: () => void
) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!formState) return

    const handleEnterPressed = (event: KeyboardEvent) => {
      if (event.key == 'Delete') {
        event.preventDefault()
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEnterPressed)

    return () => {
      window.removeEventListener('keydown', handleEnterPressed)
    }
  }, [formState, onCancel])
}
