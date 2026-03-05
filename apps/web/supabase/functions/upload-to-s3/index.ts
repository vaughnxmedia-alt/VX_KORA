import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

// CORS configuration
const allowedOrigins = [
  "https://developing-site.lovable.app",
  "https://jahknowspr.com",
  "https://www.jahknowspr.com",
  "http://localhost:8080",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "https://blueprint-builder-clarity.vercel.app",
];

function getCorsHeaders(req?: Request) {
  const origin = req?.headers.get("Origin");

  if (!origin) {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    };
  }

  const isAllowed =
    allowedOrigins.includes(origin) ||
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:");

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "https://jahknowspr.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

async function hmacSha256(key: Uint8Array, data: string): Promise<string> {
  const dataBytes = new TextEncoder().encode(data);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, dataBytes);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Bytes(key: string | Uint8Array, data: string): Promise<Uint8Array> {
  const keyData = typeof key === "string" ? new TextEncoder().encode(key) : key;
  const dataBytes = new TextEncoder().encode(data);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, dataBytes);
  return new Uint8Array(signature);
}

async function createPresignedUrl(
  bucket: string,
  key: string,
  region: string,
  accessKeyId: string,
  secretAccessKey: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const amzDate = now.toISOString().replace(/[-:]/g, "").split('.')[0] + "Z";
  
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;
  
  // Build canonical query string
  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'host',
  });
  
  const canonicalRequest = [
    'PUT',
    `/${key}`,
    queryParams.toString(),
    `host:${host}`,
    '',
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  
  const encoder = new TextEncoder();
  const canonicalRequestHash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(canonicalRequest)))
  ).map(b => b.toString(16).padStart(2, "0")).join("");
  
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');
  
  // Calculate signature
  const kDate = await hmacSha256Bytes(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmacSha256Bytes(kDate, region);
  const kService = await hmacSha256Bytes(kRegion, "s3");
  const kSigning = await hmacSha256Bytes(kService, "aws4_request");
  const signature = await hmacSha256(kSigning, stringToSign);
  
  queryParams.set('X-Amz-Signature', signature);
  
  return `https://${host}/${key}?${queryParams.toString()}`;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Presigned URL request received:", req.method, req.url);
    
    // Get AWS credentials from environment
    const awsAccessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
    const awsSecretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
    const awsRegion = Deno.env.get("AWS_REGION") || "us-east-1";
    const awsS3Bucket = Deno.env.get("AWS_S3_BUCKET");

    if (!awsAccessKeyId || !awsSecretAccessKey || !awsS3Bucket) {
      return new Response(
        JSON.stringify({
          error: "Missing AWS configuration. Please configure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET in Supabase secrets.",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized. Please sign in." }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Parse the request body (just metadata, NOT the file)
    console.log("Parsing request body...");
    const body = await req.json();
    const { fileName, folder = "", contentType = "video/mp4" } = body;

    if (!fileName) {
      return new Response(
        JSON.stringify({ error: "fileName is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Generate unique file name
    const fileExt = fileName.split(".").pop();
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const key = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;

    console.log("Generating presigned URL for:", { bucket: awsS3Bucket, key, contentType });

    // Generate presigned URL (valid for 1 hour)
    const presignedUrl = await createPresignedUrl(
      awsS3Bucket,
      key,
      awsRegion,
      awsAccessKeyId,
      awsSecretAccessKey,
      contentType,
      3600 // 1 hour expiry
    );

    // Construct the public URL
    let publicUrl: string;
    if (awsRegion === "us-east-1") {
      publicUrl = `https://${awsS3Bucket}.s3.amazonaws.com/${key}`;
    } else {
      publicUrl = `https://${awsS3Bucket}.s3.${awsRegion}.amazonaws.com/${key}`;
    }

    console.log("Presigned URL generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        presignedUrl: presignedUrl,
        publicUrl: publicUrl,
        key: key,
        bucket: awsS3Bucket,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error generating presigned URL:", error);
    console.error("Error stack:", error.stack);
    
    let errorMessage = "Failed to generate presigned URL.";
    if (error.message) {
      errorMessage = error.message;
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error.name || "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
