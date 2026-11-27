# Lamp: project guide

Lamp: Bible in a Year. A free Android app (iOS in progress) by Angelica (Lyka) Quebec,
GitHub `lykadoodles/devotions`. Package `com.lykadoodles.lamp`. Live on Google Play
(production) with a closed-testing group from church. No account, no ads, no in-app
purchases; everything stays on the phone and works offline.

Read this first, then README.md (features and translations) and store/LISTING.md (Play listing).
For anything visual or social media: **brand/BRAND.md** (logo, colours, fonts, voice, post formats).

## How the app is built

- **Capacitor 8** wrapping a plain HTML/CSS/vanilla-JS app in `www/` (ES modules, no bundler,
  no framework). The `android/` and `ios/` projects are **generated in CI** (`npx cap add`)
  and are gitignored; anything native lives in `scripts/` and is copied in by the workflows.
- **Routing:** hash routes in `www/js/app.js` (`route()` → `routeView()`), e.g. `#/today`,
  `#/read/ot/12`, `#/bible/42/3/16`, `#/catchup`, `#/journey`, `#/journal`, `#/notebook/<id>`,
  `#/planner/<monday>`, `#/prayer`, `#/settings`. A same-hash redraw keeps scroll and adds
  `.settled` to skip rise animations.
- **State:** one object in `www/js/store.js`, saved as JSON to localStorage and Capacitor
  Preferences under `lamp.state.v1`. `DEFAULTS()` + `normalize()` fill missing fields for old
  saves and backups. `reset()` keeps settings, planner and notebook. `onSave()` hooks run on
  every save (used by widgets).
- **Sync-ready records:** planner items, notebook pages, day notes, routine blocks etc. have a
  UUID `id`, `createdAt`/`updatedAt`, and soft delete (`deleted: true`), for a future Google
  Drive (appDataFolder) sync. Keep that pattern for any new records.

### Modules (`www/js/`)
| File | What it does |
|---|---|
| `app.js` | Router, all main screens, settings, welcome, Bible tab, free reader, actions |
| `store.js` | State, defaults, save/load, streak logic |
| `plan.js` | The 365-day plan (OT/NT/Psalms/Proverbs), labels, dates, book metadata (`META`) |
| `text.js` | Translations, fetching/caching passages (NLT/ESV APIs, bundled BSB/KJV/WEB/TGL/CEB) |
| `audio.js` | Text-to-speech queue (reads on with screen off), voices, male/female detection |
| `drama.js` | Dramatized reading: splits verses into narrator / male / female / God (EN, TGL, CEB) |
| `planner.js` | Planner: week grid, to-dos, goals, month view, routine, birthdays |
| `notebook.js` + `images.js` | Notebook pages (sermon/devotion/letter/note) and their images (files, not state) |
| `prayerlist.js`, `journal.js`, `rhema.js` | Prayer list, highlights/notes, verse of the day |
| `sharecard.js` | Share a verse as a picture (canvas: backgrounds, own photo, fonts) |
| `sheets.js` | All pop-ups: scroll lock, swipe-down to close, keep keyboard on form buttons |
| `widgets.js` | Writes the home-screen widget summary (`lamp.widget`) and applies widget taps |
| `backup.js` | .json backup/restore (includes notebook images, excludes API keys) |

