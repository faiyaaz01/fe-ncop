import { apiUrl } from "./api-config";
import { userSessionService } from "./user-session";
import type { PageResponse } from "./auth-types";
import type {
  QaRfq,
  QaRfqRequestDto,
  QaRfqStatus,
  QaPriority,
  QaMfr,
  QaMfrRequestDto,
  QaMfrStatus,
  MfrMatchResult,
  QaKpis,
  QaQuery,
  QaQueryRequestDto,
} from "./qa-types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const session = userSessionService.getCurrentUser();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (session?.token) {
    headers["Authorization"] = `Bearer ${session.token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 401) await userSessionService.handleUnauthorizedResponse();
    const body = await res.text().catch(() => "");
    throw new Error(body || `API error ${res.status}`);
  }
  if (res.status === 204) {
    return {} as T;
  }
  return res.json() as Promise<T>;
}

// ─── QA RFQ APIs ─────────────────────────────────────────────────────────────

/** GET /api/v1/qa/rfqs — fetch paginated RFQs */
export async function fetchQaRfqs(
  params: {
    page?: number | undefined;
    size?: number | undefined;
    search?: string | undefined;
    status?: QaRfqStatus | string | undefined;
    priority?: QaPriority | string | undefined;
    dosageForm?: string | undefined;
  } = {},
): Promise<PageResponse<QaRfq>> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 0));
  query.set("size", String(params.size ?? 10));
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.status && params.status !== "all" && params.status !== "ALL") {
    query.set("status", params.status);
  }
  if (params.priority && params.priority !== "all" && params.priority !== "ALL") {
    query.set("priority", params.priority);
  }
  if (params.dosageForm && params.dosageForm !== "all" && params.dosageForm !== "ALL") {
    query.set("dosageForm", params.dosageForm);
  }

  const res = await fetch(apiUrl(`/api/v1/qa/rfqs?${query.toString()}`), {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<PageResponse<QaRfq>>(res);
}

/** GET /api/v1/qa/rfqs/:id — fetch single RFQ */
export async function fetchQaRfqById(id: string): Promise<QaRfq> {
  const res = await fetch(apiUrl(`/api/v1/qa/rfqs/${id}`), {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<QaRfq>(res);
}

/** POST /api/v1/qa/rfqs — create a new QA RFQ */
export async function createQaRfq(dto: QaRfqRequestDto): Promise<QaRfq> {
  const res = await fetch(apiUrl("/api/v1/qa/rfqs"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(dto),
  });
  return handleResponse<QaRfq>(res);
}

/** PUT /api/v1/qa/rfqs/:id — update existing QA RFQ */
export async function updateQaRfq(id: string, dto: QaRfqRequestDto): Promise<QaRfq> {
  const res = await fetch(apiUrl(`/api/v1/qa/rfqs/${id}`), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(dto),
  });
  return handleResponse<QaRfq>(res);
}

/** DELETE /api/v1/qa/rfqs/:id — delete QA RFQ */
export async function deleteQaRfq(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/qa/rfqs/${id}`), {
    method: "DELETE",
    headers: authHeaders(),
  });
  await handleResponse<void>(res);
}

