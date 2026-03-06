/**
 * prometheusService.ts
 *
 * Calls the VM-Management backend API (Express bridge) which in turn
 * queries Prometheus over Tailscale. The frontend never talks to
 * Prometheus directly.
 *
 * Backend base URL: VITE_API_BASE_URL (default: http://localhost:3001)
 */

import axios from 'axios'
import type { NodeMetrics, DashboardSummary } from '@/types/prometheus'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

const api = axios.create({ baseURL: API_BASE })

// ─── response envelope from the backend ──────────────────────────────────────

interface ApiResponse<T> {
  success: boolean
  total?: number
  data: T
  warnings?: string[]
  error?: string
}

// ─── exports ─────────────────────────────────────────────────────────────────

/**
 * Fetch all node metrics (Linux + Windows) from the backend.
 * Maps to GET /api/metrics/all
 */
export async function fetchAllNodeMetrics(): Promise<NodeMetrics[]> {
  const { data } = await api.get<ApiResponse<NodeMetrics[]>>('/api/metrics/all')
  if (!data.success && !data.data?.length) {
    throw new Error(data.error ?? 'Failed to fetch metrics')
  }
  return data.data
}

/**
 * Fetch only Linux (node_exporter) node metrics.
 * Maps to GET /api/metrics/nodes
 */
export async function fetchLinuxNodeMetrics(): Promise<NodeMetrics[]> {
  const { data } =
    await api.get<ApiResponse<NodeMetrics[]>>('/api/metrics/nodes')
  return data.data
}

/**
 * Fetch only Windows VM metrics.
 * Maps to GET /api/metrics/windows-vms
 */
export async function fetchWindowsVMMetrics(): Promise<NodeMetrics[]> {
  const { data } = await api.get<ApiResponse<NodeMetrics[]>>(
    '/api/metrics/windows-vms'
  )
  return data.data
}

/**
 * Fetch a single instance's metrics.
 * Maps to GET /api/metrics/:instance
 */
export async function fetchInstanceMetrics(
  instance: string
): Promise<NodeMetrics> {
  const { data } = await api.get<ApiResponse<NodeMetrics>>(
    `/api/metrics/${encodeURIComponent(instance)}`
  )
  return data.data
}

/**
 * Fetch the dashboard summary (aggregated counts + averages).
 * Maps to GET /api/dashboard/summary
 */
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await api.get<ApiResponse<DashboardSummary>>(
    '/api/dashboard/summary'
  )
  return data.data
}

/**
 * Fetch all active scrape targets with health status.
 * Maps to GET /api/targets
 */
export async function fetchTargets(scrapePool?: string) {
  const params = scrapePool ? { scrapePool } : {}
  const { data } = await api.get('/api/targets', { params })
  return data.data
}
