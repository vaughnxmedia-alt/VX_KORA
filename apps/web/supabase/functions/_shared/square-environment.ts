/** Square sandbox vs production alignment helpers (edge functions). */

export function isSquareSandboxApplicationId(applicationId: string): boolean {
  return applicationId.trim().startsWith("sq0idb-");
}

export function isSquareProductionApplicationId(applicationId: string): boolean {
  return applicationId.trim().startsWith("sq0idp-");
}

export function squareEnvironmentFromApplicationId(applicationId: string): "sandbox" | "production" | null {
  if (isSquareSandboxApplicationId(applicationId)) return "sandbox";
  if (isSquareProductionApplicationId(applicationId)) return "production";
  return null;
}

export function formatSquareAuthError(detail: string, useSandbox: boolean): string {
  if (/could not be authorized/i.test(detail) || /UNAUTHORIZED/i.test(detail)) {
    return (
      "Square rejected the payment credentials. The live site Application ID must match the Supabase " +
      `SQUARE_ACCESS_TOKEN (both ${useSandbox ? "Sandbox" : "Production"}, not mixed). ` +
      "In Square Developer: copy Production Application ID → Vercel VITE_SQUARE_APPLICATION_ID, " +
      "Production access token → Supabase SQUARE_ACCESS_TOKEN, set SQUARE_ENVIRONMENT=production, then redeploy."
    );
  }
  return detail;
}

export function mismatchMessage(clientAppId: string, serverUseSandbox: boolean): string {
  const clientEnv = squareEnvironmentFromApplicationId(clientAppId);
  const clientLabel = clientEnv === "sandbox" ? "Sandbox" : clientEnv === "production" ? "Production" : "unknown";
  const serverLabel = serverUseSandbox ? "Sandbox" : "Production";
  return (
    `Square environment mismatch: the checkout page uses a ${clientLabel} Application ID but the server is configured for ${serverLabel}. ` +
    "Align VITE_SQUARE_APPLICATION_ID (Vercel) with SQUARE_ACCESS_TOKEN and SQUARE_ENVIRONMENT (Supabase), then redeploy."
  );
}
