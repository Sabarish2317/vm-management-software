import React from 'react'
import { motion } from 'framer-motion'
import { Monitor, Cpu, HardDrive, MemoryStick, Network } from 'lucide-react'
import type { NodeMetrics, VMStatus } from '@/types/prometheus'

// ─── helpers (duplicated small-utility; keep components self-contained) ───────

function fmtBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log2(bytes) / 10)
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function gaugeColor(pct: number): string {
  if (pct >= 85) return 'bg-red-500'
  if (pct >= 65) return 'bg-amber-400'
  return 'bg-emerald-500'
}

// ─── mini gauge bar ───────────────────────────────────────────────────────────

interface MiniGaugeProps {
  value: number
  colorClass: string
}

const MiniGauge: React.FC<MiniGaugeProps> = ({ value, colorClass }) => (
  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
    <motion.div
      className={`h-full rounded-full ${colorClass}`}
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(100, value)}%` }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
    />
  </div>
)

// ─── status config ────────────────────────────────────────────────────────────

const statusConfig: Record<
  VMStatus,
  { bg: string; text: string; dot: string; label: string; border: string }
> = {
  running: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    dot: 'bg-emerald-500',
    label: 'Running',
    border: 'border-slate-200',
  },
  degraded: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    dot: 'bg-amber-500',
    label: 'Degraded',
    border: 'border-amber-200',
  },
  unreachable: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    dot: 'bg-red-500',
    label: 'Unreachable',
    border: 'border-red-200',
  },
}

// ─── VMCard ───────────────────────────────────────────────────────────────────

interface VMCardProps {
  vm: NodeMetrics
  index?: number
}

const VMCard: React.FC<VMCardProps> = ({ vm, index = 0 }) => {
  const s = statusConfig[vm.status]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className={`flex flex-col gap-3 rounded-xl border ${s.border} bg-white p-4 shadow-sm transition-shadow hover:shadow-md`}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.bg}`}
          >
            <Monitor className={`h-4 w-4 ${s.text}`} />
          </div>
          <div className="overflow-hidden">
            <p className="truncate text-sm leading-tight font-semibold text-slate-800">
              {vm.name}
            </p>
            <p className="truncate text-xs text-slate-400">{vm.instance}</p>
          </div>
        </div>

        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </span>
      </div>

      {/* ── Metrics grid ── */}
      {vm.up ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          {/* CPU */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-slate-400">
                <Cpu size={11} />
                <span className="text-[11px] font-medium">CPU</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-700">
                {vm.cpuUsagePercent.toFixed(1)}%
              </span>
            </div>
            <MiniGauge
              value={vm.cpuUsagePercent}
              colorClass={gaugeColor(vm.cpuUsagePercent)}
            />
          </div>

          {/* Memory */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-slate-400">
                <MemoryStick size={11} />
                <span className="text-[11px] font-medium">RAM</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-700">
                {vm.memUsagePercent.toFixed(1)}%
              </span>
            </div>
            <MiniGauge
              value={vm.memUsagePercent}
              colorClass={gaugeColor(vm.memUsagePercent)}
            />
          </div>

          {/* Disk */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-slate-400">
                <HardDrive size={11} />
                <span className="text-[11px] font-medium">Disk</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-700">
                {vm.diskUsagePercent.toFixed(1)}%
              </span>
            </div>
            <MiniGauge
              value={vm.diskUsagePercent}
              colorClass={gaugeColor(vm.diskUsagePercent)}
            />
          </div>

          {/* Network */}
          <div>
            <div className="flex items-center gap-1 text-slate-400">
              <Network size={11} />
              <span className="text-[11px] font-medium">Net</span>
            </div>
            <p className="mt-0.5 text-[10px] leading-tight font-medium text-slate-600">
              ↓{fmtBytes(vm.networkRxBytesPerSec)}/s
              <br />↑{fmtBytes(vm.networkTxBytesPerSec)}/s
            </p>
          </div>
        </div>
      ) : (
        <p className="py-2 text-center text-xs text-slate-400">
          Metrics unavailable — node unreachable
        </p>
      )}

      {/* ── Memory detail footer ── */}
      {vm.up && (
        <p className="border-t border-slate-100 pt-2 text-[10px] text-slate-400">
          Mem: {fmtBytes(vm.memUsedBytes)} / {fmtBytes(vm.memTotalBytes)}{' '}
          &nbsp;·&nbsp; Disk: {fmtBytes(vm.diskUsedBytes)} /{' '}
          {fmtBytes(vm.diskTotalBytes)}
        </p>
      )}
    </motion.div>
  )
}

export default VMCard
