# Marelune Bali - GitHub Pages Preview Repo

Static, CMS-ready website with Pages CMS integration for content management.

## Quick Start

### 1. Deploy to GitHub Pages

1. Create a new GitHub repository
2. Upload everything in this folder to the repository root
3. Commit to the `main` branch
4. Open GitHub repository `Settings > Pages`
5. Set `Source` to `GitHub Actions`
6. Open the `Actions` tab and wait for deployment to finish

Preview URL:
```
https://[username].github.io/[repository-name]/
```

### 2. Connect CMS

1. Go to https://app.pagescms.org
2. Login with GitHub account
3. Connect this repository
4. CMS will auto-configure from `.pages.yml`

### 3. Configure Google Sheets (Lead Form)

1. Open your Google Sheets:
   ```
   https://docs.google.com/spreadsheets/d/1rWlvNO-E6cC01SV4a20jrfFvE4sZIzMTSx4rHGQeb-8/edit
   ```
2. Ensure row 1 has these headers:
   ```
   lead_id, created_at, status, name, whatsapp, email, date, journey, guest_count, occasion, notes, source_page, utm_source, next_follow_up, deal_value
   ```
3. Setup Make.com scenario with webhook
4. Add `MAKE_WEBHOOK_URL` environment variable when moving to Cloudflare Pages

## Repository Structure

```
GitHub-Pages-Repo/
├── .github/
│   └── workflows/
│       └── deploy-github-pages.yml  # Auto-deploy workflow
├── .pages.yml                       # CMS configuration
├── .gitignore
├── README.md
└── Production-Code/
    ├── build.mjs                    # Static site generator
    ├── package.json
    ├── CMS-GUIDE.md                 # Complete CMS documentation
    ├── SEO-QUICK-REFERENCE.md       # SEO tools & keyword guide
    ├── content/                     # All CMS-editable content
    │   ├── site.json                # Brand, nav, contact
    │   ├── design.json              # Colors, typography
    │   ├── leads.json               # Form fields, CRM config
    │   ├── pages/                   # Page content
    │   ├── journeys/                # Yacht routes
    │   └── blog/                    # SEO articles
    └── public/                      # Static assets
        ├── assets/                  # CSS, JS
        └── uploads/                 # Images & media
```

## CMS Collections

| Collection | What it edits |
|------------|---------------|
| ⚙️ Site Settings | Brand, navigation, contact, SEO |
| 🎨 Design Settings | Colors, typography, visual defaults |
| 🏠 Home Page | Homepage content & sections |
| 👥 About Page | About page content |
| 📅 Booking Page | Booking page hero |
| ⚙️ Booking Form | Lead form fields & CRM |
| 🗺️ Journeys | Yacht routes & packages |
| 📚 Journal | SEO articles & blog posts |

## Design Settings - Real-time

Changes to Design Settings in CMS will update website colors and typography after rebuild!

1. Edit Design Settings in CMS
2. Save & Publish
3. Go to GitHub > Actions > deploy-github-pages > Run workflow
4. Wait ~2-3 minutes
5. Refresh website

## Local Preview

```bash
cd Production-Code
npm install
npm run build
npm run preview
```

Then open: http://127.0.0.1:4173/

## Documentation

- [CMS Guide](Production-Code/CMS-GUIDE.md) - Complete CMS documentation
- [SEO Reference](Production-Code/SEO-QUICK-REFERENCE.md) - Keyword research & SEO tips

## Important Notes

- **Lead Form**: Shows WhatsApp fallback on GitHub Pages (no serverless). Will work fully when moved to Cloudflare Pages.
- **Images**: Upload via CMS Media tab, then paste URL in content fields.
- **Custom Domain**: Set `USE_CUSTOM_DOMAIN=true` in repo variables when ready.

## Deployment Flow

```
CMS Edit → GitHub Commit → GitHub Actions Build → GitHub Pages Deploy
```

Timeline: ~2-3 minutes from save to live.

---

*Last Updated: 2026-06-18*
