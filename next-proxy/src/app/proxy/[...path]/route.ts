import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL; // ex: https://eboutique-reconcil-beauty-afro.onrender.com
if (!BACKEND) throw new Error("❌ BACKEND_URL not set in environment");

const BACKEND_PREFIX = "/reconcil/api/shop"; // chemin côté backend

function getTargetPathFromReq(req: NextRequest) {
  const pathname = req.nextUrl.pathname || "";
  const prefix = "/proxy"; // chemin exposé côté front
  if (!pathname.startsWith(prefix)) return "";
  const rest = pathname.slice(prefix.length);
  return rest.startsWith("/") ? rest.slice(1) : rest; // ex: "products"
}

async function forwardRequest(req: NextRequest, targetPath: string) {
  // Construction propre de l'URL pour éviter le "Failed to parse URL"
  const url = new URL(`${BACKEND_PREFIX}/${targetPath ?? ""}`, BACKEND);

  // Copier headers
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (["host", "connection", "content-length"].includes(lower)) return;
    headers.set(key, value);
  });

  // Cookie et Authorization
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const auth = req.headers.get("authorization");
  if (auth) headers.set("authorization", auth);

  // Body pour méthodes autres que GET/HEAD
  let body: BodyInit | undefined;
  if (!["GET", "HEAD"].includes(req.method.toUpperCase())) {
    const text = await req.text();
    if (text) body = text;
    const ct = req.headers.get("content-type");
    if (ct && !headers.has("content-type")) headers.set("content-type", ct);
  }

  try {
    const res = await fetch(url.toString(), {
      method: req.method,
      headers,
      body,
      credentials: "include",
      redirect: "manual",
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Proxy fetch error:", message);
    return new NextResponse(JSON.stringify({ message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

async function handle(req: NextRequest) {
  const targetPath = getTargetPathFromReq(req);
  return forwardRequest(req, targetPath);
}

// Export handlers
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
