export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type QueryValue = string | number | boolean | null | undefined;

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_URL}${normalizedPath}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export async function apiRequest<T = any>(
  path: string,
  init: RequestInit & {
    query?: Record<string, QueryValue>;
  } = {}
): Promise<T> {
  const { query, headers, body, ...rest } = init;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const response = await fetch(buildUrl(path, query), {
    ...rest,
    body,
    cache: rest.cache ?? "no-store",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(headers ?? {}),
    },
  });

  const text = await response.text();

  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Сервер вернул не JSON: ${text.slice(0, 200)}`);
    }
  }

  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : `Ошибка запроса: ${response.status}`
    );
  }

  return data as T;
}