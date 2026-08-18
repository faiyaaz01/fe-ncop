import { apiUrl } from "./api-config";
import { userSessionService } from "./user-session";
import type { Client, ClientRequestDto, DocumentType } from "./client-types";

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

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Client API ──────────────────────────────────────────────────────────────

/** GET /api/clients — fetch all clients */
export async function fetchClients(): Promise<Client[]> {
  const res = await fetch(apiUrl("/api/clients"), {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<Client[]>(res);
}

/** GET /api/clients/:id — fetch a single client */
export async function fetchClient(id: string): Promise<Client> {
  const res = await fetch(apiUrl(`/api/clients/${id}`), {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<Client>(res);
}

/** POST /api/clients — create a new client */
export async function createClient(dto: ClientRequestDto): Promise<Client> {
  const res = await fetch(apiUrl("/api/clients"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(dto),
  });
  return handleResponse<Client>(res);
}

/** PUT /api/clients/:id — update an existing client */
export async function updateClient(
  id: string,
  dto: ClientRequestDto,
): Promise<Client> {
  const res = await fetch(apiUrl(`/api/clients/${id}`), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(dto),
  });
  return handleResponse<Client>(res);
}

/** POST /api/clients/:id/send-email — resend registration email to all POCs */
export async function resendRegistrationEmail(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/clients/${id}/send-email`), {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
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

  const res = await fetch(apiUrl(`/api/clients/${id}/documents`), {
    method: "POST",
    headers,
    body: formData,
  });
  return handleResponse<Client>(res);
}

/** Get relative URL for viewing/streaming document */
export function getDocumentViewUrl(clientId: string, docId: string): string {
  return apiUrl(`/api/clients/${clientId}/documents/${docId}/view`);
}

/** Get relative URL for downloading document */
export function getDocumentDownloadUrl(clientId: string, docId: string): string {
  return apiUrl(`/api/clients/${clientId}/documents/${docId}/download`);
}

/** DELETE /api/clients/:id/documents/:docId — delete a document */
export async function deleteDocument(
  clientId: string,
  docId: string,
): Promise<Client> {
  const headers: HeadersInit = authHeaders();
  const res = await fetch(apiUrl(`/api/clients/${clientId}/documents/${docId}`), {
    method: "DELETE",
    headers,
  });
  return handleResponse<Client>(res);
}


