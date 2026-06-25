const WEBHOOK_ENV_KEYS = ["MAKE_WEBHOOK_URL", "LEAD_WEBHOOK_URL", "MAKE_LEADS_WEBHOOK_URL"];

const getWebhookUrl = (env) => WEBHOOK_ENV_KEYS.map((key) => env[key]).find((value) => String(value || "").trim());
const getConfiguredWebhookKeys = (env) => WEBHOOK_ENV_KEYS.filter((key) => String(env[key] || "").trim());

const getSourcePage = (referer) => {
  if (!referer) return "";

  try {
    const url = new URL(referer);
    return `${url.pathname}${url.search}`;
  } catch {
    return String(referer).slice(0, 200);
  }
};

const getUtmSource = (body, referer) => {
  if (body.utm_source) return body.utm_source;
  if (!referer) return "";

  try {
    return new URL(referer).searchParams.get("utm_source") || "";
  } catch {
    return "";
  }
};

export async function onRequestGet({ env }) {
  const configuredKeys = getConfiguredWebhookKeys(env);

  return Response.json({
    ok: true,
    endpoint: "/api/leads",
    methods: ["GET", "POST"],
    post_required_fields: ["name", "whatsapp", "date", "journey"],
    webhook_configured: configuredKeys.length > 0,
    configured_env_keys: configuredKeys,
    accepted_env_keys: WEBHOOK_ENV_KEYS,
    environment: env.ENVIRONMENT || "",
    checked_at: new Date().toISOString()
  });
}

export async function onRequestPost({ request, env }) {
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const required = ["name", "whatsapp", "date", "journey"];
  const missing = required.filter((field) => !String(body[field] || "").trim());

  if (missing.length) {
    return Response.json({ error: "Missing required fields", missing }, { status: 422 });
  }

  const webhookUrl = getWebhookUrl(env);

  if (!webhookUrl) {
    console.error("Lead webhook URL is not configured", WEBHOOK_ENV_KEYS.join(", "));
    return Response.json(
      {
        error: "Lead automation is not configured",
        required_env: WEBHOOK_ENV_KEYS[0],
        accepted_env: WEBHOOK_ENV_KEYS
      },
      { status: 503 }
    );
  }

  const payload = {
    ...body,
    lead_id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    status: "New",
    source: "marelune-website",
    source_page: body.source_page || getSourcePage(request.headers.get("referer")),
    utm_source: getUtmSource(body, request.headers.get("referer"))
  };

  try {
    const makeResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!makeResponse.ok) {
      const responseText = await makeResponse.text().catch(() => "");
      console.error("Lead webhook failed", makeResponse.status, responseText.slice(0, 300));
      return Response.json({ error: "Lead webhook failed" }, { status: 502 });
    }
  } catch (error) {
    console.error("Lead webhook request failed", error);
    return Response.json({ error: "Lead webhook request failed" }, { status: 502 });
  }

  return Response.json({ ok: true, lead_id: payload.lead_id, automation: "make-webhook" });
}
