/**
 * ClusterMonitoring.tsx
 *
 * Cluster Health Monitoring + Cluster Performance Monitoring tables.
 * Matches the wireframe: tabular view with per-device rows and
 * aggregate header columns showing totals/averages.
 */
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Thermometer,
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

function fmtBytes(b: number, decimals = 1): string {
  if (!b) return '0 B'
  const k = 1024
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(b) / Math.log(k))
  return `${(b / Math.pow(k, i)).toFixed(decimals)} ${units[i]}`
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

// ─── mini bar ────────────────────────────────────────────────────────────────

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

// ─── section header col ───────────────────────────────────────────────────────

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

// ─── export CSV ──────────────────────────────────────────────────────────────

function exportCSV(nodes: NodeMetrics[], mode: 'health' | 'performance') {
  let headers: string[]
  let rows: string[][]

  if (mode === 'health') {
    headers = [
      'Device Name',
      'IP',
      'OS',
      'CPU%',
      'CPU Health',
      'Mem%',
      'Mem Health',
      'Disk%',
      'Disk Health',
      'Net RX/s',
      'Net TX/s',
      'Net Health',
      'Temp °C',
      'Status',
    ]
    rows = nodes.map((n) => [
      n.hostname || n.name,
      n.instance,
      n.os,
      n.cpuUsagePercent.toFixed(1),
      healthLabel(n.cpuUsagePercent).text,
      n.memUsagePercent.toFixed(1),
      healthLabel(n.memUsagePercent).text,
      n.diskUsagePercent.toFixed(1),
      healthLabel(n.diskUsagePercent).text,
      fmtSpeed(n.networkRxBytesPerSec),
      fmtSpeed(n.networkTxBytesPerSec),
      'Connected',
      n.tempCelsius != null ? n.tempCelsius.toFixed(1) : 'N/A',
      n.status,
    ])
  } else {
    headers = [
      'Device Name',
      'IP',
      'OS',
      'Avg CPU%',
      'Avg Mem%',
      'Avg Disk%',
      'Net Speed RX',
      'Net Speed TX',
      'Disk R/s',
      'Disk W/s',
      'Load 1m',
      'Processes',
    ]
    rows = nodes.map((n) => [
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
      n.loadAvg1m != null ? n.loadAvg1m.toFixed(2) : 'N/A',
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
  a.download = `cluster-${mode}-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  nodes: NodeMetrics[]
  isLoading: boolean
  isFetching: boolean
  onRefresh: () => void
}

// ─── ClusterMonitoring ────────────────────────────────────────────────────────

const ClusterMonitoring: React.FC<Props> = ({
  nodes,
  isLoading,
  isFetching,
  onRefresh,
}) => {
  const [search, setSearch] = useState('')
  const [selectedNode, setSelectedNode] = useState<string>('all')
  const [view, setView] = useState<'health' | 'performance'>('health')

  const filtered = useMemo(() => {
    let list =
      selectedNode === 'all'
        ? nodes
        : nodes.filter((n) => n.instance === selectedNode)
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
  }, [nodes, selectedNode, search])

  // Aggregates
  const totalCores = nodes.reduce((s, n) => s + (n.cpuCores ?? 0), 0)
  const totalMemGB = (
    nodes.reduce((s, n) => s + n.memTotalBytes, 0) / 1073741824
  ).toFixed(1)
  const totalDiskGB = (
    nodes.reduce((s, n) => s + n.diskTotalBytes, 0) / 1073741824
  ).toFixed(1)
  const totalNetBw = nodes.reduce(
    (s, n) => s + n.networkRxBytesPerSec + n.networkTxBytesPerSec,
    0
  )
  const avgCpu = nodes.length
    ? nodes.reduce((s, n) => s + n.cpuUsagePercent, 0) / nodes.length
    : 0
  const avgMem = nodes.length
    ? nodes.reduce((s, n) => s + n.memUsagePercent, 0) / nodes.length
    : 0
  const avgDisk = nodes.length
    ? nodes.reduce((s, n) => s + n.diskUsagePercent, 0) / nodes.length
    : 0

  return (
    <div className="flex flex-col gap-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Node selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedNode}
            onChange={(e) => setSelectedNode(e.target.value)}
            className="border-input bg-background focus:ring-ring h-8 w-44 rounded-md border px-2 text-xs focus:ring-1 focus:outline-none"
          >
            <option value="all">All Nodes</option>
            {nodes.map((n) => (
              <option key={n.instance} value={n.instance}>
                {n.hostname || n.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search + actions */}
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
        <button
          onClick={() => setView('health')}
          className={cn(
            'rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors',
            view === 'health'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          )}
        >
          Health Monitoring
        </button>
        <button
          onClick={() => setView('performance')}
          className={cn(
            'rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors',
            view === 'performance'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          )}
        >
          Performance Monitoring
        </button>
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
            {/* ── Cluster Health Table ── */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="w-44 border-r border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Device
                    </th>
                    <ColHeader
                      icon={<Cpu size={13} />}
                      title="CPU Health"
                      subtitle={`${totalCores} Cores`}
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
                      subtitle={`${fmtSpeed(totalNetBw)} total`}
                    />
                    <ColHeader
                      icon={<Thermometer size={13} />}
                      title="Temperature"
                      subtitle="Sensor avg °C"
                    />
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          {Array.from({ length: 6 }).map((_, j) => (
                            <td key={j} className="px-4 py-3">
                              <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
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
                            className="border-b border-slate-100 transition-colors hover:bg-slate-50"
                          >
                            {/* Device */}
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
                                  <Badge
                                    variant="outline"
                                    className="mt-0.5 h-4 px-1 text-[9px]"
                                  >
                                    {n.os}
                                  </Badge>
                                </div>
                              </div>
                            </td>
                            {/* CPU */}
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
                            {/* RAM */}
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
                            {/* Storage */}
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
                            {/* Network */}
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
                            {/* Temp */}
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
                        No nodes match the filter.
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
            {/* ── Cluster Performance Table ── */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="w-44 border-r border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Device
                    </th>
                    <ColHeader
                      icon={<Cpu size={13} />}
                      title="Avg. CPU Usage"
                      subtitle={`Cluster avg ${avgCpu.toFixed(1)}%`}
                    />
                    <ColHeader
                      icon={<MemoryStick size={13} />}
                      title="Avg. RAM Usage"
                      subtitle={`Cluster avg ${avgMem.toFixed(1)}%`}
                    />
                    <ColHeader
                      icon={<HardDrive size={13} />}
                      title="Avg. Storage Usage"
                      subtitle={`Cluster avg ${avgDisk.toFixed(1)}%`}
                    />
                    <ColHeader
                      icon={<Network size={13} />}
                      title="Avg. Network Speed"
                      subtitle={`Total ${fmtSpeed(totalNetBw)}`}
                    />
                    <ColHeader
                      icon={<HardDrive size={13} />}
                      title="Disk I/O"
                      subtitle="Read / Write /s"
                    />
                    <ColHeader
                      icon={<Cpu size={13} />}
                      title="Load Avg / Procs"
                      subtitle="1m · 5m · 15m"
                    />
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 3 }).map((_, i) => (
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
                          className="border-b border-slate-100 transition-colors hover:bg-slate-50"
                        >
                          {/* Device */}
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
                          {/* CPU */}
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
                          {/* RAM */}
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
                          {/* Storage */}
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
                          {/* Network speed */}
                          <td className="border-r border-slate-100 px-4 py-3">
                            <p className="text-[11px] text-slate-600">
                              ↓ {fmtSpeed(n.networkRxBytesPerSec)}
                            </p>
                            <p className="text-[11px] text-slate-600">
                              ↑ {fmtSpeed(n.networkTxBytesPerSec)}
                            </p>
                          </td>
                          {/* Disk I/O */}
                          <td className="border-r border-slate-100 px-4 py-3">
                            <p className="text-[11px] text-slate-600">
                              R: {fmtSpeed(n.diskReadBytesPerSec)}
                            </p>
                            <p className="text-[11px] text-slate-600">
                              W: {fmtSpeed(n.diskWriteBytesPerSec)}
                            </p>
                          </td>
                          {/* Load / Procs */}
                          <td className="px-4 py-3">
                            {n.loadAvg1m != null ? (
                              <p className="text-[11px] text-slate-600">
                                {n.loadAvg1m.toFixed(2)} ·{' '}
                                {n.loadAvg5m?.toFixed(2)} ·{' '}
                                {n.loadAvg15m?.toFixed(2)}
                              </p>
                            ) : (
                              <p className="text-[11px] text-slate-400">N/A</p>
                            )}
                            {n.processCount != null && (
                              <p className="text-[10px] text-slate-400">
                                {n.processCount} procs
                              </p>
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
                        No nodes match the filter.
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

export default ClusterMonitoring