### Translations
NLT (api.nlt.to, shared key, 5,000 requests/day, cached per chapter; a permission request
went to Tyndale in Nov 2026, see store/TYNDALE-REQUEST.md), ESV (reader's own key), BSB, KJV,
WEB, Tagalog and Cebuano ULB (Door43, CC BY-SA, built by `scripts/build-ulb.mjs`). The 1982
Tagalog revision is copyrighted: don't add it. Tagalog UI translation is planned, not done.

### Android extras
- **Home-screen widgets** (`scripts/android/widgets/`, Java): Verse of the day, Today's reading,
  Prayer list, To-do. They read `lamp.widget` from the `CapacitorStorage` shared preferences
  (14 days ahead, so they roll over at midnight without the app). To-do ticks go to
  `lamp.widget.actions` and are applied by `widgets.js` when Lamp opens. `MainActivity.java`
  registers the `LampWidgets` plugin and passes widget routes to `window.lampOpen`.
- The workflow copies these files and adds the `<receiver>`s to the manifest.

## Builds and releases

- **Android:** `.github/workflows/android.yml` runs on every push to `main`. versionCode =
  the workflow run number (builds are numbered 1, 2, … 57…). It publishes `Lamp.apk` and
  `Lamp.aab` to the GitHub release tagged `latest`. Download with
  `gh api -H "Accept: application/octet-stream" repos/lykadoodles/devotions/releases/assets/<id>`.
- The workflow caches Gradle and falls back to mirrors (Tencent for Gradle, Google's Maven
  Central mirror) when GitHub downloads time out. A failed run for a GitHub outage can just be
  re-run; it keeps its run number.
- **Re-running an old run republishes `latest` with that older build**: if that happens,
  re-run the newest run so `latest` is the highest build again.
- **iOS:** `.github/workflows/ios.yml` (macOS). Without secrets it does a simulator check build;
  with `APPSTORE_KEY_ID`, `APPSTORE_ISSUER_ID`, `APPSTORE_KEY_P8`, `APPLE_TEAM_ID` it archives
  and uploads to TestFlight. Privacy manifest: `scripts/ios/`. Apple Developer enrollment was
  pending as of Nov 2026; iOS widgets would need a separate WidgetKit extension.
- **Play Console:** releases go to closed testing, then production. Play allows one draft per
  track; an old draft blocks "Create new release" until edited or discarded. Don't sideload the
  APK over a Play install: Play re-signs the app, so it would need an uninstall (data loss).
- Release notes for Play must fit **500 characters** inside `<en-US> … </en-US>`.

## Testing

Browser tests (Playwright + Chromium) live in `tests/`, run against `www/` served on
localhost:8080 with `tests/seed.json` (sample data, no keys):

```
tests/run.sh                 # all
tests/run.sh bible-tab       # one
```

Each prints what it checked and ends with `errors []`. In a Claude session, start the server
yourself first (`cd www && python3 -m http.server 8080`, in the background) and run the tests
with `node tests/<name>.test.js`; piping `tests/run.sh` through `tail` can hang on the server. Screenshots go to `tests/out/`
(gitignored). Look at the screenshots for any UI change. Lint for undefined variables with
eslint (`no-undef`) before building; a stray variable once crashed the Catch up screen.

## Decisions to keep (from testers and Angelica)

- **Prayer wording:** prayers are "fervent", never "in silence". Stay biblical.
- **Voices:** English voices are **US and UK only** (Australian, Nigerian, Indian removed).
  Men and God use only male voices, Women only female (known Google voice codes in
  `audio.js`, plus the reader's own tags).
- **Planner is on by default** (welcome switch starts on); turning it off sticks.
- "Verse of the day", not "Rhema" (the code still says `rhema` in places).
- Reading in the Bible tab never changes the plan or streak.
- Notebook images sit in a gallery under the text (inline images would need a rich editor).
- Dark theme has no stripe texture. Reading page colours: Blue, Dark, Light, Sepia.
- **No exact alarms.** Reminders are scheduled with `isExactNotification: false`; the
  SCHEDULE_EXACT_ALARM permission is removed in the workflow. Without the flag, the
  local-notifications plugin (8.x) opens Android's "Alarms & reminders" page, whose switch is
  greyed out for Lamp, so reminders broke (Nov 2026).
- Keep it simple, practical and fast to ship; small, tested builds.
- Testers write in Taglish; replies for the testers' group chat are usually in Taglish.

## Not done yet (ideas on the list)

Google Drive sync (appDataFolder), Tagalog UI, iOS release and iOS widgets, R8 code shrinking
(test in closed testing first: plugins and widgets are looked up by name), notebook extras
(folders/tags, checklists, formatting, pinning, a notebook widget), Hiligaynon/Waray Bibles if an
open licence exists.
