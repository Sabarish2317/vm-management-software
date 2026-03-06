/**
 * nodeQueries.ts
 *
 * Fetch metrics for Linux nodes scraped by node_exporter (port 9100).
 * Extended with: hostname, CPU cores, load averages, temperature,
 * disk I/O throughput, process count.
 */
import { instantQuery, toMap, pct, parseVal } from "./client";
import type { NodeMetrics, NodeRole, VMStatus } from "../types";

function deriveStatus(up: boolean, cpu: number, memPct: number): VMStatus {
  if (!up) return "unreachable";
  if (cpu > 90 || memPct > 90) return "degraded";
  return "running";
}

function deriveRole(metric: Record<string, string>): NodeRole {
  if (metric.role) return metric.role as NodeRole;
  if (metric.group === "ubuntu_servers") return "host";
  if (metric.job === "node_exporter") return "host";
  return "unknown";
}

export async function fetchLinuxNodeMetrics(): Promise<NodeMetrics[]> {
  const [
    upResults,
    hostnameResults,
    cpuResults,
    cpuCoresResults,
    memTotalResults,
    memAvailResults,
    diskTotalResults,
    diskAvailResults,
    diskReadResults,
    diskWriteResults,
    netRxResults,
    netTxResults,
    uptimeResults,
    load1Results,
    load5Results,
    load15Results,
    tempResults,
    procResults,
    vramTotalResults,
    vramUsedResults,
  ] = await Promise.all([
    // 1. Up?
    instantQuery('up{job=~"node_exporter|node"}'),

    // 2. OS hostname from node_uname_info (label: nodename)
    instantQuery("node_uname_info"),

    // 3. CPU usage % (2-min rate, idle subtracted)
    instantQuery(
      '100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[2m])) * 100)',
    ),

    // 4. Number of logical CPU cores
    instantQuery('count by (instance) (node_cpu_seconds_total{mode="idle"})'),

    // 5. Total RAM
    instantQuery("node_memory_MemTotal_bytes"),

    // 6. Available RAM
    instantQuery("node_memory_MemAvailable_bytes"),

    // 7. Root filesystem total
    instantQuery(
      'node_filesystem_size_bytes{mountpoint="/",fstype!~"tmpfs|overlay"}',
    ),

    // 8. Root filesystem available
    instantQuery(
      'node_filesystem_avail_bytes{mountpoint="/",fstype!~"tmpfs|overlay"}',
    ),

    // 9. Disk read bytes/sec (all disks combined, 5-min rate)
    instantQuery("sum by (instance) (rate(node_disk_read_bytes_total[5m]))"),

    // 10. Disk write bytes/sec
    instantQuery("sum by (instance) (rate(node_disk_written_bytes_total[5m]))"),

    // 11. Network RX bytes/sec (physical interfaces, 5-min rate)
    instantQuery(
      'sum by (instance) (rate(node_network_receive_bytes_total{device!~"lo|veth.*|docker.*|br.*"}[5m]))',
    ),

    // 12. Network TX bytes/sec
    instantQuery(
      'sum by (instance) (rate(node_network_transmit_bytes_total{device!~"lo|veth.*|docker.*|br.*"}[5m]))',
    ),

    // 13. Uptime in seconds
    instantQuery("node_time_seconds - node_boot_time_seconds"),

    // 14-16. Load averages
    instantQuery("node_load1"),
    instantQuery("node_load5"),
    instantQuery("node_load15"),

    // 17. CPU/hardware temperature (hwmon, best-effort — may be empty)
    //     Take the max sensor reading per instance
    instantQuery(
      'max by (instance) (node_hwmon_temp_celsius{chip!~".*pch.*|.*acpi.*|.*iwlwifi.*"})',
    ),

    // 18. Number of running processes
    instantQuery("node_procs_running"),

    // 19. GPU VRAM total (NVIDIA exporter, best-effort — empty if no GPU)
    instantQuery("sum by (instance) (nvidia_gpu_memory_total_bytes)"),

    // 20. GPU VRAM used
    instantQuery("sum by (instance) (nvidia_gpu_memory_used_bytes)"),
  ]);

  // Build lookup maps
  const hostnameMap = new Map(
    hostnameResults.map((r) => [
      r.metric.instance ?? "",
      r.metric.nodename ?? "",
    ]),
  );
  const cpuMap = toMap(cpuResults);
  const cpuCoresMap = toMap(cpuCoresResults);
  const memTotalMap = toMap(memTotalResults);
  const memAvailMap = toMap(memAvailResults);
  const diskTotalMap = toMap(diskTotalResults);
  const diskAvailMap = toMap(diskAvailResults);
  const diskReadMap = toMap(diskReadResults);
  const diskWriteMap = toMap(diskWriteResults);
  const netRxMap = toMap(netRxResults);
  const netTxMap = toMap(netTxResults);
  const uptimeMap = toMap(uptimeResults);
  const load1Map = toMap(load1Results);
  const load5Map = toMap(load5Results);
  const load15Map = toMap(load15Results);
  const tempMap = toMap(tempResults);
  const procMap = toMap(procResults);
  const vramTotalMap = toMap(vramTotalResults);
  const vramUsedMap = toMap(vramUsedResults);

  return upResults.map((r): NodeMetrics => {
    const instance = r.metric.instance ?? "";
    const isUp = parseVal(r) === 1;

    const cpu = cpuMap.get(instance) ?? 0;
    const memTotal = memTotalMap.get(instance) ?? 0;
    const memAvail = memAvailMap.get(instance) ?? 0;
    const memUsed = memTotal - memAvail;
    const diskTotal = diskTotalMap.get(instance) ?? 0;
    const diskAvail = diskAvailMap.get(instance) ?? 0;
    const diskUsed = diskTotal - diskAvail;
    const memPct = pct(memUsed, memTotal);

    const osHostname = hostnameMap.get(instance) ?? "";
    // Prefer label "name" > label "hostname" > uname nodename > IP
    const name =
      r.metric.name ??
      r.metric.hostname ??
      (osHostname || instance.split(":")[0]);

    const rawTemp = tempMap.get(instance);
    const tempCelsius = rawTemp !== undefined && rawTemp > 0 ? rawTemp : null;

    const rawProc = procMap.get(instance);
    const processCount = rawProc !== undefined ? Math.round(rawProc) : null;

    return {
      instance,
      name,
      hostname: osHostname || instance.split(":")[0],
      up: isUp,
      role: deriveRole(r.metric),
      os: "linux",
      job: r.metric.job ?? "node_exporter",
      cpuUsagePercent: cpu,
      cpuCores: Math.round(cpuCoresMap.get(instance) ?? 0),
      loadAvg1m: load1Map.get(instance) ?? null,
      loadAvg5m: load5Map.get(instance) ?? null,
      loadAvg15m: load15Map.get(instance) ?? null,
      tempCelsius,
      memTotalBytes: memTotal,
      memUsedBytes: memUsed,
      memUsagePercent: memPct,
      diskTotalBytes: diskTotal,
      diskUsedBytes: diskUsed,
      diskUsagePercent: pct(diskUsed, diskTotal),
      diskReadBytesPerSec: diskReadMap.get(instance) ?? 0,
      diskWriteBytesPerSec: diskWriteMap.get(instance) ?? 0,
      networkRxBytesPerSec: netRxMap.get(instance) ?? 0,
      networkTxBytesPerSec: netTxMap.get(instance) ?? 0,
      processCount,
      uptimeSeconds: uptimeMap.get(instance) ?? 0,
      status: deriveStatus(isUp, cpu, memPct),
      vramTotalBytes: vramTotalMap.get(instance) ?? null,
      vramUsedBytes: vramUsedMap.get(instance) ?? null,
      vramUsagePercent:
        vramTotalMap.has(instance) && (vramTotalMap.get(instance) ?? 0) > 0
          ? pct(vramUsedMap.get(instance) ?? 0, vramTotalMap.get(instance) ?? 0)
          : null,
    };
  });
}
