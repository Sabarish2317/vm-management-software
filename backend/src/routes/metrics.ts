/**
 * routes/metrics.ts
 *
 * GET /api/metrics/nodes          – Linux node_exporter metrics
 * GET /api/metrics/windows-vms    – Windows windows_exporter metrics
 * GET /api/metrics/all            – Both combined
 * GET /api/metrics/:instance      – Single instance detail (searched across all)
 */
import { Router, Request, Response, NextFunction } from "express";
import { fetchLinuxNodeMetrics } from "../prometheus/nodeQueries";
import { fetchWindowsVMMetrics } from "../prometheus/windowsQueries";

const router: Router = Router();

/** GET /api/metrics/nodes */
router.get(
  "/nodes",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await fetchLinuxNodeMetrics();
      res.json({ success: true, total: data.length, data });
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/metrics/windows-vms */
router.get(
  "/windows-vms",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await fetchWindowsVMMetrics();
      res.json({ success: true, total: data.length, data });
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/metrics/all – fetches linux + windows in parallel */
router.get("/all", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [linux, windows] = await Promise.allSettled([
      fetchLinuxNodeMetrics(),
      fetchWindowsVMMetrics(),
    ]);

    const linuxData = linux.status === "fulfilled" ? linux.value : [];
    const windowsData = windows.status === "fulfilled" ? windows.value : [];

    const errors: string[] = [];
    if (linux.status === "rejected") errors.push(`linux: ${linux.reason}`);
    if (windows.status === "rejected")
      errors.push(`windows: ${windows.reason}`);

    const data = [...linuxData, ...windowsData];

    res.json({
      success: errors.length === 0,
      total: data.length,
      data,
      ...(errors.length > 0 && { warnings: errors }),
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/metrics/:instance – lookup a single node's metrics */
router.get(
  "/:instance",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // instance param comes URL-encoded, e.g. 192.168.1.3%3A9100
      const raw = String(req.params.instance);
      const instance = decodeURIComponent(raw);

      const [linux, windows] = await Promise.allSettled([
        fetchLinuxNodeMetrics(),
        fetchWindowsVMMetrics(),
      ]);

      const all = [
        ...(linux.status === "fulfilled" ? linux.value : []),
        ...(windows.status === "fulfilled" ? windows.value : []),
      ];

      const node = all.find((n) => n.instance === instance);

      if (!node) {
        res
          .status(404)
          .json({ success: false, error: `Instance "${instance}" not found` });
        return;
      }

      res.json({ success: true, data: node });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
