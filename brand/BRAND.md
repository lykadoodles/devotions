# Lamp brand kit

The single source of truth for how Lamp looks and sounds, in the app, the Play listing and on
social media. Any chat working on Lamp's content should read this first, along with
`../CLAUDE.md` (what the app does) and `../README.md` (features).

## The idea

> *“Your word is a lamp to my feet and a light to my path.”* (Psalm 119:105)

Lamp helps people read the **whole Bible in a year**, about 15 minutes a day: four short
portions (Old Testament, New Testament, Psalms, Proverbs), a prayer and a takeaway. The image
is a **flame that grows** as you keep reading: each finished day "lights" your lamp.

- **Name:** "Lamp" in sentences; full name **Lamp: Bible in a Year** (Play Store). The wordmark
  is all caps **LAMP**. Never "LAMP app", "Lamps", or "the Lamp Bible".
- **Tagline (primary):** Read the whole Bible in a year.
- **Supporting line:** Four short portions a day. / About 15 minutes a day.
- **Verse:** Psalm 119:105 (the name comes from it).
- **Promise:** free, no ads, no account, works offline, your data stays on your phone.
- **Made by:** Angelica (Lyka) Quebec, independent developer, with testers from her church
  community. "Built with our testers" is part of the story.

## Audience

Filipino Christians first, from the church community outward: busy working adults, young
people and parents who want to read the Bible consistently. They read English, Tagalog and
Cebuano and talk in **Taglish**. Android first; iPhone coming.

## Voice and tone

- **Warm, hopeful, encouraging,** like a friend from church, not a brand or a preacher.
- **Biblical and reverent,** never preachy or guilt-tripping. Encourage ("Tara, basa tayo!"),
  don't shame ("You missed 3 days").
- **Simple and short.** Short sentences, one idea per post, plain words.
- **Taglish is natural** for community posts and testers' group chats; English for the Play
  Store and anything aimed beyond the Philippines. Don't force deep Tagalog.
- **Prayer is fervent,** never "in silence" (Angelica's direction). Joyful, wholehearted.
- **Scripture first:** quote the verse exactly with reference and translation, e.g.
  "— Psalm 119:105 (NLT)". Don't paraphrase Scripture as if quoting it.
- **Honest about features:** only promote what's in the released app. Say "coming soon" for
  planned things (e.g. iPhone) and never promise dates.
- Emojis in moderation: 📖 ✨ 🔥 🙏 🕯️ 🗓️ 🎧 (one or two per paragraph, not every line).
- Calls to action: "Download free on Google Play", "Join our testers", "Comment 👍 Yay or
  👎 Nay", "Tag a friend you'd read with".

## Colours

The app's current look is the **blue** theme (`www/css/app.css`, the `:root` block around line
289). The warm brown palette near the top of that file is the old one: don't use it.
See `palette.png` for swatches.

| Role | Colour | Hex |
|---|---|---|
| Primary / Lamp Blue (buttons, light theme accent) | blue | `#2453E6` |
| Background gradient | sky → deep → navy | `#5B8CFF` (glow), `#2A5BE8` → `#1F44C4` → `#1B37A6` → `#172C88` |
| Indigo glow (bottom-left of gradient) | indigo | `#3A2FD6` |
| Text on blue | white / ice | `#FFFFFF`, `#DBE6FF` (secondary), `#C9D8FF` (muted) |
| Flame (logo gradient, centre → edge) | cream → gold → orange → ember | `#FFF7D6` → `#FFD166` → `#F4892F` → `#D9480F` |
| Highlight word in headlines | warm orange | `#FFBF70` |
| "Live/available" dot | fresh green | `#7CFFB2` |
| Reading streams (badges, rings) | OT coral, NT cyan, Psalms mint, Proverbs gold | `#FFB38F`, `#6FE3FF`, `#8FF0B4`, `#FFE066` |
| Light theme | background, text | `#EEF3FF`, `#0F1F5C` |

