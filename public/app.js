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
    discountBanner.classList.remove('hidden');
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

function animateNumber(el, newText) {
  if (el.textContent === newText) return;
  el.textContent = newText;
  el.classList.remove('pulse-update');
  // force reflow to restart animation
  void el.offsetWidth;
  el.classList.add('pulse-update');
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
    showError('Something went wrong. Please try again or email partners@leapgeebee.com');
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
    <div class="text-xs uppercase tracking-[0.18em] text-slate-400 mb-2">Registration summary</div>
    <div class="font-display text-xl text-ink">${escapeHtml(payload.university_name)}</div>
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
   Initialise
   ────────────────────────────── */
updateSummary();
