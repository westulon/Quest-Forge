# Quest Forge: Runner's Path

A 9-week fantasy RPG running adventure for two adventurers, built on the exact
NHS Couch to 5K interval structure. Runs are quests, effort earns XP and gold,
gold buys gear, and a world map tracks the journey from The Sleepy Village to
the Kingdom of Five-K.

This is a **Progressive Web App (PWA)** — not a file from the Play Store.
That's deliberate: it means no app-store account, no APK sideloading warnings,
and it installs on Android in about 30 seconds once it's online somewhere.
It works offline once installed (important mid-run with no signal), tracks
distance with GPS as an optional bonus, and saves progress right on the phone.

---

## Step 1 — Put the files online (one-time, ~5 minutes)

A phone can't "install" a PWA from a plain file — it needs a real web address
(so it can be added to the home screen and cache itself for offline use).
The easiest free way, no coding required:

1. Go to **github.com** and create a free account if you don't have one.
2. Click **New repository** (green button). Name it anything, e.g.
   `quest-forge`. Set it to **Public**. Click **Create repository**.
3. On the new repo page, click **Add file → Upload files**.
4. Drag in *every file and folder from this download* (`index.html`,
   `style.css`, `app.js`, `data.js`, `icons.js`, `stats.js`, `character.js`,
   `manifest.json`, `sw.js`, `CREDITS.md`, and the `icons` folder) — all at
   once, keeping the folder structure.
5. Scroll down and click **Commit changes**.
6. Go to the repo's **Settings** tab → **Pages** (left sidebar).
7. Under "Build and deployment", set **Source** to **Deploy from a branch**,
   choose branch **main** and folder **/(root)**, then **Save**.
8. GitHub shows a URL like `https://yourname.github.io/quest-forge/` — give
   it a minute or two, then open it. That's the live link for both phones.

*(If you'd rather test instantly before making an account, dragging the same
folder onto **app.netlify.com/drop** gives a temporary live link in seconds —
handy for a quick look, though GitHub Pages is the one to keep long-term.)*

## Step 2 — Install it on each phone

On each daughter's phone, in **Chrome**:

1. Open the live link from Step 1.
2. Tap the **⋮ menu** (top right) → **Add to Home screen** (or you may see
   an **Install app** banner appear automatically — either works).
3. Confirm. A "Quest Forge" icon appears on the home screen, opening
   full-screen with no browser bar, just like any other app.
4. First launch: tap **+ New Adventurer**, name the character, pick Girl,
   Boy, or Neither, then skin tone / hair color / hair style. Each phone gets
   its own save — nothing is shared between them, so there's no competition
   or comparison between the two.

If both girls will play from the *same* phone/tablet at different times,
the app already supports that too — a **Switch Adventurer** button on the
Hero tab returns to the profile picker without losing anyone's progress.

## Step 3 (optional) — Turn on GPS distance

On the **Hero** tab there's a toggle: *"Track distance with GPS during
quests."* It's off by default. Turning it on shows a bonus "distance
explored" readout during runs and on the Hero stats screen — it's flavor,
not a requirement, so it works fine indoors or on a treadmill with it off.

## The Run Log

A fifth tab, **Log**, keeps a record of every finished quest:

- **Lifetime totals** — runs completed, distance covered, minutes spent running.
- **Personal Records** — the best *three* efforts for each of five stats
  (longest distance, most time running, longest session, fastest pace, biggest
  XP haul), each with a gold/silver/bronze place. Three deep rather than one
  means a good run still counts for something when it isn't an outright best.
- **History** — every run, newest first, with a thumbnail of its route. Tap any
  run for the full detail: time, distance, pace, XP and a large route drawing.

Beating one of your top three is called out on the quest-complete screen right
after the run, so it lands while it still feels earned.

## Route recording

With GPS switched on, the app records the shape of the route and draws it live
on screen as you run, then saves it with the run.

A few details that matter in practice:

- Points closer than 2m apart are ignored (GPS jitter), as are jumps over 100m
  (signal bounce near buildings).
- Routes are thinned before saving — corners are preserved, straight stretches
  collapsed — so a 30-minute run stores a few hundred points rather than a few
  thousand. The drawing looks the same; the save stays small.
- Drawings correct for latitude. Without that correction a genuinely square
  route would render noticeably squashed at UK latitudes; with it, a square
  route draws as a square.
- Pace is only recorded for runs over 400m, so a bit of GPS drift while
  standing still can't mint a fake record.

If GPS is off, or there's no signal, everything else still works — the run is
logged with its time and XP, just without a route.

## Step 4 (optional) — Background theme

Also on the **Hero** tab: a background pattern picker (Plain, Quatrefoil,
Lattice, Stars). All three patterns are built from plain geometry — circles
and straight lines — which is why they come out clean. Saved per-character,
so each daughter can pick her own.

---

## The story

