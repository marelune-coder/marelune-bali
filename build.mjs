import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "dist");
const contentDir = path.join(root, "content");
const basePath = (process.env.BASE_PATH || "").replace(/\/+$/, "");

const readJson = async (file) => JSON.parse(await readFile(path.join(contentDir, file), "utf8"));

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const safeCss = (value = "") => String(value).replace(/[<>{};]/g, "");
const asArray = (value) => (Array.isArray(value) ? value : []);
const stripTags = (value = "") => String(value).replace(/<[^>]*>/g, "");
const withBase = (value = "") => {
  const url = String(value);
  if (!basePath || !url.startsWith("/") || url.startsWith("//")) return url;
  return `${basePath}${url}`;
};

const applyBasePath = (html) => {
  if (!basePath) return html;
  return html
    .replace(/\b(href|src|content)="\/(?!\/)/g, `$1="${basePath}/`)
    .replace(/url=\/(?!\/)/g, `url=${basePath}/`);
};

/**
 * Flatten to Nested Converter
 * Converts flat JSON structure (home_title, home_subtitle) to nested ({ home: { title, subtitle } })
 * This allows CMS to use flat field names while build.mjs uses nested access
 */
const flattenToNested = (flat, prefix) => {
  const nested = {};
  const prefixWithUnderscore = prefix + "_";

  for (const [key, value] of Object.entries(flat)) {
    if (key.startsWith(prefixWithUnderscore)) {
      const newKey = key.slice(prefixWithUnderscore.length);
      // Handle nested objects like meta: [{label, value}]
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        nested[newKey] = flattenToNested(value, newKey);
      } else {
        nested[newKey] = value;
      }
    } else if (!key.startsWith("_")) {
      nested[key] = value;
    }
  }
  return nested;
};

/**
 * Process flat JSON with specific prefixes to nested structure
 */
const processFlatPage = (flat) => {
  // Group fields by prefix
  const groups = {
    hero: {},
    trust: {},
    intro: {},
    journeySection: {},
    stepsSection: {},
    servicesSection: {},
    whySection: {},
    testimonialsSection: {},
    journalSection: {},
    faqSection: {},
    newsletter: {},
    stats: flat.stats || [],
    steps: flat.steps || [],
    services: flat.services || [],
    why: flat.why || [],
    testimonials: flat.testimonials || [],
    faq: flat.faq || []
  };

  // Process each field
  for (const [key, value] of Object.entries(flat)) {
    if (key.startsWith("_")) continue; // Skip comments

    // Direct fields
    if (!key.includes("_")) {
      groups[key] = value;
      continue;
    }

    // Find matching prefix
    for (const prefix of Object.keys(groups)) {
      if (prefix === "stats" || prefix === "steps" || prefix === "services" ||
          prefix === "why" || prefix === "testimonials" || prefix === "faq") continue;

      const prefixWithUnderscore = prefix + "_";
      if (key.startsWith(prefixWithUnderscore)) {
        const newKey = key.slice(prefixWithUnderscore.length);
        groups[prefix][newKey] = value;
        break;
      }
    }
  }

  return groups;
};

const readCollection = async (folder) => {
  const dir = path.join(contentDir, folder);
  const files = await readdir(dir);
  const items = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map(async (file) => ({
        ...(await readJson(path.join(folder, file))),
        sourceFile: file
      }))
  );
  return items.sort((a, b) => (a.order || 99) - (b.order || 99));
};

const parseFrontmatter = (raw) => {
  if (!raw.startsWith("---")) return { data: {}, body: raw };
  const close = raw.indexOf("\n---", 3);
  if (close === -1) return { data: {}, body: raw };
  const header = raw.slice(3, close).trim();
  const body = raw.slice(close + 4).trim();
  const data = {};

  for (const line of header.split("\n")) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    data[key] = value;
  }

  return { data, body };
};

const markdownToHtml = (markdown) => {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let list = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${escapeHtml(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    html.push(`<ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`);
    list = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      html.push(`<h2>${escapeHtml(trimmed.slice(3))}</h2>`);
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph();
      flushList();
      html.push(`<h3>${escapeHtml(trimmed.slice(4))}</h3>`);
      continue;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      list.push(trimmed.slice(2));
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  return html.join("\n");
};

const readPosts = async () => {
  const dir = path.join(contentDir, "blog");
  const files = await readdir(dir);
  const posts = await Promise.all(
    files
      .filter((file) => file.endsWith(".md"))
      .map(async (file) => {
        const raw = await readFile(path.join(dir, file), "utf8");
        const { data, body } = parseFrontmatter(raw);
        return {
          ...data,
          slug: data.slug || file.replace(/\.md$/, ""),
          body,
          html: markdownToHtml(body)
        };
      })
  );
  return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
};

const writePage = async (route, html) => {
  const target = route === "/" ? outDir : path.join(outDir, route);
  await mkdir(target, { recursive: true });
  await writeFile(path.join(target, "index.html"), applyBasePath(html));
};

const designTokens = (design) => {
  // Support both flat structure (new) and nested structure (old)
  const c = design?.colors || design || {};
  const headingFont = safeCss(design?.headingFont || design?.typography?.headingFont || "Gentium Book Plus");
  const bodyFont = safeCss(design?.bodyFont || design?.typography?.bodyFont || "Inter");

  return `<style id="cms-design-tokens">
    :root {
      --navy-950: ${safeCss(c.navy950 || "#03182b")};
      --navy-900: ${safeCss(c.navy900 || "#06233d")};
      --navy-800: ${safeCss(c.navy800 || "#0a3458")};
      --navy-700: ${safeCss(c.navy700 || "#12486e")};
      --mist: ${safeCss(c.mist || "#edf2f5")};
      --white: ${safeCss(c.white || "#ffffff")};
      --ink: ${safeCss(c.ink || "#142033")};
      --muted: ${safeCss(c.muted || "#667385")};
      --gold: ${safeCss(c.gold || "#d8b86f")};
      --reef: ${safeCss(c.reef || "#1d9a9a")};
      --sand: ${safeCss(c.sand || "#d8c7a3")};
      --serif: "${headingFont}", Georgia, serif;
      --sans: "${bodyFont}", Arial, sans-serif;
    }
  </style>`;
};

/**
 * CMS Design Override Generator
 * Mengenerate CSS override berdasarkan Design Settings CMS
 * Support both flat and nested structure
 */
const designOverrides = (design) => {
  // Support both flat and nested structure
  const c = design?.colors || design || {};
  const v = design?.visualDefaults || {
    heroOverlayStrength: design?.heroOverlay || "strong",
    cardShadow: design?.cardShadow || "premium",
    motion: design?.animation || "scroll-reveal"
  };

  // Hero overlay strength
  const overlayStrengths = {
    light: "rgba(3, 24, 43, 0.24)",
    medium: "rgba(3, 24, 43, 0.48)",
    strong: "rgba(3, 24, 43, 0.74)"
  };
  const overlayStrength = overlayStrengths[v.heroOverlayStrength] || overlayStrengths.strong;

  // Card shadow style
  const shadowStyles = {
    none: "none",
    subtle: "0 8px 32px rgba(3, 24, 43, 0.08)",
    premium: "0 24px 70px rgba(3, 24, 43, 0.18)"
  };
  const cardShadow = shadowStyles[v.cardShadow] || shadowStyles.premium;

  // Animation style
  const motionEnabled = v.motion !== "none";

  return `<style id="cms-design-overrides" data-design-active="true">
    /* ========================================
       CMS DESIGN OVERRIDES - Generated from Design Settings
       Changes here apply in real-time after rebuild
       ======================================== */

    /* --- Core Colors Override --- */
    .site-header {
      background: ${overlayStrength};
    }

    .eyebrow {
      color: ${safeCss(c.gold || "#d8b86f")};
    }

    .button-primary {
      background: ${safeCss(c.gold || "#d8b86f")};
    }

    h2, h3 {
      color: ${safeCss(c.navy950 || "#03182b")};
    }

    .site-footer {
      background: ${safeCss(c.navy950 || "#03182b")};
    }

    /* --- Trust Section Overrides --- */
    .trust-avatars strong {
      color: ${safeCss(c.navy950 || "#03182b")};
    }

    .statement h2 {
      color: ${safeCss(c.navy950 || "#03182b")};
    }

    .partner-row {
      background: rgba(${hexToRgb(c.ink || "#142033")}, 0.1);
    }

    .partner-row span {
      background: ${safeCss(c.mist || "#edf2f5")};
      color: rgba(${hexToRgb(c.ink || "#142033")}, 0.62);
    }

    /* --- Card Overrides --- */
    .journey-showcase,
    .step-card,
    .service-panel,
    .feature-item,
    .testimonial-card,
    .post-card,
    .faq-list details {
      box-shadow: ${cardShadow};
    }

    .step-card {
      background: ${safeCss(c.white || "#ffffff")};
    }

    /* --- Hero Tabs Override --- */
    .hero-tabs {
      background: rgba(${hexToRgb(c.navy900 || "#06233d")}, 0.68);
    }

    .hero-tabs .is-selected {
      color: ${safeCss(c.navy950 || "#03182b")};
      background: ${safeCss(c.white || "#ffffff")};
    }

    .hero-tabs .is-selected span {
      color: ${safeCss(c.navy700 || "#12486e")};
    }

    /* --- Button Overrides --- */
    .button-glass {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.28);
    }

    .button-dark {
      color: ${safeCss(c.white || "#ffffff")};
      background: ${safeCss(c.navy950 || "#03182b")};
    }

    .button-light {
      color: ${safeCss(c.navy950 || "#03182b")};
      background: ${safeCss(c.white || "#ffffff")};
    }

    /* --- Form Overrides --- */
    .lead-form input,
    .lead-form select,
    .lead-form textarea {
      border: 1px solid #dbe2ea;
      background: #f8fafc;
    }

    .lead-form label {
      color: ${safeCss(c.navy950 || "#03182b")};
    }

    /* --- CTA Section --- */
    .cta-section {
      background:
        linear-gradient(90deg, rgba(${hexToRgb(c.navy950 || "#03182b")}, 0.94), rgba(${hexToRgb(c.navy950 || "#03182b")}, 0.72)),
        var(--cta-bg-image);
    }

    /* --- Footer Text Overrides --- */
    .site-footer h3 {
      color: ${safeCss(c.white || "#ffffff")};
    }

    /* --- Section Backgrounds --- */
    body {
      background: ${safeCss(c.mist || "#edf2f5")};
      color: ${safeCss(c.ink || "#142033")};
    }

    /* --- Feature Item Colors --- */
    .feature-item {
      background: ${safeCss(c.white || "#ffffff")};
    }

    .feature-item h3 {
      color: ${safeCss(c.navy950 || "#03182b")};
    }

    /* --- FAQ Accordion --- */
    .faq-list summary {
      color: ${safeCss(c.navy950 || "#03182b")};
    }

    /* --- Newsletter --- */
    .newsletter-section {
      background: ${safeCss(c.navy900 || "#06233d")};
    }

    .newsletter-content h2 {
      color: ${safeCss(c.white || "#ffffff")};
    }

    .newsletter-content button {
      color: ${safeCss(c.navy950 || "#03182b")};
      background: ${safeCss(c.white || "#ffffff")};
    }

    /* --- Article Page --- */
    .article {
      background: ${safeCss(c.mist || "#edf2f5")};
    }

    .article-hero {
      background: ${safeCss(c.navy950 || "#03182b")};
    }

    /* --- Typography Override Notice --- */
    /* Note: Font changes require Google Fonts to be loaded first */
    h1, h2, h3 {
      font-family: "${safeCss(design.typography?.headingFont || "Gentium Book Plus")}", Georgia, serif;
    }

    body, p, a, span, input, button {
      font-family: "${safeCss(design.typography?.bodyFont || "Inter")}", Arial, sans-serif;
    }

    .brand {
      font-family: "${safeCss(design.typography?.headingFont || "Gentium Book Plus")}", Georgia, serif;
    }

    /* --- Motion Animation Toggle --- */
    ${motionEnabled ? `
    .has-reveal [data-reveal] {
      opacity: 0;
      transform: translateY(28px);
      transition: opacity 700ms ease, transform 700ms ease;
    }

    .has-reveal [data-reveal].is-visible {
      opacity: 1;
      transform: translateY(0);
    }
    ` : `
    .has-reveal [data-reveal] {
      opacity: 1;
      transform: none;
      transition: none;
    }
    `}
  </style>`;
};

/**
 * Helper: Convert hex color to RGB
 */
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "3, 24, 43"; // Default navy
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
};

const normalizeStructuredData = (value) => {
  if (Array.isArray(value)) return value.map(normalizeStructuredData);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeStructuredData(item)]));
  }
  if (typeof value === "string" && value.startsWith("/")) return withBase(value);
  return value;
};

const jsonLd = (data) =>
  `<script type="application/ld+json">${JSON.stringify(normalizeStructuredData(data)).replaceAll("<", "\\u003c")}</script>`;

const navHtml = (site, currentPath) => `
  <header class="site-header" data-site-header>
    <a class="brand" href="/" aria-label="${escapeHtml(site.brand)} home">
      <img src="${site.logo}" alt="" width="30" height="30">
      <span>${escapeHtml(site.brand)}</span>
    </a>
    <button class="menu-button" data-menu-button aria-expanded="false" aria-label="Open menu">
      <span></span><span></span>
    </button>
    <nav class="nav" data-nav>
      ${asArray(site.nav)
        .map((item) => {
          const active =
            item.href === "/" ? currentPath === "/" : currentPath.startsWith(item.href);
          return `<a class="${active ? "is-active" : ""}" href="${item.href}">${escapeHtml(item.label)}</a>`;
        })
        .join("")}
    </nav>
    <div class="header-actions">
      <form class="search" data-search>
        <input aria-label="Search destinations" name="q" placeholder="Search Destinations">
        <button aria-label="Search" type="submit">Search</button>
      </form>
      <a class="reserve-link" href="/book/">Reserve Now</a>
    </div>
  </header>
`;

const tickerStrip = (items = []) => {
  const safeItems = asArray(items);
  if (!safeItems.length) return "";
  const ticker = [...safeItems, ...safeItems]
    .map((item) => `<span>${escapeHtml(item)}</span>`)
    .join("");
  return `<div class="ticker-strip" aria-label="Marelune highlights">${ticker}</div>`;
};

const footerHtml = (site) => `
  ${tickerStrip(site.ticker)}
  <footer class="site-footer">
    <div class="footer-inner">
      <div>
        <a class="brand footer-brand" href="/">
          <img src="${site.logo}" alt="" width="28" height="28">
          <span>${escapeHtml(site.brand)}</span>
        </a>
        <p>${escapeHtml(site.description)}</p>
        <div class="social-row">
          ${asArray(site.socials)
            .map((item) => `<a href="${item.href}" target="_blank" rel="noreferrer">${escapeHtml(item.label)}</a>`)
            .join("")}
        </div>
      </div>
      <div>
        <h3>Main Links</h3>
        ${asArray(site.nav).map((item) => `<a href="${item.href}">${escapeHtml(item.label)}</a>`).join("")}
        <a href="/book/">Book a Trip</a>
      </div>
      <div>
        <h3>CMS Pages</h3>
        <a href="/journeys/">Journey collection</a>
        <a href="/journal/">Travel journal</a>
        <a href="/book/">Lead form</a>
      </div>
      <div>
        <h3>Contact</h3>
        <a href="mailto:${site.contact.email}">${escapeHtml(site.contact.email)}</a>
        <a href="https://wa.me/${site.contact.whatsapp}">WhatsApp</a>
        <span>${escapeHtml(site.contact.location)}</span>
      </div>
    </div>
  </footer>
`;

const layout = ({ site, title, description, currentPath, image, body, headExtra = "" }) => `<!doctype html>
<html lang="en" data-base-path="${escapeHtml(basePath)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description || site.description)}">
  <meta name="keywords" content="${escapeHtml(site.seoKeywords)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description || site.description)}">
  <meta property="og:type" content="website">
  ${image ? `<meta property="og:image" content="${image}">` : ""}
  <link rel="icon" href="${site.logo}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Gentium+Book+Plus:wght@400;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/style.css">
  <script>document.documentElement.dataset.basePath = "${escapeHtml(basePath)}";</script>
  ${designTokens(site.design)}
  ${designOverrides(site.design)}
  ${headExtra}
</head>
<body>
  ${navHtml(site, currentPath)}
  <main>
    ${body}
  </main>
  ${footerHtml(site)}
  <script src="/assets/js/main.js"></script>
</body>
</html>`;

const sectionHeading = ({ eyebrow, title, body, align = "center" }) => `
  <div class="section-heading section-heading-${align}" data-reveal>
    ${eyebrow ? `<span class="eyebrow">${escapeHtml(eyebrow)}</span>` : ""}
    <h2>${escapeHtml(title)}</h2>
    ${body ? `<p>${escapeHtml(body)}</p>` : ""}
  </div>
`;

const hero = ({ title, subtitle, image, ctaLabel = "Book Your Trip", ctaHref = "/book/", categories = [] }) => `
  <section class="hero">
    <img class="hero-bg" src="${image}" alt="">
    <div class="hero-overlay"></div>
    <div class="hero-content" data-reveal>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(subtitle)}</p>
      <a class="button button-glass" href="${ctaHref}">${escapeHtml(ctaLabel)} <span aria-hidden="true">&rarr;</span></a>
    </div>
    ${
      asArray(categories).length
        ? `<div class="hero-tabs">${asArray(categories)
            .map(
              (item, index) => `
              <a class="${index === 2 ? "is-selected" : ""}" href="/journeys/">
                <strong>${escapeHtml(item.label)}</strong>
                <span>${escapeHtml(item.caption)}</span>
              </a>`
            )
            .join("")}</div>`
        : ""
    }
  </section>
