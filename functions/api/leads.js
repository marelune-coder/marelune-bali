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

  const payload = {
    lead_id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    source: "marelune-website",
    ...body
  };

  if (env.MAKE_WEBHOOK_URL) {
    const makeResponse = await fetch(env.MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!makeResponse.ok) {
      return Response.json({ error: "Lead webhook failed" }, { status: 502 });
    }
  }

  return Response.json({ ok: true, lead_id: payload.lead_id });
}
