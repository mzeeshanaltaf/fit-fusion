/**
 * Browser client for the FitFusion API (FastAPI).
 *
 * Auth: Better Auth stays in Next.js for login only. For every API call we send a
 * short-lived JWT from `GET /api/auth/token` (same origin, session cookie). The token is:
 *   - cached in memory until it is close to expiring (refreshed REFRESH_MARGIN_MS early),
 *   - fetched once at a time (concurrent callers share one in-flight request),
 *   - dropped and re-fetched once when the API answers 401, then the request is retried.
 *
 * Base URL: `NEXT_PUBLIC_API_URL` (inlined at BUILD time).
 *
 * Dates: the server never guesses a timezone. Always pass `localDate()` for `today` and
 * `performed_on` (see the Phase 3 contract in docs/plan/HANDOFF.md).
 */
import type {
  CreditBalance,
  CreditHistoryPage,
  EquipmentList,
  GeneratePlanRequest,
  JobResponse,
  LogList,
  LogOut,
  OverviewResponse,
  PlanDetail,
  PlanList,
  ProfileResponse,
  ProfileUpdate,
  ProgressResponse,
} from "@/lib/types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

/** Refresh the token when fewer than this many ms of life are left. */
const REFRESH_MARGIN_MS = 60_000;

// ─── Errors ───────────────────────────────────────────────────────

/** Error codes the swap / regenerate endpoints return in `detail.code`. */
export type EditErrorCode =
  | "edit_limit_reached"
  | "plan_changed"
  | "no_replacement_available"
  | "plan_not_found"
  | "workout_not_found"
  | "ai_failed"
  | "ai_timeout";

export class ApiError extends Error {
  readonly status: number;
  /** Machine-readable code for edit errors; undefined for plain string errors. */
  readonly code?: EditErrorCode | string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** FastAPI errors are `{detail: string}`, `{detail: {code, message}}` or `{detail: [{loc, msg}]}`. */
function describeError(status: number, body: unknown): ApiError {
  const detail =
    body && typeof body === "object" && "detail" in body
      ? (body as { detail: unknown }).detail
      : undefined;

  if (typeof detail === "string") return new ApiError(status, detail);

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { loc?: unknown[]; msg?: string };
    const field = Array.isArray(first.loc)
      ? String(first.loc[first.loc.length - 1] ?? "")
      : "";
    const msg = first.msg ?? "Invalid value";
    return new ApiError(status, field ? `${field.replace(/_/g, " ")}: ${msg}` : msg);
  }

  if (detail && typeof detail === "object") {
    const d = detail as { code?: string; message?: string };
    if (d.message) return new ApiError(status, d.message, d.code);
  }

  if (status === 401) return new ApiError(401, "Your session has ended. Sign in again.");
  if (status === 403) return new ApiError(403, "Verify your email to use this.");
  if (status >= 500) return new ApiError(status, "The server had a problem. Try again in a moment.");
  return new ApiError(status, `Request failed (${status}).`);
}

// ─── Token cache ──────────────────────────────────────────────────

let cached: { token: string; expiresAt: number } | null = null;
let inflight: Promise<string> | null = null;

/** Reads `exp` (seconds) from a JWT without verifying it; the server does that. */
function expiryOf(token: string): number {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = (JSON.parse(json) as { exp?: number }).exp;
    if (typeof exp === "number") return exp * 1000;
  } catch {
    // fall through
  }
  // Unreadable token: treat it as short-lived so we simply fetch another next time.
  return Date.now() + 5 * 60_000;
}

async function fetchToken(): Promise<string> {
  let res: Response;
  try {
    res = await fetch("/api/auth/token", { credentials: "include", cache: "no-store" });
  } catch {
    throw new ApiError(0, "Could not reach the server. Check your connection.");
  }
  if (!res.ok) throw new ApiError(401, "Your session has ended. Sign in again.");
  const body = (await res.json().catch(() => null)) as { token?: string } | null;
  if (!body?.token) throw new ApiError(401, "Your session has ended. Sign in again.");
  cached = { token: body.token, expiresAt: expiryOf(body.token) };
  return body.token;
}

async function getToken(): Promise<string> {
  if (cached && cached.expiresAt - Date.now() > REFRESH_MARGIN_MS) return cached.token;
  inflight ??= fetchToken().finally(() => {
    inflight = null;
  });
  return inflight;
}

