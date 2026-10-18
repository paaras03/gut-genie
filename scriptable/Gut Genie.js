// Gut Genie — Scriptable client scaffold
// Follows Recipe Tracker's single-WebView visual architecture.
// Setup:
// 1. Deploy google-apps-script/Code.gs as a Web App.
// 2. In Scriptable, create a Keychain item named "GutGenieApiUrl" with the deployed URL.
// 3. Create a Keychain item named "GutGenieApiToken" with the API_TOKEN Script Property.
// 4. Configure SPREADSHEET_ID and API_TOKEN in Apps Script Script Properties.
// Never commit the real endpoint or token here.

const API_URL_KEY = "GutGenieApiUrl";
const API_TOKEN_KEY = "GutGenieApiToken";
const BUILD_LABEL = "Gut Genie • prototype";

async function api(action, data) {
  if (!Keychain.contains(API_URL_KEY) || !Keychain.contains(API_TOKEN_KEY)) {
    throw new Error("Connection not configured. Add GutGenieApiUrl and GutGenieApiToken to Scriptable Keychain.");
  }
  const req = new Request(Keychain.get(API_URL_KEY));
  req.method = "POST";
  req.headers = { "Content-Type": "application/json" };
  req.body = JSON.stringify(Object.assign({}, data || {}, {
    action: action,
    token: Keychain.get(API_TOKEN_KEY)
  }));
  const raw = await req.loadString();
  let result;
  try { result = JSON.parse(raw); }
  catch (_) { throw new Error("API returned invalid JSON. Check the Web App deployment."); }
  if (!result.success) throw new Error(result.error || "API request failed.");
  return result;
}

function localDateISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

