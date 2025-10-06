import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL; // ex: https://eboutique-reconcil-beauty-afro.onrender.com
if (!BACKEND) throw new Error("❌ BACKEND_URL not set in environment");

const BACKEND_PREFIX = "/reconcil/api/shop"; // chemin côté backend
const FRONT_URL = process.env.FRONT_URL || "*"; // ex: https://eboutique-reconcil-beauty-afro.vercel.app

function getTargetPathFromReq(req: NextRequest) {
  const pathname = req.nextUrl.pathname || "";
  const prefix = "/proxy"; // chemin exposé côté front
  if (!pathname.startsWith(prefix)) return "";
  const rest = pathname.slice(prefix.length);
  return rest.startsWith("/") ? rest.slice(1) : rest;
}

async function forwardRequest(req: NextRequest, targetPath: string) {
  const fullPath = targetPath
    ? `${BACKEND_PREFIX}/${targetPath}`
    : BACKEND_PREFIX;
  const url = `${BACKEND}${fullPath}${req.nextUrl.search ?? ""}`;

  console.log("➡️ Forwarding request to backend:", url);
  console.log("Method:", req.method);

  const forwarded = new Headers();
  for (const [key, value] of req.headers.entries()) {
    const lower = key.toLowerCase();
    if (["host", "connection", "content-length"].includes(lower)) continue;
    forwarded.set(key, value);
  }

  const cookie = req.headers.get("cookie");
  if (cookie) forwarded.set("cookie", cookie);

  const auth = req.headers.get("authorization");
  if (auth) forwarded.set("authorization", auth);

  let body: BodyInit | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const text = await req.text();
    if (text) body = text;
    const ct = req.headers.get("content-type");
    if (ct && !forwarded.has("content-type")) forwarded.set("content-type", ct);
  }

  try {
    const backendRes = await fetch(url, {
      method: req.method,
      headers: forwarded,
      body,
      credentials: "include",
      redirect: "manual",
    });

    const text = await backendRes.text();
    let data: unknown;

    try {
      data = JSON.parse(text);
    } catch {
      console.warn("⚠️ Response is not valid JSON, wrapping in array");
      data = [text];
    }

    if (!Array.isArray(data)) {
      data = [data];
    }

    return new NextResponse(JSON.stringify(data), {
      status: backendRes.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": FRONT_URL,
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
        "Access-Control-Allow-Credentials": "true",
      },
    });
  } catch (err: unknown) {
    let message = "Unknown error";
    if (err instanceof Error) message = err.message;
    console.error("Proxy fetch error:", message);
    return new NextResponse(JSON.stringify({ message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": FRONT_URL,
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
        "Access-Control-Allow-Credentials": "true",
      },
    });
  }
}

async function handle(req: NextRequest) {
  const targetPath = getTargetPathFromReq(req);
  return forwardRequest(req, targetPath);
}

// OPTIONS preflight pour CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": FRONT_URL,
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

// Export handlers
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
