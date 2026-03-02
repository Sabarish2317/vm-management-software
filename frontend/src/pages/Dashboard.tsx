import React from 'react'
import { motion } from 'framer-motion'
import {
  Server,
  Monitor,
  Activity,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { useDashboardData } from '@/queries/useDashboard'
import HostMachineCard from '@/components/dashboard/HostMachineCard'
import VMCard from '@/components/dashboard/VMCard'

// ─── Summary metric card ──────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  bgClass: string
  textClass: string
  borderClass: string
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  icon,
  bgClass,
  textClass,
  borderClass,
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.35 }}
    className={`flex items-center gap-3 rounded-xl border ${borderClass} ${bgClass} px-4 py-3`}
  >
    <div
      className={`flex h-9 w-9 items-center justify-center rounded-lg bg-white/60 ${textClass}`}
    >
      {icon}
    </div>
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`text-xl leading-tight font-bold ${textClass}`}>{value}</p>
    </div>
  </motion.div>
)

// ─── Skeleton loader ──────────────────────────────────────────────────────────

const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`animate-pulse rounded-xl border border-slate-200 bg-slate-100 ${className}`}
  />
)

// ─── Dashboard ────────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const {
    hosts,
    vms,
    summary,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useDashboardData()

  const lastUpdated = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <div className="flex flex-col gap-6 px-1 pb-10">
      {/* ── Page title row ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Live infrastructure overview · auto-refreshes every 30 s
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          {isFetching ? 'Refreshing…' : `Updated ${lastUpdated}`}
        </button>
      </div>

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <SummaryCard
          label="Host Machines"
          value={summary.totalHosts}
          icon={<Server size={18} />}
          bgClass="bg-indigo-50"
          textClass="text-indigo-600"
          borderClass="border-indigo-100"
        />
        <SummaryCard
          label="Virtual Machines"
          value={summary.totalVMs}
          icon={<Monitor size={18} />}
          bgClass="bg-sky-50"
          textClass="text-sky-600"
          borderClass="border-sky-100"
        />
        <SummaryCard
          label="Running"
          value={summary.runningVMs}
          icon={<Activity size={18} />}
          bgClass="bg-emerald-50"
          textClass="text-emerald-600"
          borderClass="border-emerald-100"
        />
        <SummaryCard
          label="Unreachable"
          value={summary.unreachableVMs}
          icon={<AlertTriangle size={18} />}
          bgClass="bg-red-50"
          textClass="text-red-500"
          borderClass="border-red-100"
        />
        <SummaryCard
          label="Avg CPU"
          value={`${summary.avgCpuPercent.toFixed(1)}%`}
          icon={<Activity size={18} />}
          bgClass="bg-amber-50"
          textClass="text-amber-600"
          borderClass="border-amber-100"
        />
        <SummaryCard
          label="Avg Memory"
          value={`${summary.avgMemPercent.toFixed(1)}%`}
          icon={<Activity size={18} />}
          bgClass="bg-purple-50"
          textClass="text-purple-600"
          borderClass="border-purple-100"
        />
      </div>

      {/* ── Error banner ── */}
      {isError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              Could not reach Prometheus
            </p>
            <p className="mt-0.5 text-xs text-red-500">
              {(error as Error)?.message ??
                'Check that Prometheus is running and VITE_PROMETHEUS_URL is set correctly.'}
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Host Machines section ── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Server size={16} className="text-indigo-500" />
          <h2 className="text-base font-semibold text-slate-700">
            Host Machines
          </h2>
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-500">
            {isLoading ? '…' : hosts.length}
          </span>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2].map((k) => (
              <CardSkeleton key={k} className="h-64" />
            ))}
          </div>
        ) : hosts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
            <Server className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">
              No host machines found
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Make sure your scrape targets have{' '}
              <code className="rounded bg-slate-100 px-1 text-[11px]">
                role="host"
              </code>{' '}
              label in Prometheus.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {hosts.map((host) => (
              <HostMachineCard key={host.instance} host={host} />
            ))}
          </div>
        )}
      </section>

      {/* ── Virtual Machines section ── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Monitor size={16} className="text-sky-500" />
          <h2 className="text-base font-semibold text-slate-700">
            Virtual Machines
          </h2>
          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-500">
            {isLoading ? '…' : vms.length}
          </span>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((k) => (
              <CardSkeleton key={k} className="h-44" />
            ))}
          </div>
        ) : vms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
            <Monitor className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">
              No virtual machines found
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Targets with{' '}
              <code className="rounded bg-slate-100 px-1 text-[11px]">
                role="vm"
              </code>{' '}
              label will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {vms.map((vm, i) => (
              <VMCard key={vm.instance} vm={vm} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Dashboard
