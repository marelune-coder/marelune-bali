# Marelune Bali

Static, CMS-ready website inspired by the Framer design reference.

## Local commands

```bash
npm run build
npm run preview
```

## Cloudflare Pages

- Build command: `node build.mjs` or `npm run build`
- Output directory: `dist`
- Functions directory: `functions`
- Production runtime environment variable for lead automation: `MAKE_WEBHOOK_URL`
- Lead endpoint: `GET /api/leads` for status, `POST /api/leads` for lead submission.
- Lead health check: `/api/lead-health` returns whether the webhook runtime variable is configured without exposing the secret value.

If this project is inside the parent repository folder `Marelune_Bali/Production-Code`, set the Cloudflare Pages root directory to `Production-Code`.

## Content model

- `content/site.json`: brand, navigation, contact, SEO defaults
- `content/design.json`: editable brand colors and typography tokens
- `content/leads.json`: lead form fields, messages, CRM columns, and status options
- `content/pages/*.json`: page hero and key page copy
- `content/journeys/*.json`: yacht routes and packages
- `content/blog/*.md`: SEO articles

## CMS

Use Pages CMS with the root-level `.pages.yml` in the parent repository. For this grouped folder layout, copy `cms/root.pages.yml` to:

```text
Marelune_Bali/.pages.yml
```

Lead records are managed in Google Sheets, not inside the content CMS. Use `ops/leads-crm-template.csv` for the first row of the sheet.
