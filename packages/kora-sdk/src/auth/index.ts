export type KoraAuthHeadersOptions = {
  bearerToken?: string | null;
  sharedSecret?: string | null;
  sharedSecretHeader?: string;
};

export function createBearerAuthHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

export function createSharedSecretHeaders(
  secret: string,
  headerName = "x-kora-shared-secret",
): Record<string, string> {
  return { [headerName]: secret };
}

export function createKoraAuthHeaders(options: KoraAuthHeadersOptions): Record<string, string> {
  return {
    ...(options.bearerToken ? createBearerAuthHeaders(options.bearerToken) : {}),
    ...(options.sharedSecret
      ? createSharedSecretHeaders(options.sharedSecret, options.sharedSecretHeader)
      : {}),
  };
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createHmacSha256Signature(payload: string, secret: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto API is required to create request signatures.");
  }

  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await globalThis.crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toHex(signature);
}
