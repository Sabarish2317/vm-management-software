import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchAllNodeMetrics } from './prometheusService'
import type { DashboardSummary, NodeMetrics } from '@/types/prometheus'

/** Refetch every 30 seconds so the dashboard stays live */
const REFETCH_INTERVAL = 30_000

// ─────────────────────────────────────────────────────────────────────────────
// Raw hook – returns all nodes un-filtered
// ─────────────────────────────────────────────────────────────────────────────
export function useNodeMetrics() {
  return useQuery<NodeMetrics[], Error>({
    queryKey: ['nodeMetrics'],
    queryFn: fetchAllNodeMetrics,
    refetchInterval: REFETCH_INTERVAL,
    staleTime: 15_000,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Derived hook – splits into hosts + VMs + summary
// ─────────────────────────────────────────────────────────────────────────────
export function useDashboardData() {
  const query = useNodeMetrics()

  const hosts = useMemo<NodeMetrics[]>(() => {
    if (!query.data) return []
    // "host" role first, then fall back: any single node when there is no "vm"
    const h = query.data.filter((n) => n.role === 'host')
    return h.length > 0 ? h : []
  }, [query.data])

  const vms = useMemo<NodeMetrics[]>(() => {
    if (!query.data) return []
    const v = query.data.filter((n) => n.role === 'vm')
    // If there is no explicit role, show everything that isn't marked "host"
    return v.length > 0 ? v : query.data.filter((n) => n.role !== 'host')
  }, [query.data])

  const summary = useMemo<DashboardSummary>(() => {
    const all = query.data ?? []
    const running = all.filter((n) => n.status === 'running').length
    const unreachable = all.filter((n) => n.status === 'unreachable').length
    const avgCpu =
      all.length > 0
        ? all.reduce((s, n) => s + n.cpuUsagePercent, 0) / all.length
        : 0
    const avgMem =
      all.length > 0
        ? all.reduce((s, n) => s + n.memUsagePercent, 0) / all.length
        : 0

    return {
      totalHosts: hosts.length,
      totalVMs: vms.length,
      runningVMs: running,
      unreachableVMs: unreachable,
      avgCpuPercent: avgCpu,
      avgMemPercent: avgMem,
    }
  }, [query.data, hosts.length, vms.length])

  return {
    ...query,
    hosts,
    vms,
    summary,
  }
}
