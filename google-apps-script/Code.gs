/**
 * Gut Genie — Google Apps Script API
 * Deploy as a Web App only after configuring Script Properties.
 *
 * Required Script Properties:
 *   SPREADSHEET_ID = 1rIQWc2thSUKHDiFOUtH9fSSkgI5hqisTrblaLVtW8jQ
 *   API_TOKEN = existing Scriptable/API secret (keep unchanged)
 *   CHATGPT_ACTION_TOKEN = separate random secret for the private ChatGPT GPT
 *
 * IMPORTANT:
 * - All sensitive API actions use POST JSON so the token is not in the URL.
 * - Do not put API_TOKEN in GitHub or a public Scriptable source file.
 * - This version deliberately does not create or modify tabs automatically.
 *   Run inspect-schema first; setup-schema only creates missing tabs and
 *   adds headers to empty tabs. Existing non-empty tabs are not rewritten.
 */

const GG_BUILD_VERSION = "0.1.0";
const GG_TIMEZONE = "Asia/Kolkata";

const GG_SCHEMA = {
  "Food Log": [
    "record_id", "occurred_at", "local_date", "captured_at", "meal_type",
    "description", "items_json", "fodmap_groups", "estimated_load",
    "source_message_id", "notes", "data_quality"
  ],
  "Symptom Log": [
    "record_id", "occurred_at", "local_date", "captured_at", "symptoms",
    "fullness_score", "gas_level", "gas_smell", "acidity_score", "pain_score",
    "bowel_urgency", "onset_type", "description", "data_quality",
    "source_message_id", "notes"
  ],
  "Sleep Log": [
    "record_id", "sleep_start", "wake_at", "local_date", "duration_minutes",
    "quality_score", "captured_at", "notes", "source_message_id"
  ],
  "Exercise Log": [
    "record_id", "started_at", "ended_at", "local_date", "activity_type",
    "duration_minutes", "intensity", "notes", "captured_at", "source_message_id"
  ],
  "Bowel Log": [
    "record_id", "occurred_at", "local_date", "captured_at", "stool_form",
    "urgency", "straining", "incomplete_emptying", "description",
    "source_message_id"
  ],
  "Analysis Log": [
    "analysis_id", "report_id", "created_at", "target_date", "hypothesis",
    "factor_type", "candidate_exposure", "supporting_evidence",
    "evidence_against", "confounders", "observations_count", "confidence",
    "confidence_rationale", "next_test", "status", "supersedes_analysis_id"
  ],
  "Daily Reports": [
    "report_id", "local_date", "generated_at", "version", "status",
    "day_summary", "symptom_summary", "food_and_timing_summary",
    "sleep_summary", "exercise_summary", "bowel_summary",
    "strongest_associations", "evidence_against", "missing_data",
    "next_experiment", "experiment_rationale", "safety_note"
  ],
  "Settings": ["key", "value", "updated_at"]
};

const GG_EVENT_SHEET = {
  food: "Food Log",
  symptom: "Symptom Log",
  sleep: "Sleep Log",
  exercise: "Exercise Log",
  bowel: "Bowel Log"
};

function doGet(e) {
  // Safe, unauthenticated version check only. All data actions use POST JSON.
  return ggJson_({
    success: true,
    service: "Gut Genie API",
    version: GG_BUILD_VERSION,
    message: "Send API actions as authenticated POST JSON."
  });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const action = String(body.action || "").trim().toLowerCase();
    ggAuthorize_(body, action);
    const ss = ggSpreadsheet_();

    switch (action) {
      case "version":
        return ggJson_({ success: true, version: GG_BUILD_VERSION, timezone: GG_TIMEZONE });
      case "health":
        return ggHealth_(ss);
      case "inspect-schema":
        return ggInspectSchema_(ss);
      case "setup-schema":
        return ggSetupSchema_(ss);
      case "dashboard":
        return ggDashboard_(ss, body);
      case "events":
        return ggEvents_(ss, body);
      case "log-event":
        return ggLogEvent_(ss, body);
      case "update-event":
        return ggUpdateEvent_(ss, body);
      case "reports":
        return ggReports_(ss, body);
      case "report":
        return ggReport_(ss, body);
      case "hypotheses":
        return ggHypotheses_(ss, body);
      case "run-status":
        return ggRunStatus_();
      case "analyse-day":
        return ggError_("ANALYSIS_NOT_IMPLEMENTED",
          "Daily analysis is not implemented in this API build yet.");
      default:
        return ggError_("UNKNOWN_ACTION", "Unknown action: " + action);
    }
  } catch (err) {
    return ggError_("REQUEST_FAILED", String(err && err.message ? err.message : err));
  }
}