`;

const trustSection = (page) => `
  <section class="trust-section">
    <div class="trust-avatars" data-reveal>
      ${asArray(page.trust?.avatars)
        .map((src) => `<img src="${src}" alt="">`)
        .join("")}
      <div>
        <strong>${escapeHtml(page.trust?.rating || "4.9/5")}</strong>
        <span>${escapeHtml(page.trust?.text || "")}</span>
      </div>
    </div>
    <div class="statement" data-reveal>
      <span class="eyebrow">${escapeHtml(page.intro?.eyebrow || "Private Yacht Agency")}</span>
      <h2>${escapeHtml(page.intro?.title || "")}</h2>
      <p>${escapeHtml(page.intro?.body || "")}</p>
    </div>
    <div class="partner-row" data-reveal>
      ${asArray(page.trust?.partners)
        .map((item) => `<span>${escapeHtml(item)}</span>`)
        .join("")}
    </div>
  </section>
`;

const statCards = (stats = []) => `
  <section class="image-stat-section">
    ${asArray(stats)
      .map(
        (item, index) => `
        <article class="image-stat image-stat-${index + 1}" data-reveal>
          <img src="${item.image}" alt="">
          <div>
            <strong>${escapeHtml(item.value)}</strong>
            <span>${escapeHtml(item.label)}</span>
          </div>
        </article>`
      )
      .join("")}
  </section>
