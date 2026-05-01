export type KoraFetch = typeof fetch;

export type KoraClientOptions = {
  baseUrl: string;
  fetcher?: KoraFetch;
  headers?: HeadersInit;
};

export type KoraRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  headers?: HeadersInit;
};

export class KoraApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "KoraApiError";
  }
}

function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return response.json();
  return response.text();
}

export class KoraClient {
  private readonly baseUrl: string;
  private readonly fetcher: KoraFetch;
  private readonly headers?: HeadersInit;

  constructor(options: KoraClientOptions) {
    this.baseUrl = options.baseUrl;
    this.fetcher = options.fetcher ?? fetch;
    this.headers = options.headers;
  }

  async request<T>(path: string, options: KoraRequestOptions = {}): Promise<T> {
    const headers = new Headers(this.headers);
    new Headers(options.headers).forEach((value, key) => headers.set(key, value));

    let body: BodyInit | undefined;
    if (options.body !== undefined) {
      headers.set("content-type", headers.get("content-type") ?? "application/json");
      body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }

    const response = await this.fetcher(joinUrl(this.baseUrl, path), {
      ...options,
      headers,
      body,
    });
    const parsed = await parseResponse(response);

    if (!response.ok) {
      throw new KoraApiError(`KORA API request failed with HTTP ${response.status}`, response.status, parsed);
    }

    return parsed as T;
  }
}

export function createKoraClient(options: KoraClientOptions): KoraClient {
  return new KoraClient(options);
}
