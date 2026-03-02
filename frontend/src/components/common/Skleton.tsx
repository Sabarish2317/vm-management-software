import React from 'react'

interface SkeletonFormProps {
  inputCount: number // How many input rows to render
}

const SkeletonForm: React.FC<SkeletonFormProps> = ({ inputCount }) => {
  return (
    <div className="flex flex-col gap-4 animate-pulse p-4  min-h-screen">
      {/* Header Skeleton */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
            <div className="h-6 w-48 bg-gray-300 rounded"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-gray-300 rounded"></div>
            <div className="h-8 w-20 bg-gray-300 rounded"></div>
            <div className="h-8 w-24 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>

      {/* Input Section Skeleton */}
      <div className="bg-white rounded-lg p-6 shadow-sm grid grid-cols-3 gap-4">
        {Array.from({ length: inputCount }).map((_, idx) => (
          <div key={idx} className="space-y-2">
            <div className="h-4 w-1/3 bg-gray-300 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SkeletonForm
