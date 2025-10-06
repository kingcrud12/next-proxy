import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL; // ex: https://eboutique-reconcil-beauty-afro.onrender.com
if (!BACKEND) {
  throw new Error("❌ BACKEND_URL not set in environment");
}

// Ici on rajoute le préfixe backend
const BACKEND_PREFIX = "/reconcil/api/shop";

function getTargetPathFromReq(req: NextRequest) {
  const pathname = req.nextUrl.pathname || "";
  const prefix = "/proxy"; // ton chemin exposé côté front
  if (!pathname.startsWith(prefix)) return "";
  const rest = pathname.slice(prefix.length);
  return rest.startsWith("/") ? rest.slice(1) : rest; // ex: "products"
}

async function forwardRequest(req: NextRequest, targetPath: string) {
  const fullPath = targetPath
    ? `${BACKEND_PREFIX}/${targetPath}`
    : BACKEND_PREFIX;
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

  const buffer = await backendRes.arrayBuffer();
  const resHeaders = new Headers();
  backendRes.headers.forEach((value, key) => {
    const lk = key.toLowerCase();
    if (lk === "content-encoding") return;
    resHeaders.set(key, value);
  });

  return new NextResponse(Buffer.from(buffer), {
    status: backendRes.status,
    headers: resHeaders,
  });
}

async function handle(req: NextRequest) {
  const targetPath = getTargetPathFromReq(req);
  return forwardRequest(req, targetPath);
}

// Export handlers
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
