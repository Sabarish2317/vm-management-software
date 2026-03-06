/**
 * routes/dashboard.ts
 *
 * GET /api/dashboard/summary
 *   Aggregated summary stats for the dashboard overview cards.
 */
import { Router, Request, Response, NextFunction } from "express";
import { fetchLinuxNodeMetrics } from "../prometheus/nodeQueries";
import { fetchWindowsVMMetrics } from "../prometheus/windowsQueries";
import type { DashboardSummary, NodeMetrics } from "../types";

const router = Router();

function avg(nodes: NodeMetrics[], key: keyof NodeMetrics): number {
  if (!nodes.length) return 0;
  const sum = nodes.reduce((s, n) => s + (n[key] as number), 0);
  return sum / nodes.length;
}

/** GET /api/dashboard/summary */
router.get(
  "/summary",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [linuxResult, windowsResult] = await Promise.allSettled([
        fetchLinuxNodeMetrics(),
        fetchWindowsVMMetrics(),
      ]);

      const linux = linuxResult.status === "fulfilled" ? linuxResult.value : [];
      const windows =
        windowsResult.status === "fulfilled" ? windowsResult.value : [];
      const all = [...linux, ...windows];

      const hosts = all.filter((n) => n.role === "host");
      const vms = all.filter((n) => n.role !== "host");

      const summary: DashboardSummary = {
        totalNodes: all.length,
        totalHosts: hosts.length,
        totalVMs: vms.length,
        runningCount: all.filter((n) => n.status === "running").length,
        degradedCount: all.filter((n) => n.status === "degraded").length,
        unreachableCount: all.filter((n) => n.status === "unreachable").length,
        avgCpuPercent: avg(all, "cpuUsagePercent"),
        avgMemPercent: avg(all, "memUsagePercent"),
        avgDiskPercent: avg(all, "diskUsagePercent"),
        linuxCount: linux.length,
        windowsCount: windows.length,
      };

      const warnings: string[] = [];
      if (linuxResult.status === "rejected")
        warnings.push(`linux: ${linuxResult.reason}`);
      if (windowsResult.status === "rejected")
        warnings.push(`windows: ${windowsResult.reason}`);

      res.json({
        success: warnings.length === 0,
        data: summary,
        ...(warnings.length > 0 && { warnings }),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