async function main() {
  const web = new WebView();
  let initial;
  try {
    initial = await api("dashboard", {date: localDateISO()});
  } catch (e) {
    initial = { success: false, error: String(e), events: [], counts: {} };
  }

  web.shouldAllowRequest = function(request) {
    if (!request.url.startsWith("gutgenie://")) {
      if (/^https?:\/\//i.test(request.url)) { Safari.open(request.url); return false; }
      return true;
    }
    const raw = request.url.split("?")[1] || "";
    const params = {};
    raw.split("&").forEach(function(part) {
      if (!part) return;
      const bits = part.split("=");
      params[decodeURIComponent(bits[0])] = decodeURIComponent(bits.slice(1).join("="));
    });
    if (params.action === "refresh") {
      api("dashboard", {date: localDateISO()}).then(function(result) {
        web.evaluateJavaScript("window.nativeDashboard(" + JSON.stringify({result: result}) + ")", false);
      }).catch(function(error) {
        web.evaluateJavaScript("window.nativeDashboard(" + JSON.stringify({error: String(error)}) + ")", false);
      });
    } else if (params.action === "history") {
      api("reports", {limit: 30}).then(function(result) {
        web.evaluateJavaScript("window.nativeHistory(" + JSON.stringify({result: result}) + ")", false);
      }).catch(function(error) {
        web.evaluateJavaScript("window.nativeHistory(" + JSON.stringify({error: String(error)}) + ")", false);
      });
    } else if (params.action === "patterns") {
      api("hypotheses", {limit: 100}).then(function(result) {
        web.evaluateJavaScript("window.nativePatterns(" + JSON.stringify({result: result}) + ")", false);
      }).catch(function(error) {
        web.evaluateJavaScript("window.nativePatterns(" + JSON.stringify({error: String(error)}) + ")", false);
      });
    }
    return false;
  };

  const safeInitial = JSON.stringify(initial).replace(/</g, "\\u003c");
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>
*{box-sizing:border-box}body{margin:0;padding:22px 15px 100px;background:#faf9f6;color:#171717;font-family:-apple-system,BlinkMacSystemFont,sans-serif}
h1{font-size:34px;font-weight:400;margin:0 0 5px}h2{font-size:22px;font-weight:400;margin:0 0 10px}.sub{color:#777;font-size:13px;margin-bottom:18px}
button{font:inherit;cursor:pointer}.btn{border:0;border-radius:11px;padding:10px 13px;background:#eeeae3;color:#171717}.primary{background:#171717;color:#fff}
.card{background:#fff;border:1px solid #e5e1d9;border-radius:16px;padding:15px;margin:9px 0}.row{display:flex;align-items:center;justify-content:space-between;gap:12px}.muted{font-size:12px;color:#777}.metricGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.metric{background:#fff;border:1px solid #e5e1d9;border-radius:15px;padding:14px}.metric strong{display:block;font-size:27px;font-weight:400;margin-bottom:3px}.pill{display:inline-block;border-radius:20px;background:#eeeae3;padding:5px 9px;font-size:12px}.nav{position:fixed;bottom:0;left:0;right:0;background:#faf9f6;border-top:1px solid #ddd;padding:8px 10px max(8px,env(safe-area-inset-bottom));display:flex;z-index:20}.nav button{flex:1;border:0;background:none;padding:8px 3px;color:#777;font-size:12px}.nav .on{background:#e3e0da;color:#171717;border-radius:11px}.empty{text-align:center;color:#777;padding:25px 10px}.event{border-left:2px solid #ddd8cf;padding:1px 0 13px 12px;margin-left:4px}.event:last-child{padding-bottom:0}.event b{font-size:14px;font-weight:600}.event p{font-size:13px;line-height:1.45;margin:4px 0;color:#555}.section{margin-top:24px}.error{background:#f7e9e5;border:1px solid #e8c8bf;border-radius:12px;padding:12px;color:#7a3020;font-size:13px}
</style></head><body><div id="app"></div>
<div class="nav"><button id="navToday" class="on" onclick="showPage('today')">◷<br>Today</button><button id="navHistory" onclick="showPage('history')">▤<br>History</button><button id="navPatterns" onclick="showPage('patterns')">⌁<br>Patterns</button></div>
<script>
var dashboard = ${safeInitial}; var reports = null; var hypotheses = null; var page = "today";
function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function dateLabel(v){if(!v)return "";var d=new Date(v);return isNaN(d)?"":d.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});}
function showPage(p){page=p;document.querySelectorAll(".nav button").forEach(function(b){b.classList.remove("on")});document.getElementById(p==="today"?"navToday":p==="history"?"navHistory":"navPatterns").classList.add("on");render();}
function refresh(){document.getElementById("app").innerHTML='<h1>Gut Genie</h1><div class="empty">Refreshing…</div>';location.href="gutgenie://?action=refresh";}
function render(){var a=document.getElementById("app");if(page==="today")renderToday(a);else if(page==="history")renderHistory(a);else renderPatterns(a);}
function renderToday(a){
 if(!dashboard||!dashboard.success){a.innerHTML='<h1>Gut Genie</h1><div class="sub">Your digestive patterns, over time</div><div class="error">'+esc(dashboard&&dashboard.error||"Could not load dashboard. Check the Scriptable connection.")+'</div><button class="btn" onclick="refresh()">Retry</button><div class="section muted">Connection setup is documented in the project README.</div>';return;}
 var counts=dashboard.counts||{};var events=dashboard.events||[];
 var report=dashboard.latestReport;
 var html='<div class="row"><div><h1>Gut Genie</h1><div class="sub">Your digestive patterns, over time</div></div><button class="btn" onclick="refresh()">↻</button></div>';
 html+='<div class="metricGrid"><div class="metric"><strong>'+Number(counts.food||0)+'</strong><span class="muted">Meals & drinks</span></div><div class="metric"><strong>'+Number(counts.symptom||0)+'</strong><span class="muted">Symptom logs</span></div><div class="metric"><strong>'+Number(counts.sleep||0)+'</strong><span class="muted">Sleep records</span></div><div class="metric"><strong>'+Number(counts.exercise||0)+'</strong><span class="muted">Exercise records</span></div></div>';
 html+='<div class="section"><div class="row"><h2>Today’s timeline</h2><span class="muted">'+esc(dashboard.date||"")+'</span></div>';
 if(!events.length)html+='<div class="card empty">No events logged for this day yet.</div>';
 events.forEach(function(e){var t=e.occurred_at||e.started_at||e.sleep_start||e.wake_at;var title=e.description||e.meal_type||e.activity_type||e.event_type||"Event";if(e.event_type==="symptom")title=e.description||((e.symptoms||"Symptoms")+((e.gas_level)?" · Gas "+e.gas_level:""));if(e.event_type==="food")title=e.description||"Meal";if(e.event_type==="sleep")title="Sleep";html+='<div class="event"><div class="row"><b>'+esc(title)+'</b><span class="muted">'+esc(dateLabel(t))+'</span></div><p>'+esc(e.notes||e.items_json||e.intensity||"")+'</p><span class="pill">'+esc(e.event_type)+'</span></div>';});
 html+='</div><div class="section"><h2>Daily assessment</h2><div class="card">'+(report?'<div class="row"><span class="pill">'+esc(report.status||"saved")+'</span><span class="muted">Version '+esc(report.version||"1")+'</span></div><p>'+esc(report.day_summary||"Open the report for details.")+'</p><p class="muted">'+esc(report.next_experiment||"No next experiment recorded.")+'</p>':'<div class="muted">No daily report available yet. The analysis engine is not connected in this prototype.</div>')+'</div></div>';
 a.innerHTML=html;
}
function renderHistory(a){var html='<h1>History</h1><div class="sub">Previous daily assessments</div>';if(!reports){html+='<div class="card"><div class="muted">Load reports from your spreadsheet.</div><button class="btn" onclick="location.href=\'gutgenie://?action=history\'">Load history</button></div>';a.innerHTML=html;return;}var list=reports.reports||[];if(!list.length)html+='<div class="card empty">No reports saved yet.</div>';list.forEach(function(r){html+='<div class="card"><div class="row"><b>'+esc(r.local_date||"Unknown date")+'</b><span class="pill">'+esc(r.status||"")+'</span></div><p>'+esc(r.day_summary||"No summary available.")+'</p><div class="muted">Version '+esc(r.version||"1")+'</div></div>';});a.innerHTML=html;}
function renderPatterns(a){var html='<h1>Patterns</h1><div class="sub">Hypotheses, not diagnoses</div>';if(!hypotheses){html+='<div class="card"><div class="muted">Load current hypotheses and their supporting/contradictory evidence.</div><button class="btn" onclick="location.href=\'gutgenie://?action=patterns\'">Load patterns</button></div>';a.innerHTML=html;return;}var list=hypotheses.hypotheses||[];if(!list.length)html+='<div class="card empty">No hypotheses recorded yet.</div>';list.forEach(function(h){html+='<div class="card"><div class="row"><b>'+esc(h.hypothesis||"Possible association")+'</b><span class="pill">'+esc(h.confidence||"Unknown")+'</span></div><p>'+esc(h.confidence_rationale||"")+'</p><div class="muted">For: '+esc(h.supporting_evidence||"Not recorded")+'</div><div class="muted" style="margin-top:6px">Against: '+esc(h.evidence_against||"Not recorded")+'</div><p class="muted">Next test: '+esc(h.next_test||"Not recorded")+'</p></div>';});a.innerHTML=html;}
window.nativeDashboard=function(payload){if(payload.result)dashboard=payload.result;else dashboard={success:false,error:payload.error};render();};
window.nativeHistory=function(payload){if(payload.result)reports=payload.result;else reports={success:false,error:payload.error,reports:[]};render();};
window.nativePatterns=function(payload){if(payload.result)hypotheses=payload.result;else hypotheses={success:false,error:payload.error,hypotheses:[]};render();};
render();
</script></body></html>`;
  await web.loadHTML(html);
  await web.present();
}

await main();