/** GET /api/v1/qa/rfqs/:id/matches — run MFR matching engine */
export async function fetchMfrMatches(id: string, productId?: string): Promise<MfrMatchResult[]> {
  const suffix = productId ? `?productId=${encodeURIComponent(productId)}` : "";
  const res = await fetch(apiUrl(`/api/v1/qa/rfqs/${id}/matches${suffix}`), {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<MfrMatchResult[]>(res);
}

// ─── QA MFR APIs ─────────────────────────────────────────────────────────────

/** GET /api/v1/qa/mfrs — fetch paginated MFRs */
export async function fetchQaMfrs(
  params: {
    page?: number | undefined;
    size?: number | undefined;
    search?: string | undefined;
    status?: QaMfrStatus | string | undefined;
  } = {},
): Promise<PageResponse<QaMfr>> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 0));
  query.set("size", String(params.size ?? 10));
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.status && params.status !== "all" && params.status !== "ALL") {
    query.set("status", params.status);
  }

  const res = await fetch(apiUrl(`/api/v1/qa/mfrs?${query.toString()}`), {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<PageResponse<QaMfr>>(res);
}

/** GET /api/v1/qa/mfrs/:id — fetch single MFR */
export async function fetchQaMfrById(id: string): Promise<QaMfr> {
  const res = await fetch(apiUrl(`/api/v1/qa/mfrs/${id}`), {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<QaMfr>(res);
}

/** POST /api/v1/qa/mfrs — create a new MFR */
export async function createQaMfr(dto: QaMfrRequestDto): Promise<QaMfr> {
  const res = await fetch(apiUrl("/api/v1/qa/mfrs"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(dto),
  });
  return handleResponse<QaMfr>(res);
}

/** POST /api/v1/qa/mfrs/from-rfq — create MFR initialized from RFQ */
export async function createMfrFromRfq(
  rfqId: string,
  rfqProductId?: string,
  batchSize?: number,
  batchUnit?: string,
): Promise<QaMfr> {
  const res = await fetch(apiUrl("/api/v1/qa/mfrs/from-rfq"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ rfqId, rfqProductId, batchSize, batchUnit }),
  });
  return handleResponse<QaMfr>(res);
}

/** POST /api/v1/qa/mfrs/clone — clone from product or existing MFR */
export async function cloneMfr(
  targetType: "PRODUCT" | "MFR",
  targetId: string,
  rfqId?: string,
): Promise<QaMfr> {
  const res = await fetch(apiUrl("/api/v1/qa/mfrs/clone"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ targetType, targetId, rfqId }),
  });
  return handleResponse<QaMfr>(res);
}

/** PUT /api/v1/qa/mfrs/:id — update existing MFR */
export async function updateQaMfr(id: string, dto: QaMfrRequestDto): Promise<QaMfr> {
  const res = await fetch(apiUrl(`/api/v1/qa/mfrs/${id}`), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(dto),
  });
  return handleResponse<QaMfr>(res);
}

/** Upload a validated PDF/image change-part layout and persist its reference on the MFR. */
export async function uploadMfrChangePart(id: string, type: "compression" | "strip", file: File): Promise<QaMfr> {
  const session = userSessionService.getCurrentUser();
  const body = new FormData();
  body.append("type", type);
  body.append("file", file);
  const headers: HeadersInit = {};
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  const res = await fetch(apiUrl(`/api/v1/qa/mfrs/${id}/change-parts/upload`), { method: "POST", headers, body });
  return handleResponse<QaMfr>(res);
}

/** POST /api/v1/qa/mfrs/:id/submit — submit/approve MFR */
export async function submitQaMfr(id: string, user?: string): Promise<QaMfr> {
  const res = await fetch(apiUrl(`/api/v1/qa/mfrs/${id}/submit`), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ user }),
  });
  return handleResponse<QaMfr>(res);
}

/** DELETE /api/v1/qa/mfrs/:id — delete MFR */
export async function deleteQaMfr(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/qa/mfrs/${id}`), {
    method: "DELETE",
    headers: authHeaders(),
  });
  await handleResponse<void>(res);
}

// ─── Dashboard KPIs ──────────────────────────────────────────────────────────

/** GET /api/v1/qa/dashboard/kpis — fetch QA KPI counts */
export async function fetchQaKpis(): Promise<QaKpis> {
  const res = await fetch(apiUrl("/api/v1/qa/dashboard/kpis"), {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<QaKpis>(res);
}

// ─── QA Technical Queries ───────────────────────────────────────────────────

/** POST /api/v1/qa/queries — raise a technical query */
export async function raiseQaQuery(dto: QaQueryRequestDto): Promise<QaQuery> {
  const res = await fetch(apiUrl("/api/v1/qa/queries"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(dto),
  });
  return handleResponse<QaQuery>(res);
}

/** GET /api/v1/qa/queries — get all technical queries visible to the user */
export async function fetchQaQueries(): Promise<QaQuery[]> {
  const res = await fetch(apiUrl("/api/v1/qa/queries"), {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<QaQuery[]>(res);
}

/** GET /api/v1/qa/queries/rfq/:rfqId — get queries for an RFQ */
export async function fetchQueriesByRfq(rfqId: string): Promise<QaQuery[]> {
  const res = await fetch(apiUrl(`/api/v1/qa/queries/rfq/${rfqId}`), {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<QaQuery[]>(res);
}

/** PUT /api/v1/qa/queries/:id/resolve — resolve query */
export async function resolveQaQuery(id: string, responseText: string): Promise<QaQuery> {
  const res = await fetch(apiUrl(`/api/v1/qa/queries/${id}/resolve`), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ responseText }),
  });
  return handleResponse<QaQuery>(res);
}
