/* =====================================================================
   Pulse 2.0 — 2026 Edition · Registration logic
   Vanilla JS. No dependencies.
   ===================================================================== */

/* ────────────────────────────────────────────────────────────────────
   CONFIG
   ────────────────────────────────────────────────────────────────────
   1. Deploy the Google Apps Script (see /backend/google-apps-script.gs).
   2. Copy the deployed Web App URL and paste it below.
   3. Until you set this, the form will simulate a successful submit
      (so you can preview the UX in isolation).
   ──────────────────────────────────────────────────────────────────── */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz-nuCkEIZ1VQeX_F45a6exDfzT3crKhxVPTiTNf87GXn4asQi7w-Y3DV1zOahlT38p/exec";

const DISCOUNT_THRESHOLD = 3;
const DISCOUNT_RATE = 0.10;

// Availability state, populated when the user picks a country.
// Shape: { Hyderabad: 'available', Delhi: 'waitlisted', ... }
let availabilityMap = {};
let currentCountry = '';
let availabilityFetchInFlight = null;

/* ──────────────────────────────
   DOM refs
   ────────────────────────────── */
const cityCards     = document.querySelectorAll('.city-card');
const selectedList  = document.getElementById('selected-list');
const emptyState    = document.getElementById('empty-state');
const subtotalEl    = document.getElementById('subtotal');
const discountEl    = document.getElementById('discount');
const totalEl       = document.getElementById('total');
const discountBanner= document.getElementById('discount-banner');
const discountHint  = document.getElementById('discount-hint');
const hintNeeded    = document.getElementById('hint-needed');

const panelSection  = document.getElementById('panel-section');
const panelInterest = document.querySelectorAll('input[name="panel_interest"]');
const panelDetails  = document.getElementById('panel-details');

const form          = document.getElementById('registration-form');
const submitBtn     = document.getElementById('submit-btn');
const submitLabel   = document.getElementById('submit-label');
const submitArrow   = document.getElementById('submit-arrow');
const submitSpinner = document.getElementById('submit-spinner');
const formError     = document.getElementById('form-error');
const successScreen = document.getElementById('success-screen');
const successSummary= document.getElementById('success-summary');

/* ──────────────────────────────
   Formatters
   ────────────────────────────── */
const fmt = (n) => 'USD ' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });

/* ──────────────────────────────
   City selection
   ────────────────────────────── */
cityCards.forEach((card) => {
  const checkbox = card.querySelector('.city-checkbox');
  const waitlistCta = card.querySelector('.city-waitlist-cta');

  card.addEventListener('click', (e) => {
    // Avoid double-toggle when clicking the native checkbox
    if (e.target === checkbox) return;
    e.preventDefault();

    // Waitlisted cities never enter the registration / payment flow.
    // Clicking opens the modal instead.
    if (card.classList.contains('is-waitlisted')) {
      openWaitlistModal({
        country: currentCountry,
        city: card.dataset.city,
      });
      return;
    }

    checkbox.checked = !checkbox.checked;
    card.classList.toggle('is-selected', checkbox.checked);
    updateSummary();
  });

  checkbox.addEventListener('change', () => {
    if (card.classList.contains('is-waitlisted')) {
      // Defensive: never allow waitlisted card to be checked
      checkbox.checked = false;
      return;
    }
    card.classList.toggle('is-selected', checkbox.checked);
    updateSummary();
  });

  if (waitlistCta) {
    waitlistCta.addEventListener('click', (e) => {
      e.stopPropagation();
      openWaitlistModal({
        country: currentCountry,
        city: card.dataset.city,
      });
    });
  }
});

/* ──────────────────────────────
   Live pricing summary
   ────────────────────────────── */
function getSelected() {
  return Array.from(cityCards)
    .filter((c) => c.querySelector('.city-checkbox').checked)
    .map((c) => ({
      city: c.dataset.city,
      price: parseInt(c.dataset.price, 10),
      type: c.dataset.type,
    }));
}

