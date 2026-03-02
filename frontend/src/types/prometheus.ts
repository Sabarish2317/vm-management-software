// ─── Raw Prometheus HTTP API shapes ────────────────────────────────────────

export interface PrometheusMetric {
  [label: string]: string
}

export interface PrometheusVectorResult {
  metric: PrometheusMetric
  value: [number, string] // [timestamp, value]
}

export interface PrometheusResponse<T = PrometheusVectorResult[]> {
  status: 'success' | 'error'
  data: {
    resultType: 'vector' | 'matrix' | 'scalar' | 'string'
    result: T
  }
  errorType?: string
  error?: string
}

// ─── Derived domain types ───────────────────────────────────────────────────

export type VMStatus = 'running' | 'unreachable' | 'degraded'

export interface NodeMetrics {
  /** e.g. "192.168.1.10:9100" */
  instance: string
  /** Human-readable label parsed from instance or a label override */
  name: string
  /** Whether node_exporter is up (1 = up, 0 = down) */
  up: boolean
  cpuUsagePercent: number // 0-100
  memTotalBytes: number
  memUsedBytes: number
  memUsagePercent: number // 0-100
  diskTotalBytes: number
  diskUsedBytes: number
  diskUsagePercent: number // 0-100
  networkRxBytesPerSec: number
  networkTxBytesPerSec: number
  uptimeSeconds: number
  status: VMStatus
  /** Label applied by the scrape config, e.g. "host" | "vm" */
  role: 'host' | 'vm' | 'unknown'
}

export interface DashboardSummary {
  totalHosts: number
  totalVMs: number
  runningVMs: number
  unreachableVMs: number
  avgCpuPercent: number
  avgMemPercent: number
}
