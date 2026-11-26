// The film as a link.
//
// The instrument has always been shareable: the URL is the whole recipe. The
// film was not — someone could send you the homepage and nothing else, and you
// could not send someone the moment you were looking at.
//
// This gives the film the same contract, with one difference that matters. The
// instrument encodes what you built, which is exact and permanent. The film
// encodes where you are, which changes sixty times a second as you scroll: writing
// every frame would thrash the history and the network. So reads are exact, and
// writes are throttled to a cadence a human would notice as "current" and a
// browser would not notice as abuse.

export type FilmState = {
  /** the chapter id: bloom, scatter, closer, stems, build or care */
  chapter: string;
  /** 0–1 through the chapter, so a link can land mid-bloom */
  progress?: number;
  /** which of the ten is in the vitrine at the stems chapter */
  stem?: string;
};

const CHAPTERS = ["bloom", "scatter", "closer", "stems", "build", "care"];

export function readFilmState(): FilmState {
  const params = new URLSearchParams(window.location.search);
  const chapterRaw = params.get("chapter") ?? "";
  const chapter = CHAPTERS.includes(chapterRaw) ? chapterRaw : "bloom";

  const bloomRaw = Number.parseFloat(params.get("bloom") ?? "");
  const progress = Number.isFinite(bloomRaw) ? Math.min(1, Math.max(0, bloomRaw)) : undefined;

  const stem = params.get("stem") || undefined;
  return { chapter, progress, stem };
}

/**
 * Jumps to `top` without animating.
 *
 * The site sets `scroll-behavior: smooth` globally, and a deep link crosses seven
 * thousand pixels: the smooth scroll takes seconds, and every sample taken during
 * it reports a chapter the reader is passing through rather than the one they
 * asked for. Overriding the behaviour for this one call is the only way to make a
 * share link open where it points.
 */
export function jumpTo(top: number) {
  const root = document.documentElement;
  const before = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  window.scrollTo(0, top);
  root.style.scrollBehavior = before;
}

/** the scroll position for a chapter, or for a fraction of the way through it */
export function scrollTarget(state: FilmState): number {
  const el = document.getElementById(state.chapter);
  if (!el) return 0;
  const top = el.getBoundingClientRect().top + window.scrollY;
  if (state.progress === undefined) return top;
  /*
   * A chapter is measured in viewport-heights of scroll, and its staged content
   * pins to the top of the frame for the whole of it. So the chapter's first beat
   * is `top`, and moving into it is what "60% through the bloom" should mean.
   */
  return top + state.progress * Math.max(0, el.offsetHeight - window.innerHeight);
}

/**
 * `bloom` only means anything while the bloom chapter is on screen. Left in the
 * URL, it would rewind a reader who scrolled on and then copied the link.
 */
function withChapter(url: URL, here: { chapter: string; progress: number }): string {
  if (here.chapter === "bloom") url.searchParams.set("bloom", (Math.round(here.progress * 100) / 100).toString());
  else url.searchParams.delete("bloom");
  url.searchParams.set("chapter", here.chapter);
  return `${url.pathname}${url.search}`;
}

/** the chapter crossing the middle of the viewport, and how far into it we are */
function position(): { chapter: string; progress: number } | null {
  const mid = window.scrollY + window.innerHeight * 0.5;
  let found: string | null = null;
  for (const id of CHAPTERS) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (mid >= el.getBoundingClientRect().top + window.scrollY) found = id;
  }
  if (!found) return null;
  const el = document.getElementById(found)!;
  const top = el.getBoundingClientRect().top + window.scrollY;
  const span = Math.max(1, el.offsetHeight - window.innerHeight);
  return { chapter: found, progress: Math.min(1, Math.max(0, (window.scrollY - top) / span)) };
}

/**
 * Writes the film's state back into the URL, at most once every `every` ms.
 *
 * `replaceState` rather than `pushState`: a viewer scrolling a film does not want
 * sixty history entries, and the back button should leave the film, not rewind it.
 *
 * The writer starts out believing the URL it was handed — otherwise the first
 * write after a deep link would erase the very chapter the link named, before the
 * film had finished landing on it.
 */
export function startLinkWriter(every = 1200) {
  let timer = 0;
  let last = "";
  let armed = false;

  const write = () => {
    timer = 0;
    if (!armed) return;
    const here = position();
    if (!here) return;

    const next = withChapter(new URL(window.location.href), here);
    if (next === last) return;
    last = next;
    window.history.replaceState(window.history.state, "", next);
  };

  const onScroll = () => {
    if (timer) return;
    timer = window.setTimeout(write, every);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  return {
    /**
     * Arms the writer, on the state the page believes it is in.
     *
     * Called once the film has landed. Until then nothing is written: an unarmed
     * writer on a deep link would publish the top of the film over the chapter the
     * link named, which is exactly the bug this replaces.
     */
    arm() {
      const here = position();
      const url = new URL(window.location.href);
      last = here ? withChapter(url, here) : url.search;
      armed = true;
    },
    /** writes now, ignoring the throttle */
    flush: write,
    stop() {
      window.removeEventListener("scroll", onScroll);
      if (timer) window.clearTimeout(timer);
    },
  };
}