function updateSummary() {
  const selected = getSelected();
  const subtotal = selected.reduce((s, c) => s + c.price, 0);
  const discountApplied = selected.length >= DISCOUNT_THRESHOLD;
  const discountAmount = discountApplied ? subtotal * DISCOUNT_RATE : 0;
  const total = subtotal - discountAmount;

  // --- Selected list ---
  if (selected.length === 0) {
    selectedList.innerHTML = '';
    selectedList.appendChild(emptyState);
    emptyState.style.display = '';
  } else {
    emptyState.style.display = 'none';
    selectedList.innerHTML = selected.map((c) => `
      <div class="selected-row">
        <span class="city-label">${c.city} <span class="text-white/40">·</span> <span class="text-white/50 capitalize text-xs">${c.type}</span></span>
        <span class="city-amount">${fmt(c.price)}</span>
      </div>
    `).join('');
  }

  // --- Money fields ---
  animateNumber(subtotalEl, fmt(subtotal));

  if (discountApplied) {
    animateNumber(discountEl, '− ' + fmt(discountAmount));
    discountEl.classList.remove('text-white/50');
    discountEl.classList.add('text-brand-200');
    if (discountBanner.classList.contains('hidden')) {
      discountBanner.classList.remove('hidden');
      discountBanner.classList.add('discount-banner-enter');
      setTimeout(() => discountBanner.classList.remove('discount-banner-enter'), 560);
    }
    discountHint.classList.add('hidden');
  } else {
    animateNumber(discountEl, '— none —');
    discountEl.classList.add('text-white/50');
    discountEl.classList.remove('text-brand-200');
    discountBanner.classList.add('hidden');
    discountHint.classList.remove('hidden');
    const needed = Math.max(0, DISCOUNT_THRESHOLD - selected.length);
    hintNeeded.textContent = needed === 0 ? '3' : needed;
  }

  animateNumber(totalEl, fmt(total));

  // --- Panel section (flagship-only) ---
  const hasFlagship = selected.some((c) => c.type === 'flagship');
  panelSection.classList.toggle('hidden', !hasFlagship);
  if (!hasFlagship) {
    // Reset panel inputs
    document.querySelector('input[name="panel_interest"][value="No"]').checked = true;
    panelDetails.classList.add('hidden');
  }
}

const PREFERS_REDUCED_MOTION = window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function animateNumber(el, newText) {
  if (el.textContent === newText) return;

  const fromNum = extractNumeric(el.textContent);
  const toNum   = extractNumeric(newText);

  // If both have parseable numbers and they differ, tween between them
  if (
    fromNum !== null && toNum !== null && fromNum !== toNum &&
    !PREFERS_REDUCED_MOTION
  ) {
    el.classList.remove('pulse-update');
    void el.offsetWidth;
    el.classList.add('pulse-update');

    const duration = 650;
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);

    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      const val = Math.round(fromNum + (toNum - fromNum) * ease(t));
      el.textContent = newText.replace(/[\d,]+/, val.toLocaleString('en-US'));
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = newText;
    }
    requestAnimationFrame(step);
    return;
  }

  // Fallback for non-numeric transitions (e.g. "— none —")
  el.textContent = newText;
  el.classList.remove('pulse-update');
  void el.offsetWidth;
  el.classList.add('pulse-update');
}

function extractNumeric(text) {
  const m = String(text).match(/([\d,]+)/);
  return m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
}

/* ──────────────────────────────
   Panel interest toggle
   ────────────────────────────── */
panelInterest.forEach((radio) => {
  radio.addEventListener('change', () => {
    const showing = document.querySelector('input[name="panel_interest"]:checked').value === 'Yes';
    panelDetails.classList.toggle('hidden', !showing);
  });
});

