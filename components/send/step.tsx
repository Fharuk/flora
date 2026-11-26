"use client";

import { cn } from "@/lib/utils";

/**
 * The five-step frame.
 *
 * Every step is the same three-part shape — a heading that says what you are choosing, a
 * body, and a footer that is the only way forward. Keeping the frame in one place is what
 * stops a five-step flow from becoming five different pages: the forward button is always
 * in the same place, and it always says where it is going.
 *
 * The transition is a short cross-fade with a 10 px lift, not a slide. A horizontal slide
 * implies the steps are laid out in space and invites a swipe that does not work.
 */

export type SendStep = 1 | 2 | 3 | 4 | 5;

export const STEPS: { n: SendStep; key: string; label: string }[] = [
  { n: 1, key: "flowers", label: "Flowers" },
  { n: 2, key: "greenery", label: "Greenery" },
  { n: 3, key: "arrange", label: "Arrange" },
  { n: 4, key: "card", label: "Card" },
  { n: 5, key: "send", label: "Send" },
];

export function StepRail({
  current,
  onJump,
}: {
  current: SendStep;
  onJump: (step: SendStep) => void;
}) {
  return (
    <ol className="hide-scrollbar -mx-4 flex items-center gap-1 overflow-x-auto px-4 md:mx-0 md:justify-center md:px-0">
      {STEPS.map((step) => {
        const done = step.n < current;
        const active = step.n === current;
        return (
          <li key={step.key} className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => (done || active ? onJump(step.n) : undefined)}
              // only a step already passed is a legitimate target: jumping forward would
              // skip a choice the flow depends on
              disabled={!done && !active}
              aria-current={active ? "step" : undefined}
              className={cn(
                "group flex items-center gap-2 rounded-full px-2.5 py-1.5 transition-colors",
                done && "hover:bg-current/5",
                !done && !active && "cursor-default opacity-40"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border font-mono text-[0.58rem] transition-colors",
                  active
                    ? "border-[var(--gold-ink)] bg-[var(--gold-ink)] text-[var(--paper)]"
                    : done
                      ? "border-[var(--gold-ink)]/60 text-[var(--gold-ink)]"
                      : "border-current/25"
                )}
              >
                {done ? "✓" : String(step.n).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "font-mono text-[0.6rem] uppercase tracking-[0.2em]",
                  active ? "opacity-100" : "opacity-60"
                )}
              >
                {step.label}
              </span>
            </button>
            {step.n !== 5 ? <span className="mx-0.5 h-px w-4 bg-current/15" aria-hidden /> : null}
          </li>
        );
      })}
    </ol>
  );
}
