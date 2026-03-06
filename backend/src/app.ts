/**
 * app.ts
 *
 * Express application setup — middleware, routes, error handler.
 * Kept separate from index.ts so it can be imported in tests.
 */
import express, { Request, Response, NextFunction, Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { config } from "./config";

import healthRouter from "./routes/health";
import targetsRouter from "./routes/targets";
import metricsRouter from "./routes/metrics";
import dashboardRouter from "./routes/dashboard";
import authRouter from "./routes/auth";

const app: Application = express();

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());

// In development allow any localhost origin (Vite may pick 5173, 5174, …)
const localhostRegex = /^https?:\/\/localhost(:\d+)?$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      // always allow any localhost port in development
      if (config.nodeEnv !== "production" && localhostRegex.test(origin))
        return callback(null, true);
      // in production fall back to the explicit allow-list
      if (config.corsOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin "${origin}" is not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);

// ─── Rate limiting ────────────────────────────────────────────────────────────
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000, // 1 minute
    max: 300, // requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Too many requests, please slow down." },
  }),
);

// ─── Logging & parsing ────────────────────────────────────────────────────────
app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/health", healthRouter);
app.use("/api/targets", targetsRouter);
app.use("/api/metrics", metricsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/auth", authRouter);

// 404 fallback
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[ERROR]", err.message);
  if (config.nodeEnv !== "production") {
    console.error(err.stack);
  }
  res.status(502).json({
    success: false,
    error: err.message ?? "Internal server error",
  });
});

export default app;
