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
  const web = new WebView();
  const initial = {success:true, loading:true, date:localDateISO(), events:[], counts:{}};

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

    if (params.action === "refresh") {
      api("dashboard", {date:localDateISO()})
        .then(result => web.evaluateJavaScript("window.nativeDashboard("+JSON.stringify({result})+")", false))
        .catch(error => web.evaluateJavaScript("window.nativeDashboard("+JSON.stringify({error:String(error)})+")", false));
    } else if (params.action === "history") {
      api("reports", {limit:30})
        .then(result => web.evaluateJavaScript("window.nativeHistory("+JSON.stringify({result})+")", false))
        .catch(error => web.evaluateJavaScript("window.nativeHistory("+JSON.stringify({error:String(error)})+")", false));
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
*{box-sizing:border-box}body{margin:0;padding:22px 15px 110px;background:#faf9f6;color:#171717;font-family:-apple-system,BlinkMacSystemFont,sans-serif}
h1{font-size:34px;font-weight:400;margin:0 0 5px}h2{font-size:22px;font-weight:400;margin:0 0 10px}p{line-height:1.45}.sub{color:#777;font-size:13px;margin-bottom:18px}
button{font:inherit;cursor:pointer}.btn{border:0;border-radius:11px;padding:10px 13px;background:#eeeae3;color:#171717}
.card,.metric{background:#fff;border:1px solid #e5e1d9;border-radius:15px;padding:14px;margin:9px 0}
.row{display:flex;align-items:center;justify-content:space-between;gap:12px}.muted{font-size:12px;color:#777}
.metricGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.metric strong{display:block;font-size:27px;font-weight:400;margin-bottom:3px}
.pill{display:inline-block;border-radius:20px;background:#eeeae3;padding:5px 9px;font-size:12px}
.nav{position:fixed;bottom:0;left:0;right:0;background:#faf9f6;border-top:1px solid #ddd;padding:8px 10px max(8px,env(safe-area-inset-bottom));display:flex;z-index:20}
.nav button{flex:1;border:0;background:none;padding:8px 3px;color:#777;font-size:12px}.nav .on{background:#e3e0da;color:#171717;border-radius:11px}
.empty{text-align:center;color:#777;padding:25px 10px}.event{border-left:2px solid #ddd8cf;padding:1px 0 13px 12px;margin-left:4px}
.event b{font-size:14px;font-weight:600}.event p{font-size:13px;margin:4px 0;color:#555}.section{margin-top:24px}
.error{background:#f7e9e5;border:1px solid #e8c8bf;border-radius:12px;padding:12px;color:#7a3020;font-size:13px;overflow-wrap:anywhere}
</style></head><body><div id="app"><h1>Gut Genie</h1><div class="card">Starting dashboard…</div></div>
<div class="nav"><button id="navToday" class="on" data-page="today">◷<br>Today</button><button id="navHistory" data-page="history">▤<br>History</button><button id="navPatterns" data-page="patterns">⌁<br>Patterns</button></div>
<script>
var dashboard = ${safeInitial}; var reports = null; var hypotheses = null; var page = "today";
function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function showError(message){var app=document.getElementById("app");app.innerHTML='<h1>Gut Genie</h1><div class="error"><b>Dashboard error</b><p>'+esc(message)+'</p></div><button class="btn" data-action="refresh">Retry</button>';}
window.onerror=function(message,source,line,column){showError(String(message)+" (line "+line+", column "+column+")");return false;};
window.onunhandledrejection=function(event){showError(event&&event.reason?String(event.reason.message||event.reason):"Unknown asynchronous error");};
function dateLabel(value){if(!value)return "";var d=new Date(value);return isNaN(d)?"":d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});}
function nativeRequest(action){location.href="gutgenie://?action="+encodeURIComponent(action);}
function render(){document.querySelectorAll(".nav button").forEach(function(b){b.classList.toggle("on",b.dataset.page===page);});var app=document.getElementById("app");if(page==="today")renderToday(app);else if(page==="history")renderHistory(app);else renderPatterns(app);}
function metric(value,label){return '<div class="metric"><strong>'+Number(value||0)+'</strong><span class="muted">'+label+'</span></div>';}
function renderToday(app){
 if(!dashboard||!dashboard.success){app.innerHTML='<h1>Gut Genie</h1><div class="sub">Your digestive patterns, over time</div><div class="error">'+esc(dashboard&&dashboard.error||"Dashboard could not load.")+'</div><button class="btn" data-action="refresh">Retry</button>';return;}
 var counts=dashboard.counts||{},events=dashboard.events||[],report=dashboard.latestReport;
 var html='<div class="row"><div><h1>Gut Genie</h1><div class="sub">Your digestive patterns, over time</div></div><button class="btn" data-action="refresh">↻ Refresh</button></div>';
 html+='<div class="metricGrid">'+metric(counts.food,"Meals & drinks")+metric(counts.symptom,"Symptom logs")+metric(counts.sleep,"Sleep records")+metric(counts.exercise,"Exercise records")+'</div>';
 html+='<div class="section"><div class="row"><h2>Today’s timeline</h2><span class="muted">'+esc(dashboard.date||"")+'</span></div>';
 if(dashboard.loading)html+='<div class="card empty">Loading today’s records…</div>';else if(!events.length)html+='<div class="card empty">No events logged for this day yet.</div>';
 events.forEach(function(e){var time=e.occurred_at||e.started_at||e.sleep_start||e.wake_at;var title=e.description||e.meal_type||e.activity_type||e.event_type||"Event";if(e.event_type==="food")title=e.description||e.meal_type||"Meal";if(e.event_type==="sleep")title="Sleep";if(e.event_type==="symptom")title=e.description||e.symptoms||"Symptoms";html+='<div class="event"><div class="row"><b>'+esc(title)+'</b><span class="muted">'+esc(dateLabel(time))+'</span></div><p>'+esc(e.notes||e.items_json||e.intensity||"")+'</p><span class="pill">'+esc(e.event_type||"event")+'</span></div>';});
 html+='</div><div class="section"><h2>Daily assessment</h2><div class="card">';
 if(report)html+='<div class="row"><span class="pill">'+esc(report.status||"saved")+'</span><span class="muted">Version '+esc(report.version||"1")+'</span></div><p>'+esc(report.day_summary||"Open the report for details.")+'</p><p class="muted">'+esc(report.next_experiment||"No next experiment recorded.")+'</p>';
 else html+='<div class="muted">No daily report available yet.</div>';
 app.innerHTML=html+'</div></div>';
}
function renderHistory(app){var html='<h1>History</h1><div class="sub">Previous daily assessments</div>';if(!reports){app.innerHTML=html+'<div class="card"><div class="muted">Load reports from your spreadsheet.</div><button class="btn" data-action="history">Load history</button></div>';return;}var list=reports.reports||[];if(!list.length)html+='<div class="card empty">No reports saved yet.</div>';list.forEach(function(r){html+='<div class="card"><div class="row"><b>'+esc(r.local_date||"Unknown date")+'</b><span class="pill">'+esc(r.status||"")+'</span></div><p>'+esc(r.day_summary||"No summary available.")+'</p><div class="muted">Version '+esc(r.version||"1")+'</div></div>';});app.innerHTML=html;}
function renderPatterns(app){var html='<h1>Patterns</h1><div class="sub">Hypotheses, not diagnoses</div>';if(!hypotheses){app.innerHTML=html+'<div class="card"><div class="muted">Load hypotheses and their supporting or contradictory evidence.</div><button class="btn" data-action="patterns">Load patterns</button></div>';return;}var list=hypotheses.hypotheses||[];if(!list.length)html+='<div class="card empty">No hypotheses recorded yet.</div>';list.forEach(function(h){html+='<div class="card"><div class="row"><b>'+esc(h.hypothesis||"Possible association")+'</b><span class="pill">'+esc(h.confidence||"Unknown")+'</span></div><p>'+esc(h.confidence_rationale||"")+'</p><div class="muted">For: '+esc(h.supporting_evidence||"Not recorded")+'</div><div class="muted" style="margin-top:6px">Against: '+esc(h.evidence_against||"Not recorded")+'</div><p class="muted">Next test: '+esc(h.next_test||"Not recorded")+'</p></div>';});app.innerHTML=html;}
document.addEventListener("click",function(event){var target=event.target.closest("button");if(!target)return;if(target.dataset.page){page=target.dataset.page;render();return;}if(target.dataset.action)nativeRequest(target.dataset.action);});
window.nativeDashboard=function(payload){if(payload.result)dashboard=payload.result;else dashboard={success:false,error:payload.error||"Dashboard request failed."};render();};
window.nativeHistory=function(payload){if(payload.result)reports=payload.result;else reports={success:false,error:payload.error,reports:[]};render();};
window.nativePatterns=function(payload){if(payload.result)hypotheses=payload.result;else hypotheses={success:false,error:payload.error,hypotheses:[]};render();};
render();
window.addEventListener("load",function(){setTimeout(function(){nativeRequest("refresh");},250);});
</script></body></html>`;

  try { await web.loadHTML(html); await web.present(); }
  catch(error){const alert=new Alert();alert.title="Gut Genie startup error";alert.message=String(error&&error.message?error.message:error);alert.addAction("OK");await alert.present();}
}
await main();
Script.complete();
