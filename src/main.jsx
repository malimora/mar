import "./styles.css";
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./lib/supabaseClient";

function IconBase({ children, className = "h-5 w-5", viewBox = "0 0 24 24" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

function BellIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </IconBase>
  );
}

function ClockIcon({ className }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </IconBase>
  );
}

function PillIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M9 7a4 4 0 0 1 6 0l2 2a4 4 0 0 1 0 6 4 4 0 0 1-6 0l-2-2a4 4 0 0 1 0-6Z" />
      <path d="m10 14 4-4" />
    </IconBase>
  );
}

function SettingsIcon({ className }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="m4.9 4.9 2.1 2.1" />
      <path d="m17 17 2.1 2.1" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
      <path d="m4.9 19.1 2.1-2.1" />
      <path d="M17 7l2.1-2.1" />
    </IconBase>
  );
}

function SunIcon({ className }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5" />
      <path d="M12 19.5V22" />
      <path d="m4.9 4.9 1.8 1.8" />
      <path d="m17.3 17.3 1.8 1.8" />
      <path d="M2 12h2.5" />
      <path d="M19.5 12H22" />
      <path d="m4.9 19.1 1.8-1.8" />
      <path d="m17.3 6.7 1.8-1.8" />
    </IconBase>
  );
}

function TrashIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 12h10l1-12" />
      <path d="M9 4h6l1 3H8l1-3Z" />
    </IconBase>
  );
}

const STORAGE_KEY = "med-schedule-pwa-v6";

const DEFAULT_PLANS = [
  { id: "regular-tramadol", label: "Regular Tramadol", medication: "Tramadol 50mg", intervalMinutes: 360, baseTimes: ["06:00", "12:00", "18:00", "00:00"], kind: "required", paracetamolMg: 0, tramadolMg: 50 },
  { id: "regular-paracetamol", label: "Regular Paracetamol", medication: "Paracetamol 500mg", intervalMinutes: 360, baseTimes: ["06:00", "12:00", "18:00", "00:00"], kind: "required", paracetamolMg: 500, tramadolMg: 0 },
  { id: "prn", label: "As-needed Tramadol", medication: "Tramadol 50 mg", intervalMinutes: 240, baseTimes: ["10:00", "16:00", "22:00"], kind: "optional", paracetamolMg: 0, tramadolMg: 50 },
];
const DEFAULT_SETTINGS = { plans: DEFAULT_PLANS, tramadolSpacingMinutes: 240, reminders: { regularDue: true, prnCheckIn: true, missedRegular: true, midnightDose: true } };
const DEFAULT_UI = {};

