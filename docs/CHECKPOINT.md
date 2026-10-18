# Gut Genie — Project Checkpoint

**Status date:** 2026-10-18  
**Phase:** 1 — initial API and Scriptable scaffolds committed; live spreadsheet inspection still pending

## Completed in GitHub

- Read the Recipe Tracker implementation and key documentation for Scriptable WebView UI, visual style, API calls, Apps Script routing, header-based sheet access and deployment rules.
- Added the product/technical specification.
- Added the Apps Script API scaffold at google-apps-script/Code.gs.
- Added Apps Script manifest at google-apps-script/appsscript.json.
- Added Scriptable UI scaffold at scriptable/Gut Genie.js, using Recipe Tracker's warm neutral palette, cards and persistent bottom navigation.
- Added manual connection/inspection steps at docs/IMPLEMENTATION-SETUP.md.
- Designated the user's spreadsheet: https://docs.google.com/spreadsheets/d/1rIQWc2thSUKHDiFOUtH9fSSkgI5hqisTrblaLVtW8jQ/edit

## API actions in the current source

- Generic public GET version response (no sheet data).
- Authenticated POST JSON: version, health, inspect-schema, setup-schema, dashboard, events, log-event, update-event, reports, report, hypotheses, run-status.
- analyse-day intentionally returns ANALYSIS_NOT_IMPLEMENTED until the analysis engine is designed and tested.

## Not yet done / not verified

- The live spreadsheet's existing tabs and headers have not been read; web access to the sheet was unavailable in this environment.
- No tabs have been created, renamed or modified.
- Apps Script source has not been installed/deployed in the user's Google account.
- Scriptable has not been run against the live API.
- Code has not been tested end-to-end on iPhone/Scriptable.
- ChatGPT-to-API logging integration is not configured.
- Daily analysis engine and scheduled trigger do not exist yet.

## Immediate next steps

1. Follow docs/IMPLEMENTATION-SETUP.md to create the bound Apps Script project and set Script Properties.
2. Run the read-only inspectGutGenieSpreadsheet() helper in Apps Script and share its output, or deploy and call authenticated inspect-schema.
3. Review existing tabs/headers before running setup-schema. Preserve any data already in the spreadsheet.
4. Test a synthetic event write and dashboard read-back.
5. Iterate on Scriptable UI after API response shapes are confirmed.
6. Design the daily analysis and trigger, including evidence links, contradictory evidence, report versioning and sparse-data handling.
7. Research and configure a secure ChatGPT write path; don't claim automatic capture until verified.

## Constraints

- Scriptable is the iPhone app/UI; do not substitute a hosted web application.
- Google Sheets is the source of truth.
- Never store secrets or real personal health data in GitHub.
- Keep raw observations separate from hypotheses and reports.
- Correlations are not diagnoses or proof of causation.
- GitHub changes do not automatically deploy to Apps Script.
