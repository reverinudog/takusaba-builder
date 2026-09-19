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
- Auto-update E2E on this PC: 卓鯖ビルダー is installed **per-machine** (`C:\Program Files\takusaba-builder`, HKLM uninstall key), so any NSIS (re)install — including electron-updater's silent `quitAndInstall(true, true)` — triggers a UAC prompt that a non-interactive shell cannot approve (exit 1223). Per-user installs update silently. Use `SRB_UPDATE_FEED_URL=http://127.0.0.1:<port>/` with a `generic` feed dir (exe + blockmap + latest.yml) to test updates against a local server.

## Release flow (as of v1.5.2, 2026-09-18)
1. Commit on `main` (private remote `origin` = Discord-Server-Manager). Bump version with `npm version X.Y.Z --no-git-tag-version`.
2. Public repo (`public` = takusaba-builder) has a separate squashed history on branch `public-release`. Release = `git worktree add ../.tmp-pubrel public-release` → `git read-tree -u --reset main` → one Japanese commit `卓鯖ビルダー vX.Y.Z — …` → `git tag -a vX.Y.Z` → `git push public public-release:main && git push public vX.Y.Z` → remove the worktree. The tag triggers `.github/workflows/release.yml` (exe x64/arm64/universal + dmg + latest*.yml; ~3–4 min; `fail-fast: false`).
3. BOOTH: `gh release download vX.Y.Z -R reverinudog/takusaba-builder -D release --pattern '*.exe' --pattern '*.dmg'` → `npm run booth` → `booth/out/`.
4. Microsoft Store: Store ID `9N8TJVFFQFCM`, Partner Center identity values are in electron-builder.yml. `npm run dist:store` → upload the appx on the submission's Packages page (the page may stall on "Analyzing package" — reload, then Save; the older package is auto-marked for removal). Listings exist in ja/en/ko/zh-Hans/zh-Hant; the hero image is `store/hero-1920x1080.png` (no title text — Store rejects titles in hero art). While a submission is "In certification" nothing is editable (Cancel certification first). Submit button is the owner's decision.
5. Update UX: in-app modal on launch when an update exists (`web/src/components/UpdateModal.tsx`, sidebar「更新があります」button); "今すぐ更新して再起動" = `/api/system/update/apply` → download → `quitAndInstall(true, true)` (silent, no NSIS UI). Verified end-to-end on a packaged build 1.5.2→1.5.3 via a local feed.

## Discord facts verified live (2026-09-17/18)
- Create Guild Channel: a non-admin bot cannot put `MANAGE_ROLES` in a permission overwrite (50013) — the bot's self-overwrite must stay VIEW/SEND/ATTACH/READ_HISTORY.
- Developer Portal labels per language (used in `web/src/i18n/*` wizard text): ja 新しいアプリケーション/作成/変更を保存/トークンをリセット/実行します！; en New Application/Create/Save Changes/Reset Token/Yes, do it!; ko 신규 애플리케이션/만들기/변경 사항 저장/토큰 초기화/네, 할게요!; zh-Hans 新 APP/创建/保存更改/重置令牌/是的，请继续！; zh-Hant 新建應用程式/建立/儲存變更/重設權杖/確定要做！. "Privileged Gateway Intents" / "Server Members Intent" are untranslated everywhere; there is no terms checkbox in the create dialog.
- The OAuth invite URL opens the Discord desktop app when installed (「Discordアプリを起動しています」).
