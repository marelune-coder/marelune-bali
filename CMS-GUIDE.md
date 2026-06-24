# MARELUNE BALI - CMS & Deployment Guide

## Table of Contents

1. [CMS Overview](#cms-overview)
2. [Quick Start](#quick-start)
3. [CMS Collections Guide](#cms-collections-guide)
4. [Image Upload Workflow](#image-upload-workflow)
5. [Design Settings](#design-settings)
6. [Booking Form Setup](#booking-form-setup)
7. [Make.com Integration](#makecom-integration)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)

---

## CMS Overview

### What is Pages CMS?

Pages CMS adalah headless CMS yang:
- Terhubung langsung ke GitHub repository Anda
- Edit content tanpa perlu coding
- Perubahan di-commit langsung ke GitHub
- Trigger auto-rebuild via GitHub Actions

### Access CMS

```
https://app.pagescms.org
```

Login dengan GitHub account yang punya access ke repository.

---

## Quick Start

### 1. Connect Repository

1. Buka https://app.pagescms.org
2. Klik "Connect Repository"
3. Pilih repository `Marelune_Bali` atau nama repo Anda
4. CMS akan read `.pages.yml` untuk configure collections

### 2. Navigate Collections

Di sidebar kiri, Anda akan see:

```
📁 Content
  ├── ⚙️ Site Settings      → Brand, nav, contact
  ├── 🎨 Design Settings    → Colors, typography
  ├── 🏠 Home Page          → Homepage content
  ├── 👥 About Page        → About page content
  ├── 📅 Booking Page       → Booking page content
  ├── ⚙️ Booking Form      → Form fields, lead settings
  ├── 🗺️ Journeys          → Yacht routes/packages
  └── 📚 Journal Articles   → SEO blog posts

📁 Media
  └── [Uploaded images]
```

### 3. Edit & Save

1. Klik collection di sidebar
2. Edit content
3. Klik "Save" atau "Publish"
4. Changes di-commit ke GitHub
5. GitHub Actions auto-trigger rebuild

---

## CMS Collections Guide

### ⚙️ Site Settings

**Purpose:** Brand configuration yang affect seluruh website

**Fields:**
| Field | Description | Tips |
|-------|-------------|------|
| Brand Name | Nama brand | Muncul di header & footer |
| Domain | URL production | Contoh: https://marelunebali.com |
| Description | Meta description | Max 160 karakter |
| Logo | Brand logo | Upload via Media tab, paste URL |
| Contact | Email, phone, WhatsApp | Diambil untuk form fallback |
| Navigation | Menu items | Jangan ubah href kecuali perlu |
| Socials | Social media links | Footer links |
| Hero Categories | Homepage hero tabs | Max 5 tabs |
| Ticker | Footer marquee | Minimal 2 items |
| SEO Keywords | Meta keywords | Pisahkan dengan koma |

### 🎨 Design Settings

**Purpose:** Real-time visual configuration

**⚠️ IMPORTANT:** Changes di sini akan mengubah tampilan website setelah rebuild!

**Fields:**

#### Colors
```
Navy Blues:
- Navy 950 (Darkest)  → Default: #03182b
- Navy 900 (Dark)     → Default: #06233d
- Navy 800 (Medium)   → Default: #0a3458
- Navy 700 (Light)    → Default: #12486e

Neutrals:
- Mist/Background     → Default: #edf2f5
- White               → Default: #ffffff
- Ink/Text            → Default: #142033
- Muted Text          → Default: #667385

Accents:
- Gold Accent ✨      → Default: #d8b86f (IMPORTANT!)
- Reef Teal            → Default: #1d9a9a
- Sand                 → Default: #d8c7a3
```

#### Typography
```
- Heading Font   → Default: "Gentium Book Plus"
- Body Font     → Default: "Inter"
```

#### Visual Defaults
```
- Hero Overlay Strength  → light / medium / strong
- Card Shadow Style     → none / subtle / premium
- Button Style           → rounded / square / glass-square
- Animation Style        → none / fade / scroll-reveal
```

**After Edit:**
1. Save changes
2. Buka GitHub > Actions tab
3. Klik "deploy-github-pages"
4. Klik "Run workflow"
5. Tunggu sampai selesai (~2-3 minutes)

### 🏠 Home Page

**Purpose:** Semua content di homepage (/)

**Sections:**
- **Hero** - Background image dan headline
- **Trust Bar** - Rating, avatars, partners
- **Intro Statement** - Main headline
- **Stats** - 4 cards dengan numbers
- **Journey Section** - Heading untuk journeys
- **How It Works** - 4 steps
- **Services** - Tabbed service showcase
- **Why Choose Us** - 6 feature items
- **Testimonials** - Guest quotes
- **Journal Teaser** - Latest articles preview
- **FAQ** - Accordion Q&A
- **Newsletter** - Email subscription

### ⚙️ Booking Form & Leads

**Purpose:** Configure booking form fields dan lead management

**⚠️ CRITICAL:** Field names (name property) HARUS MATCH dengan Google Sheets column headers!

**Form Fields (Editable seperti Google Forms):**

| Field Name | Label | Type | Required |
|------------|-------|------|----------|
| name | Full Name | text | ✅ |
| whatsapp | WhatsApp Number | tel | ✅ |
| email | Email Address | email | ❌ |
| date | Preferred Date | date | ✅ |
| journey | Journey Route | select | ✅ |
| guest_count | Number of Guests | number | ❌ |
| occasion | Occasion | select | ❌ |
| notes | Special Requests | textarea | ❌ |

**Dropdown Options:**

Untuk field type `select`, Anda bisa:
1. **Options Source: journeys** - Ambil dari Journeys collection
2. **Extra Options** - Tambah manual options

**CRM Settings:**
```
Google Sheets Columns:
lead_id, created_at, status, name, whatsapp, email, date,
journey, guest_count, occasion, notes, source_page,
utm_source, next_follow_up, deal_value
```

### 🗺️ Journeys

**Purpose:** Yacht routes/packages

**Fields:**
| Field | Description | Rules |
|-------|-------------|-------|
| title | Journey name | Required |
| slug | URL path | UNIQUE, no spaces, lowercase |
| order | Display order | 1 = first |
| location | Location name | e.g., "Nusa Penida" |
| summary | Short description | For cards |
| description | Full description | For detail page |
| price | Price display | "From RpXX.X juta" |
| duration | Trip duration | "1 Day Trip" |
| idealFor | Target audience | "Couples, families" |
| transport | Transport type | Usually "Private Yacht" |
| image | Hero image | High quality, landscape |
| highlights | Key features | 4 items ideal |

**Creating New Journey:**
1. Klik "Add New Journey"
2. Fill semua fields
3. Set unique slug
4. Save

### 📚 Journal Articles

**Purpose:** SEO blog posts untuk Google traffic

**Fields:**
| Field | Description | Tips |
|-------|-------------|------|
| title | Article title | Include target keyword |
| slug | URL slug | lowercase, hyphen-separated |
| description | Meta description | 120-160 chars |
| targetKeyword | Primary keyword | Untuk ranking |
| secondaryKeywords | Supporting keywords | Pisahkan dengan koma |
| seoChecklist | SEO checklist | Verify sebelum publish |
| date | Publish date | |
| category | Category | Yacht Guide, Itinerary, dll |
| readingTime | Est. read time | "5 min read" |
| thumbnail | Featured image | 1200x630px ideal |
| body | Article content | Markdown/rich text |

**SEO Checklist Fields:**
- [ ] keywordInTitle - Keyword di title?
- [ ] keywordInFirst100 - Keyword di 100 kata pertama?
- [ ] hasInternalLinks - Ada link ke page lain?
- [ ] hasExternalLinks - Ada link ke external sources?
- [ ] hasImages - Images dengan alt text?
- [ ] minWordCount - Minimal 800 words?
- [ ] hasFaq - Ada FAQ di akhir?

---

## Image Upload Workflow

### Method 1: Via CMS Media Tab (Recommended)

1. Buka CMS
2. Klik tab "Media" di sidebar
3. Klik "Upload"
4. Select gambar dari komputer
5. Tunggu upload selesai
6. Copy URL gambar
7. Paste di field yang требует image

### Method 2: Via GitHub Directly

1. Buka GitHub repository
2. Navigate ke `Production-Code/public/uploads/marelune-assets/`
3. Klik "Add file" > "Upload files"
4. Drop gambar
5. Commit changes
6. Copy URL dari file

### Image Specifications

| Usage | Recommended Size | Aspect Ratio |
|-------|-----------------|--------------|
| Hero Images | 1920x1080+ | 16:9 landscape |
| Journey Images | 1600x900+ | 16:9 landscape |
| Thumbnails | 1200x630 | 1.91:1 |
| Service Images | 800x600+ | 4:3 |
| Team Photos | 400x400+ | 1:1 square |
| Trust Avatars | 200x200+ | 1:1 circle |
| Feature Icons | 200x150+ | 4:3 |

### Format Support
- ✅ JPG/JPEG
- ✅ PNG
- ✅ WebP (recommended)
- ❌ GIF (animated tidak support di semua tempat)

---

## Design Settings

### How It Works

1. Anda edit colors/typography di CMS
2. Save → commit ke GitHub
3. GitHub Actions rebuild website
4. CSS overrides di-generate secara real-time
5. Website menampilkan warna baru

### Color Preview

Gunakan tools ini untuk preview colors:
- https://coolors.co/
- https://htmlcolorcodes.com/

### Typography

Gunakan font names dari Google Fonts:
- https://fonts.google.com

**Popular combinations:**
```
Headings:
- Playfair Display (elegant, luxury)
- Cormorant Garamond (refined, editorial)
- Lora (classic, readable)
- Gentium Book Plus (warm, serif)

Body:
- Inter (modern, clean)
- Lato (friendly, readable)
- Source Sans Pro (professional)
- Nunito (rounded, friendly)
```

### Visual Defaults

```
Hero Overlay Strength:
- light   → Subtle overlay (gambar lebih visible)
- medium  → Balanced
- strong  → Text lebih readable (DEFAULT)

Card Shadow:
- none    → Flat design
- subtle  → Light shadow
- premium → Deep, dramatic shadow (DEFAULT)

Button Style:
- rounded → Soft corners
- square  → Sharp corners
- glass-square → Glass effect (DEFAULT)

Animation:
- none    → No animation
- fade    → Simple fade
- scroll-reveal → Slide-up on scroll (DEFAULT)
```

---

## Booking Form Setup

### Google Sheets Configuration

1. Buka Google Sheets Anda:
   ```
   https://docs.google.com/spreadsheets/d/1rWlvNO-E6cC01SV4a20jrfFvE4sZIzMTSx4rHGQeb-8/edit
   ```

2. Pastikan Row 1 memiliki header ini (exact match):
   ```
   A1: lead_id
   B1: created_at
   C1: status
   D1: name
   E1: whatsapp
   F1: email
   G1: date
   H1: journey
   I1: guest_count
   J1: occasion
   K1: notes
   L1: source_page
   M1: utm_source
   N1: next_follow_up
   O1: deal_value
   ```

3. Freeze row 1:
   - Select row 1
   - Format > Freeze > 1 row

### Make.com Setup

#### Step 1: Create Scenario

1. Login ke https://make.com
2. Klik "Create a new scenario"
3. Add "Webhook" module
4. Copy webhook URL

#### Step 2: Get Webhook URL

Webhook URL dari Make.com akan terlihat seperti:
```
https://hook.eu1.make.com/xxxxxxxxxxxx
```

Ini akan jadi environment variable di hosting.

#### Step 3: Add Google Sheets Module

1. Add "Google Sheets - Add a Row" module
2. Connect Google account
3. Select spreadsheet "Leads Marelune"
4. Select sheet "Leads"
5. Map fields:

| Webhook Field | Sheets Column |
|---------------|---------------|
| name | name |
| whatsapp | whatsapp |
| email | email |
| date | date |
| journey | journey |
| guest_count | guest_count |
| occasion | occasion |
| notes | notes |
| source_page | source_page |
| utm_source | utm_source |

#### Step 4: Add Notification (Optional)

1. Add "WhatsApp" or "Telegram" module
2. Set up message template
3. Connect account

#### Step 5: Activate Scenario

1. Klik "Run once" untuk test
2. Submit test form di website
3. Verify data masuk ke Google Sheets
4. Klik "Scheduling" > "ON"
5. Set to "Immediately"

---

## Deployment

### GitHub Pages (Current)

#### Setup

1. GitHub repository > Settings > Pages
2. Source: GitHub Actions
3. Save

#### Deploy Flow

```
CMS Edit → GitHub Commit → GitHub Actions Build → GitHub Pages Deploy
```

#### Manual Rebuild

Jika perubahan tidak muncul:

1. Buka GitHub repository
2. Klik "Actions" tab
3. Klik workflow "deploy-github-pages"
4. Klik "Run workflow" (right side)
5. Pilih branch: main
6. Klik "Run workflow"
7. Tunggu ~2-3 minutes
8. Refresh website

### Cloudflare Pages (Future)

#### Setup

1. Login ke https://pages.cloudflare.com
2. Create new project
3. Connect GitHub repository
4. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `Production-Code`
5. Environment variables:
   - `MAKE_WEBHOOK_URL`: Your Make.com webhook URL
6. Deploy

#### Custom Domain

1. Domain registrar > Add CNAME ke Cloudflare Pages
2. Cloudflare Pages > Custom domains
3. Enable HTTPS (automatic)

---

## Troubleshooting

### CMS Not Showing Images

**Problem:** CMS menampilkan URL bukan preview gambar

**Solution:**
- Pages CMS tidak punya built-in image preview
- Gambar tetap akan muncul di website
- Untuk verify, buka website preview atau GitHub repo

### Design Changes Not Appearing

**Problem:** Edit Design Settings tapi warna tidak berubah

**Solution:**
1. Pastikan sudah Save & Publish
2. Trigger manual rebuild:
   - GitHub > Actions > deploy-github-pages > Run workflow
3. Clear browser cache (Ctrl+Shift+R)
4. Hard refresh website

### Form Not Working

**Problem:** Submit form tapi tidak ada response

**Solution:**
1. Check browser console (F12) untuk errors
2. Pastikan Make.com scenario is ACTIVE
3. Test webhook dengan "Run once" di Make.com
4. Check Google Sheets untuk data masuk

### Build Failed

**Problem:** GitHub Actions build failed

**Solution:**
1. Buka Actions tab
2. Klik failed workflow
3. Check error message
4. Common issues:
   - JSON syntax error in content files
   - Missing required fields
   - Invalid image paths

### 404 on Pages

**Problem:** Beberapa page showing 404

**Solution:**
1. Pastikan file `index.html` exist di folder
2. Check route di `build.mjs`
3. Verify `sitemap.xml` generated
4. Trigger rebuild

---

## Support

### Quick Links

- CMS: https://app.pagescms.org
- GitHub: https://github.com
- Make.com: https://make.com
- Google Sheets: https://docs.google.com

### Common Tasks

| Task | Where |
|------|-------|
| Edit brand/nav | Site Settings |
| Change colors | Design Settings |
| Add journey | Journeys collection |
| Write article | Journal Articles |
| Edit homepage | Home Page |
| Change form fields | Booking Form & Leads |
| Upload image | Media tab or GitHub |

---

*Last Updated: 2026-06-18*
