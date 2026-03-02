/**
 * prometheusService.ts
 *
 * All Prometheus HTTP API calls.
 * Prometheus base URL is read from VITE_PROMETHEUS_URL (default: http://localhost:9090).
 *
 * Assumptions:
 *   - Each target is scraped by node_exporter.
 *   - A "role" label is set in your scrape_config to "host" or "vm".
 *     If not set, instances are treated as "unknown" and still displayed.
 *   - CPU rate is calculated using a 2-minute range vector.
 */

import axios from 'axios'
import type {
  NodeMetrics,
  PrometheusResponse,
  PrometheusVectorResult,
  VMStatus,
} from '@/types/prometheus'

const PROMETHEUS_BASE =
  import.meta.env.VITE_PROMETHEUS_URL ?? 'http://localhost:9090'

// ─── helpers ────────────────────────────────────────────────────────────────

const api = axios.create({ baseURL: PROMETHEUS_BASE })

async function query(promql: string): Promise<PrometheusVectorResult[]> {
  const { data } = await api.get<PrometheusResponse>('/api/v1/query', {
    params: { query: promql },
  })
  if (data.status !== 'success') {
    throw new Error(`Prometheus error: ${data.error ?? 'unknown'}`)
  }
  return data.data.result
}

function val(result: PrometheusVectorResult): number {
  return parseFloat(result.value[1]) || 0
}

/** Build a lookup map keyed by instance label */
function toMap(results: PrometheusVectorResult[]): Map<string, number> {
  return new Map(results.map((r) => [r.metric.instance ?? '', val(r)]))
}

function pct(used: number, total: number): number {
  if (!total) return 0
  return Math.min(100, (used / total) * 100)
}

function statusFromMetrics(up: boolean, cpu: number, mem: number): VMStatus {
  if (!up) return 'unreachable'
  if (cpu > 90 || mem > 90) return 'degraded'
  return 'running'
}

// ─── main export ─────────────────────────────────────────────────────────────

export async function fetchAllNodeMetrics(): Promise<NodeMetrics[]> {
  // Fire all Prometheus queries in parallel
  const [
    upResults,
    cpuResults,
    memTotalResults,
    memAvailResults,
    diskTotalResults,
    diskAvailResults,
    netRxResults,
    netTxResults,
    uptimeResults,
  ] = await Promise.all([
    // 1. Is the node up?
    query('up{job=~"node_exporter|node"}'),

    // 2. CPU usage % (1 - idle), averaged across all cores, 2-min rate
    query(
      '100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[2m])) * 100)'
    ),

    // 3. Total memory
    query('node_memory_MemTotal_bytes'),

    // 4. Available memory
    query('node_memory_MemAvailable_bytes'),

    // 5. Root filesystem total
    query('node_filesystem_size_bytes{mountpoint="/",fstype!~"tmpfs|overlay"}'),

    // 6. Root filesystem available
    query(
      'node_filesystem_avail_bytes{mountpoint="/",fstype!~"tmpfs|overlay"}'
    ),

    // 7. Network receive (bytes/sec, 5-min rate, all interfaces summed)
    query(
      'sum by (instance) (rate(node_network_receive_bytes_total{device!~"lo|veth.*|docker.*"}[5m]))'
    ),

    // 8. Network transmit (bytes/sec, 5-min rate)
    query(
      'sum by (instance) (rate(node_network_transmit_bytes_total{device!~"lo|veth.*|docker.*"}[5m]))'
    ),

    // 9. Uptime
    query('node_time_seconds - node_boot_time_seconds'),
  ])

  // Build maps for O(1) lookup
  const cpuMap = toMap(cpuResults)
  const memTotalMap = toMap(memTotalResults)
  const memAvailMap = toMap(memAvailResults)
  const diskTotalMap = toMap(diskTotalResults)
  const diskAvailMap = toMap(diskAvailResults)
  const netRxMap = toMap(netRxResults)
  const netTxMap = toMap(netTxResults)
  const uptimeMap = toMap(uptimeResults)

  // Iterate over "up" results – one entry per instance
  return upResults.map((r) => {
    const instance = r.metric.instance ?? ''
    const isUp = val(r) === 1

    const cpu = cpuMap.get(instance) ?? 0
    const memTotal = memTotalMap.get(instance) ?? 0
    const memAvail = memAvailMap.get(instance) ?? 0
    const memUsed = memTotal - memAvail
    const diskTotal = diskTotalMap.get(instance) ?? 0
    const diskAvail = diskAvailMap.get(instance) ?? 0
    const diskUsed = diskTotal - diskAvail

    const role =
      (r.metric.role as NodeMetrics['role']) ??
      (r.metric.job === 'host' ? 'host' : 'vm')

    // Derive a friendly name: prefer label "name" or "hostname", fall back to instance
    const name = r.metric.name ?? r.metric.hostname ?? instance.split(':')[0]

    const status: VMStatus = statusFromMetrics(
      isUp,
      cpu,
      pct(memUsed, memTotal)
    )

    return {
      instance,
      name,
      up: isUp,
      cpuUsagePercent: cpu,
      memTotalBytes: memTotal,
      memUsedBytes: memUsed,
      memUsagePercent: pct(memUsed, memTotal),
      diskTotalBytes: diskTotal,
      diskUsedBytes: diskUsed,
      diskUsagePercent: pct(diskUsed, diskTotal),
      networkRxBytesPerSec: netRxMap.get(instance) ?? 0,
      networkTxBytesPerSec: netTxMap.get(instance) ?? 0,
      uptimeSeconds: uptimeMap.get(instance) ?? 0,
      status,
      role,
    } satisfies NodeMetrics
  })
}
