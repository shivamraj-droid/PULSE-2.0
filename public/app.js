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
  card.addEventListener('click', (e) => {
    // Avoid double-toggle when clicking the native checkbox
    if (e.target === checkbox) return;
    e.preventDefault();
    checkbox.checked = !checkbox.checked;
    card.classList.toggle('is-selected', checkbox.checked);
    updateSummary();
  });
  checkbox.addEventListener('change', () => {
    card.classList.toggle('is-selected', checkbox.checked);
    updateSummary();
  });
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

  const payload = {
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
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Apps Script web apps require this when posting JSON
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
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
   Initialise
   ────────────────────────────── */
updateSummary();
