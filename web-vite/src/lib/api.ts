const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3000/api").replace(/\/$/, "");

type ApiErrorPayload = {
  message?: string;
  error?: string;
};

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function hasMessage(data: unknown): data is ApiErrorPayload {
  return typeof data === "object" && data !== null && ("message" in data || "error" in data);
}

export async function fetchAPI<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers,
  });

  const contentType = response.headers.get("content-type");
  let data: unknown;

  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = text ? { message: text } : null;
  }

  if (!response.ok) {
    throw new Error(
      hasMessage(data) ? data.message || data.error || "Error en la petición" : "Error en la petición",
    );
  }

  return data as T;
}
