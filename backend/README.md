# VM Management Backend

A Node.js/TypeScript Express API that proxies Prometheus metrics for Linux and Windows machines into a unified JSON format consumed by the frontend dashboard.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Configuration](#configuration)
4. [Entry Point](#entry-point)
5. [Express App (`app.ts`)](#express-app-appts)
6. [Prometheus Layer](#prometheus-layer)
   - [client.ts](#clientts)
   - [nodeQueries.ts (Linux)](#nodequerysts-linux)
   - [windowsQueries.ts (Windows)](#windowsquerysts-windows)
7. [API Endpoints](#api-endpoints)
   - [Health](#health)
   - [Targets](#targets)
   - [Metrics](#metrics)
   - [Dashboard](#dashboard)
8. [Types](#types)
9. [Data Flow (end-to-end)](#data-flow-end-to-end)
10. [Running Locally](#running-locally)

---

## Architecture Overview

```
Frontend (React/Vite)
        │
        ▼  HTTP  (localhost:3001)
  Express Backend
        │
        ▼  HTTP  (PROMETHEUS_URL)
   Prometheus Server
    ├── node_exporter   (Linux hosts/VMs  – port 9100)
    └── windows_exporter (Windows VMs     – port 9182)
```

The backend does **not** store any state. Every API request triggers one or more instant PromQL queries to Prometheus, transforms the raw metric vectors into typed `NodeMetrics` objects, and returns them as JSON.

---

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Server entry point, graceful shutdown
│   ├── app.ts                # Express app factory (middleware + routes)
│   ├── config.ts             # Env-var config object
│   ├── prometheus/
│   │   ├── client.ts         # Axios wrapper for Prometheus HTTP API v1
│   │   ├── nodeQueries.ts    # PromQL queries for Linux (node_exporter)
│   │   └── windowsQueries.ts # PromQL queries for Windows (windows_exporter)
│   ├── routes/
│   │   ├── health.ts         # /api/health
│   │   ├── targets.ts        # /api/targets
│   │   ├── metrics.ts        # /api/metrics
│   │   └── dashboard.ts      # /api/dashboard
│   └── types/
│       └── index.ts          # All TypeScript interfaces and types
└── package.json
```

---

## Configuration

All config is read from environment variables (`.env` file, loaded via `dotenv`).

| Variable                | Default                                       | Description                                               |
| ----------------------- | --------------------------------------------- | --------------------------------------------------------- |
| `PORT`                  | `3001`                                        | Port the Express server listens on                        |
| `PROMETHEUS_URL`        | `http://100.113.145.105:9090`                 | Base URL of the Prometheus server                         |
| `PROMETHEUS_TIMEOUT_MS` | `10000`                                       | Request timeout for upstream Prometheus HTTP calls (ms)   |
| `CORS_ORIGINS`          | `http://localhost:5173,http://localhost:4173` | Comma-separated list of allowed CORS origins (production) |
| `NODE_ENV`              | `development`                                 | `development` or `production`                             |

In **development**, any `localhost` origin is automatically allowed regardless of `CORS_ORIGINS`.

---

## Entry Point

**`src/index.ts`**

Starts the HTTP server by calling `app.listen()` on the configured port. Registers `SIGTERM` and `SIGINT` handlers so in-flight requests finish before the process exits (graceful shutdown).

---

## Express App (`app.ts`)

Sets up the following middleware stack in order:

| Middleware           | Purpose                                                                      |
| -------------------- | ---------------------------------------------------------------------------- |
| `helmet`             | Sets secure HTTP response headers                                            |
| `cors`               | Allows cross-origin requests from the frontend                               |
| `express-rate-limit` | 300 requests / minute per IP on all `/api/*` routes                          |
| `morgan`             | HTTP request logging (`dev` format in development, `combined` in production) |
| `express.json()`     | Parse JSON request bodies                                                    |

Then mounts the four route modules and a global error handler that returns `502` with the error message (stack trace is logged but not sent in production).

---

## Prometheus Layer

### `client.ts`

A thin Axios instance pre-configured with `baseURL` and `timeout` from config.

| Export         | Signature                                               | What it does                                                                                                                                     |
| -------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `instantQuery` | `(promql: string) => Promise<PrometheusVectorResult[]>` | Runs a PromQL instant query against `/api/v1/query`. Throws a descriptive error if Prometheus returns a non-success status or the request fails. |
| `fetchTargets` | `() => Promise<PrometheusTargetsResponse["data"]>`      | Calls `/api/v1/targets?state=active` and returns the full targets payload.                                                                       |
| `parseVal`     | `(result) => number`                                    | Parses the stringified float from a vector result's `value[1]`.                                                                                  |
| `toMap`        | `(results) => Map<string, number>`                      | Converts a vector result array into a `Map<instance, value>` for O(1) per-instance lookup.                                                       |
| `pct`          | `(used, total) => number`                               | Returns `(used / total) * 100`, clamped to 100, safe against divide-by-zero.                                                                     |

---

### `nodeQueries.ts` (Linux)

**`fetchLinuxNodeMetrics()`** — fires **18 PromQL instant queries in a single `Promise.all`**, then joins all results by `instance` label.

| #   | Metric                    | PromQL                                                                |
| --- | ------------------------- | --------------------------------------------------------------------- |
| 1   | Node up?                  | `up{job=~"node_exporter\|node"}`                                      |
| 2   | OS hostname               | `node_uname_info` (reads `nodename` label)                            |
| 3   | CPU usage %               | `100 - avg idle rate (2 m)`                                           |
| 4   | CPU core count            | `count of idle mode CPUs per instance`                                |
| 5   | Total RAM                 | `node_memory_MemTotal_bytes`                                          |
| 6   | Available RAM             | `node_memory_MemAvailable_bytes`                                      |
| 7   | Disk total (root `/`)     | `node_filesystem_size_bytes{mountpoint="/"}`                          |
| 8   | Disk available (root `/`) | `node_filesystem_avail_bytes{mountpoint="/"}`                         |
| 9   | Disk read B/s             | `rate(node_disk_read_bytes_total[5m])`                                |
| 10  | Disk write B/s            | `rate(node_disk_written_bytes_total[5m])`                             |
| 11  | Network RX B/s            | `rate(node_network_receive_bytes_total[5m])` (physical NICs only)     |
| 12  | Network TX B/s            | `rate(node_network_transmit_bytes_total[5m])` (physical NICs only)    |
| 13  | Uptime (seconds)          | `node_time_seconds - node_boot_time_seconds`                          |
| 14  | Load average 1 m          | `node_load1`                                                          |
| 15  | Load average 5 m          | `node_load5`                                                          |
| 16  | Load average 15 m         | `node_load15`                                                         |
| 17  | Temperature (°C)          | `max node_hwmon_temp_celsius` (excludes PCH/ACPI/Wi-Fi chips)         |
| 18  | Running processes         | `node_procs_running`                                                  |
| 19  | GPU VRAM total            | `sum nvidia_gpu_memory_total_bytes` (NVIDIA exporter, null if absent) |
| 20  | GPU VRAM used             | `sum nvidia_gpu_memory_used_bytes`                                    |

**Node name resolution priority:** `metric.name` label → `metric.hostname` label → `node_uname_info` nodename → IP from instance.

**Role detection:**

- `role` label present → use it directly
- `group == "ubuntu_servers"` → `"host"`
- `job == "node_exporter"` → `"host"`
- otherwise → `"unknown"`

**Status derivation:**

- Exporter down → `"unreachable"`
- CPU > 90 % or memory > 90 % → `"degraded"`
- otherwise → `"running"`

---

### `windowsQueries.ts` (Windows)

**`fetchWindowsVMMetrics()`** — same pattern as Linux: **15 PromQL queries in one `Promise.all`**, all scoped to `job="windows_vms"`.

| #   | Metric             | Windows exporter metric                                                                         |
| --- | ------------------ | ----------------------------------------------------------------------------------------------- |
| 1   | Node up?           | `up{job="windows_vms"}`                                                                         |
| 2   | Hostname           | `windows_cs_hostname` (reads `hostname` label)                                                  |
| 3   | CPU usage %        | `100 - avg idle rate (2 m)`                                                                     |
| 4   | CPU core count     | `count of idle mode CPUs`                                                                       |
| 5   | Total RAM          | `windows_cs_physical_memory_bytes`                                                              |
| 6   | Free RAM           | `windows_os_physical_memory_free_bytes`                                                         |
| 7   | C: drive total     | `windows_logical_disk_size_bytes{volume="C:"}`                                                  |
| 8   | C: drive free      | `windows_logical_disk_free_bytes{volume="C:"}`                                                  |
| 9   | Disk read B/s      | `rate(windows_logical_disk_read_bytes_total[5m])`                                               |
| 10  | Disk write B/s     | `rate(windows_logical_disk_write_bytes_total[5m])`                                              |
| 11  | Network RX B/s     | `rate(windows_net_bytes_received_total[5m])` (skips ISATAP/Teredo/Loopback)                     |
| 12  | Network TX B/s     | `rate(windows_net_bytes_sent_total[5m])`                                                        |
| 13  | Uptime (seconds)   | `windows_system_system_up_time`                                                                 |
| 14  | Temperature (K→°C) | `windows_thermalzone_temperature_kelvin` – converted as `K - 273.15`                            |
| 15  | Process count      | `windows_system_processes`                                                                      |
| 16  | GPU VRAM total     | `sum windows_gpu_dedicated_video_memory_bytes` (windows_exporter GPU collector, null if absent) |
| 17  | GPU VRAM used      | `sum windows_gpu_dedicated_video_memory_used_bytes`                                             |

**Notable differences from Linux:**

- All Windows nodes are assigned `role: "vm"` (no host detection).
- Load averages are always `null` (Windows has no equivalent metric).
- Temperature conversion: raw Kelvin value is only used if `> 100 K` (avoids reporting 0 K as -273 °C when unavailable).

---

## API Endpoints

All endpoints are prefixed with `/api`. Rate limit: **300 requests / minute**.

### Health

#### `GET /api/health`

Backend liveness check. Always returns `200` if the server is running.

```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2026-03-04T10:00:00.000Z",
  "environment": "development"
}
```

#### `GET /api/health/prometheus`

Probes connectivity to Prometheus by calling `/api/v1/targets`. Returns a count of up/down targets.

```json
{
  "success": true,
  "prometheusUrl": "http://100.113.145.105:9090",
  "activeTargets": 5,
  "up": 4,
  "down": 1,
  "timestamp": "2026-03-04T10:00:00.000Z"
}
```

---

### Targets

Wraps the Prometheus `/api/v1/targets` endpoint with OS detection.

#### `GET /api/targets`

Returns all active scrape targets. Optional query param `?scrapePool=windows_vms` filters by pool.

#### `GET /api/targets/:scrapePool`

Convenience alias — same as the query param filter but as a path segment.

**Response shape:**

```json
{
  "success": true,
  "total": 5,
  "data": [
    {
      "instance": "192.168.1.10:9100",
      "job": "node_exporter",
      "scrapePool": "node_exporter",
      "health": "up",
      "lastScrape": "2026-03-04T09:59:55Z",
      "lastError": "",
      "lastScrapeDuration": 0.012,
      "scrapeInterval": "15s",
      "scrapeUrl": "http://192.168.1.10:9100/metrics",
      "os": "linux"
    }
  ]
}
```

**OS detection:** if `job` label contains `"windows"` → `"windows"`, otherwise `"linux"`.

---

### Metrics

#### `GET /api/metrics/nodes`

Fetches `fetchLinuxNodeMetrics()` and returns the full `NodeMetrics[]` array.

#### `GET /api/metrics/windows-vms`

Fetches `fetchWindowsVMMetrics()` and returns the full `NodeMetrics[]` array.

#### `GET /api/metrics/all`

Runs both Linux and Windows fetches in **parallel** using `Promise.allSettled`. If one side fails, the other still succeeds and the response includes a `warnings` array with the error messages.

```json
{
  "success": true,
  "total": 8,
  "data": [
    /* NodeMetrics[] – linux + windows combined */
  ],
  "warnings": []
}
```

#### `GET /api/metrics/:instance`

Looks up a single node by its `instance` string (e.g., `192.168.1.10:9100`). The instance is URL-decoded before matching. Returns `404` if not found. Fetches both Linux and Windows in parallel and searches the combined result.

---

### Dashboard

#### `GET /api/dashboard/summary`

Aggregates both Linux and Windows metrics into a single summary object for the overview cards.

```json
{
  "success": true,
  "data": {
    "totalNodes": 8,
    "totalHosts": 2,
    "totalVMs": 6,
    "runningCount": 7,
    "degradedCount": 1,
    "unreachableCount": 0,
    "avgCpuPercent": 23.4,
    "avgMemPercent": 61.2,
    "avgDiskPercent": 45.0,
    "linuxCount": 3,
    "windowsCount": 5
  }
}
```

- **hosts** = nodes where `role === "host"`
- **vms** = all others
- **avgCpu/avgMem/avgDisk** = arithmetic mean across all nodes (Linux + Windows)

---

## Types

Defined in `src/types/index.ts`:

| Type                        | Description                                                                |
| --------------------------- | -------------------------------------------------------------------------- |
| `PrometheusVectorResult`    | Raw instant query result: `{ metric: labels, value: [timestamp, string] }` |
| `PrometheusQueryResponse`   | Full response envelope from `/api/v1/query`                                |
| `PrometheusTargetsResponse` | Full response envelope from `/api/v1/targets`                              |
| `PrometheusTarget`          | A single scrape target object                                              |
| `NodeMetrics`               | Normalised per-node metrics returned by this backend                       |
| `TargetInfo`                | Slimmed-down target info returned by `/api/targets`                        |
| `DashboardSummary`          | Aggregated stats returned by `/api/dashboard/summary`                      |
| `VMStatus`                  | `"running"` \| `"unreachable"` \| `"degraded"`                             |
| `NodeRole`                  | `"host"` \| `"vm"` \| `"unknown"`                                          |
| `NodeOS`                    | `"linux"` \| `"windows"`                                                   |

**Key `NodeMetrics` GPU fields:**

| Field              | Type             | Description                                                       |
| ------------------ | ---------------- | ----------------------------------------------------------------- |
| `vramTotalBytes`   | `number \| null` | Total GPU VRAM in bytes (`null` if no GPU / exporter not present) |
| `vramUsedBytes`    | `number \| null` | Used GPU VRAM in bytes                                            |
| `vramUsagePercent` | `number \| null` | GPU VRAM usage 0–100 (`null` if unavailable)                      |

---

## Data Flow (end-to-end)

```
Frontend calls  GET /api/metrics/all
                        │
                        ▼
          metrics.ts route handler
                        │
          Promise.allSettled([
            fetchLinuxNodeMetrics(),
            fetchWindowsVMMetrics()
          ])
                   │              │
                   ▼              ▼
          nodeQueries.ts   windowsQueries.ts
          Promise.all(20   Promise.all(17
          PromQL queries)  PromQL queries)
                   │              │
                   ▼              ▼
            client.ts instantQuery()
            → Axios GET /api/v1/query?query=<promql>
            → Prometheus HTTP API
                   │
                   ▼
           raw PrometheusVectorResult[]
                   │
          toMap() / parseVal() / pct()
          → join maps by instance label
          → derive status, role, name
                   │
                   ▼
           NodeMetrics[] (typed, normalised)
                   │
           combine linux + windows
                   │
                   ▼
          200 JSON { success, total, data }
```

---

## Running Locally

```bash
# Install dependencies
pnpm install

# Development (hot-reload via tsx watch)
pnpm run dev

# Production build
pnpm run build
pnpm start
```

**Minimum `.env`:**

```env
PORT=3001
PROMETHEUS_URL=http://<your-prometheus-ip>:9090
NODE_ENV=development
```