function cloneDefaultPlans() { return DEFAULT_PLANS.map((plan) => ({ ...plan, baseTimes: [...plan.baseTimes] })); }
function cloneDefaultSettings() { return { ...DEFAULT_SETTINGS, plans: cloneDefaultPlans(), reminders: { ...DEFAULT_SETTINGS.reminders } }; }
function getInitialState() { return { settings: cloneDefaultSettings(), events: [], ui: { ...DEFAULT_UI } }; }
function isBrowser() { return typeof window !== "undefined" && typeof document !== "undefined"; }
function parseClockTime(value) { const m=String(value||"").trim().match(/^(\d{1,2}):(\d{2})$/); if(!m) return null; const h=Number(m[1]),min=Number(m[2]); if(!Number.isInteger(h)||!Number.isInteger(min)||h<0||h>23||min<0||min>59) return null; return h*60+min; }
function pad(value) { return String(value).padStart(2, "0"); }
function toLocalInputValue(dateLike) { const d=new Date(dateLike); if(Number.isNaN(d.getTime())) return ""; return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function fromLocalInputValue(value) { if(!value) return null; const p=new Date(value); return Number.isNaN(p.getTime()) ? null : p; }
function formatTime(d) { const x=new Date(d); if(Number.isNaN(x.getTime())) return "—"; return new Intl.DateTimeFormat([], {hour:"numeric", minute:"2-digit"}).format(x); }
function formatDate(d) { const x=new Date(d); if(Number.isNaN(x.getTime())) return "—"; return new Intl.DateTimeFormat([], {weekday:"short", month:"short", day:"numeric"}).format(x); }
function formatDateTime(d) { const x=new Date(d); if(Number.isNaN(x.getTime())) return "—"; return new Intl.DateTimeFormat([], {weekday:"short", month:"short", day:"numeric", hour:"numeric", minute:"2-digit"}).format(x); }
function formatRelative(ms) { const a=Math.abs(Number.isFinite(ms)?ms:0),days=Math.floor(a/86400000),hours=Math.floor((a%86400000)/3600000),mins=Math.floor((a%3600000)/60000); const parts=[]; if(days) parts.push(`${days}d`); if(hours) parts.push(`${hours}h`); if(!days) parts.push(`${mins}m`); return parts.join(" "); }
function classNames(...parts) { return parts.filter(Boolean).join(" "); }
function normalizePlans(plans) { const defaults=cloneDefaultPlans(); const input=Array.isArray(plans)?plans:[]; return defaults.map((basePlan)=>{const incoming=input.find((i)=>i&&i.id===basePlan.id)||{}; return {...basePlan, ...incoming, baseTimes:Array.isArray(incoming.baseTimes)&&incoming.baseTimes.length ? incoming.baseTimes.filter((v)=>parseClockTime(v)!==null) : [...basePlan.baseTimes], tramadolMg:Number.isFinite(Number(incoming.tramadolMg))&&Number(incoming.tramadolMg)>=0?Number(incoming.tramadolMg):Number(basePlan.tramadolMg)||0};}); }
function getPlanMap(plans) { return plans.reduce((map, plan) => { map[plan.id] = plan; return map; }, {}); }
function normalizeEvents(events, plans) { const planMap=getPlanMap(plans); if(!Array.isArray(events)) return []; return events.filter((e)=>e&&typeof e==="object"&&planMap[e.planId]).map((event)=>{const actualDate=new Date(event.actualAt); if(Number.isNaN(actualDate.getTime())) return null; const plan=planMap[event.planId]; return {id:String(event.id||`${event.planId}-${actualDate.getTime()}`),planId:event.planId,status:["taken","skipped","not-needed"].includes(event.status)?event.status:"taken",actualAt:actualDate.toISOString(),note:String(event.note||""),painBefore:event.painBefore==null?null:Number(event.painBefore),painAfter:event.painAfter==null?null:Number(event.painAfter),createdAt:event.createdAt?new Date(event.createdAt).toISOString():actualDate.toISOString(),containsTramadol:typeof event.containsTramadol==="boolean"?event.containsTramadol:Number(plan.tramadolMg) > 0};}).filter(Boolean).sort((a,b)=>new Date(a.actualAt)-new Date(b.actualAt)); }
function normalizeAppState(raw) { const defaults=getInitialState(); const settings={...defaults.settings, ...(raw&&raw.settings?raw.settings:{}), plans:normalizePlans(raw&&raw.settings?raw.settings.plans:null), reminders:{...defaults.settings.reminders, ...(raw&&raw.settings&&raw.settings.reminders?raw.settings.reminders:{})}}; return { settings, events: normalizeEvents(raw&&raw.events?raw.events:[], settings.plans), ui:{...DEFAULT_UI, ...(raw&&raw.ui?raw.ui:{})}}; }
function getEventsByPlan(events, planId, until) { const limit=until?new Date(until).getTime():null; return (Array.isArray(events)?events:[]).filter((e)=>e.planId===planId).filter((e)=>(limit===null?true:new Date(e.actualAt).getTime()<=limit)).sort((a,b)=>new Date(a.actualAt)-new Date(b.actualAt)); }
function getLatestTakenEventByPlan(events, planId, until) { const taken=getEventsByPlan(events, planId, until).filter((e)=>e.status==="taken"); return taken[taken.length-1]||null; }
function getLatestTramadolEvent(events, until) { const limit=until?new Date(until).getTime():null; return [...(Array.isArray(events)?events:[])].filter((e)=>e.status==="taken"&&e.containsTramadol).filter((e)=>(limit===null?true:new Date(e.actualAt).getTime()<=limit)).sort((a,b)=>new Date(a.actualAt)-new Date(b.actualAt)).slice(-1)[0]||null; }
function getReferenceCandidates(baseTimes, effectiveNow) { const parsed=(Array.isArray(baseTimes)?baseTimes:[]).map(parseClockTime).filter((v)=>v!==null); if(!parsed.length) return []; const base=new Date(effectiveNow); base.setHours(0,0,0,0); const c=[]; for(let d=-1;d<=2;d+=1){parsed.forEach((m)=>{const x=new Date(base); x.setDate(base.getDate()+d); x.setHours(Math.floor(m/60),m%60,0,0); c.push(x);});} return c.sort((a,b)=>a-b); }
function getReferenceScheduleState(plan, now) { const candidates=getReferenceCandidates(plan.baseTimes, now); const n=now.getTime(); return { previous:[...candidates].filter((d)=>d.getTime()<=n).slice(-1)[0]||null, next:candidates.find((d)=>d.getTime()>n)||null }; }
function getRegularPlanState(plan, events, now) { const lastTaken=getLatestTakenEventByPlan(events, plan.id, now); if(lastTaken){const nextDueAt=new Date(new Date(lastTaken.actualAt).getTime()+plan.intervalMinutes*60000); const delta=nextDueAt.getTime()-now.getTime(); return {lastTaken,nextDueAt,status:delta<0?"overdue":delta<=1800000?"due-soon":"tracking"};} const reference=getReferenceScheduleState(plan, now); if(reference.previous){ return {lastTaken:null,nextDueAt:reference.previous,status:now.getTime()>reference.previous.getTime()?"overdue":"due-soon"}; } return {lastTaken:null,nextDueAt:reference.next,status:reference.next?"upcoming":"empty"}; }
function getPrnPlanState(plan, events, settings, now) { const lastTaken=getLatestTakenEventByPlan(events, plan.id, now); const lastTramadol=getLatestTramadolEvent(events, now); const nextByPlan=lastTaken?new Date(new Date(lastTaken.actualAt).getTime()+plan.intervalMinutes*60000):null; const nextBySafety=lastTramadol?new Date(new Date(lastTramadol.actualAt).getTime()+settings.tramadolSpacingMinutes*60000):null; const c=[nextByPlan,nextBySafety].filter(Boolean); const availableAt=c.length?new Date(Math.max(...c.map((d)=>d.getTime()))):now; return {lastTaken,availableAt,available:now.getTime()>=availableAt.getTime()}; }
function parsePainValue(value){ if(value==="") return null; const n=Number(value); if(!Number.isFinite(n)) return null; return Math.max(0,Math.min(10,n)); }
function getHistoryFilterStart(filter, now){ if(filter==="all") return null; const s=new Date(now); s.setHours(0,0,0,0); if(filter==="today") return s; if(filter==="3d"){s.setDate(s.getDate()-2);return s;} if(filter==="7d"){s.setDate(s.getDate()-6);return s;} return null; }
function filterEventsByHistory(events,filter,now){ const start=getHistoryFilterStart(filter, now); const safe=Array.isArray(events)?events:[]; const filtered=start?safe.filter((e)=>new Date(e.actualAt).getTime()>=start.getTime()):safe; return [...filtered].sort((a,b)=>new Date(b.actualAt)-new Date(a.actualAt)); }
function summarizeEvents(events, plans){ const planMap=getPlanMap(plans); const takenRegular=events.filter((e)=>planMap[e.planId]?.kind==="required"&&e.status==="taken").length; const takenPrn=events.filter((e)=>e.planId==="prn"&&e.status==="taken").length; const skippedRegular=events.filter((e)=>planMap[e.planId]?.kind==="required"&&e.status==="skipped").length; const notNeededPrn=events.filter((e)=>e.planId==="prn"&&e.status==="not-needed").length; const paracetamolMg=events.filter((e)=>e.status==="taken").reduce((sum,e)=>sum+Number((planMap[e.planId]&&planMap[e.planId].paracetamolMg)||0),0); const highestPain=events.map((e)=>Number(e.painBefore)).filter((v)=>Number.isFinite(v)&&v>=0).sort((a,b)=>b-a)[0]; return {takenRegular,takenPrn,skippedRegular,notNeededPrn,paracetamolMg,highestPain}; }
function groupEventsByDate(events){ return events.reduce((g,e)=>{const key=new Date(e.actualAt).toDateString(); if(!g[key]) g[key]=[]; g[key].push(e); return g;},{}); }
function formatStatus(status){ if(status==="not-needed") return "Not needed"; if(status==="skipped") return "Skipped"; return "Taken"; }
function formatDeviation(ms){ if(!Number.isFinite(ms)) return null; const abs=Math.abs(ms); const min=Math.round(abs/60000); if(!min) return "On time"; if(ms===0) return "On time"; return ms<0?`${min} min early`:`${min} min late`; }
function toDayKey(d){ const x=new Date(d); return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`; }
function isSameDay(a,b){ return toDayKey(a)===toDayKey(b); }
function statusTone(status){ if(status==="taken") return "bg-emerald-50 text-emerald-700 border-emerald-200"; if(status==="late"||status==="due-now") return "bg-amber-50 text-amber-700 border-amber-200"; if(status==="missed") return "bg-rose-50 text-rose-700 border-rose-200"; return "bg-slate-100 text-slate-700 border-slate-200"; }
function getSpacingWarning(events, plans, planId, candidateAt, spacingMinutes){ const plan=plans.find((i)=>i.id===planId); if(!plan||Number(plan.tramadolMg)<=0) return null; const previous=getLatestTramadolEvent(events, candidateAt); if(!previous) return null; const candidateMs=new Date(candidateAt).getTime(); const previousMs=new Date(previous.actualAt).getTime(); if(!Number.isFinite(candidateMs)||!Number.isFinite(previousMs)) return null; const elapsed=candidateMs-previousMs; if(elapsed<0||elapsed>=spacingMinutes*60000) return null; return {previous, elapsed}; }
function getParacetamolToday(events, plans, now){ const planMap=getPlanMap(plans); const dayStart=new Date(now); dayStart.setHours(0,0,0,0); return events.filter((e)=>e.status==="taken").filter((e)=>{const t=new Date(e.actualAt).getTime(); return t>=dayStart.getTime()&&t<=now.getTime();}).reduce((sum,e)=>sum+Number((planMap[e.planId]&&planMap[e.planId].paracetamolMg)||0),0); }

function AppHeader({ installPromptEvent, onInstall }) { return <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Recovery medication tracker</p><h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Medication Schedule</h1></div>{installPromptEvent?<button onClick={onInstall} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">Install app</button>:null}</div></div>; }
function Field({ label, children }) { return <label className="block"><div className="mb-2 text-sm font-medium text-slate-700">{label}</div>{children}</label>; }
function SummaryTile({ label, value }) { return <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-lg font-semibold text-slate-900">{value}</div></div>; }
function OverviewMetric({ label, value }) { return <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-slate-200"><div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-sm font-semibold text-slate-900">{value}</div></div>; }

function TodayDashboard({ events, plans, prnState, effectiveNow, onOpen, onDelete }) {
  const regularPlans = plans.filter((p) => p.kind === "required");
  const slots = ["06:00","12:00","18:00","00:00"].map((time) => {
    const [h,m] = time.split(":").map(Number); const scheduled = new Date(effectiveNow); scheduled.setHours(h,m,0,0);
    const tracks = regularPlans.map((plan) => {
      const matched = events.find((e)=>e.planId===plan.id && e.status==="taken" && isSameDay(e.actualAt,effectiveNow) && Math.abs(new Date(e.actualAt).getTime()-scheduled.getTime())<3*3600000);
      const delta = matched ? new Date(matched.actualAt).getTime()-scheduled.getTime() : null;
      const status = matched ? "taken" : effectiveNow.getTime()>scheduled.getTime()+90*60000 ? "missed" : Math.abs(effectiveNow.getTime()-scheduled.getTime())<=30*60000 ? "due-now" : effectiveNow.getTime()>scheduled.getTime() ? "late" : "upcoming";
      return { plan, matched, delta, status };
    });
    return {time, scheduled, tracks};
  });
  const nextSlot = slots.find((s)=>s.tracks.some((t)=>!t.matched && t.status!=="missed")) || slots[0];
  const primaryTrack = nextSlot.tracks[0];
  const heroTone = statusTone(primaryTrack?.matched ? "taken" : (primaryTrack?.status || "upcoming"));
  const heroStatus = primaryTrack?.matched ? `Taken at ${formatTime(primaryTrack.matched.actualAt)}` : primaryTrack?.status==="due-now" ? "Due now" : primaryTrack?.status==="late" ? `Late by ${formatRelative(effectiveNow.getTime()-nextSlot.scheduled.getTime())}` : `Due in ${formatRelative(nextSlot.scheduled.getTime()-effectiveNow.getTime())}`;
  const avgDelta = slots.flatMap((s)=>s.tracks.filter((t)=>t.delta!=null).map((t)=>t.delta));
  const avgDelay = avgDelta.length ? Math.round(avgDelta.reduce((a,b)=>a+b,0)/avgDelta.length/60000) : null;
  const sortedRegular = events.filter((e) => regularPlans.some((plan) => plan.id === e.planId) && e.status === "taken").sort((a, b) => new Date(a.actualAt) - new Date(b.actualAt));
  const painPair = sortedRegular.find((e)=>e.painBefore!=null && e.painAfter!=null);
  const todayEvents = [...events].filter((e)=>isSameDay(e.actualAt,effectiveNow)).sort((a,b)=>new Date(a.actualAt)-new Date(b.actualAt));
  return <div className="space-y-4">
    <div className="flex items-end justify-between"><div><h2 className="text-2xl font-semibold text-slate-900">Today</h2><p className="text-sm text-slate-500">{formatDateTime(effectiveNow)}</p></div></div>
    <section className={classNames("rounded-3xl border p-6 shadow-sm", heroTone)}><p className="text-sm font-medium">Next scheduled medication</p><p className="mt-2 text-4xl font-semibold">{nextSlot.time}</p>{nextSlot.tracks.map((track)=><div key={track.plan.id} className="mt-2 flex items-center justify-between"><span className="text-sm">{track.plan.medication}</span><button onClick={()=>onOpen(track.plan.id,"taken")} className="rounded-xl bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Log</button></div>)}<p className="mt-2 text-sm font-semibold">{heroStatus}</p></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-semibold">Today’s regular plan</h3><div className="mt-4 space-y-3">{slots.map((slot)=><div key={slot.time} className="rounded-2xl border border-slate-200 p-3"><div className="text-sm font-semibold">{slot.time}</div>{slot.tracks.map((track)=><div key={track.plan.id} className="mt-2 text-xs text-slate-600">{track.plan.medication}: {track.matched?`Taken at ${formatTime(track.matched.actualAt)}, ${formatDeviation(track.delta)}`:"Upcoming"} {!track.matched?<button onClick={()=>onOpen(track.plan.id,'taken')} className="ml-2 rounded border px-2 py-0.5">Log</button>:null}</div>)}</div>)}</div></section>
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="font-semibold">Regular dose</h3><p className="mt-2 text-sm">Paracetamol 500 mg</p><p className="text-sm">Tramadol 50 mg</p><p className="mt-2 text-sm text-slate-600">Every 6 hours</p><p className="text-sm text-slate-600">06:00 · 12:00 · 18:00 · 00:00</p></section>
      <section className="rounded-3xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-sm"><h3 className="font-semibold text-indigo-900">As-needed medication</h3><p className="mt-2 text-sm">Tramadol</p><p className="text-sm text-indigo-700">Optional breakthrough dose</p><p className="mt-2 text-sm text-indigo-700">{prnState.available?"Available now":`Available from ${formatTime(prnState.availableAt)}`}</p><p className="mt-1 text-sm text-indigo-700">Used today: {events.filter((e)=>e.planId==="prn"&&e.status==="taken"&&isSameDay(e.actualAt,effectiveNow)).length}</p></section>
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="font-semibold">Regular progress</h3>{regularPlans.map((plan)=>{const taken=slots.filter((s)=>s.tracks.find((t)=>t.plan.id===plan.id&&t.matched)).length; return <p key={plan.id} className="mt-2 text-sm">{plan.medication}: {taken} / 4 taken</p>})}</section>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="font-semibold">Timing deviation</h3><p className="mt-2 text-sm">{avgDelay==null?"No timing data yet":`Usually ${avgDelay<0?`${Math.abs(avgDelay)} min early`:avgDelay>0?`${avgDelay} min late`:"On time"}`}</p></section>
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="font-semibold">Pain response</h3><p className="mt-2 text-sm">{painPair?`${painPair.painBefore} → ${painPair.painAfter} after medication (${painPair.painAfter-painPair.painBefore})`:"Log pain before and after doses to see response trends"}</p></section>
    </div>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-semibold">Today timeline</h3><div className="mt-3 space-y-2">{todayEvents.length===0?<p className="text-sm text-slate-500">No events yet today.</p>:todayEvents.map((event)=><div key={event.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3 text-sm"><div><div className="font-medium">{formatTime(event.actualAt)} · {event.planId==="prn"?"As-needed":"Regular dose"}</div><div className="text-slate-500">{formatStatus(event.status)}{event.painBefore!=null?` · Pain ${event.painBefore}${event.painAfter!=null?`→${event.painAfter}`:""}`:""}{event.note?` · ${event.note}`:""}</div></div><button onClick={() => onDelete(event.id)} className="rounded-xl border border-slate-200 p-2 text-slate-500"><TrashIcon className="h-4 w-4" /></button></div>)}</div></section>
  </div>;
}

function SettingsPanel({ settings, onChange, onReset, notificationPermission, onRequestNotifications, saveStatus }) { const [draftPlans,setDraftPlans]=useState(settings.plans); useEffect(()=>{setDraftPlans(settings.plans)},[settings.plans]); function updatePlan(planId,patch){setDraftPlans((current)=>current.map((plan)=>(plan.id===planId?{...plan,...patch}:plan)));} function savePlans(){const cleanedPlans=draftPlans.map((plan)=>{const baseTimes=String(plan.baseTimes||"").split(",").map((v)=>v.trim()).filter(Boolean).filter((v)=>parseClockTime(v)!==null); return {...plan, intervalMinutes:Number.isFinite(Number(plan.intervalMinutes))&&Number(plan.intervalMinutes)>0?Number(plan.intervalMinutes):1, paracetamolMg:Number.isFinite(Number(plan.paracetamolMg))&&Number(plan.paracetamolMg)>=0?Number(plan.paracetamolMg):0, tramadolMg:Number.isFinite(Number(plan.tramadolMg))&&Number(plan.tramadolMg)>=0?Number(plan.tramadolMg):0, baseTimes};}); if(cleanedPlans.some((plan)=>!plan.baseTimes.length)){alert("Please use base times like 06:00, 12:00, 18:00."); return;} onChange({ ...settings, plans: cleanedPlans }); }
return <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]"><section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><SettingsIcon className="h-5 w-5 text-slate-700" /><h2 className="text-lg font-semibold text-slate-900">Plan settings</h2></div><div className="mt-4 space-y-4">{draftPlans.map((plan)=><div key={plan.id} className="rounded-3xl border border-slate-200 p-4"><div className="mb-4 text-base font-semibold text-slate-900">{plan.label}</div><div className="grid gap-4 sm:grid-cols-2"><Field label="Medication name"><input value={plan.medication} onChange={(e)=>updatePlan(plan.id,{medication:e.target.value})} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-300"/></Field><Field label="Interval (minutes)"><input type="number" min={1} step={1} value={plan.intervalMinutes} onChange={(e)=>updatePlan(plan.id,{intervalMinutes:e.target.value})} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-300"/></Field><Field label="Reference times"><input value={Array.isArray(plan.baseTimes)?plan.baseTimes.join(", "):String(plan.baseTimes||"")} onChange={(e)=>updatePlan(plan.id,{baseTimes:e.target.value})} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-300" placeholder="06:00, 12:00, 18:00"/></Field><Field label="Paracetamol per dose (mg)"><input type="number" min={0} step={1} value={plan.paracetamolMg} onChange={(e)=>updatePlan(plan.id,{paracetamolMg:e.target.value})} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-300"/></Field><Field label="Tramadol per dose (mg)"><input type="number" min={0} step={1} value={plan.tramadolMg ?? 0} onChange={(e)=>updatePlan(plan.id,{tramadolMg:e.target.value})} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-300"/></Field></div></div>)}<Field label="Shared Tramadol spacing (minutes)"><input type="number" min={0} step={1} value={settings.tramadolSpacingMinutes} onChange={(e)=>onChange({...settings,tramadolSpacingMinutes:Number.isFinite(Number(e.target.value))&&Number(e.target.value)>=0?Number(e.target.value):0})} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-300"/></Field><div className="flex flex-wrap items-center gap-3"><button onClick={savePlans} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Save plan changes</button><button onClick={onReset} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">Reset defaults</button>{saveStatus === "saving" ? <span className="text-sm text-slate-500">Saving…</span> : null}{saveStatus === "saved" ? <span className="text-sm text-emerald-700">Saved ✓</span> : null}{saveStatus === "error" ? <span className="text-sm text-rose-700">Save failed. Check connection and try again.</span> : null}</div></div></section><section className="space-y-4"><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><BellIcon className="h-5 w-5 text-slate-700" /><h2 className="text-lg font-semibold text-slate-900">Reminder preferences</h2></div><div className="mt-4 space-y-3">{[["regularDue","Regular dose due"],["prnCheckIn","As-needed check-in"],["missedRegular","Missed regular dose"],["midnightDose","Bedtime / midnight dose"]].map(([key,label])=><label key={key} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3"><span className="text-sm text-slate-700">{label}</span><input type="checkbox" checked={Boolean(settings.reminders[key])} onChange={(e)=>onChange({...settings,reminders:{...settings.reminders,[key]:e.target.checked}})} className="h-4 w-4"/></label>)}</div><div className="mt-4 rounded-2xl border border-slate-200 p-4 text-sm text-slate-600"><div>Browser notification permission: <span className="font-medium text-slate-900">{notificationPermission}</span></div><button onClick={onRequestNotifications} className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700">Enable notifications</button><p className="mt-3 leading-6 text-slate-500">Manual time entry happens when logging an event, so the main screen stays calmer and simpler.</p></div></div><div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm"><h3 className="text-base font-semibold text-slate-900">Rolling dose logic</h3><p className="mt-2 text-sm leading-6 text-slate-700">Regular doses become due from the last regular dose time plus the regular interval. PRN remains optional, but respects its own interval and the shared Tramadol spacing rule.</p></div></section></div>; }

function ActionSheet({ open, plans, events, settings, effectiveNow, sheet, onClose, onConfirm }) {
  const plan = plans.find((item) => item.id === sheet.planId) || null;
  const [status, setStatus] = useState(sheet.status || "taken");
  const [actualAt, setActualAt] = useState(toLocalInputValue(effectiveNow));
  const [painBefore, setPainBefore] = useState("");
  const [painAfter, setPainAfter] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => { if (!open) return; setStatus(sheet.status || "taken"); setActualAt(toLocalInputValue(effectiveNow)); setPainBefore(""); setPainAfter(""); setNote(""); }, [open, sheet.status, sheet.planId]);
  if (!open || !plan) return null;
  const actualDate = fromLocalInputValue(actualAt);
  const spacingWarning = status === "taken" && actualDate ? getSpacingWarning(events, plans, plan.id, actualDate, settings.tramadolSpacingMinutes) : null;
  const statusOptions = plan.kind === "required" ? [["taken", "Taken"], ["skipped", "Skipped"]] : [["taken", "Taken"], ["not-needed", "Not needed"]];
  return <div className="fixed inset-0 z-30 flex items-end justify-center bg-slate-900/40 p-2 sm:p-3 sm:items-center"><div className="max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-6"><div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-semibold text-slate-900">Log {plan.label.toLowerCase()} event</h3><p className="mt-1 text-sm text-slate-600">{plan.medication}</p></div><button onClick={onClose} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">Close</button></div>{spacingWarning?<div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><div className="font-semibold">Tramadol timing warning</div><div className="mt-1">A Tramadol event was logged {formatRelative(spacingWarning.elapsed)} earlier at {formatDateTime(spacingWarning.previous.actualAt)}.</div></div>:null}<div className="mt-4 grid gap-4"><Field label="Status"><select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300">{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Actual date and time"><input type="datetime-local" value={actualAt} onChange={(event) => setActualAt(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300" /></Field>{status === "taken" || plan.kind === "optional" ? <Field label="Pain before (optional)"><input type="number" min={0} max={10} step={1} value={painBefore} onChange={(event) => setPainBefore(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="0 to 10" /></Field> : null}{status === "taken" ? <Field label="Pain after (optional)"><input type="number" min={0} max={10} step={1} value={painAfter} onChange={(event) => setPainAfter(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="0 to 10" /></Field> : null}<Field label={plan.kind === "optional" && status === "taken" ? "Why taking this? (optional)" : "Note (optional)"}><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder={plan.kind === "optional" && status === "taken" ? "Pain flare after physio, night pain, swelling..." : "Anything useful to remember"} /></Field><div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">The time defaults to now, but you can override it here for historical entries or corrections.</div></div><div className="mt-5 flex flex-col gap-3 sm:flex-row"><button onClick={() => { const parsedDate = fromLocalInputValue(actualAt); if (!parsedDate) { alert("Please enter a valid date and time."); return; } onConfirm({ planId: plan.id, status, actualAt: parsedDate.toISOString(), painBefore: parsePainValue(painBefore), painAfter: parsePainValue(painAfter), note: String(note || "").trim() }); }} className="flex-1 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Save event</button><button onClick={onClose} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">Cancel</button></div></div></div>;
}





function AuthGate({ authReady, session, email, password, authError, authBusy, onEmailChange, onPasswordChange, onLogin, onLogout, children }) {
  if (!authReady) {
    return <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-600">Checking session…</div>;
  }
  if (!session?.user) {
    return <div className="min-h-screen grid place-items-center bg-slate-50 px-4"><form onSubmit={onLogin} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"><h1 className="text-xl font-semibold text-slate-900">Sign in</h1><p className="text-sm text-slate-600">Use your Supabase email and password to open the app.</p><Field label="Email"><input type="email" required autoComplete="email" value={email} onChange={(e)=>onEmailChange(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-300"/></Field><Field label="Password"><input type="password" required autoComplete="current-password" value={password} onChange={(e)=>onPasswordChange(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-300"/></Field>{authError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{authError}</div> : null}<button type="submit" disabled={authBusy} className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{authBusy ? 'Signing in…' : 'Sign in'}</button></form></div>;
  }
  return <>{children}</>;
}

function logSupabase(stage, details) {
  const ts = new Date().toISOString();
  if (details === undefined) {
    console.info(`[supabase][${ts}] ${stage}`);
    return;
  }
  console.info(`[supabase][${ts}] ${stage}`, details);
}

function logSupabaseError(stage, error, context = {}) {
  const ts = new Date().toISOString();
  const reason = {
    message: error?.message || String(error),
    code: error?.code || null,
    details: error?.details || null,
    hint: error?.hint || null,
    ...(context || {}),
  };
  console.error(`[supabase][${ts}] ${stage} failed`, reason);
}

const EVENTS_TABLE = "dose_events";
const DB_PLAN_IDS = new Set(["regular-tramadol", "regular-paracetamol", "prn"]);

function toDbPlanId(appPlanId) {
  if (DB_PLAN_IDS.has(appPlanId)) return appPlanId;
  return null;
}

function toAppPlanId(dbPlanId) {
  if (DB_PLAN_IDS.has(dbPlanId)) return dbPlanId;
  return "prn";
}

function mapPlanToUserPlanRow(plan) {
  const dbPlanId = toDbPlanId(plan.id);
  if (!dbPlanId) return null;
  return {
    plan_id: dbPlanId,
    label: plan.label,
    medication: plan.medication,
    interval_minutes: Number(plan.intervalMinutes) || 1,
    base_times: Array.isArray(plan.baseTimes) ? plan.baseTimes : [],
    kind: plan.kind,
    paracetamol_mg: Number(plan.paracetamolMg) || 0,
    tramadol_mg: Number(plan.tramadolMg) || 0,
  };
}

function mapUserPlanRowsToAppPlans(rows, fallbackPlans) {
  if (!Array.isArray(rows) || !rows.length) return fallbackPlans;
  return normalizePlans(fallbackPlans.map((plan) => {
    const row = rows.find((item) => item.plan_id === plan.id);
    if (!row) return plan;
    return { ...plan, label: row.label, medication: row.medication, intervalMinutes: row.interval_minutes, baseTimes: row.base_times, paracetamolMg: row.paracetamol_mg, tramadolMg: row.tramadol_mg };
  }));
}

function mapDbEventToApp(row) {
  const items = Array.isArray(row.dose_event_items) ? row.dose_event_items : [];
  const containsTramadol = items.some((item) => item?.medication_code === "tramadol");
  return {
    id: row.id,
    planId: toAppPlanId(row.plan_id),
    status: row.status,
    actualAt: row.actual_at,
    note: row.note || "",
    painBefore: row.pain_before,
    painAfter: row.pain_after,
    createdAt: row.created_at,
    containsTramadol,
  };
}

function mergeEventsPreferNewest(localEvents, remoteEvents, plans) {
  const combined = [...(Array.isArray(localEvents) ? localEvents : []), ...(Array.isArray(remoteEvents) ? remoteEvents : [])];
  const byId = new Map();
  combined.forEach((event) => {
    if (!event || !event.id) return;
    const existing = byId.get(event.id);
    if (!existing) {
      byId.set(event.id, event);
      return;
    }
    const existingCreated = new Date(existing.createdAt || existing.actualAt || 0).getTime();
    const incomingCreated = new Date(event.createdAt || event.actualAt || 0).getTime();
    if (incomingCreated >= existingCreated) byId.set(event.id, event);
  });
  const dedupedBySignature = new Map();
  Array.from(byId.values()).forEach((event) => {
    const signature = [event.planId, event.status, event.actualAt, event.note || ""].join("|");
    const existing = dedupedBySignature.get(signature);
    if (!existing) {
      dedupedBySignature.set(signature, event);
      return;
    }
    const existingCreated = new Date(existing.createdAt || existing.actualAt || 0).getTime();
    const incomingCreated = new Date(event.createdAt || event.actualAt || 0).getTime();
    if (incomingCreated >= existingCreated) dedupedBySignature.set(signature, event);
  });
  return normalizeEvents(Array.from(dedupedBySignature.values()), plans);
}

function mapAppEventToDb(event) {
  const dbPlanId = toDbPlanId(event.planId);
  if (!DB_PLAN_IDS.has(dbPlanId)) {
    throw new Error(`Invalid plan id for database sync: ${event.planId}`);
  }
  return {
    id: event.id,
    plan_id: dbPlanId,
    status: event.status,
    actual_at: event.actualAt,
    note: event.note || "",
    pain_before: event.painBefore,
    pain_after: event.painAfter,
    created_at: event.createdAt,
  };
}

function getDoseItemsForEvent(event, plans) {
  if (event.status !== "taken") return [];
  const planMap = getPlanMap(plans);
  const plan = planMap[event.planId];
  if (!plan) return [];

  const items = [];
  if (Number(plan.paracetamolMg) > 0) {
    items.push({ medication_code: "paracetamol", dose_mg: Number(plan.paracetamolMg) });
  }
  if (Number(plan.tramadolMg) > 0) {
    items.push({ medication_code: "tramadol", dose_mg: Number(plan.tramadolMg) || 50 });
  }
  return items;
}

function MedicationSchedulePWA() {
  const [mounted, setMounted] = useState(false); const [tab, setTab] = useState("today"); const [settingsSaveStatus, setSettingsSaveStatus] = useState("idle"); const [liveNow, setLiveNow] = useState(new Date()); const [data, setData] = useState(getInitialState()); const [installPromptEvent, setInstallPromptEvent] = useState(null); const [notificationPermission, setNotificationPermission] = useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported"); const [sheet, setSheet] = useState({ open: false, planId: null, status: "taken" }); const [authReady, setAuthReady] = useState(!supabase); const [session, setSession] = useState(null); const [authEmail, setAuthEmail] = useState(""); const [authPassword, setAuthPassword] = useState(""); const [authBusy, setAuthBusy] = useState(false); const [authError, setAuthError] = useState("");
  useEffect(() => { setMounted(true); if (!isBrowser()) return; try { const raw = window.localStorage.getItem(STORAGE_KEY); if (raw) setData(normalizeAppState(JSON.parse(raw))); } catch (error) { console.error("Failed to load saved medication data", error); } }, []);

  useEffect(() => { if (!mounted || !supabase) return; let cancelled = false; (async () => { try { logSupabase("sync:read:attempt"); const { data: rows, error } = await supabase.from(EVENTS_TABLE).select("*, dose_event_items(medication_code, dose_mg)").order("actual_at", { ascending: true }); if (error) throw error; if (cancelled) return; logSupabase("sync:read:success", { rowCount: Array.isArray(rows) ? rows.length : 0 }); const remoteEvents = (rows || []).map(mapDbEventToApp); let nextSettings = null; try { const { data: authData } = await supabase.auth.getUser(); const userId = authData?.user?.id; if (userId) { const [{ data: userPlanRows, error: userPlansError }, { data: userSettingsRow, error: userSettingsError }] = await Promise.all([supabase.from("user_plans").select("*"), supabase.from("user_settings").select("*").eq("id", 1).maybeSingle()]); if (userPlansError) throw userPlansError; if (userSettingsError) throw userSettingsError; nextSettings = { plans: mapUserPlanRowsToAppPlans(userPlanRows || [], cloneDefaultPlans()) }; if (userSettingsRow) { nextSettings.tramadolSpacingMinutes = userSettingsRow.tramadol_spacing_minutes; nextSettings.reminders = { ...DEFAULT_SETTINGS.reminders, ...(userSettingsRow.reminders || {}) }; } } else { logSupabase("sync:read:settings:skipped", { reason: "no-auth-user" }); } } catch (error) { logSupabaseError("sync:read:settings", error); } setData((current) => normalizeAppState({ ...current, settings: nextSettings ? { ...current.settings, ...nextSettings } : current.settings, events: mergeEventsPreferNewest(current.events, remoteEvents, (nextSettings && nextSettings.plans) || current.settings.plans) })); } catch (error) { logSupabaseError("sync:read", error); } })(); return () => { cancelled = true; logSupabase("sync:read:cancelled"); }; }, [mounted]);
  useEffect(() => { if (!isBrowser()) return undefined; const timer = window.setInterval(() => setLiveNow(new Date()), 30000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (!mounted || !isBrowser()) return; try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (error) { console.error("Failed to save medication data", error); } }, [data, mounted]);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setAuthError(error.message || "Failed to load session.");
      }
      setSession(data?.session || null);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      setAuthReady(true);
      setAuthError("");
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    if (!supabase) return;
    setAuthBusy(true);
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
    if (error) setAuthError(error.message || "Sign in failed.");
    setAuthBusy(false);
  }

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  const effectiveNow = liveNow; const planMap = useMemo(() => getPlanMap(data.settings.plans), [data.settings.plans]); const regularPlans = useMemo(() => data.settings.plans.filter((plan) => plan.kind === "required"), [data.settings.plans]); const prnPlan = planMap.prn; const regularStates = useMemo(() => regularPlans.map((plan) => ({ plan, state: getRegularPlanState(plan, data.events, effectiveNow) })), [regularPlans, data.events, effectiveNow]); const prnState = useMemo(() => getPrnPlanState(prnPlan, data.events, data.settings, effectiveNow), [prnPlan, data.events, data.settings, effectiveNow]); const lastTramadol = useMemo(() => getLatestTramadolEvent(data.events, effectiveNow), [data.events, effectiveNow]); const paracetamolToday = useMemo(() => getParacetamolToday(data.events, data.settings.plans, effectiveNow), [data.events, data.settings.plans, effectiveNow]);
  function openSheet(planId, status) { setSheet({ open: true, planId, status }); } function closeSheet() { setSheet({ open: false, planId: null, status: "taken" }); }
  function updateSettings(nextSettings) { setData((current) => ({ ...current, settings: { ...current.settings, ...nextSettings, reminders: { ...current.settings.reminders, ...((nextSettings && nextSettings.reminders) || {}) }, plans: Array.isArray(nextSettings && nextSettings.plans) ? normalizePlans(nextSettings.plans) : current.settings.plans } })); }
  function resetSettings() { setData((current) => ({ ...current, settings: cloneDefaultSettings() })); }
  async function addEvent(payload) { const plan = planMap[payload.planId]; if (!plan) return; const nextEvent = { id: crypto.randomUUID(), planId: payload.planId, status: payload.status, actualAt: new Date(payload.actualAt).toISOString(), note: payload.note || "", painBefore: payload.painBefore, painAfter: payload.painAfter, createdAt: new Date().toISOString(), containsTramadol: Number(plan.tramadolMg) > 0 }; setData((current) => ({ ...current, events: normalizeEvents([...current.events, nextEvent], current.settings.plans) })); if (supabase) { try { const dbEvent = mapAppEventToDb(nextEvent); const items = getDoseItemsForEvent(nextEvent, data.settings.plans); logSupabase("event:insert:attempt", { eventId: dbEvent.id, planId: dbEvent.plan_id, status: dbEvent.status, actualAt: dbEvent.actual_at, itemCount: items.length }); let createdId = null; const rpcRes = await supabase.rpc("log_dose_event", { p_plan_id: dbEvent.plan_id, p_status: dbEvent.status, p_scheduled_for: null, p_actual_at: dbEvent.actual_at, p_note: dbEvent.note, p_pain_before: dbEvent.pain_before, p_pain_after: dbEvent.pain_after, p_items: items }); if (!rpcRes.error) { createdId = rpcRes.data; } else { logSupabaseError("event:insert:rpc", rpcRes.error, { fallback: "direct-insert" }); const { data: inserted, error: insertError } = await supabase.from(EVENTS_TABLE).insert({ plan_id: dbEvent.plan_id, status: dbEvent.status, scheduled_for: null, actual_at: dbEvent.actual_at, note: dbEvent.note, pain_before: dbEvent.pain_before, pain_after: dbEvent.pain_after }).select("id").single(); if (insertError) throw insertError; createdId = inserted?.id || null; if (items.length && createdId) { const payloadItems = items.map((item) => ({ dose_event_id: createdId, ...item })); const { error: itemError } = await supabase.from("dose_event_items").insert(payloadItems); if (itemError) throw itemError; } } if (createdId && createdId !== nextEvent.id) { setData((current) => ({ ...current, events: normalizeEvents(current.events.map((event) => (event.id === nextEvent.id ? { ...event, id: createdId } : event)), current.settings.plans) })); } logSupabase("event:insert:success", { eventId: createdId || dbEvent.id }); } catch (error) { logSupabaseError("event:insert", error, { eventId: nextEvent.id }); } } else { logSupabase("event:insert:skipped", { reason: "missing supabase client", hasSupabaseClient: Boolean(supabase), eventId: nextEvent.id }); } closeSheet(); }
  async function deleteEvent(eventId) { if (isBrowser() && typeof window.confirm === "function") { const confirmed = window.confirm("Delete this event?"); if (!confirmed) return; } setData((current) => ({ ...current, events: current.events.filter((event) => event.id !== eventId) })); if (supabase) { try { logSupabase("event:delete:attempt", { eventId }); const { error } = await supabase.from(EVENTS_TABLE).delete().eq("id", eventId); if (error) throw error; logSupabase("event:delete:success", { eventId }); } catch (error) { logSupabaseError("event:delete", error, { eventId }); } } else { logSupabase("event:delete:skipped", { reason: "missing supabase client", hasSupabaseClient: Boolean(supabase), eventId }); } }
  async function requestNotifications() { if (typeof Notification === "undefined") { alert("Notifications are not supported in this preview environment."); return; } try { const permission = await Notification.requestPermission(); setNotificationPermission(permission); } catch (error) { console.error("Notification permission request failed", error); } }
  async function handleInstall() { if (!installPromptEvent) return; try { if (typeof installPromptEvent.prompt === "function") installPromptEvent.prompt(); if (installPromptEvent.userChoice) await installPromptEvent.userChoice; } catch (error) { console.error("Install prompt failed", error); } finally { setInstallPromptEvent(null); } }

  useEffect(() => {
    if (!mounted || !supabase) return;
    setSettingsSaveStatus("saving");
    (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) {
          logSupabase("settings:sync:skipped", { reason: "no-auth-user" });
          return;
        }
        const planRows = data.settings.plans.map((plan) => mapPlanToUserPlanRow(plan)).filter(Boolean);
        if (planRows.length) {
          const { error: plansError } = await supabase.from("user_plans").upsert(planRows, { onConflict: "plan_id" });
          if (plansError) throw plansError;
        }
        const payload = { id: 1, tramadol_spacing_minutes: data.settings.tramadolSpacingMinutes, reminders: data.settings.reminders };
        const { error: settingsError } = await supabase.from("user_settings").upsert(payload, { onConflict: "id" });
        if (settingsError) throw settingsError;
        logSupabase("settings:sync:success", { planCount: planRows.length });
        setSettingsSaveStatus("saved");
        if (typeof window !== "undefined") {
          window.setTimeout(() => setSettingsSaveStatus("idle"), 2000);
        }
      } catch (error) {
        logSupabaseError("settings:sync", error);
        setSettingsSaveStatus("error");
      }
    })();
  }, [mounted, data.settings]);

  return <AuthGate authReady={authReady} session={session} email={authEmail} password={authPassword} authError={authError} authBusy={authBusy} onEmailChange={setAuthEmail} onPasswordChange={setAuthPassword} onLogin={handleLogin} onLogout={handleLogout}><div className="min-h-screen bg-slate-50 text-slate-900"><AppHeader installPromptEvent={installPromptEvent} onInstall={handleInstall} /><main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8"><div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"><div className="text-slate-600">Signed in as <span className="font-semibold text-slate-900">{session?.user?.email || "Unknown user"}</span></div><button onClick={handleLogout} className="rounded-xl border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">Log out</button></div><nav className="grid grid-cols-2 gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm w-full sm:w-fit">{[["today", "Today"], ["settings", "Settings"]].map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={classNames("rounded-2xl px-4 py-3 text-sm font-semibold transition", tab === key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50")}>{label}</button>)}</nav>{tab === "today" ? <section className="mt-6"><TodayDashboard events={data.events} plans={data.settings.plans} prnState={prnState} effectiveNow={effectiveNow} onOpen={openSheet} onDelete={deleteEvent} /></section> : null}{tab === "settings" ? <section className="mt-6"><SettingsPanel settings={data.settings} onChange={updateSettings} onReset={resetSettings} notificationPermission={notificationPermission} onRequestNotifications={requestNotifications} saveStatus={settingsSaveStatus} /></section> : null}</main><ActionSheet open={sheet.open} plans={data.settings.plans} events={data.events} settings={data.settings} effectiveNow={effectiveNow} sheet={sheet} onClose={closeSheet} onConfirm={addEvent} /></div></AuthGate>;
}

createRoot(document.getElementById("root")).render(<React.StrictMode><MedicationSchedulePWA /></React.StrictMode>);
