/**
 * prometheusClient.ts
 *
 * Thin wrapper around Prometheus HTTP API v1.
 * All requests go to the Prometheus instance reachable via Tailscale.
 */
import axios, { AxiosError } from "axios";
import { config } from "../config";
import type {
  PrometheusQueryResponse,
  PrometheusTargetsResponse,
  PrometheusVectorResult,
} from "../types";

const client = axios.create({
  baseURL: config.prometheusUrl,
  timeout: config.prometheusTimeoutMs,
  headers: { Accept: "application/json" },
});

/** Execute an instant PromQL query and return the result vector. */
export async function instantQuery(
  promql: string,
): Promise<PrometheusVectorResult[]> {
  try {
    const { data } = await client.get<PrometheusQueryResponse>(
      "/api/v1/query",
      {
        params: { query: promql },
      },
    );
    if (data.status !== "success") {
      throw new Error(
        `Prometheus error [${data.errorType ?? "unknown"}]: ${data.error ?? ""}`,
      );
    }
    return data.data.result;
  } catch (err) {
    const axiosErr = err as AxiosError;
    if (axiosErr.isAxiosError) {
      throw new Error(
        `Prometheus request failed: ${axiosErr.message} (url: ${config.prometheusUrl})`,
      );
    }
    throw err;
  }
}

/** Fetch all active + dropped targets from Prometheus. */
export async function fetchTargets(): Promise<
  PrometheusTargetsResponse["data"]
> {
  try {
    const { data } = await client.get<PrometheusTargetsResponse>(
      "/api/v1/targets",
      { params: { state: "active" } },
    );
    if (data.status !== "success") {
      throw new Error(`Prometheus targets error: ${data.error ?? "unknown"}`);
    }
    return data.data;
  } catch (err) {
    const axiosErr = err as AxiosError;
    if (axiosErr.isAxiosError) {
      throw new Error(`Prometheus targets request failed: ${axiosErr.message}`);
    }
    throw err;
  }
}

/** Helper – parse the float value from a vector result. */
export function parseVal(result: PrometheusVectorResult): number {
  return parseFloat(result.value[1]) || 0;
}

/** Build a Map<instance, number> for O(1) lookup. */
export function toMap(results: PrometheusVectorResult[]): Map<string, number> {
  return new Map(results.map((r) => [r.metric.instance ?? "", parseVal(r)]));
}

/** percentage helper */
export function pct(used: number, total: number): number {
  if (!total) return 0;
  return Math.min(100, (used / total) * 100);
}