/* ──────────────────────────────
   Form submission
   ────────────────────────────── */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.classList.add('hidden');

  const countryValue = document.getElementById('country-input').value.trim();
  if (!countryValue) {
    showError('Please select your country to continue.');
    document.querySelector('[data-country-select] .country-trigger')
      .scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const selected = getSelected();
  if (selected.length === 0) {
    showError('Please select at least one city to continue.');
    document.getElementById('cities').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  const formData = new FormData(form);
  const subtotal = selected.reduce((s, c) => s + c.price, 0);
  const discountApplied = selected.length >= DISCOUNT_THRESHOLD;
  const discountAmount = discountApplied ? subtotal * DISCOUNT_RATE : 0;
  const total = subtotal - discountAmount;

  // Final guard: scrub any waitlisted city that may have slipped into the selection
  // (shouldn't happen, but defensive — waitlisted entries MUST NOT enter payment flow)
  const safeSelected = selected.filter((c) => availabilityMap[c.city] !== 'waitlisted');
  if (safeSelected.length !== selected.length) {
    showError('One of the selected cities is currently waitlisted. Please raise a request from that city instead.');
    document.getElementById('cities').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  const payload = {
    secret: 'LEAP_GB_2026',
    type: 'register',
    timestamp: new Date().toISOString(),
    university_name: formData.get('university_name')?.trim(),
    representative_name: formData.get('representative_name')?.trim(),
    designation: formData.get('designation')?.trim(),
    email: formData.get('email')?.trim(),
    whatsapp: formData.get('whatsapp')?.trim(),
    country: formData.get('country')?.trim(),
    selected_cities: selected.map((c) => `${c.city} (${c.type}, USD ${c.price})`).join('; '),
    cities_count: selected.length,
    subtotal_usd: subtotal,
    discount_applied: discountApplied ? '10%' : 'None',
    discount_amount_usd: discountAmount,
    total_usd: total,
    panel_interest: formData.get('panel_interest') || 'No',
    nominee_name: formData.get('nominee_name')?.trim() || '',
    nominee_designation: formData.get('nominee_designation')?.trim() || '',
  };

  setSubmitting(true);

  try {
    if (APPS_SCRIPT_URL) {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow',
      });
      const json = await res.json().catch(() => ({ status: 'ok' }));

      if (json.status === 'unavailable') {
        // Server-side revalidation rejected the booking — some city filled up
        // while the user was filling the form. Re-fetch availability so badges update.
        const blocked = (json.blocked || []).join(', ');
        showError(
          blocked
            ? `These cities just reached full allocation: ${blocked}. Please reselect and try again.`
            : 'One of the selected cities is no longer available. Please reselect.'
        );
        // Refresh availability hints
        onCountryChange(currentCountry);
        return;
      }
      if (json.status && json.status !== 'ok') {
        throw new Error(json.message || 'Submission failed');
      }
    } else {
      // No backend configured — simulate latency for preview
      await new Promise((r) => setTimeout(r, 900));
      console.info('[Pulse 2.0] APPS_SCRIPT_URL not set. Submission preview:', payload);
    }

    showSuccess(payload);
  } catch (err) {
    console.error(err);
    showError('Something went wrong. Please try again or email mahafrish.doctor@geebeeworld.org');
  } finally {
    setSubmitting(false);
  }
});

function setSubmitting(loading) {
  submitBtn.disabled = loading;
  submitLabel.textContent = loading ? 'Reserving…' : 'Reserve Participation';
  submitArrow.classList.toggle('hidden', loading);
  submitSpinner.classList.toggle('hidden', !loading);
}

function showError(msg) {
  formError.textContent = msg;
  formError.classList.remove('hidden');
}

