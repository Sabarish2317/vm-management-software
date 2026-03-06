import { motion } from 'framer-motion'
import {
  Monitor,
  Server,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  Thermometer,
  Layers,
  Gpu,
} from 'lucide-react'
import type { NodeMetrics, VMStatus } from '@/types/prometheus'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

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

// ─── status config ────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

const statusConfig: Record<
  VMStatus,
  {
    bg: string
    text: string
    dot: string
    label: string
    border: string
    variant: BadgeVariant
    iconClass: string
  }
> = {
  running: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    dot: 'bg-emerald-500',
    label: 'Running',
    border: 'border-slate-200',
    variant: 'default',
    iconClass: 'text-emerald-600',
  },
  degraded: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    dot: 'bg-amber-500',
    label: 'Degraded',
    border: 'border-amber-200',
    variant: 'outline',
    iconClass: 'text-amber-600',
  },
  unreachable: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    dot: 'bg-red-500',
    label: 'Unreachable',
    border: 'border-red-200',
    variant: 'destructive',
    iconClass: 'text-red-500',
  },
}

// ─── VMCard ───────────────────────────────────────────────────────────────────

interface VMCardProps {
  vm: NodeMetrics
  index?: number
}

const VMCard: React.FC<VMCardProps> = ({ vm, index = 0 }) => {
  const s = statusConfig[vm.status]
  const OsIcon = vm.os === 'windows' ? Monitor : Server

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
    >
      <Card className="gap-0 py-0 transition-shadow hover:shadow-md">
        <CardHeader className="flex-row items-center justify-between gap-2 border-b px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border">
              <OsIcon className={cn('h-4 w-4', s.iconClass)} />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-sm">{vm.name}</CardTitle>
              {vm.hostname && vm.hostname !== vm.name && (
                <p className="truncate text-[10px] font-medium text-slate-500">
                  {vm.hostname}
                </p>
              )}
              <CardDescription className="truncate text-xs">
                {vm.instance}
              </CardDescription>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant={s.variant} className="text-xs">
              {s.dot && (
                <span className={cn('mr-1 h-1.5 w-1.5 rounded-full', s.dot)} />
              )}
              {s.label}
            </Badge>
            <Badge variant="outline" className="h-4 px-1 text-[9px]">
              {vm.os}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="px-4 py-3">
          {vm.up ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {/* CPU */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                    <Cpu size={10} /> CPU
                  </span>
                  <span className="text-[11px] font-semibold">
                    {vm.cpuUsagePercent.toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={vm.cpuUsagePercent}
                  className={cn('h-1', gaugeColor(vm.cpuUsagePercent))}
                />
              </div>
              {/* RAM */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                    <MemoryStick size={10} /> RAM
                  </span>
                  <span className="text-[11px] font-semibold">
                    {vm.memUsagePercent.toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={vm.memUsagePercent}
                  className={cn('h-1', gaugeColor(vm.memUsagePercent))}
                />
              </div>
              {/* Disk */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                    <HardDrive size={10} /> Disk
                  </span>
                  <span className="text-[11px] font-semibold">
                    {vm.diskUsagePercent.toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={vm.diskUsagePercent}
                  className={cn('h-1', gaugeColor(vm.diskUsagePercent))}
                />
              </div>
              {/* Network */}
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                  <Network size={10} /> Net
                </span>
                <p className="text-foreground text-[10px] leading-tight">
                  ↓{fmtBytes(vm.networkRxBytesPerSec)}/s
                  <br />↑{fmtBytes(vm.networkTxBytesPerSec)}/s
                </p>
              </div>
              {/* VRAM — always shown; N/A when no GPU */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                    <Gpu size={10} /> VRAM
                  </span>
                  <span
                    className={cn(
                      'text-[11px] font-semibold',
                      vm.vramUsagePercent == null && 'text-muted-foreground'
                    )}
                  >
                    {vm.vramUsagePercent != null
                      ? `${vm.vramUsagePercent.toFixed(1)}%`
                      : 'N/A'}
                  </span>
                </div>
                {vm.vramUsagePercent != null ? (
                  <Progress
                    value={vm.vramUsagePercent}
                    className={cn('h-1', gaugeColor(vm.vramUsagePercent))}
                  />
                ) : (
                  <div className="mt-1 h-1 w-full rounded-full bg-slate-100" />
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground py-2 text-center text-xs">
              Metrics unavailable — node unreachable
            </p>
          )}

          {vm.up && (
            <>
              <p className="text-muted-foreground mt-3 border-t pt-2 text-[10px]">
                Mem {fmtBytes(vm.memUsedBytes)} / {fmtBytes(vm.memTotalBytes)} ·{' '}
                Disk {fmtBytes(vm.diskUsedBytes)} /{' '}
                {fmtBytes(vm.diskTotalBytes)}
              </p>
              <div className="text-muted-foreground mt-1.5 flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1">
                  <Layers size={9} /> I/O
                </span>
                <span>R: {fmtBytes(vm.diskReadBytesPerSec)}/s</span>
                <span>W: {fmtBytes(vm.diskWriteBytesPerSec)}/s</span>
                {vm.processCount != null && (
                  <span>· {vm.processCount} procs</span>
                )}
                {vm.tempCelsius != null && (
                  <span className="flex items-center gap-0.5">
                    <Thermometer size={9} />
                    {vm.tempCelsius.toFixed(0)}°C
                  </span>
                )}
              </div>
              <p className="text-muted-foreground mt-1 text-[10px]">
                VRAM{' '}
                {vm.vramTotalBytes != null && vm.vramUsedBytes != null
                  ? `${fmtBytes(vm.vramUsedBytes)} / ${fmtBytes(vm.vramTotalBytes)}`
                  : 'N/A'}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default VMCard
