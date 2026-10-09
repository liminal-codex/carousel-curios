# Carousel Curios website

A free, static shop site for GitHub Pages. It reads the inventory straight from the Google Sheet, so adding a row to the sheet adds an item to the site. No build step, no server, no monthly cost.

## Pages

- `index.html`: featured items, the shop grid, search and category filter
- `item.html?id=CC-0001`: one page per item, with photos, details and buy or ask buttons
- `contact.html`: contact form (pre-fills the item number when opened from an item)
- `about.html`, `shipping.html`, `returns.html`

All settings live in `assets/config.js`.

## Connect the pieces

1. **Inventory.** In the Google Sheet: File > Share > Publish to web. Choose the **Website feed** tab and **Comma-separated values (.csv)**, then Publish. Paste the link into `inventoryCsvUrl`. Only that tab is published; cost, storage and notes stay private. Changes show on the site within about 5 minutes.
2. **Contact form.** Make a free form at formspree.io (50 messages a month free) and paste its endpoint into `contactFormEndpoint`. Until then, the form opens the visitor's email app.
3. **Payments.** In Stripe, create a Payment Link for an item (Payment Links > New). Under options, limit it to 1 payment so a one-of-a-kind item can't sell twice. Paste the link into the item's **Buy link (Stripe)** cell in the sheet. Items without a link show "Ask to buy". Stripe charges only per sale (about 2.9% + 30¢), no monthly fee.
4. **Email and Instagram.** Fill in `email` and `instagram` (and `etsy`, `ebay` when those shops exist).
5. **Domain (optional).** Buy a domain (about $10–15 a year), add a `CNAME` file containing it, and point its DNS at GitHub Pages. Then update **Shop web address** on the sheet's Settings tab.

## Preview locally

```
python3 -m http.server
```

Then open http://localhost:8000. With no `inventoryCsvUrl` set, the site uses the sample data in `data/inventory.csv`.
