export const STORAGE_KEY = "med-schedule-pwa-v5";

export const DEFAULT_PLANS = [
  {
    id: "regular",
    label: "Regular",
    medication: "Tramadol 15 + Paracetamol 500mg",
    intervalMinutes: 360,
    baseTimes: ["06:00", "12:00", "18:00", "00:00"],
    containsTramadol: true,
    kind: "required",
    helper: "Rolling schedule based on the last regular dose.",
    paracetamolMg: 500,
  },
  {
    id: "prn",
    label: "As needed",
    medication: "Tramadol",
    intervalMinutes: 240,
    baseTimes: ["10:00", "16:00", "22:00"],
    containsTramadol: true,
    kind: "optional",
    helper: "Optional breakthrough dose if pain requires it.",
    paracetamolMg: 0,
  },
];

export const DEFAULT_SETTINGS = {
  plans: DEFAULT_PLANS,
  tramadolSpacingMinutes: 240,
  reminders: {
    regularDue: true,
    prnCheckIn: true,
    missedRegular: true,
    midnightDose: true,
  },
};

export const DEFAULT_UI = {
  historyFilter: "7d",
};
