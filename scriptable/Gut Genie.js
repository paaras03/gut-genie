// Gut Genie — Scriptable client
// Screens: Today, History, Patterns
// Requires Keychain keys: GutGenieApiUrl, GutGenieApiToken

const API_URL_KEY = "GutGenieApiUrl";
const API_TOKEN_KEY = "GutGenieApiToken";

function localDateISO() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
}

async function api(action, data) {
  if (!Keychain.contains(API_URL_KEY) ||
      !Keychain.contains(API_TOKEN_KEY)) {
    throw new Error("Missing Keychain entry: GutGenieApiUrl or GutGenieApiToken.");
  }
  const req = new Request(Keychain.get(API_URL_KEY));
  req.method = "POST";
  req.headers = { "Content-Type": "application/json" };
  req.body = JSON.stringify({... (data || {}), action, token: Keychain.get(API_TOKEN_KEY)});
  const raw = await req.loadString();
  let result;
  try { result = JSON.parse(raw); }
  catch (_) { throw new Error("API returned invalid JSON. Check the Web App URL and deployment."); }
  if (!result.success) throw new Error(result.error || "API request failed.");
  return result;
}

async function main() {
  // Fetch the first dashboard natively before rendering the WebView. This avoids
  // the initial custom-scheme bridge request racing WebView presentation.
  let selectedDate = localDateISO();
  let initial;
  try {
    initial = await api("dashboard", {date:selectedDate});
  } catch (error) {
    initial = {success:false, error:String(error && error.message ? error.message : error), date:selectedDate, events:[], counts:{}};
  }
  const web = new WebView();

  web.shouldAllowRequest = function(request) {
    const url = request.url || "";
    if (!url.startsWith("gutgenie://")) {
      if (/^https?:\/\//i.test(url)) { Safari.open(url); return false; }
      return true;
    }
    const params = {};
    try {
      (url.split("?")[1] || "").split("&").forEach(function(part) {
        if (!part) return;
        const bits = part.split("=");
        params[decodeURIComponent(bits[0])] = decodeURIComponent(bits.slice(1).join("="));
      });
    } catch (e) { console.error(String(e)); return false; }

    if (params.action === "add-medication") {
      web.evaluateJavaScript("window.showMedicationForm()", false);
      return false;
    }
    if (params.action === "save-medication") {
      (async function() {
        const name = (params.name || "").trim();
        if (!name) {
          await web.evaluateJavaScript("window.nativeMedicationStatus('Enter a medication or supplement name.')", false);
          return;
        }
        const now = new Date();
        const date = [now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-");
        try {
          await api("log-event", {
            event_type:"medication",
            data:{
              medication_name:name,
              dose:params.dose || "",
              unit:params.unit || "tablet",
              purpose:params.purpose || "",
              notes:params.notes || "",
              taken_at:now.toISOString(),
              local_date:date
            },
            idempotency_key:"med-"+now.getTime()
          });
          const result = await api("dashboard", {date:selectedDate || date});
          await web.evaluateJavaScript("window.nativeMedicationStatus('Medication saved.')", false);
          await web.evaluateJavaScript("window.nativeDashboard("+JSON.stringify({result})+")", false);
        } catch(error) {
          await web.evaluateJavaScript("window.nativeMedicationStatus("+JSON.stringify("Could not save medication: "+String(error && error.message ? error.message : error))+")", false);
        }
      })();
      return false;
    }
    if (params.action === "refresh") {
      selectedDate = params.date || selectedDate || localDateISO();
      api("dashboard", {date:selectedDate})
        .then(result => web.evaluateJavaScript("window.nativeDashboard("+JSON.stringify({result})+")", false))
        .catch(error => web.evaluateJavaScript("window.nativeDashboard("+JSON.stringify({error:String(error)})+")", false));
    } else if (params.action === "history") {
      const end = new Date(); const start = new Date(end); start.setDate(start.getDate()-29);
      const iso = d => [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
      api("events", {from_date:iso(start),to_date:iso(end),limit:500})
        .then(result => web.evaluateJavaScript("window.nativeHistory("+JSON.stringify({result})+")", false))
        .catch(error => web.evaluateJavaScript("window.nativeHistory("+JSON.stringify({error:String(error)})+")", false));
    } else if (params.action === "report") {
      api("report", {date:params.date || selectedDate || localDateISO()})
        .then(result => web.evaluateJavaScript("window.nativeReport("+JSON.stringify({result})+")", false))
        .catch(error => web.evaluateJavaScript("window.nativeReport("+JSON.stringify({error:String(error)})+")", false));
    } else if (params.action === "patterns") {
      api("hypotheses", {limit:100})
        .then(result => web.evaluateJavaScript("window.nativePatterns("+JSON.stringify({result})+")", false))
        .catch(error => web.evaluateJavaScript("window.nativePatterns("+JSON.stringify({error:String(error)})+")", false));
    }
    return false;
  };

  const safeInitial = JSON.stringify(initial).replace(/</g, "\\u003c");
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>
*{box-sizing:border-box}body{margin:0;padding:22px 15px 100px;background:#faf9f6;color:#17211f;font-family:-apple-system,BlinkMacSystemFont,sans-serif}
h1{font-size:32px;font-weight:650;letter-spacing:-.7px;margin:0}h2{font-size:20px;font-weight:650;margin:0}.sub{color:#7a817f;font-size:13px;margin:5px 0 18px}
button{font:inherit;cursor:pointer}.btn{border:0;border-radius:12px;padding:9px 12px;background:#e9eee9;color:#214d3e}
.dateSwitch{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:18px 0 4px}.dateSwitch button{border:1px solid #e4e3dc;background:#fff;border-radius:11px;padding:8px 12px;color:#214d3e}.dateSwitch input{font:inherit;border:1px solid #e4e3dc;border-radius:11px;background:#fff;padding:8px;min-width:0;max-width:58%}.metric{cursor:pointer;user-select:none;border:0;font:inherit;color:inherit;width:100%;}.section{scroll-margin-top:14px}
.summary{background:#fff;border:1px solid #e9e8e2;border-radius:19px;padding:14px;margin:16px 0 22px}.summaryHead{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.summaryHead span{font-size:12px;color:#7a817f}
.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.metric{border-radius:13px;padding:11px 5px;text-align:center;min-width:0}.metric .ico{font-size:20px;display:block;margin-bottom:5px}.metric strong{font-size:23px;display:block;font-weight:650;line-height:1.1}.metric small{font-size:11px;display:block;margin-top:5px;color:#3e4844}
.foodTint{background:#e5f3e8}.symptomTint{background:#fde8e5}.bowelTint{background:#eee7fb}.otherTint{background:#e3f0fc}
.section{border-radius:18px;padding:10px;margin:13px 0;background:#fff;border:1px solid #eeece7}.section.food{background:#edf7ef;border-color:#e0eee3}.section.symptom{background:#fff0ee;border-color:#f7e4e0}.section.bowel{background:#f3effb;border-color:#eae3f7}.section.other{background:#edf6fe;border-color:#e0edf9}
.sectionHead{display:flex;align-items:center;gap:10px;padding:3px 2px 10px}.sectionIcon{width:39px;height:39px;border-radius:50%;display:grid;place-items:center;font-size:21px;flex-shrink:0;background:#ffffff99}.sectionTitle{font-weight:650;font-size:16px}.sectionCount{font-size:12px;color:#737d78;margin-top:3px}
.entry{background:#ffffffd9;border-radius:12px;padding:11px 10px;margin-top:5px;display:flex;align-items:flex-start;gap:9px}.dot{width:8px;height:8px;border-radius:50%;margin-top:6px;flex-shrink:0;background:#43815d}.symptom .dot{background:#d65c60}.bowel .dot{background:#8660bf}.other .dot{background:#3288ce}.entryMain{min-width:0;flex:1}.entryTitle{font-size:14px;font-weight:600;line-height:1.35;overflow-wrap:anywhere}.entryMeta{font-size:12px;color:#6d7571;margin-top:4px;line-height:1.4}.entryTime{font-size:11px;color:#858b88;white-space:nowrap;margin-left:4px}
.foodNotes{font-size:13px;color:#626d67;line-height:1.45;margin-top:7px}.ingredientDetails{margin-top:9px;border-top:1px solid #e9eee8;padding-top:8px}.ingredientDetails summary{font-size:12px;color:#286348;font-weight:600;cursor:pointer}.ingredientList{margin:7px 0 0;padding-left:18px;color:#626d67;font-size:12px;line-height:1.6}.calorieTag{display:inline-block;margin-top:8px;background:#edf3eb;color:#386248;border-radius:8px;padding:4px 7px;font-size:11px;font-weight:600}.mealLabel{display:inline-block;color:#386248;font-size:11px;font-weight:600;margin-top:4px;text-transform:capitalize}
.empty{text-align:center;color:#858b88;padding:14px 6px;font-size:13px}.error{background:#f7e9e5;border:1px solid #e8c8bf;border-radius:12px;padding:12px;color:#7a3020;font-size:13px;overflow-wrap:anywhere}
.nav{position:fixed;bottom:0;left:0;right:0;background:#faf9f6;border-top:1px solid #e6e3dc;padding:7px 10px max(8px,env(safe-area-inset-bottom));display:flex;z-index:20}.nav button{flex:1;border:0;background:none;padding:8px 3px;color:#858b88;font-size:12px}.nav .on{color:#174c3b;font-weight:650}.nav .symbol{font-size:19px;line-height:1.3}
.card{background:#fff;border:1px solid #e9e8e2;border-radius:15px;padding:14px;margin:9px 0}.row{display:flex;align-items:center;justify-content:space-between;gap:10px}.muted{font-size:12px;color:#777}.pill{display:inline-block;border-radius:20px;background:#eeeae3;padding:5px 9px;font-size:12px}
</style></head><body><div id="app"><h1>Gut Genie</h1><div class="card">Starting dashboard…</div></div>
<div class="nav"><button class="on" data-page="today"><span class="symbol">⌂</span><br>Today</button><button data-page="history"><span class="symbol">▦</span><br>History</button><button data-page="patterns"><span class="symbol">⌁</span><br>Patterns</button></div>
<script>
var dashboard = ${safeInitial}; var reports = null; var dailyReport = null; var reportLoading = false; var hypotheses = null; var page = "today";
function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function showError(message){var app=document.getElementById("app");app.innerHTML='<h1>Gut Genie</h1><div class="error"><b>Dashboard error</b><p>'+esc(message)+'</p></div><button class="btn" data-action="refresh">Retry</button>';}
window.onerror=function(message,source,line,column){showError(String(message)+" (line "+line+", column "+column+")");return false;};
window.onunhandledrejection=function(event){showError(event&&event.reason?String(event.reason.message||event.reason):"Unknown asynchronous error");};
function dateLabel(value){if(!value)return "";var d=new Date(value);return isNaN(d)?"":d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});}
function nativeRequest(action, date){location.href="gutgenie://?action="+encodeURIComponent(action)+(date?"&date="+encodeURIComponent(date):"");}
function openDailyReport(){page="report";reportLoading=true;render();nativeRequest("report",dashboard.date||selectedDate||localDateISO());}
function shiftDate(delta){var d=new Date((dashboard.date||selectedDate||localDateISO())+"T12:00:00");d.setDate(d.getDate()+delta);selectedDate=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");dashboard={success:true,loading:true,date:selectedDate,events:[],counts:{}};render();nativeRequest("refresh",selectedDate);}
function chooseDate(value){if(!value)return;selectedDate=value;dashboard={success:true,loading:true,date:value,events:[],counts:{}};render();nativeRequest("refresh",value);}
function kind(e){return String(e.event_type||e.type||"other").toLowerCase();}
function category(e){var t=kind(e);if(t==="food"||t==="meal"||t==="drink")return "food";if(t==="symptom")return "symptom";if(t==="bowel"||t==="bowel_movement"||t==="stool")return "bowel";return "other";}
function entryTitle(e){var t=kind(e);return e.medication_name||e.description||e.meal_type||e.activity_type||e.symptoms||(t==="bowel"||t==="bowel_movement"?"Bowel movement":t==="sleep"?"Sleep":t==="exercise"?"Exercise":t==="food"?"Food entry":t==="symptom"?"Symptom":"Other entry");}
function parseIngredients(e){
 var raw=e.items_json||e.food_items||e.ingredients;
 if(!raw)return [];
 if(Array.isArray(raw))return raw;
 if(typeof raw==="object")return [raw];
 try{var parsed=JSON.parse(String(raw));return Array.isArray(parsed)?parsed:(parsed&&typeof parsed==="object"?[parsed]:[]);}catch(_){return [];}
}
function ingredientName(item){if(typeof item==="string")return item;return item&&(item.name||item.food||item.ingredient)||"";}
function ingredientQuantity(item){if(!item||typeof item!=="object")return "";return item.quantity||item.amount||"";}
function foodCalories(e){var items=parseIngredients(e);var total=items.reduce(function(sum,item){var n=Number(item&&item.estimated_calories_kcal);return sum+(Number.isFinite(n)?n:0);},0);return total>0?Math.round(total):null;}
function entryDetail(e){return [e.dose&&((e.dose+" "+(e.unit||"")).trim()),e.purpose,e.notes,e.intensity,e.consistency].filter(Boolean).join(" · ");}
function foodStructuredHtml(e){
 var ingredients=parseIngredients(e), notes=e.notes||e.description_notes||"", calories=foodCalories(e);
 // If notes contain a raw JSON ingredient array, remove it from the visible notes.
 notes=String(notes).replace(/\\s*[·•]?\\s*\\[\\s*\\{\\s*["']name["'][\\s\\S]*$/,"").trim();
 var html="";
 if(e.meal_type)html+='<div class="mealLabel">'+esc(e.meal_type)+'</div>';
 if(notes)html+='<div class="foodNotes">'+esc(notes)+'</div>';
 if(calories!==null)html+='<div class="calorieTag">~'+calories+' kcal · estimate</div>';
 if(ingredients.length){html+='<details class="ingredientDetails"><summary>Ingredients ('+ingredients.length+')</summary><ul class="ingredientList">';ingredients.forEach(function(item){var name=ingredientName(item);if(!name)return;var qty=ingredientQuantity(item);var kcal=Number(item&&item.estimated_calories_kcal);html+='<li>'+esc(name)+(qty?' — '+esc(qty):'')+(Number.isFinite(kcal)&&kcal>0?' <span>('+Math.round(kcal)+' kcal)</span>':'')+'</li>';});html+='</ul></details>';}
 return html;
}
function metric(n,label,ico,tint,target){return '<button type="button" class="metric '+tint+'" data-scroll="'+target+'"><span class="ico">'+ico+'</span><strong>'+n+'</strong><small>'+label+'</small></button>';}
function section(title,icon,type,events){var html='<section id="section-'+type+'" class="section '+type+'"><div class="sectionHead"><div class="sectionIcon">'+icon+'</div><div><div class="sectionTitle">'+title+'</div><div class="sectionCount">'+events.length+' '+(events.length===1?'entry':'entries')+' today</div></div></div>';if(!events.length)html+='<div class="empty">Nothing tracked in this section on the selected date</div>';events.forEach(function(e){var when=e.occurred_at||e.taken_at||e.started_at||e.sleep_start||e.wake_at||e.created_at;var isFood=category(e)==="food";html+='<div class="entry"><span class="dot"></span><div class="entryMain"><div class="entryTitle">'+esc(entryTitle(e))+'</div>'+(isFood?foodStructuredHtml(e):(entryDetail(e)?'<div class="entryMeta">'+esc(entryDetail(e))+'</div>':''))+'</div><span class="entryTime">'+esc(dateLabel(when))+'</span></div>';});return html+'</section>';}
function render(){document.querySelectorAll(".nav button").forEach(function(b){b.classList.toggle("on",b.dataset.page===page);});var app=document.getElementById("app");if(page==="today")renderToday(app);else if(page==="history")renderHistory(app);else if(page==="report")renderReport(app);else renderPatterns(app);}
function reportField(label,value,icon){if(!value)return "";return '<div class="card"><div class="row"><b>'+esc(label)+'</b><span>'+icon+'</span></div><p style="font-size:14px;line-height:1.5;margin:9px 0 0;white-space:pre-wrap">'+esc(value)+'</p></div>';}
function renderReport(app){var r=dailyReport&&dailyReport.report;var date=(dashboard&&dashboard.date)||selectedDate||localDateISO();var html='<button class="btn" data-action="back-today">‹ Today</button><h1 style="margin-top:18px">Daily Report</h1><div class="sub">'+esc(date)+'</div>';if(reportLoading){app.innerHTML=html+'<div class="card empty">Loading saved report…</div>';return;}if(!r){app.innerHTML=html+'<div class="card"><b>No saved report for this date</b><p class="muted">Your individual logs are available on Today. A consolidated report will appear here once one has been generated and saved to Daily Reports.</p><button class="btn" data-action="retry-report">Check again</button></div>';return;}html+=reportField("Overall Summary",r.day_summary,"▤")+reportField("Food and Timing",r.food_and_timing_summary,"🍴")+reportField("Symptoms",r.symptom_summary,"◉")+reportField("Bowel Movements",r.bowel_summary,"▣")+reportField("Sleep",r.sleep_summary,"☾")+reportField("Exercise",r.exercise_summary,"↗")+reportField("Key Insights",r.strongest_associations,"⌁")+reportField("Evidence Against / Confounders",r.evidence_against,"≠")+reportField("Missing Data",r.missing_data,"?")+reportField("Next Experiment",r.next_experiment,"→")+reportField("Why This Helps",r.experiment_rationale,"i")+reportField("Safety Note",r.safety_note,"!");html+='<div class="muted" style="text-align:center;margin:16px 0">Report version '+esc(r.version||"1")+' · '+esc(r.status||"saved")+'</div>';app.innerHTML=html;}
function showMedicationForm(){
 var old=document.getElementById("medicationForm");
 if(old){old.remove();return;}
 var box=document.createElement("div");
 box.id="medicationForm";
 box.className="card";
 box.innerHTML='<h2 style="margin-bottom:12px">Log medication or supplement</h2>'+
 '<form id="medicationEntryForm">'+
 '<label class="muted" for="medName">Name (required)</label><input id="medName" name="name" required placeholder="e.g. Vitamin B12" style="display:block;width:100%;font:inherit;padding:11px;border:1px solid #ddd;border-radius:10px;margin:5px 0 10px">'+
 '<label class="muted" for="medDose">Dose</label><input id="medDose" name="dose" placeholder="e.g. 1 or 500" style="display:block;width:100%;font:inherit;padding:11px;border:1px solid #ddd;border-radius:10px;margin:5px 0 10px">'+
 '<label class="muted" for="medUnit">Unit</label><input id="medUnit" name="unit" value="tablet" placeholder="tablet, mg, ml" style="display:block;width:100%;font:inherit;padding:11px;border:1px solid #ddd;border-radius:10px;margin:5px 0 10px">'+
 '<label class="muted" for="medPurpose">Purpose</label><input id="medPurpose" name="purpose" placeholder="Optional" style="display:block;width:100%;font:inherit;padding:11px;border:1px solid #ddd;border-radius:10px;margin:5px 0 10px">'+
 '<label class="muted" for="medNotes">Notes</label><textarea id="medNotes" name="notes" placeholder="Optional" rows="2" style="display:block;width:100%;font:inherit;padding:11px;border:1px solid #ddd;border-radius:10px;margin:5px 0 12px"></textarea>'+
 '<div class="row"><button class="btn" type="submit">Save medication</button><button class="btn" type="button" id="cancelMedication">Cancel</button></div><div id="medicationStatus" class="muted" style="margin-top:10px"></div></form>';
 var today=document.getElementById("app");
 today.insertBefore(box,today.children[2]||null);
 document.getElementById("cancelMedication").addEventListener("click",function(){box.remove();});
 document.getElementById("medicationEntryForm").addEventListener("submit",function(ev){
  ev.preventDefault();
  var values={name:document.getElementById("medName").value.trim(),dose:document.getElementById("medDose").value.trim(),unit:document.getElementById("medUnit").value.trim(),purpose:document.getElementById("medPurpose").value.trim(),notes:document.getElementById("medNotes").value.trim()};
  var query=Object.keys(values).map(function(k){return encodeURIComponent(k)+"="+encodeURIComponent(values[k]);}).join("&");
  document.getElementById("medicationStatus").textContent="Saving…";
  location.href="gutgenie://?action=save-medication&"+query;
 });
 document.getElementById("medName").focus();
}
window.showMedicationForm=showMedicationForm;
window.nativeMedicationStatus=function(message){var el=document.getElementById("medicationStatus");if(el)el.textContent=message;};
function renderToday(app){
 if(!dashboard||!dashboard.success){app.innerHTML='<h1>Gut Genie</h1><div class="sub">Your daily digestive log</div><div class="error">'+esc(dashboard&&dashboard.error||"Dashboard could not load.")+'</div><button class="btn" data-action="refresh">Retry</button>';return;}
 var events=dashboard.events||[],foods=[],symptoms=[],bowel=[],other=[];
 events.forEach(function(e){var c=category(e);if(c==="food")foods.push(e);else if(c==="symptom")symptoms.push(e);else if(c==="bowel")bowel.push(e);else other.push(e);});
 var medications=events.filter(function(e){return kind(e)==="medication";});
 other=other.filter(function(e){return kind(e)!=="medication";});
 var date=dashboard.date||localDateISO();
 var html='<div class="row"><div><h1>Gut Genie</h1><div class="sub" style="margin-bottom:0">Your daily digestive log</div></div><button class="btn" data-action="refresh">↻ Refresh</button></div>';
 html+='<div class="dateSwitch"><button data-date-shift="-1" aria-label="Previous day">‹</button><input id="datePicker" type="date" value="'+esc(date)+'" aria-label="Select date"><button data-date-shift="1" aria-label="Next day">›</button></div>';
 html+='<div class="summary"><div class="summaryHead"><b>Daily summary</b><span>'+esc(date)+'</span></div><div class="metrics">'+metric(foods.length,"Foods","🍴","foodTint","food")+metric(symptoms.length,"Symptoms","〽️","symptomTint","symptom")+metric(bowel.length,"Bowel","🚽","bowelTint","bowel")+metric(other.length,"Other","▤","otherTint","other")+'</div></div>';
 html+='<button class="card" style="width:100%;text-align:left;cursor:pointer" data-action="open-report"><div class="row"><div><b>Daily Report</b><div class="muted" style="margin-top:5px">Summary, possible associations and next steps</div></div><span style="font-size:22px">›</span></div></button>';
 if(dashboard.loading)html+='<div class="card empty">Loading today’s records…</div>';
 html+=section("Foods","🍴","food",foods)+section("Symptoms","〽️","symptom",symptoms)+section("Bowel","🚽","bowel",bowel)+section("Other","▤","other",other);

 html+=section("Medication & Supplements","+","other",medications);
 app.innerHTML=html;
}
function renderHistory(app){var html='<h1>History</h1><div class="sub">Your logs, organized by date · last 30 days</div>';if(!reports){app.innerHTML=html+'<div class="card"><div class="muted">Browse your actual logged entries.</div><button class="btn" data-action="history">Load history</button></div>';return;}var list=reports.events||[];list=list.slice().sort(function(a,b){return String(b.occurred_at||b.taken_at||b.started_at||b.sleep_start||b.local_date||"").localeCompare(String(a.occurred_at||a.taken_at||a.started_at||a.sleep_start||a.local_date||""));});if(!list.length)html+='<div class="card empty">No entries found in the last 30 days.</div>';var lastDate="";list.forEach(function(e){var d=String(e.local_date||"Unknown date").slice(0,10);if(d!==lastDate){html+='<h2 style="margin:18px 2px 8px">'+esc(d)+'</h2>';lastDate=d;}var isFood=category(e)==="food";var when=e.occurred_at||e.taken_at||e.started_at||e.sleep_start||e.created_at;html+='<div class="card"><div class="row"><div style="min-width:0;flex:1"><b>'+esc(entryTitle(e))+'</b>'+(isFood?'<div>'+((e.meal_type)?'<span class="mealLabel">'+esc(e.meal_type)+'</span>':'')+'</div>':'')+'</div><span class="pill">'+esc(kind(e))+'</span></div><div class="muted" style="margin-top:5px">'+esc(dateLabel(when))+'</div>'+(isFood?foodStructuredHtml(e):(entryDetail(e)?'<p style="font-size:13px;line-height:1.45;color:#626d67">'+esc(entryDetail(e))+'</p>':''))+'</div>';});app.innerHTML=html;}
function renderPatterns(app){var html='<h1>Patterns</h1><div class="sub">Hypotheses, not diagnoses</div>';if(!hypotheses){app.innerHTML=html+'<div class="card"><div class="muted">Load hypotheses and their supporting or contradictory evidence.</div><button class="btn" data-action="patterns">Load patterns</button></div>';return;}var list=hypotheses.hypotheses||[];if(!list.length)html+='<div class="card empty">No hypotheses recorded yet.</div>';list.forEach(function(h){html+='<div class="card"><div class="row"><b>'+esc(h.hypothesis||"Possible association")+'</b><span class="pill">'+esc(h.confidence||"Unknown")+'</span></div><p>'+esc(h.confidence_rationale||"")+'</p><div class="muted">For: '+esc(h.supporting_evidence||"Not recorded")+'</div><div class="muted" style="margin-top:6px">Against: '+esc(h.evidence_against||"Not recorded")+'</div><p class="muted">Next test: '+esc(h.next_test||"Not recorded")+'</p></div>';});app.innerHTML=html;}
document.addEventListener("click",function(event){var target=event.target.closest("button");if(!target)return;if(target.dataset.page){page=target.dataset.page;render();return;}if(target.dataset.dateShift){shiftDate(Number(target.dataset.dateShift));return;}if(target.dataset.scroll){var section=document.getElementById("section-"+target.dataset.scroll);if(section)section.scrollIntoView({behavior:"smooth",block:"start"});return;}if(target.dataset.action==="open-report"){openDailyReport();return;}if(target.dataset.action==="back-today"){page="today";render();return;}if(target.dataset.action==="retry-report"){reportLoading=true;render();nativeRequest("report",dashboard.date||selectedDate||localDateISO());return;}if(target.dataset.action)nativeRequest(target.dataset.action,target.dataset.action==="refresh"?(dashboard.date||selectedDate):null);});
document.addEventListener("change",function(event){if(event.target&&event.target.id==="datePicker")chooseDate(event.target.value);});
window.nativeDashboard=function(payload){if(payload.result)dashboard=payload.result;else dashboard={success:false,error:payload.error||"Dashboard request failed."};render();};
window.nativeReport=function(payload){reportLoading=false;if(payload.result)dailyReport=payload.result;else dailyReport={success:false,error:payload.error,report:null};render();};
window.nativeHistory=function(payload){if(payload.result)reports=payload.result;else reports={success:false,error:payload.error,events:[]};render();};
window.nativePatterns=function(payload){if(payload.result)hypotheses=payload.result;else hypotheses={success:false,error:payload.error,hypotheses:[]};render();};
render();
</script></body></html>`;


  try {
    await web.loadHTML(html);
    await web.present();
  } catch (error) {
    // Do not show an Alert here: Scriptable may run this script in a
    // non-interactive execution context where Alerts are unsupported.
    console.error("Gut Genie startup error: " + String(error && error.stack ? error.stack : error));
    throw error;
  }
}
await main();
Script.complete();
