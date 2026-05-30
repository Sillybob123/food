/* =========================================================================
   Family Recipes — passcode gate
   -------------------------------------------------------------------------
   Blocks the whole site behind a passcode. The app's real scripts
   (firebase-config.js, data.js, app.js) are NOT loaded until the correct
   passcode is entered — so the recipe content isn't even rendered for a
   locked visitor.

   The passcode is stored only as a SHA-256 HASH (never in plain text here),
   so reading this file doesn't reveal the code.

   ⚠️ Honest limit: this is a static site. A client-side gate is a strong
   deterrent for a family cookbook, but it is not bank-grade security — a
   determined technical person could bypass UI gating. For true protection of
   the *data*, use Firebase Authentication (see README). For everyday privacy
   from anyone who finds the link, this does the job.

   To change the passcode: run in any JS console
     crypto.subtle.digest('SHA-256', new TextEncoder().encode('YOURCODE'))
       .then(b=>console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
   and paste the result into PASSCODE_HASH below.
   ========================================================================= */
(function () {
  "use strict";

  // SHA-256 of the access passcode. (This hash is for "1948".)
  const PASSCODE_HASH = "03b0bd366e8184f8d871c3a7c7cc26c73c25b54ff54c64b28b10b898242cdc8a";

  const UNLOCK_KEY = "fr_unlocked_v1";       // remembers unlock on this device
  const LOCK_KEY = "fr_lock_until";          // brute-force cooldown timestamp
  const MAX_TRIES = 5;                       // before a timed lockout
  const LOCK_SECONDS = 30;                   // cooldown length

  const body = document.body;
  const screen = document.getElementById("lockScreen");
  const form = document.getElementById("lockForm");
  const input = document.getElementById("lockInput");
  const btn = document.getElementById("lockBtn");
  const errEl = document.getElementById("lockError");
  const card = screen.querySelector(".lock-card");

  let tries = 0;

  async function sha256Hex(str) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // --- already unlocked on this device? open immediately ---
  if (localStorage.getItem(UNLOCK_KEY) === "1") {
    unlock(true);
    return;
  }

  // restore an in-progress lockout
  function lockedUntil() {
    const t = parseInt(localStorage.getItem(LOCK_KEY) || "0", 10);
    return t > Date.now() ? t : 0;
  }

  function showError(msg) {
    errEl.textContent = msg;
    errEl.hidden = false;
    card.classList.remove("shake");
    void card.offsetWidth;       // reflow to restart animation
    card.classList.add("shake");
  }

  function startCooldown() {
    const until = Date.now() + LOCK_SECONDS * 1000;
    localStorage.setItem(LOCK_KEY, String(until));
    tick();
  }

  let tickTimer = null;
  function tick() {
    const until = lockedUntil();
    if (!until) {
      input.disabled = false; btn.disabled = false; btn.textContent = "Unlock";
      errEl.hidden = true;
      if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
      return;
    }
    input.disabled = true; btn.disabled = true;
    const secs = Math.ceil((until - Date.now()) / 1000);
    btn.textContent = `Locked — ${secs}s`;
    errEl.textContent = "Too many attempts. Please wait.";
    errEl.hidden = false;
    if (!tickTimer) tickTimer = setInterval(tick, 500);
  }

  async function attempt(value) {
    if (lockedUntil()) { tick(); return; }
    btn.disabled = true; btn.textContent = "Checking…";
    const hash = await sha256Hex(String(value));
    if (hash === PASSCODE_HASH) {
      // success — remember and also satisfy the app's add/edit passcode gate
      localStorage.setItem(UNLOCK_KEY, "1");
      localStorage.setItem("fr_passcode_ok", "1");
      localStorage.removeItem(LOCK_KEY);
      unlock(false);
    } else {
      tries++;
      btn.disabled = false; btn.textContent = "Unlock";
      input.value = "";
      input.focus();
      if (tries >= MAX_TRIES) { tries = 0; startCooldown(); }
      else showError(`Incorrect passcode. ${MAX_TRIES - tries} attempt${MAX_TRIES - tries === 1 ? "" : "s"} left.`);
    }
  }

  // --- reveal the site and load the real app scripts ---
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.body.appendChild(s);
    });
  }

  let appLoaded = false;
  async function unlock(instant) {
    body.classList.remove("locked");
    const site = document.getElementById("site");
    if (site) site.setAttribute("aria-hidden", "false");
    if (screen) {
      if (instant) screen.remove();
      else { screen.classList.add("opening"); setTimeout(() => screen.remove(), 450); }
    }
    if (!appLoaded) {
      appLoaded = true;
      // load app scripts in order, only now that we're unlocked
      try {
        await loadScript("firebase-config.js");
        await loadScript("data.js");
        await loadScript("app.js");
      } catch (e) {
        console.error("Failed to load app scripts", e);
      }
    }
  }

  // wire up the form
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = input.value.trim();
      if (!v) { showError("Enter the passcode."); return; }
      attempt(v);
    });
    setTimeout(() => input && input.focus(), 100);
    tick(); // in case a cooldown is active from a previous session
  }
})();
