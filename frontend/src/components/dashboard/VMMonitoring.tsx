/**
 * VMMonitoring.tsx
 *
 * VM Health + Performance monitoring tables identical in layout
 * to ClusterMonitoring but scoped to VMs (role !== 'host').
 */
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Thermometer,
  Monitor,
  Download,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from 'lucide-react'
import type { NodeMetrics } from '@/types/prometheus'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtBytes(b: number, dec = 1): string {
  if (!b) return '0 B'
  const k = 1024
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(b) / Math.log(k))
  return `${(b / Math.pow(k, i)).toFixed(dec)} ${u[i]}`
}

function fmtSpeed(bps: number): string {
  return `${fmtBytes(bps)}/s`
}

function healthLabel(pct: number): { text: string; cls: string } {
  if (pct >= 90) return { text: 'Critical', cls: 'text-red-600' }
  if (pct >= 75) return { text: 'Warning', cls: 'text-amber-500' }
  return { text: 'Good', cls: 'text-emerald-600' }
}

function StatusIcon({ pct }: { pct: number }) {
  if (pct >= 90) return <XCircle size={13} className="shrink-0 text-red-500" />
  if (pct >= 75)
    return <MinusCircle size={13} className="shrink-0 text-amber-500" />
  return <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
}

function NodeStatusDot({ status }: { status: NodeMetrics['status'] }) {
  const cls =
    status === 'running'
      ? 'bg-emerald-500'
      : status === 'degraded'
        ? 'bg-amber-400'
        : 'bg-red-500'
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />
}

function MiniBar({ pct }: { pct: number }) {
  const color =
    pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-400' : 'bg-emerald-500'
  return (
    <div className="mt-0.5 h-1 w-full rounded-full bg-slate-100">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, pct)}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  )
}

interface ColHeaderProps {
  icon: React.ReactNode
  title: string
  subtitle: string
}
const ColHeader: React.FC<ColHeaderProps> = ({ icon, title, subtitle }) => (
  <th className="border-r border-b border-slate-200 bg-slate-50 px-4 py-3 text-left align-top">
    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
      {icon}
      {title}
    </div>
    <div className="mt-0.5 text-[11px] font-normal text-slate-400">
      {subtitle}
    </div>
  </th>
)