The whole thing is framed as one throughline: the Windrunner Guild's nine
signal Beacons — one per region — have gone dark, and Bramble, the Guild's
last quartermaster, recruits your adventurer to relight them by running the
Old Road end to end.

- A short **prologue** plays once, right after creating a character.
- Arriving at each new region (the first quest of each week) plays a brief
  Bramble story-beat first — she reacts to what you just did and sets up
  what's ahead, including foreshadowing the Dragon from week 6 onward.
- Finishing the **last** quest in a region lights that region's Beacon, shown
  right in the completion screen.
- The **shop is Bramble's own wares** — every item description is written in
  her voice with an in-world reason to want it (the Guild's coffers are
  famously thin, which is the running joke behind why you're paying at all).
  The priciest items reference the story directly — the baby dragon
  companion is explicitly "a gift from an old friend in the Foothills."
- Finishing week 9 triggers a distinct, larger finale — Bramble's closing
  speech and a "Windrunner of the Realm" title, separate from the normal
  quest-complete screen.
- Every story beat is saved permanently to a **📖 Guild Journal** (on the Hero
  tab), so nothing is missed if a quest happens on a different day than the
  one it unlocked on.

Nothing here is pay-to-progress — nothing is ever locked behind spending, and
the story never blocks or slows down the actual workout. It's motivation, not
a gate.

## What's actually in the plan

The interval structure is the real NHS Couch to 5K programme — 9 weeks,
3 sessions a week, a 5-minute warm-up/cool-down walk around every session,
building from 60-second jogs up to a continuous 30-minute run by week 9.
Nothing was invented or sped up; it's reskinned with quest names, not altered.

- **XP & gold** are earned per completed quest, scaled to the actual minutes
  spent running (not just "showing up"), so effort is what's rewarded.
- **Leveling** happens roughly every 1–2 quests early on, spacing out later —
  by the finale most adventurers land around level 10–11.
- **The shop** has 6 gear slots (weapon, armor, head, boots, cape, companion)
  from free starter items up to a 600-gold baby dragon companion — there's
  enough gold across the whole journey to afford several nice pieces, but not
  everything, so there's always something to save up for.
- **Quests must be completed in order**, matching the real programme's
  progressive structure — the map shows what's done, what's next, and what's
  still locked.
- Every run has audio *and* vibration cues for "run" / "walk" transitions
  (with a 5-second heads-up beep before each switch), so it works even with
  the phone in a pocket or music playing. The **Hero tab** has a "Test cues"
  button to check volume before the first real run.
- Ending a quest early never punishes — it just doesn't mark that quest done,
  and it's waiting to be picked up again any time.

## Managing adventurers

- **Back** on the character-creation screen returns to the adventurer list
  without creating anything (hidden on very first launch, when there's nothing
  to go back to).
- **Delete This Adventurer** sits in a marked Danger Zone at the bottom of the
  Hero tab. It names exactly what will be lost, requires confirmation, and
  cannot be undone. Deleting one adventurer never touches the other.

## Artwork and licensing

The icons throughout the app — navigation, the nine region medallions, quest
status seals, and every individual shop item — are from **game-icons.net**,
drawn by Lorc, Delapouite and other contributors, licensed CC BY 3.0 (some
CC0). `CREDITS.md` lists every icon used and who drew it.

**Keep `CREDITS.md` with the app if you share it** — attribution is a
condition of that licence. You don't need to display it in the app itself;
shipping the file alongside is enough.

The only artwork that is *not* professionally drawn is the adventurer avatar
itself (the customisable character on the Home/Hero screens), which is
generated by `character.js`. See the note at the end of this file.

## If you ever want to tweak it

Everything content-related lives in `data.js` in one place — quest names,
flavor text, and shop item names/prices are plain readable text near the top
of the file if you (or I, in a future conversation) ever want to adjust tone,
add a theme variant for a different age, or extend the reward economy.

## A true native Android app instead?

This PWA needs no Android Studio, no APK, no Play Store listing — just the
steps above. If you specifically want a true native Android app (Kotlin,
built and signed through Android Studio) instead — for example, to publish
on the Play Store — let me know and I can write that version instead.

## About the adventurer avatar

Everything else in the app now uses professionally illustrated artwork. The
character avatar is the exception: it's drawn programmatically in
`character.js`, and it looks it — flat, stiff, and a bit crude next to the
icon set.

It's built as a "paper doll": separate layers for body, armour, weapon, head,
boots, cape and companion, so it can reflect whatever gear is equipped. That
layering is why it can't simply be swapped for a stock icon — each piece has
to line up with the others.

Three ways to fix it properly, in order of how well they'd work:

1. **Commission a small sprite sheet.** An illustrator produces one body in a
   running pose plus the gear layers. This is a few hours of work for someone
   who does this professionally and would transform the app.
2. **Generate the layers with an image tool** and drop the PNGs in. The layer
   list and exact canvas size are documented at the top of `character.js`.
3. **Leave it.** It's functional, and the girls may well not care.
