"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FileDown, Loader2, Printer } from "lucide-react";

import { bouquetTitle, encodeBouquet } from "@/lib/bouquet";
import { printDims } from "@/lib/print";
import { useSynth } from "@/lib/store";

/**
 * The specimen mount.
 *
 * The studio can hand you an STL, which is the model and nothing else: no scale
 * note, no dimensions, no record of what it is. A maker holding a 240 mm flower
 * and a slicer wants a sheet beside it — what it measures, what it weighs in
 * triangles, which specimen it is, and a picture to check the print against.
 *
 * This is that sheet, rendered as HTML and printed by the browser. A PDF library
 * would be a megabyte of dependency to reproduce what `window.print()` already
 * does, and the browser's own page setup is better at paper sizes than we are.
 * The @media print rules below are what make it a sheet rather than a webpage.
 */
export function PrintSheet() {
  const config = useSynth((s) => s.config);
  const theme = useSynth((s) => s.theme);
  const [state, setState] = useState<"idle" | "working">("idle");
  /*
   * Portalled into <body>.
   *
   * The sheet has to be a child of the body for the print rules to be simple and
   * correct: hide every child of the body, then show the sheet again. Nested in
   * the studio's column, hiding the chrome also hid its ancestors.
   */
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);

  const title = bouquetTitle(config);
  const query = encodeBouquet(config);

  /* the dimensions walk the whole mesh, so they are not computed while typing */
  const dims = useMemo(() => printDims(config), [config]);

  const print = useCallback(() => {
    setState("working");
    /* let the button paint its pressed state, and the card image load, before the dialog */
    window.setTimeout(() => {
      window.print();
      setState("idle");
    }, 120);
  }, []);

  return (
    <>
      <button type="button" onClick={print} disabled={state === "working"} className="btn btn-ghost mt-2 disabled:opacity-50">
        {state === "working" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
        Print the sheet
      </button>

      {/*
        * The sheet itself is always in the DOM and only visible on paper: a print
        * stylesheet that has to build the sheet at print time is a stylesheet that
        * has to wait for an image, and browsers do not wait.
        */}
      {host
        ? createPortal(
            <section className="print-sheet" aria-hidden>
        <header className="print-sheet__head">
          <div>
            <p className="print-sheet__kicker">Flora-Synth · specimen mount</p>
            <h1 className="print-sheet__title">{title}</h1>
            <p className="print-sheet__latin">
              {config.species.length} species · {config.palette} · {config.arrangement} · {config.vessel}
            </p>
          </div>
          <div className="print-sheet__seal">
            <span>seed</span>
            <strong>{config.seed.toString(36).toUpperCase()}</strong>
          </div>
        </header>

        <div className="print-sheet__body">
          <figure className="print-sheet__figure">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/og?${query}&theme=${theme}`} alt={`${title}, drawn from numbers`} />
            <figcaption>The composition, as drawn in the browser. Not a photograph.</figcaption>
          </figure>

          <dl className="print-sheet__spec">
            <div>
              <dt>Height</dt>
              <dd>{dims.height} mm</dd>
            </div>
            <div>
              <dt>Width</dt>
              <dd>{dims.width} mm</dd>
            </div>
            <div>
              <dt>Depth</dt>
              <dd>{dims.depth} mm</dd>
            </div>
            <div>
              <dt>Stems</dt>
              <dd>{dims.stems}</dd>
            </div>
            <div>
              <dt>Triangles</dt>
              <dd>{dims.triangles.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Wall, nominal</dt>
              <dd>{dims.wall.toFixed(2)} mm</dd>
            </div>
          </dl>
        </div>

        <div className="print-sheet__recipe">
          <p className="print-sheet__kicker">The recipe</p>
          <code>{query}</code>
        </div>

        <footer className="print-sheet__foot">
          <span>
            Print at 100%. The STL is millimetres at 1:1; the picture is a reference, not a template.
          </span>
          <span>
            <FileDown className="print-sheet__icon" aria-hidden /> flora-synth-{config.seed.toString(36)}
          </span>
        </footer>
            </section>,
            host
          )
        : null}
    </>
  );
}
