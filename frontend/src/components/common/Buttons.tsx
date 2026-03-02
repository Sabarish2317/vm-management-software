import { motion, type HTMLMotionProps } from 'motion/react'
import React from 'react'

type ButtonState = 'default' | 'outline'
interface ButtonSmProps extends HTMLMotionProps<'button'> {
  className?: string
  name?: string
  state: ButtonState
  text?: string
  disabled?: boolean
  imgUrl?: string
  isPending?: boolean
  value?: string
  iconPosition?: 'left' | 'right'
  type?: 'button' | 'submit' | 'reset'
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  children?: React.ReactNode
}

const ButtonSm: React.FC<ButtonSmProps> = ({
  state,
  text,
  onClick,
  name,
  type = 'button',
  disabled = false,
  className = '',
  imgUrl,
  value,
  isPending = false,
  iconPosition = 'left', // default position
  children,
  ...props
}) => {
  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: 0, ease: 'easeInOut' }}
      type={type}
      disabled={disabled}
      className={`btn-sm flex cursor-pointer flex-row items-center justify-center rounded-[9px] px-3 text-sm shadow-sm/1 transition-colors duration-200 ease-in-out select-none ${
        disabled ? 'cursor-not-allowed opacity-70' : ''
      } ${
        state === 'default'
          ? 'gap-0! bg-[#1A191E]! py-3! font-medium! text-white! outline-0! hover:bg-zinc-800!'
          : 'gap-2 border-2 border-[#F1F1F1] bg-white py-3 font-semibold text-black outline-0 hover:bg-gray-100 active:bg-gray-200'
      } ${className}`}
      onClick={onClick}
      value={value}
      name={name}
      {...props}
    >
      {/* Render icon on left (default) */}
      {imgUrl && iconPosition === 'left' && (
        <img src={imgUrl} alt="" className="nin-h-4 min-w-4" />
      )}
      {text && text}
      {/* Render icon on right */}
      {imgUrl && iconPosition === 'right' && (
        <img src={imgUrl} alt="" className="min-h-4 min-w-4" />
      )}
      {isPending && (
        <Spinner
          size="sm"
          className={
            state === 'default' ? 'mx-2 text-white!' : 'ml-2 text-gray-800!'
          }
        />
      )}
      {children}
    </motion.button>
  )
}

interface ButtonLgProps {
  state: ButtonState
  text: string
  imgUrl?: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

export const ButtonLg: React.FC<ButtonLgProps> = ({
  state,
  text,
  onClick,
  imgUrl,
  disabled,
  type = 'button',
  className = '',
}) => {
  return (
    <button
      className={`btn-sm flex cursor-pointer flex-row items-center justify-center gap-2 rounded-[9px] px-4 py-3 text-center text-base font-medium transition-all duration-200 ease-in-out select-none ${state === 'default' ? 'btn-primary bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700' : 'btn-outline bg-white text-orange-500 outline-2 -outline-offset-2 outline-orange-500 hover:bg-orange-50 active:bg-orange-200'} disabled:opacity-45 ${className}`}
      onClick={onClick}
      type={type}
      disabled={disabled}
    >
      {text}
      {imgUrl && <img src={imgUrl} alt="" className="h-5 w-5" />}
    </button>
  )
}

export default ButtonSm
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg
        className="animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="31.416"
          strokeDashoffset="31.416"
          className="opacity-25"
        />
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="31.416"
          strokeDashoffset="23.562"
          className="opacity-75"
        >
          <animate
            attributeName="stroke-dashoffset"
            dur="2s"
            values="31.416;0;31.416"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </div>
  )
}
