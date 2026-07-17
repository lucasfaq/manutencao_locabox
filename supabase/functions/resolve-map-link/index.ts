const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function isAllowedGoogleMapsHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === "goo.gl"
    || host === "maps.app.goo.gl"
    || host === "google.com"
    || host.endsWith(".google.com")
    || host === "google.com.br"
    || host.endsWith(".google.com.br");
}

function validCoordinate(latitude: number, longitude: number) {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
}

function parsePair(value: string | null) {
  if (!value) return null;
  const decoded = decodeURIComponent(value);
  const match = decoded.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  return validCoordinate(latitude, longitude) ? { latitude, longitude } : null;
}

function extractCoordinates(rawUrl: string) {
  const url = new URL(rawUrl);
  const text = decodeURIComponent(url.toString());
  const patterns = [
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (validCoordinate(latitude, longitude)) return { latitude, longitude };
  }

  return parsePair(url.searchParams.get("q"))
    || parsePair(url.searchParams.get("query"))
    || parsePair(url.searchParams.get("ll"));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Metodo nao permitido." }, 405);

  let input: { url?: unknown };
  try {
    input = await request.json();
  } catch {
    return json({ error: "Corpo JSON invalido." }, 400);
  }

  const originalUrl = String(input.url || "").trim();
  if (!originalUrl) return json({ error: "Link do Google Maps nao informado." }, 400);

  let parsed: URL;
  try {
    parsed = new URL(originalUrl);
  } catch {
    return json({ error: "Link do Google Maps invalido." }, 400);
  }

  if (parsed.protocol !== "https:" || !isAllowedGoogleMapsHost(parsed.hostname)) {
    return json({ error: "Informe um link HTTPS valido do Google Maps." }, 400);
  }

  const directCoordinates = extractCoordinates(originalUrl);
  if (directCoordinates) return json({ ...directCoordinates, resolvedUrl: originalUrl });

  try {
    const response = await fetch(originalUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Locabox-Manutencao/1.0"
      }
    });
    const resolvedUrl = response.url || originalUrl;
    const resolved = new URL(resolvedUrl);
    if (!isAllowedGoogleMapsHost(resolved.hostname)) {
      return json({ error: "O link redirecionou para um dominio nao permitido." }, 400);
    }

    const coordinates = extractCoordinates(resolvedUrl);
    if (coordinates) return json({ ...coordinates, resolvedUrl });
  } catch {
    return json({ error: "Nao foi possivel resolver o link do Google Maps." }, 400);
  }

  return json({ error: "Nao encontrei latitude e longitude nesse link." }, 422);
});
