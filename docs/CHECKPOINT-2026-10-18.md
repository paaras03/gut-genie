# Gut Genie Project Checkpoint — 2026-10-18

## Purpose

This checkpoint records the current known state of Gut Genie so work can resume without repeating completed setup or risking existing data.

Repository: https://github.com/paaras03/gut-genie
Branch: `main`
Checkpoint date: 2026-10-18
Timezone: Asia/Kolkata

## Current status

- The Scriptable app shell is working and displays **Today**, **History**, and **Patterns**.
- The Apps Script API is reachable.
- The Google spreadsheet is connected; the health response reports all 8 expected tabs present.
- Demo data seeding was successfully invoked from Scriptable. The response reported `success: true`, `addedReports: 2`, and `addedHypotheses: 2`.
- History displayed two clearly labelled demo reports; Patterns displayed two clearly labelled demo hypotheses.
- **Historical backfill has not started.** Do not treat demo entries as real health evidence.
- The ChatGPT custom GPT Action write interface is not yet validated. No historical backfill writes have been performed during the schema diagnosis.

## What has been accomplished

### Repository and backend

- Apps Script backend source is in `google-apps-script/Code.gs`.
- Backend supports reading event logs with `events`, creating events with `log-event`, updating events with `update-event`, and reading reports/hypotheses with `reports`, `report`, and `hypotheses`.
- Event creation code accepts a non-empty nested `data` object. If it is absent, it also accepts top-level fields matching the selected sheet headers.
- The `seed-demo-data` action was added to the backend source and committed to GitHub. It is idempotent by demo record ID and clearly labels generated rows as demo-only.
- A local-date serialization fix exists in the backend source to preserve `local_date` as `yyyy-MM-dd` in the configured timezone.
- The Apps Script Web App was manually redeployed during this workflow. The user reported completing a new deployment. The exact currently deployed code revision has not been independently verified.

### Spreadsheet and data observed

The API health response reported 8 expected tabs:
- Food Log
- Symptom Log
- Sleep Log
- Exercise Log
- Bowel Log
- Analysis Log
- Daily Reports
- Settings

During the earlier read-only inspection, the API returned:
- Food log: 3 records, including one rajma-quinoa salad record and two explicitly labelled test entries.
- Symptom log: 1 existing record describing substantial bloating and high-volume odorless gas.
- Bowel log: 1 existing record describing morning constipation.
- Sleep log: 0 records.
- Exercise log: 0 records.
- Daily Reports: 2 demo reports after seeding.
- Analysis Log / hypotheses: 2 demo analyses after seeding.

These are counts observed during inspection, not a guarantee that counts remain unchanged. The two test food records and four demo records should remain untouched unless the user explicitly requests cleanup.

### Scriptable app

- Source file: `scriptable/Gut Genie.js`.
- UI screens: Today, History, Patterns.
- Scriptable uses Keychain keys `GutGenieApiUrl` and `GutGenieApiToken`. Do not expose these values or ask the user to paste secrets into chat.
- The UI is now rendering the seeded History and Patterns records.

### GPT Action / OpenAPI investigation

Repository OpenAPI file:
`integrations/chatgpt/openapi.yaml`

- The repository OpenAPI declares version **0.1.2**.
- The live API's version action previously reported **0.1.0**.
- The saved custom GPT Action schema could not be inspected through the available tools in this workflow.
- Reported action errors:
  - `log-event` with nested `data`: `UnrecognizedKwargsError: data`.
  - `update-event` with food fields at top level: food fields were rejected as unrecognized.
- Backend source explicitly supports nested `data` in `ggPayloadData_()`, and it also supports matching flattened sheet fields when `data` is absent.
- Therefore, the most likely issue is the saved GPT Action schema or argument mapping, but the root cause is **not yet confirmed**. The version discrepancy also needs checking.
- Do not guess a replacement schema or make backend/deployment changes until the current saved Action definition is compared with the repository OpenAPI and actual deployed revision.

## Source revision references at checkpoint

These are GitHub content/blob SHAs retrieved on 2026-10-18; they are not a complete backup of the live spreadsheet or the Apps Script deployment.

