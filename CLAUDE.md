# CLAUDE.md — elektrolab

3D electrostatics study app for the user's Czech gymnázium class, **presented to the class and
the teacher**. Zero deps, no build: `index.html` + ES modules, Three.js r160 via jsDelivr import map.
`npm test` (node --test) · `npm start` → http://localhost:4340. Hosted later on GitHub Pages.
The full stage plan is in `plan.txt` (keep it current).

## The rule that matters most: match the class

Everything shown must match what was taught. The sources are the lesson PDFs 02–06 in
`lessons/` (read them with `pdftotext -layout`). Lesson 01 and the handwritten notes
`Coulumbův Zákon.pdf` are no longer on disk — their rules live in `plan.txt`. **The handwritten
notes win when they differ from the PDFs** (e.g. the socket: d = 0,02 m → 11 500 V·m⁻¹).

- Symbols: Q, **r** for distance (not R), F_e, E, W, U, U_AB, φ, Ep, d. No q, no vector components.
- Coulomb's law as on the board: F_e = 1/(4·π·ε)·Q₁·Q₂/r², ε = ε₀·εᵣ. The k = 9·10⁹ form is the
  vacuum/air shortcut.
- Constants and εᵣ table live in `src/core/constants.js`, with only the values from the notes.
  Range-only materials (papír, sklo) are deliberately absent.
- Numbers: decimal comma, `3,6·10⁶` (centre dot), units `V·m⁻¹` (primary) = `N·C⁻¹`.
- **No φ = k·Q/r formula anywhere** (not taught; the user chose visual-only potential).
- Presets and "Příklad ze sešitu" use only values from the lessons. An estimate must say so.
- UI text is Czech. Before adding any new term or formula, check it is in the notes.

## The boundary

`src/core/*` is pure (no DOM, no `three`): physics, field-line tracing, Czech formatting, the
status sentence, the sešit examples. Browser files (`scene.js`, `charges.js`, `arrows.js`,
`lines.js`, `ui.js`, `main.js`) only render. New physics goes in `core/` with a test.

## Průvodce and Laboratoř

`body[data-view]` = `'guide'` (default, `story.js`; the button says **Teorie** — renamed from Průvodce 2026-10-31) | `'lab'`. Every guide chapter has the same
build (the user's request, 2026-10-30): **Co to je** (one-sentence bullets from the notes) →
**Vzorec** (+ live substitution from the scene; "Odkud je 8,85·10⁻¹²?") → scene controls (no
legend — removed at the user's request 2026-10-30; ≤ 2 controls, live value) → **Příklady ze sešitu** (`examples: []`, Coulomb has ≥ 2; zadání; solution only after a click;
"Ukázat ve scéně" loads the matching example id). The theory must describe what the picture shows.
Texts live in `core/chapters.js`; `tests/chapters.test.js` checks the structure, that each example's
last step shows the sešit answer, and class symbols. Elementary charge was barely taught — keep it
to one small note. Every other control belongs in the lab. `main.js` builds scenes in `loadPage(id)`.
URL: `?kapitola=<page id>` or `?lab=<mode>`. Camera-view buttons are `.views [data-view]` (the
body also has `data-view`, so never select a bare `[data-view]`).

## Modes

`state.mode` = `'naboj'` (guide only: ebonite rod + rag, `naboj.js`) | `'relativita'` (guide only: AU and planets,
`relativita-scene.js` + `core/relativita.js`; discussed in class, not in the sešit — keep it labelled "z hodiny") |
`'coulomb'` | `'pole'` |
`'prace'` (bench 0,4 m, plates 10 cm apart, ideal homogeneous E from `core/work.js`; plates are
drawn and give siločáry, but readouts use the ideal E). Sections use `.only-<mode>` / `.not-<mode>`. `body[data-mode]` hides `.only-coulomb`
/ `.only-pole` sections; examples carry `mode` and only show in their mode. Charged plates
(`core/plates.js`) are a grid of point charges added to `sources`; they are not draggable charges.
Colours (`core/colormap.js`): log10|E|, dark → light = weak → strong (lesson 04 shows strength by
colour, not arrow length). The colour range is cached per charge/plate/scale set in vacuum, so
changing the medium visibly darkens the field — don't re-normalise it per frame.

## Conventions

- SI everywhere: C, m, N. Charges lie in the bench plane y = 0; the bench mesh sits one radius below.
- Bench sizes 4 m (grid 0,5 m) and 0,4 m (grid 5 cm); kulička radius = 2 % of the bench, minimum
  centre distance = 2,5 radii (`constrain` in `main.js`).
- Force arrows are log-scaled (`arrows.js`): 5 decades between shortest and longest. The caption
  says so; real values are in the Měření panel.
- `tests/examples.test.js` is the regression net: every sešit example must round to the sešit answer.
- Physics code is commented in Czech for learning. Keep that style.
- Mobile (≤ 720 px): `.figure` and (in Teorie) `.guide` are `display: contents`, ordered: chapter dots +
  title → scene → controls → theory → formula → examples. The scene is NOT sticky (user disliked it). Keep figure children
  as direct page items there; narrow-screen camera distance is `VIEW_FIT` in `scene.js`.
- `window.__el` is a debug handle; `__el.flush()` forces a recompute (a background tab doesn't
  run animation frames, so browser checks need it).