`;

const journeyShowcase = (journey) => `
  <article class="journey-showcase" data-reveal>
    <a class="journey-visual" href="/journeys/${journey.slug}/">
      <img src="${journey.image}" alt="${escapeHtml(journey.location)}">
      <div class="journey-title">
        <span>${escapeHtml(journey.location)}</span>
        <p>${escapeHtml(journey.summary)}</p>
      </div>
    </a>
    <div class="journey-meta">
      <div><span>Base price</span><strong>${escapeHtml(journey.price)}</strong></div>
      <div><span>Duration</span><strong>${escapeHtml(journey.duration)}</strong></div>
      <a href="/journeys/${journey.slug}/">More Details <span aria-hidden="true">&rarr;</span></a>
      <div><span>Ideal for</span><strong>${escapeHtml(journey.idealFor)}</strong></div>
      <div><span>Transport</span><strong>${escapeHtml(journey.transport)}</strong></div>
    </div>
  </article>
`;

const journeyCard = (journey) => `
  <article class="compact-card" data-filter-card data-title="${escapeHtml(`${journey.title} ${journey.location}`.toLowerCase())}">
    <a class="compact-image" href="/journeys/${journey.slug}/">
      <img src="${journey.image}" alt="${escapeHtml(journey.location)}">
    </a>
    <div>
      <span class="eyebrow">${escapeHtml(journey.location)}</span>
      <h3><a href="/journeys/${journey.slug}/">${escapeHtml(journey.title)}</a></h3>
      <p>${escapeHtml(journey.summary)}</p>
      <a class="text-link" href="/journeys/${journey.slug}/">View route</a>
    </div>
  </article>
