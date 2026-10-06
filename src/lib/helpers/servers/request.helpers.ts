import { headers } from "next/headers";

export async function getClientIp(): Promise<string | undefined> {
  const headersList = await headers();
  return (
    headersList.get("cf-connecting-ip") ||
    headersList.get("x-forwarded-for")?.split(",")[0]
  );
}

export async function isSameOriginRequest(req: Request): Promise<boolean> {
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  const originHeader = req.headers.get("origin");
  const refererHeader = req.headers.get("referer");

  const xfProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const xfHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = req.headers.get("host");

  let expectedOrigin: string;
  try {
    if (xfProto && xfHost) {
      expectedOrigin = `${xfProto}://${xfHost}`;
    } else if (host) {
      const proto = new URL(req.url).protocol.replace(":", "");
      expectedOrigin = `${proto}://${host}`;
    } else {
      expectedOrigin = new URL(req.url).origin;
    }
  } catch {
    return false;
  }

  if (originHeader) {
    return originHeader === expectedOrigin;
  }

  if (refererHeader) {
    try {
      const refererOrigin = new URL(refererHeader).origin;
      return refererOrigin === expectedOrigin;
    } catch {
      return false;
    }
  }

  return false;
}
