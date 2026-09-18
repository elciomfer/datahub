export default async function fetcher<T = Record<string, any>>(
  url: string,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  body?: Record<string, any>,
  headers?: HeadersInit,
): Promise<T> {
  try {
    const config: RequestInit = {
      method: method,
      headers: {
        "User-Agent": "Datahub v0.0.1 (elciomfer@gmail.com)",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
    };

    if (method !== "GET" && body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error(String(error));
  }
}
