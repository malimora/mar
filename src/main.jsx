import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

const DEFAULT_PLANS = [
  { id: "regular", label: "Regular", medication: "Tramadol 15 + Paracetamol 500mg", intervalMinutes: 360 },
  { id: "prn", label: "As needed", medication: "Tramadol", intervalMinutes: 240 },
];

function classNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

function formatDateTime(d) {
  return new Intl.DateTimeFormat([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(d));
}

function App() {
  const [tab, setTab] = useState("today");
  const [plans] = useState(DEFAULT_PLANS);
  const [events, setEvents] = useState([]);

  const recent = useMemo(() => [...events].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8), [events]);

  function addEvent(planId, status) {
    setEvents((curr) => curr.concat({ id: crypto.randomUUID(), planId, status, at: new Date().toISOString() }));
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Recovery medication tracker</p>
          <h1 className="text-3xl font-semibold">Medication Schedule</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <nav className="grid grid-cols-3 gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm sm:w-fit">
          {["today", "history", "settings"].map((key) => (
            <button key={key} onClick={() => setTab(key)} className={classNames("rounded-2xl px-4 py-3 text-sm font-semibold", tab === key ? "bg-slate-900 text-white" : "text-slate-600")}>{key[0].toUpperCase() + key.slice(1)}</button>
          ))}
        </nav>

        {tab === "today" && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Quick log</h2>
            <p className="mt-1 text-sm text-slate-600">Use buttons below to log a medication event.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <button onClick={() => addEvent("regular", "taken")} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Log regular dose</button>
              <button onClick={() => addEvent("prn", "taken")} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold">Log as-needed dose</button>
              <button onClick={() => addEvent("prn", "not-needed")} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold">Mark PRN not needed</button>
            </div>
          </section>
        )}

        {tab === "history" && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Recent activity</h2>
            <div className="mt-4 space-y-3">
              {recent.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No events logged yet.</div> : recent.map((e) => (
                <div key={e.id} className="rounded-2xl border border-slate-200 p-4 text-sm">
                  <strong>{plans.find((p) => p.id === e.planId)?.label}</strong> · {e.status} <span className="text-slate-500">({formatDateTime(e.at)})</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "settings" && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Plan presets</h2>
            <ul className="mt-3 list-disc pl-5">
              {plans.map((p) => <li key={p.id}><strong>{p.label}:</strong> {p.medication} every {p.intervalMinutes} minutes</li>)}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