function showSuccess(payload) {
  successSummary.innerHTML = `
    <div class="text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-2 font-semibold">Registration summary</div>
    <div class="font-display text-xl font-medium tracking-tight text-ink">${escapeHtml(payload.university_name)}</div>
    <div class="text-sm text-slate-600 mt-1">${escapeHtml(payload.representative_name)} · ${escapeHtml(payload.designation)}</div>
    <div class="mt-4 pt-4 border-t border-slate-100 text-sm space-y-1 text-slate-700">
      <div><span class="text-slate-500">Cities:</span> ${payload.cities_count}</div>
      <div><span class="text-slate-500">Discount:</span> ${escapeHtml(payload.discount_applied)}</div>
      <div class="font-medium text-ink mt-1.5">Total: ${fmt(payload.total_usd)}</div>
    </div>
  `;
  successScreen.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

/* ──────────────────────────────
   Country dropdown
   ────────────────────────────── */
(function initCountryDropdown() {
  const root = document.querySelector('[data-country-select]');
  if (!root) return;

  const trigger     = root.querySelector('.country-trigger');
  const panel       = root.querySelector('.country-panel');
  const labelEl     = root.querySelector('.country-label');
  const flagEl      = root.querySelector('.country-trigger-content .country-flag');
  const hiddenInput = root.querySelector('input[name="country"]');
  const options     = Array.from(root.querySelectorAll('.country-option'));

  function open() {
    root.classList.add('is-open');
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    // Focus the selected option, or the first one
    const focusTarget = options.find((o) => o.classList.contains('is-selected')) || options[0];
    requestAnimationFrame(() => focusTarget?.focus());
  }

  function close() {
    root.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    // Defer hidden so the fade-out animation can play
    setTimeout(() => { if (!root.classList.contains('is-open')) panel.hidden = true; }, 220);
  }

  function selectOption(opt) {
    options.forEach((o) => o.classList.toggle('is-selected', o === opt));
    hiddenInput.value = opt.dataset.value;
    labelEl.textContent = opt.querySelector('span:last-child').textContent;
    flagEl.textContent = opt.dataset.flag || '';
    root.classList.add('has-value');
    // Notify the rest of the app (availability fetch)
    hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    close();
    trigger.focus();
  }

  trigger.addEventListener('click', () => {
    root.classList.contains('is-open') ? close() : open();
  });

  options.forEach((opt) => {
    opt.addEventListener('click', () => selectOption(opt));
  });

  // Outside click
  document.addEventListener('click', (e) => {
    if (!root.contains(e.target)) close();
  });

  // Keyboard
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); trigger.focus(); return; }
    if (!root.classList.contains('is-open')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const active = document.activeElement;
      const idx = options.indexOf(active);
      const next = e.key === 'ArrowDown'
        ? options[(idx + 1) % options.length]
        : options[(idx - 1 + options.length) % options.length];
      next.focus();
    }
  });
})();

/* ──────────────────────────────
   Pulse 2.0 particle wordmark
   Particles scatter, fly into position spelling "PULSE 2.0",
   then breathe subtly. Click canvas to replay.
   ────────────────────────────── */
(function initWordmark() {
  const canvas = document.getElementById('pulse-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let parts = [], raf = null, W = 0, H = 0, DPR = 1, t0 = 0;

  function build() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.width  = Math.max(1, Math.floor(canvas.clientWidth  * DPR));
    H = canvas.height = Math.max(1, Math.floor(canvas.clientHeight * DPR));
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000';
    const fs = Math.min(W / 6.1, H * 0.66);
    ctx.font = `700 ${fs}px 'Chakra Petch', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PULSE 2.0', W / 2, H / 2);

    const data = ctx.getImageData(0, 0, W, H).data;
    const step = Math.max(2, Math.round(2.1 * DPR));
    const targets = [];
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        if (data[(y * W + x) * 4 + 3] > 130) targets.push([x, y]);
      }
    }
    ctx.clearRect(0, 0, W, H);
    parts = targets.map(([tx, ty]) => ({
      x: Math.random() * W,
      y: Math.random() * H,
      tx, ty,
      hue: tx / W,
      seed: Math.random() * Math.PI * 2,
    }));
  }

  function frame(now) {
    if (!t0) t0 = now;
    const elapsed = now - t0;

    // Phase 1: assembly (0 → 1700ms): particles fly to target
    // Phase 2: handoff window (1700 → 2500ms): breathing offset ramps in via smoothstep
    // Phase 3: settled: full breathing motion
    const TRANSITION_START = 1700;
    const TRANSITION_LENGTH = 800;
    const ramp = Math.max(0, Math.min(1, (elapsed - TRANSITION_START) / TRANSITION_LENGTH));
    const breathRamp = ramp * ramp * (3 - 2 * ramp); // smoothstep ease

    ctx.clearRect(0, 0, W, H);
    const sz = 1.7 * DPR;
    const breathe = Math.sin(now * 0.0013);

    for (const p of parts) {
      const ox = Math.cos(now * 0.0011 + p.seed) * 1.1 * DPR * breathRamp;
      const oy = Math.sin(now * 0.0013 + p.seed) * 1.1 * DPR * breathRamp;
      p.x += ((p.tx + ox) - p.x) * 0.12;
      p.y += ((p.ty + oy) - p.y) * 0.12;
      // hero blue gradient: #2f5cff → #1b3aa6
      const r = 47  - p.hue * 20;   // 47 → 27
      const g = 92  - p.hue * 34;   // 92 → 58
      const b = 255 - p.hue * 89;   // 255 → 166
      const a = 0.92 + breathe * 0.07 * breathRamp;
      ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${a.toFixed(3)})`;
      ctx.fillRect(p.x, p.y, sz, sz);
    }
    raf = requestAnimationFrame(frame);
  }

  function play() {
    if (raf) cancelAnimationFrame(raf);
    build();
    for (const p of parts) { p.x = Math.random() * W; p.y = Math.random() * H; }
    t0 = 0;
    raf = requestAnimationFrame(frame);
  }

  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(play, 220); });
  canvas.addEventListener('click', play);

  // Boot once Chakra Petch is ready so the path-trace measures correctly
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => setTimeout(play, 100));
  } else {
    window.addEventListener('load', () => setTimeout(play, 250));
  }
})();

