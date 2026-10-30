"use client";

import { AnimatePresence, motion } from "motion/react";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { synthSite } from "@/lib/site";
import { useSynth } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Two colour systems live here.
 *
 * The bar floats over the WebGL studio, so it uses the theme's own ink — dark ink on the
 * light sweep, cream ink in the black vitrine. The wordmark additionally blends by
 * difference against whatever is behind it, which keeps the mark legible when a bright
 * petal passes underneath.
 *
 * The menu, by contrast, is a black vitrine in *both* themes: `--veil` and `--bone` are
 * fixed values, not theme tokens. Deriving them from --ink/--paper inverted the panel and
 * its text at the same time and left the menu almost invisible in light mode.
 */
export function Header() {
  const theme = useSynth((s) => s.theme);
  const toggleTheme = useSynth((s) => s.toggleTheme);
  const hydrate = useSynth((s) => s.hydrate);
  const [open, setOpen] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => hydrate(), [hydrate]);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  /* Escape closes, Tab stays inside the panel, and the page behind stops scrolling. */
  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !panel) return;

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    // move focus into the panel once it is mounted
    const raf = requestAnimationFrame(() => {
      panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    });

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(raf);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close]);

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-start justify-between px-5 py-5 sm:px-8 sm:py-6">
        <a
          href="#top"
          className="pointer-events-auto flex items-center gap-2.5 mix-blend-difference"
          aria-label={`${synthSite.name} — home`}
        >
          <span aria-hidden className="grid h-6 w-6 place-items-center rounded-full border border-current">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
          </span>
          <span className="text-[0.82rem] font-medium uppercase tracking-[0.24em] text-bone">
            {synthSite.wordmark}
          </span>
        </a>

        <div className="pointer-events-auto flex items-center gap-2">
          <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
            {synthSite.nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-3.5 py-2 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink/70 transition-colors hover:text-ink"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="grid h-9 w-9 place-items-center rounded-full border border-ink/25 text-ink/80 backdrop-blur transition-colors hover:border-ink/50 hover:text-ink"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            aria-haspopup="dialog"
            className="grid h-9 w-9 place-items-center rounded-full border border-ink/25 text-ink/80 backdrop-blur transition-colors hover:border-ink/50 hover:text-ink"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open ? (
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Sections"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] bg-veil/95 backdrop-blur-xl"
          >
            <div className="flex h-full flex-col px-6 py-6 sm:px-10">
              <div className="flex items-center justify-between">
                <span className="text-[0.82rem] font-medium uppercase tracking-[0.24em] text-bone">
                  {synthSite.wordmark}
                </span>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close menu"
                  className="grid h-9 w-9 place-items-center rounded-full border border-bone/25 text-bone/80 transition-colors hover:border-bone/50 hover:text-bone"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav aria-label="Menu" className="mt-16 flex-1">
                <ul className="space-y-1">
                  {synthSite.nav.map((item, i) => (
                    <motion.li
                      key={item.href}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <a
                        href={item.href}
                        onClick={close}
                        className="block border-b border-bone/10 py-5 font-display text-4xl text-bone transition-colors hover:text-bone/70 sm:text-5xl"
                      >
                        {item.label}
                      </a>
                    </motion.li>
                  ))}
                </ul>
              </nav>

              <div className="flex flex-wrap items-end justify-between gap-6 border-t border-bone/10 pt-6">
                <div className="space-y-2">
                  {synthSite.socials.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={cn(
                        "block font-mono text-[0.68rem] uppercase tracking-[0.2em] text-bone/50 transition-colors hover:text-bone"
                      )}
                    >
                      {s.label}
                    </a>
                  ))}
                </div>
                <p className="max-w-xs font-mono text-[0.62rem] uppercase leading-relaxed tracking-[0.18em] text-bone/30">
                  Ten specimens · glass and chrome · generated in the browser
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
