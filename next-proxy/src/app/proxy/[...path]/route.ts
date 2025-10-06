import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL;
if (!BACKEND) {
  throw new Error("❌ BACKEND_URL not set in environment");
}

function getTargetPathFromReq(req: NextRequest) {
  const pathname = req.nextUrl.pathname || "";
  const prefix = "/api/proxy";
  if (!pathname.startsWith(prefix)) return "";
  const rest = pathname.slice(prefix.length);
  return rest.startsWith("/") ? rest.slice(1) : rest;
}

async function forwardRequest(req: NextRequest, targetPath: string) {
  const fullPath = targetPath ? `/${targetPath}` : "/";
  const url = `${BACKEND}${fullPath}${req.nextUrl.search ?? ""}`;

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

  const method = req.method.toUpperCase();

  let body: BodyInit | undefined;
  if (method !== "GET" && method !== "HEAD") {
    try {
      const text = await req.text();
      if (text && text.length > 0) body = text;
      const ct = req.headers.get("content-type");
      if (ct && !forwarded.has("content-type"))
        forwarded.set("content-type", ct);
    } catch {}
  }

  const backendRes = await fetch(url, {
    method,
    headers: forwarded,
    body,
    credentials: "include",
    redirect: "manual",
  });

  // Copy backend response body and headers
  const buffer = await backendRes.arrayBuffer();
  const resHeaders = new Headers();
  backendRes.headers.forEach((value, key) => {
    // avoid forwarding certain headers that can break the response
    const lk = key.toLowerCase();
    if (lk === "content-encoding") return;
    resHeaders.set(key, value);
  });

  return new NextResponse(Buffer.from(buffer), {
    status: backendRes.status,
    headers: resHeaders,
  });
}

// Generic handler invoker to avoid repetition
async function handle(req: NextRequest) {
  const targetPath = getTargetPathFromReq(req);
  return forwardRequest(req, targetPath);
}

// Export handlers (no context param, avoids typing mismatch)
export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
export async function PUT(req: NextRequest) {
  return handle(req);
}
export async function PATCH(req: NextRequest) {
  return handle(req);
}
export async function DELETE(req: NextRequest) {
  return handle(req);
}