/* ──────────────────────────────
   Ambient drifting particles (hero background)
   ────────────────────────────── */
(function initAmbient() {
  const c = document.getElementById('ambient-canvas');
  if (!c) return;
  const x = c.getContext('2d');
  let w, h, dots;

  function init() {
    const rect = c.getBoundingClientRect();
    w = c.width  = Math.max(1, rect.width);
    h = c.height = Math.max(1, rect.height);
    const n = Math.min(56, Math.round(rect.width / 28));
    dots = Array.from({ length: n }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.4 + 0.5,
      vy: Math.random() * 0.18 + 0.04,
      vx: (Math.random() - 0.5) * 0.08,
      a: Math.random() * 0.22 + 0.06,
    }));
  }

  function loop() {
    x.clearRect(0, 0, w, h);
    for (const d of dots) {
      d.y += d.vy;
      d.x += d.vx;
      if (d.y > h + 5) { d.y = -5; d.x = Math.random() * w; }
      if (d.x < -5)  d.x = w + 5;
      if (d.x > w + 5) d.x = -5;
      x.beginPath();
      x.fillStyle = `rgba(47,92,255,${d.a})`;
      x.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      x.fill();
    }
    requestAnimationFrame(loop);
  }

  init();
  loop();
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(init, 200); });
})();

/* ──────────────────────────────
   Header: frosted state after scroll
   ────────────────────────────── */
(function initHeaderState() {
  const header = document.getElementById('site-header');
  if (!header) return;
  let ticking = false;

  function update() {
    if (window.scrollY > 18) header.classList.add('is-scrolled');
    else header.classList.remove('is-scrolled');
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });

  update();
})();

/* ──────────────────────────────
   Scroll progress bar
   ────────────────────────────── */
(function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  let ticking = false;

  function update() {
    const scrolled = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(scrolled / max, 1) : 0;
    bar.style.transform = `scaleX(${progress})`;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  update();
})();

/* ──────────────────────────────
   Magnetic CTA buttons
   ────────────────────────────── */