/** Call on sign-out so the next user never reuses this user's token. */
export function clearApiToken(): void {
  cached = null;
  inflight = null;
}

// ─── Request core ─────────────────────────────────────────────────

type Query = Record<string, string | number | undefined>;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Query): string {
  if (!API_URL) {
    throw new ApiError(0, "The API address is not configured (NEXT_PUBLIC_API_URL).");
  }
  const url = new URL(`${API_URL}/v1${path}`);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function send(path: string, opts: RequestOptions, token: string): Promise<Response> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  try {
    return await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, "Could not reach the server. Check your connection.");
  }
}

/** Sends the request; on 401 refreshes the token once and retries. Returns an OK response. */
async function perform(path: string, opts: RequestOptions = {}): Promise<Response> {
  let res = await send(path, opts, await getToken());
  if (res.status === 401) {
    clearApiToken();
    res = await send(path, opts, await getToken());
  }
  if (!res.ok) {
    throw describeError(res.status, await res.json().catch(() => null));
  }
  return res;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const res = await perform(path, opts);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ─── Dates ────────────────────────────────────────────────────────

/** The user's own calendar date, `YYYY-MM-DD`. Never use `toISOString()` (that is UTC). */
export function localDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─── Endpoints ────────────────────────────────────────────────────

export const api = {
  overview: (signal?: AbortSignal) => request<OverviewResponse>("/me/overview", { signal }),

  // Plans and jobs
  generatePlan: (body: GeneratePlanRequest) =>
    request<JobResponse>("/plans/generate", { method: "POST", body }),
  getJob: (id: string, signal?: AbortSignal) => request<JobResponse>(`/jobs/${id}`, { signal }),
  listPlans: (limit = 20, offset = 0, signal?: AbortSignal) =>
    request<PlanList>("/plans", { query: { limit, offset }, signal }),
  getPlan: (id: string, signal?: AbortSignal) => request<PlanDetail>(`/plans/${id}`, { signal }),
  deletePlan: (id: string) => request<void>(`/plans/${id}`, { method: "DELETE" }),

  // Edits (free, 5 per plan, ~10-30 s each)
  swapWorkout: (id: string, index: number) =>
    request<PlanDetail>(`/plans/${id}/workouts/${index}/swap`, { method: "POST" }),
  regenerateDay: (id: string, day: number) =>
    request<PlanDetail>(`/plans/${id}/nutrition/${day}/regenerate`, { method: "POST" }),

  /** The PDF needs the Bearer token, so a plain link cannot work: fetch it, then save the blob. */
  planPdf: async (id: string): Promise<{ blob: Blob; filename: string }> => {
    const res = await perform(`/plans/${id}/pdf`);
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = /filename="?([^";]+)"?/i.exec(disposition);
    return { blob: await res.blob(), filename: match?.[1] ?? `fitfusion-plan-${id.slice(0, 8)}.pdf` };
  },

  // Credits
  credits: (signal?: AbortSignal) => request<CreditBalance>("/credits", { signal }),
  creditHistory: (limit = 20, offset = 0, signal?: AbortSignal) =>
    request<CreditHistoryPage>("/credits/history", { query: { limit, offset }, signal }),

  // Profile and library
  getProfile: (signal?: AbortSignal) => request<ProfileResponse>("/profile", { signal }),
  saveProfile: (body: ProfileUpdate) => request<ProfileResponse>("/profile", { method: "PUT", body }),
  equipment: (signal?: AbortSignal) => request<EquipmentList>("/library/equipment", { signal }),

  // Logs and progress
  planLogs: (id: string, signal?: AbortSignal) => request<LogList>(`/plans/${id}/logs`, { signal }),
  logWorkout: (id: string, workoutIndex: number, performedOn: string = localDate()) =>
    request<LogOut>(`/plans/${id}/logs`, {
      method: "POST",
      body: { workout_index: workoutIndex, performed_on: performedOn },
    }),
  unlogWorkout: (id: string, workoutIndex: number, performedOn: string) =>
    request<void>(`/plans/${id}/logs`, {
      method: "DELETE",
      query: { workout_index: workoutIndex, performed_on: performedOn },
    }),
  progress: (signal?: AbortSignal) =>
    request<ProgressResponse>("/progress", { query: { today: localDate() }, signal }),
};
