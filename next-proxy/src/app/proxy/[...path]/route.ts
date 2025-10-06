import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL; // https://eboutique-reconcil-beauty-afro.onrender.com
if (!BACKEND) {
  throw new Error("❌ BACKEND_URL not set in environment");
}

const BACKEND_PREFIX = "/reconcil/api/shop"; // chemin complet côté backend

function getTargetPathFromReq(req: NextRequest) {
  const pathname = req.nextUrl.pathname || "";
  const prefix = "/proxy"; // chemin exposé côté front
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

  // Copie du cookie et Authorization si présent
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
  } catch (err: unknown) {
    let message = "Unknown error";
    if (err instanceof Error) {
      message = err.message;
    }
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
