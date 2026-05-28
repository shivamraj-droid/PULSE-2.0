/**
 * ============================================================
 *  Pulse 2.0 — 2026 Edition · Registration Backend
 *  Google Apps Script → Google Sheets
 * ============================================================
 *
 *  Save every registration as a new row in your Google Sheet.
 *  Deployment guide: see /backend/DEPLOYMENT.md
 *
 *  Sheet name expected: "Registrations"
 *  If the sheet doesn't exist or the header row is empty,
 *  this script will create them automatically.
 */

const SHEET_NAME = 'Registrations';

const HEADERS = [
  'Timestamp (Server)',
  'Timestamp (Submitted)',
  'University Name',
  'Representative Name',
  'Designation',
  'Email',
  'WhatsApp',
  'Country',
  'Selected Cities',
  'Cities Count',
  'Subtotal (USD)',
  'Discount Applied',
  'Discount Amount (USD)',
  'Total (USD)',
  'Panel Interest',
  'Nominee Name',
  'Nominee Designation',
];

/**
 * Endpoint hit by the registration form.
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet_();

    sheet.appendRow([
      new Date(),
      data.timestamp || '',
      data.university_name || '',
      data.representative_name || '',
      data.designation || '',
      data.email || '',
      data.whatsapp || '',
      data.country || '',
      data.selected_cities || '',
      data.cities_count || 0,
      data.subtotal_usd || 0,
      data.discount_applied || 'None',
      data.discount_amount_usd || 0,
      data.total_usd || 0,
      data.panel_interest || 'No',
      data.nominee_name || '',
      data.nominee_designation || '',
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Optional: simple GET handler for sanity-checking the deployment.
 * Visiting the deployed URL in a browser should return "ok".
 */
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', service: 'Pulse 2.0 Registration' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Ensure the target sheet exists with the right headers.
 */
function getOrCreateSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange
      .setFontWeight('bold')
      .setBackground('#0F172A')
      .setFontColor('#FFFFFF')
      .setVerticalAlignment('middle');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, HEADERS.length);
  }
  return sheet;
}
