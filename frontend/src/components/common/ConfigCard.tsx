import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export type ConfigCardType = {
  icon: string
  title: string
  desc: string
  label: string
  labelColor?: string
  btnText?: string
  navigateUrl: string
}

const ConfigCard: React.FC<ConfigCardType> = ({
  icon,
  title,
  desc,
  label,
  labelColor = 'bg-orange-50 text-orange-700',
  btnText = 'Open',
  navigateUrl,
}) => {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(navigateUrl)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group flex h-full w-full cursor-pointer flex-col justify-between rounded-xl border border-[#f1f1f1] bg-white px-4 py-5 text-left transition-all duration-150 ease-in-out hover:-translate-y-0.5"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* <img src={icon} alt={`${title} icon`} className="h-8 w-8" /> */}
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        </div>
        <span
          className={`rounded-2xl px-3 py-1 text-sm font-medium ${labelColor}`}
        >
          {label}
        </span>
      </div>
      <p className="mb-4 text-sm font-medium text-slate-500">{desc}</p>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-orange-600">{btnText}</span>
        <ArrowRight className="h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-1" />
      </div>
    </button>
  )
}

export default ConfigCard
