/* eslint-disable react-hooks/purity */
import { motion } from 'framer-motion'
import { Mic, MicOff } from 'lucide-react'
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
  maxLength?: number
  min?: number
  max?: number
  disabled?: boolean
  required?: boolean
  minLength?: number
  viewMode?: boolean
  className?: string
  inputRef?: React.Ref<HTMLInputElement>
}

const VoiceInput = <T extends string | number>({
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
  viewMode = false,
  inputRef,
}: InputProps<T>) => {
  const inputType = type === 'num' ? 'number' : 'text'

  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  /* -----------------------------
     🎤 Setup Speech Recognition
  ------------------------------ */
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'ta-IN' // Default Tamil

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript

      if (type === 'num') {
        const numericValue = transcript.replace(/[^\d.]/g, '')
        onChange(Number(numericValue) as T)
      } else {
        onChange(transcript as T)
      }

      setIsListening(false)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
  }, [])

  /* -----------------------------
     🎤 Toggle Voice Recognition
  ------------------------------ */
  const handleVoiceToggle = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      // Auto detect language (Tamil + English)
      recognitionRef.current.lang = 'ta-IN'
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  /* -----------------------------
     🔢 Handle Manual Input
  ------------------------------ */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value

    if (type === 'num') {
      if (raw === '') {
        onChange('' as T)
        return
      }

      if (/^\d*\.?\d*$/.test(raw)) {
        const num = parseFloat(raw)

        if (!isNaN(num)) {
          if (
            (min !== undefined && num < min) ||
            (max !== undefined && num > max)
          )
            return
          onChange(num as T)
        } else {
          onChange(raw as T)
        }
      }
    } else {
      onChange(raw as T)
    }
  }

  return (
    <motion.div
      initial={{ y: -10 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="relative w-full min-w-[180px] self-stretch"
    >
      <h3
        className={`mb-0.5 w-full ${
          viewMode
            ? 'text-base font-medium text-slate-600'
            : 'text-xs font-semibold text-slate-700'
        }`}
      >
        {title} {required && <span className="text-red-500">*</span>}
      </h3>

      <div
        className={`flex items-center rounded-xl ${
          viewMode
            ? ''
            : 'border-2 border-[#F1F1F1] bg-white shadow-sm focus-within:border-slate-500'
        }`}
      >
        {prefixText && (
          <div className="bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
            {prefixText}
          </div>
        )}

        <input
          ref={inputRef}
          required={required}
          disabled={disabled}
          readOnly={disabled}
          type={inputType}
          name={name}
          step={type === 'num' ? '.1' : undefined}
          placeholder={placeholder}
          onChange={handleChange}
          value={inputValue}
                   className={`custom-disabled-cursor hover:cursor[text]:color-black min-h-max w-full ${
            disabled ? 'bg-slate-200' : 'cursor-text'
          } ${className} text-start ${viewMode ? 'text-base font-medium text-slate-900' : 'px-3 py-3 text-sm font-medium text-slate-600 autofill:text-black focus:outline-none'} shadow-sm read-only:cursor-default read-only:bg-white`}
          maxLength={type === 'str' ? maxLength : undefined}
          min={type === 'num' ? min : undefined}
          max={type === 'num' ? max : undefined}
          minLength={type === 'str' ? minLength : undefined}
        />

        {/* 🎤 Voice Button */}
        {!viewMode && !disabled && (
          <button
            type="button"
            onClick={handleVoiceToggle}
            className={`mr-3 transition ${
              isListening ? 'text-red-500 animate-pulse' : 'text-slate-500'
            }`}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        )}
      </div>
    </motion.div>
  )
}

export default VoiceInput