function ggAuthorize_(body, action) {
  const props = PropertiesService.getScriptProperties();
  const actionToken = String(body.integrationToken || "");
  const expectedActionToken = props.getProperty("CHATGPT_ACTION_TOKEN");
  const actionTokenAllowed = [
    "health", "dashboard", "events", "log-event", "reports", "report",
    "hypotheses", "run-status", "version", "update-event"
  ];
  if (actionToken && expectedActionToken && actionToken === expectedActionToken) {
    if (actionTokenAllowed.indexOf(action) < 0) {
      throw new Error("This integration credential is not allowed to perform that action.");
    }
    return;
  }
  const expected = props.getProperty("API_TOKEN");
  if (!expected) throw new Error("API_TOKEN Script Property is not configured.");
  if (!body.token || String(body.token) !== expected) throw new Error("Unauthorized.");
}

function ggSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) throw new Error("SPREADSHEET_ID Script Property is not configured.");
  return SpreadsheetApp.openById(id);
}

function ggHealth_(ss) {
  const names = ss.getSheets().map(function(s) { return s.getName(); });
  return ggJson_({
    success: true,
    service: "Gut Genie API",
    version: GG_BUILD_VERSION,
    spreadsheetConnected: true,
    expectedTabsPresent: Object.keys(GG_SCHEMA).filter(function(n) { return names.indexOf(n) >= 0; }).length,
    expectedTabsTotal: Object.keys(GG_SCHEMA).length,
    missingTabs: Object.keys(GG_SCHEMA).filter(function(n) { return names.indexOf(n) < 0; }),
    timezone: ss.getSpreadsheetTimeZone()
  });
}

function ggInspectSchema_(ss) {
  const sheets = ss.getSheets().map(function(sheet) {
    const lastCol = sheet.getLastColumn();
    const lastRow = sheet.getLastRow();
    const headers = lastRow > 0 && lastCol > 0
      ? sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(String)
      : [];
    return {
      name: sheet.getName(),
      rowsIncludingHeader: lastRow,
      columns: lastCol,
      headers: headers,
      expectedHeaders: GG_SCHEMA[sheet.getName()] || [],
      missingExpectedHeaders: GG_SCHEMA[sheet.getName()]
        ? GG_SCHEMA[sheet.getName()].filter(function(h) { return headers.indexOf(h) < 0; })
        : []
    };
  });
  return ggJson_({ success: true, sheets: sheets });
}

/**
 * Explicit opt-in schema setup. Creates missing expected tabs. If an expected
 * tab exists but is completely empty, writes its header row. Does not rename
 * tabs, delete rows, reorder columns, or overwrite a non-empty header row.
 */
function ggSetupSchema_(ss) {
  const created = [];
  const initialized = [];
  const skipped = [];
  Object.keys(GG_SCHEMA).forEach(function(name) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.getRange(1, 1, 1, GG_SCHEMA[name].length).setValues([GG_SCHEMA[name]]);
      sheet.setFrozenRows(1);
      created.push(name);
      return;
    }
    if (sheet.getLastRow() === 0 || (sheet.getLastRow() === 1 && sheet.getLastColumn() === 0)) {
      sheet.getRange(1, 1, 1, GG_SCHEMA[name].length).setValues([GG_SCHEMA[name]]);
      sheet.setFrozenRows(1);
      initialized.push(name);
      return;
    }
    skipped.push(name);
  });
  return ggJson_({
    success: true,
    created: created,
    initializedEmptyTabs: initialized,
    leftExistingTabsUntouched: skipped,
    note: "Existing non-empty tabs were not modified. Review inspect-schema output before any migration."
  });
}

function ggDashboard_(ss, body) {
  const date = String(body.date || ggToday_());
  const eventGroups = {};
  Object.keys(GG_EVENT_SHEET).forEach(function(type) {
    eventGroups[type] = ggReadEventsForDate_(ss, type, date);
  });
  const reports = ggReadTable_(ss, "Daily Reports");
  const todayReports = reports.filter(function(r) { return String(r.local_date || "") === date; });
  todayReports.sort(function(a, b) { return Number(b.version || 0) - Number(a.version || 0); });
  const allEvents = [];
  Object.keys(eventGroups).forEach(function(type) {
    eventGroups[type].forEach(function(item) {
      item.event_type = type;
      allEvents.push(item);
    });
  });
  allEvents.sort(function(a, b) {
    return String(a.occurred_at || a.started_at || a.sleep_start || "").localeCompare(
      String(b.occurred_at || b.started_at || b.sleep_start || "")
    );
  });
  return ggJson_({
    success: true,
    date: date,
    events: allEvents,
    counts: Object.keys(eventGroups).reduce(function(out, type) {
      out[type] = eventGroups[type].length;
      return out;
    }, {}),
    latestReport: todayReports[0] || null,
    refreshedAt: new Date().toISOString()
  });
}

