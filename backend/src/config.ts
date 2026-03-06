import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  prometheusUrl: process.env.PROMETHEUS_URL ?? "http://100.113.145.105:9090",
  /**
   * Comma-separated list of allowed CORS origins.
   * Default allows the Vite dev server and any production build.
   */
  corsOrigins: (
    process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:4173"
  )
    .split(",")
    .map((o) => o.trim()),
  /** Request timeout for upstream Prometheus calls (ms) */
  prometheusTimeoutMs: parseInt(
    process.env.PROMETHEUS_TIMEOUT_MS ?? "10000",
    10,
  ),
  nodeEnv: process.env.NODE_ENV ?? "development",
  /** MongoDB connection string — set MONGO_URL in .env */
  mongoUrl: process.env.MONGO_URL ?? "",
  /** Secret used to sign JWTs — set JWT_SECRET in .env */
  jwtSecret: process.env.JWT_SECRET ?? "change-me-in-production",
  /** JWT expiry duration (e.g. "7d", "24h") */
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
} as const;
