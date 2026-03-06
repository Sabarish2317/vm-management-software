/**
 * windowsQueries.ts
 *
 * Fetch metrics for Windows VMs scraped by windows_exporter (port 9182).
 * Extended with: hostname, CPU cores, temperature, disk I/O, process count.
 *
 * Note: Windows has no load averages (skipped).
 * Reference: https://github.com/prometheus-community/windows_exporter
 */
import { instantQuery, toMap, pct, parseVal } from "./client";
import type { NodeMetrics, VMStatus } from "../types";

function deriveStatus(up: boolean, cpu: number, memPct: number): VMStatus {
  if (!up) return "unreachable";
  if (cpu > 90 || memPct > 90) return "degraded";
  return "running";
}

export async function fetchWindowsVMMetrics(): Promise<NodeMetrics[]> {
  const [
    upResults,
    hostnameResults,
    cpuResults,
    cpuCoresResults,
    memTotalResults,
    memFreeResults,
    diskTotalResults,
    diskFreeResults,
    diskReadResults,
    diskWriteResults,
    netRxResults,
    netTxResults,
    uptimeResults,
    tempResults,
    procResults,
    vramTotalResults,
    vramUsedResults,
  ] = await Promise.all([
    // 1. Up?
    instantQuery('up{job="windows_vms"}'),

    // 2. Hostname label from windows_exporter cs_info or system
    instantQuery('windows_cs_hostname{job="windows_vms"}'),

    // 3. CPU usage % — 2-min rate on idle mode
    instantQuery(
      '100 - (avg by (instance) (rate(windows_cpu_time_total{mode="idle",job="windows_vms"}[2m])) * 100)',
    ),

    // 4. Number of logical CPU cores
    instantQuery(
      'count by (instance) (windows_cpu_time_total{mode="idle",job="windows_vms"})',
    ),

    // 5. Total physical memory
    instantQuery('windows_cs_physical_memory_bytes{job="windows_vms"}'),

    // 6. Free physical memory
    instantQuery('windows_os_physical_memory_free_bytes{job="windows_vms"}'),

    // 7. C: drive total
    instantQuery(
      'windows_logical_disk_size_bytes{job="windows_vms",volume="C:"}',
    ),

    // 8. C: drive free
    instantQuery(
      'windows_logical_disk_free_bytes{job="windows_vms",volume="C:"}',
    ),

    // 9. Disk read bytes/sec (all volumes summed)
    instantQuery(
      'sum by (instance) (rate(windows_logical_disk_read_bytes_total{job="windows_vms"}[5m]))',
    ),

    // 10. Disk write bytes/sec
    instantQuery(
      'sum by (instance) (rate(windows_logical_disk_write_bytes_total{job="windows_vms"}[5m]))',
    ),

    // 11. Network RX bytes/sec (skip ISATAP/Teredo/Loopback)
    instantQuery(
      'sum by (instance) (rate(windows_net_bytes_received_total{job="windows_vms",nic!~".*isatap.*|.*teredo.*|Loopback.*"}[5m]))',
    ),

    // 12. Network TX bytes/sec
    instantQuery(
      'sum by (instance) (rate(windows_net_bytes_sent_total{job="windows_vms",nic!~".*isatap.*|.*teredo.*|Loopback.*"}[5m]))',
    ),

    // 13. System uptime
    instantQuery('windows_system_system_up_time{job="windows_vms"}'),

    // 14. Thermal zone temperature (Kelvin → Celsius, best-effort)
    instantQuery('windows_thermalzone_temperature_kelvin{job="windows_vms"}'),

    // 15. Process count
    instantQuery('windows_system_processes{job="windows_vms"}'),

    // 16. GPU VRAM total (windows_exporter GPU collector, best-effort)
    instantQuery(
      'sum by (instance) (windows_gpu_dedicated_video_memory_bytes{job="windows_vms"})',
    ),

    // 17. GPU VRAM used
    instantQuery(
      'sum by (instance) (windows_gpu_dedicated_video_memory_used_bytes{job="windows_vms"})',
    ),
  ]);

  // Hostname: windows_cs_hostname is an info metric — value is always 1
  // but the actual hostname is in the "hostname" label
  const hostnameMap = new Map(
    hostnameResults.map((r) => [
      r.metric.instance ?? "",
      r.metric.hostname ?? r.metric.exported_instance ?? "",
    ]),
  );

  const cpuMap = toMap(cpuResults);
  const cpuCoresMap = toMap(cpuCoresResults);
  const memTotalMap = toMap(memTotalResults);
  const memFreeMap = toMap(memFreeResults);
  const diskTotalMap = toMap(diskTotalResults);
  const diskFreeMap = toMap(diskFreeResults);
  const diskReadMap = toMap(diskReadResults);
  const diskWriteMap = toMap(diskWriteResults);
  const netRxMap = toMap(netRxResults);
  const netTxMap = toMap(netTxResults);
  const uptimeMap = toMap(uptimeResults);
  const tempMap = toMap(tempResults);
  const procMap = toMap(procResults);
  const vramTotalMap = toMap(vramTotalResults);
  const vramUsedMap = toMap(vramUsedResults);

  return upResults.map((r): NodeMetrics => {
    const instance = r.metric.instance ?? "";
    const isUp = parseVal(r) === 1;

    const cpu = cpuMap.get(instance) ?? 0;
    const memTotal = memTotalMap.get(instance) ?? 0;
    const memFree = memFreeMap.get(instance) ?? 0;
    const memUsed = memTotal - memFree;
    const diskTotal = diskTotalMap.get(instance) ?? 0;
    const diskFree = diskFreeMap.get(instance) ?? 0;
    const diskUsed = diskTotal - diskFree;
    const memPct = pct(memUsed, memTotal);

    const osHostname = hostnameMap.get(instance) ?? r.metric.hostname ?? "";
    const name =
      r.metric.hostname ??
      r.metric.name ??
      (osHostname || instance.split(":")[0]);

    // Convert Kelvin to Celsius; thermal zone often returns 0 when unavailable
    const rawTempK = tempMap.get(instance);
    const tempCelsius =
      rawTempK !== undefined && rawTempK > 100
        ? parseFloat((rawTempK - 273.15).toFixed(1))
        : null;

    const rawProc = procMap.get(instance);
    const processCount = rawProc !== undefined ? Math.round(rawProc) : null;

    return {
      instance,
      name,
      hostname: osHostname || instance.split(":")[0],
      up: isUp,
      role: "vm",
      os: "windows",
      job: r.metric.job ?? "windows_vms",
      cpuUsagePercent: cpu,
      cpuCores: Math.round(cpuCoresMap.get(instance) ?? 0),
      loadAvg1m: null,
      loadAvg5m: null,
      loadAvg15m: null,
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
