/* eslint-disable react-hooks/purity */
import { motion } from 'framer-motion'
import { Check, Mic } from 'lucide-react'
import React, { useRef, useState, useEffect } from 'react'

type InputType = 'str' | 'num'

interface InputProps<T extends string | number> {
  title: string
  placeholder?: string
  inputValue: T
  onChange: (value: T) => void
  type?: InputType
  name?: string
  prefixText?: string
  disabled?: boolean
  required?: boolean
  viewMode?: boolean
  className?: string
  inputRef?: React.Ref<HTMLInputElement>
}

const Input = <T extends string | number>({
  title,
  placeholder = '',
  inputValue,
  onChange,
  type = 'str',
  name = '',
  prefixText = '',
  disabled = false,
  required = false,
  viewMode = false,
  className = '',
  inputRef,
}: InputProps<T>) => {
  const inputType = type === 'num' ? 'number' : 'text'

  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isHoldingRef = useRef(false)

  /* 🎤 Setup Tamil Speech Recognition */
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'ta-IN' // Tamil only

    recognition.onresult = (event: any) => {
      const transcript =
        event.results[event.results.length - 1][0].transcript.trim()

      if (!transcript) return

      if (type === 'num') {
        // 🔥 STRICT NUMBER MODE
        // Accept only digits
        const digitsOnly = transcript.replace(/\D/g, '')

        if (digitsOnly.length === transcript.length) {
          // Only append if fully numeric
          const oldValue = String(inputValue ?? '')
          const newValue = oldValue + digitsOnly
          onChange(Number(newValue) as T)
        }
        // else ignore completely
      } else {
        const oldValue = String(inputValue ?? '')
        const newText =
          oldValue.length > 0
            ? oldValue + ' ' + transcript
            : transcript

        onChange(newText as T)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
  }, [inputValue, onChange, type])

  /* 🎤 Start Listening */
  const startListening = () => {
    if (!recognitionRef.current || isListening) return
    recognitionRef.current.start()
    setIsListening(true)
  }

  /* 🎤 Stop Listening */
  const stopListening = () => {
    if (!recognitionRef.current || !isListening) return
    recognitionRef.current.stop()
    setIsListening(false)
  }

  /* 👆 Long Press */
  const handleMouseDown = () => {
    isHoldingRef.current = false

    holdTimeoutRef.current = setTimeout(() => {
      isHoldingRef.current = true
      startListening()
    }, 250)
  }

  const handleMouseUp = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
    }

    if (isHoldingRef.current) {
      stopListening()
    }
  }

  /* 👆 Single Click */
  const handleClick = () => {
    if (isHoldingRef.current) return

    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value as T)
  }

  return (
    <motion.div
      initial={{ y: -10 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative w-full"
    >
      <h3 className="mb-1 text-xs font-semibold text-slate-700">
        {title} {required && <span className="text-red-500">*</span>}
      </h3>

      <div className="flex items-center rounded-xl border-2 border-[#F1F1F1] bg-white shadow-sm focus-within:border-slate-500">
        {prefixText && (
          <div className="bg-slate-100 px-3 py-3 text-sm font-medium text-slate-700">
            {prefixText}
          </div>
        )}

        <input
          ref={inputRef}
          type={inputType}
          name={name}
          placeholder={placeholder}
          onChange={handleChange}
          value={inputValue}
          disabled={disabled}
          className={`w-full px-3 py-3 text-sm font-medium focus:outline-none ${
            disabled ? 'bg-slate-200' : 'bg-white'
          } ${className}`}
        />

        {!viewMode && !disabled && (
          <button
            type="button"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            onClick={handleClick}
            className={`mr-3 transition ${
              isListening
                ? 'text-red-500 scale-110'
                : 'text-slate-500'
            }`}
          >
            <Mic size={20} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

export default Input


interface CheckBoxProps {
  checked: boolean
  disabled?: boolean
  className?: string
  label?: string
  onChange: (value: boolean) => void
}

/**
 * Checkbox component styled like the main Input component.
 * Label on the left, checkbox on the right inside bordered container.
 */
export const CheckBox: React.FC<CheckBoxProps> = ({
  checked,
  disabled = false,
  onChange,
  className,
  label,
}) => {
  // Generate unique ID to avoid conflicts when label is empty
  const uniqueId = React.useMemo(
    () => `checkbox-${label || Math.random().toString(36).substr(2, 9)}`,
    [label]
  )

  return (
    <motion.div
      initial={{ y: -10 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className={`${className} relative w-full`}
    >
      <div className="relative flex items-center">
        <input
          type="checkbox"
          id={uniqueId}
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <label
          htmlFor={uniqueId}
          className={`relative flex max-h-3 max-w-3 ${disabled ? 'cursor-default' : 'cursor-pointer'} rounded-md border-2 p-4 transition-all outline-none focus:outline-none ${
            checked
              ? 'border-transparent bg-orange-500'
              : 'border-[#F1F1F1] bg-white shadow-sm'
          }`}
        >
          {checked && (
            <img
              className="pointer-events-none absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-default select-none"
              src="/icons/tick-icon.svg"
              alt="tick"
            />
          )}
        </label>
      </div>
    </motion.div>
  )
}

interface InputCheckboxProps {
  title: string
  checked: boolean
  disabled?: boolean
  className?: string
  label?: string
  onChange: (value: boolean) => void
}

/**
 * Checkbox component styled like the main Input component.
 * Label on the left, checkbox on the right inside bordered container.
 */
export const InputCheckbox: React.FC<InputCheckboxProps> = ({
  title,
  checked,
  disabled = false,
  onChange,
  className,
  label,
}) => {
  // Generate unique ID to avoid conflicts with duplicate titles
  const uniqueId = React.useMemo(
    () => `input-checkbox-${title}-${Math.random().toString(36).substr(2, 9)}`,
    [title]
  )

  return (
    <motion.div
      initial={{ y: -10 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className={`${className} relative w-full min-w-[180px] self-stretch`}
    >
      <h3
        className={`mb-0.5 w-full justify-start text-xs leading-loose font-semibold text-slate-700`}
      >
        {label}
      </h3>
      <div
        className={`input-container flex flex-row items-center justify-between rounded-xl border-2 border-[#F1F1F1] bg-white px-3 py-2 pr-2 shadow-sm transition-all duration-200 ease-in-out`}
      >
        <span className="text-sm font-medium text-slate-600">{title}</span>

        <div className="relative flex items-center">
          <input
            type="checkbox"
            id={uniqueId}
            className="sr-only"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
          />
          <label
            htmlFor={uniqueId}
            className={`relative block h-5 w-5 ${disabled ? 'cursor-default' : 'cursor-pointer'} rounded-md border-2 p-3 transition-all outline-none focus:outline-none ${
              checked
                ? 'border-orange-500 bg-orange-500'
                : 'border-[#F1F1F1] bg-slate-100 shadow-sm'
            }`}
          >
            {checked && (
              <Check className="pointer-events-none absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-default text-white select-none" />
            )}
          </label>
        </div>
      </div>
    </motion.div>
  )
}

interface DateInputProps {
  title?: string
  value: string
  onChange: (val: string) => void
  name?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  maxDate?: string
}

export const DateInput: React.FC<DateInputProps> = ({
  title,
  value,
  onChange,
  name = '',
  placeholder = 'Select date',
  required = false,
  disabled = false,
  maxDate,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className="relative w-full min-w-[180px] self-stretch">
      {title && (
        <h3 className="mb-0.5 w-full justify-start text-xs leading-loose font-semibold text-slate-700">
          {title} {required && <span className="text-red-500"> *</span>}
        </h3>
      )}

      <div
        onClick={() => {
          if (!disabled) inputRef.current?.showPicker?.()
          inputRef.current?.focus()
        }}
        className={`input-container group flex flex-row items-center justify-between gap-2 overflow-clip rounded-xl border-2 border-[#F1F1F1] bg-white shadow-sm transition-all select-none ${
          !disabled
            ? 'cursor-pointer focus-within:border-slate-500'
            : 'cursor-not-allowed'
        }`}
      >
        <input
          style={{
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            zoom: 1,
            WebkitAppearance: 'textfield',
          }}
          ref={inputRef}
          required={required}
          disabled={disabled}
          readOnly={disabled}
          type="date"
          name={name}
          max={maxDate}
          placeholder={placeholder}
          onChange={handleChange}
          value={value}
          className="min-h-max w-full px-3 py-3 text-start text-sm font-medium text-slate-600 select-none autofill:text-black focus:outline-none"
        />
      </div>
    </div>
  )
}

export interface DropdownOption {
  label: string
  id: number
}
