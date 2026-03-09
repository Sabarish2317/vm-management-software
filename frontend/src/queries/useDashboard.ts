import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchAllNodeMetrics } from './prometheusService'
import type { DashboardSummary, NodeMetrics } from '@/types/prometheus'

/** Refetch every 15 seconds so the dashboard stays live */
const REFETCH_INTERVAL = 15_000

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
    return query.data.filter((n) => n.role === 'host')
  }, [query.data])

  const vms = useMemo<NodeMetrics[]>(() => {
    if (!query.data) return []
    return query.data.filter((n) => n.role !== 'host')
  }, [query.data])

  const linuxNodes = useMemo<NodeMetrics[]>(() => {
    if (!query.data) return []
    return query.data.filter((n) => n.os === 'linux')
  }, [query.data])

  const windowsNodes = useMemo<NodeMetrics[]>(() => {
    if (!query.data) return []
    return query.data.filter((n) => n.os === 'windows')
  }, [query.data])

  const summary = useMemo<DashboardSummary>(() => {
    const all = query.data ?? []
    const running = all.filter((n) => n.status === 'running').length
    const degraded = all.filter((n) => n.status === 'degraded').length
    const unreachable = all.filter((n) => n.status === 'unreachable').length
    const avgCpu =
      all.length > 0
        ? all.reduce((s, n) => s + n.cpuUsagePercent, 0) / all.length
        : 0
    const avgMem =
      all.length > 0
        ? all.reduce((s, n) => s + n.memUsagePercent, 0) / all.length
        : 0
    const avgDisk =
      all.length > 0
        ? all.reduce((s, n) => s + n.diskUsagePercent, 0) / all.length
        : 0

    return {
      totalNodes: all.length,
      totalHosts: hosts.length,
      totalVMs: vms.length,
      runningCount: running,
      degradedCount: degraded,
      unreachableCount: unreachable,
      avgCpuPercent: avgCpu,
      avgMemPercent: avgMem,
      avgDiskPercent: avgDisk,
      linuxCount: linuxNodes.length,
      windowsCount: windowsNodes.length,
    }
  }, [
    query.data,
    hosts.length,
    vms.length,
    linuxNodes.length,
    windowsNodes.length,
  ])

  return {
    ...query,
    hosts,
    vms,
    linuxNodes,
    windowsNodes,
    summary,
  }
}