`;

const stepsSection = (page) => `
  <section class="section steps-section">
    ${sectionHeading(page.stepsSection)}
    <div class="steps-grid">
      ${asArray(page.steps)
        .map(
          (item) => `
          <article class="step-card" data-reveal>
            <span>${escapeHtml(item.number)}</span>
            <i aria-hidden="true"></i>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.text)}</p>
          </article>`
        )
        .join("")}
    </div>
  </section>
`;

const servicesSection = (page) => {
  const categories = asArray(page.servicesSection?.categories);
  const services = asArray(page.services);
  const active = categories[0]?.value || "planning";

  return `
    <section class="section services-section">
      ${sectionHeading(page.servicesSection)}
      <div class="service-tabs" data-service-tabs>
        ${categories
          .map(
            (item, index) =>
              `<button class="${index === 0 ? "is-active" : ""}" data-service-filter="${escapeHtml(item.value)}" type="button">${escapeHtml(item.label)}</button>`
          )
          .join("")}
      </div>
      <div class="service-panels">
        ${services
          .map(
            (item) => `
            <article class="service-panel ${item.category === active ? "is-visible" : ""}" data-service-panel="${escapeHtml(item.category)}" data-reveal>
              <img src="${item.image}" alt="">
              <div>
                <span class="eyebrow">${escapeHtml(item.kicker || "Curated Service")}</span>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.text)}</p>
                <dl>
                  ${asArray(item.meta)
                    .map((meta) => `<div><dt>${escapeHtml(meta.label)}</dt><dd>${escapeHtml(meta.value)}</dd></div>`)
                    .join("")}
                </dl>
                <a class="button button-dark" href="${item.ctaHref || "/book/"}">${escapeHtml(item.ctaLabel || "Start Plan")}</a>
              </div>
            </article>`
          )
          .join("")}
      </div>
    </section>
  `;
};

const featureGrid = (page) => `
  <section class="section feature-section">
    ${sectionHeading(page.whySection)}
    <div class="feature-grid">
      ${asArray(page.why)
        .map(
          (item) => `
          <article class="feature-item" data-reveal>
            <img src="${item.image}" alt="">
            <div>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.text)}</p>
            </div>
          </article>`
        )
        .join("")}
    </div>
  </section>
