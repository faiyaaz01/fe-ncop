import { apiUrl } from "./api-config";
import { userSessionService } from "./user-session";
import type { Client, ClientRequestDto, DocumentType, PageResponse } from "./client-types";
import { normalizeCountryName } from "./country";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const session = userSessionService.getCurrentUser();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (session?.token) {
    headers["Authorization"] = `Bearer ${session.token}`;
  }
  return headers;
}

function authToken(): string | null {
  return userSessionService.getCurrentUser()?.token ?? null;
}

function normalizeClientCountries(client: Client): Client {
  return {
    ...client,
    addresses: client.addresses?.map((address) => ({
      ...address,
      country: normalizeCountryName(address.country),
    })),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 401) await userSessionService.handleUnauthorizedResponse();
    const body = await res.text().catch(() => "");
    throw new Error(body || `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Client API ──────────────────────────────────────────────────────────────

/** GET /api/clients — fetch paginated clients */
export async function fetchClients(
  params: {
    page?: number | undefined;
    size?: number | undefined;
    search?: string | undefined;
  } = {},
): Promise<PageResponse<Client>> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 0));
  query.set("size", String(params.size ?? 10));
  if (params.search) query.set("search", params.search);

  const res = await fetch(apiUrl(`/api/v1/clients?${query.toString()}`), {
    method: "GET",
    headers: authHeaders(),
  });
  const page = await handleResponse<PageResponse<Client>>(res);
  return { ...page, content: page.content.map(normalizeClientCountries) };
}

/** GET /api/clients/all — fetch all clients (unpaginated for select dropdowns) */
export async function fetchAllClients(): Promise<Client[]> {
  const res = await fetch(apiUrl("/api/v1/clients/all"), {
    method: "GET",
    headers: authHeaders(),
  });
  const clients = await handleResponse<Client[]>(res);
  return clients.map(normalizeClientCountries);
}

/** GET /api/clients/count — fetch total client count */
export async function fetchClientCount(): Promise<number> {
  const res = await fetch(apiUrl("/api/v1/clients/count"), {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<number>(res);
}

/** GET /api/clients/level-counts — fetch client count per level */
export async function fetchClientLevelCounts(): Promise<Record<string, number>> {
  const res = await fetch(apiUrl("/api/v1/clients/level-counts"), {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<Record<string, number>>(res);
}

/** GET /api/clients/:id — fetch a single client */
export async function fetchClient(id: string): Promise<Client> {
  const res = await fetch(apiUrl(`/api/v1/clients/${id}`), {
    method: "GET",
    headers: authHeaders(),
  });
  return normalizeClientCountries(await handleResponse<Client>(res));
}

/** POST /api/clients — create a new client */
export async function createClient(dto: ClientRequestDto): Promise<Client> {
  const res = await fetch(apiUrl("/api/v1/clients"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(dto),
  });
  return normalizeClientCountries(await handleResponse<Client>(res));
}

/** PUT /api/clients/:id — update an existing client */
export async function updateClient(id: string, dto: ClientRequestDto): Promise<Client> {
  const res = await fetch(apiUrl(`/api/v1/clients/${id}`), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(dto),
  });
  return normalizeClientCountries(await handleResponse<Client>(res));
}

/** DELETE /api/clients/:id — permanently remove a client without RFQs */
export async function deleteClient(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/clients/${id}`), {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) await userSessionService.handleUnauthorizedResponse();
    if (res.status === 409) {
      throw new Error("This client has RFQs and cannot be deleted.");
    }
    const body = await res.text().catch(() => "");
    throw new Error(body || `API error ${res.status}`);
  }
}

/** POST /api/clients/:id/send-email — resend registration email to all POCs */
export async function resendRegistrationEmail(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/clients/${id}/send-email`), {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) await userSessionService.handleUnauthorizedResponse();
    const body = await res.text().catch(() => "");
    throw new Error(body || `API error ${res.status}`);
  }
}

/** POST /api/clients/:id/documents — upload a document (multipart) */
export async function uploadDocument(
  id: string,
  file: File,
  documentType: DocumentType,
): Promise<Client> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("documentType", documentType);

  const headers: HeadersInit = {};
  const token = authToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(apiUrl(`/api/v1/clients/${id}/documents`), {
    method: "POST",
    headers,
    body: formData,
  });
  return normalizeClientCountries(await handleResponse<Client>(res));
}

/** Get relative URL for viewing/streaming document */
export function getDocumentViewUrl(clientId: string, docId: string): string {
  return apiUrl(`/api/v1/clients/${clientId}/documents/${docId}/view`);
}

/** Get relative URL for downloading document */
export function getDocumentDownloadUrl(clientId: string, docId: string): string {
  return apiUrl(`/api/v1/clients/${clientId}/documents/${docId}/download`);
}

/** DELETE /api/clients/:id/documents/:docId — delete a document */
export async function deleteDocument(clientId: string, docId: string): Promise<Client> {
  const headers: HeadersInit = authHeaders();
  const res = await fetch(apiUrl(`/api/v1/clients/${clientId}/documents/${docId}`), {
    method: "DELETE",
    headers,
  });
  return normalizeClientCountries(await handleResponse<Client>(res));
}
