export const config = {
  runtime: "edge",
};

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") || "hourly_scoring";
  const functionUrl = process.env.LLS_RIA_FUNCTION_URL;
  const sharedSecret = process.env.LLS_RIA_SHARED_SECRET;

  if (!functionUrl || !sharedSecret) {
    return Response.json({ error: "LLS RIA fallback is not configured." }, { status: 503 });
  }

  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-lls-ria-secret": sharedSecret,
    },
    body: JSON.stringify({ mode }),
  });

  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") || "application/json" },
  });
}