`;

const testimonialsSection = (page) => `
  <section class="section testimonials-section">
    ${sectionHeading(page.testimonialsSection)}
    <div class="testimonial-track">
      ${asArray(page.testimonials)
        .map(
          (item) => `
          <article class="testimonial-card" data-reveal>
            <img src="${item.image}" alt="">
            <blockquote>${escapeHtml(item.quote)}</blockquote>
            <div>
              <strong>${escapeHtml(item.name)}</strong>
              <span>${escapeHtml(item.role)}</span>
            </div>
          </article>`
        )
        .join("")}
    </div>
  </section>
`;

const postCard = (post, featured = false) => `
  <article class="post-card ${featured ? "is-featured" : ""}" data-filter-card data-title="${escapeHtml(`${post.title} ${post.category} ${post.description}`.toLowerCase())}" data-reveal>
    <a class="post-image" href="/journal/${post.slug}/">
      <img src="${post.thumbnail}" alt="">
    </a>
    <div>
      <span class="eyebrow">${escapeHtml(post.category || "Journal")} / ${escapeHtml(post.readingTime || "")}</span>
      <h3><a href="/journal/${post.slug}/">${escapeHtml(post.title)}</a></h3>
      <p>${escapeHtml(post.description)}</p>
      <span class="post-date">${escapeHtml(post.date)}</span>
    </div>
  </article>
