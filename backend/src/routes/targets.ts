/**
 * routes/targets.ts
 *
 * GET /api/targets
 *   Returns all active Prometheus scrape targets with health/timing info.
 *
 * GET /api/targets/:scrapePool
 *   Returns targets filtered by scrape pool.
 */
import { Router, Request, Response, NextFunction } from "express";
import { fetchTargets } from "../prometheus/client";
import type { NodeOS, TargetInfo } from "../types";

const router = Router();

function detectOS(target: { labels: Record<string, string> }): NodeOS {
  const job = target.labels.job ?? "";
  if (job.includes("windows")) return "windows";
  return "linux";
}

/**
 * GET /api/targets
 * Query param: ?scrapePool=windows_vms (optional filter)
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await fetchTargets();
    const pool = (req.query.scrapePool as string | undefined) ?? "";

    let targets = data.activeTargets;

    if (pool) {
      targets = targets.filter((t) => t.scrapePool === pool);
    }

    const result: TargetInfo[] = targets.map((t) => ({
      instance: t.labels.instance ?? "",
      job: t.labels.job ?? "",
      scrapePool: t.scrapePool,
      health: t.health,
      lastScrape: t.lastScrape,
      lastError: t.lastError,
      lastScrapeDuration: t.lastScrapeDuration,
      scrapeInterval: t.scrapeInterval,
      scrapeUrl: t.scrapeUrl,
      os: detectOS(t),
    }));

    res.json({
      success: true,
      total: result.length,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/targets/:scrapePool
 * Convenience endpoint – same as ?scrapePool= filter but cleaner URL.
 */
router.get(
  "/:scrapePool",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await fetchTargets();
      const { scrapePool } = req.params;

      const targets = data.activeTargets.filter(
        (t) => t.scrapePool === scrapePool,
      );

      const result: TargetInfo[] = targets.map((t) => ({
        instance: t.labels.instance ?? "",
        job: t.labels.job ?? "",
        scrapePool: t.scrapePool,
        health: t.health,
        lastScrape: t.lastScrape,
        lastError: t.lastError,
        lastScrapeDuration: t.lastScrapeDuration,
        scrapeInterval: t.scrapeInterval,
        scrapeUrl: t.scrapeUrl,
        os: detectOS(t),
      }));

      res.json({
        success: true,
        scrapePool,
        total: result.length,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
