# Gut Genie API — Test Cases

Use synthetic data only. Do not use real symptom notes in test fixtures. Test against a non-production copy first if the spreadsheet already contains personal records.

## Connection and schema

1. GET the deployed endpoint: returns generic service/version JSON only; no sheet names or data.
2. POST with missing token: returns success=false and Unauthorized.
3. POST with incorrect token: returns success=false and Unauthorized.
4. POST health with correct token: returns spreadsheetConnected=true and missing-tab list.
5. POST inspect-schema: returns existing tab names, row/column counts and header names; must not modify the spreadsheet.
6. POST setup-schema: creates only missing expected tabs and initializes empty tabs; existing non-empty tabs and their headers/rows remain unchanged.
7. Re-run setup-schema: no duplicate tabs and no overwritten existing headers.

## Event writes and reads

8. POST a synthetic food event with a unique idempotency_key: one row appended, stable record_id returned.
9. Repeat the exact payload/idempotency key: duplicate=true and the original record_id is returned; no second row.
10. POST symptom, sleep, exercise and bowel events: each is routed to the matching tab.
11. Missing optional fields stay blank; they are not converted to zero.
12. Invalid event_type, invalid timestamp or missing tab returns a readable error.
13. POST dashboard for a date: counts and timeline reflect saved events for that date.
14. POST events with date filters and event_type: only matching events are returned.
15. POST update-event with valid record_id: only known, allowed header fields update.
16. Attempt to patch record_id, captured_at or source_message_id: fields remain unchanged.
17. Reorder sheet columns: header-based mapping continues to work.
18. Missing optional tabs: dashboard returns empty collections rather than crashing.
19. Empty spreadsheet: inspect-schema works and dashboard returns empty state.
20. API output serializes dates to ISO strings and can be parsed as JSON.

## Reports and failure modes

21. reports returns newest dates first; report by date returns latest version.
22. hypotheses filters by status and returns evidence-for/evidence-against fields.
23. analyse-day returns ANALYSIS_NOT_IMPLEMENTED until the analysis phase is shipped.
24. Invalid JSON returns a structured request error.
25. API failures are shown in Scriptable; they are not rendered as successful saves.
26. API token never appears in URLs, repository files, UI, or error output.
27. A network failure shows a retry path and does not wipe the last successful state without warning.

## Device/UI checks

28. Verify bottom navigation works in Scriptable WebView.
29. Verify long text wraps, empty states render, and iPhone safe-area padding is respected.
30. Verify Today refresh, History load, and Patterns load call the matching API actions.
31. Test first launch without Keychain config and confirm a clear connection error.
32. Test after setting Keychain URL/token and deploying the matching Apps Script source.
