import "server-only";
import { UAParser } from "ua-parser-js";
import { env } from "@/lib/env";

export type RequestContext = {
  ip: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  geoSource: "vercel" | "ipapi" | "none";
};

type HeaderBag = { get(name: string): string | null };

function decode(v: string | null): string | null {
  if (!v) return null;
  try { return decodeURIComponent(v); } catch { return v; }
}

export function clientIp(h: HeaderBag): string | null {
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  return ip?.replace(/^::ffff:/, "") ?? null;
}

function isPrivateIp(ip: string): boolean {
  return /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|fc|fd|fe80)/i.test(ip);
}

const geoCache = new Map<string, { city: string | null; region: string | null; country: string | null; at: number }>();

async function lookupIp(ip: string) {
  const hit = geoCache.get(ip);
  if (hit && Date.now() - hit.at < 24 * 3600_000) return hit;
  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      signal: AbortSignal.timeout(1500),
      headers: { "User-Agent": "cuarto-de-datos/1.0" },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { city?: string; region?: string; country_code?: string; error?: boolean };
    if (j.error) return null;
    const value = { city: j.city ?? null, region: j.region ?? null, country: j.country_code ?? null, at: Date.now() };
    geoCache.set(ip, value);
    return value;
  } catch {
    return null;
  }
}

export async function getRequestContext(h: HeaderBag): Promise<RequestContext> {
  const ip = clientIp(h);
  const userAgent = h.get("user-agent");
  const ua = new UAParser(userAgent ?? "").getResult();

  const browser = ua.browser.name ? `${ua.browser.name} ${ua.browser.version ?? ""}`.trim() : null;
  const os = ua.os.name ? `${ua.os.name} ${ua.os.version ?? ""}`.trim() : null;
  const deviceType = ua.device.type ?? "desktop";
  const deviceName = [ua.device.vendor, ua.device.model].filter(Boolean).join(" ");
  const device = deviceName ? `${deviceType} (${deviceName})` : deviceType;

  let city = decode(h.get("x-vercel-ip-city"));
  let region = decode(h.get("x-vercel-ip-country-region"));
  let country = h.get("x-vercel-ip-country");
  let geoSource: RequestContext["geoSource"] = country ? "vercel" : "none";

  if (!country && ip && !isPrivateIp(ip) && env.geoFallback === "ipapi") {
    const g = await lookupIp(ip);
    if (g) {
      ({ city, region, country } = g);
      geoSource = "ipapi";
    }
  }

  return { ip, city, region, country, userAgent, browser, os, device, geoSource };
}
