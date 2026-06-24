document.documentElement.classList.add("has-reveal");
const basePath = document.documentElement.dataset.basePath || "";
const withBase = (path) => `${basePath}${path}`;

const menuButton = document.querySelector("[data-menu-button]");
const nav = document.querySelector("[data-nav]");
const header = document.querySelector("[data-site-header]");

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    header?.classList.toggle("is-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
  });
}

const searchForm = document.querySelector("[data-search]");
if (searchForm) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = searchForm.querySelector("input");
    const query = input?.value?.trim();
    if (!query) return;
    window.location.href = withBase(`/journeys/?q=${encodeURIComponent(query)}`);
  });
}

const contentSearch = document.querySelector("[data-content-search]");
if (contentSearch) {
  contentSearch.addEventListener("submit", (event) => event.preventDefault());
  const input = contentSearch.querySelector("input");
  const cards = [...document.querySelectorAll("[data-filter-card]")];
  input?.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    cards.forEach((card) => {
      const match = !query || card.dataset.title?.includes(query);
      card.hidden = !match;
    });
  });
}

const serviceTabs = document.querySelector("[data-service-tabs]");
if (serviceTabs) {
  const buttons = [...serviceTabs.querySelectorAll("[data-service-filter]")];
  const panels = [...document.querySelectorAll("[data-service-panel]")];

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.serviceFilter;
      buttons.forEach((item) => item.classList.toggle("is-active", item === button));
      panels.forEach((panel) => {
        panel.classList.toggle("is-visible", panel.dataset.servicePanel === target);
      });
    });
  });
}

const revealItems = [...document.querySelectorAll("[data-reveal]")];
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px 180px 0px", threshold: 0.04 }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const newsletterForm = document.querySelector("[data-newsletter-form]");
if (newsletterForm) {
  newsletterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const status = document.querySelector("[data-newsletter-status]");
    if (status) status.textContent = "Thank you. Marelune will keep you updated.";
    newsletterForm.reset();
  });
}

const leadForm = document.querySelector("[data-lead-form]");
if (leadForm) {
  leadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = leadForm.querySelector("[data-form-status]");
    const submit = leadForm.querySelector("button[type='submit']");
    const data = Object.fromEntries(new FormData(leadForm).entries());

    if (status) status.textContent = "Sending your request...";
    if (submit) submit.disabled = true;

    try {
      const response = await fetch(leadForm.dataset.endpoint || "/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error("Request failed");
      if (status) status.textContent = leadForm.dataset.success || "Request received.";
      leadForm.reset();
    } catch (error) {
      const wa = leadForm.dataset.whatsapp;
      if (status) {
        status.innerHTML = wa
          ? `${leadForm.dataset.fallback || "Preview mode: please continue via"} <a href="https://wa.me/${wa}" target="_blank" rel="noreferrer">WhatsApp</a>.`
          : "Preview mode: webhook is not connected yet.";
      }
    } finally {
      if (submit) submit.disabled = false;
    }
  });
}
