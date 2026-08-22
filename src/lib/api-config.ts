/**
 * Central API configuration.
 *
 * The base URL is read from the VITE_API_BASE_URL environment variable.
 * Vite automatically loads the correct .env file based on the current mode:
 *   - `npm run dev`          → .env.development  (mode = development)
 *   - `npm run build`        → .env.production   (mode = production)
 *   - `npm run dev:prod`     → .env.production   (mode = production)
 *   - `npm run build:dev`    → .env.development  (mode = development)
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

/**
 * Build a full API endpoint URL.
 * @example apiUrl("/api/v1/auth/login") → "http://localhost:8080/auth/login"
 */
export function apiUrl(path: string): string {
  // Ensure no double slashes between base and path
  const base = API_BASE_URL.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
