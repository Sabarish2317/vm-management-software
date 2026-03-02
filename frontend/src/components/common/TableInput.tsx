import { motion } from 'motion/react'

type InputType = 'str' | 'num'

/**
 * Generic Input component for handling both string and number values.
 * Can be used in reusable forms with strict type control and validation.
 *
 * @template T - Input value type (string | number)
 */
interface InputProps<T extends string | number> {
  /** Label title above the input field */
  title: string
  /** Placeholder text for the input */
  placeholder?: string
  /** Current input value */
  inputValue: T
  /**
   * Callback triggered on value change
   * @param value - New value of input
   */
  onChange: (value: T) => void
  /** Input type - "str" for text, "num" for number */
  type?: InputType
  /** Optional input `name` attribute */
  name?: string
  /** Prefix label shown before the input (e.g., ₹ or +91) */
  prefixText?: string
  /** Maximum character length (applies to string input only) */
  maxLength?: number
  /** Minimum numeric value allowed (for type="num") */
  min?: number
  /** Maximum numeric value allowed (for type="num") */
  max?: number
  /** Whether the input is required for form submission */
  disabled?: boolean
  /** Whether the input is required for form submission */
  required?: boolean
  /** Minimum string length allowed (for type="str") */
  minLength?: number
  /**
   * @deprecated Use a separate <ReadonlyField /> instead.
   */
  viewMode?: boolean
  /** Extra custom CSS classes */
  className?: string
  /** Toggles inline edit capability */
  isEditMode?: boolean
}

/**
 * Reusable Input component with strict typing and smart constraints.
 * Supports both text and number fields, with prefix, length limits, and min/max validation.
 *
 * @example
 * ```tsx
 * <Input
 *   title="Phone Number"
 *   inputValue={phone}
 *   onChange={(val) => setPhone(val)}
 *   type="num"
 *   prefixText="+91"
 *   max={9999999999}
 * />
 * ```
 */
export const TableInput = <T extends string | number>({
  required = false,
  title,
  placeholder = '',
  inputValue,
  onChange,
  type = 'str',
  name = '',
  prefixText = '',
  maxLength = 36,
  min,
  max,
  className = '',
  disabled = false,
  minLength = 0,
  isEditMode = false,
}: InputProps<T>) => {
  const inputType = type === 'num' ? 'number' : 'text'

  /**
   * Handles input changes with type-aware validation.
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value

    if (type === 'num') {
      let normalized = raw

      if (
        normalized.length > 1 &&
        normalized.startsWith('0') &&
        normalized[1] !== '.'
      ) {
        normalized = normalized.replace(/^0+/, '')
        if (normalized === '') {
          normalized = '0'
        } else if (normalized.startsWith('.')) {
          normalized = `0${normalized}`
        }

        if (normalized !== raw) {
          e.target.value = normalized
        }
      }

      if (normalized === '') {
        onChange('' as T)
        return
      }

      // Allow intermediate decimal input like "12." or "0."
      if (/^\d*\.?\d*$/.test(normalized)) {
        const num = parseFloat(normalized)

        // Skip NaN for incomplete input like "."
        if (!isNaN(num)) {
          if (
            (min !== undefined && num < min) ||
            (max !== undefined && num > max)
          )
            return
          onChange(num as T)
        } else {
          // Still call onChange for partial decimals like "12."
          onChange(normalized as T)
        }
      }
    } else {
      // For non-numeric input, just pass the string
      onChange(raw as T)
    }
  }

  return (
    <motion.div
      initial={{ y: -10 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="relative w-full min-w-20 self-stretch"
    >
      <h3
        className={`mb-0.5 w-full justify-start text-xs leading-tight font-semibold text-slate-600`}
      >
        {title} {required && <span className="text-red-500"> *</span>}
      </h3>
      <div
        className={`input-container flex flex-row items-center gap-0 overflow-clip bg-transparent text-sm transition-colors duration-150 ${
          isEditMode
            ? 'border-b border-b-gray-300 bg-white focus-within:border-gray-500'
            : 'border-transparent bg-transparent'
        } ${
          !isEditMode ? 'pointer-events-none text-slate-500' : 'text-slate-700'
        }`}
      >
        {prefixText && (
          <div className="flex h-full items-center justify-start bg-slate-100 px-3 py-2 text-sm leading-loose font-medium text-slate-700">
            {prefixText}
          </div>
        )}
        <input
          required={required}
          readOnly={disabled || !isEditMode}
          onWheel={(e) => (e.target as HTMLInputElement).blur()}
          disabled={disabled}
          type={inputType}
          name={name}
          step={type === 'num' ? '.1' : undefined}
          placeholder={placeholder}
          onChange={handleChange}
          value={inputValue}
          className={`custom-disabled-cursor min-h-max w-full py-2 text-start text-sm font-medium outline-none ${
            isEditMode
              ? 'cursor-text px-2 text-[#1F1F21]'
              : 'cursor-default bg-transparent text-[#1F1F21]'
          } ${className}`}
          maxLength={type === 'str' ? maxLength : undefined}
          min={type === 'num' ? min : undefined}
          max={type === 'num' ? max : undefined}
          minLength={type === 'str' ? minLength : undefined}
        />
      </div>
    </motion.div>
  )
}
