"use client";

import { create } from "zustand";

import { DEFAULT_CONFIG, bouquetTitle, decodeBouquet, encodeBouquet, randomSeed, type BouquetConfig } from "@/lib/bouquet";
import type { RegisterKey } from "@/lib/specimens";

/**
 * The gift flow's own store.
 *
 * Deliberately separate from `useSynth`. The studio is an instrument: it owns the URL,
 * re-seeds freely, and forgets everything when you leave. The gift flow is a document
 * being written: it has a draft, a recipient, a letter, media, and a PIN, and none of
 * that belongs in the studio's recipe. Sharing one store would mean the studio's URL
 * sync could overwrite a half-written letter.
 *
 * The draft is mirrored to sessionStorage, so a reload — or a review of the share page in
 * a new tab — does not lose the letter. It is not localStorage: a draft is a conversation,
 * not an account.
 */

export type Draft = {
  config: BouquetConfig;
  recipient: string;
  creator: string;
  message: string;
  register: RegisterKey;
  pin: string;
  videoUrl: string;
  videoTitle: string;
  photos: { id: string; dataUrl: string; alt: string; ratio: number }[];
  voice: { blob: Blob; duration: number; url: string } | null;
  envelope: "classic" | "glass" | "noir";
};

const STORAGE_KEY = "flora-send-draft";

function emptyDraft(): Draft {
  return {
    config: { ...DEFAULT_CONFIG, foliage: "eucalyptus", register: "glass" },
    recipient: "",
    creator: "",
    message: "",
    register: "glass",
    pin: "",
    videoUrl: "",
    videoTitle: "",
    photos: [],
    voice: null,
    envelope: "classic",
  };
}

type SendState = {
  draft: Draft;
  /** the storage code, once the gift has been created */
  code: string | null;
  /** the one-time key; kept in memory and mirrored to sessionStorage */
  ownerKey: string | null;
  seeded: boolean;

  seed: () => void;
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  patch: (value: Partial<Draft>) => void;
  setConfig: (value: Partial<BouquetConfig>) => void;
  reseed: () => void;
  addPhoto: (photo: Draft["photos"][number]) => void;
  removePhoto: (id: string) => void;
  setVoice: (voice: Draft["voice"]) => void;
  reset: () => void;
  markSent: (code: string, ownerKey: string) => void;
  clear: () => void;
};

/** Only the serialisable half of a draft survives a reload. Blobs and object URLs do not. */
type Persisted = Omit<Draft, "photos" | "voice"> & {
  photos: { id: string; alt: string; ratio: number }[];
};

function persist(draft: Draft, code: string | null, ownerKey: string | null) {
  if (typeof window === "undefined") return;
  try {
    const { photos, voice, ...rest } = draft;
    const payload = {
      draft: { ...rest, photos: photos.map(({ id, alt, ratio }) => ({ id, alt, ratio })) } satisfies Persisted,
      config: encodeBouquet(draft.config),
      code,
      ownerKey,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // private mode, or a quota: the draft simply does not survive the reload
  }
}

function restore(): { draft: Draft; code: string | null; ownerKey: string | null } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      draft: Persisted;
      config: string;
      code: string | null;
      ownerKey: string | null;
    };
    // a photo's bytes are gone, so its entry is restored as a placeholder the UI hides
    const photos = (parsed.draft.photos ?? []).map((p) => ({ ...p, dataUrl: "" }));
    return {
      draft: { ...emptyDraft(), ...parsed.draft, config: decodeBouquet(parsed.config), photos, voice: null },
      code: parsed.code,
      ownerKey: parsed.ownerKey,
    };
  } catch {
    return null;
  }
}

export const useSend = create<SendState>((set, get) => ({
  draft: emptyDraft(),
  code: null,
  ownerKey: null,
  seeded: false,

  seed: () => {
    if (get().seeded) return;
    const restored = restore();
    set({ ...(restored ?? {}), seeded: true });
  },

  set: (key, value) => {
    set((s) => ({ draft: { ...s.draft, [key]: value } }));
    const s = get();
    persist(s.draft, s.code, s.ownerKey);
  },

  patch: (value) => {
    set((s) => ({ draft: { ...s.draft, ...value } }));
    const s = get();
    persist(s.draft, s.code, s.ownerKey);
  },

  setConfig: (value) => {
    set((s) => {
      const config = { ...s.draft.config, ...value };
      // the register lives on the config so the engine, the link and the row all agree
      if (value.register) config.register = value.register;
      return { draft: { ...s.draft, config, ...(value.register ? { register: value.register } : {}) } };
    });
    const s = get();
    persist(s.draft, s.code, s.ownerKey);
  },

  reseed: () => {
    set((s) => ({ draft: { ...s.draft, config: { ...s.draft.config, seed: randomSeed() } } }));
    const s = get();
    persist(s.draft, s.code, s.ownerKey);
  },

  addPhoto: (photo) => {
    set((s) =>
      s.draft.photos.length >= 5 ? s : { draft: { ...s.draft, photos: [...s.draft.photos, photo] } }
    );
    const s = get();
    persist(s.draft, s.code, s.ownerKey);
  },

  removePhoto: (id) => {
    set((s) => ({ draft: { ...s.draft, photos: s.draft.photos.filter((p) => p.id !== id) } }));
    const s = get();
    persist(s.draft, s.code, s.ownerKey);
  },

  setVoice: (voice) => {
    set((s) => ({ draft: { ...s.draft, voice } }));
    const s = get();
    persist(s.draft, s.code, s.ownerKey);
  },

  reset: () => {
    set({ draft: emptyDraft() });
    persist(emptyDraft(), null, null);
  },

  markSent: (code, ownerKey) => set({ code, ownerKey }),

  clear: () => {
    if (typeof window !== "undefined") sessionStorage.removeItem(STORAGE_KEY);
    set({ draft: emptyDraft(), code: null, ownerKey: null, seeded: true });
  },
}));

/** The bouquet's title, from the draft's seed — what the garden and the card both show. */
export function useDraftTitle() {
  const config = useSend((s) => s.draft.config);
  return bouquetTitle(config);
}
