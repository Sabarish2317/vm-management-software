import React from 'react'
import { motion } from 'framer-motion'
import { Server, Cpu, MemoryStick, HardDrive, Network } from 'lucide-react'
import type { NodeMetrics, VMStatus } from '@/types/prometheus'

// ─── tiny helpers ─────────────────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log2(bytes) / 10)
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function fmtUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

// ─── sub-components ───────────────────────────────────────────────────────────

interface GaugeBarProps {
  value: number
  colorClass: string
}

const GaugeBar: React.FC<GaugeBarProps> = ({ value, colorClass }) => (
  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
    <motion.div
      className={`h-full rounded-full ${colorClass}`}
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(100, value)}%` }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    />
  </div>
)

interface StatRowProps {
  icon: React.ReactNode
  label: string
  value: string
  pct?: number
  colorClass?: string
}

const StatRow: React.FC<StatRowProps> = ({
  icon,
  label,
  value,
  pct,
  colorClass = 'bg-blue-500',
}) => (
  <div className="flex flex-col gap-0.5">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-slate-500">
        <span className="flex h-5 w-5 items-center justify-center text-slate-400">
          {icon}
        </span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="text-xs font-semibold text-slate-700">{value}</span>
    </div>
    {pct !== undefined && <GaugeBar value={pct} colorClass={colorClass} />}
  </div>
)

// ─── status badge ─────────────────────────────────────────────────────────────

const statusConfig: Record<
  VMStatus,
  { bg: string; text: string; dot: string; label: string }
> = {
  running: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    dot: 'bg-green-500',
    label: 'Online',
  },
  degraded: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    dot: 'bg-amber-500',
    label: 'Degraded',
  },
  unreachable: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    dot: 'bg-red-500',
    label: 'Unreachable',
  },
}

// ─── gauge colour based on usage ─────────────────────────────────────────────

function gaugeColor(pct: number): string {
  if (pct >= 85) return 'bg-red-500'
  if (pct >= 65) return 'bg-amber-400'
  return 'bg-blue-500'
}

// ─── HostMachineCard ──────────────────────────────────────────────────────────

interface HostMachineCardProps {
  host: NodeMetrics
}

const HostMachineCard: React.FC<HostMachineCardProps> = ({ host }) => {
  const s = statusConfig[host.status]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex w-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-100 bg-slate-50">
            <Server className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <h3 className="text-base leading-tight font-semibold text-slate-800">
              {host.name}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">{host.instance}</p>
          </div>
        </div>

        {/* Status badge */}
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.bg} ${s.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </span>
      </div>

      {/* ── Role tag + uptime ── */}
      <div className="flex items-center justify-between">
        <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium tracking-wide text-indigo-600 uppercase">
          Host Machine
        </span>
        <span className="text-xs text-slate-400">
          Uptime&nbsp;
          <span className="font-medium text-slate-600">
            {host.uptimeSeconds > 0 ? fmtUptime(host.uptimeSeconds) : '—'}
          </span>
        </span>
      </div>

      <hr className="border-slate-100" />

      {/* ── Metrics ── */}
      <div className="flex flex-col gap-3">
        <StatRow
          icon={<Cpu size={14} />}
          label="CPU Usage"
          value={`${host.cpuUsagePercent.toFixed(1)}%`}
          pct={host.cpuUsagePercent}
          colorClass={gaugeColor(host.cpuUsagePercent)}
        />
        <StatRow
          icon={<MemoryStick size={14} />}
          label="Memory"
          value={`${fmtBytes(host.memUsedBytes)} / ${fmtBytes(host.memTotalBytes)}`}
          pct={host.memUsagePercent}
          colorClass={gaugeColor(host.memUsagePercent)}
        />
        <StatRow
          icon={<HardDrive size={14} />}
          label="Disk"
          value={`${fmtBytes(host.diskUsedBytes)} / ${fmtBytes(host.diskTotalBytes)}`}
          pct={host.diskUsagePercent}
          colorClass={gaugeColor(host.diskUsagePercent)}
        />
        <StatRow
          icon={<Network size={14} />}
          label="Network I/O"
          value={`↓ ${fmtBytes(host.networkRxBytesPerSec)}/s  ↑ ${fmtBytes(host.networkTxBytesPerSec)}/s`}
        />
      </div>
    </motion.div>
  )
}

export default HostMachineCard
