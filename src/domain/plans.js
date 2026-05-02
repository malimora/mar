import { DEFAULT_PLANS, DEFAULT_SETTINGS, DEFAULT_UI } from "../config/defaults";

export function parseClockTime(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return hour * 60 + minute;
}

export function cloneDefaultPlans() {
  return DEFAULT_PLANS.map((plan) => ({
    ...plan,
    baseTimes: [...plan.baseTimes],
  }));
}

export function cloneDefaultSettings() {
  return {
    ...DEFAULT_SETTINGS,
    plans: cloneDefaultPlans(),
    reminders: { ...DEFAULT_SETTINGS.reminders },
  };
}

export function getInitialState() {
  return {
    settings: cloneDefaultSettings(),
    events: [],
    ui: { ...DEFAULT_UI },
  };
}

export function getPlanMap(plans) {
  return plans.reduce((map, plan) => {
    map[plan.id] = plan;
    return map;
  }, {});
}
