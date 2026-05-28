# Backend Deployment — Google Sheets + Apps Script

A zero-cost backend for the Pulse 2.0 registration form. Every submission becomes a new row in a Google Sheet.

---

## 1 · Create the Google Sheet

1. Go to <https://sheets.new> (or create a new sheet from Drive).
2. Rename the spreadsheet to **`Pulse 2.0 — Registrations`** (the name doesn't matter functionally, just for clarity).
3. The script will auto-create a tab called **`Registrations`** on first submission, so you don't need to set up columns manually.

---

## 2 · Add the Apps Script

1. In your sheet, open **Extensions → Apps Script**.
2. Delete the default `Code.gs` contents.
3. Copy the entire contents of [`google-apps-script.gs`](./google-apps-script.gs) and paste it in.
4. Click the **floppy disk** icon (or `Ctrl/Cmd + S`) to save. Name the project `Pulse 2.0 Backend`.

---

## 3 · Deploy as a Web App

1. Top right → **Deploy → New deployment**.
2. Click the **gear icon** next to "Select type" → pick **Web app**.
3. Fill in:
   - **Description:** `Pulse 2.0 Registration v1`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`  ← required for the public form to post to it
4. Click **Deploy**.
5. The first time, Google will ask for authorization:
   - Click **Authorize access**
   - Pick your Google account
   - Click **Advanced → Go to Pulse 2.0 Backend (unsafe)** (this is just because the script isn't Google-verified — it's your own script)
   - Click **Allow**
6. Copy the **Web app URL** that appears. It looks like:
   ```
   https://script.google.com/macros/s/AKfycbx.../exec
   ```

### Sanity check

Paste the URL into a browser tab. You should see:
```json
{"status":"ok","service":"Pulse 2.0 Registration"}
```

---

## 4 · Connect the Form

Open `public/app.js` and paste your URL into the config block at the top:

```js
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx.../exec";
```

That's it. Form submissions will now stream into your Google Sheet.

---

## Updating the script later

If you edit `google-apps-script.gs`, you must re-deploy:

- **Deploy → Manage deployments → ✏️ (pencil) on your deployment → Version: New version → Deploy.**
- The URL stays the same — no need to update the frontend.

---

## Sheet Schema

Headers are auto-created on first submission:

| Column | Notes |
|---|---|
| Timestamp (Server) | Set by Apps Script |
| Timestamp (Submitted) | ISO string from the browser |
| University Name | |
| Representative Name | |
| Designation | |
| Email | |
| WhatsApp | |
| Country | |
| Selected Cities | Semicolon-joined: `Hyderabad (flagship, USD 700); Delhi (flagship, USD 700); …` |
| Cities Count | |
| Subtotal (USD) | |
| Discount Applied | `10%` or `None` |
| Discount Amount (USD) | |
| Total (USD) | |
| Panel Interest | `Yes` / `No` |
| Nominee Name | |
| Nominee Designation | |

---

## Troubleshooting

**Submissions don't appear.**
- Check that "Who has access" is set to **Anyone** in the deployment settings.
- Confirm the `APPS_SCRIPT_URL` in `app.js` ends in `/exec` (not `/dev`).
- Open browser DevTools → Network → submit the form → confirm the request returns 200.

**`no-cors` mode warning in the console.**
Expected. Google Apps Script Web Apps cannot return CORS headers, so the frontend posts with `mode: 'no-cors'` and trusts the request. The data still arrives. Errors during write will be visible in the Apps Script **Executions** tab.

**See submission history in Apps Script.**
Apps Script editor → left sidebar → **Executions**. Every `doPost` run is logged with timestamps and any errors.
