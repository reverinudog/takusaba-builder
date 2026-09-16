# Session Room Builder — agent notes

## Verify
- Server types: `npx tsc --noEmit -p tsconfig.json`
- Web: `cd web && npx tsc -b && npx eslint . && npm run build`
- Release exe: `npm run release` → `release/SessionRoomBuilder.exe` (needs network for pkg base binary)
- Smoke-test the exe from a copy of `release/` with `PORT=3100`; never call `/api/setup/save`, `/api/run/*` against the real server during tests.

## Gotchas
- `data/presets.json` and `data/assets/` are the owner's live data — do not modify or stage.
- CSS Modules localise `animation-name`; define `@keyframes` inside the same `.module.css` (global keyframes in `index.css` are only reachable via global classes like `.anim-rise`).
- `data/config.json` (gitignored) holds the bot token; `.env` is a fallback only.
- `src/paths.ts` resolves everything relative to the exe when `process.pkg` is set.

## Electron
- Run Electron with `env -u ELECTRON_RUN_AS_NODE` in this environment (Devin CLI sets it globally); otherwise the app runs as plain Node and exits.
- Dev: `npm run electron:dev`. Packaged data dir is `app.getPath('userData')/data`; dev uses repo `data/`.
- Mac builds (`npm run dist:mac`) only work on macOS — use the GitHub Actions workflow (`.github/workflows/release.yml`, tag `v*`).
