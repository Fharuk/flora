"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { bouquetTitle, decodeBouquet } from "@/lib/bouquet";
import { shelf, shelfHref, type ShelfItem } from "@/lib/shelf";
import { useBouquetMeta, useSynth } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * The shelf control, and the shelf.
 *
 * `localStorage` rather than the garden on purpose: a composition you are still
 * fiddling with is not a public act, and asking someone to sign their work into a
 * database before they can come back to it is the wrong order. The garden is one
 * deliberate step further on, and says so.
 *
 * The store is not reactive — a shelf is written once per press — so the panel
 * reloads it on open rather than subscribing to anything.
 */

function useShelf() {
  const [items, setItems] = useState<ShelfItem[]>([]);
  useEffect(() => setItems(shelf.list()), []);
  return { items, setItems };
}

export function ShelfButton() {
  const [open, setOpen] = useState(false);
  const { items, setItems } = useShelf();
  const openPanel = useCallback(() => {
    setItems(shelf.list());
    setOpen(true);
  }, [setItems]);

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        className="btn btn-ghost !px-3"
        aria-label={items.length ? `Your shelf, ${items.length} kept` : "Your shelf, empty"}
        title="Your shelf"
      >
        <span className="font-mono text-[0.65rem] tabular-nums">{items.length}</span>
      </button>
      <AnimatePresence>
        {open ? <ShelfPanel key="shelf" onClose={() => setOpen(false)} onChange={setItems} /> : null}
      </AnimatePresence>
    </>
  );
}

export function KeepButton({ className }: { className?: string }) {
  const { query } = useBouquetMeta();
  const [kept, setKept] = useState(false);

  useEffect(() => {
    setKept(shelf.has(query));
  }, [query]);

  const keep = useCallback(() => {
    if (shelf.has(query)) {
      shelf.remove(query);
      setKept(false);
    } else {
      shelf.add(query);
      setKept(true);
    }
  }, [query]);

  return (
    <button type="button" onClick={keep} className={cn("btn btn-ghost", className)} aria-pressed={kept}>
      {kept ? <Check className="h-3.5 w-3.5 text-[var(--gold-ink)]" aria-hidden /> : null}
      {kept ? "On the shelf" : "Keep this"}
    </button>
  );
}

function ShelfPanel({ onClose, onChange }: { onClose: () => void; onChange: (items: ShelfItem[]) => void }) {
  const { items, setItems } = useShelf();
  const theme = useSynth((s) => s.theme);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const remove = (config: string) => {
    setItems(shelf.remove(config));
    onChange(shelf.list());
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-[#1a0a0f]/55 backdrop-blur-sm"
        aria-hidden
      />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 260, damping: 32 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shelf-title"
        className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-[26rem] flex-col border-l border-line bg-paper"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 id="shelf-title" className="font-display text-[1.3rem] text-ink">
              Your shelf
            </h2>
            <p className="mt-0.5 font-mono text-[0.5rem] uppercase tracking-[0.22em] text-ink-soft">
              {items.length} of 24 · kept on this device
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost !px-2.5" aria-label="Close the shelf">
            <X className="h-4 w-4" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <p className="font-display text-[1.15rem] italic text-ink-soft">Nothing kept yet.</p>
            <p className="mt-2 max-w-[26ch] text-[0.8rem] leading-relaxed text-ink-soft">
              Press <span className="text-ink">Keep this</span> beside the vase and the recipe stays here,
              on this device, until you say otherwise.
            </p>
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-line overflow-y-auto">
            {items.map((item) => {
              const config = decodeBouquet(item.config);
              const title = bouquetTitle(config);
              return (
                <li key={item.config} className="flex items-start gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <a
                      href={shelfHref(item)}
                      className="block truncate font-display text-[1.1rem] text-ink transition-colors hover:text-[var(--gold-ink)]"
                    >
                      {title}
                    </a>
                    <p className="mt-1 font-mono text-[0.5rem] uppercase tracking-[0.2em] text-ink-soft">
                      {config.density} stems · {config.palette} · {new Date(item.at).toLocaleDateString()}
                    </p>
                  </div>
                  <a
                    href={`/api/og?${item.config}&theme=${theme}`}
                    download={`flora-synth-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`}
                    className="btn btn-ghost !px-2.5"
                    aria-label={`Save a picture of ${title}`}
                  >
                    <span className="font-mono text-[0.55rem]">PNG</span>
                  </a>
                  <button
                    onClick={() => remove(item.config)}
                    className="btn btn-ghost !px-2.5"
                    aria-label={`Remove ${title} from the shelf`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <footer className="border-t border-line px-5 py-4">
          <a href="/collection" className="btn btn-primary w-full justify-center">
            Take one to the garden
          </a>
          <p className="mt-2 text-center font-mono text-[0.5rem] uppercase tracking-[0.2em] text-ink-soft">
            The garden is public. The shelf is not.
          </p>
        </footer>
      </motion.aside>
    </>
  );
}
