const WEBHOOK_ENV_KEYS = ["MAKE_WEBHOOK_URL", "LEAD_WEBHOOK_URL", "MAKE_LEADS_WEBHOOK_URL"];

export async function onRequestGet({ env }) {
  const configuredKeys = WEBHOOK_ENV_KEYS.filter((key) => String(env[key] || "").trim());

  return Response.json({
    ok: true,
    webhook_configured: configuredKeys.length > 0,
    configured_env_keys: configuredKeys,
    accepted_env_keys: WEBHOOK_ENV_KEYS,
    environment: env.ENVIRONMENT || "",
    checked_at: new Date().toISOString()
  });
}
