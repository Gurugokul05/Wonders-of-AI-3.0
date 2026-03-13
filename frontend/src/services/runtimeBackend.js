const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";
const DEFAULT_SOCKET_BASE =
  import.meta.env.VITE_SOCKET_BASE || "http://localhost:5000";
const BACKEND_CACHE_KEY = "trust_meter_backend_origin";
const DISCOVERY_PORTS = [5000, 5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009];

let discoveryPromise = null;

function getOriginFromApiBase(apiBase) {
  return apiBase.replace(/\/api\/?$/, "");
}

function getCandidateOrigins() {
  const configuredOrigin = getOriginFromApiBase(DEFAULT_API_BASE);
  const configuredSocketOrigin = DEFAULT_SOCKET_BASE.replace(/\/$/, "");
  const cachedOrigin = localStorage.getItem(BACKEND_CACHE_KEY);
  const derivedOrigins = DISCOVERY_PORTS.map((port) => `http://localhost:${port}`);

  return [cachedOrigin, configuredOrigin, configuredSocketOrigin, ...derivedOrigins]
    .filter(Boolean)
    .map((origin) => origin.replace(/\/$/, ""))
    .filter((origin, idx, list) => list.indexOf(origin) === idx);
}

async function probeOrigin(origin) {
  try {
    const res = await fetch(`${origin}/api/health`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return null;

    const payload = await res.json().catch(() => null);
    if (!payload?.ok) return null;

    localStorage.setItem(BACKEND_CACHE_KEY, origin);
    return origin;
  } catch {
    return null;
  }
}

export async function resolveBackendOrigin() {
  if (!discoveryPromise) {
    discoveryPromise = (async () => {
      const origins = getCandidateOrigins();
      for (const origin of origins) {
        const resolved = await probeOrigin(origin);
        if (resolved) return resolved;
      }

      throw new Error(
        "Unable to reach the Trust Meter backend. Start the backend server and try again.",
      );
    })().catch((error) => {
      discoveryPromise = null;
      throw error;
    });
  }

  return discoveryPromise;
}

export async function resolveApiBase() {
  const origin = await resolveBackendOrigin();
  return `${origin}/api`;
}