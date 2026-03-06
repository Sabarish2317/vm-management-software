// ─── Domain types (returned by backend API) ────────────────────────────────

export type VMStatus = 'running' | 'unreachable' | 'degraded'
export type NodeRole = 'host' | 'vm' | 'unknown'
export type NodeOS = 'linux' | 'windows'

export interface NodeMetrics {
  /** e.g. "192.168.1.10:9100" */
  instance: string
  /** Human-readable label (IP or label override) */
  name: string
  /** OS kernel hostname */
  hostname: string
  /** Whether the exporter is up */
  up: boolean
  /** Role derived from scrape labels */
  role: NodeRole
  /** Operating system of the node */
  os: NodeOS
  /** Prometheus job name */
  job: string
  cpuUsagePercent: number // 0-100
  /** Number of logical CPU cores */
  cpuCores: number
  /** 1-min load average (Linux only, null on Windows) */
  loadAvg1m: number | null
  /** 5-min load average */
  loadAvg5m: number | null
  /** 15-min load average */
  loadAvg15m: number | null
  /** CPU/hardware temp in °C – null when not exposed */
  tempCelsius: number | null
  memTotalBytes: number
  memUsedBytes: number
  memUsagePercent: number // 0-100
  diskTotalBytes: number
  diskUsedBytes: number
  diskUsagePercent: number // 0-100
  /** Disk read throughput bytes/sec */
  diskReadBytesPerSec: number
  /** Disk write throughput bytes/sec */
  diskWriteBytesPerSec: number
  networkRxBytesPerSec: number
  networkTxBytesPerSec: number
  /** Running process count */
  processCount: number | null
  /** Seconds since boot */
  uptimeSeconds: number
  status: VMStatus
  /** Total GPU VRAM in bytes (null if no GPU / exporter not present) */
  vramTotalBytes: number | null
  /** Used GPU VRAM in bytes */
  vramUsedBytes: number | null
  /** 0-100 GPU VRAM usage (null if unavailable) */
  vramUsagePercent: number | null
  lastScrape?: string
  lastError?: string
}

export interface DashboardSummary {
  totalNodes: number
  totalHosts: number
  totalVMs: number
  runningCount: number
  degradedCount: number
  unreachableCount: number
  avgCpuPercent: number
  avgMemPercent: number
  avgDiskPercent: number
  linuxCount: number
  windowsCount: number
}

// ─── Raw Prometheus HTTP API shapes (kept for reference) ──────────────────

export interface PrometheusMetric {
  [label: string]: string
}

export interface PrometheusVectorResult {
  metric: PrometheusMetric
  value: [number, string]
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
