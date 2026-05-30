/* =========================================================================
   Family Recipes — app logic (vanilla JS, no build step)
   Hash router · quantity scaler · Michelin tips · Apple Notes importer
   ========================================================================= */
(function () {
  "use strict";

  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");

  /* ---------- tiny helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  // render limited markdown: **bold** and *italic*
  const md = (s) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Normalize any recipe into a list of sections, so the renderer has one shape.
  // Supports both flat {ingredients,steps} and grouped {sections:[...]}.
  function getSections(r) {
    if (Array.isArray(r.sections) && r.sections.length)
      return r.sections.map((s) => ({ name: s.name || "", ingredients: s.ingredients || [], steps: s.steps || [] }));
    return [{ name: "", ingredients: r.ingredients || [], steps: r.steps || [] }];
  }
  const allIngredients = (r) => getSections(r).flatMap((s) => s.ingredients);

  const author = (id) => AUTHORS[id] || { name: id || "Unknown", color: "#9a8d7d" };
  const category = (id) => CATEGORIES.find((c) => c.id === id) || { label: id || "Other", color: "#9a8d7d" };
  const initials = (name) => name.trim().slice(0, 1).toUpperCase();

  function toast(msg) {
    toastEl.innerHTML =
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>${esc(msg)}`;
    toastEl.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove("show"), 3200);
  }

  /* ---------- favorites / saves (localStorage, per device) ---------- */
  const FAV_KEY = "fr_favorites";
  const getFavs = () => {
    try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch { return []; }
  };
  const isFav = (id) => getFavs().includes(id);
  const toggleFav = (id) => {
    const f = getFavs();
    const i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.push(id);
    localStorage.setItem(FAV_KEY, JSON.stringify(f));
    return i < 0;
  };

  /* ---------- quantity scaling with pretty fractions ---------- */
  const FRACTIONS = [
    [1, "1"], [0.75, "¾"], [0.6667, "⅔"], [0.5, "½"], [0.3333, "⅓"], [0.25, "¼"],
    [0.2, "⅕"], [0.1667, "⅙"], [0.125, "⅛"],
  ];
  function prettyAmount(n) {
    if (n == null || isNaN(n)) return "";
    if (n === 0) return "0";
    const whole = Math.floor(n + 1e-9);
    let frac = n - whole;
    if (frac < 0.04) return String(whole); // basically whole
    // snap remainder to the nearest nice fraction
    let best = null, bestDiff = 1;
    for (const [val, glyph] of FRACTIONS) {
      const d = Math.abs(frac - val);
      if (d < bestDiff) { bestDiff = d; best = glyph; }
    }
    if (bestDiff > 0.06) {
      // no clean fraction — show a tidy decimal instead
      const r = Math.round(n * 100) / 100;
      return String(r);
    }
    if (best === "1") return String(whole + 1);
    return whole > 0 ? `${whole} ${best}` : best;
  }

  /* ============================================================
     ROUTER
     ============================================================ */
  function router() {
    const hash = location.hash.replace(/^#\/?/, "");      // "recipe/moms-shakshuka"
    const parts = hash.split("/").filter(Boolean);
    const path = parts[0] || "";
    const arg = parts[1];

    window.scrollTo(0, 0);
    if (path === "recipe") return renderRecipe(arg);
    if (path === "add") return renderAdd();
    if (path === "links") return renderLinks();
    return renderHome();
  }

  /* ============================================================
     HOME / LIBRARY
     ============================================================ */
  const homeState = { q: "", cat: "all", author: "all", favOnly: false };

  function renderHome() {
    app.innerHTML = `
      <section class="hero">
        <div class="wrap">
          <span class="eyebrow">Our shared cookbook</span>
          <h1>Everything we love to <em>cook</em>, in one beautiful place.</h1>
          <p>Save your recipes and Mom's, scale any dish up or down in a tap, and cook with Michelin-level pro tips on every page.</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#/add" data-link>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              Add a recipe
            </a>
            <a class="btn btn-ghost" href="#/links" data-link>Saved links</a>
          </div>
        </div>
      </section>

      <section class="wrap">
        <div class="toolbar">
          <div class="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input id="search" type="search" placeholder="Search recipes, ingredients…" value="${esc(homeState.q)}" aria-label="Search recipes" />
          </div>
          <div class="chips" id="catChips"></div>
          <div class="chips" id="filterChips"></div>
        </div>
        <div class="section-head">
          <h2 id="resultTitle">All recipes</h2>
          <span class="count" id="resultCount"></span>
        </div>
        <div id="results"></div>
      </section>
    `;

    // category chips
    const catChips = $("#catChips");
    catChips.innerHTML =
      `<button class="chip" data-cat="all" aria-pressed="${homeState.cat === "all"}">All</button>` +
      CATEGORIES.map((c) =>
        `<button class="chip" data-cat="${c.id}" aria-pressed="${homeState.cat === c.id}">
           <span class="dot" style="background:${c.color}"></span>${esc(c.label)}</button>`
      ).join("");

    // author + favorites filters
    const fc = $("#filterChips");
    fc.innerHTML =
      `<span class="filter-sep"></span>` +
      `<button class="chip" data-author="all" aria-pressed="${homeState.author === "all"}">Everyone</button>` +
      Object.entries(AUTHORS).map(([id, a]) =>
        `<button class="chip" data-author="${id}" aria-pressed="${homeState.author === id}">
           <span class="author-avatar" style="background:${a.color};width:18px;height:18px;font-size:10px">${initials(a.name)}</span>${esc(a.name)}'s</button>`
      ).join("") +
      `<span class="filter-sep"></span>` +
      `<button class="chip" data-fav="1" aria-pressed="${homeState.favOnly}">
         <svg viewBox="0 0 24 24" width="14" height="14" fill="${homeState.favOnly ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
         Favorites</button>`;

    // events
    $("#search").addEventListener("input", (e) => { homeState.q = e.target.value; updateResults(); });
    catChips.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cat]"); if (!b) return;
      homeState.cat = b.dataset.cat;
      catChips.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", c.dataset.cat === homeState.cat));
      updateResults();
    });
    fc.addEventListener("click", (e) => {
      const a = e.target.closest("[data-author]");
      const f = e.target.closest("[data-fav]");
      if (a) {
        homeState.author = a.dataset.author;
        fc.querySelectorAll("[data-author]").forEach((c) => c.setAttribute("aria-pressed", c.dataset.author === homeState.author));
      }
      if (f) {
        homeState.favOnly = !homeState.favOnly;
        f.setAttribute("aria-pressed", homeState.favOnly);
      }
      updateResults();
    });

    updateResults();
  }

  function filterRecipes() {
    const q = homeState.q.trim().toLowerCase();
    return RECIPES.filter((r) => {
      if (homeState.cat !== "all" && r.category !== homeState.cat) return false;
      if (homeState.author !== "all" && r.author !== homeState.author) return false;
      if (homeState.favOnly && !isFav(r.id)) return false;
      if (q) {
        const hay = (r.title + " " + r.description + " " +
          allIngredients(r).map((i) => i.item).join(" ")).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function updateResults() {
    const list = filterRecipes();
    $("#resultCount").textContent = `${list.length} recipe${list.length === 1 ? "" : "s"}`;
    const titleEl = $("#resultTitle");
    titleEl.textContent =
      homeState.favOnly ? "Favorites" :
      homeState.author !== "all" ? `${author(homeState.author).name}'s recipes` :
      homeState.cat !== "all" ? category(homeState.cat).label + "s" :
      "All recipes";

    const results = $("#results");
    if (!list.length) {
      results.innerHTML = `
        <div class="empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <h3>Nothing here yet</h3>
          <p>No recipes match your search. Try clearing filters, or add this one to the cookbook.</p>
          <a class="btn btn-primary" href="#/add" data-link>Add a recipe</a>
        </div>`;
      return;
    }
    results.innerHTML = `<div class="grid">${list.map(cardHTML).join("")}</div>`;
    results.querySelectorAll(".fav-badge").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        const on = toggleFav(b.dataset.id);
        b.classList.toggle("on", on);
        toast(on ? "Saved to favorites" : "Removed from favorites");
      })
    );
  }

  function cardHTML(r, i = 0) {
    const c = category(r.category), a = author(r.author);
    const total = (r.prepMin || 0) + (r.cookMin || 0);
    const thumb = r.image
      ? `<div class="thumb"><img src="${esc(r.image)}" alt="${esc(r.title)}" loading="lazy" /></div>`
      : `<div class="thumb placeholder"><span class="thumb-monogram">${esc(initials(r.title))}</span></div>`;
    return `
      <a class="recipe-card" href="#/recipe/${esc(r.id)}" data-link style="animation-delay:${Math.min(i * 40, 240)}ms">
        ${thumb}
        <span class="cat-tag" style="color:${c.color}">${esc(c.label)}</span>
        <button class="fav-badge ${isFav(r.id) ? "on" : ""}" data-id="${esc(r.id)}" aria-label="Toggle favorite" title="Save to favorites">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        </button>
        <div class="body">
          <h3>${esc(r.title)}</h3>
          <p class="desc">${esc(r.description)}</p>
          <div class="recipe-meta">
            <span class="author-pill" style="background:${a.color}1a;color:${a.color}">
              <span class="author-avatar" style="background:${a.color}">${initials(a.name)}</span>${esc(a.name)}
            </span>
            ${total ? `<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${total} min</span>` : ""}
          </div>
        </div>
      </a>`;
  }

  /* ============================================================
     RECIPE DETAIL  (with quantity scaler + tips)
     ============================================================ */
  function renderRecipe(id) {
    const r = RECIPES.find((x) => x.id === id);
    if (!r) { location.hash = "#/"; return; }
    const c = category(r.category), a = author(r.author);
    const base = r.servings || 1;
    const sections = getSections(r);
    const multiPhase = sections.length > 1;
    const hasConvertible = allIngredients(r).some((i) => canonUnit(i.unit));

    const media = r.image
      ? `<div class="media"><img src="${esc(r.image)}" alt="${esc(r.title)}" /></div>`
      : `<div class="media placeholder"><span class="media-monogram">${esc(initials(r.title))}</span></div>`;

    app.innerHTML = `
      <article class="detail wrap">
        <a class="back-link" href="#/" data-link>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to cookbook
        </a>

        <div class="detail-hero">
          ${media}
          <div class="intro">
            <span class="cat" style="color:${c.color}">${esc(c.label)}</span>
            <h1>${esc(r.title)}</h1>
            <p class="lede">${esc(r.description)}</p>
            <div class="detail-stats">
              ${r.prepMin ? `<div class="stat"><span class="k">Prep</span><span class="v">${r.prepMin}m</span></div>` : ""}
              ${r.cookMin ? `<div class="stat"><span class="k">Cook</span><span class="v">${r.cookMin}m</span></div>` : ""}
              <div class="stat"><span class="k">Base serves</span><span class="v">${base}</span></div>
              <div class="stat"><span class="k">By</span><span class="v" style="color:${a.color}">${esc(a.name)}</span></div>
            </div>
            <div class="detail-actions">
              <button class="btn btn-ghost" id="favBtn">
                <svg viewBox="0 0 24 24" fill="${isFav(r.id) ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M19 14c1.49-1.46 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                <span id="favLbl">${isFav(r.id) ? "Saved" : "Save"}</span>
              </button>
              <button class="btn btn-ghost" id="printBtn">Print</button>
              <div class="export-menu">
                <button class="btn btn-ghost" id="exportBtn">Export ▾</button>
                <div class="export-pop" id="exportPop" hidden>
                  <button data-exp="txt">Save as .txt</button>
                  <button data-exp="pdf">Save as PDF</button>
                  <button data-exp="copy">Copy as text</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-body">
          <aside class="scaler">
            <h3>Ingredients</h3>
            <div class="serving-control">
              <label for="servings">Serves</label>
              <div class="stepper">
                <button id="decBtn" aria-label="Fewer servings">−</button>
                <span class="val" id="servVal">${base}</span>
                <button id="incBtn" aria-label="More servings">+</button>
              </div>
            </div>
            <div class="scale-presets" id="presets">
              <button data-mult="0.5">½×</button>
              <button data-mult="1" class="active">1×</button>
              <button data-mult="2">2×</button>
              <button data-mult="3">3×</button>
            </div>
            ${hasConvertible ? `
            <div class="unit-toggle" id="unitToggle" role="group" aria-label="Measurement units">
              <button data-sys="original" class="active">As written</button>
              <button data-sys="metric">Metric</button>
              <button data-sys="imperial">US / Imperial</button>
            </div>` : ""}
            <p class="scale-note">Quantities scale automatically${hasConvertible ? " and convert between units" : ""}. Tap an ingredient to check it off.</p>
            <div class="ingredients-groups" id="ingList"></div>
          </aside>

          <div class="method">
            ${multiPhase ? `<p class="phase-hint">This recipe has ${sections.length} parts — each with its own ingredients and method.</p>` : ""}
            ${sections.map((sec, si) => `
              <section class="phase">
                ${sec.name ? `<div class="phase-head"><span class="phase-num">${si + 1}</span><h2 class="phase-title">${esc(sec.name)}</h2></div>` : `<h2 class="method-title">Method</h2>`}
                ${sec.steps.length ? `<ol class="steps">${sec.steps.map((s) => `<li><div class="step-text">${md(s)}</div></li>`).join("")}</ol>` : ""}
              </section>`).join("")}

            ${r.tips && r.tips.length ? `
            <section class="tips-section">
              <h2>Michelin pro tips</h2>
              ${r.tips.map((t) => `
                <div class="tip-card">
                  <span class="tip-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 9.2 8.6 2 9.2l5.5 4.7L5.8 21 12 17.3 18.2 21l-1.7-7.1L22 9.2l-7.2-.6L12 2Z"/></svg>
                    Chef's tip
                  </span>
                  <p>${md(t)}</p>
                </div>`).join("")}
            </section>` : ""}
          </div>
        </div>
      </article>
    `;

    // ----- scaler + converter state -----
    let servings = base;
    let unitSystem = "original";
    const ingList = $("#ingList");
    const servVal = $("#servVal");
    const presets = $("#presets");

    function fmtIng(ing, f) {
      if (ing.amount == null) return { amt: "", item: ing.item };
      const scaled = ing.amount * f;
      const conv = convertIngredient(scaled, ing.unit, unitSystem);
      const amt = `${formatMeasure(conv.amount, conv.unit)}${conv.unit ? " " + esc(conv.unit) : ""}`;
      return { amt, item: ing.item };
    }

    function renderIngredients() {
      const f = servings / base;
      ingList.innerHTML = sections.map((sec) => {
        if (!sec.ingredients.length) return "";
        const head = multiPhase && sec.name ? `<h4 class="ing-group-title">${esc(sec.name)}</h4>` : "";
        const items = sec.ingredients.map((ing) => {
          const { amt, item } = fmtIng(ing, f);
          return `<li>
            <span class="ing-check" role="checkbox" aria-checked="false" tabindex="0"></span>
            <span class="amt">${amt}</span>
            <span class="txt">${esc(item)}</span>
          </li>`;
        }).join("");
        return `<div class="ing-group">${head}<ul class="ingredients">${items}</ul></div>`;
      }).join("");

      ingList.querySelectorAll("li").forEach((li) => {
        const box = li.querySelector(".ing-check");
        const toggle = () => { li.classList.toggle("done"); box.setAttribute("aria-checked", li.classList.contains("done")); };
        box.addEventListener("click", toggle);
        box.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); } });
      });
    }
    function setServings(n) {
      servings = Math.max(1, Math.min(200, n));
      servVal.textContent = servings;
      const mult = servings / base;
      presets.querySelectorAll("button").forEach((b) =>
        b.classList.toggle("active", Math.abs(parseFloat(b.dataset.mult) - mult) < 0.01));
      renderIngredients();
    }

    $("#incBtn").addEventListener("click", () => setServings(servings + 1));
    $("#decBtn").addEventListener("click", () => setServings(servings - 1));
    presets.addEventListener("click", (e) => {
      const b = e.target.closest("[data-mult]"); if (!b) return;
      setServings(Math.max(1, Math.round(base * parseFloat(b.dataset.mult))));
    });
    const unitToggle = $("#unitToggle");
    if (unitToggle) unitToggle.addEventListener("click", (e) => {
      const b = e.target.closest("[data-sys]"); if (!b) return;
      unitSystem = b.dataset.sys;
      unitToggle.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
      renderIngredients();
    });

    $("#favBtn").addEventListener("click", () => {
      const on = toggleFav(r.id);
      $("#favBtn").querySelector("svg").setAttribute("fill", on ? "currentColor" : "none");
      $("#favLbl").textContent = on ? "Saved" : "Save";
      toast(on ? "Saved to favorites" : "Removed from favorites");
    });
    $("#printBtn").addEventListener("click", () => window.print());

    // export menu
    const exportBtn = $("#exportBtn"), exportPop = $("#exportPop");
    exportBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      exportPop.hidden = !exportPop.hidden;
      if (!exportPop.hidden) {
        const close = (ev) => { if (!exportPop.contains(ev.target) && ev.target !== exportBtn) { exportPop.hidden = true; document.removeEventListener("click", close); } };
        setTimeout(() => document.addEventListener("click", close), 0);
      }
    });
    exportPop.addEventListener("click", (e) => {
      const b = e.target.closest("[data-exp]"); if (!b) return;
      exportPop.hidden = true;
      if (b.dataset.exp === "txt") downloadText(recipeToPlainText(r), r.id + ".txt");
      else if (b.dataset.exp === "copy") copyText(recipeToPlainText(r), null, "Recipe copied — paste it into Notes");
      else if (b.dataset.exp === "pdf") exportRecipePDF(r);
    });

    setServings(base);
  }

  /* ---------- Export helpers ---------- */
  function recipeToPlainText(r) {
    const L = [];
    L.push(r.title.toUpperCase());
    if (r.description) L.push(r.description);
    L.push("");
    const meta = [];
    if (r.prepMin) meta.push(`Prep ${r.prepMin} min`);
    if (r.cookMin) meta.push(`Cook ${r.cookMin} min`);
    meta.push(`Serves ${r.servings || "—"}`);
    meta.push(`By ${author(r.author).name}`);
    L.push(meta.join("  ·  "));
    L.push("");
    getSections(r).forEach((sec) => {
      if (sec.name) { L.push(""); L.push("== " + sec.name + " =="); }
      if (sec.ingredients.length) {
        L.push("INGREDIENTS");
        sec.ingredients.forEach((i) => {
          const amt = i.amount == null ? "" : `${formatMeasure(i.amount, i.unit)}${i.unit ? " " + i.unit : ""} `;
          L.push(`  • ${amt}${i.item}`);
        });
      }
      if (sec.steps.length) {
        L.push("");
        L.push("METHOD");
        sec.steps.forEach((s, i) => L.push(`  ${i + 1}. ${s.replace(/\*/g, "")}`));
      }
    });
    if (r.tips && r.tips.length) {
      L.push("");
      L.push("MICHELIN PRO TIPS");
      r.tips.forEach((t) => L.push(`  ★ ${t.replace(/\*/g, "")}`));
    }
    L.push("");
    L.push("— from our Family Recipes cookbook —");
    return L.join("\n");
  }

  function downloadText(text, filename) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    toast("Saved " + filename);
  }

  // PDF via a print-styled popup (no library; uses the browser's "Save as PDF").
  function exportRecipePDF(r) {
    const secHTML = getSections(r).map((sec) => `
      ${sec.name ? `<h2>${esc(sec.name)}</h2>` : ""}
      ${sec.ingredients.length ? `<h3>Ingredients</h3><ul>${sec.ingredients.map((i) => {
        const amt = i.amount == null ? "" : `<b>${formatMeasure(i.amount, i.unit)}${i.unit ? " " + esc(i.unit) : ""}</b> `;
        return `<li>${amt}${esc(i.item)}</li>`;
      }).join("")}</ul>` : ""}
      ${sec.steps.length ? `<h3>Method</h3><ol>${sec.steps.map((s) => `<li>${md(s)}</li>`).join("")}</ol>` : ""}
    `).join("");
    const tipsHTML = (r.tips && r.tips.length) ? `<h2 class="tips">Michelin Pro Tips</h2><ul class="tips">${r.tips.map((t) => `<li>${md(t)}</li>`).join("")}</ul>` : "";
    const meta = [r.prepMin ? `Prep ${r.prepMin} min` : "", r.cookMin ? `Cook ${r.cookMin} min` : "", `Serves ${r.servings || "—"}`, `By ${author(r.author).name}`].filter(Boolean).join("  ·  ");
    const w = window.open("", "_blank");
    if (!w) { toast("Allow pop-ups to export PDF, or use Print"); return; }
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(r.title)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { font-family: Inter, system-ui, sans-serif; color: #2b2118; max-width: 720px; margin: 40px auto; padding: 0 28px; line-height: 1.6; }
        h1 { font-family: Fraunces, serif; font-size: 40px; margin: 0 0 6px; letter-spacing: -.02em; }
        .cat { color: #c0562f; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; font-size: 12px; }
        .desc { color: #6b5d4f; font-size: 17px; margin: 8px 0 14px; }
        .meta { font-size: 13px; color: #9a8d7d; border-top: 1px solid #e7ddcd; border-bottom: 1px solid #e7ddcd; padding: 10px 0; margin-bottom: 24px; }
        h2 { font-family: Fraunces, serif; font-size: 24px; margin: 26px 0 10px; color: #2b2118; }
        h3 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: #9a8d7d; margin: 16px 0 6px; }
        ul, ol { margin: 0 0 8px; padding-left: 22px; }
        li { margin: 4px 0; }
        ul li b { color: #c0562f; }
        h2.tips { color: #b88a3e; } ul.tips li { margin: 8px 0; }
        .foot { margin-top: 36px; color: #9a8d7d; font-size: 12px; text-align: center; }
        @media print { body { margin: 0 auto; } }
      </style></head><body>
      <div class="cat">${esc(category(r.category).label)}</div>
      <h1>${esc(r.title)}</h1>
      ${r.description ? `<div class="desc">${esc(r.description)}</div>` : ""}
      <div class="meta">${esc(meta)}</div>
      ${secHTML}
      ${tipsHTML}
      <div class="foot">— from our Family Recipes cookbook —</div>
      <script>window.onload=function(){setTimeout(function(){window.print();},400);};<\/script>
      </body></html>`);
    w.document.close();
    toast("Opening PDF — choose “Save as PDF”");
  }

  /* ============================================================
     ADD RECIPE  (manual form  +  Apple Notes import)
     ============================================================ */
  function renderAdd() {
    app.innerHTML = `
      <section class="form-page wrap">
        <a class="back-link" href="#/" data-link>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to cookbook
        </a>
        <h1>Add a recipe</h1>
        <p class="sub">The easiest way: grab the <strong>AI Prompt</strong>, run your recipe through ChatGPT/Claude, then paste the JSON back here. Or paste from Apple Notes, or fill in a form.</p>

        <div class="tabs" id="tabs">
          <button data-tab="ai" class="active">✨ AI Prompt</button>
          <button data-tab="json">Paste AI JSON</button>
          <button data-tab="import">From Apple Notes</button>
          <button data-tab="form">Fill in a form</button>
        </div>

        <div id="tabBody"></div>
      </section>
    `;
    const tabs = $("#tabs");
    const renderTab = (t) => {
      if (t === "ai") return renderAITab();
      if (t === "json") return renderJSONTab();
      if (t === "import") return renderImportTab();
      return renderFormTab();
    };
    tabs.addEventListener("click", (e) => {
      const b = e.target.closest("[data-tab]"); if (!b) return;
      tabs.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
      renderTab(b.dataset.tab);
    });
    renderAITab();
  }

  // ---------- Tab 1: AI Prompt (the headline path) ----------
  function renderAITab() {
    const body = $("#tabBody");
    body.innerHTML = `
      <div class="field"><label>Whose recipe is this? <span class="req">*</span></label>${authorPicker()}</div>
      <div class="field">
        <label for="ai-src">Your recipe <span style="color:var(--text-3);font-weight:400">(optional — you can also paste it into the AI later)</span></label>
        <p class="hint" style="margin-top:0;margin-bottom:10px">Paste your recipe however it's written — messy is fine. We'll fold it into a precise AI prompt that keeps every ingredient & step and adds spectacular Michelin pro tips.</p>
        <textarea id="ai-src" class="import-area-ta" placeholder="Paste your recipe text here (or leave blank and paste it into the AI)…"></textarea>
      </div>
      <button class="btn btn-primary btn-block" id="makePrompt">✨ Build my AI Prompt</button>
      <div id="aiOut"></div>
    `;
    wireAuthorPicker(body);
    $("#makePrompt").addEventListener("click", () => {
      const author = body.querySelector('input[name="author"]:checked').value;
      showAIPrompt($("#aiOut"), { author }, $("#ai-src").value);
    });
  }

  // ---------- Tab 2: Paste AI JSON (or any recipe JSON) ----------
  function renderJSONTab() {
    const body = $("#tabBody");
    const firebaseOn = window.FB && window.FB.enabled;
    body.innerHTML = `
      <div class="field">
        <label for="json-in">Paste the JSON from the AI <span class="req">*</span></label>
        <p class="hint" style="margin-top:0;margin-bottom:10px">Paste exactly what the AI gave you (the <code>{ … }</code> object). We'll validate it and ${firebaseOn ? "save it straight to your shared cookbook." : "turn it into a block to add to <code>data.js</code>."}</p>
        <textarea id="json-in" class="import-area-ta" placeholder='{
  "title": "…",
  "category": "main",
  "ingredients": [ { "amount": 200, "unit": "g", "item": "flour" } ],
  "steps": [ "…" ],
  "tips": [ "…" ]
}'></textarea>
      </div>
      <button class="btn btn-primary btn-block" id="loadJSON">Check &amp; preview</button>
      <div id="jsonOut"></div>
    `;
    $("#loadJSON").addEventListener("click", () => {
      const raw = $("#json-in").value.trim();
      if (!raw) { toast("Paste the JSON first"); return; }
      let obj;
      try { obj = JSON.parse(stripJSONFences(raw)); }
      catch (err) { toast("That's not valid JSON — check for stray text or a trailing comma"); return; }
      const recipe = normalizeRecipe(obj);
      const problems = validateRecipe(recipe);
      renderJSONPreview($("#jsonOut"), recipe, problems);
    });
  }

  function stripJSONFences(s) {
    let t = String(s).trim();
    t = t.replace(/^```(?:json|js|javascript)?\s*/i, "").replace(/```\s*$/, "").trim();
    // if the AI wrapped the object in prose, grab the outermost { … }
    const first = t.indexOf("{"), last = t.lastIndexOf("}");
    if (first > 0 || (last > -1 && last < t.length - 1)) {
      if (first > -1 && last > first) t = t.slice(first, last + 1);
    }
    // tolerate trailing commas before } or ] (common from JS-style output)
    t = t.replace(/,(\s*[}\]])/g, "$1");
    return t.trim();
  }

  // coerce an AI/object into our recipe shape, tidy units & amounts
  function normalizeRecipe(o) {
    const tidyIng = (i) => ({
      amount: i.amount === "" || i.amount == null ? null : Number(i.amount),
      unit: tidyUnit(i.unit || ""),
      item: String(i.item || "").trim(),
    });
    const r = {
      id: o.id ? slugify(o.id) : slugify(o.title || "recipe"),
      title: String(o.title || "Untitled").trim(),
      author: AUTHORS[o.author] ? o.author : "you",
      category: CATEGORIES.find((c) => c.id === o.category) ? o.category : "main",
      description: String(o.description || "").trim(),
      image: String(o.image || "").trim(),
      servings: parseInt(o.servings) || 4,
      prepMin: parseInt(o.prepMin) || 0,
      cookMin: parseInt(o.cookMin) || 0,
      tips: Array.isArray(o.tips) ? o.tips.map((t) => String(t).trim()).filter(Boolean) : [],
    };
    if (Array.isArray(o.sections) && o.sections.length) {
      r.sections = o.sections.map((s) => ({
        name: String(s.name || "").trim(),
        ingredients: (s.ingredients || []).map(tidyIng).filter((i) => i.item),
        steps: (s.steps || []).map((x) => String(x).trim()).filter(Boolean),
      }));
    } else {
      r.ingredients = (o.ingredients || []).map(tidyIng).filter((i) => i.item);
      r.steps = (o.steps || []).map((x) => String(x).trim()).filter(Boolean);
    }
    return r;
  }

  function validateRecipe(r) {
    const p = [];
    if (!r.title || r.title === "Untitled") p.push("Missing a title");
    const ings = allIngredients(r), steps = getSections(r).flatMap((s) => s.steps);
    if (!ings.length) p.push("No ingredients found");
    if (!steps.length) p.push("No steps found");
    return p;
  }

  function renderJSONPreview(root, recipe, problems) {
    const firebaseOn = window.FB && window.FB.enabled;
    const ings = allIngredients(recipe).length;
    const steps = getSections(recipe).flatMap((s) => s.steps).length;
    root.innerHTML = `
      <div class="import-preview">
        <h4>${problems.length ? "Almost — check these" : "Looks great ✓"}</h4>
        ${problems.length ? `<ul class="val-problems">${problems.map((p) => `<li>⚠️ ${esc(p)}</li>`).join("")}</ul>` : ""}
        <p style="margin:0 0 12px;color:var(--text-2)"><strong>${esc(recipe.title)}</strong> · ${category(recipe.category).label} · by ${author(recipe.author).name} · ${ings} ingredients · ${steps} steps · ${recipe.tips.length} tips</p>
        <div class="preview-actions">
          ${firebaseOn
            ? `<button class="btn btn-primary" id="saveFb" ${problems.length ? "disabled" : ""}>Save to cookbook</button>`
            : `<button class="btn btn-primary" id="genBlock" ${problems.length ? "disabled" : ""}>Generate block for data.js</button>`}
        </div>
      </div>
      <div id="jsonFinal"></div>`;
    const fb = $("#saveFb");
    if (fb) fb.addEventListener("click", () => saveRecipeToCloud(recipe));
    const gb = $("#genBlock");
    if (gb) gb.addEventListener("click", () => showOutput($("#jsonFinal"), recipe));
  }

  function authorPicker(selected = "you") {
    return `<div class="author-select">` +
      Object.entries(AUTHORS).map(([id, a]) => `
        <label class="author-opt ${id === selected ? "selected" : ""}" data-author="${id}">
          <input type="radio" name="author" value="${id}" ${id === selected ? "checked" : ""}>
          <span class="author-avatar" style="background:${a.color}">${initials(a.name)}</span>
          <span class="nm">${esc(a.name)}</span>
        </label>`).join("") +
      `</div>`;
  }
  function categorySelect(selected = "main") {
    return `<select id="f-category">` +
      CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === selected ? "selected" : ""}>${esc(c.label)}</option>`).join("") +
      `</select>`;
  }
  function wireAuthorPicker(root) {
    root.querySelectorAll(".author-opt").forEach((o) =>
      o.addEventListener("click", () => {
        root.querySelectorAll(".author-opt").forEach((x) => x.classList.remove("selected"));
        o.classList.add("selected");
        o.querySelector("input").checked = true;
      }));
  }

  // ---------- Manual form ----------
  function renderFormTab() {
    const body = $("#tabBody");
    body.innerHTML = `
      <div class="field"><label>Who's adding this? <span class="req">*</span></label>${authorPicker()}</div>
      <div class="field-row">
        <div class="field"><label for="f-title">Recipe name <span class="req">*</span></label>
          <input id="f-title" placeholder="e.g. Sunday Roast Chicken" /></div>
        <div class="field"><label for="f-category">Category <span class="req">*</span></label>${categorySelect()}</div>
      </div>
      <div class="field"><label for="f-desc">Short description</label>
        <textarea id="f-desc" style="min-height:80px" placeholder="A line or two that makes it sound delicious."></textarea></div>
      <div class="field-row-3">
        <div class="field"><label for="f-serv">Serves</label><input id="f-serv" type="number" min="1" value="4" /></div>
        <div class="field"><label for="f-prep">Prep (min)</label><input id="f-prep" type="number" min="0" value="10" /></div>
        <div class="field"><label for="f-cook">Cook (min)</label><input id="f-cook" type="number" min="0" value="20" /></div>
      </div>
      <div class="field"><label for="f-img">Photo URL <span style="color:var(--text-3);font-weight:400">(optional)</span></label>
        <input id="f-img" placeholder="https://… leave blank for a pretty placeholder" />
        <p class="hint">Tip: upload a photo to your GitHub repo's <code>images/</code> folder and use <code>images/your-photo.jpg</code>.</p></div>

      <div class="field"><label>Ingredients <span class="req">*</span></label>
        <p class="hint" style="margin-top:0;margin-bottom:10px">Amount · Unit · Ingredient. Leave amount blank for things like "salt to taste" — those won't scale.</p>
        <div id="ingRows"></div>
        <button type="button" class="add-row" id="addIng">＋ Add ingredient</button></div>

      <div class="field"><label>Steps <span class="req">*</span></label>
        <p class="hint" style="margin-top:0;margin-bottom:10px">One step per box. Wrap key words in **double asterisks** to bold them.</p>
        <div id="stepRows"></div>
        <button type="button" class="add-row" id="addStep">＋ Add step</button></div>

      <div class="field"><label>Michelin pro tips <span style="color:var(--text-3);font-weight:400">(optional but highly recommended)</span></label>
        <p class="hint" style="margin-top:0;margin-bottom:10px">The little secrets that make it restaurant-quality. One per box.</p>
        <div id="tipRows"></div>
        <button type="button" class="add-row" id="addTip">＋ Add a tip</button></div>

      <button class="btn btn-primary btn-block" id="genBtn" style="margin-top:8px">Generate recipe block</button>
      <div id="formOut"></div>
    `;
    wireAuthorPicker(body);

    const ingRows = $("#ingRows"), stepRows = $("#stepRows"), tipRows = $("#tipRows");
    const ingRow = (a = "", u = "", it = "") => `
      <div class="repeat-row">
        <input class="ing-amt" placeholder="2" value="${esc(a)}" style="max-width:80px" inputmode="decimal" />
        <input class="ing-unit" placeholder="cups" value="${esc(u)}" style="max-width:110px" />
        <input class="ing-item" placeholder="flour, sifted" value="${esc(it)}" />
        <button type="button" class="del" aria-label="Remove">✕</button>
      </div>`;
    const stepRow = (t = "") => `
      <div class="repeat-row">
        <textarea class="step-in" rows="2" placeholder="Describe this step…">${esc(t)}</textarea>
        <button type="button" class="del" aria-label="Remove">✕</button>
      </div>`;
    const tipRow = (t = "") => `
      <div class="repeat-row">
        <textarea class="tip-in" rows="2" placeholder="A chef's secret for this dish…">${esc(t)}</textarea>
        <button type="button" class="del" aria-label="Remove">✕</button>
      </div>`;

    ingRows.insertAdjacentHTML("beforeend", ingRow() + ingRow());
    stepRows.insertAdjacentHTML("beforeend", stepRow());
    tipRows.insertAdjacentHTML("beforeend", tipRow());

    const wireDel = (root) => root.addEventListener("click", (e) => {
      const d = e.target.closest(".del"); if (!d) return;
      if (root.querySelectorAll(".repeat-row").length > 1) d.closest(".repeat-row").remove();
    });
    [ingRows, stepRows, tipRows].forEach(wireDel);
    $("#addIng").addEventListener("click", () => ingRows.insertAdjacentHTML("beforeend", ingRow()));
    $("#addStep").addEventListener("click", () => stepRows.insertAdjacentHTML("beforeend", stepRow()));
    $("#addTip").addEventListener("click", () => tipRows.insertAdjacentHTML("beforeend", tipRow()));

    $("#genBtn").addEventListener("click", () => {
      const title = $("#f-title").value.trim();
      if (!title) { toast("Give your recipe a name first"); $("#f-title").focus(); return; }
      const ings = [...ingRows.querySelectorAll(".repeat-row")].map((row) => {
        const item = row.querySelector(".ing-item").value.trim();
        if (!item) return null;
        const rawAmt = row.querySelector(".ing-amt").value.trim();
        return { amount: rawAmt === "" ? null : parseAmount(rawAmt), unit: tidyUnit(row.querySelector(".ing-unit").value.trim()), item };
      }).filter(Boolean);
      const steps = [...stepRows.querySelectorAll(".step-in")].map((t) => t.value.trim()).filter(Boolean);
      const tips = [...tipRows.querySelectorAll(".tip-in")].map((t) => t.value.trim()).filter(Boolean);

      if (!ings.length) { toast("Add at least one ingredient"); return; }
      if (!steps.length) { toast("Add at least one step"); return; }

      const recipe = {
        id: slugify(title),
        title,
        author: body.querySelector('input[name="author"]:checked').value,
        category: $("#f-category").value,
        description: $("#f-desc").value.trim(),
        image: $("#f-img").value.trim(),
        servings: parseInt($("#f-serv").value) || 4,
        prepMin: parseInt($("#f-prep").value) || 0,
        cookMin: parseInt($("#f-cook").value) || 0,
        ingredients: ings, steps, tips,
      };
      showOutput($("#formOut"), recipe);
    });
  }

  // ---------- Apple Notes import ----------
  function renderImportTab() {
    const body = $("#tabBody");
    body.innerHTML = `
      <div class="field"><label>Who's adding this? <span class="req">*</span></label>${authorPicker()}</div>
      <div class="field-row">
        <div class="field"><label for="i-cat">Category</label>${categorySelect().replace('id="f-category"','id="i-cat"')}</div>
        <div class="field"><label for="i-serv">Serves</label><input id="i-serv" type="number" min="1" value="4" /></div>
      </div>
      <div class="field import-area">
        <label for="i-text">Paste your note <span class="req">*</span></label>
        <p class="hint" style="margin-top:0;margin-bottom:10px">In Apple Notes: select all → copy → paste here. Works with simple recipes <em>and</em> big multi-part ones (Phase 1, Phase 2…). We auto-detect the title, parts, ingredients, steps and tips.</p>
        <textarea id="i-text" placeholder="Grandma's Banana Bread

Ingredients
3 ripe bananas
2 cups flour
1 tsp baking soda
1/2 cup sugar
2 eggs

Instructions
1. Mash the bananas.
2. Mix in sugar and eggs.
3. Fold in flour and baking soda.
4. Bake at 350F for 50 minutes.

Pro Tip: don't overmix or it gets tough.

— or paste a full multi-phase recipe with 'Phase 1: …', 'Ingredients', 'The Execution', etc. —"></textarea>
      </div>
      <button class="btn btn-primary btn-block" id="parseBtn">Parse &amp; preview</button>
      <div id="importOut"></div>

      <div class="steps-howto">
        <h4>How the importer reads your note</h4>
        <ol>
          <li>The <strong>first line</strong> becomes the recipe title.</li>
          <li>Lines like <code>Phase 1: The Dough</code> or <code>For the sauce</code> become separate <strong>parts</strong>, each with its own ingredients & steps.</li>
          <li>Lines under <code>Ingredients</code> are split into amount / unit / item (it understands <code>1 1/2 cups</code>, <code>750g</code>, <code>1.8 lbs</code>, ranges like <code>2 to 3 tbsp</code>).</li>
          <li>Lines under <code>Instructions</code> / <code>Method</code> / <code>The Execution</code> — or any numbered list — become the steps.</li>
          <li><code>Pro Tip:</code> sentences inside steps are pulled out into Michelin pro tips automatically.</li>
          <li>You can edit everything in the preview — or hit <strong>✨ Generate AI prompt</strong> to have AI polish it and add more pro tips.</li>
        </ol>
      </div>
    `;
    wireAuthorPicker(body);

    $("#parseBtn").addEventListener("click", () => {
      const text = $("#i-text").value;
      if (!text.trim()) { toast("Paste your note first"); return; }
      const parsed = parseAppleNote(text);
      parsed.author = body.querySelector('input[name="author"]:checked').value;
      parsed.category = $("#i-cat").value;
      parsed.servings = parseInt($("#i-serv").value) || 4;
      renderImportPreview($("#importOut"), parsed, text);
    });
  }

  function renderImportPreview(root, p, rawText) {
    const secs = p.sections || [{ name: "", ingredients: p.ingredients || [], steps: p.steps || [] }];
    const ingCount = secs.reduce((n, s) => n + s.ingredients.length, 0);
    const stepCount = secs.reduce((n, s) => n + s.steps.length, 0);
    const secLine = secs.length > 1 ? ` · ${secs.length} parts` : "";

    const groupsPreview = secs.map((s) => `
      <div class="preview-sec">
        ${s.name ? `<h5>${esc(s.name)}</h5>` : ""}
        ${s.ingredients.length ? `<ul class="preview-ings">${s.ingredients.map((i) =>
          `<li><b>${i.amount == null ? "" : formatMeasure(i.amount, i.unit) + (i.unit ? " " + esc(i.unit) : "")}</b> ${esc(i.item)}</li>`).join("")}</ul>` : ""}
        ${s.steps.length ? `<ol class="preview-steps">${s.steps.map((st) => `<li>${esc(st)}</li>`).join("")}</ol>` : ""}
      </div>`).join("");

    root.innerHTML = `
      <div class="import-preview">
        <h4>Preview — looks good?</h4>
        <p style="margin:0 0 14px;color:var(--text-2)"><strong>${esc(p.title)}</strong> · ${ingCount} ingredients · ${stepCount} steps · ${p.tips.length} tips${secLine}</p>
        <div class="field"><label>Title</label><input id="p-title" value="${esc(p.title)}"></div>
        <div class="field"><label>Description (optional)</label><textarea id="p-desc" style="min-height:60px" placeholder="A line that makes it sound delicious">${esc(p.description || "")}</textarea></div>
        <details class="preview-detail"><summary>See parsed result (${ingCount} ingredients, ${stepCount} steps)</summary>${groupsPreview}</details>
        <div class="preview-actions">
          <button class="btn btn-primary" id="confirmImport">Generate recipe block</button>
          <button class="btn btn-ghost" id="aiPromptBtn">✨ Generate AI prompt instead</button>
        </div>
        <p class="hint" style="margin-top:10px">Tip: the <strong>AI prompt</strong> option asks an AI (ChatGPT, Claude…) to clean up the recipe <em>and add Michelin-level pro tips</em>, then hand you back a perfect block to paste.</p>
      </div>
      <div id="importFinal"></div>`;

    const finalize = () => {
      p.title = $("#p-title").value.trim() || p.title;
      p.description = $("#p-desc").value.trim();
      p.id = slugify(p.title);
      p.prepMin = p.prepMin || 0; p.cookMin = p.cookMin || 0; p.image = "";
      return p;
    };
    $("#confirmImport").addEventListener("click", () => showOutput($("#importFinal"), finalize()));
    $("#aiPromptBtn").addEventListener("click", () => showAIPrompt($("#importFinal"), finalize(), rawText || ""));
  }

  /* ---------- output: a ready-to-paste recipe object ---------- */
  function showOutput(root, recipe) {
    const code = recipeToCode(recipe);
    const noTips = !recipe.tips || !recipe.tips.length;
    root.innerHTML = `
      <div class="output-box">
        <button class="btn btn-primary copy-btn" id="copyOut">Copy</button>
        <pre id="outPre">${esc(code)}</pre>
      </div>
      <div class="steps-howto" style="margin-top:16px">
        <h4>Last step — save it to the cookbook</h4>
        <ol>
          <li>Click <strong>Copy</strong> above.</li>
          <li>Open <code>data.js</code> in your GitHub repo (pencil icon to edit).</li>
          <li>Paste the block right after <code>const RECIPES = [</code>.</li>
          <li>Commit. GitHub Pages rebuilds in a few seconds and it's live for both of you. ✨</li>
        </ol>
        <p style="margin:10px 0 0;font-size:13.5px;color:var(--text-2)">Prefer not to touch code? Just send this block to whoever manages the repo — it's everything needed.</p>
        ${noTips ? `<p style="margin:14px 0 0"><button class="btn btn-ghost" id="upgradeAI">✨ No pro tips yet? Let AI add Michelin tips</button></p>` : ""}
      </div>`;
    $("#copyOut").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(code); toast("Copied! Paste it into data.js"); }
      catch { const r = document.createRange(); r.selectNode($("#outPre")); getSelection().removeAllRanges(); getSelection().addRange(r); toast("Selected — press ⌘C to copy"); }
    });
    const up = $("#upgradeAI");
    if (up) up.addEventListener("click", () => showAIPrompt(root, recipe, ""));
    root.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function recipeToCode(r) {
    const q = (s) => '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
    const num = (n) => (n == null ? "null" : Math.round(n * 1000) / 1000);
    const ingLine = (i, pad) => `${pad}{ amount: ${num(i.amount)}, unit: ${q(i.unit || "")}, item: ${q(i.item)} },`;
    const tips = (r.tips || []).map((t) => `    ${q(t)},`).join("\n");

    // sections vs flat
    const secs = r.sections && r.sections.length
      ? r.sections
      : (r.ingredients || r.steps ? [{ name: "", ingredients: r.ingredients || [], steps: r.steps || [] }] : []);
    const useSections = secs.length > 1 || (secs[0] && secs[0].name);

    let body;
    if (useSections) {
      body = `    sections: [\n` + secs.map((s) =>
        `      {\n        name: ${q(s.name || "")},\n` +
        `        ingredients: [\n${s.ingredients.map((i) => ingLine(i, "          ")).join("\n")}\n        ],\n` +
        `        steps: [\n${s.steps.map((st) => `          ${q(st)},`).join("\n")}\n        ],\n      },`
      ).join("\n") + `\n    ],`;
    } else {
      const s0 = secs[0] || { ingredients: [], steps: [] };
      body = `    ingredients: [\n${s0.ingredients.map((i) => ingLine(i, "      ")).join("\n")}\n    ],\n` +
             `    steps: [\n${s0.steps.map((st) => `      ${q(st)},`).join("\n")}\n    ],`;
    }

    return `  {
    id: ${q(r.id)},
    title: ${q(r.title)},
    author: ${q(r.author)},
    category: ${q(r.category)},
    description: ${q(r.description || "")},
    image: ${q(r.image || "")},
    servings: ${r.servings || 4},
    prepMin: ${r.prepMin || 0},
    cookMin: ${r.cookMin || 0},
${body}
    tips: [
${tips}
    ],
  },`;
  }

  /* ---------- The master AI prompt (used by "Copy AI Prompt") ---------- */
  function buildAIPrompt(opts) {
    opts = opts || {};
    const cats = CATEGORIES.map((c) => c.id).join(", ");
    const authors = Object.entries(AUTHORS).map(([id, a]) => `"${id}" (${a.name})`).join(", ");
    const source = (opts.rawText || "").trim();
    const author = opts.author || "you";

    return `You are a Michelin-star chef and a meticulous recipe editor. Convert the recipe at the bottom into ONE JSON object for my cookbook website, exactly matching the schema. Be flawless and complete, then make the dish spectacular.

═══════════════ ABSOLUTE RULES — READ CAREFULLY ═══════════════
1. COMPLETENESS IS CRITICAL. Include EVERY single ingredient and EVERY single instruction from the source. Do not drop, merge, summarize, or skip anything — not one ingredient, not one step, not one quantity, not one temperature or time. If the source lists 23 ingredients and 18 steps, your JSON has 23 ingredients and 18 steps. Double-check your output against the source before finishing.
2. DO NOT INVENT. Never change the real quantities, ingredients, or method. Keep the cook's actual recipe intact. (Tips are the only place you add new content — see rule 7.)
3. PRESERVE DETAIL. Keep specific brands, exact temperatures, pan sizes, rest times, and visual cues ("until deep amber", "when it floats") inside the step text. Tidy grammar and typos only.
4. SPLIT EVERY INGREDIENT into { "amount": <number|null>, "unit": "<string>", "item": "<string>" }.
   • "amount" is a plain number — use 0.5 (not "1/2"), 1.5 (not "1 1/2"). Use null for "to taste"/"for garnish".
   • For a range like "2 to 3 tbsp", use the lower number (2).
   • "unit" is short and lowercase: "g","kg","mg","ml","l","tsp","tbsp","cup","oz","lb","fl oz", or "" when it's a count ("4 eggs" → amount 4, unit "").
   • Keep prep notes in "item": "garlic, finely minced".
5. MULTI-PART RECIPES. If the recipe has distinct components (e.g. dough, filling, sauce, or "Phase 1/2/3", "For the…"), output a "sections" array — one object per part, each with its own "name", "ingredients" and "steps". Put each ingredient under the part it belongs to. If it's a single simple recipe, use flat "ingredients" and "steps" instead (no "sections").
6. STEPS are clear, confident, second-person sentences. One action-stage per step. Bold the most important word or phrase in a step by wrapping it in **double asterisks**.
7. ADD 4–6 "tips" — genuine Michelin-level pro tips that make THIS specific dish extraordinary: the technique, temperature, timing, resting, seasoning, emulsion, or plating secrets a top chef would know. Make them specific to this recipe (not generic). These are what turn a home recipe into a spectacular one.
8. Choose the best "category" from: ${cats}.
9. Set "author" to ${JSON.stringify(author)} unless the recipe clearly belongs to someone else. (Valid authors: ${authors}.)
10. Estimate "servings", "prepMin", "cookMin" if the source doesn't state them.
11. "id" = kebab-case of the title. "image" = "".
12. OUTPUT ONLY valid JSON — start with { and end with }. No markdown code fences, no commentary, no trailing comma.

═══════════════ JSON SCHEMA ═══════════════
{
  "id": "kebab-case-title",
  "title": "Recipe Name",
  "author": ${JSON.stringify(author)},
  "category": "one-of-the-categories-above",
  "description": "One enticing sentence that makes someone want to cook it.",
  "image": "",
  "servings": 4,
  "prepMin": 20,
  "cookMin": 30,

  // Use EITHER this flat pair (simple recipe):
  "ingredients": [ { "amount": 200, "unit": "g", "item": "flour" }, { "amount": null, "unit": "", "item": "salt, to taste" } ],
  "steps": [ "Do the **first** thing.", "Then the next." ],

  // OR this (multi-part recipe — omit the flat pair above if you use this):
  "sections": [
    { "name": "The Dough", "ingredients": [ { "amount": 200, "unit": "g", "item": "flour" } ], "steps": [ "Knead **10 minutes**." ] },
    { "name": "The Sauce", "ingredients": [ { "amount": 400, "unit": "g", "item": "tomatoes" } ], "steps": [ "Simmer gently." ] }
  ],

  "tips": [ "A specific, recipe-relevant pro tip.", "Another secret that elevates this dish." ]
}

═══════════════ RECIPE TO CONVERT ═══════════════
${source || "(paste your recipe here — replace this line with the full recipe text, then send)"}`;
  }

  /* ---------- "Generate AI prompt" view ---------- */
  function showAIPrompt(root, recipe, rawText) {
    const prompt = buildAIPrompt({ rawText, author: recipe && recipe.author });
    const firebaseOn = window.FB && window.FB.enabled;
    root.innerHTML = `
      <div class="output-box">
        <button class="btn btn-primary copy-btn" id="copyPrompt">Copy AI Prompt</button>
        <pre id="promptPre">${esc(prompt)}</pre>
      </div>
      <div class="steps-howto" style="margin-top:16px">
        <h4>How to use this</h4>
        <ol>
          <li>Click <strong>Copy AI Prompt</strong>${rawText ? "" : ", then paste your recipe where it says <em>“paste your recipe here”</em>"}.</li>
          <li>Paste it into <strong>ChatGPT, Claude, or Gemini</strong> and send.</li>
          <li>It returns clean <strong>JSON</strong> — every ingredient & step kept, with spectacular Michelin pro tips added.</li>
          <li>Copy that JSON and ${firebaseOn
            ? `paste it into <strong>Add recipe → Paste AI JSON</strong> here on the site. It saves to your cookbook instantly. ✨`
            : `paste it after <code>const RECIPES = [</code> in <code>data.js</code> (the importer can also turn JSON into a block), then commit.`}</li>
        </ol>
      </div>`;
    $("#copyPrompt").addEventListener("click", () => copyText(prompt, $("#promptPre"), "AI Prompt copied — paste it into ChatGPT/Claude"));
    root.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // shared clipboard helper
  async function copyText(text, fallbackEl, okMsg) {
    try { await navigator.clipboard.writeText(text); toast(okMsg || "Copied"); }
    catch {
      if (fallbackEl) { const rg = document.createRange(); rg.selectNode(fallbackEl); getSelection().removeAllRanges(); getSelection().addRange(rg); }
      toast("Selected — press ⌘C to copy");
    }
  }

  /* ---------- Save a recipe to the cloud (Firebase), passcode-gated ---------- */
  async function saveRecipeToCloud(recipe) {
    if (!ensurePasscode()) return;                 // prompts for the family passcode
    const btn = $("#saveFb");
    if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }
    try {
      await window.FB.saveRecipe(recipe);
      toast("Saved to your cookbook ✨");
      setTimeout(() => { location.hash = "#/recipe/" + recipe.id; }, 500);
    } catch (err) {
      console.error(err);
      toast("Couldn't save — " + (err && err.message ? err.message : "check your connection/rules"));
      if (btn) { btn.disabled = false; btn.textContent = "Save to cookbook"; }
    }
  }

  /* ---------- Family passcode gate (per device) ---------- */
  const PASS_KEY = "fr_passcode_ok";
  function passcodeOK() { return localStorage.getItem(PASS_KEY) === "1"; }
  function ensurePasscode() {
    if (passcodeOK()) return true;
    const tries = (typeof FAMILY_PASSCODE !== "undefined") ? FAMILY_PASSCODE : "family";
    const entry = window.prompt("Enter the family passcode to add recipes:");
    if (entry == null) return false;
    if (entry.trim().toLowerCase() === String(tries).trim().toLowerCase()) {
      localStorage.setItem(PASS_KEY, "1");
      return true;
    }
    toast("That passcode didn't match");
    return false;
  }

  /* ============================================================
     Amount parsing + UNIT CONVERSION engine
     ============================================================ */
  const UNICODE_FRAC = { "½": .5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": .25, "¾": .75, "⅕": .2, "⅖": .4, "⅗": .6, "⅘": .8, "⅙": 1 / 6, "⅛": .125, "⅜": .375, "⅝": .625, "⅞": .875 };
  function parseAmount(raw) {
    if (raw == null) return null;
    let s = String(raw).trim();
    if (!s) return null;
    // range "2 to 3" / "2-3" / "1/3 to 1/2" -> use the lower number (scales cleanly)
    const range = s.match(/^(\d+\s*\/\s*\d+|\d*[½⅓⅔¼¾⅛⅜⅝⅞]|\d+[.,]\d+|\d+)\s*(?:to|–|—|-)\s*(?:\d+\s*\/\s*\d+|\d*[½⅓⅔¼¾⅛⅜⅝⅞]|\d+[.,]\d+|\d+)/i);
    if (range) s = range[1].trim();
    for (const g in UNICODE_FRAC) s = s.replace(g, " " + UNICODE_FRAC[g]);
    s = s.trim();
    let m = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)/);            // "1 1/2"
    if (m) return +m[1] + (+m[2] / +m[3]);
    m = s.match(/^(\d+)\s*\/\s*(\d+)/);                        // "1/2"
    if (m) return +m[1] / +m[2];
    m = s.match(/^(\d+)\s+(0?\.\d+)/);                         // "1 0.5" (from unicode)
    if (m) return +m[1] + +m[2];
    m = s.match(/^-?\d*[.,]?\d+/);
    return m ? parseFloat(m[0].replace(",", ".")) : null;
  }

  // canonical unit name -> { display, dim, factor-to-base }
  // dims: "mass" (base g), "vol" (base ml), or "count" (no conversion)
  const UNIT_DEFS = {
    g:    { dim: "mass", k: 1,        disp: "g" },
    kg:   { dim: "mass", k: 1000,     disp: "kg" },
    mg:   { dim: "mass", k: 0.001,    disp: "mg" },
    oz:   { dim: "mass", k: 28.3495,  disp: "oz" },
    lb:   { dim: "mass", k: 453.592,  disp: "lb" },
    ml:   { dim: "vol",  k: 1,        disp: "ml" },
    l:    { dim: "vol",  k: 1000,     disp: "L" },
    tsp:  { dim: "vol",  k: 4.92892,  disp: "tsp" },
    tbsp: { dim: "vol",  k: 14.7868,  disp: "tbsp" },
    floz: { dim: "vol",  k: 29.5735,  disp: "fl oz" },
    cup:  { dim: "vol",  k: 236.588,  disp: "cup" },
    pint: { dim: "vol",  k: 473.176,  disp: "pint" },
    quart:{ dim: "vol",  k: 946.353,  disp: "qt" },
    gallon:{dim: "vol",  k: 3785.41,  disp: "gal" },
  };
  // map all the ways people write a unit -> canonical key
  const UNIT_ALIASES = {
    g: "g", gram: "g", grams: "g", gr: "g",
    kg: "kg", kilo: "kg", kilos: "kg", kilogram: "kg", kilograms: "kg",
    mg: "mg",
    oz: "oz", ounce: "oz", ounces: "oz",
    lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
    ml: "ml", milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml",
    l: "l", liter: "l", liters: "l", litre: "l", litres: "l",
    tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp",
    tbsp: "tbsp", tbs: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
    floz: "floz", "fl oz": "floz", "fluid ounce": "floz", "fluid ounces": "floz",
    cup: "cup", cups: "cup", c: "cup",
    pint: "pint", pints: "pint", pt: "pint",
    quart: "quart", quarts: "quart", qt: "quart",
    gallon: "gallon", gallons: "gallon", gal: "gallon",
  };
  const canonUnit = (u) => {
    if (!u) return null;
    const key = String(u).toLowerCase().replace(/\.$/, "").trim();
    return UNIT_ALIASES[key] || null; // null = non-convertible (cloves, pinch, etc.)
  };

  // which system a unit already belongs to
  const SYS_OF = { g: "metric", kg: "metric", mg: "metric", ml: "metric", l: "metric",
    oz: "imperial", lb: "imperial", tsp: "imperial", tbsp: "imperial", floz: "imperial",
    cup: "imperial", pint: "imperial", quart: "imperial", gallon: "imperial" };
  // preferred ladders when picking a "nice" unit after conversion
  const METRIC_MASS = ["kg", "g"], METRIC_VOL = ["l", "ml"];
  const IMP_MASS = ["lb", "oz"], IMP_VOL = ["gallon", "quart", "pint", "cup", "tbsp", "tsp"];

  // Convert one ingredient's {amount,unit} into a target system.
  // system: "original" | "metric" | "imperial"
  function convertIngredient(amount, unit, system) {
    if (amount == null || system === "original") return { amount, unit };
    const cu = canonUnit(unit);
    if (!cu) return { amount, unit };                 // not convertible (cloves, pinch…)
    const def = UNIT_DEFS[cu];
    // already in the requested system? leave it as written, except roll metric
    // mass/volume up to kg/L when it gets large (1500 g -> 1.5 kg).
    if (SYS_OF[cu] === system) {
      if (system === "metric") {
        if (cu === "g" && amount >= 1000) return { amount: amount / 1000, unit: "kg" };
        if (cu === "ml" && amount >= 1000) return { amount: amount / 1000, unit: "L" };
      }
      return { amount, unit: UNIT_DEFS[cu].disp };
    }
    const base = amount * def.k;                      // grams or millilitres
    const wantImp = system === "imperial";
    const ladder = def.dim === "mass"
      ? (wantImp ? IMP_MASS : METRIC_MASS)
      : (wantImp ? IMP_VOL : METRIC_VOL);
    for (const key of ladder) {
      const val = base / UNIT_DEFS[key].k;
      if (val >= 1 || key === ladder[ladder.length - 1])
        return { amount: val, unit: UNIT_DEFS[key].disp };
    }
    return { amount: base / UNIT_DEFS[ladder[0]].k, unit: UNIT_DEFS[ladder[0]].disp };
  }

  // normalize a parsed unit token to its canonical display (so data looks tidy)
  function tidyUnit(u) {
    const cu = canonUnit(u);
    return cu ? UNIT_DEFS[cu].disp : (u || "");
  }

  // Format an amount the way a cook expects for THAT unit:
  //  - g / ml / mg / kcal: clean rounded numbers (no fractions)
  //  - cups / tsp / tbsp / lb etc.: nice fractions (¾, 1 ½)
  function formatMeasure(amount, unit) {
    if (amount == null || isNaN(amount)) return "";
    const cu = canonUnit(unit);
    const decimalUnit = cu && (cu === "g" || cu === "ml" || cu === "mg");
    if (decimalUnit) {
      if (amount >= 100) return String(Math.round(amount / 5) * 5);   // 816 -> 815
      if (amount >= 10)  return String(Math.round(amount));           // 47  -> 47
      return String(Math.round(amount * 10) / 10);                    // 7.4
    }
    if (cu === "kg" || cu === "l") {
      return String(Math.round(amount * 100) / 100);                  // 1.65 kg
    }
    return prettyAmount(amount);                                      // fractions
  }

  /* ============================================================
     Ingredient line parsing
     ============================================================ */
  const KNOWN_UNIT_WORDS = Object.keys(UNIT_ALIASES).filter((u) => !u.includes(" "))
    .concat(["cloves", "clove", "pinch", "pinches", "handful", "handfuls",
      "sprigs", "sprig", "cans", "can", "bunch", "bunches", "slices", "slice",
      "stick", "sticks", "head", "heads", "stalk", "stalks", "leaves", "leaf",
      "drops", "drop", "knob", "dash", "dashes"]);

  // one quantity token: "1 1/2" | "1/2" | "½" | "2.5" | "2"
  const QTY = "\\d+\\s+\\d+\\s*/\\s*\\d+|\\d+\\s*/\\s*\\d+|\\d*[½⅓⅔¼¾⅕⅖⅗⅘⅙⅛⅜⅝⅞]|\\d+[.,]\\d+|\\d+";

  function parseIngredientLine(line) {
    let s = line.replace(/^[-•*·]\s*/, "").trim();
    // leading quantity OR range ("2 to 3", "1/3 to 1/2")
    const qtyMatch = s.match(new RegExp(`^(${QTY})(?:\\s*(?:to|–|—|-)\\s*(?:${QTY}))?\\s*`));
    let amount = null, rest = s, unit = "";
    if (qtyMatch) {
      amount = parseAmount(qtyMatch[1]);
      rest = s.slice(qtyMatch[0].length).trim();
      const stripParen = (t) => t.replace(/^\((?:approx\.?|about|~)?[^)]*\)\s*/i, "");
      rest = stripParen(rest);                       // leading "(approx. 29 oz)"
      const twoWord = rest.split(/\s+/).slice(0, 2).join(" ").toLowerCase().replace(/[.,]/g, "");
      const firstWord = (rest.split(/\s+/)[0] || "").toLowerCase().replace(/[.,]/g, "");
      if (UNIT_ALIASES[twoWord]) {
        unit = tidyUnit(twoWord); rest = rest.split(/\s+/).slice(2).join(" ");
      } else if (KNOWN_UNIT_WORDS.includes(firstWord)) {
        unit = tidyUnit(rest.split(/\s+/)[0].replace(/[.,]/g, "")); rest = rest.split(/\s+/).slice(1).join(" ");
      }
      rest = stripParen(rest.trim());                // parenthetical AFTER the unit too
    }
    return { amount, unit, item: rest || s };
  }

  /* ============================================================
     Multi-phase Apple Notes / paste parser
     Handles: single recipes AND multi-phase recipes where each phase
     ("Phase 1: …", "For the sauce", etc.) has its own Ingredients +
     Execution/Steps lists. Extracts inline "Pro Tip:" lines as tips.
     Returns { title, description, sections:[{name,ingredients,steps}], tips }
     ============================================================ */
  function parseAppleNote(text) {
    const lines = text.replace(/\r/g, "").split("\n").map((l) => l.trim());

    let title = "";
    for (const l of lines) { if (l) { title = l.replace(/^#+\s*/, ""); break; } }

    const isHeading = (l, words) => {
      const t = l.toLowerCase().replace(/^#+\s*/, "").replace(/:\s*$/, "").replace(/\s/g, "");
      return words.some((w) => t === w);
    };
    // phase/section header: "Phase 1: The Dough", "For the filling", "The Sauce"
    const phaseHeader = (l) => {
      let m = l.match(/^(?:phase|part|step)\s*\d+\s*[:.\-)]\s*(.+)/i);
      if (m) return m[1].trim();
      m = l.match(/^for\s+the\s+(.+)/i);
      if (m) return cap(m[1].trim().replace(/[:.]$/, ""));
      return null;
    };
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    const sections = [];
    const tips = [];
    let cur = null;          // current section
    let mode = "head";       // head | ing | step
    let titleTaken = false;

    const ensureSection = (name) => {
      cur = { name: name || "", ingredients: [], steps: [] };
      sections.push(cur);
      return cur;
    };

    // pull "Pro Tip: …" out of a step's trailing sentence
    const extractInlineTip = (txt) => {
      const m = txt.match(/(.*?)(?:^|\s)(pro ?tip|chef'?s? ?tip|tip|note)\s*[:\-]\s*(.+)$/is);
      if (m && m[3]) { tips.push(m[3].trim()); return m[1].trim(); }
      return txt;
    };

    for (let i = 0; i < lines.length; i++) {
      let l = lines[i];
      if (!l) continue;
      if (!titleTaken && l.replace(/^#+\s*/, "") === title) { titleTaken = true; continue; }

      // standalone "(Make-Ahead Pause: …)" or notes-in-parens -> keep as a step note, skip header logic
      const ph = phaseHeader(l);
      if (ph !== null) { ensureSection(ph); mode = "head"; continue; }

      // inline tip line on its own
      const soloTip = l.match(/^(pro ?tips?|chef'?s? ?tips?|tips?|notes?)\s*[:\-]\s*(.+)/i);
      if (soloTip) { tips.push(soloTip[2].trim()); continue; }

      // "Ingredients", or "Ingredients (The Base)" with a sub-label
      const ingHead = l.match(/^#*\s*ingredients?\b\s*(?:\(([^)]+)\)|[:\-]\s*(.+))?\s*$/i);
      if (ingHead || isHeading(l, ["youneed", "shoppinglist"])) {
        const sub = ingHead && (ingHead[1] || ingHead[2]) ? (ingHead[1] || ingHead[2]).trim() : "";
        if (!cur) ensureSection("");
        // a fresh ingredients block after we already have steps, OR a sub-labelled
        // block, means a new group — start one to keep ingredient lists separate
        if (cur.steps.length || (sub && cur.ingredients.length)) {
          const base = cur.name.replace(/\s*—.*$/, "").replace(/\s*\([^)]*\)\s*$/, "");
          ensureSection(sub ? `${base} — ${sub}` : base);
        } else if (sub && cur.name) {
          cur.name = `${cur.name} — ${sub}`;
        }
        mode = "ing"; continue;
      }
      if (isHeading(l, ["theexecution", "execution", "instructions", "directions", "method", "steps", "preparation", "howto", "themakeaheadbaseexecution", "theliveemulsionplatingexecution"])
          || /execution$/i.test(l.replace(/[^a-z]/gi, "").toLowerCase())) {
        if (!cur) ensureSection("");
        mode = "step"; continue;
      }

      if (!cur) ensureSection("");

      const numbered = /^\d+[\.)]\s+/.test(l);
      const bulleted = /^[-•*·]\s+/.test(l);

      if (mode === "ing") {
        // strip leading bullet then parse
        cur.ingredients.push(parseIngredientLine(l));
      } else if (mode === "step") {
        let stepTxt = l.replace(/^\d+[\.)]\s*/, "").replace(/^[-•*·]\s*/, "").trim();
        stepTxt = extractInlineTip(stepTxt);
        if (stepTxt) cur.steps.push(stepTxt);
      } else {
        // head/unknown — guess by shape
        if (numbered) { mode = "step"; let t = extractInlineTip(l.replace(/^\d+[\.)]\s*/, "")); if (t) cur.steps.push(t); }
        else if (bulleted || /^[\d½⅓⅔¼¾]/.test(l)) { mode = "ing"; cur.ingredients.push(parseIngredientLine(l)); }
        // else: treat first stray paragraph as description
        else if (!cur.ingredients.length && !cur.steps.length && !cur.name) {
          // ignore – could be a description line; left out to keep things clean
        }
      }
    }

    // drop empty sections, tidy
    const clean = sections.filter((s) => s.ingredients.length || s.steps.length);
    if (!clean.length) clean.push({ name: "", ingredients: [], steps: [] });

    return { title: title || "Untitled recipe", description: "", sections: clean, tips };
  }

  function slugify(s) {
    return s.toLowerCase().trim()
      .replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 50) || "recipe-" + Date.now();
  }

  /* ============================================================
     SAVED LINKS board
     ============================================================ */
  const LINK_KEY = "fr_links_extra";
  const getExtraLinks = () => { try { return JSON.parse(localStorage.getItem(LINK_KEY)) || []; } catch { return []; } };

  function renderLinks() {
    const all = [...LINKS, ...getExtraLinks()];
    app.innerHTML = `
      <section class="form-page wrap" style="max-width:var(--maxw)">
        <a class="back-link" href="#/" data-link>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to cookbook
        </a>
        <h1>Saved links</h1>
        <p class="sub">Recipes from around the web you both want to try. Add one and it's saved on this device — to share it with each other for good, drop it into the <code>LINKS</code> array in <code>data.js</code>.</p>

        <div class="import-preview" style="margin-bottom:32px">
          <h4>Save a new link</h4>
          <div class="field-row"><div class="field"><label for="l-title">Title</label><input id="l-title" placeholder="Marry Me Chicken"></div>
          <div class="field"><label for="l-url">URL</label><input id="l-url" placeholder="https://…"></div></div>
          <div class="field"><label>Who's saving it?</label>${authorPicker()}</div>
          <div class="field"><label for="l-note">Note (optional)</label><input id="l-note" placeholder="Why you want to make it"></div>
          <button class="btn btn-primary" id="saveLink">Save link</button>
        </div>

        <div class="section-head"><h2>Want to make</h2><span class="count">${all.length} saved</span></div>
        <div class="links-grid" id="linksGrid"></div>
      </section>`;
    wireAuthorPicker(app);

    function paint() {
      const all = [...LINKS, ...getExtraLinks()];
      const grid = $("#linksGrid");
      if (!all.length) { grid.innerHTML = `<p style="color:var(--text-3)">No links saved yet.</p>`; return; }
      grid.innerHTML = all.map((l) => {
        const a = author(l.addedBy);
        let host = ""; try { host = new URL(l.url).hostname.replace("www.", ""); } catch { host = l.url; }
        return `<a class="link-card" href="${esc(l.url)}" target="_blank" rel="noopener">
          <span class="favicon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span>
          <span class="lk-body">
            <h4>${esc(l.title)}</h4>
            <span class="src">${esc(host)}</span>
            ${l.note ? `<div class="lk-note">“${esc(l.note)}” — <span style="color:${a.color};font-weight:600">${esc(a.name)}</span></div>` : `<div class="lk-note">Saved by <span style="color:${a.color};font-weight:600">${esc(a.name)}</span></div>`}
          </span>
        </a>`;
      }).join("");
    }
    paint();

    $("#saveLink").addEventListener("click", () => {
      const title = $("#l-title").value.trim();
      let url = $("#l-url").value.trim();
      if (!title || !url) { toast("Add a title and URL"); return; }
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;
      const link = { title, url, addedBy: app.querySelector('input[name="author"]:checked').value, note: $("#l-note").value.trim() };
      const extra = getExtraLinks(); extra.push(link);
      localStorage.setItem(LINK_KEY, JSON.stringify(extra));
      $("#l-title").value = ""; $("#l-url").value = ""; $("#l-note").value = "";
      toast("Link saved"); paint();
    });
  }

  /* ============================================================
     Theme toggle
     ============================================================ */
  const THEME_KEY = "fr_theme";
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    const icon = $("#themeIcon");
    if (t === "dark") icon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/>`;
    else icon.innerHTML = `<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>`;
  }
  (function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    applyTheme(saved);
    document.getElementById("themeToggle").addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, next); applyTheme(next);
    });
  })();

  /* ============================================================
     FIREBASE (optional live cloud storage)
     Uses the public WEB SDK + Firestore security rules. Safe for GitHub Pages.
     If firebase-config.js still has the placeholder, we stay in LOCAL mode.
     ============================================================ */
  const FB = (function () {
    const hasConfig = typeof FIREBASE_CONFIG !== "undefined" &&
      FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey &&
      !/^PASTE_/.test(FIREBASE_CONFIG.apiKey) && FIREBASE_CONFIG.projectId &&
      !/^PASTE_/.test(FIREBASE_CONFIG.projectId);

    const api = { enabled: hasConfig, ready: false, db: null };

    // Load the Firebase modular SDK from CDN, init, and start a live listener.
    api.init = async function () {
      if (!hasConfig) return;
      const v = "10.12.2";
      const appMod = await import(`https://www.gstatic.com/firebasejs/${v}/firebase-app.js`);
      const fsMod = await import(`https://www.gstatic.com/firebasejs/${v}/firebase-firestore.js`);
      const app = appMod.initializeApp(FIREBASE_CONFIG);
      const db = fsMod.getFirestore(app);
      api.db = db; api._fs = fsMod; api.ready = true;

      // Live sync: cloud recipes replace the seed list (seeds become a fallback).
      const col = fsMod.collection(db, "recipes");
      fsMod.onSnapshot(col, (snap) => {
        const cloud = [];
        snap.forEach((doc) => cloud.push(Object.assign({ id: doc.id }, doc.data())));
        // Cloud is the source of truth once connected. Keep any seed recipe
        // whose id isn't in the cloud, so the demo recipes still show until
        // you've added your own.
        const cloudIds = new Set(cloud.map((r) => r.id));
        const keptSeeds = SEED_RECIPES.filter((r) => !cloudIds.has(r.id));
        RECIPES.length = 0;
        RECIPES.push(...cloud, ...keptSeeds);
        // re-render the current view so new data appears live
        router();
      }, (err) => {
        console.warn("Firestore listen failed — staying on local recipes.", err);
      });
    };

    api.saveRecipe = async function (recipe) {
      if (!api.ready) throw new Error("Cloud not ready yet");
      const fs = api._fs;
      const id = recipe.id || (slugifyGlobal(recipe.title));
      const { id: _omit, ...data } = recipe;
      data.updatedAt = Date.now();
      await fs.setDoc(fs.doc(api.db, "recipes", id), data, { merge: true });
      // optimistic local insert in case the listener is slow
      const i = RECIPES.findIndex((r) => r.id === id);
      const withId = Object.assign({ id }, data);
      if (i >= 0) RECIPES[i] = withId; else RECIPES.unshift(withId);
      return id;
    };

    api.deleteRecipe = async function (id) {
      if (!api.ready) throw new Error("Cloud not ready yet");
      const fs = api._fs;
      await fs.deleteDoc(fs.doc(api.db, "recipes", id));
    };

    return api;
  })();
  window.FB = FB;
  // slugify is defined later in scope via hoisting of function declarations,
  // but saveRecipe may run early; alias safely.
  function slugifyGlobal(s) { return slugify(s); }

  // Keep the original seed list so cloud sync can fall back to it.
  const SEED_RECIPES = RECIPES.slice();

  /* ============================================================
     Boot
     ============================================================ */
  window.addEventListener("hashchange", router);
  window.addEventListener("DOMContentLoaded", router);
  if (document.readyState !== "loading") router();

  // Kick off Firebase (no-op if not configured). It re-renders when data arrives.
  if (FB.enabled) {
    FB.init().catch((e) => console.warn("Firebase init failed; local mode.", e));
  }

  // expose pure helpers for self-tests (harmless in production)
  window.FR = { parseAppleNote, parseAmount, parseIngredientLine, prettyAmount, slugify, convertIngredient, canonUnit, formatMeasure, normalizeRecipe, validateRecipe, buildAIPrompt };
})();
