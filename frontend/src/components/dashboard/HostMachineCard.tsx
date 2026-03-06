import { motion } from 'framer-motion'
import {
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Clock,
  Thermometer,
  Activity,
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
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

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

interface StatRowProps {
  icon: React.ReactNode
  label: string
  value: string
  pct?: number
  danger?: boolean
}

const StatRow: React.FC<StatRowProps> = ({
  icon,
  label,
  value,
  pct,
  danger,
}) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center justify-between">
      <div className="text-muted-foreground flex items-center gap-2">
        <span className="text-muted-foreground/70">{icon}</span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span
        className={cn(
          'text-xs font-semibold',
          danger ? 'text-destructive' : 'text-foreground'
        )}
      >
        {value}
      </span>
    </div>
    {pct !== undefined && (
      <Progress
        value={pct}
        className={cn(
          'h-1.5',
          danger && '[&>[data-slot=progress-indicator]]:bg-destructive'
        )}
      />
    )}
  </div>
)

// ─── status config ───────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

const statusConfig: Record<
  VMStatus,
  { variant: BadgeVariant; label: string; dot: string }
> = {
  running: { variant: 'default', label: 'Online', dot: 'bg-green-400' },
  degraded: { variant: 'outline', label: 'Degraded', dot: 'bg-amber-400' },
  unreachable: { variant: 'destructive', label: 'Unreachable', dot: '' },
}

function isDanger(pct: number): boolean {
  return pct >= 85
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
    >
      <Card className="gap-0 py-0 transition-shadow hover:shadow-md">
        <CardHeader className="border-b px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                <Server className="text-muted-foreground h-5 w-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="truncate text-sm">{host.name}</CardTitle>
                {host.hostname && host.hostname !== host.name && (
                  <p className="truncate text-[11px] font-medium text-slate-500">
                    {host.hostname}
                  </p>
                )}
                <CardDescription className="mt-0.5 truncate text-xs">
                  {host.instance}
                </CardDescription>
              </div>
            </div>

            <Badge variant={s.variant} className="shrink-0">
              {s.dot && (
                <span className={cn('mr-1 h-1.5 w-1.5 rounded-full', s.dot)} />
              )}
              {s.label}
            </Badge>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <Badge
              variant="outline"
              className="text-xs tracking-wide uppercase"
            >
              Host Machine
            </Badge>
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Clock size={11} />
              {host.uptimeSeconds > 0 ? fmtUptime(host.uptimeSeconds) : '—'}
            </span>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 px-5 py-4">
          <StatRow
            icon={<Cpu size={13} />}
            label={host.cpuCores > 0 ? `CPU (${host.cpuCores} cores)` : 'CPU'}
            value={`${host.cpuUsagePercent.toFixed(1)}%`}
            pct={host.cpuUsagePercent}
            danger={isDanger(host.cpuUsagePercent)}
          />
          {host.loadAvg1m != null && (
            <>
              <StatRow
                icon={<Activity size={13} />}
                label="Load avg (1m / 5m / 15m)"
                value={`${host.loadAvg1m.toFixed(2)} / ${host.loadAvg5m?.toFixed(2) ?? '—'} / ${host.loadAvg15m?.toFixed(2) ?? '—'}`}
              />
            </>
          )}
          <Separator />
          <StatRow
            icon={<MemoryStick size={13} />}
            label="Memory"
            value={`${fmtBytes(host.memUsedBytes)} / ${fmtBytes(host.memTotalBytes)}`}
            pct={host.memUsagePercent}
            danger={isDanger(host.memUsagePercent)}
          />
          <Separator />
          <StatRow
            icon={<HardDrive size={13} />}
            label="Disk"
            value={`${fmtBytes(host.diskUsedBytes)} / ${fmtBytes(host.diskTotalBytes)}`}
            pct={host.diskUsagePercent}
            danger={isDanger(host.diskUsagePercent)}
          />
          <StatRow
            icon={<Layers size={13} />}
            label="Disk I/O"
            value={`R: ${fmtBytes(host.diskReadBytesPerSec)}/s  W: ${fmtBytes(host.diskWriteBytesPerSec)}/s`}
          />
          <Separator />
          <StatRow
            icon={<Network size={13} />}
            label="Network I/O"
            value={`↓${fmtBytes(host.networkRxBytesPerSec)}/s  ↑${fmtBytes(host.networkTxBytesPerSec)}/s`}
          />
          <Separator />
          {host.tempCelsius != null && (
            <>
              <StatRow
                icon={<Thermometer size={13} />}
                label="Temperature"
                value={`${host.tempCelsius.toFixed(1)} °C`}
                danger={host.tempCelsius > 80}
              />
              <Separator />
            </>
          )}
          {host.processCount != null && (
            <StatRow
              icon={<Activity size={13} />}
              label="Processes"
              value={String(host.processCount)}
            />
          )}
          <Separator />
          <StatRow
            icon={<Gpu size={13} />}
            label="GPU VRAM"
            value={
              host.vramTotalBytes != null && host.vramUsedBytes != null
                ? `${fmtBytes(host.vramUsedBytes)} / ${fmtBytes(host.vramTotalBytes)}`
                : 'N/A'
            }
            pct={host.vramUsagePercent ?? undefined}
            danger={(host.vramUsagePercent ?? 0) >= 85}
          />
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default HostMachineCard
