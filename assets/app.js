(function () {
  const S = window.SHOP;
  const page = document.body.dataset.page;

  // ---------- shared header and footer ----------
  const links = [
    ["index.html", "Shop", "shop"],
    ["about.html", "About", "about"],
    ["shipping.html", "Shipping", "shipping"],
    ["contact.html", "Contact", "contact"],
  ];
  const header = document.querySelector(".site-header");
  if (header) {
    header.innerHTML = `
      <div class="wrap">
        <a class="brand" href="index.html"><img src="assets/logo.png" alt=""><span>${S.name}</span></a>
        <button class="menu-btn" aria-expanded="false" aria-controls="nav">Menu</button>
        <nav class="nav" id="nav">
          ${links.map(([href, label, key]) => `<a href="${href}"${key === page ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
        </nav>
      </div>`;
    const btn = header.querySelector(".menu-btn");
    const nav = header.querySelector(".nav");
    btn.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open);
    });
  }
  const footer = document.querySelector(".site-footer");
  if (footer) {
    const social = [["Instagram", S.instagram], ["Etsy", S.etsy], ["eBay", S.ebay]].filter(([, u]) => u);
    footer.innerHTML = `
      <div class="wrap">
        <div>© ${new Date().getFullYear()} ${S.name}</div>
        <nav>
          <a href="index.html">Shop</a><a href="about.html">About</a><a href="shipping.html">Shipping</a>
          <a href="returns.html">Returns</a><a href="contact.html">Contact</a>
          ${social.map(([l, u]) => `<a href="${u}" target="_blank" rel="noopener">${l}</a>`).join("")}
          <a href="mailto:${S.email}">${S.email}</a>
        </nav>
      </div>`;
  }

  // ---------- inventory ----------
  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') q = false;
        else field += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); rows.push(row); row = []; field = "";
      } else field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    const head = rows.shift().map((h) => h.trim().toLowerCase());
    return rows
      .filter((r) => r.some((v) => v.trim()))
      .map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()])));
  }

  async function loadItems() {
    const urls = [S.inventoryCsvUrl, "data/inventory.csv"].filter(Boolean);
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: "no-cache" });
        if (!res.ok) continue;
        return parseCSV(await res.text())
          .filter((it) => it.id && it.status && it.status !== "Draft" && it.status !== "Hidden")
          .map((it) => ({ ...it, photos: [it.photo1, it.photo2, it.photo3].filter(Boolean) }));
      } catch (e) { /* try the next source */ }
    }
    return [];
  }

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => (n === "" || isNaN(+n) ? "" : new Intl.NumberFormat("en-US", { style: "currency", currency: S.currency }).format(+n));
  const byline = (it) => [it.author, it.year].filter(Boolean).join(", ");

  function card(it) {
    const sold = it.status === "Sold";
    const tag = sold ? "Sold" : it.status === "Reserved" ? "On hold" : "";
    return `
      <a class="card${sold ? " sold" : ""}" href="item.html?id=${encodeURIComponent(it.id)}">
        <div class="ph">
          ${it.photos[0] ? `<img src="${esc(it.photos[0])}" alt="${esc(it.title)}" loading="lazy">` : ""}
          ${tag ? `<span class="tag">${tag}</span>` : ""}
        </div>
        <h3>${esc(it.title)}</h3>
        <div class="meta">${esc(byline(it))}</div>
        <div class="price">${sold ? "Sold" : money(it.price)}</div>
      </a>`;
  }

  // ---------- shop page ----------
  async function shop() {
    const items = await loadItems();
    const featured = items.filter((it) => it.featured === "Yes" && it.status === "Available");
    const fEl = document.getElementById("featured");
    if (fEl) {
      fEl.closest("section").hidden = !featured.length;
      fEl.innerHTML = featured.slice(0, 4).map(card).join("");
    }

    const grid = document.getElementById("grid");
    const search = document.getElementById("search");
    const cat = document.getElementById("category");
    const show = document.getElementById("show");
    const cats = [...new Set(items.map((it) => it.category).filter(Boolean))].sort();
    cat.innerHTML = `<option value="">All categories</option>` + cats.map((c) => `<option>${esc(c)}</option>`).join("");
    const params = new URLSearchParams(location.search);
    if (params.get("category")) cat.value = params.get("category");

    function render() {
      const q = search.value.trim().toLowerCase();
      const list = items
        .filter((it) => !cat.value || it.category === cat.value)
        .filter((it) => show.value === "all" || it.status !== "Sold")
        .filter((it) => !q || [it.title, it.author, it.publisher, it.tags, it.subcategory, it.description].join(" ").toLowerCase().includes(q))
        .sort((a, b) => (a.status === "Sold") - (b.status === "Sold"));
      grid.innerHTML = list.length ? list.map(card).join("") : `<p class="empty">Nothing here yet. New finds are added often.</p>`;
    }
    [search, cat, show].forEach((el) => el.addEventListener("input", render));
    render();
  }

  // ---------- item page ----------
  async function item() {
    const id = new URLSearchParams(location.search).get("id");
    const items = await loadItems();
    const it = items.find((x) => x.id === id);
    const root = document.getElementById("item");
    if (!it) {
      root.innerHTML = `<div class="prose"><h1>Item not found</h1><p>It may have sold or been removed. <a href="index.html">Back to the shop</a>.</p></div>`;
      return;
    }
    document.title = `${it.title} | ${S.name}`;
    const sold = it.status === "Sold";
    const held = it.status === "Reserved";
    const facts = [
      ["Author / Artist", it.author], ["Publisher", it.publisher], ["Year", it.year], ["Edition", it.edition],
      ["Format", it.format], ["Dimensions", it.dimensions], ["Condition", it.condition], ["Item number", it.id],
    ].filter(([, v]) => v);
    const ask = `contact.html?item=${encodeURIComponent(it.id)}`;
    let buy;
    if (sold) buy = `<button class="btn" disabled>Sold</button>`;
    else if (held) buy = `<button class="btn" disabled>On hold</button>`;
    else if (it.buy_link) buy = `<a class="btn" href="${esc(it.buy_link)}">Buy now</a>`;
    else buy = `<a class="btn" href="${ask}">Ask to buy</a>`;

    root.innerHTML = `
      <p class="crumbs"><a href="index.html">Shop</a> / <a href="index.html?category=${encodeURIComponent(it.category)}">${esc(it.category)}</a></p>
      <div class="item">
        <div class="gallery">
          <div class="main">${it.photos[0] ? `<img id="main-img" src="${esc(it.photos[0])}" alt="${esc(it.title)}">` : ""}</div>
          ${it.photos.length > 1 ? `<div class="thumbs">${it.photos.map((p, i) => `<button data-src="${esc(p)}" aria-current="${i === 0}" aria-label="Photo ${i + 1}"><img src="${esc(p)}" alt=""></button>`).join("")}</div>` : ""}
        </div>
        <div>
          <p class="eyebrow">${esc(it.subcategory || it.category)}</p>
          <h1>${esc(it.title)}</h1>
          <div class="small">${esc(byline(it))}</div>
          <div class="price">${sold ? "Sold" : money(it.price)}</div>
          <p class="desc">${esc(it.description)}</p>
          <div class="actions">
            ${buy}
            ${sold ? "" : `<a class="btn ghost" href="${ask}">Ask a question</a>`}
          </div>
          <p class="small" style="margin-top:14px">One of a kind. Ships within 3 business days. <a href="shipping.html">Shipping</a> · <a href="returns.html">Returns</a></p>
          <dl class="details">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        </div>
      </div>`;

    root.querySelectorAll(".thumbs button").forEach((b) =>
      b.addEventListener("click", () => {
        document.getElementById("main-img").src = b.dataset.src;
        root.querySelectorAll(".thumbs button").forEach((x) => x.setAttribute("aria-current", x === b));
      })
    );

    // Structured data so search engines can show price and availability
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": "Product", name: it.title, sku: it.id,
      description: it.description, image: it.photos, brand: { "@type": "Brand", name: S.name },
      offers: {
        "@type": "Offer", price: it.price, priceCurrency: S.currency,
        availability: sold ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
        itemCondition: "https://schema.org/UsedCondition",
      },
    });
    document.head.appendChild(ld);
  }

  // ---------- contact page ----------
  function contact() {
    const form = document.querySelector("form.contact");
    const itemId = new URLSearchParams(location.search).get("item");
    const msg = form.querySelector("[name=message]");
    if (itemId) {
      form.querySelector("[name=item]").value = itemId;
      msg.value = `Hi, I'm interested in item ${itemId}. `;
    }
    if (S.instagram) {
      const ig = document.getElementById("ig");
      ig.hidden = false;
      ig.querySelector("a").href = S.instagram;
    }
    document.getElementById("mail").href = `mailto:${S.email}`;
    document.getElementById("mail").textContent = S.email;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      if (data.get("_gotcha")) return; // spam bot
      const status = document.getElementById("status");
      if (!S.contactFormEndpoint) {
        const body = `${data.get("message")}\n\nFrom: ${data.get("name")} <${data.get("email")}>`;
        location.href = `mailto:${S.email}?subject=${encodeURIComponent(itemId ? `Question about ${itemId}` : "Hello from the website")}&body=${encodeURIComponent(body)}`;
        return;
      }
      const btn = form.querySelector("button");
      btn.disabled = true;
      try {
        const res = await fetch(S.contactFormEndpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error();
        form.reset();
        status.textContent = "Thank you. Your message is on its way and I'll reply soon.";
      } catch {
        status.textContent = `Sorry, that didn't send. Please email ${S.email} instead.`;
      }
      status.hidden = false;
      btn.disabled = false;
    });
  }

  ({ shop, item, contact }[page] || (() => {}))();
})();
