# Native CVA element sources

Issues #5430 and #5435, checked 2026-10-26. This notice accompanies the selected source
snapshots and their CVA adaptations. Source availability and syntax checks are
separate from browser interaction, visual acceptance and independent export QA.

## Basecoat

Upstream: https://github.com/hunvreus/basecoat

Pinned revision: `6769c83c9644ec4195ed30af028a9e66fe670215` (v1.1.0).
MIT, **Copyright (c) 2025 Ronan Berder**. The full copyright, permission and
warranty notice is preserved in [upstream/basecoat/LICENSE.md](upstream/basecoat/LICENSE.md).
Include this license when distributing `elements-vendor.js` or its adapted code.
The complete Basecoat and HyperUI MIT texts are also embedded as plain comments
in `elements-vendor.js`, which accompanies the controls in an independent HTML
export. Exported source therefore retains the notices without needing a separate
network lookup or relying only on this Markdown link.

| Unmodified snapshot | Original path | Bytes | SHA-256 |
|---|---|---:|---|
| `upstream/basecoat/LICENSE.md` | `LICENSE.md` | 1068 | `160a6cea26ff1931297957499ab739e94c4bc79ecea18b490c9f533fa76ace78` |
| `upstream/basecoat/tabs.js` | `src/js/tabs.js` | 3928 | `58f5df78880ea6141225da080a1efde90aaf2c8351e4e54e3c13433e088ad631` |
| `upstream/basecoat/range.js` | `src/js/range.js` | 835 | `6fabd053a744f2f08dff2d1a5c712218252c42f9fcc80098d3e3aab8ab7a6204` |

Original URLs use
`https://raw.githubusercontent.com/hunvreus/basecoat/6769c83c9644ec4195ed30af028a9e66fe670215/`
followed by the original path above. The raw snapshots are provenance, not loaded scripts.

`elements-vendor.js` adapts the actual tabs selection, roving tabindex,
directional arrows, Home/End, disabled exclusion, range percent calculation and
listener cleanup into explicit `CVA_ELEMENT_VENDOR.mountTabs(root)` and
`mountRange(input)` functions. The changes go beyond registration glue:

- The global Basecoat registry, document observer and DOM property methods are
  omitted. CVA owns mount/dispose and replaces the rendered instance as a unit.
- Fixed instance-owned arrays replace the original WeakMap/refresh machinery.
  Panel lookup is limited to the passed tab root, rather than document IDs.
  Tab membership is checked before acting on delegated clicks.
- Each function returns the matching listener removal callback. No document
  listeners, storage, network requests, timer or separate CSS runtime are added.
- The range calculation itself is retained. Labels, value output, validation,
  browser thumb CSS and CVA typography are supplied by the CVA control caller.

The native dialog structure was also inspected in
`site/src/docs/components/dialog.mdx` at the same revision (16612 bytes,
SHA-256 `15dc5f6cbe4e12b9f747a89ae01296497f67cdd569bf0e2f5db39f7afca17724`).
The CVA overlay uses labelled native dialog/showModal/close and backdrop press
semantics, with instance-owned listeners. The demo's fake save-by-close action
is not included. Native popover uses the platform's declarative invoker; an
unsupported environment receives an inline disclosure with explicit close and
Escape, without claiming modal focus trapping. Full Basecoat CSS is not copied:
its component sources contain uncompiled Tailwind `@apply` directives.

## HyperUI

Upstream: https://github.com/markmead/hyperui

Pinned revision: `252efcfe39161db6e67cd877da001ee248d2bbf6`.
MIT, **Copyright (c) Mark Mead**. The full copyright, permission and warranty
notice is preserved in [upstream/hyperui/LICENSE](upstream/hyperui/LICENSE).
Include this license when distributing the adapted HTML/CSS/SVG units.