`;

const journalTeaser = (page, posts) => `
  <section class="section journal-section">
    ${sectionHeading(page.journalSection)}
    <div class="post-grid">${posts.slice(0, 4).map((post, index) => postCard(post, index === 0)).join("")}</div>
    <div class="section-action"><a class="button button-dark" href="/journal/">Explore the Journal</a></div>
  </section>
`;

const faqSection = (page) => `
  <section class="section faq-section">
    <div data-reveal>
      <span class="eyebrow">${escapeHtml(page.faqSection?.eyebrow || "FAQ")}</span>
      <h2>${escapeHtml(page.faqSection?.title || "Everything you need to know")}</h2>
      <p>${escapeHtml(page.faqSection?.body || "")}</p>
      <a class="button button-dark" href="/book/">Book Your Trip</a>
    </div>
    <div class="faq-list" data-reveal>
      ${asArray(page.faq)
        .map((item) => `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`)
        .join("")}
    </div>
  </section>
`;

const newsletterSection = (page) => `
  <section class="newsletter-section">
    <img src="${page.newsletter?.image}" alt="">
    <div class="newsletter-content" data-reveal>
      <h2>${escapeHtml(page.newsletter?.title || "Stay Updated")}</h2>
      <p>${escapeHtml(page.newsletter?.body || "")}</p>
      <form data-newsletter-form>
        <input type="email" name="email" placeholder="${escapeHtml(page.newsletter?.placeholder || "Email address")}" required>
        <button type="submit">${escapeHtml(page.newsletter?.buttonLabel || "Subscribe")}</button>
      </form>
      <span data-newsletter-status></span>
    </div>
  </section>
`;

const ctaSection = (site) => `
  <section class="cta-section">
    <div data-reveal>
      <span class="eyebrow">Marelune Bali</span>
      <h2>Ready to shape your private Bali sea day?</h2>
      <p>Send your preferred date and route. The team will follow up with availability and the right yacht option.</p>
    </div>
    <a class="button button-light" href="/book/">Book Your Trip</a>
  </section>
