/**
 * historyQueries.ts
 *
 * Fetch time-series (range) metrics for a single node over the last N seconds.
 * Returns parallel arrays of MetricPoint { t, v } for each metric dimension.
 *
 * Used by: GET /api/metrics/:instance/history
 */
import { rangeQuery } from "./client";
import type {
  MetricPoint,
  NodeHistoryData,
  PrometheusRangeResult,
} from "../types";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Extract points for the given instance from a range result. */
// s
function toPoints(
  results: PrometheusRangeResult[],
  instance: string,
): MetricPoint[] {
  const r = results.find((r) => r.metric.instance === instance);
  if (!r) return [];
  return r.values.map(([t, v]) => ({ t, v: parseFloat(v) || 0 }));
}

/** Safely resolve a Promise.allSettled result to points. */
function result(
  settled: PromiseSettledResult<PrometheusRangeResult[]>,
  instance: string,
): MetricPoint[] {
  return settled.status === "fulfilled"
    ? toPoints(settled.value, instance)
    : [];
}

// ─── Linux (node_exporter) ────────────────────────────────────────────────────

async function fetchLinuxHistory(
  instance: string,
  start: number,
  end: number,
  step: string,
): Promise<NodeHistoryData> {
  const inst = `instance="${instance}"`;

  const [
    cpuR,
    cpuTempR,
    ramR,
    diskR,
    netRxR,
    netTxR,
    diskReadR,
    diskWriteR,
    vramR,
  ] = await Promise.allSettled([
    // CPU usage %
    rangeQuery(
      `100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle",${inst}}[30s])) * 100)`,
      start,
      end,
      step,
    ),
    // CPU temperature °C (hwmon, best-effort)
    rangeQuery(
      `max by (instance) (node_hwmon_temp_celsius{chip!~".*pch.*|.*acpi.*|.*iwlwifi.*",${inst}})`,
      start,
      end,
      step,
    ),
    // RAM usage %
    rangeQuery(
      `(1 - (node_memory_MemAvailable_bytes{${inst}} / node_memory_MemTotal_bytes{${inst}})) * 100`,
      start,
      end,
      step,
    ),
    // Disk usage %
    rangeQuery(
      `(1 - (node_filesystem_avail_bytes{mountpoint="/",fstype!~"tmpfs|overlay",${inst}} / node_filesystem_size_bytes{mountpoint="/",fstype!~"tmpfs|overlay",${inst}})) * 100`,
      start,
      end,
      step,
    ),
    // Network RX bytes/sec
    rangeQuery(
      `sum by (instance) (rate(node_network_receive_bytes_total{device!~"lo|veth.*|docker.*|br.*",${inst}}[30s]))`,
      start,
      end,
      step,
    ),
    // Network TX bytes/sec
    rangeQuery(
      `sum by (instance) (rate(node_network_transmit_bytes_total{device!~"lo|veth.*|docker.*|br.*",${inst}}[30s]))`,
      start,
      end,
      step,
    ),
    // Disk read bytes/sec
    rangeQuery(
      `sum by (instance) (rate(node_disk_read_bytes_total{${inst}}[30s]))`,
      start,
      end,
      step,
    ),
    // Disk write bytes/sec
    rangeQuery(
      `sum by (instance) (rate(node_disk_written_bytes_total{${inst}}[30s]))`,
      start,
      end,
      step,
    ),
    // GPU VRAM usage % (NVIDIA exporter, best-effort)
    rangeQuery(
      `sum by (instance) (nvidia_gpu_memory_used_bytes{${inst}}) / sum by (instance) (nvidia_gpu_memory_total_bytes{${inst}}) * 100`,
      start,
      end,
      step,
    ),
  ]);

  const cpuTemp = result(cpuTempR, instance);
  const vram = result(vramR, instance);

  return {
    cpu: result(cpuR, instance),
    cpuTemp: cpuTemp.length > 0 ? cpuTemp : null,
    ram: result(ramR, instance),
    disk: result(diskR, instance),
    networkRx: result(netRxR, instance),
    networkTx: result(netTxR, instance),
    diskRead: result(diskReadR, instance),
    diskWrite: result(diskWriteR, instance),
    vram: vram.length > 0 ? vram : null,
  };
}