**Signature look:** deep blue gradient with a soft lighter glow at the top right, a glowing
orange flame, white text, and one key word in warm orange (e.g. "Read your Bible in a
**year**").

## Typography

- **Manrope** (sans): app UI, headlines (ExtraBold 800 for big titles), body text.
- **Literata** (serif): Scripture and reading text; italic for quoted verses.
- Fonts are in `www/fonts/` (woff2, open licences). Verse-picture fonts (Playfair Display,
  Dancing Script, Caveat, Oswald) are for reader-made cards only, not brand headlines.

## Logo and icon (`logo/`)

| File | Use |
|---|---|
| `app-icon-1024.png`, `app-icon-512.png` | App icon: flame on blue (Play Store, anywhere the app is shown) |
| `lamp-flame.png` | Flame only, 1024×1024: profile pictures, avatars, watermark |
| `lamp-logo-wordmark.png` | Flame + **LAMP**, 1024×1024: Facebook profile, Messenger group, cover art |
| `lamp-testers.png` | Flame + LAMP + TESTERS: the testers' Messenger group photo |

Rules: keep the flame's glow and gradient; always on the blue gradient (or white/navy if a
plain background is needed); don't stretch, recolour, outline or add effects; leave clear
space around it about half the flame's width.

## Imagery

- **Real app screens** in phone frames, captured from the actual app with sample data (never
  invented UI). Readers' names in screenshots are sample names.
- The flame, the blue gradient and soft glows. Simple, calm, lots of space.
- No stock photos of people, no photos of public figures, no copyrighted artwork, characters
  or song lyrics.

## Social formats (`social/`)

| Format | Size | Example |
|---|---|---|
| Facebook / Instagram feed post (portrait 4:5) | 1080 × 1350 | `fb-post-1-whole-bible.png` … `fb-post-5-streak.png` |
| Story / Reel cover (9:16) | 1080 × 1920 | `fb-ios-coming-soon-story.png` |
| Facebook cover photo | 1640 × 924 | `fb-cover-photo.png` |
| Profile picture | 1024 × 1024 | `fb-profile-picture.png` |

**Post layout used so far:** small flame + LAMP at the top; a 2-line headline with one word in
warm orange; a one-line subtitle in ice blue; a phone screenshot below. Headlines used:
"The whole Bible in a **year**", "Listen to **God's Word**", "Highlight, **react**, remember",
"A prayer list you **actually pray**", "Watch your **lamp grow**", "Coming soon to **iPhone**".

`source/` has the scripts that made these (Playwright renders HTML to PNG): `make-logos.js`,
`make-fb-posts.js`, `make-ios-post.js`, `app-screenshot.js`. They use paths from the chat
session they were written in; adjust paths before re-running. A promo reel
(`Lamp-promo-v2.mp4`, 9:16, ~33 s, original piano music, no voice-over) was made but is too
big to keep in the repo.

## Hashtags

Suggested set (not yet used consistently); use 3–5: `#LampApp` `#BibleInAYear` `#DailyBibleReading` `#GodsWord` `#Psalm119105`,
plus local ones when relevant: `#BasaBibliya` `#PinoyChristian`.

## Things to get right

- **NLT text** needs its notice when quoted at length: "Scripture quotations are taken from the
  Holy Bible, New Living Translation, copyright © 1996, 2004, 2015 by Tyndale House Foundation.
  Used by permission of Tyndale House Publishers, Carol Stream, Illinois 60188. All rights reserved." For a single verse, "(NLT)" after the reference is the norm. BSB, KJV,
  WEB are free to quote; Tagalog/Cebuano ULB are CC BY-SA (credit "unfoldingWord ULB").
- Play Store listing text lives in `../store/LISTING.md`; keep social claims consistent with it.
- Anything posted to Lamp's pages needs Angelica's approval first.
