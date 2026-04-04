export function buildApiUrl(path: `/${string}`): string {
  const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const normalizedApiBaseUrl =
    typeof rawApiBaseUrl === "string" && rawApiBaseUrl.trim().length > 0
      ? rawApiBaseUrl.replace(/\/+$/, "")
      : "";

  return normalizedApiBaseUrl
    ? `${normalizedApiBaseUrl}${path}`
    : path;
}
