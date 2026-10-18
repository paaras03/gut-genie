# Gut Genie — Initial Connection & Inspection

This document is the manual bridge between the GitHub source and the user's Google account. The repository cannot deploy Apps Script or inspect a private Google Sheet by itself.

## 1. Confirm the target spreadsheet

Use the user-designated spreadsheet:

https://docs.google.com/spreadsheets/d/1rIQWc2thSUKHDiFOUtH9fSSkgI5hqisTrblaLVtW8jQ/edit

The spreadsheet ID is the value between /d/ and /edit. Do not create a replacement spreadsheet.

## 2. Create the Apps Script project

1. Open the spreadsheet.
2. Open Extensions → Apps Script to create a script bound to this spreadsheet.
3. Replace the starter code with the contents of google-apps-script/Code.gs from this repository.
4. Open Project Settings → Script Properties and add:
   - SPREADSHEET_ID = 1rIQWc2thSUKHDiFOUtH9fSSkgI5hqisTrblaLVtW8jQ
   - API_TOKEN = a newly generated long random secret (at least 32 random bytes). Do not commit it to GitHub or put it in a shared document.
5. Save the project. Set the project timezone to Asia/Kolkata if not already set.

## 3. Inspect first — do not set up tabs yet

Deploy as a Web App for testing:
1. Click Deploy → New deployment → Web app.
2. Select the narrowest available execution/access settings that allow your intended client to call it. Review the security implications before choosing broad/anonymous access.
3. Deploy and copy the Web App URL.
4. In Scriptable, temporarily create two Keychain values:
   - key GutGenieApiUrl → deployed Web App URL
   - key GutGenieApiToken → the exact API_TOKEN value
5. Run the Scriptable client. Its initial dashboard request may fail until the schema is ready; first invoke the API action inspect-schema using a temporary diagnostic call or run the Apps Script function below directly in the editor.

### Editor-based inspection helper

Run this function from the Apps Script editor. It reads the existing spreadsheet's tab names, header rows, and row/column counts; it does not edit any sheet.

```javascript
function inspectGutGenieSpreadsheet() {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) throw new Error("Set SPREADSHEET_ID in Script Properties first.");
  const ss = SpreadsheetApp.openById(id);
  const report = ss.getSheets().map(function(sheet) {
    const rows = sheet.getLastRow();
    const cols = sheet.getLastColumn();
    return {
      name: sheet.getName(),
      rowsIncludingHeader: rows,
      columns: cols,
      headers: rows > 0 && cols > 0
        ? sheet.getRange(1, 1, 1, cols).getDisplayValues()[0]
        : []
    };
  });
  Logger.log(JSON.stringify(report, null, 2));
}
```

Open Execution log and copy the output back into the project discussion. That is the current-sheet inspection result needed before finalizing any schema migration.

## 4. Decide on schema setup

The authenticated API action setup-schema only creates missing expected tabs and initializes tabs that are completely empty. It deliberately does not rename tabs, delete rows, reorder columns, or overwrite a non-empty header row. Review inspect-schema output first. If the spreadsheet already contains overlapping tabs, map those deliberately before running setup.

Expected tabs: Food Log, Symptom Log, Sleep Log, Exercise Log, Bowel Log, Analysis Log, Daily Reports, Settings.

## 5. Test the API

Use an authenticated POST JSON request. Example body:

```json
{
  "action": "inspect-schema",
  "token": "YOUR_API_TOKEN"
}
```

Never paste the real token into GitHub, an issue, or a chat message. All sensitive actions use POST; the generic GET response does not expose sheet contents.

After the schema is reviewed and ready, test in this order:
1. health
2. inspect-schema
3. setup-schema only if appropriate
4. health again
5. log-event with synthetic test data
6. dashboard to confirm the record reads back
7. Remove the synthetic test row after verification.

## 6. Deployment caveats

- GitHub and Apps Script are separate. Committing Code.gs does not update the deployed Web App.
- After every backend code change, copy the latest source into Apps Script and deploy a new version.
- The Scriptable client uses the URL and token from Scriptable Keychain, not hardcoded source.
- The current API has no daily analysis engine or time trigger yet. Those are later phases.
- Do not treat the API as private solely because the URL is hard to guess. Choose and test access control before storing real health-related notes.
