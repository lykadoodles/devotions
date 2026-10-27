# Lamp: daily devotions

*“Your word is a lamp to my feet, and a light for my path.” (Psalm 119:105)*

Lamp is an Android app for reading the whole Bible in a year. Each day has four short portions:

| Stream | Pace | Over a year |
|---|---|---|
| **Old Testament** | ~2 chapters a day | Genesis → Malachi once |
| **New Testament** | ~22 verses a day | Matthew → Revelation once |
| **Psalms** | ~7 verses a day | All 150 Psalms once (Psalm 119 over 27 days) |
| **Proverbs** | 1 chapter a day, matched to the date | **12 times** |

That's about 15 minutes a day. The OT, NT and Psalms portions are balanced by verse count, so no day is much heavier than the others. Proverbs follows the calendar: on the 14th you read Proverbs 14. On the last day of a short month you read the remaining chapters, so every month covers all 31.

## Features

- **Streak flame** that grows the longer you keep reading
- **Four-part ring** that fills as you finish each stream, with a celebration when today's lamp is full
- **Catch up** list for any portions you missed
- **Journey** page: % of the Bible read, a bookshelf of 66 books that fill in as you go, a heatmap of the year, and Proverbs progress beads (12 per year)
- **20 badges**: streaks, the Torah, the Gospels, Paul's letters, Proverbs ×12, the whole Bible…
- **Daily reminder** notification listing that day's passages
- Dark and light themes, adjustable text size, offline reading

## NLT text

The New Living Translation is copyrighted by Tyndale House, so the app loads it through Tyndale's official **NLT API**:

1. Get a free API key at <https://api.nlt.to>
2. In the app, open **Settings → NLT API key**, paste it, and tap **Save**

Passages you've opened are saved on your phone so they work offline. Until a key is added, or when the app is offline with no saved copy, it shows the public-domain **World English Bible**, which is built into the app.

## Install on your phone

Each push to `main` builds a new APK with GitHub Actions and publishes it to the **[latest release](../../releases/tag/latest)**.

1. On your Android phone, open the latest release and download **Lamp.apk**
2. Open it and allow *Install unknown apps* if Android asks
3. To update, download the newest APK the same way. It installs over the old one and keeps your progress, as long as the signing key secret is set (see below).

### Signing key (one-time setup for smooth updates)

Add two repository secrets under **Settings → Secrets and variables → Actions**:

- `ANDROID_KEYSTORE_B64`: the base64 keystore
- `ANDROID_KEYSTORE_PASSWORD`: its password

Without them, every build gets a new signing key, and Android will make you uninstall before updating. Use **Settings → Back up progress** first so you can restore your progress after.

## Project layout

```
www/                 the app (HTML/CSS/JS, no build step)
  data/plan.json     365-day plan (generated)
  data/web/*.json    World English Bible text (public domain)
scripts/build-data.mjs   regenerates the plan + text from the WEB source
capacitor.config.json    Android wrapper config (Capacitor)
.github/workflows/android.yml   builds and publishes the APK
```

Run it in a browser: `npm run serve`, then open http://localhost:8080.

Regenerate the plan: `node scripts/build-data.mjs <path-to>/world-english-bible/json`
