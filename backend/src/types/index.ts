// ─── Raw Prometheus HTTP API shapes ─────────────────────────────────────────

export interface PrometheusMetric {
  [label: string]: string;
}

export interface PrometheusVectorResult {
  metric: PrometheusMetric;
  value: [number, string]; // [unix timestamp, stringified float]
}

export interface PrometheusRangeResult {
  metric: PrometheusMetric;
  values: [number, string][];
}

export interface PrometheusQueryResponse {
  status: "success" | "error";
  data: {
    resultType: "vector" | "matrix" | "scalar" | "string";
    result: PrometheusVectorResult[];
  };
  errorType?: string;
  error?: string;
  warnings?: string[];
}

// ─── Targets API ─────────────────────────────────────────────────────────────

export interface PrometheusTarget {
  discoveredLabels: Record<string, string>;
  labels: Record<string, string>;
  scrapePool: string;
  scrapeUrl: string;
  globalUrl: string;
  lastError: string;
  lastScrape: string;
  lastScrapeDuration: number;
  health: "up" | "down" | "unknown";
  scrapeInterval: string;
  scrapeTimeout: string;
}

export interface PrometheusTargetsResponse {
  status: "success" | "error";
  data: {
    activeTargets: PrometheusTarget[];
    droppedTargets: unknown[];
  };
  error?: string;
}

// ─── Domain types returned by this backend ──────────────────────────────────

export type VMStatus = "running" | "unreachable" | "degraded";
export type NodeRole = "host" | "vm" | "unknown";
export type NodeOS = "linux" | "windows";

export interface NodeMetrics {
  /** e.g. "192.168.1.10:9100" */
  instance: string;
  /** Human-readable name (hostname label or IP) */
  name: string;
  /** OS kernel hostname (from node_uname_info / windows_cs_hostname) */
  hostname: string;
  /** Whether the exporter is up */
  up: boolean;
  /** "host" | "vm" | "unknown" */
  role: NodeRole;
  /** "linux" | "windows" */
  os: NodeOS;
  /** Prometheus scrape job name */
  job: string;
  /** 0-100 */
  cpuUsagePercent: number;
  /** Number of logical CPU cores */
  cpuCores: number;
  /** 1-minute load average (Linux only, null on Windows) */
  loadAvg1m: number | null;
  /** 5-minute load average */
  loadAvg5m: number | null;
  /** 15-minute load average */
  loadAvg15m: number | null;
  /** CPU / hardware temperature in °C (null if not exposed by exporter) */
  tempCelsius: number | null;
  memTotalBytes: number;
  memUsedBytes: number;
  /** 0-100 */
  memUsagePercent: number;
  diskTotalBytes: number;
  diskUsedBytes: number;
  /** 0-100 */
  diskUsagePercent: number;
  /** Disk read throughput bytes/sec */
  diskReadBytesPerSec: number;
  /** Disk write throughput bytes/sec */
  diskWriteBytesPerSec: number;
  networkRxBytesPerSec: number;
  networkTxBytesPerSec: number;
  /** Number of running / total processes */
  processCount: number | null;
  /** seconds since boot */
  uptimeSeconds: number;
  status: VMStatus;
  /** Total GPU VRAM in bytes (null if no GPU / exporter not present) */
  vramTotalBytes: number | null;
  /** Used GPU VRAM in bytes */
  vramUsedBytes: number | null;
  /** 0-100 GPU VRAM usage (null if unavailable) */
  vramUsagePercent: number | null;
  lastScrape?: string;
  lastError?: string;
}

export interface TargetInfo {
  instance: string;
  job: string;
  scrapePool: string;
  health: "up" | "down" | "unknown";
  lastScrape: string;
  lastError: string;
  lastScrapeDuration: number;
  scrapeInterval: string;
  scrapeUrl: string;
  os: NodeOS;
}

export interface DashboardSummary {
  totalNodes: number;
  totalHosts: number;
  totalVMs: number;
  runningCount: number;
  degradedCount: number;
  unreachableCount: number;
  avgCpuPercent: number;
  avgMemPercent: number;
  avgDiskPercent: number;
  linuxCount: number;
  windowsCount: number;
}
