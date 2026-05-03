export const STORAGE_KEY = "med-schedule-pwa-v5";

export const DEFAULT_PLANS = [
  {
    id: "regular-tramadol",
    label: "Regular Tramadol",
    medication: "Tramadol 50mg",
    intervalMinutes: 360,
    baseTimes: ["06:00", "12:00", "18:00", "00:00"],
    kind: "required",
    helper: "Required rolling schedule for Tramadol.",
    paracetamolMg: 0,
    tramadolMg: 50,
  },
  {
    id: "regular-paracetamol",
    label: "Regular Paracetamol",
    medication: "Paracetamol 500mg",
    intervalMinutes: 360,
    baseTimes: ["06:00", "12:00", "18:00", "00:00"],
    kind: "required",
    helper: "Required rolling schedule for Paracetamol.",
    paracetamolMg: 500,
    tramadolMg: 0,
  },
  {
    id: "prn",
    label: "As needed",
    medication: "PRN Tramadol 50mg",
    intervalMinutes: 240,
    baseTimes: ["10:00", "16:00", "22:00"],
    kind: "optional",
    helper: "Optional breakthrough Tramadol dose.",
    paracetamolMg: 0,
    tramadolMg: 50,
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