function exportCSV(vms: NodeMetrics[], mode: 'health' | 'performance') {
  let headers: string[]
  let rows: string[][]
  if (mode === 'health') {
    headers = [
      'VM Name',
      'IP',
      'OS',
      'CPU%',
      'CPU Health',
      'Mem%',
      'Mem Health',
      'Disk%',
      'Disk Health',
      'Net Health',
      'Temp °C',
      'Status',
    ]
    rows = vms.map((n) => [
      n.hostname || n.name,
      n.instance,
      n.os,
      n.cpuUsagePercent.toFixed(1),
      healthLabel(n.cpuUsagePercent).text,
      n.memUsagePercent.toFixed(1),
      healthLabel(n.memUsagePercent).text,
      n.diskUsagePercent.toFixed(1),
      healthLabel(n.diskUsagePercent).text,
      'Connected',
      n.tempCelsius != null ? n.tempCelsius.toFixed(1) : 'N/A',
      n.status,
    ])
  } else {
    headers = [
      'VM Name',
      'IP',
      'OS',
      'CPU%',
      'Mem%',
      'Disk%',
      'Net RX/s',
      'Net TX/s',
      'Disk R/s',
      'Disk W/s',
      'Processes',
    ]
    rows = vms.map((n) => [
      n.hostname || n.name,
      n.instance,
      n.os,
      n.cpuUsagePercent.toFixed(1),
      n.memUsagePercent.toFixed(1),
      n.diskUsagePercent.toFixed(1),
      fmtSpeed(n.networkRxBytesPerSec),
      fmtSpeed(n.networkTxBytesPerSec),
      fmtSpeed(n.diskReadBytesPerSec),
      fmtSpeed(n.diskWriteBytesPerSec),
      n.processCount != null ? String(n.processCount) : 'N/A',
    ])
  }
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${c}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vm-${mode}-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

interface Props {
  vms: NodeMetrics[]
  isLoading: boolean
  isFetching: boolean
  onRefresh: () => void
  onNodeClick?: (node: NodeMetrics) => void
}

const VMMonitoring: React.FC<Props> = ({
  vms,
  isLoading,
  isFetching,
  onRefresh,
  onNodeClick,
}) => {
  const [search, setSearch] = useState('')
  const [selectedVM, setSelectedVM] = useState<string>('all')
  const [view, setView] = useState<'health' | 'performance'>('health')

  const filtered = useMemo(() => {
    let list =
      selectedVM === 'all' ? vms : vms.filter((n) => n.instance === selectedVM)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (n) =>
          n.hostname.toLowerCase().includes(q) ||
          n.name.toLowerCase().includes(q) ||
          n.instance.toLowerCase().includes(q)
      )
    }
    return list
  }, [vms, selectedVM, search])

  const totalMemGB = (
    vms.reduce((s, n) => s + n.memTotalBytes, 0) / 1073741824
  ).toFixed(1)
  const totalDiskGB = (
    vms.reduce((s, n) => s + n.diskTotalBytes, 0) / 1073741824
  ).toFixed(1)
  const totalNetBw = vms.reduce(
    (s, n) => s + n.networkRxBytesPerSec + n.networkTxBytesPerSec,
    0
  )
  const avgCpu = vms.length
    ? vms.reduce((s, n) => s + n.cpuUsagePercent, 0) / vms.length
    : 0
  const avgMem = vms.length
    ? vms.reduce((s, n) => s + n.memUsagePercent, 0) / vms.length
    : 0
  const avgDisk = vms.length
    ? vms.reduce((s, n) => s + n.diskUsagePercent, 0) / vms.length
    : 0

  return (
    <div className="flex flex-col gap-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={selectedVM}
          onChange={(e) => setSelectedVM(e.target.value)}
          className="border-input bg-background focus:ring-ring h-8 w-44 rounded-md border px-2 text-xs focus:ring-1 focus:outline-none"
        >
          <option value="all">All VMs</option>
          {vms.map((n) => (
            <option key={n.instance} value={n.instance}>
              {n.hostname || n.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={12}
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
            />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-input bg-background focus:ring-ring h-8 w-40 rounded-md border pr-2 pl-7 text-xs focus:ring-1 focus:outline-none"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isFetching}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCSV(filtered, view)}
            className="h-8 gap-1.5 text-xs"
          >
            <Download size={12} />
            Download
          </Button>
        </div>
      </div>

      {/* ── View toggle ── */}
      <div className="flex gap-2">
        {(['health', 'performance'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors',
              view === v
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            )}
          >
            {v === 'health' ? 'Health Monitoring' : 'Performance Monitoring'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {view === 'health' ? (
          <motion.div
            key="health"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="w-44 border-r border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      VM
                    </th>
                    <ColHeader
                      icon={<Cpu size={13} />}
                      title="CPU Health"
                      subtitle="Usage %"
                    />
                    <ColHeader
                      icon={<MemoryStick size={13} />}
                      title="RAM Health"
                      subtitle={`${totalMemGB} GB total`}
                    />
                    <ColHeader
                      icon={<HardDrive size={13} />}
                      title="Storage Health"
                      subtitle={`${totalDiskGB} GB total`}
                    />
                    <ColHeader
                      icon={<Network size={13} />}
                      title="Network Health"
                      subtitle={`${fmtSpeed(totalNetBw)}`}
                    />
                    <ColHeader
                      icon={<Thermometer size={13} />}
                      title="Temperature"
                      subtitle="°C sensor"
                    />
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          {Array.from({ length: 6 }).map((_, j) => (
                            <td key={j} className="px-4 py-3">
                              <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : filtered.map((n) => {
                        const cpuH = healthLabel(n.cpuUsagePercent)
                        const memH = healthLabel(n.memUsagePercent)
                        const diskH = healthLabel(n.diskUsagePercent)
                        return (
                          <tr
                            key={n.instance}
                            onClick={() => onNodeClick?.(n)}
                            className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-blue-50"
                          >
                            <td className="border-r border-slate-100 px-4 py-3">
                              <div className="flex items-center gap-2">
                                <NodeStatusDot status={n.status} />
                                <div>
                                  <p className="text-xs font-semibold text-slate-700">
                                    {n.hostname || n.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    {n.instance}
                                  </p>
                                  <div className="mt-0.5 flex gap-1">
                                    <Badge
                                      variant="outline"
                                      className="h-4 px-1 text-[9px]"
                                    >
                                      {n.os}
                                    </Badge>
                                    <Badge
                                      variant="secondary"
                                      className="h-4 px-1 text-[9px]"
                                    >
                                      VM
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="border-r border-slate-100 px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <StatusIcon pct={n.cpuUsagePercent} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex justify-between">
                                    <span className="text-xs text-slate-600">
                                      {n.cpuUsagePercent.toFixed(1)}%
                                    </span>
                                    <span
                                      className={cn(
                                        'text-[11px] font-semibold',
                                        cpuH.cls
                                      )}
                                    >
                                      {cpuH.text}
                                    </span>
                                  </div>
                                  <MiniBar pct={n.cpuUsagePercent} />
                                  {n.cpuCores > 0 && (
                                    <span className="text-[10px] text-slate-400">
                                      {n.cpuCores} cores
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="border-r border-slate-100 px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <StatusIcon pct={n.memUsagePercent} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex justify-between">
                                    <span className="text-xs text-slate-600">
                                      {n.memUsagePercent.toFixed(1)}%
                                    </span>
                                    <span
                                      className={cn(
                                        'text-[11px] font-semibold',
                                        memH.cls
                                      )}
                                    >
                                      {memH.text}
                                    </span>
                                  </div>
                                  <MiniBar pct={n.memUsagePercent} />
                                  <span className="text-[10px] text-slate-400">
                                    {fmtBytes(n.memUsedBytes)} /{' '}
                                    {fmtBytes(n.memTotalBytes)}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="border-r border-slate-100 px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <StatusIcon pct={n.diskUsagePercent} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex justify-between">
                                    <span className="text-xs text-slate-600">
                                      {n.diskUsagePercent.toFixed(1)}%
                                    </span>
                                    <span
                                      className={cn(
                                        'text-[11px] font-semibold',
                                        diskH.cls
                                      )}
                                    >
                                      {diskH.text}
                                    </span>
                                  </div>
                                  <MiniBar pct={n.diskUsagePercent} />
                                  <span className="text-[10px] text-slate-400">
                                    {fmtBytes(n.diskUsedBytes)} /{' '}
                                    {fmtBytes(n.diskTotalBytes)}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="border-r border-slate-100 px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2
                                  size={13}
                                  className="shrink-0 text-emerald-500"
                                />
                                <div>
                                  <p className="text-[11px] font-semibold text-emerald-600">
                                    Connected
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    ↓ {fmtSpeed(n.networkRxBytesPerSec)}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    ↑ {fmtSpeed(n.networkTxBytesPerSec)}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {n.tempCelsius != null ? (
                                <div className="flex items-center gap-1.5">
                                  <Thermometer
                                    size={13}
                                    className={
                                      n.tempCelsius > 80
                                        ? 'text-red-500'
                                        : n.tempCelsius > 60
                                          ? 'text-amber-500'
                                          : 'text-emerald-500'
                                    }
                                  />
                                  <span className="text-xs font-semibold">
                                    {n.tempCelsius.toFixed(0)}°C
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400">
                                  N/A
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                  {!isLoading && filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-10 text-center text-sm text-slate-400"
                      >
                        <Monitor className="mx-auto mb-2 h-7 w-7 opacity-30" />
                        No VMs match the filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="performance"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="w-44 border-r border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      VM
                    </th>
                    <ColHeader
                      icon={<Cpu size={13} />}
                      title="Avg. CPU Usage"
                      subtitle={`Fleet avg ${avgCpu.toFixed(1)}%`}
                    />
                    <ColHeader
                      icon={<MemoryStick size={13} />}
                      title="Avg. RAM Usage"
                      subtitle={`Fleet avg ${avgMem.toFixed(1)}%`}
                    />
                    <ColHeader
                      icon={<HardDrive size={13} />}
                      title="Avg. Storage"
                      subtitle={`Fleet avg ${avgDisk.toFixed(1)}%`}
                    />
                    <ColHeader
                      icon={<Network size={13} />}
                      title="Network Speed"
                      subtitle={`Total ${fmtSpeed(totalNetBw)}`}
                    />
                    <ColHeader
                      icon={<HardDrive size={13} />}
                      title="Disk I/O"
                      subtitle="Read / Write /s"
                    />
                    <ColHeader
                      icon={<Cpu size={13} />}
                      title="Processes"
                      subtitle="Running"
                    />
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          {Array.from({ length: 7 }).map((_, j) => (
                            <td key={j} className="px-4 py-3">
                              <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : filtered.map((n) => (
                        <tr
                          key={n.instance}
                          onClick={() => onNodeClick?.(n)}
                          className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-blue-50"
                        >
                          <td className="border-r border-slate-100 px-4 py-3">
                            <div className="flex items-center gap-2">
                              <NodeStatusDot status={n.status} />
                              <div>
                                <p className="text-xs font-semibold text-slate-700">
                                  {n.hostname || n.name}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {n.instance}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="border-r border-slate-100 px-4 py-3">
                            <p className="text-xs font-semibold text-slate-700">
                              {n.cpuUsagePercent.toFixed(1)}%
                            </p>
                            <MiniBar pct={n.cpuUsagePercent} />
                            {n.cpuCores > 0 && (
                              <p className="text-[10px] text-slate-400">
                                {n.cpuCores} cores
                              </p>
                            )}
                          </td>
                          <td className="border-r border-slate-100 px-4 py-3">
                            <p className="text-xs font-semibold text-slate-700">
                              {n.memUsagePercent.toFixed(1)}%
                            </p>
                            <MiniBar pct={n.memUsagePercent} />
                            <p className="text-[10px] text-slate-400">
                              {fmtBytes(n.memUsedBytes)} /{' '}
                              {fmtBytes(n.memTotalBytes)}
                            </p>
                          </td>
                          <td className="border-r border-slate-100 px-4 py-3">
                            <p className="text-xs font-semibold text-slate-700">
                              {n.diskUsagePercent.toFixed(1)}%
                            </p>
                            <MiniBar pct={n.diskUsagePercent} />
                            <p className="text-[10px] text-slate-400">
                              {fmtBytes(n.diskUsedBytes)} /{' '}
                              {fmtBytes(n.diskTotalBytes)}
                            </p>
                          </td>
                          <td className="border-r border-slate-100 px-4 py-3">
                            <p className="text-[11px] text-slate-600">
                              ↓ {fmtSpeed(n.networkRxBytesPerSec)}
                            </p>
                            <p className="text-[11px] text-slate-600">
                              ↑ {fmtSpeed(n.networkTxBytesPerSec)}
                            </p>
                          </td>
                          <td className="border-r border-slate-100 px-4 py-3">
                            <p className="text-[11px] text-slate-600">
                              R: {fmtSpeed(n.diskReadBytesPerSec)}
                            </p>
                            <p className="text-[11px] text-slate-600">
                              W: {fmtSpeed(n.diskWriteBytesPerSec)}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            {n.processCount != null ? (
                              <p className="text-xs font-semibold text-slate-700">
                                {n.processCount}
                              </p>
                            ) : (
                              <p className="text-[11px] text-slate-400">N/A</p>
                            )}
                          </td>
                        </tr>
                      ))}
                  {!isLoading && filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-10 text-center text-sm text-slate-400"
                      >
                        No VMs match the filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default VMMonitoring
