import axios from 'axios'
import { toast } from 'react-hot-toast'
import { HandleUnauthorized } from './authHandler'

/**
 * Global error handler for API failures.
 *
 * @param error The raw error thrown (usually from Axios)
 * @param context A human-readable name for the API (e.g. "Resignation", "Contact Profile")
 */
export function handleApiError(error: unknown, context = 'Something'): never {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const message =
      error.response?.data?.error || error.message || 'Unknown error'

    // if (message) toast.error(`${context} failed: ${message}`)
    // throw new Error(`${message}`)
    switch (status) {
      case 400:
        toast.error(`${context} request is invalid.`)
        break
      case 401:
        HandleUnauthorized()
        break
      case 403:
        toast.error(
          `You don't have permission for this ${context.toLowerCase()}.`
        )
        break
      case 404:
        toast.error(`${context} not found.`)
        break

      case 409:
        toast.error(`${context} already exists.`)
        break
      case 500:
        toast.error(`Server error. Cannot ${context.toLowerCase()}.`)
        break
      default:
        toast.error(`${context} failed: ${message}`)
    }

    throw new Error(`[${context}] ${message}`)
  } else {
    toast.error(`An error occured in ${context}`)
    throw new Error(`[${context}] Unexpected error`)
  }
}
