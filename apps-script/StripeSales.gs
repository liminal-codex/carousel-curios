/**
 * Carousel Curios: mark items Sold when they're paid for through Stripe.
 *
 * Every 10 minutes this asks Stripe for new completed checkouts. When one came
 * from an item's Payment Link, the matching Inventory row (found by its
 * "Buy link (Stripe)" cell) is set to Status Sold, Quantity 0, Sold on
 * "Website" and today's Date sold. The website and Instagram feed
 * then update on their own.
 *
 * It only reads from Stripe and never changes anything there. It's free:
 * Apps Script triggers cost nothing at this volume.
 *
 * Install (once, after the Stripe account exists):
 * 1. In Stripe, Developers > API keys > Create restricted key. Give it Read
 *    access to "Checkout Sessions" and "Payment Links" only. Copy the key
 *    (it starts with rk_live_).
 * 2. In the sheet, Extensions > Apps Script. Click + next to Files > Script,
 *    name it StripeSales, paste this file in and Save.
 * 3. Project Settings (gear icon) > Script properties > Add property:
 *    STRIPE_KEY = the key from step 1. Save.
 * 4. Back in the editor, pick setupStripeSync in the function list and click
 *    Run. Allow the permissions it asks for. It checks the key and turns on
 *    the 10 minute check.
 * To turn it off, run stopStripeSync.
 */

const STRIPE_COLS = { status: 2, quantity: 7, buyLink: 23, soldOn: 24, dateSold: 30 }; // B, G, W, X, AD

function setupStripeSync() {
  stripeGet_('/v1/payment_links?limit=1'); // fails loudly if the key is missing or wrong
  stopStripeSync();
  ScriptApp.newTrigger('syncStripeSales').timeBased().everyMinutes(10).create();
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('STRIPE_SINCE')) {
    props.setProperty('STRIPE_SINCE', String(Math.floor(Date.now() / 1000) - 7 * 24 * 3600));
  }
  syncStripeSales();
}

function stopStripeSync() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'syncStripeSales')
    .forEach((t) => ScriptApp.deleteTrigger(t));
}

function syncStripeSales() {
  const props = PropertiesService.getScriptProperties();
  const since = Number(props.getProperty('STRIPE_SINCE') || 0);
  let newest = since;
  const linkUrls = {}; // payment link id -> url
  const soldUrls = [];

  let after = '';
  for (let page = 0; page < 10; page++) {
    const res = stripeGet_('/v1/checkout/sessions?limit=100&status=complete&created[gt]=' + since + (after ? '&starting_after=' + after : ''));
    res.data.forEach((s) => {
      newest = Math.max(newest, s.created);
      if (!s.payment_link || s.payment_status !== 'paid') return;
      if (!linkUrls[s.payment_link]) linkUrls[s.payment_link] = stripeGet_('/v1/payment_links/' + s.payment_link).url;
      soldUrls.push(linkUrls[s.payment_link]);
    });
    if (!res.has_more || !res.data.length) break;
    after = res.data[res.data.length - 1].id;
  }

  if (soldUrls.length) markSold_(soldUrls);
  props.setProperty('STRIPE_SINCE', String(newest));
}

function markSold_(urls) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Inventory');
  const last = sheet.getLastRow();
  if (last < 2) return;
  const links = sheet.getRange(2, STRIPE_COLS.buyLink, last - 1, 1).getValues().flat().map((v) => String(v).trim());
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  urls.forEach((url) => {
    const i = links.indexOf(String(url).trim());
    if (i < 0) return;
    const row = i + 2;
    if (sheet.getRange(row, STRIPE_COLS.status).getValue() === 'Sold') return;
    sheet.getRange(row, STRIPE_COLS.status).setValue('Sold');
    sheet.getRange(row, STRIPE_COLS.quantity).setValue(0);
    sheet.getRange(row, STRIPE_COLS.soldOn).setValue('Website');
    sheet.getRange(row, STRIPE_COLS.dateSold).setValue(today);
  });
}

function stripeGet_(path) {
  const key = PropertiesService.getScriptProperties().getProperty('STRIPE_KEY');
  if (!key) throw new Error('Add the STRIPE_KEY script property first (see the notes at the top of this file).');
  const res = UrlFetchApp.fetch('https://api.stripe.com' + path, {
    headers: { Authorization: 'Bearer ' + key },
    muteHttpExceptions: true,
  });
  const body = JSON.parse(res.getContentText());
  if (res.getResponseCode() !== 200) throw new Error('Stripe: ' + (body.error && body.error.message));
  return body;
}
