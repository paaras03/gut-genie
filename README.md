# Gut Genie

Personal digestive symptom, food, sleep and exercise tracker built with **Scriptable + Google Apps Script + Google Sheets**.

The iPhone UI is a Scriptable WebView, not a hosted web app. Google Sheets is the source of truth. Apps Script exposes a JSON API and runs scheduled daily analysis independently of Scriptable.

## Spec

- [Product & Technical Specification](docs/PRODUCT-SPEC.md)

## Planned data store

[Gut Genie Google Spreadsheet](https://docs.google.com/spreadsheets/d/1rIQWc2thSUKHDiFOUtH9fSSkgI5hqisTrblaLVtW8jQ/edit)

The spreadsheet is designated by the user. Its current tabs and contents have not yet been inspected or modified; schema changes must preserve existing data.

## Reference UI/backend

[Recipe Tracker](https://github.com/paaras03/recipe-tracker) is the reference for Scriptable WebView layout, Request-based API calls, Apps Script action routing, JSON responses and header-based column lookup.

## Status

Specification written. Runtime code, Google Sheets changes, Apps Script deployment and ChatGPT write integration have not been implemented yet. Automatic logging depends on configuring a secure ChatGPT-to-API integration; the endpoint alone does not make ChatGPT writes automatic.
