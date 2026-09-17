# 卓鯖ビルダー (TakusabaBuilder) — agent notes

## Verify
- Server types: `npx tsc --noEmit -p tsconfig.json`
- Web: `cd web && npx tsc -b && npx eslint . && npm run build`
- Release: `npm run dist:win` → `release/TakusabaBuilder-Setup-*` (electron-builder)
- Never call `/api/setup/save`, `/api/run/*` against the real server during tests.

## Gotchas
- `data/presets.json` and `data/assets/` are the owner's live data — do not modify or stage.
- CSS Modules localise `animation-name`; define `@keyframes` inside the same `.module.css` (global keyframes in `index.css` are only reachable via global classes like `.anim-rise`).
- `data/config.json` (gitignored) holds the bot token; `.env` is a fallback only.
- Packaged builds store the token encrypted (`tokenEnc`, Electron safeStorage); dev/ts-node runs keep plaintext `token`; an encrypted config read by a dev run shows as unconfigured. `SRB_ENCRYPT_TOKEN=1` forces encryption in `electron:dev`.
- The `managed_by=local_preset_tool` channel-topic marker is a compatibility contract — do not rename.

## Electron
- Run Electron with `env -u ELECTRON_RUN_AS_NODE` in this environment (Devin CLI sets it globally); otherwise the app runs as plain Node and exits.
- Dev: `npm run electron:dev`. Packaged data dir is `%APPDATA%\TakusabaBuilder\data` (ASCII-forced via `app.setPath`); dev uses repo `data/`.
- Mac builds (`npm run dist:mac`) only work on macOS — use the GitHub Actions workflow (`.github/workflows/release.yml`, tag `v*`).
- Store build: `npm run dist:store` → `release/*-store.appx`, upload to Partner Center manually; `process.windowsStore` disables the in-app updater; identity values in electron-builder.yml must match Partner Center.