`;

const homePage = (site, page, journeys, posts) =>
  layout({
    site,
    currentPath: "/",
    title: page.title,
    description: page.description,
    image: page.hero.image,
    body: `
      ${hero({ ...page.hero, categories: site.heroCategories })}
      ${trustSection(page)}
      ${statCards(page.stats)}
      <section class="section journeys-showcase-section">
        ${sectionHeading(page.journeySection)}
        <div class="journey-stack">${journeys.map(journeyShowcase).join("")}</div>
      </section>
      ${stepsSection(page)}
      ${servicesSection(page)}
      ${featureGrid(page)}
      ${testimonialsSection(page)}
      ${journalTeaser(page, posts)}
      ${faqSection(page)}
      ${newsletterSection(page)}
    `
  });

const journeysPage = (site, journeys) =>
  layout({
    site,
    currentPath: "/journeys/",
    title: "Private Yacht Journeys in Bali",
    description: "Explore private yacht routes in Bali, including Nusa Penida, Nusa Dua, and Gili Trawangan.",
    image: journeys[0]?.image,
    body: `
      ${hero({
        title: "JOURNEYS",
        subtitle: "Choose the route, mood, and pace of your private yacht experience in Bali.",
        image: "/uploads/marelune-assets/IMG-20260602-WA0066.jpg",
        ctaLabel: "Request Availability",
        ctaHref: "/book/",
        categories: site.heroCategories
      })}
      <section class="section journeys-showcase-section">
        ${sectionHeading({
          eyebrow: "Route Collection",
          title: "Designed around Bali's real sea-day moments",
          body: "Every route can be adjusted by timing, celebration setup, yacht tier, and sea condition."
        })}
        <div class="journey-stack">${journeys.map(journeyShowcase).join("")}</div>
      </section>
      ${ctaSection(site)}
    `
  });

const journeyDetailPage = (site, journey, posts) =>
  layout({
    site,
    currentPath: "/journeys/",
    title: `${journey.title} | Marelune Bali`,
    description: journey.summary,
    image: journey.image,
    body: `
      ${hero({
        title: journey.location.toUpperCase(),
        subtitle: journey.description,
        image: journey.image,
        ctaLabel: "Book This Route",
        ctaHref: `/book/?journey=${journey.slug}`
      })}
      <section class="section route-detail">
        <div data-reveal>
          <span class="eyebrow">${escapeHtml(journey.transport)}</span>
          <h2>${escapeHtml(journey.title)}</h2>
          <p>${escapeHtml(journey.description)}</p>
          <dl class="detail-list">
            <div><dt>Price</dt><dd>${escapeHtml(journey.price)}</dd></div>
            <div><dt>Duration</dt><dd>${escapeHtml(journey.duration)}</dd></div>
            <div><dt>Ideal for</dt><dd>${escapeHtml(journey.idealFor)}</dd></div>
            <div><dt>Transport</dt><dd>${escapeHtml(journey.transport)}</dd></div>
          </dl>
        </div>
        <div class="highlight-grid">
          ${asArray(journey.highlights)
            .map((item, index) => `<article data-reveal><span>0${index + 1}</span><h3>${escapeHtml(item)}</h3><p>Aligned during consultation before the charter is confirmed.</p></article>`)
            .join("")}
        </div>
      </section>
      <section class="section journal-section">
        ${sectionHeading({
          eyebrow: "Related Journal",
          title: "Planning notes for this kind of journey",
          body: "Helpful articles can warm up future guests before they contact Marelune."
        })}
        <div class="post-grid">${posts.slice(0, 3).map((post, index) => postCard(post, index === 0)).join("")}</div>
      </section>
      ${ctaSection(site)}
    `
  });

const journalPage = (site, posts) =>
  layout({
    site,
    currentPath: "/journal/",
    title: "Marelune Journal - Bali Yacht Guides",
    description: "Bali yacht guides, private charter ideas, and travel articles for couples, families, and private groups.",
    image: posts[0]?.thumbnail,
    body: `
      ${hero({
        title: "JOURNAL",
        subtitle: "Guides, route notes, and planning ideas built to help future guests discover Marelune from search.",
        image: "/uploads/marelune-assets/IMG-20260602-WA0033.jpg",
        ctaLabel: "Start Planning",
        ctaHref: "/book/"
      })}
      <section class="section journal-section">
        ${sectionHeading({
          eyebrow: "Travel Tips",
          title: "New adventures and travel tips daily",
          body: "Search-focused articles that connect inspiration to real booking intent."
        })}
        <form class="journal-search" data-content-search>
          <input name="q" placeholder="Search journal topics">
          <button type="submit">Search</button>
        </form>
        <div class="post-grid">${posts.map((post, index) => postCard(post, index === 0)).join("")}</div>
      </section>
    `
  });

const postPage = (site, post) =>
  layout({
    site,
    currentPath: "/journal/",
    title: `${post.title} | Marelune Journal`,
    description: post.description,
    image: post.thumbnail,
    headExtra: jsonLd({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      image: [post.thumbnail],
      datePublished: post.date,
      dateModified: post.updated || post.date,
      author: {
        "@type": "Organization",
        name: site.brand,
        url: site.domain
      },
      publisher: {
        "@type": "Organization",
        name: site.brand,
        logo: {
          "@type": "ImageObject",
          url: site.logo
        }
      },
      mainEntityOfPage: `${site.domain}/journal/${post.slug}/`
    }),
    body: `
      <article class="article">
        <header class="article-hero">
          <span class="eyebrow">${escapeHtml(post.category || "Journal")} / ${escapeHtml(post.readingTime || "")}</span>
          <h1>${escapeHtml(post.title)}</h1>
          <p>${escapeHtml(post.description)}</p>
          <img src="${post.thumbnail}" alt="">
        </header>
        <div class="article-body">${post.html}</div>
      </article>
      ${ctaSection(site)}
    `
  });

const aboutPage = (site, page) =>
  layout({
    site,
    currentPath: "/about/",
    title: page.title,
    description: page.description,
    image: page.hero.image,
    body: `
      ${hero({ ...page.hero, ctaLabel: "Book Your Trip", ctaHref: "/book/" })}
      <section class="section route-detail">
        <div data-reveal>
          <span class="eyebrow">${escapeHtml(page.story.eyebrow)}</span>
          <h2>${escapeHtml(page.story.title)}</h2>
          <p>${escapeHtml(page.story.body)}</p>
        </div>
        <div class="highlight-grid">
          ${asArray(page.team)
            .map((member, index) => `<article data-reveal><span>0${index + 1}</span><h3>${escapeHtml(member.name)}</h3><p>${escapeHtml(member.role)}</p></article>`)
            .join("")}
        </div>
      </section>
      ${faqSection(page)}
    `
  });

const formField = (field, journeys) => {
  const required = field.required ? " required" : "";
  const placeholder = field.placeholder ? ` placeholder="${escapeHtml(field.placeholder)}"` : "";
  const name = escapeHtml(field.name);
  const label = escapeHtml(field.label);

  if (field.type === "textarea") {
    return `<label>${label} <textarea name="${name}" rows="4"${placeholder}${required}></textarea></label>`;
  }

  if (field.type === "select") {
    const journeyOptions =
      field.optionsFrom === "journeys"
        ? journeys.map((journey) => `<option value="${journey.slug}">${escapeHtml(journey.title)}</option>`)
        : [];
    const extraOptions = asArray(field.extraOptions).map(
      (option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`
    );
    return `<label>${label}
      <select name="${name}"${required}>
        <option value="">${escapeHtml(field.placeholder || "Select option")}</option>
        ${[...journeyOptions, ...extraOptions].join("")}
      </select>
    </label>`;
  }

  const type = field.type === "number" ? "text" : field.type || "text";
  const inputmode = field.type === "tel" ? ' inputmode="tel"' : field.type === "number" ? ' inputmode="numeric"' : "";
  return `<label>${label} <input name="${name}" type="${type}"${inputmode}${placeholder}${required}></label>`;
};

