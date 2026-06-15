# CMS Setup

Recommended CMS: Pages CMS connected to the GitHub repository.

## What the CMS edits

- Brand, navigation, domain, contact, WhatsApp, and social links
- Design tokens: navy, gold, mist, text colors, and font names
- Home, About, Book page hero copy and images
- Journey/package cards and detail pages
- Blog articles for SEO
- Lead form fields, labels, placeholders, submit text, success text, and CRM columns

## Lead data

Lead data should not be stored in the content CMS. The website form sends leads to `/api/leads`, then Cloudflare Pages Function forwards the payload to `MAKE_WEBHOOK_URL`.

Recommended pipeline:

```text
Website form -> Cloudflare Pages Function -> Make.com -> Google Sheets + Telegram
```

Use `ops/leads-crm-template.csv` as the first row for Google Sheets.
