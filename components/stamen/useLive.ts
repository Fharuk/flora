"use client";

import { useSyncExternalStore } from "react";
import { live, type LiveState } from "@/lib/stamen/live";

/** subscribe to one field of the director's live state */
export function useLive<K extends keyof LiveState>(key: K): LiveState[K] {
  return useSyncExternalStore(
    live.subscribe,
    () => live.get()[key],
    () => live.get()[key],
  );
}
