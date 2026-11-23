# Third-party material

## Lumette LM-25 "Stamen" v1.0.1

The scrolling film on `/` is built from the Lumette "Stamen" kit: its renderer
architecture (`lib/stamen/director.ts`), petal and stem geometry, camera script,
chapter structure and stylesheet are derived from that kit, which is licensed
per-site under a single-seat licence held by the site's owner.

The kit's own licence forbids redistributing its source files. The archive is
therefore **not** in this repository — `google_drive/` is git-ignored — and the
copy here exists only as the deployed site, adapted as described below. If you
are reading this repository and want to use the film for something of your own,
buy the kit from Lumette rather than taking these files.

Adaptations:

- ten specimens instead of six (the kit's six plus Ghost orchid, King protea,
  Café au Lait dahlia and Velvet anthurium), all still fully procedural
- commerce removed: no prices, plans, bag, checkout or delivery copy
- Flora-Synth's garnet/antique-gold palette in place of the kit's magenta
- the stem library's rail is driven by chapter progress rather than per-plate
  camera cues, and the font stack is aliased to the packages this app installs

## Fonts

Cormorant Garamond, Instrument Serif, Schibsted Grotesk and JetBrains Mono
(via `@fontsource`), plus Fraunces and Geist for the film (via
`@fontsource-variable`). All are SIL Open Font License 1.1.

## Everything else

Every flower, stem, vessel, wrap, shadow and caustic is generated in the browser
from code. There are no model, image, video or audio files in this repository.
