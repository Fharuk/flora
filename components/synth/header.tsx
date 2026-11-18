"use client";

import { motion } from "motion/react";
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

  const [scrolled, setScrolled] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      <header
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 z-50 flex items-start justify-between px-5 py-5 transition-colors duration-500 sm:px-8 sm:py-6",
          // over the hero the bar should float clear; once content scrolls beneath it,
          // an unfrosted bar collides with the headings, so it takes on a paper veil
          scrolled &&
            "bg-[color-mix(in_oklab,var(--paper)_82%,transparent)] backdrop-blur-md sm:py-4"
        )}
      >
        <a
          href="#top"
          className="pointer-events-auto group flex items-center gap-3"
          aria-label={`${synthSite.name} — home`}
        >
          {/* the seal, reduced to its essence: a garnet bead inside a gold ring */}
          <span
            aria-hidden
            className="relative grid h-7 w-7 place-items-center rounded-full border border-[color-mix(in_oklab,var(--gold)_60%,transparent)] bg-paper/40 backdrop-blur transition-colors group-hover:border-[var(--gold)]"
          >
            <span className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]" />
          </span>
          <span className="leading-none">
            <span className="block font-title text-[0.95rem] tracking-[0.02em] text-ink">
              {synthSite.wordmark}
            </span>
            <span className="mt-1 block font-sans text-[0.42rem] uppercase tracking-[0.42em] text-ink-soft">
              Florist&nbsp;·&nbsp;Est.&nbsp;MMXXVI
            </span>
          </span>
        </a>

        <div className="pointer-events-auto flex items-center gap-2">
          <nav aria-label="Sections" className="hidden items-center gap-0.5 md:flex">
            {synthSite.nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-3.5 py-2 font-sans text-[0.58rem] uppercase tracking-[0.24em] text-ink/65 transition-colors hover:text-[var(--gold-ink)]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <span aria-hidden className="mx-1 hidden h-4 w-px bg-[var(--line-strong)] md:block" />

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="grid h-9 w-9 place-items-center rounded-full border border-[color-mix(in_oklab,var(--gold)_45%,transparent)] text-ink/75 backdrop-blur transition-colors hover:border-[var(--gold)] hover:text-[var(--gold-ink)]"
          >
            {theme === "dark" ? <Sun className="h-[0.9rem] w-[0.9rem]" /> : <Moon className="h-[0.9rem] w-[0.9rem]" />}
          </button>

          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            aria-haspopup="dialog"
            className="grid h-9 w-9 place-items-center rounded-full border border-[color-mix(in_oklab,var(--gold)_45%,transparent)] text-ink/75 backdrop-blur transition-colors hover:border-[var(--gold)] hover:text-[var(--gold-ink)]"
          >
            <Menu className="h-[0.9rem] w-[0.9rem]" />
          </button>
        </div>
      </header>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Sections"
          className="menu-veil velvet fixed inset-0 z-[60] bg-veil/97 backdrop-blur-xl"
        >
            <div className="flex h-full flex-col px-6 py-6 sm:px-10">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <span aria-hidden className="grid h-6 w-6 place-items-center rounded-full border border-[color-mix(in_oklab,var(--gold)_60%,transparent)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
                  </span>
                  <span className="font-title text-[0.95rem] tracking-[0.02em] text-bone">
                    {synthSite.wordmark}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close menu"
                  className="grid h-9 w-9 place-items-center rounded-full border border-[color-mix(in_oklab,var(--gold)_45%,transparent)] text-bone/80 transition-colors hover:border-[var(--gold)] hover:text-bone"
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
                        className="group flex items-baseline justify-between border-b border-bone/10 py-5 transition-colors hover:border-[color-mix(in_oklab,var(--gold)_50%,transparent)]"
                      >
                        <span className="font-display text-4xl text-bone transition-colors group-hover:text-[var(--gold-soft)] sm:text-5xl">
                          {item.label}
                        </span>
                        <span className="font-mono text-[0.55rem] tracking-[0.2em] text-bone/30">
                          {String(i + 1).padStart(2, "0")}
                        </span>
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
                        "block font-sans text-[0.6rem] uppercase tracking-[0.28em] text-bone/45 transition-colors hover:text-[var(--gold-soft)]"
                      )}
                    >
                      {s.label}
                    </a>
                  ))}
                </div>
                <p className="max-w-xs font-display text-base italic leading-relaxed text-bone/40">
                  Ten specimens, cut in glass — composed for you in the browser.
                </p>
              </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
