/**
 * NodeDetailDialog.tsx
 *
 * Click a row in ClusterMonitoring or VMMonitoring to open this popup.
 * Shows a 5-minute time-series line chart for the selected metric category.
 *
 * Tabs: CPU (default) | RAM | Storage | Network | vRAM (when available)
 *   - CPU:     cpuUsage % (green) + cpuTemp °C (orange, if sensor present)
 *   - RAM:     ramUsage % (blue)
 *   - Storage: diskRead MB/s (teal) + diskWrite MB/s (rose)
 *   - Network: netRx KB/s (indigo) + netTx KB/s (pink)
 *   - vRAM:    vramUsage % (purple)
 */
import React, { useState, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { X, Cpu, MemoryStick, HardDrive, Network, Layers } from 'lucide-react'
import type { NodeMetrics } from '@/types/prometheus'
import { fetchNodeHistory } from '@/queries/prometheusService'
import DialogBox from '@/components/common/DialogBox'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtBytes(b: number, dec = 1): string {
  if (!b) return '0 B'
  const k = 1024
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(b) / Math.log(k))
  return `${(b / Math.pow(k, i)).toFixed(dec)} ${u[i]}`
}

function fmtTime(t: number | string): string {
  return new Date(Number(t) * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────

type MetricTab = 'cpu' | 'ram' | 'storage' | 'network' | 'vram'

interface Props {
  node: NodeMetrics
  onClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

const NodeDetailDialog: React.FC<Props> = ({ node, onClose }) => {
  const [activeTab, setActiveTab] = useState<MetricTab>('cpu')
  const [isOpen, setIsOpen] = useState(true)

  // Proxy the DialogBox setter so we can call onClose when it closes
  const handleSetOpen: React.Dispatch<React.SetStateAction<boolean>> = (
    val
  ) => {
    const next = typeof val === 'function' ? val(isOpen) : val
    setIsOpen(next)
    if (!next) onClose()
  }

  const {
    data: history,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['nodeHistory', node.instance, node.os],
    queryFn: () => fetchNodeHistory(node.instance, node.os),
    refetchInterval: 15_000,
    staleTime: 10_000,
  })

  const hasVram = (node.vramTotalBytes ?? 0) > 0

  const tabs: { id: MetricTab; label: string; icon: React.ReactNode }[] = [
    { id: 'cpu', label: 'CPU', icon: <Cpu size={12} /> },
    { id: 'ram', label: 'RAM', icon: <MemoryStick size={12} /> },
    { id: 'storage', label: 'Storage', icon: <HardDrive size={12} /> },
    { id: 'network', label: 'Network', icon: <Network size={12} /> },
    ...(hasVram
      ? [{ id: 'vram' as MetricTab, label: 'vRAM', icon: <Layers size={12} /> }]
      : []),
  ]

  // ─── Chart data ────────────────────────────────────────────────────────────

  const chartData = useMemo(() => {
    if (!history) return []

    switch (activeTab) {
      case 'cpu': {
        // Merge cpu + cpuTemp by timestamp
        const map = new Map<number, Record<string, number>>()
        history.cpu.forEach((p) =>
          map.set(p.t, { ...map.get(p.t), cpu: Math.round(p.v * 10) / 10 })
        )
        history.cpuTemp?.forEach((p) =>
          map.set(p.t, {
            ...map.get(p.t),
            cpuTemp: Math.round(p.v * 10) / 10,
          })
        )
        return Array.from(map.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([t, v]) => ({ t, ...v }))
      }

      case 'ram':
        return history.ram.map((p) => ({
          t: p.t,
          ram: Math.round(p.v * 10) / 10,
        }))

      case 'storage':
        return history.diskRead.map((p, i) => ({
          t: p.t,
          read: Math.round((p.v / 1024 / 1024) * 100) / 100,
          write:
            Math.round(((history.diskWrite[i]?.v ?? 0) / 1024 / 1024) * 100) /
            100,
        }))

      case 'network':
        return history.networkRx.map((p, i) => ({
          t: p.t,
          rx: Math.round((p.v / 1024) * 100) / 100,
          tx: Math.round(((history.networkTx[i]?.v ?? 0) / 1024) * 100) / 100,
        }))

      case 'vram':
        return (history.vram ?? []).map((p) => ({
          t: p.t,
          vram: Math.round(p.v * 10) / 10,
        }))

      default:
        return []
    }
  }, [history, activeTab])

  // ─── Chart renderer ────────────────────────────────────────────────────────

  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="flex h-56 flex-col gap-2 pt-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-full w-full" />
        </div>
      )
    }

    if (isError || !chartData.length) {
      return (
        <div className="flex h-56 flex-col items-center justify-center gap-1">
          <p className="text-sm font-medium text-slate-400">
            {isError ? 'Failed to load history' : 'No data available'}
          </p>
          <p className="text-xs text-slate-300">
            {isError
              ? 'Check that the backend is reachable'
              : 'Data will appear once Prometheus has enough samples'}
          </p>
        </div>
      )
    }

    const commonProps = {
      data: chartData,
      margin: { top: 8, right: 16, left: 0, bottom: 4 },
    }

    const xAxis = (
      <XAxis
        dataKey="t"
        tickFormatter={fmtTime}
        tick={{ fontSize: 10, fill: '#94a3b8' }}
        axisLine={{ stroke: '#e2e8f0' }}
        tickLine={false}
        minTickGap={55}
      />
    )

    const grid = <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

    if (activeTab === 'cpu') {
      const hasTempData = chartData.some((d) => 'cpuTemp' in d)
      return (
        <ResponsiveContainer width="100%" height={224}>
          <LineChart {...commonProps}>
            {grid}
            {xAxis}
            <YAxis
              yAxisId="left"
              domain={[0, 100]}
              unit="%"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              width={38}
            />
            {hasTempData && (
              <YAxis
                yAxisId="right"
                orientation="right"
                unit="°C"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={42}
              />
            )}
            <Tooltip
              formatter={(val, name) =>
                name === 'cpuUsage'
                  ? [`${val}%`, 'CPU Usage']
                  : [`${val}°C`, 'CPU Temp']
              }
              labelFormatter={(t) => fmtTime(t)}
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="cpu"
              name="cpuUsage"
              stroke="#22c55e"
              dot={false}
              strokeWidth={2}
              activeDot={{ r: 4 }}
            />
            {hasTempData && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cpuTemp"
                name="cpuTemp"
                stroke="#f97316"
                dot={false}
                strokeWidth={2}
                activeDot={{ r: 4 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )
    }

    if (activeTab === 'ram') {
      return (
        <ResponsiveContainer width="100%" height={224}>
          <LineChart {...commonProps}>
            {grid}
            {xAxis}
            <YAxis
              domain={[0, 100]}
              unit="%"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              width={38}
            />
            <Tooltip
              formatter={(val) => [`${val}%`, 'RAM Usage']}
              labelFormatter={(t) => fmtTime(t)}
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="ram"
              name="RAM Usage"
              stroke="#3b82f6"
              dot={false}
              strokeWidth={2}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )
    }

    if (activeTab === 'storage') {
      return (
        <ResponsiveContainer width="100%" height={224}>
          <LineChart {...commonProps}>
            {grid}
            {xAxis}
            <YAxis
              unit=" MB/s"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip
              formatter={(val, name) => [`${val} MB/s`, name]}
              labelFormatter={(t) => fmtTime(t)}
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="read"
              name="Disk Read"
              stroke="#14b8a6"
              dot={false}
              strokeWidth={2}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="write"
              name="Disk Write"
              stroke="#f43f5e"
              dot={false}
              strokeWidth={2}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )
    }

    if (activeTab === 'network') {
      return (
        <ResponsiveContainer width="100%" height={224}>
          <LineChart {...commonProps}>
            {grid}
            {xAxis}
            <YAxis
              unit=" KB/s"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip
              formatter={(val, name) => [`${val} KB/s`, name]}
              labelFormatter={(t) => fmtTime(t)}
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="rx"
              name="Receive"
              stroke="#6366f1"
              dot={false}
              strokeWidth={2}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="tx"
              name="Transmit"
              stroke="#ec4899"
              dot={false}
              strokeWidth={2}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )
    }

    if (activeTab === 'vram') {
      return (
        <ResponsiveContainer width="100%" height={224}>
          <LineChart {...commonProps}>
            {grid}
            {xAxis}
            <YAxis
              domain={[0, 100]}
              unit="%"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              width={38}
            />
            <Tooltip
              formatter={(val) => [`${val}%`, 'VRAM Usage']}
              labelFormatter={(t) => fmtTime(t)}
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="vram"
              name="VRAM Usage"
              stroke="#a855f7"
              dot={false}
              strokeWidth={2}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )
    }

    return null
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <DialogBox
          setToggleDialogueBox={handleSetOpen}
          width="min(92vw, 760px)"
        >
          {/* ── Header ── */}
          <div className="flex w-full items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-slate-800">
                  {node.hostname || node.name}
                </h2>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px]',
                    node.status === 'running'
                      ? 'border-emerald-300 text-emerald-600'
                      : node.status === 'degraded'
                        ? 'border-amber-300 text-amber-600'
                        : 'border-red-300 text-red-600'
                  )}
                >
                  {node.status}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {node.os}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {node.role}
                </Badge>
              </div>
              <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                {node.instance}
              </p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 cursor-pointer rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>

          {/* ── Stat chips ── */}
          <div className="mt-3 flex w-full flex-wrap gap-2">
            {[
              {
                label: 'CPU',
                val: `${node.cpuUsagePercent.toFixed(1)}%`,
                color: '#22c55e',
              },
              {
                label: 'RAM',
                val: `${node.memUsagePercent.toFixed(1)}%`,
                color: '#3b82f6',
              },
              {
                label: 'Disk',
                val: `${node.diskUsagePercent.toFixed(1)}%`,
                color: '#a855f7',
              },
              {
                label: 'Net',
                val: `↓${fmtBytes(node.networkRxBytesPerSec)}/s  ↑${fmtBytes(node.networkTxBytesPerSec)}/s`,
                color: '#6366f1',
              },
              ...(node.vramUsagePercent != null
                ? [
                    {
                      label: 'vRAM',
                      val: `${node.vramUsagePercent.toFixed(1)}%`,
                      color: '#ec4899',
                    },
                  ]
                : []),
              ...(node.tempCelsius != null
                ? [
                    {
                      label: 'Temp',
                      val: `${node.tempCelsius.toFixed(0)}°C`,
                      color: '#f97316',
                    },
                  ]
                : []),
              ...(node.cpuCores > 0
                ? [
                    {
                      label: 'Cores',
                      val: String(node.cpuCores),
                      color: '#64748b',
                    },
                  ]
                : []),
            ].map(({ label, val, color }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-slate-50 px-2.5 py-1 text-xs"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: color }}
                />
                <span className="font-medium text-slate-500">{label}</span>
                <span className="font-semibold text-slate-700">{val}</span>
              </span>
            ))}
          </div>

          {/* ── Metric tab pills ── */}
          <div className="mt-4 flex w-full gap-1.5 border-b border-slate-100 pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
            <span className="ml-auto self-center text-[10px] text-slate-400">
              Last 5 min · 15 s resolution
            </span>
          </div>

          {/* ── Chart ── */}
          <div className="mt-2 w-full">{renderChart()}</div>

          {/* ── Footer ── */}
          <p className="mt-1 w-full text-right text-[10px] text-slate-300">
            auto-refreshes every 15 s
          </p>
        </DialogBox>
      )}
    </AnimatePresence>
  )
}

export default NodeDetailDialog
