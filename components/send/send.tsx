"use client";

import { Check, Copy, KeyRound, Lock, Loader2, QrCode } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { StepNav } from "@/components/send/flowers";
import { Envelope, LetterPaper } from "@/components/synth/envelope";
import { encodeBouquet } from "@/lib/bouquet";
import { parseVideo } from "@/lib/gift";
import { useSend } from "@/lib/send-store";
import { cn } from "@/lib/utils";

/**
 * Step five: sealing it.
 *
 * Three things happen in order, and the interface has to be honest about each because
 * they can each fail separately:
 *
 *   1. the gift row is created — this mints the code and the one-time owner key
 *   2. the photographs and the voice are uploaded against that code
 *   3. the link is shown, with the key beside it
 *
 * The order matters: a media path is built from the code, so media cannot be uploaded
 * before the gift exists. It also means a failed upload never leaves an orphan in the
 * bucket, because the code it would have written under does not exist yet.
 *
 * The owner key is shown exactly once, in a panel that says so. There are no accounts,
 * so this is the only copy — and it is the difference between a gift that can be edited
 * and deleted and one that can only be looked at.
 */
export function SendStep({ onBack }: { onBack: () => void }) {
  const draft = useSend((s) => s.draft);
  const code = useSend((s) => s.code);
  const ownerKey = useSend((s) => s.ownerKey);
  const markSent = useSend((s) => s.markSent);

  const [phase, setPhase] = useState<"review" | "creating" | "uploading" | "done" | "error">(
    code ? "done" : "review"
  );
  const [error, setError] = useState<string | null>(null);
  const [uploadNote, setUploadNote] = useState<string>("");
  const [copied, setCopied] = useState<"link" | "key" | null>(null);
  const [showQr, setShowQr] = useState(false);

  /** PIN is optional, but only digits of a sensible length are accepted by the API. */
  const pinValid = draft.pin === "" || /^\d{4,6}$/.test(draft.pin);
  const canSeal = pinValid;

  const giftUrl = useMemo(() => {
    if (typeof window === "undefined" || !code) return "";
    return `${window.location.origin}/gift/${code}`;
  }, [code]);

  const copy = async (value: string, which: "link" | "key") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 2200);
    } catch {
      /* the URL is selectable by hand */
    }
  };

  const upload = useCallback(
    async (giftCode: string, key: string) => {
      const failures: string[] = [];

      for (let i = 0; i < draft.photos.length; i++) {
        const photo = draft.photos[i];
        if (!photo.dataUrl) continue; // a restored draft has no bytes to send
        setUploadNote(`Photograph ${i + 1} of ${draft.photos.length}`);
        try {
          const blob = await fetch(photo.dataUrl).then((r) => r.blob());
          const form = new FormData();
          form.set("kind", "photo");
          form.set("index", String(i));
          form.set("alt", photo.alt);
          form.set("ratio", String(photo.ratio));
          form.set("file", new File([blob], `photo-${i}.jpg`, { type: "image/jpeg" }), "photo.jpg");
          const res = await fetch(`/api/gift/${giftCode}/media`, {
            method: "POST",
            headers: { "x-flora-key": key },
            body: form,
          });
          if (!res.ok) failures.push(`photograph ${i + 1}`);
        } catch {
          failures.push(`photograph ${i + 1}`);
        }
      }

      if (draft.voice?.blob) {
        setUploadNote("the voice note");
        try {
          const form = new FormData();
          form.set("kind", "voice");
          form.set("duration", String(draft.voice.duration));
          form.set("file", new File([draft.voice.blob], "voice.webm", { type: draft.voice.blob.type || "audio/webm" }));
          const res = await fetch(`/api/gift/${giftCode}/media`, {
            method: "POST",
            headers: { "x-flora-key": key },
            body: form,
          });
          if (!res.ok) failures.push("the voice note");
        } catch {
          failures.push("the voice note");
        }
      }

      return failures;
    },
    [draft.photos, draft.voice]
  );

  const seal = async () => {
    setError(null);
    setPhase("creating");

    try {
      const res = await fetch("/api/gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: encodeBouquet(draft.config),
          creator: draft.creator,
          message: draft.message,
          recipient: draft.recipient,
          register: draft.register,
          pin: draft.pin,
          video: draft.videoUrl ? parseVideo({ url: draft.videoUrl }) : null,
          envelope: draft.envelope,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(
          body.error === "bad-pin"
            ? "A PIN has to be four to six digits."
            : body.error === "too-many"
              ? "Too many gifts from this connection. Try again in a minute."
              : "The gift could not be sealed. Try again."
        );
        setPhase("error");
        return;
      }

      const data = (await res.json()) as { code: string; ownerKey: string };
      markSent(data.code, data.ownerKey);

      setPhase("uploading");
      const failures = await upload(data.code, data.ownerKey);

      if (failures.length) {
        // the gift exists and is readable; only the extras failed. Say so plainly rather
        // than claiming a clean success.
        setUploadNote(`Could not attach ${failures.join(", ")}. Everything else was sealed.`);
      }

      setPhase("done");
    } catch {
      setError("The network dropped before the gift was sealed.");
      setPhase("error");
    }
  };

  /* ------------------------------------------------------------------- review */
  if (phase === "review" || phase === "error") {
    return (
      <>
        <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:gap-12">
          <div>
            <LetterPaper style={draft.envelope}>
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.26em] opacity-50">To</p>
              <p className="mt-1 font-display text-[1.7rem] leading-tight">{draft.recipient || "—"}</p>
              <div className="my-5 h-px w-full bg-current/12" aria-hidden />
              <p className="whitespace-pre-wrap font-display text-[1.12rem] leading-[1.8]">
                {draft.message || "—"}
              </p>
              <p className="mt-6 font-display text-[1.05rem] italic opacity-70">{draft.creator || ""}</p>
            </LetterPaper>

            <div className="mt-6 rounded-sm border border-current/12 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.24em] opacity-60">
                    <Lock size={11} aria-hidden />
                    Optional PIN
                  </p>
                  <p className="mt-1.5 max-w-[26rem] text-[0.78rem] leading-snug opacity-55">
                    Four to six digits. The recipient will need it before the envelope opens — and
                    before any photograph or voice is served. Send it separately, not in the same message.
                  </p>
                </div>
              </div>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={draft.pin}
                onChange={(e) => useSend.getState().set("pin", e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="No PIN"
                aria-label="A PIN for this gift"
                aria-invalid={!pinValid}
                className="mt-3 w-32 rounded-sm border border-current/15 bg-transparent px-3 py-2 font-mono text-[0.95rem] tracking-[0.3em] outline-none placeholder:tracking-normal placeholder:opacity-30 focus:border-current/35"
              />
              {!pinValid ? (
                <p role="alert" className="mt-1.5 text-[0.7rem] text-[var(--danger)]">
                  A PIN has to be four to six digits.
                </p>
              ) : null}
            </div>

            {error ? (
              <p role="alert" className="mt-4 text-[0.8rem] text-[var(--danger)]">
                {error}
              </p>
            ) : null}
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-sm border border-current/12 p-5">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.24em] opacity-60">
                What they receive
              </p>
              <ul className="mt-3 space-y-2 text-[0.82rem] leading-snug opacity-70">
                <Summary label="Flowers" value={`${draft.config.species.length} species`} />
                <Summary
                  label="Greenery"
                  value={draft.config.foliage === "none" ? "none" : draft.config.foliage}
                />
                <Summary label="Music" value={draft.register} />
                <Summary label="Photographs" value={String(draft.photos.length)} />
                <Summary label="Voice" value={draft.voice ? `${draft.voice.duration}s` : "none"} />
                <Summary label="Video" value={draft.videoUrl && !parseVideo({ url: draft.videoUrl }) ? "invalid" : draft.videoUrl ? "1" : "none"} />
                <Summary label="PIN" value={draft.pin ? "yes" : "none"} />
              </ul>

              <button
                type="button"
                onClick={() => void seal()}
                disabled={!canSeal}
                className="btn btn-primary mt-5 w-full disabled:opacity-40"
              >
                Seal and create the link
              </button>
              <p className="mt-2 text-center font-mono text-[0.5rem] uppercase tracking-[0.2em] opacity-40">
                No account. Nothing to sign up for.
              </p>
            </div>
          </div>
        </div>

        <StepNav onBack={onBack} onNext={() => void seal()} label="Seal it" disabled={!canSeal} />
      </>
    );
  }

  /* ------------------------------------------------------------------ working */
  if (phase === "creating" || phase === "uploading") {
    return (
      <div className="mx-auto flex min-h-[50svh] max-w-md flex-col items-center justify-center text-center">
        <Loader2 size={22} className="animate-spin opacity-40" aria-hidden />
        <p className="mt-5 font-display text-[1.5rem] italic">
          {phase === "creating" ? "Sealing the bouquet…" : `Attaching ${uploadNote}…`}
        </p>
        <p className="mt-2 font-mono text-[0.55rem] uppercase tracking-[0.24em] opacity-40">
          Nothing is public. The garden only lists what you choose to show.
        </p>
        <div className="mt-8 w-full">
          {/* the envelope, opening while it waits */}
          <Envelope style={draft.envelope} sealLetter={draft.creator.slice(0, 1) || "✦"} label="Sealing">
            <div className="h-2" />
          </Envelope>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------- done */
  return (
    <div className="mx-auto max-w-[54rem]">
      <div className="text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-[var(--gold-ink)]/50">
          <Check size={18} className="text-[var(--gold-ink)]" aria-hidden />
        </div>
        <h2 className="mt-5 font-display text-[clamp(1.7rem,3.6vw,2.6rem)] leading-tight">
          Sealed for {draft.recipient || "them"}.
        </h2>
        <p className="mx-auto mt-3 max-w-[32rem] text-[0.92rem] leading-relaxed text-ink-soft">
          {uploadNote && uploadNote.startsWith("Could not") ? uploadNote : "The link is the gift. Send it however you like."}
        </p>
      </div>

      {/* the link */}
      <div className="mt-8 rounded-sm border border-[var(--gold-ink)]/35 p-5">
        <p className="font-mono text-[0.55rem] uppercase tracking-[0.26em] text-[var(--gold-ink)]">
          The gift link
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-[2px] bg-current/5 px-3 py-2 font-mono text-[0.8rem]">
            {giftUrl}
          </code>
          <button type="button" onClick={() => void copy(giftUrl, "link")} className="btn btn-primary gap-2">
            {copied === "link" ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
            {copied === "link" ? "Copied" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={() => setShowQr((v) => !v)}
            aria-expanded={showQr}
            className="btn btn-ghost gap-2"
          >
            <QrCode size={12} aria-hidden />
            QR
          </button>
        </div>

        <p className="mt-2 font-mono text-[0.55rem] uppercase tracking-[0.2em] opacity-45">
          code {code}
        </p>

        {showQr ? (
          <div className="mt-4 flex justify-center">
            {/* drawn at request time by our own route; no third-party QR service sees the link */}
            {/* eslint-disable-next-line @next/next/no-img-element -- a generated SVG, not an optimisable asset */}
            <img
              src={`/api/gift/${code}/qr`}
              alt={`A QR code that opens the gift at ${giftUrl}`}
              width={188}
              height={188}
              className="rounded-sm bg-white p-2"
            />
          </div>
        ) : null}
      </div>

      {/* the key */}
      <div className="mt-4 rounded-sm border border-current/15 bg-current/[0.03] p-5">
        <p className="flex items-center gap-2 font-mono text-[0.55rem] uppercase tracking-[0.26em] opacity-60">
          <KeyRound size={11} aria-hidden />
          Your key — shown once
        </p>
        <p className="mt-2 max-w-[40rem] text-[0.8rem] leading-relaxed opacity-65">
          There are no accounts on Flora, so this key is the only way back to this gift. Keep it and
          you can change the letter, remove a photograph or delete the gift. Lose it and the gift
          still works — you simply cannot edit it.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-[2px] bg-current/5 px-3 py-2 font-mono text-[0.68rem]">
            {ownerKey}
          </code>
          <button
            type="button"
            onClick={() => ownerKey && void copy(ownerKey, "key")}
            className="btn btn-ghost gap-2"
          >
            {copied === "key" ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
            {copied === "key" ? "Copied" : "Copy key"}
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a href={`/gift/${code}`} className="btn btn-gold">
          See it as they will
        </a>
        <a href="/send" className="btn btn-ghost">
          Send another
        </a>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between gap-3 border-b border-current/8 pb-2 last:border-0">
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.2em] opacity-50">{label}</span>
      <span className={cn("font-display text-[0.9rem] capitalize")}>{value}</span>
    </li>
  );
}
