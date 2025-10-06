import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL;
if (!BACKEND) throw new Error("BACKEND_URL not set");

// Fonction générique pour forward
async function forwardRequest(req: NextRequest, path: string) {
  const url = `${BACKEND}/${path}${req.nextUrl.search}`;
  const headers = new Headers(req.headers);
  headers.delete("host");
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  const method = req.method.toUpperCase();
  let body: BodyInit | undefined;
  if (method !== "GET" && method !== "HEAD") body = await req.text();

  const res = await fetch(url, {
    method,
    headers,
    body,
    credentials: "include",
  });
  const buffer = await res.arrayBuffer();

  const resHeaders = new Headers();
  res.headers.forEach((value, key) => {
    if (key.toLowerCase() === "content-encoding") return;
    resHeaders.set(key, value);
  });

  return new NextResponse(Buffer.from(buffer), {
    status: res.status,
    headers: resHeaders,
  });
}

// --- Handlers dynamiques pour Next 15 App Router ---
export async function GET(
  req: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  return forwardRequest(req, (params.path ?? []).join("/"));
}
export async function POST(
  req: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  return forwardRequest(req, (params.path ?? []).join("/"));
}
export async function PUT(
  req: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  return forwardRequest(req, (params.path ?? []).join("/"));
}
export async function PATCH(
  req: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  return forwardRequest(req, (params.path ?? []).join("/"));
}
export async function DELETE(
  req: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  return forwardRequest(req, (params.path ?? []).join("/"));
}