| File | Blob SHA |
|---|---|
| `google-apps-script/Code.gs` | `38d3e8505d6c6c1b891b1ea7506707af2d4ba3f3` |
| `integrations/chatgpt/openapi.yaml` | `013d5806d3204b26ffb7aa1532bd3610f940dc9e` |
| `scriptable/Gut Genie.js` | `1b28f0a7259e0d4f43f2f502633d3ff987a73ac4` |

GitHub history contains the committed source changes. No credentials, API tokens, spreadsheet secrets, or deployment secrets are included in this document.

## What has been tested

| Test | Result | Notes |
|---|---|---|
| API health | Pass | Connected spreadsheet; 8 expected tabs reported |
| API version | Pass | Reported 0.1.0 |
| Read event logs | Pass | Existing food, symptom, and bowel records returned |
| Seed demo data | Pass | Response reported 2 reports and 2 hypotheses added |
| History UI | Pass | Demo reports displayed |
| Patterns UI | Pass | Demo hypotheses displayed |
| GPT Action event creation | Blocked | Action invocation rejected `data` before successful write validation |
| GPT Action update | Blocked | Supplied food fields rejected |
| Historical backfill | Not run | Must wait for confirmed Action contract |
| Actual production data export/backup | Not verified | See backup scope below |

## Pending work — priority order

### P0 — Confirm the Action contract

1. In the custom GPT editor, open Configure → Actions.
2. Save/export or copy the current Action OpenAPI schema. Do not share secrets.
3. Compare its request schema with `integrations/chatgpt/openapi.yaml`.
4. Confirm the configured server URL and the currently deployed Apps Script revision.
5. Correct only the GPT Action schema/mapping after the mismatch is proven.
6. Test one clearly marked test food record, then read it back and verify record ID, event type, timestamp/date, description, food items, and notes.
7. Keep test records identifiable; do not confuse them with historical events.

### P1 — Back up actual data

- Export the Google spreadsheet, including all eight tabs, to a dated backup (for example, an XLSX file) before any bulk backfill or cleanup.
- Confirm the backup file exists and can be opened.
- Do not treat this GitHub checkpoint or Git history as a backup of spreadsheet rows or Apps Script deployment settings.
- Keep credentials in Script Properties/Keychain; do not commit secrets.

### P2 — Historical backfill

- Review only accessible conversation history and existing records.
- Distinguish events explicitly reported as consumed/done from hypothetical foods, questions, recipes, and plans.
- Do not infer exact timestamps, quantities, symptoms, or diagnoses.
- Check existing records before writing and use idempotency keys where supported.
- Process small chronological batches, with read-back verification for every write.
- Keep ambiguous events in a review list rather than guessing.
- Do not backfill unsupported Sleep or Exercise records without actual evidence.
- Do not create Daily Reports or Analysis Log entries unless the API provides a confirmed write mechanism and the evidence is sufficient.
- Preserve the existing test and demo records until the user explicitly asks to remove them.

### P3 — Final reconciliation

Report the date range reviewed, records identified/created/verified/skipped, failed writes, ambiguous events, missing data, and API limitations. Clearly distinguish the accessible history reviewed from the user's complete ChatGPT history.

## Safety / do-not-change notes

- Do not delete or overwrite existing spreadsheet records.
- Do not remove the two demo reports or two demo hypotheses without explicit user instruction.
- Do not reset, rewrite, or redeploy the backend as a workaround for the unconfirmed GPT Action schema mismatch.
- Do not modify the Scriptable app unless required and approved.
- Do not claim a backfill or backup succeeded without verifying the resulting artifact/data.
- Never put API tokens, integration tokens, Scriptable Keychain values, or other secrets in GitHub or this checkpoint.

## Definition of done for the next milestone

The next milestone is complete only when:
1. The GPT Action schema and deployed backend contract are reconciled.
2. One test event can be created and read back with all expected fields.
3. A dated export of all eight spreadsheet tabs is verified.
4. Historical backfill can proceed in batches with duplicate checks and reconciliation.
