import { parseClockTime } from "./plans";

export function getReferenceCandidates(baseTimes, effectiveNow) {
  const parsedTimes = (Array.isArray(baseTimes) ? baseTimes : [])
    .map(parseClockTime)
    .filter((value) => value !== null);

  if (!parsedTimes.length) return [];

  const base = new Date(effectiveNow);
  base.setHours(0, 0, 0, 0);

  const candidates = [];

  for (let dayOffset = -1; dayOffset <= 2; dayOffset += 1) {
    parsedTimes.forEach((minutes) => {
      const candidate = new Date(base);
      candidate.setDate(base.getDate() + dayOffset);
      candidate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      candidates.push(candidate);
    });
  }

  return candidates.sort((a, b) => a.getTime() - b.getTime());
}

export function getReferenceScheduleState(plan, effectiveNow) {
  const candidates = getReferenceCandidates(plan.baseTimes, effectiveNow);
  const nowMs = effectiveNow.getTime();

  const previous =
    [...candidates].filter((date) => date.getTime() <= nowMs).slice(-1)[0] ||
    null;

  const next = candidates.find((date) => date.getTime() > nowMs) || null;

  return { previous, next };
}