| Unmodified snapshot | Original path under `public/examples/` | Bytes | SHA-256 |
|---|---|---:|---|
| `upstream/hyperui/LICENSE` | repository root `LICENSE` | 1061 | `60e0bb845a95da072acc1ada114cf8ce325347ed9d5f802d8d7fd9b511248f98` |
| `upstream/hyperui/buttons-3.html` | `neobrutalism/buttons/3.html` | 618 | `9327cffa1826918d55e3397f7d0a136526783b2112fb917e0fda984edb9f829d` |
| `upstream/hyperui/loaders-3.html` | `application/loaders/3.html` | 1106 | `be23e1bc024f12088f52ed6b5caf06eb94b7e65d1fe50c362d56288ba0b34ace` |
| `upstream/hyperui/accordions-1.html` | `application/accordions/1.html` | 4174 | `b009468fb44929f8b4ad93d6feb68b2618466de65477920adfaa62138afa1d22` |
| `upstream/hyperui/grids-3.html` | `application/grids/3.html` | 524 | `3f5e5bbca33f834a4f9aec2c89cf2fd507614b183347bcd9345269294ed42d5c` |
| `upstream/hyperui/feature-grids-1.html` | `marketing/feature-grids/1.html` | 3766 | `7dd8fffc10acfa86ef8a5e3bf4bdad5649a0fefd85f3f85fe59069911ca9e3c6` |
| `upstream/hyperui/sections-1.html` | `marketing/sections/1.html` | 1328 | `def73b7cc2563dc01c5c9a69aa2307076cb02ad1220df6f9ca9704e4a7fe00b3` |
| `upstream/hyperui/sections-2.html` | `marketing/sections/2.html` | 1372 | `dcf3e7e07f1d6a43fe20d84c6cd2444dd0800ccf991cc417883544a45ca42d8e` |
| `upstream/hyperui/blog-cards-1.html` | `marketing/blog-cards/1.html` | 1389 | `b80fcedccb779b989bb914232bd435893e19b0527305e998a15965217f0ece29` |

Original URLs use
`https://raw.githubusercontent.com/markmead/hyperui/252efcfe39161db6e67cd877da001ee248d2bbf6/`
followed by `public/examples/` and the original snippet path.

The controls adapt the offset button border/shadow, exact spinner SVG circle/path
geometry and native details/summary/chevron structure. Tailwind classes are
translated into `.cva-element .cec-*` CSS using existing CVA tokens. Native
action semantics, reduced-motion behavior, actual task status and cleanup are
owned by CVA. The 2:1 grid and feature-section snapshots support the separate
native layout/effects consumer; retaining a snapshot alone is not a claim that
all its markup is rendered.

Issue #5435 adds three module variations from these actual HTML snippets:

- `hero/editorial` adapts `sections/1.html`'s section, responsive copy/media
  pairing and heading/body group. The nested `.cva-editorial-layout` keeps the
  existing escaped CVA heading, registered figure/caption and native link to the
  real next section. CVA supplies the wider image share, editorial type scale,
  profile tokens and small-screen stack; the earlier hero variations are intact.
- `split/image-led` translates `sections/2.html`'s one copy column beside three
  image columns to scoped plain CSS. The existing normalized split markup
  supplies the paired text and image. Copy and media use intrinsic height; no
  fixed image crop, sticky constraint or inferred scene duration is added.
- `cards/journal` adapts `blog-cards/1.html`'s article, image, copy container,
  metadata, title and description order into the existing card item schema.
  Optional label/value remain literal authored metadata. CVA's registered
  figure replaces the remote image and the current context selects the correct
  heading level. The schema has no per-card URL, so no placeholder link, fake
  date or unsupported destination is added. The whole description stays in the
  DOM without line clamping. Journal spacing, separators and profile typography
  are CVA-owned CSS; the source preview shadow/hover motion is not carried over.

These snapshots were fetched and hashed as exact upstream bytes on 2026-10-26.
They are provenance files, not page entrypoints. The existing full HyperUI MIT
notice in `elements-vendor.js` remains included by the normal and portable
export closure. Source/code checks and subsequent browser rendering are separate
verification claims; retaining these snippets does not claim preview-site QA.

The example `html/head/body` wrappers and `/component.js` are **not executable
CVA assets**. HyperUI's preview JS prevents links, non-Tab link keydowns and form
submits. Its component stylesheet also imports Google fonts and requires a
Tailwind build. None of that preview machinery, remote photography, external
fonts, package/CDN runtime or global theme state is included in the adaptations.

## Animate.css and SpinKit · motion variations (#5445)

