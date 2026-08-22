import { apiUrl } from "./api-config";
import { userSessionService } from "./user-session";
import type { PageResponse } from "./auth-types";
import type {
  Product,
  ProductRequestDto,
  ProductDocumentType,
  ProductMetrics,
  DosageForm,
  DosageFormRequestDto,
} from "./product-types";

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
  if (res.status === 204) {
    return {} as T;
  }
  return res.json() as Promise<T>;
}

// ─── Product APIs ────────────────────────────────────────────────────────────

/** GET /api/v1/products — fetch paginated products */
export async function fetchProducts(params: {
  page?: number | undefined;
  size?: number | undefined;
  search?: string | undefined;
  category?: string | undefined;
  dosageForm?: string | undefined;
  status?: string | undefined;
} = {}): Promise<PageResponse<Product>> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 0));
  query.set("size", String(params.size ?? 10));
  if (params.search) query.set("search", params.search);
  if (params.category && params.category !== "all" && params.category !== "ALL") {
    query.set("category", params.category);
  }
  if (params.dosageForm && params.dosageForm !== "all" && params.dosageForm !== "ALL") {
    query.set("dosageForm", params.dosageForm);
  }
  if (params.status && params.status !== "all" && params.status !== "ALL") {
    query.set("status", params.status);
  }

  const res = await fetch(apiUrl(`/api/v1/products?${query.toString()}`), {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<PageResponse<Product>>(res);
}

/** GET /api/v1/products/all — fetch all products unpaginated */
export async function fetchAllProducts(): Promise<Product[]> {
  const res = await fetch(apiUrl("/api/v1/products/all"), {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<Product[]>(res);
}

/** GET /api/v1/products/metrics — fetch product counts */
export async function fetchProductMetrics(): Promise<ProductMetrics> {
  const res = await fetch(apiUrl("/api/v1/products/metrics"), {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<ProductMetrics>(res);
}

/** GET /api/v1/products/:id — fetch single product */
export async function fetchProductById(id: string): Promise<Product> {
  const res = await fetch(apiUrl(`/api/v1/products/${id}`), {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<Product>(res);
}

/** POST /api/v1/products — create a new product */
export async function createProduct(dto: ProductRequestDto): Promise<Product> {
  const res = await fetch(apiUrl("/api/v1/products"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(dto),
  });
  return handleResponse<Product>(res);
}

/** PUT /api/v1/products/:id — update an existing product */
export async function updateProduct(
  id: string,
  dto: ProductRequestDto,
): Promise<Product> {
  const res = await fetch(apiUrl(`/api/v1/products/${id}`), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(dto),
  });
  return handleResponse<Product>(res);
}

/** DELETE /api/v1/products/:id — delete a product */
export async function deleteProduct(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/products/${id}`), {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `API error ${res.status}`);
  }
}

/** POST /api/v1/products/:id/documents — upload document to product */
export async function uploadProductDocument(
  id: string,
  file: File,
  documentType: ProductDocumentType,
): Promise<Product> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("documentType", documentType);

  const headers: HeadersInit = {};
  const token = authToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(apiUrl(`/api/v1/products/${id}/documents`), {
    method: "POST",
    headers,
    body: formData,
  });
  return handleResponse<Product>(res);
}

/** DELETE /api/v1/products/:id/documents/:docId — delete document */
export async function deleteProductDocument(
  id: string,
  docId: string,
): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/products/${id}/documents/${docId}`), {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `API error ${res.status}`);
  }
}

// ─── Dosage Form & Variant APIs ──────────────────────────────────────────────

/** GET /api/v1/dosage-forms — fetch all configured dosage forms with variants from DB */
export async function fetchDosageForms(activeOnly = true): Promise<DosageForm[]> {
  const res = await fetch(apiUrl(`/api/v1/dosage-forms?activeOnly=${activeOnly}`), {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<DosageForm[]>(res);
}

/** POST /api/v1/dosage-forms — add a new dosage form / variants */
export async function createDosageForm(dto: DosageFormRequestDto): Promise<DosageForm> {
  const res = await fetch(apiUrl("/api/v1/dosage-forms"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(dto),
  });
  return handleResponse<DosageForm>(res);
}

/** PUT /api/v1/dosage-forms/:id — update dosage form and its variants */
export async function updateDosageForm(
  id: string,
  dto: DosageFormRequestDto,
): Promise<DosageForm> {
  const res = await fetch(apiUrl(`/api/v1/dosage-forms/${id}`), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(dto),
  });
  return handleResponse<DosageForm>(res);
}

/** DELETE /api/v1/dosage-forms/:id — delete a dosage form */
export async function deleteDosageForm(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/v1/dosage-forms/${id}`), {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `API error ${res.status}`);
  }
}
