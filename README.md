# Pulse 2.0 — 2026 Edition

> Premium university partner registration portal for the **Pulse 2.0** B2B study-abroad roadshow across India. Organised by **Leap GeeBee**.

A production-ready single-page registration site with live pricing, automatic multi-city discounts, conditional panel-nomination, and a zero-cost Google Sheets backend.

---

## ✦ Highlights

- **Premium B2B aesthetic** — refined blue corporate theme, editorial typography (Fraunces × Inter Tight), generous spacing.
- **Interactive city cards** with clear selection states (no checkboxes).
- **Live pricing summary** with real-time discount logic (10% off on 3+ cities).
- **Conditional panel section** — appears only when a flagship city is selected.
- **Mobile-first responsive** layout.
- **Zero backend cost** — Google Sheets + Apps Script.
- **Deployable to Vercel / Netlify / any static host** in one click.

---

## 📁 Project Structure

```
pulse-2026/
├── public/                         ← deploy this folder
│   ├── index.html                  ← main page
│   ├── styles.css                  ← custom styles (cards, animations)
│   ├── app.js                      ← form logic + pricing engine
│   └── assets/
│       └── leap-geebee-logo.png    ← replace with the real logo
│
├── backend/
│   ├── google-apps-script.gs       ← paste into Apps Script editor
│   └── DEPLOYMENT.md               ← step-by-step backend guide
│
├── vercel.json                     ← Vercel config (static deploy)
└── README.md                       ← this file
```

---

## 🚀 Quick Start

### 1. Preview locally

Any static server works. The simplest:

```bash
cd public
python3 -m http.server 8000
# open http://localhost:8000
```

Or with Node:

```bash
npx serve public
```

The form will run in **preview mode** until the backend is connected — submissions are logged to the console and the success screen renders, but nothing is saved.

### 2. Set up the backend (5 min, free)

Follow [`backend/DEPLOYMENT.md`](backend/DEPLOYMENT.md):

1. Create a Google Sheet.
2. Paste `backend/google-apps-script.gs` into Apps Script.
3. Deploy as a Web App → copy the URL.
4. Paste the URL into `public/app.js`:
   ```js
   const APPS_SCRIPT_URL = "https://script.google.com/macros/s/.../exec";
   ```

### 3. Add the logo

Drop the Leap GeeBee logo at:

```
public/assets/leap-geebee-logo.png
```

Recommended: SVG or PNG, transparent background, ~80px tall. If the file is missing, a clean text wordmark renders automatically.

---

## ☁️ Deploy to Vercel (free)

The included `vercel.json` configures the `public/` folder as the deploy root.

**Option A — CLI**
```bash
npm i -g vercel
vercel
# follow prompts; accept defaults
```

**Option B — GitHub**
1. Push this repo to GitHub.
2. Go to <https://vercel.com/new>.
3. Import the repo.
4. **Framework Preset:** `Other` · **Root Directory:** `./` · **Output Directory:** `public`.
5. Deploy.

Vercel auto-rebuilds on every push.

### Other free hosts

- **Netlify** — drag-and-drop `public/` at <https://app.netlify.com/drop>
- **Cloudflare Pages** — point at `public/` as the output directory
- **GitHub Pages** — set Pages source to `/public`

---

## ⚙️ Configuration

### Pricing logic (`public/app.js`)

```js
const DISCOUNT_THRESHOLD = 3;   // min cities for discount
const DISCOUNT_RATE      = 0.10; // 10%
```

City prices are encoded as `data-price` attributes on each `.city-card` in `index.html` — edit there to change a city's fee.

### Adding / removing cities

Each city card in `index.html` follows the same template. Copy a card, change:
- `data-city` (name)
- `data-price` (USD integer)
- `data-type` (`flagship` or `spotlight`)
- The visible date + city name inside the card.

The pricing engine picks them up automatically.

---

## 🎨 Design System

| Token | Value |
|---|---|
| Primary Blue | `#2563EB` |
| Deep Navy / Ink | `#0F172A` |
| Light Blue | `#DBEAFE` |
| Display font | Fraunces (editorial serif) |
| Body font | Inter Tight |

---

## 📨 Contact

For event partnership inquiries: **partners@leapgeebee.com**

---

Organised by **Leap GeeBee**.
