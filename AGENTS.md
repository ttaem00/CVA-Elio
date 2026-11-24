# Elio — Agent & Multi-LLM Operating Guide

This public repository (`ttaem00/cva-elio`) contains **Elio**, the CVA design system, **Elio Story** (narrative/relationship reader and authoring tools), and **Elio Board**.

## 1. Source of Truth & Scope

- Follow [README.md](README.md), [docs/OWNED_RUNTIME.md](docs/OWNED_RUNTIME.md), [docs/BRANDING.md](docs/BRANDING.md), and [docs/ELIO_TEMPLATE_COVERAGE.md](docs/ELIO_TEMPLATE_COVERAGE.md) before modifying components, templates, or renderers.
- Read [skills/elio/SKILL.md](skills/elio/SKILL.md) for layout/component work and [skills/elio-story/SKILL.md](skills/elio-story/SKILL.md) for narrative/source-bound story authoring.
- Preserve **TTaem CVA Source-Available License 1.1** ([LICENSE](LICENSE), [POLICY.md](POLICY.md), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)) and brand provenance ([cva/assets/brand-icons/manifest.json](cva/assets/brand-icons/manifest.json), [manifest.json](manifest.json)). Never reintroduce restricted third-party implementations or commit machine-local paths, credentials, or private data.

## 2. Build & Verification Commands

Run all three checks before opening or merging a PR:

```sh
python scripts/build_sources.py --check
python scripts/demo.py --check
node scripts/check-brand-icons.cjs
node scripts/smoke.cjs
```

- If shared Story reader/guide/map sources changed, regenerate via `python scripts/build_sources.py` first; keep release-bundle scaffold manifests synchronized when updating root governance files.
- On Windows, set `git config core.autocrlf false` in fresh clones so UTF-8 LF byte checks in `scripts/demo.py --check` match.
- Local preview server: `python -m http.server 8798 --bind 127.0.0.1` (do not claim deployed GitHub Pages parity from a local preview alone).

## 3. Multi-LLM Coexistence (`Codex` · `Claude Code` · `Antigravity`)

- `AGENTS.md` is the single repository instruction source for all coding agents; do not add duplicate root instruction files.
- Never reset, clean, or overwrite uncommitted work in an existing checkout. Work on an isolated issue branch/worktree (`codex/issue-<N>-<slug>`) and land changes via **merge-commit PRs only** (no direct push to `main`, no squash/rebase merge, no `--no-verify`).
- Record actual verification output and perform an independent `/adversarial-review` before merging.
