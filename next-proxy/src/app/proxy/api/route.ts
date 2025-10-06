import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL; // ex: "https://ton-backend.vercel.app" ou Railway
if (!BACKEND) {
  throw new Error("❌ BACKEND_URL not set in environment");
}

async function forwardRequest(req: NextRequest, targetPath: string) {
  const fullPath = targetPath ? `/${targetPath}` : "/";
  const url = `${BACKEND}${fullPath}${req.nextUrl.search ?? ""}`;

  // Rebuild headers
  const forwarded = new Headers();
  for (const [key, value] of req.headers.entries()) {
    const lower = key.toLowerCase();
    if (["host", "connection", "content-length"].includes(lower)) continue;
    forwarded.set(key, value);
  }

  // Transfer cookies & Authorization
  const cookie = req.headers.get("cookie");
  if (cookie) forwarded.set("cookie", cookie);

  const auth = req.headers.get("authorization");
  if (auth) forwarded.set("authorization", auth);

  const method = req.method.toUpperCase();

  // Prepare body if needed
  let body: BodyInit | undefined;
  if (method !== "GET" && method !== "HEAD") {
    try {
      const text = await req.text();
      if (text && text.length > 0) body = text;
      const ct = req.headers.get("content-type");
      if (ct && !forwarded.has("content-type"))
        forwarded.set("content-type", ct);
    } catch {
      // ignore
    }
  }

  // Call backend
  const backendRes = await fetch(url, {
    method,
    headers: forwarded,
    body,
    credentials: "include",
    redirect: "manual",
  });

  // Copy backend response
  const buffer = await backendRes.arrayBuffer();
  const resHeaders = new Headers();
  backendRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === "content-encoding") return;
    resHeaders.set(key, value);
  });

  return new NextResponse(Buffer.from(buffer), {
    status: backendRes.status,
    headers: resHeaders,
  });
}

// --- Handlers pour Next 14+ ---
type NextHandlerContext = { params: Record<string, string | string[]> };

export async function GET(req: NextRequest, context: NextHandlerContext) {
  const pathArray = context.params.path;
  const path = Array.isArray(pathArray) ? pathArray.join("/") : pathArray || "";
  return forwardRequest(req, path);
}

export async function POST(req: NextRequest, context: NextHandlerContext) {
  const pathArray = context.params.path;
  const path = Array.isArray(pathArray) ? pathArray.join("/") : pathArray || "";
  return forwardRequest(req, path);
}

export async function PUT(req: NextRequest, context: NextHandlerContext) {
  const pathArray = context.params.path;
  const path = Array.isArray(pathArray) ? pathArray.join("/") : pathArray || "";
  return forwardRequest(req, path);
}

export async function PATCH(req: NextRequest, context: NextHandlerContext) {
  const pathArray = context.params.path;
  const path = Array.isArray(pathArray) ? pathArray.join("/") : pathArray || "";
  return forwardRequest(req, path);
}

export async function DELETE(req: NextRequest, context: NextHandlerContext) {
  const pathArray = context.params.path;
  const path = Array.isArray(pathArray) ? pathArray.join("/") : pathArray || "";
  return forwardRequest(req, path);
}
