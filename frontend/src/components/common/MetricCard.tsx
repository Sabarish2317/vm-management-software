import React from 'react'

interface MetricCardProps {
  title: string
  metric: string
  subMetric: string
  icon: string
  isUptrend?: boolean
  borderColor: string
  bgColor?: string
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  metric,
  subMetric,
  icon,
  isUptrend,
  borderColor,
  bgColor,
}) => {
  return (
    <div className="metric-card flex w-full flex-row items-center justify-between rounded-xl border-[1.5px] border-slate-300 bg-white p-4 shadow-sm">
      <div className="stats-contaienr flex flex-col">
        <h2 className="text-md font-medium text-slate-700">{title}</h2>
        <div className="stats flex flex-row items-end gap-2">
          <h3 className="text-2xl font-semibold text-slate-800">{metric}</h3>
          <h4
            className={`mb-1 text-sm font-medium ${isUptrend ? 'text-green-500' : 'text-red-500'}`}
          >
            {subMetric}
          </h4>
        </div>
      </div>
      <div
        className={`img-container border-[1.5px] ${bgColor} ${borderColor} rounded-md p-3`}
      >
        <img className="h-5 w-5" src={icon} alt={icon} />
      </div>
    </div>
  )
}

export default MetricCard
