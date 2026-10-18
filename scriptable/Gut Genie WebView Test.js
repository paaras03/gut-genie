// Gut Genie WebView Diagnostic
// This test intentionally makes no network requests and reads no Keychain values.
// If this page does not appear, the problem is outside the Gut Genie dashboard/API code.

const web = new WebView();
await web.loadHTML(`<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font: -apple-system-body; padding: 28px; line-height: 1.5; }
    h1 { font-size: 28px; }
    .status { padding: 16px; border: 1px solid #888; border-radius: 12px; }
  </style>
</head>
<body>
  <h1>Gut Genie diagnostic</h1>
  <div class="status">PASS — Scriptable opened this WebView successfully.</div>
  <p>This test does not connect to Google Apps Script or access your data.</p>
</body>
</html>`);
await web.present();
Script.complete();
