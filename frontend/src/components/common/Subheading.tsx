import React from 'react'

interface SubHeadingProps {
  text: string
  className: string
}

const SubHeading: React.FC<SubHeadingProps> = ({ text, className }) => {
  return (
    <div className={`container flex flex-row items-center gap-1 ${className}`}>
      <div className="round max-h-1.5 min-h-1.5 max-w-1.5 min-w-1.5 rounded-full bg-blue-700"></div>
      <h1 className="text-md flex w-max text-start font-semibold text-blue-700">
        {text}
      </h1>
    </div>
  )
}

export default SubHeading
