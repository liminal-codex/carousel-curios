// Shop settings. This is the only file you need to edit to connect services.
window.SHOP = {
  name: "Carousel Curios",
  tagline: "Rare books, art, vintage clothing and curious things.",

  // Google Sheet > File > Share > Publish to web > "Website feed" tab > CSV.
  // Paste the link here. Until then the site shows the sample data in data/inventory.csv.
  inventoryCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS4bQ9TezALN_AoVj2sd4ZkHU1Pw7xJ6CIlyu43PnU4KO86BpVRZz3a9rYLxXN8yBdbjc5OS5qn6IOc/pub?gid=104&single=true&output=csv",

  // Free form inbox from formspree.io (or web3forms.com). Leave blank to fall back to email.
  contactFormEndpoint: "",

  email: "hello@carouselcurios.com",
  instagram: "", // e.g. "https://instagram.com/carouselcurios"
  etsy: "",
  ebay: "",

  currency: "USD",
};