function ggEvents_(ss, body) {
  const type = String(body.event_type || "").toLowerCase();
  const fromDate = String(body.from_date || "");
  const toDate = String(body.to_date || fromDate || "");
  const types = type ? [type] : Object.keys(GG_EVENT_SHEET);
  const results = [];
  types.forEach(function(t) {
    if (!GG_EVENT_SHEET[t]) throw new Error("Invalid event_type: " + t);
    ggReadTable_(ss, GG_EVENT_SHEET[t]).forEach(function(row) {
      const date = String(row.local_date || "").slice(0, 10);
      if ((!fromDate || date >= fromDate) && (!toDate || date <= toDate)) {
        row.event_type = t;
        results.push(row);
      }
    });
  });
  results.sort(function(a, b) {
    return String(a.occurred_at || a.started_at || a.sleep_start || "").localeCompare(
      String(b.occurred_at || b.started_at || b.sleep_start || "")
    );
  });
  const limit = Math.max(1, Math.min(500, Number(body.limit || 100)));
  return ggJson_({ success: true, events: results.slice(-limit), count: results.length });
}

function ggLogEvent_(ss, body) {
  const type = String(body.event_type || "").toLowerCase();
  const sheetName = GG_EVENT_SHEET[type];
  if (!sheetName) throw new Error("event_type must be food, symptom, sleep, exercise, or bowel.");
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Missing tab "' + sheetName + '". Run inspect-schema, then setup-schema if appropriate.');
  const headers = ggHeaders_(sheet);
  if (!headers.length) throw new Error('Tab "' + sheetName + '" has no header row.');
  const data = body.data || {};
  const occurred = ggEventTime_(type, body.occurred_at || data.occurred_at || data.started_at || data.sleep_start);
  const localDate = String(data.local_date || (occurred ? Utilities.formatDate(occurred, GG_TIMEZONE, "yyyy-MM-dd") : ggToday_()));
  const sourceId = String(body.idempotency_key || body.source_message_id || data.source_message_id || "").trim();

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (sourceId) {
      const duplicate = ggFindBySourceId_(sheet, headers, sourceId);
      if (duplicate) return ggJson_({
        success: true, duplicate: true, record_id: duplicate.record_id,
        event_type: type, message: "Idempotent retry; existing record returned."
      });
    }

  const recordId = Utilities.getUuid();
  const record = Object.assign({}, data);
  record.record_id = recordId;
  record.local_date = localDate;
  record.captured_at = new Date().toISOString();
  if (occurred && !record.occurred_at && (type === "food" || type === "symptom" || type === "bowel")) {
    record.occurred_at = occurred.toISOString();
  }
  if (type === "sleep" && !record.sleep_start && occurred) record.sleep_start = occurred.toISOString();
  if (type === "exercise" && !record.started_at && occurred) record.started_at = occurred.toISOString();
  if (sourceId) record.source_message_id = sourceId;
  if (record.items_json && typeof record.items_json !== "string") record.items_json = JSON.stringify(record.items_json);
  if (record.symptoms && Array.isArray(record.symptoms)) record.symptoms = record.symptoms.join(", ");
  if (record.fodmap_groups && Array.isArray(record.fodmap_groups)) record.fodmap_groups = record.fodmap_groups.join(", ");
  ggAppendByHeaders_(sheet, headers, record);
  return ggJson_({
    success: true, record_id: recordId, event_type: type,
    stored_at: record.captured_at, local_date: localDate, duplicate: false
  });
  } finally {
    lock.releaseLock();
  }
}

function ggUpdateEvent_(ss, body) {
  const type = String(body.event_type || "").toLowerCase();
  const sheetName = GG_EVENT_SHEET[type];
  if (!sheetName) throw new Error("Invalid event_type.");
  const recordId = String(body.record_id || "").trim();
  if (!recordId) throw new Error("record_id is required.");
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Event tab not found.");
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error("Record not found.");
  const headers = values[0].map(function(v) { return String(v || "").trim(); });
  const idCol = headers.indexOf("record_id");
  if (idCol < 0) throw new Error("record_id column missing.");
  const rowIndex = values.findIndex(function(row, i) { return i > 0 && String(row[idCol]) === recordId; });
  if (rowIndex < 1) throw new Error("Record not found.");
  const patch = body.data || {};
  const blocked = {record_id:true, captured_at:true, source_message_id:true};
  const allowed = {};
  Object.keys(patch).forEach(function(key) {
    if (!blocked[key] && headers.indexOf(key) >= 0) allowed[key] = patch[key];
  });
  Object.keys(allowed).forEach(function(key) {
    const value = Array.isArray(allowed[key]) ? allowed[key].join(", ") :
      (typeof allowed[key] === "object" && allowed[key] !== null ? JSON.stringify(allowed[key]) : allowed[key]);
    sheet.getRange(rowIndex + 1, headers.indexOf(key) + 1).setValue(value);
  });
  return ggJson_({success: true, record_id: recordId, updated_fields: Object.keys(allowed)});
}