const bookPage = (site, page, journeys, leads) =>
  layout({
    site,
    currentPath: "/book/",
    title: page.title,
    description: page.description,
    image: page.hero.image,
    body: `
      ${hero({ ...page.hero, ctaLabel: "Send Request", ctaHref: "#booking-form" })}
      <section class="section booking-grid" id="booking-form">
        <div data-reveal>
          <span class="eyebrow">Private Request</span>
          <h2>Tell us the trip you want</h2>
          <p>Your request will be routed to the Marelune team for availability, route suggestion, and package matching.</p>
          <div class="booking-note">
            <strong>Response flow</strong>
            <span>Website form -> Lead function -> Make.com -> Google Sheets + WhatsApp follow-up</span>
          </div>
        </div>
        <form class="lead-form" data-reveal data-lead-form data-whatsapp="${site.contact.whatsapp}" data-endpoint="${escapeHtml(leads.endpoint)}" data-success="${escapeHtml(leads.successMessage)}" data-fallback="${escapeHtml(leads.fallbackMessage)}">
          ${asArray(leads.fields).map((field) => formField(field, journeys)).join("")}
          <button class="button button-primary" type="submit">${escapeHtml(leads.submitLabel)}</button>
          <p class="form-status" data-form-status></p>
        </form>
      </section>
    `
  });

const redirectPage = (site, target) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=${target}">
  <link rel="canonical" href="${site.domain}${target}">
  <title>Redirecting to Marelune Journal</title>
</head>
<body>
  <a href="${target}">Continue to Marelune Journal</a>
</body>
</html>`;

const externalRedirectPage = (target, title = "Opening Marelune CMS") => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url=${target}">
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <p>Opening CMS. Continue to <a href="${target}">${target}</a>.</p>
</body>
</html>`;

const sitemap = (site, routes) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((route) => `  <url><loc>${site.domain}${route}</loc></url>`).join("\n")}
</urlset>
`;

const main = async () => {
  const site = await readJson("site.json");
  site.design = await readJson("design.json");

  // Process flat JSON to nested structure for CMS compatibility
  const home = processFlatPage(await readJson("pages/home.json"));
  const about = processFlatPage(await readJson("pages/about.json"));
  const book = processFlatPage(await readJson("pages/book.json"));

  const leads = await readJson("leads.json");
  const journeys = await readCollection("journeys");
  const posts = await readPosts();

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await cp(path.join(root, "public"), outDir, { recursive: true });

  const routes = ["/", "/journeys/", "/journal/", "/about/", "/book/"];

  await writePage("/", homePage(site, home, journeys, posts));
  await writePage("/journeys", journeysPage(site, journeys));
  await writePage("/journal", journalPage(site, posts));
  await writePage("/stories", redirectPage(site, "/journal/"));
  await writePage("/cms", externalRedirectPage("https://app.pagescms.org"));
  await writePage("/admin", externalRedirectPage("https://app.pagescms.org"));
  await writePage("/about", aboutPage(site, about));
  await writePage("/book", bookPage(site, book, journeys, leads));

  for (const journey of journeys) {
    await writePage(`/journeys/${journey.slug}`, journeyDetailPage(site, journey, posts));
    routes.push(`/journeys/${journey.slug}/`);
  }

  for (const post of posts) {
    await writePage(`/journal/${post.slug}`, postPage(site, post));
    await writePage(`/stories/${post.slug}`, redirectPage(site, `/journal/${post.slug}/`));
    routes.push(`/journal/${post.slug}/`);
  }

  await writeFile(path.join(outDir, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${site.domain}/sitemap.xml\n`);
  await writeFile(path.join(outDir, "sitemap.xml"), sitemap(site, routes));
};

main();
