import React from 'react'
import { useNavigate } from 'react-router-dom'

interface PageTitleAndDescriptionProps {
  title: string
  className?: string
  isBack?: boolean
  icon?: React.ReactNode
  isLoading?: boolean // ✅ new prop
}

const PageHeader: React.FC<PageTitleAndDescriptionProps> = ({
  title,
  icon,
  className = '',
  isBack = true,
  isLoading = false, // ✅ default false
}) => {
  const navigate = useNavigate()

  if (isLoading) {
    // ✅ Skeleton placeholder
    return (
      <div
        className={`flex flex-row items-center justify-start gap-2 ${className}`}
      >
        <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200"></div>
        <div className="h-6 w-40 animate-pulse rounded bg-gray-200"></div>
      </div>
    )
  }

  return (
    <div
      className={`flex flex-row items-center justify-start gap-2 ${className}`}
    >
      {icon}
      {isBack && (
        <button
          className="min-h-6 min-w-6 cursor-pointer items-center justify-center rounded-full bg-orange-500"
          type="button"
          onClick={() => navigate(-1)}
        >
          <img
            width={24}
            className="aspect-square"
            src="/icons/back-icon.svg"
            alt="back "
          />
        </button>
      )}
      <h1 className="my-1 flex w-max text-start text-lg font-semibold text-zinc-800">
        {title}
      </h1>
    </div>
  )
}

export default PageHeader
