# WaniKani Master Sentences

A small, browser-only app for building a local library of **WaniKani Master+ vocabulary and kana vocabulary** with their **context sentences**.

## What this app does

- Fetches your WaniKani assignments for:
  - `vocabulary`
  - `kana_vocabulary`
- Filters to SRS stages **7, 8, 9** (Master, Enlightened, Burned).
- Fetches matching subject records.
- Extracts and displays `context_sentences` (Japanese + English).
- Stores token + synced library data in your browser so you can reopen later.

---

## Run locally

### Option 1: Open file directly (quickest)

Open `index.html` in your browser. This repository includes a pre-bundled browser script (`js/app.bundle.js`) so direct file opening works without running a local server.

- macOS: `open index.html`
- Linux: `xdg-open index.html`
- Windows (PowerShell): `start index.html`

### Option 2: Serve as local static files

From the repository root:

```bash
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000`

Alternative (Node):

```bash
npx serve .
```

---

## Rebuilding the browser bundle

If you change files under `js/`, rebuild `js/app.bundle.js` before distributing:

```bash
npx esbuild js/app.js --bundle --format=iife --platform=browser --outfile=js/app.bundle.js
```

---

## Token storage behavior

Your WaniKani API token is stored **browser-local only** (IndexedDB in this app).

- No backend server is used by this project.
- Token is not synced by this app to any cloud service.
- Clearing browser site data (or using another browser/profile) removes access to the saved token.

---

## Data fetched from WaniKani

The app fetches only what it needs for Master+ sentence browsing:

1. `GET /v2/assignments?subject_types=vocabulary,kana_vocabulary&srs_stages=7,8,9`
2. `GET /v2/subjects?ids=...` for the matched subject IDs

From those subjects, it reads context sentence fields (`context_sentences`) and renders Japanese/English sentence pairs.

---

## Known limitations

- **Rate limits:** WaniKani API rate limiting (`429`) can delay sync; the app retries a few times, then surfaces an error.
- **Token/auth errors:** Invalid/revoked/missing token causes unauthorized/forbidden failures and sync will not proceed.
- **Browser storage scope:** Data is tied to the current browser/profile/device and can be lost if local site storage is cleared.
- **Subject coverage:** Only items with available `context_sentences` appear in the final sentence list.

---

## v1 Definition of Done

Implemented v1 scope checklist:

- [x] Manual token entry and local token persistence in browser storage
- [x] Manual “Sync now / Refresh” flow
- [x] Fetch Master+ (`srs_stages=7,8,9`) assignments for vocabulary + kana vocabulary
- [x] Fetch matching subjects by ID
- [x] Build local sentence library from `context_sentences`
- [x] Render searchable/browsable sentence list with JA/EN context lines
- [x] Basic sync status and error feedback in UI
- [x] No backend required (fully local static app)

Deferred to future iterations (explicitly **out of v1 scope**):

- [ ] TTS playback
- [ ] Export (CSV/JSON/Anki/etc.)
- [ ] Automatic background sync / scheduled sync

---

## Notes

This project is not affiliated with or endorsed by WaniKani / Tofugu.