// ─── Windows (windows_exporter) ──────────────────────────────────────────────

async function fetchWindowsHistory(
  instance: string,
  start: number,
  end: number,
  step: string,
): Promise<NodeHistoryData> {
  const inst = `instance="${instance}"`;
  const job = `job="windows_vms"`;

  const [
    cpuR,
    cpuTempR,
    ramR,
    diskR,
    netRxR,
    netTxR,
    diskReadR,
    diskWriteR,
    vramR,
  ] = await Promise.allSettled([
    // CPU usage %
    rangeQuery(
      `100 - (avg by (instance) (rate(windows_cpu_time_total{mode="idle",${job},${inst}}[30s])) * 100)`,
      start,
      end,
      step,
    ),
    // CPU temperature °C (thermal zone, Kelvin → Celsius)
    rangeQuery(
      `windows_thermalzone_temperature_kelvin{${job},${inst}} - 273.15`,
      start,
      end,
      step,
    ),
    // RAM usage %
    rangeQuery(
      `(1 - (windows_os_physical_memory_free_bytes{${job},${inst}} / windows_cs_physical_memory_bytes{${job},${inst}})) * 100`,
      start,
      end,
      step,
    ),
    // Disk (C:) usage %
    rangeQuery(
      `(1 - (windows_logical_disk_free_bytes{${job},volume="C:",${inst}} / windows_logical_disk_size_bytes{${job},volume="C:",${inst}})) * 100`,
      start,
      end,
      step,
    ),
    // Network RX bytes/sec
    rangeQuery(
      `sum by (instance) (rate(windows_net_bytes_received_total{${job},nic!~".*isatap.*|.*teredo.*|Loopback.*",${inst}}[30s]))`,
      start,
      end,
      step,
    ),
    // Network TX bytes/sec
    rangeQuery(
      `sum by (instance) (rate(windows_net_bytes_sent_total{${job},nic!~".*isatap.*|.*teredo.*|Loopback.*",${inst}}[30s]))`,
      start,
      end,
      step,
    ),
    // Disk read bytes/sec
    rangeQuery(
      `sum by (instance) (rate(windows_logical_disk_read_bytes_total{${job},${inst}}[30s]))`,
      start,
      end,
      step,
    ),
    // Disk write bytes/sec
    rangeQuery(
      `sum by (instance) (rate(windows_logical_disk_write_bytes_total{${job},${inst}}[30s]))`,
      start,
      end,
      step,
    ),
    // GPU VRAM usage %
    rangeQuery(
      `sum by (instance) (nvidia_gpu_memory_used_bytes{${inst}}) / sum by (instance) (nvidia_gpu_memory_total_bytes{${inst}}) * 100`,
      start,
      end,
      step,
    ),
  ]);

  const cpuTemp = result(cpuTempR, instance);
  const vram = result(vramR, instance);

  return {
    cpu: result(cpuR, instance),
    cpuTemp: cpuTemp.length > 0 ? cpuTemp : null,
    ram: result(ramR, instance),
    disk: result(diskR, instance),
    networkRx: result(netRxR, instance),
    networkTx: result(netTxR, instance),
    diskRead: result(diskReadR, instance),
    diskWrite: result(diskWriteR, instance),
    vram: vram.length > 0 ? vram : null,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch time-series history for a single node.
 *
 * @param instance  Prometheus instance label, e.g. "192.168.1.10:9100"
 * @param os        "linux" | "windows" – determines which exporter queries to use
 * @param rangeSeconds  Window width in seconds (default 300 = 5 min)
 * @param stepSeconds   Resolution in seconds (default 15)
 */
export async function fetchNodeHistory(
  instance: string,
  os: "linux" | "windows",
  rangeSeconds = 300,
  stepSeconds = 15,
): Promise<NodeHistoryData> {
  const now = Math.floor(Date.now() / 1000);
  const start = now - rangeSeconds;
  const end = now;
  const step = `${stepSeconds}s`;

  if (os === "linux") {
    return fetchLinuxHistory(instance, start, end, step);
  } else {
    return fetchWindowsHistory(instance, start, end, step);
  }
}
