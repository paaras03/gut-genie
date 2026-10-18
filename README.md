# Gut Genie

Personal digestive symptom, food, sleep and exercise tracker built with **Scriptable + Google Apps Script + Google Sheets**.

The iPhone UI is a Scriptable WebView, not a hosted web app. Google Sheets is the source of truth. Apps Script exposes a JSON API; daily analysis and its scheduled trigger are future work.

## Specification and setup

- [Product & Technical Specification](docs/PRODUCT-SPEC.md)
- [Initial Connection & Inspection](docs/IMPLEMENTATION-SETUP.md)
- [Project Checkpoint](docs/CHECKPOINT.md)

## Planned data store

[Gut Genie Google Spreadsheet](https://docs.google.com/spreadsheets/d/1rIQWc2thSUKHDiFOUtH9fSSkgI5hqisTrblaLVtW8jQ/edit)

The user designated this spreadsheet. Its live tabs and headers have **not yet been inspected**, and no sheet data has been changed. Inspect first; do not run schema setup blindly.

## Reference

[Recipe Tracker](https://github.com/paaras03/recipe-tracker) is the reference for the Scriptable WebView visual system, bottom navigation, Apps Script action routing, JSON API style and header-based column mapping.

## Current implementation

- Initial Apps Script API: google-apps-script/Code.gs
- Apps Script manifest: google-apps-script/appsscript.json
- Initial Scriptable dashboard: scriptable/Gut Genie.js

The API includes authenticated POST actions for health/schema inspection, safe opt-in schema setup, event logging/updates, dashboard reads, reports and hypotheses. Daily analysis is not implemented yet.

## Important limitations

- No Apps Script deployment has been created or tested.
- No Scriptable live connection has been verified.
- No ChatGPT-to-Sheets write integration is configured.
- No scheduled daily analysis trigger exists.
- Do not store real personal data until authentication and read/write behavior have been tested.