function ggReports_(ss, body) {
  const limit = Math.max(1, Math.min(100, Number(body.limit || 30)));
  const reports = ggReadTable_(ss, "Daily Reports").sort(function(a, b) {
    return String(b.local_date || "").localeCompare(String(a.local_date || "")) ||
      Number(b.version || 0) - Number(a.version || 0);
  });
  return ggJson_({success: true, reports: reports.slice(0, limit)});
}

function ggReport_(ss, body) {
  const id = String(body.report_id || "");
  const date = String(body.date || "");
  const reports = ggReadTable_(ss, "Daily Reports").filter(function(r) {
    return (id && String(r.report_id || "") === id) ||
      (!id && date && String(r.local_date || "") === date);
  });
  reports.sort(function(a, b) { return Number(b.version || 0) - Number(a.version || 0); });
  return ggJson_({success: true, report: reports[0] || null});
}

function ggHypotheses_(ss, body) {
  const status = String(body.status || "");
  const rows = ggReadTable_(ss, "Analysis Log").filter(function(r) {
    return !status || String(r.status || "") === status;
  }).sort(function(a, b) { return String(b.created_at || "").localeCompare(String(a.created_at || "")); });
  return ggJson_({success: true, hypotheses: rows.slice(0, Math.max(1, Math.min(200, Number(body.limit || 100))))});
}

function ggRunStatus_() {
  const p = PropertiesService.getScriptProperties();
  return ggJson_({
    success: true,
    lastAnalysisAt: p.getProperty("LAST_ANALYSIS_AT") || null,
    lastAnalysisDate: p.getProperty("LAST_ANALYSIS_DATE") || null,
    lastAnalysisStatus: p.getProperty("LAST_ANALYSIS_STATUS") || "not_run"
  });
}

function ggReadEventsForDate_(ss, type, date) {
  const sheetName = GG_EVENT_SHEET[type];
  if (!ss.getSheetByName(sheetName)) return [];
  return ggReadTable_(ss, sheetName).filter(function(row) {
    return String(row.local_date || "") === date;
  });
}

function ggReadTable_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(v) { return String(v || "").trim(); });
  return values.slice(1).filter(function(row) {
    return row.some(function(v) { return v !== "" && v !== null; });
  }).map(function(row) {
    const out = {};
    headers.forEach(function(h, i) {
      if (h) out[h] = ggSerializeCell_(row[i]);
    });
    return out;
  });
}

function ggSerializeCell_(value) {
  if (value instanceof Date) return value.toISOString();
  if (value === null || value === undefined) return "";
  return value;
}

function ggHeaders_(sheet) {
  if (sheet.getLastColumn() < 1 || sheet.getLastRow() < 1) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0]
    .map(function(v) { return String(v || "").trim(); });
}

function ggAppendByHeaders_(sheet, headers, record) {
  const row = headers.map(function(header) {
    return record[header] === undefined || record[header] === null ? "" : record[header];
  });
  sheet.appendRow(row);
}

function ggFindBySourceId_(sheet, headers, sourceId) {
  const sourceCol = headers.indexOf("source_message_id");
  if (sourceCol < 0 || sheet.getLastRow() < 2) return null;
  const values = sheet.getRange(2, sourceCol + 1, sheet.getLastRow() - 1, 1).getDisplayValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === sourceId) {
      const row = sheet.getRange(i + 2, 1, 1, headers.length).getValues()[0];
      const idCol = headers.indexOf("record_id");
      return {record_id: idCol >= 0 ? String(row[idCol]) : ""};
    }
  }
  return null;
}

function ggEventTime_(type, value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) throw new Error("Invalid event timestamp.");
  return d;
}

function ggToday_() {
  return Utilities.formatDate(new Date(), GG_TIMEZONE, "yyyy-MM-dd");
}

function ggJson_(object) {
  return ContentService.createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}

function ggError_(code, message) {
  return ggJson_({success: false, code: code, error: message});
}
