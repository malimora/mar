import React from "react";
import { createRoot } from "react-dom/client";
import { getInitialState } from "./domain/plans";

function App() {
  const state = getInitialState();

  return (
    <main style={{ fontFamily: "system-ui", padding: "1rem", maxWidth: 720, margin: "0 auto" }}>
      <h1>Medication Schedule App</h1>
      <p>This project is configured for deployment on Vercel with Vite + React.</p>
      <h2>Detected plan presets</h2>
      <ul>
        {state.settings.plans.map((plan) => (
          <li key={plan.id}>
            <strong>{plan.label}:</strong> {plan.medication} every {plan.intervalMinutes} minutes
          </li>
        ))}
      </ul>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
