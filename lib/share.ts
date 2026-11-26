/**
 * Sharing a composition.
 *
 * The clipboard is the desktop answer. On a phone it is a dead end: `writeText`
 * either needs a permission most browsers do not grant, or it copies a URL the
 * user then has to go and find a place to paste. The Web Share API is the
 * native answer and it can carry an image as well as a link.
 *
 * So: try the native sheet first, with the share card attached as a file; fall
 * back to the clipboard; and report which one happened so the button can say the
 * right thing. Nothing here throws — a share that cannot happen returns
 * "failed" and the caller shows the URL to select by hand.
 */

export type ShareOutcome = "shared" | "copied" | "failed";

/** Some browsers expose `share` but reject a file payload; those still want the link. */
function canShareFiles(files: File[]): boolean {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}

/**
 * Fetches the Open Graph card for this recipe and wraps it as a file.
 *
 * The card route is deterministic for a given query, so this costs one request
 * and is served from the CDN on every share after the first.
 */
async function cardFile(query: string, title: string): Promise<File | null> {
  try {
    const res = await fetch(`/api/og?${query}`, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    const name = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "flora-synth"}.png`;
    return new File([blob], name, { type: blob.type });
  } catch {
    return null;
  }
}

export type ShareRequest = {
  /** the full share link, already built by `useShareUrl` */
  url: string;
  /** the composition's title, used for the sheet's heading and the file name */
  title: string;
  /** the recipe query, without the leading "?" — what `/api/og` expects */
  query: string;
  /** a line to go with the link where the platform supports one */
  text?: string;
};

export async function shareBouquet({ url, title, query, text }: ShareRequest): Promise<ShareOutcome> {
  const payloadText = text ?? "A bouquet drawn from numbers, in Flora-Synth.";

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    // The card is a nicety: a slow or failed fetch should not hold up the sheet,
    // so it races a short deadline and the share proceeds with the link alone.
    const file = await Promise.race([cardFile(query, title), new Promise<null>((r) => setTimeout(() => r(null), 2500))]);

    const withFile =
      file && canShareFiles([file])
        ? { files: [file], title, text: payloadText }
        : { title, text: payloadText, url };

    try {
      await navigator.share(withFile);
      return "shared";
    } catch (err) {
      // AbortError is the user closing the sheet: that is not a failure worth
      // retrying through the clipboard.
      if (err instanceof DOMException && err.name === "AbortError") return "shared";
      // Anything else (a platform that rejects one of the fields) gets the link-only attempt.
      try {
        await navigator.share({ title, text: payloadText, url });
        return "shared";
      } catch {
        /* fall through to the clipboard */
      }
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
