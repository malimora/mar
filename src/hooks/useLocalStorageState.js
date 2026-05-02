import { useEffect, useState } from "react";

export function useLocalStorageState(key, getInitialState, normalizeState) {
  const [state, setState] = useState(() => {
    if (typeof window === "undefined") return getInitialState();

    try {
      const stored = window.localStorage.getItem(key);
      if (!stored) return getInitialState();

      return normalizeState(JSON.parse(stored));
    } catch {
      return getInitialState();
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Storage can fail in private mode or if quota is exceeded.
    }
  }, [key, state]);

  return [state, setState];
}