(function initMagneticButtons() {
  if (PREFERS_REDUCED_MOTION) return;
  if (window.matchMedia && window.matchMedia('(hover: none)').matches) return; // skip on touch

  const buttons = document.querySelectorAll('.cta-shimmer');
  const STRENGTH = 0.22;

  buttons.forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      btn.style.transform = `translate(${dx * STRENGTH}px, ${dy * STRENGTH}px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0, 0)';
    });
  });
})();

/* ──────────────────────────────
   Scroll-reveal animations
   ────────────────────────────── */
(function initScrollReveal() {
  const targets = document.querySelectorAll('.anim, .anim-fade, .anim-scale, .anim-stagger');
  if (!targets.length || !('IntersectionObserver' in window)) {
    // No IO support — just show everything
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.14,
    rootMargin: '0px 0px -40px 0px',
  });

  targets.forEach((el) => observer.observe(el));
})();

/* ──────────────────────────────
   City availability (Country + City)
   ────────────────────────────── */
const countryPrompt = document.getElementById('country-prompt');

// Show / hide the "select country" hint based on country state.
function setCountryPromptVisible(visible) {
  if (!countryPrompt) return;
  countryPrompt.classList.toggle('hidden', !visible);
}

// Wipe any selection of cities that are now waitlisted for the new country.
function clearWaitlistedSelections() {
  let changed = false;
  cityCards.forEach((card) => {
    if (card.classList.contains('is-waitlisted')) {
      const checkbox = card.querySelector('.city-checkbox');
      if (checkbox.checked) {
        checkbox.checked = false;
        card.classList.remove('is-selected');
        changed = true;
      }
    }
  });
  if (changed) updateSummary();
}

function clearAvailabilityBadges() {
  cityCards.forEach((card) => {
    card.classList.remove('is-waitlisted');
    const status = card.querySelector('.city-status');
    if (status) {
      status.classList.remove('is-available', 'is-waitlisted');
      status.textContent = '';
    }
  });
}

function applyAvailability(map) {
  availabilityMap = map || {};
  cityCards.forEach((card) => {
    const city = card.dataset.city;
    const status = card.querySelector('.city-status');
    const state = availabilityMap[city];

    card.classList.remove('is-waitlisted');
    if (status) {
      status.classList.remove('is-available', 'is-waitlisted');
      status.textContent = '';
    }

    if (state === 'available') {
      status.classList.add('is-available');
      status.textContent = 'Available';
    } else if (state === 'waitlisted') {
      status.classList.add('is-waitlisted');
      status.textContent = 'Waitlisted';
      card.classList.add('is-waitlisted');
    }
  });
  clearWaitlistedSelections();
}

async function fetchAvailability(country) {
  if (!country || !APPS_SCRIPT_URL) return null;
  const url = `${APPS_SCRIPT_URL}?action=availability&country=${encodeURIComponent(country)}`;
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return data.availability || {};
  } catch (err) {
    console.warn('[Pulse 2.0] availability fetch failed; continuing without badges', err);
    return null;
  }
}

async function onCountryChange(country) {
  if (country === currentCountry) return;
  currentCountry = country;

  if (!country) {
    clearAvailabilityBadges();
    setCountryPromptVisible(true);
    return;
  }

  setCountryPromptVisible(false);
  // Mark the in-flight fetch so any rapid re-selection invalidates older responses.
  const ticket = Symbol(country);
  availabilityFetchInFlight = ticket;

  const map = await fetchAvailability(country);
  if (availabilityFetchInFlight !== ticket) return; // a newer country was chosen

  if (map) applyAvailability(map);
}

// Wire to the hidden country input
const countryInput = document.getElementById('country-input');
if (countryInput) {
  countryInput.addEventListener('change', () => onCountryChange(countryInput.value));
  // initial state: no country picked yet
  setCountryPromptVisible(true);
}

/* ──────────────────────────────
   Waitlist modal
   ────────────────────────────── */
const waitlistModal      = document.getElementById('waitlist-modal');
const waitlistForm       = document.getElementById('waitlist-form');
const waitlistError      = document.getElementById('waitlist-error');
const waitlistSuccess    = document.getElementById('waitlist-success');
const waitlistSubmitBtn  = document.getElementById('waitlist-submit');
const waitlistSubmitLbl  = document.getElementById('waitlist-submit-label');
const waitlistSubmitArr  = document.getElementById('waitlist-submit-arrow');
const waitlistSubmitSpin = document.getElementById('waitlist-submit-spinner');

let waitlistLastTrigger = null;

function openWaitlistModal({ country, city }) {
  if (!waitlistModal) return;
  waitlistLastTrigger = document.activeElement;

  // Reset state
  waitlistForm.reset();
  waitlistForm.classList.remove('hidden');
  waitlistSuccess.classList.add('hidden');
  waitlistError.classList.add('hidden');

  // Pre-fill from current selections, with sensible fallbacks
  const univField  = form.querySelector('input[name="university_name"]');
  const repField   = form.querySelector('input[name="representative_name"]');
  const emailField = form.querySelector('input[name="email"]');
  const phoneField = form.querySelector('input[name="whatsapp"]');

  if (univField?.value)  waitlistForm.elements['university'].value = univField.value;
  if (repField?.value)   waitlistForm.elements['name'].value       = repField.value;
  if (emailField?.value) waitlistForm.elements['email'].value      = emailField.value;
  if (phoneField?.value) waitlistForm.elements['phone'].value      = phoneField.value;

  waitlistForm.elements['country'].value        = country || '';
  waitlistForm.elements['preferred_city'].value = city || '';

  waitlistModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Focus the first editable field
  setTimeout(() => waitlistForm.elements['name']?.focus(), 80);
}

function closeWaitlistModal() {
  if (!waitlistModal) return;
  waitlistModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (waitlistLastTrigger && typeof waitlistLastTrigger.focus === 'function') {
    waitlistLastTrigger.focus();
  }
}

if (waitlistModal) {
  // Close on backdrop / close-button / cancel-button click
  waitlistModal.addEventListener('click', (e) => {
    if (e.target.closest('[data-waitlist-close]')) closeWaitlistModal();
  });
  // Close on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && waitlistModal.getAttribute('aria-hidden') === 'false') {
      closeWaitlistModal();
    }
  });
}

function setWaitlistSubmitting(loading) {
  if (!waitlistSubmitBtn) return;
  waitlistSubmitBtn.disabled = loading;
  waitlistSubmitLbl.textContent = loading ? 'Submitting…' : 'Submit Request';
  waitlistSubmitArr?.classList.toggle('hidden', loading);
  waitlistSubmitSpin?.classList.toggle('hidden', !loading);
}

if (waitlistForm) {
  waitlistForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    waitlistError.classList.add('hidden');

    const fd = new FormData(waitlistForm);
    const payload = {
      secret: 'LEAP_GB_2026',
      type: 'waitlist',
      timestamp: new Date().toISOString(),
      name: (fd.get('name') || '').toString().trim(),
      email: (fd.get('email') || '').toString().trim(),
      phone: (fd.get('phone') || '').toString().trim(),
      university: (fd.get('university') || '').toString().trim(),
      country: (fd.get('country') || '').toString().trim(),
      preferred_city: (fd.get('preferred_city') || '').toString().trim(),
      notes: (fd.get('notes') || '').toString().trim(),
    };

    // Light client-side validation
    if (!payload.name || !payload.email || !payload.phone || !payload.university) {
      waitlistError.textContent = 'Please fill in all required fields.';
      waitlistError.classList.remove('hidden');
      return;
    }

    setWaitlistSubmitting(true);
    try {
      if (APPS_SCRIPT_URL) {
        const res = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          redirect: 'follow',
        });
        const json = await res.json().catch(() => ({ status: 'ok' }));
        if (json.status !== 'ok') throw new Error(json.message || 'Submission failed');
      } else {
        await new Promise((r) => setTimeout(r, 700));
        console.info('[Pulse 2.0] Waitlist preview (no APPS_SCRIPT_URL):', payload);
      }
      // Show success state
      waitlistForm.classList.add('hidden');
      waitlistSuccess.classList.remove('hidden');
    } catch (err) {
      console.error(err);
      waitlistError.textContent = 'Something went wrong. Please try again or email mahafrish.doctor@geebeeworld.org.';
      waitlistError.classList.remove('hidden');
    } finally {
      setWaitlistSubmitting(false);
    }
  });
}

/* ──────────────────────────────
   Initialise
   ────────────────────────────── */
updateSummary();
