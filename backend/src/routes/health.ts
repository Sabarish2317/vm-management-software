/**
 * routes/health.ts
 *
 * GET /api/health           – backend liveness
 * GET /api/health/prometheus – checks if Prometheus is reachable
 */
import { Router, Request, Response, NextFunction } from "express";
import { fetchTargets } from "../prometheus/client";
import { config } from "../config";

const router = Router();

/** GET /api/health – always returns 200 if the server is running */
router.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

/** GET /api/health/prometheus – probes Prometheus via the targets API */
router.get(
  "/prometheus",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await fetchTargets();
      const up = data.activeTargets.filter((t) => t.health === "up").length;
      const down = data.activeTargets.filter((t) => t.health !== "up").length;

      res.json({
        success: true,
        prometheusUrl: config.prometheusUrl,
        activeTargets: data.activeTargets.length,
        up,
        down,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
