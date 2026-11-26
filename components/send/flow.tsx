"use client";

import { useCallback, useEffect, useState } from "react";

import { ArrangeStep } from "@/components/send/arrange";
import { CardStep } from "@/components/send/card";
import { FlowersStep } from "@/components/send/flowers";
import { GreeneryStep } from "@/components/send/greenery";
import { SendStep } from "@/components/send/send";
import { STEPS, StepRail, type SendStep as StepNo } from "@/components/send/step";
import { useSend } from "@/lib/send-store";

/**
 * The flow.
 *
 * A step number in state rather than in the URL. That is the deliberate difference from
 * the studio, which owns its address bar because its URL *is* the bouquet: here the URL
 * would only ever say "step three", and a half-written letter behind a shareable link is
 * worse than no link at all.
 *
 * The draft, though, does survive a reload — restored from sessionStorage by the store on
 * mount — because losing a letter to an accidental refresh is the kind of thing that
 * makes somebody close the tab.
 */
export function SendFlow({ initialStep = 1 }: { initialStep?: StepNo }) {
  const [step, setStep] = useState<StepNo>(initialStep);
  const seed = useSend((s) => s.seed);
  const seeded = useSend((s) => s.seeded);
  const code = useSend((s) => s.code);

  useEffect(() => {
    seed();
  }, [seed]);

  /*
   * `seeded` means "the draft has been read back from sessionStorage", which is a browser
   * concern — on the server it is always false. Gating the whole flow on it shipped a page
   * whose server HTML was a single empty `aria-busy` div: no heading, no copy, nothing a
   * crawler or a no-JS visitor could read, and a visible flash before the real first step
   * arrived. A restored draft only ever has to *replace* the default draft, never precede
   * it, so the page renders step one immediately and the restore lands underneath it.
   */

  // a completed gift is a terminal state: reopening the flow should not silently start
  // a second one in the same session
  useEffect(() => {
    if (code && step < 5) setStep(5);
  }, [code, step]);

  const go = useCallback((next: StepNo) => {
    setStep(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const label = STEPS.find((s) => s.n === step);

  /*
   * The page needs exactly one h1, and the steps each draw their own as an h2. Without
   * this the route shipped with no first-level heading at all — the same defect the
   * collection and plot pages had, and the same reason it is easy to miss: the page
   * looks finished, and only a crawler or a screen-reader outline notices.
   */
  return (
    <div className="pt-20 md:pt-24">
      <h1 className="sr-only">Send a bouquet</h1>
      <div className="border-b border-current/8 pb-4">
        <StepRail current={step} onJump={go} />
      </div>

      {/* an h1 per step, owned by the step, is announced when the step changes */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        Step {step} of 5: {label?.label}
      </div>

      {step === 1 ? <FlowersStep key={seeded ? "restored" : "fresh"} onNext={() => go(2)} onBack={() => undefined} /> : null}
      {step === 2 ? <GreeneryStep onNext={() => go(3)} onBack={() => go(1)} /> : null}
      {step === 3 ? <ArrangeStep onNext={() => go(4)} onBack={() => go(2)} /> : null}
      {step === 4 ? <CardStep onNext={() => go(5)} onBack={() => go(3)} /> : null}
      {step === 5 ? <SendStep onBack={() => go(4)} /> : null}
    </div>
  );
}
