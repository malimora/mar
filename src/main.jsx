import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

function IconBase({ children, className = "h-5 w-5", viewBox = "0 0 24 24" }) {
  return (
    <svg aria-hidden="true" viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>{children}</svg>
  );
}
function BellIcon({ className }) { return <IconBase className={className}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" /><path d="M10 20a2 2 0 0 0 4 0" /></IconBase>; }
function ClockIcon({ className }) { return <IconBase className={className}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></IconBase>; }
function SettingsIcon({ className }) { return <IconBase className={className}><circle cx="12" cy="12" r="3" /><path d="M12 2v3" /><path d="M12 19v3" /><path d="m4.9 4.9 2.1 2.1" /><path d="m17 17 2.1 2.1" /><path d="M2 12h3" /><path d="M19 12h3" /><path d="m4.9 19.1 2.1-2.1" /><path d="M17 7l2.1-2.1" /></IconBase>; }
function SunIcon({ className }) { return <IconBase className={className}><circle cx="12" cy="12" r="4" /><path d="M12 2v2.5" /><path d="M12 19.5V22" /><path d="m4.9 4.9 1.8 1.8" /><path d="m17.3 17.3 1.8 1.8" /><path d="M2 12h2.5" /><path d="M19.5 12H22" /><path d="m4.9 19.1 1.8-1.8" /><path d="m17.3 6.7 1.8-1.8" /></IconBase>; }
function TrashIcon({ className }) { return <IconBase className={className}><path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M6 7l1 12h10l1-12" /><path d="M9 4h6l1 3H8l1-3Z" /></IconBase>; }

const STORAGE_KEY = "med-schedule-pwa-v5";
const DEFAULT_PLANS = [
{id:"regular",label:"Regular",medication:"Tramadol 15 + Paracetamol 500mg",intervalMinutes:360,baseTimes:["06:00","12:00","18:00","00:00"],containsTramadol:true,kind:"required",paracetamolMg:500},
{id:"prn",label:"As needed",medication:"Tramadol",intervalMinutes:240,baseTimes:["10:00","16:00","22:00"],containsTramadol:true,kind:"optional",paracetamolMg:0}
];
const DEFAULT_SETTINGS = { plans: DEFAULT_PLANS, tramadolSpacingMinutes: 240, reminders:{regularDue:true,prnCheckIn:true,missedRegular:true,midnightDose:true}};
const DEFAULT_UI = { historyFilter:"7d" };
const classNames=(...p)=>p.filter(Boolean).join(" ");
const formatTime=(d)=>new Intl.DateTimeFormat([], {hour:"numeric",minute:"2-digit"}).format(new Date(d));
const formatDateTime=(d)=>new Intl.DateTimeFormat([], {weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(d));
const formatRelative=(ms)=>{const a=Math.abs(ms),h=Math.floor((a%86400000)/3600000),m=Math.floor((a%3600000)/60000); return `${h?`${h}h `:""}${m}m`;};

function getInitialState(){return {settings: structuredClone(DEFAULT_SETTINGS), events: [], ui:{...DEFAULT_UI}}}
function getPlanMap(plans){return plans.reduce((m,p)=>(m[p.id]=p,m),{})}

function AppHeader(){return <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Recovery medication tracker</p><h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Medication Schedule</h1></div></div></div>}
function OverviewCard({onOpen, events, now}){const last=events.at(-1);return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200"><ClockIcon className="h-3.5 w-3.5" />Updated {formatTime(now)}</div><h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{last?`Next regular around ${formatTime(new Date(new Date(last.actualAt).getTime()+360*60000))}`:"No regular dose logged yet"}</h2><p className="mt-1 text-lg text-slate-700">{last?`Last event ${formatDateTime(last.actualAt)}`:"Log the first regular dose to start the rolling schedule."}</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><button onClick={()=>onOpen("regular","taken")} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Log regular dose</button><button onClick={()=>onOpen("prn","taken")} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">Log as-needed dose</button><button onClick={()=>onOpen("prn","not-needed")} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">Mark PRN not needed</button></div></section>}
function RecentEventsPanel({events, plans, onDelete}){const map=getPlanMap(plans);const recent=[...events].reverse().slice(0,6);return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Recent activity</h2><div className="mt-4 space-y-3">{recent.length===0?<div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">No events logged yet.</div>:recent.map((e)=><div key={e.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><div><div className="text-sm font-semibold text-slate-900">{map[e.planId]?.label} · {e.status}</div><div className="mt-1 text-xs text-slate-500">{formatDateTime(e.actualAt)}</div></div><button onClick={()=>onDelete(e.id)} className="rounded-2xl border border-slate-200 p-2 text-slate-500"><TrashIcon className="h-4 w-4"/></button></div></div>)}</div></section>}
function SettingsPanel({settings}){return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><SettingsIcon className="h-5 w-5 text-slate-700"/><h2 className="text-lg font-semibold text-slate-900">Plan settings</h2></div><div className="mt-4 space-y-2">{settings.plans.map((p)=><div key={p.id} className="text-sm text-slate-700"><strong>{p.label}</strong>: {p.medication} every {p.intervalMinutes}m</div>)}</div></section>}
function HistoryPanel({events}){return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><SunIcon className="h-5 w-5 text-slate-700"/><h2 className="text-lg font-semibold text-slate-900">Event history</h2></div><div className="mt-4 space-y-3">{events.length===0?<div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">No events in this range.</div>:[...events].reverse().map((e)=><div key={e.id} className="rounded-2xl border border-slate-200 p-4 text-sm">{e.planId} · {e.status} · {formatDateTime(e.actualAt)}</div>)}</div></section>}

function ActionSheet({open,onClose,onConfirm,sheet}){if(!open) return null; return <div className="fixed inset-0 z-30 flex items-end justify-center bg-slate-900/40 p-3 sm:items-center"><div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl sm:p-6"><h3 className="text-xl font-semibold text-slate-900">Log event</h3><p className="mt-1 text-sm text-slate-600">Choose status and save now.</p><div className="mt-5 flex gap-3"><button onClick={()=>onConfirm({planId:sheet.planId,status:sheet.status,actualAt:new Date().toISOString()})} className="flex-1 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Save event</button><button onClick={onClose} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">Cancel</button></div></div></div>}

function MedicationSchedulePWA(){
  const [tab,setTab]=useState("today"); const [data,setData]=useState(getInitialState()); const [sheet,setSheet]=useState({open:false,planId:null,status:"taken"}); const [now,setNow]=useState(new Date());
  useEffect(()=>{const raw=localStorage.getItem(STORAGE_KEY); if(raw) setData(JSON.parse(raw));},[]);
  useEffect(()=>{localStorage.setItem(STORAGE_KEY, JSON.stringify(data));},[data]);
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),30000); return ()=>clearInterval(t)},[]);
  const openSheet=(planId,status)=>setSheet({open:true,planId,status});
  const closeSheet=()=>setSheet({open:false,planId:null,status:"taken"});
  const addEvent=(payload)=>{setData((c)=>({...c,events:[...c.events,{id:`${Date.now()}`, ...payload}]})); closeSheet();};
  const deleteEvent=(id)=>setData((c)=>({...c,events:c.events.filter((e)=>e.id!==id)}));
  return <div className="min-h-screen bg-slate-50 text-slate-900"><AppHeader/><main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8"><nav className="grid grid-cols-3 gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm sm:w-fit">{[["today","Today"],["log","History"],["settings","Settings"]].map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={classNames("rounded-2xl px-4 py-3 text-sm font-semibold transition",tab===k?"bg-slate-900 text-white":"text-slate-600 hover:bg-slate-50")}>{l}</button>)}</nav>{tab==="today"&&<div className="mt-6 space-y-4"><OverviewCard onOpen={openSheet} events={data.events} now={now}/><RecentEventsPanel events={data.events} plans={data.settings.plans} onDelete={deleteEvent}/></div>}{tab==="log"&&<section className="mt-6"><HistoryPanel events={data.events}/></section>}{tab==="settings"&&<section className="mt-6"><SettingsPanel settings={data.settings}/></section>}</main><ActionSheet open={sheet.open} onClose={closeSheet} onConfirm={addEvent} sheet={sheet}/></div>
}

createRoot(document.getElementById("root")).render(<React.StrictMode><MedicationSchedulePWA /></React.StrictMode>);