These exact MIT source snapshots were fetched, hashed, and saved on 2026-10-26.
The selected CSS is adapted into the existing native element owner; the full
libraries and their global selectors are not runtime dependencies.

| Upstream / exact revision | Preserved snapshot | Bytes | SHA-256 |
|---|---|---:|---|
| [Animate.css v4.1.1](https://github.com/animate-css/animate.css/tree/4aa415199dd4ed7d877d10343e745e8bbb4b7a0c) | `upstream/animate-css/fadeInUp.css` | 201 | `f4847f8f528a16da8282065bcd80ed24fc43219edeaa766ab34c3de52fc38b9e` |
| same · Copyright (c) 2020 Daniel Eden | `upstream/animate-css/LICENSE` | 1078 | `aa4b4f6ba47ac6a4b3443615b5a18576d4d28ad8b3da8b4cb8cb2bd28fdd54b2` |
| [SpinKit](https://github.com/tobiasahlin/SpinKit/tree/742a71277c49b69053b5beb9fad80d720840a2ab) | `upstream/spinkit/spinkit.css` | 14782 | `815541240caae9f1fad3299a9f343e777acb24de1795e0a3ada4802699694183` |
| same · Copyright (c) 2020 Tobias Ahlin | `upstream/spinkit/LICENSE` | 1079 | `1d28b0d1573ef0071cddfd6007593088511844586e3d376584c63228f7388403` |

`elements-effects.css` adapts `source/fading_entrances/fadeInUp.css` to
`ce-fade-in-up`: opacity starts at .72, travel is .45rem instead of100%, and
there is no initially hidden text. `text-emphasis/lift` explicitly replays it
once. `scroll-story/reveal` uses the same adapted keyframe as a reversible,
opt-in CSS view-timeline enhancement with timeline+range detection. Unsupported
or reduced-motion environments keep static content. CVA owns the original
text/newlines, native anchor/current-step model and mount/dispose lifecycle.

`elements-controls.css` adapts SpinKit's **Flow** three-dot structure and exact
scale keyframes/timing, and **Wave** five-bar structure with its scaleY timing
and negative delays. Selectors are scoped to `.cva-element`; existing actual
pending, explicit motion and reduced-motion/hover conditions own execution.
The local Blob read supplies real results without invented duration, progress
or success. `orbit` and the four new button appearances are CVA-owned CSS;
the earlier HyperUI offset button and SVG spinner remain their own adaptations.

Both CSS files contain their respective full MIT notices, so independent
HTML retains the permission/copyright/warranty text as well as the normal
private kit's exact snapshots. Source files are included by the existing
builder/packager; no license loader, package runtime or CDN is added.

Aceternity Text Generate, Colourful Text, Moving Border, Tracing Beam,
Spotlight and Loader informed text emphasis, main-action emphasis, reading
position and decorative light. Their public registry code/imports/rights were
read; no TSX/Motion payload is copied into this reusable library. Reference
code/doc inspection and actual CVA browser checks remain separate evidence.

## Find, read and take away · issue 5505

The six reading variants extend existing CVA descriptor/render/mount/dispose
owners. Search operates on the author's text, grid titles/bodies and native
details without adding a remote service. Existing HyperUI MIT disclosure/card
structure and pinned Basecoat tabs/range remain in the runtime/export closure;
complete notices are retained. Image detail uses the existing native dialog
owner. UTF-8 text download and current processed-line display are CVA code.

Official Aceternity Tabs and Expandable Card docs, registry files, imports and
licence were reviewed. Root observed the Expandable Card title selection,
large image with the same title/body and Escape close in IAB; original Tabs
interaction was not observed. Summary-to-detail continuity is applied as a
design principle; no raw React/Motion implementation is copied into the kit.
Source-library redistribution permission remains unverified. Basecoat Accordion
docs/source and actual single-item disclosure interaction were checked. HyperUI
FAQ/pinned Accordion source was checked; its original screen/interaction was not.

Interactive Library and Studio previews allow explicit authored text download;
inert thumbnails retain the original sandbox. Existing form-action 'none' CSP
continues to prevent form transport. Actual download behavior and standalone
reopening are verified separately from source/schema checks.

## Cross-category composition expansion · issue 5483

The new native variants are image toggle/blend, signed data delta/ranked/threshold,
grouped grid, pointer link, concept-layer inspection, and thumbnail/vertical carousel.
They extend the existing descriptor/render/mount/dispose owners; no new runtime
library, React component, Motion payload or chart engine was introduced.
The existing pinned MIT Basecoat/HyperUI adaptations and complete notices remain
in the actual runtime/export closure. Grouped grid retains the existing native
heading/intro/card structure and adds explicit membership headings with intrinsic
content height. New data and layer calculations are CVA-owned code.

Official Aceternity Spotlight, Card Hover Effect, Bento Grid, Text Hover Effect
and Tracing Beam docs/registries were inspected for source/imports/dependencies.
The design principles applied are clear card hierarchy, a quiet decorative layer,
equal hover/focus access, and readable content independent of effects. Their fixed
SVG IDs, mouse-only hidden content, fixed bento row height and additional Motion
state owners were not copied. Source-library redistribution permission remains
unverified; no raw Aceternity TSX or registry payload is distributed.
Reference screenshots, interactions and performance were not inspected.

New selection/number controls keep original data separate from view state.
Image blend describes opacity, not registered measurement; data differences are
B minus A only for two recorded values; missing values remain distinct from zero.
Pointer links are native anchors and work without decorative motion. Layer
inspection describes concepts, not an actual 3D engine or physical measurement.

## Hallmark · expressive reading and native controls (#5657)

The selected MIT source units were inspected and preserved on 2026-10-28 from
[Nutlope/hallmark](https://github.com/Nutlope/hallmark) at
`65b5e4090ed95ee3dc2ff7db55b69aef8c5ff7b5`.
Copyright (c) 2026 Hallmark contributors. The complete
[LICENSE](upstream/hallmark/LICENSE) and upstream [NOTICE.md](upstream/hallmark/NOTICE.md)
are preserved beside the selected excerpts. [UPSTREAM.json](upstream/hallmark/UPSTREAM.json)
records each excerpt's SHA-256, original path/URL, original-file SHA-256,
selected lines, consumers and exclusions. These excerpts are provenance;
they are not loaded as a second runtime.

| Source lookup ID | Pinned units and actual adaptation | Existing consumers |
|---|---|---|
| `hallmark-specimen-controls` | `specimen-controls.js` from `site/themes/specimen/page.js:25–34` and `specimen-controls.css` from `site/themes/specimen/style.css:53–72`: native range → CSS variable/output and pressed regular/italic buttons, scoped to the mounted instance | `text-emphasis/specimen`, `typography-study`, `typography-workbench` |
| `hallmark-sticky-diptych` | `sticky-diptych.css` from `skills/hallmark/references/scroll-choreography.md:82`: sticky5:7 grid and reading panes adapted to the current window-flow lifecycle; narrow layouts become a static single column | `scroll-story/diptych`, `parallel-reading-desk`, `parallel-reading-essay` |

`node tools/cva_design_system/quality/registry.cjs --kind sources --query Hallmark`
returns these two records from the existing `quality/source-reuse.json` owner.
`elements-effects.js` and `elements-effects.css` each embed the **full MIT
copyright, permission and warranty text plus the complete upstream NOTICE**.
The existing standalone HTML exporter embeds those adapted sources, retaining
the notices even without separate notice files or a network lookup. The kit
also keeps the original LICENSE/NOTICE and the pinned source-unit metadata.

CVA owns authored text/defaults, normalization, instance IDs, native labels,
44px controls and mount/dispose. Specimen's preview size/weight/style stays
ephemeral; saved values are edited in Studio. Hallmark's canvas font metrics,
photographs, external fonts, whole-site palette and installer/hooks/linter
runtime are excluded. The new `type-scale`, numbered `index`, common-axis
`dot-plot`, dual native-range `interval`, dialog `sheet` and carousel `depth`
use the existing CVA owners; they are not claims that Hallmark supplied those
implementations. No additional scroll/chart/3D engine is introduced.

The [issue5657 execution record](../../docs/design/cva-media-expansion/EXPRESSIVE_VARIATIONS_20261028.md)
separates root's observed reference DOM/screens/selected controls from source
inspection and subsequent CVA browser/export verification. This source notice
does not claim unobserved reference interactions or completed product QA.
Aceternity Sticky Scroll Reveal informs the fixed-question/continuous-reading
principle only; editable source-library redistribution rights remain
**UNVERIFIED**, and no raw TSX/Motion/registry payload is copied here.

## Platform references and separate Aceternity boundary

### Navigation, forms, overlays and range variations (#5458)

The existing pinned Basecoat tabs and range adaptations remain the runtime
owners. The optional tabs `onSelect` callback exposes the same selection for
the overflow-list visibility and previous/next reading controls. CVA adds the
native select/textarea labels and local FormData result, `dialog.show()` for
nonmodal reading, explicit confirm/cancel feedback, and number/step controls
around the same native range. No additional library, dependency or source
snapshot is introduced; the Basecoat full MIT notice stays in the exporter.

The official Aceternity registries for
[Floating Navbar](https://ui.aceternity.com/registry/floating-navbar.json),
[Floating Dock](https://ui.aceternity.com/registry/floating-dock.json),
[Signup Form](https://ui.aceternity.com/registry/signup-form-demo.json),
[Animated Modal](https://ui.aceternity.com/registry/animated-modal.json),
[Tabs](https://ui.aceternity.com/registry/tabs.json) and
[Carousel](https://ui.aceternity.com/registry/carousel.json) were inspected for
source code, imports, dependency metadata and redistribution boundaries.
Their compact current-navigation cues, label/field/action hierarchy and
dialog content/footer hierarchy inform the new compositions. React/Motion
state, hover-only names, hide-on-scroll navigation and custom modal behavior
are not copied. Source-library redistribution permission was not verified,
so these are **design-principle applications**, not Aceternity code reuse.
Documentation and source inspection do not establish reference screenshot
or interaction verification. CVA runtime verification is recorded separately
in `INTERACTION_VARIATIONS_20261026.md`.

- [Native dialog and focus](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)
- [Declarative native popovers](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using)
- [WAI tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
- [WAI carousel](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/)

These documents inform the CVA-owned controls; they are not copied source
payloads. The carousel has no autoplay or rotation timer. Motion is off by
default, and perpetual loading decorations require explicit opt-in, an actual
pending local task, no reduced-motion preference and a hover-capable device.
Progress counts actual read text lines, with no invented wait or success timer.

Aceternity's free end-product use and its source-library redistribution are
separate questions. Existing `SOURCE_REUSE_ACETERNITY.md` remains the authority
for those checks. These native elements do not contain Aceternity TSX, Motion,
paid/locked code or a claim that its source is MIT. The explicitly copied and
adapted source units in this notice are the pinned MIT Basecoat, HyperUI,
Animate.css, SpinKit and Hallmark units described above.
독립 HTML이 native interface 요소를 포함하지 않아도 새 editorial/image-led/journal 구도의 고지가 남도록, `module-styles.css`에도 HyperUI의 full MIT 고지를 포함합니다. 기존 exporter가 이 CSS를 그대로 내장하며 별도 네트워크·라이선스 로더를 추가하지 않습니다.

Interactive previews use native form submission and validation with immediate preventDefault/FormData local feedback. MDN iframe sandbox documentation and CSP form-action informed the four interactive iframe allow-forms capabilities paired with an early form-action 'none' policy in canvas.html and element-preview.html. Gallery frame capabilities remain unchanged. The policy blocks actual form transport, including direct form.submit(), without claiming to block fetch or arbitrary trusted-script activity. These are platform-principle applications, not copied code payloads.

The collection filter reuses these existing CVA native inputs and notices. Official [Basecoat Native Select](https://basecoatui.com/components/native-select/) at6769c83c and [HyperUI Filters HTML](https://github.com/markmead/hyperui/blob/47a41dec4b1821d2be447606b23511160b89ea9b/public/examples/application/filters/1.html) were inspected for visible labels and adjacent conditions/count/reset. Their new source payloads are not copied: CVA owns the local AND predicate, original-node preservation, IME and reset/dispose. HyperUI's example supplies no data-filter handler. Aceternity Layout Grid/Expandable Cards inform same-item detail/return only; React/Motion/registry are excluded and source-library redistribution remains UNVERIFIED. Documentation/code inspection is distinct from external-site interaction evidence.
