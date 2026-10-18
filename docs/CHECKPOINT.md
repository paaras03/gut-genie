# Gut Genie — Project Checkpoint

**Status date:** 2026-10-18  
**Phase:** 0 — specification and architecture review

## Completed

- Read the Recipe Tracker repository structure and core documentation, including product spec, architecture framework, backend infrastructure and config/decision notes.
- Added `docs/PRODUCT-SPEC.md` with architecture, event flows, proposed sheet tabs and headers, API actions, Scriptable screen/navigation design, Recipe Tracker-inspired visual direction, daily analysis methodology, security constraints, acceptance criteria and open decisions.
- Added project README with the intended architecture and integration caveat.
- Designated the user-supplied Google Spreadsheet as the intended data store: https://docs.google.com/spreadsheets/d/1rIQWc2thSUKHDiFOUtH9fSSkgI5hqisTrblaLVtW8jQ/edit

## Not done yet

- The spreadsheet contents/tabs have not been inspected or changed.
- No Apps Script source has been implemented or deployed.
- No Scriptable UI source exists yet.
- No ChatGPT-to-Apps-Script integration is configured.
- No daily-analysis trigger has been created.
- Nothing has been tested end-to-end.

## Next steps

1. Inspect existing spreadsheet tabs/headers and preserve all existing data.
2. Confirm the spreadsheet schema, then build a secure Apps Script API with health/version/read/write actions.
3. Build the Scriptable dashboard with synthetic data, following Recipe Tracker's warm neutral cards and persistent bottom navigation.
4. Determine and configure a secure ChatGPT logging connection; do not claim automatic logging until a successful write/read test works.
5. Implement whole-day analysis, evidence/counter-evidence storage, report versioning and the Apps Script time trigger.
6. Verify deployments explicitly; GitHub and Apps Script are not automatically synchronized.

## Constraints

- Scriptable is the iPhone app/UI; do not substitute a hosted web application.
- Google Sheets is the source of truth.
- Never store private event data or secret values in GitHub.
- Reports must separate observations from hypotheses and must include contradictory evidence.
- Do not treat correlations as diagnosis or proof of causation.
