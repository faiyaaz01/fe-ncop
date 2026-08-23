import { apiUrl } from "./api-config";
import { userSessionService } from "./user-session";
import type { CustomerInquiry, CustomerInquiryRequestDto } from "./inquiry-types";
import type { PageResponse } from "./auth-types";

function headers(): HeadersInit {
  const token = userSessionService.getCurrentUser()?.token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function response<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function createInquiry(dto: CustomerInquiryRequestDto): Promise<CustomerInquiry> {
  return response<CustomerInquiry>(
    await fetch(apiUrl("/api/v1/inquiries"), {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(dto),
    }),
  );
}

export async function fetchInquiries(page = 0, size = 20): Promise<PageResponse<CustomerInquiry>> {
  return response<PageResponse<CustomerInquiry>>(
    await fetch(apiUrl(`/api/v1/inquiries?page=${page}&size=${size}`), {
      headers: headers(),
    }),
  );
}
