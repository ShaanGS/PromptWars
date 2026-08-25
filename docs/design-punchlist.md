# Design punch list

Working evidence file for the design-quality pass (roadmap, Next).
Shaan's verdict 2026-08-24: the app "looks so AI made", not
professional-designer made, "a bit sloppy". Items land here as they are
spotted — screenshots from Shaan are the primary source. Fixed items
get struck through with the date, not deleted.

## From Shaan's screenshots (2026-08-24)

Feed cards:

- ~~Raw URL rendered as the event's location ("Mon 7 Sep ·
  https://boss-battle.devfolio.co/…")~~ — fixed same day, cards never
  show a URL as place.
- ~~"12:00 AM" shown for all-day events on the image chip~~ — fixed
  same day.
- Card appeared to overlap/cover its neighbour, clipping the title —
  unconfirmed whether it survives a refresh; if reproducible, suspect
  the swipe-away translate or the image block.
- Poster-style images (portrait, text-heavy — Tamil poster, BOSS
  Battle) sit awkwardly in the 16:9 slot: blur bands read as broken,
  hard crops lose the poster's own text.

From the 2026-08-24 live audit (all four screens, desktop):

- ~~Titles carry source junk: "Pitch to ivi | Virtual | August 24,
  2026, | 10:00 AM - 05:00 PM" restates mode/date/time the meta line
  already shows~~ — fixed same day: `displayTitle()` drops
  whole-segment restatements everywhere titles render (cards, detail,
  calendar, .ics, onboarding). Tested against the live titles.
- ~~"Matches pitch, venture" reason lines — machine copy doubling the
  tags, often stacked under a "For you" pill saying the same~~ —
  fixed same day: keyword-pass reasons stay off cards, LLM prose stays.
- ~~Deadline placeholders showing "12:01 AM" cutoff artifacts~~ —
  fixed same day: edge-of-day deadline times render date-only.
- ~~Exact duplicate cards sit side-by-side on /events ("Pitch to ivi"
  twice)~~ — fixed 2026-08-24: /events collapses within the page, the
  "+1 listing" badge keeps every listing accounted for.
- ~~Sidebar header: wordmark small, misaligned with the nav's left
  edge, tagline cramped beneath it~~ — fixed 2026-08-24: wordmark up
  to lg, aligned to the nav icons' 24px edge, tagline out of the
  chrome (it lives on login and the link preview).
- Calendar week view: grid ends at ~430px with a large dead area
  below; the page reads top-heavy and unfinished (hour grid is
  deliberately deferred, but the empty state needs design).
- Hackathons: six identical lilac placeholder blocks in a row — the
  category tone makes every deadline card look the same; monotony
  reads as template.
- Feed first card rendered with a blank image block mid-load —
  image loading state looks broken rather than pending.
- LLM reasons phrased as critiques leak onto cards: "UI fundamentals
  workshop lacks advanced technical depth." under a Maybe-45 card is
  the scorer justifying a LOW score to itself, not a line for the
  reader. Positive prose earns the card; negative prose belongs in
  the score tooltip, if anywhere.

Event detail sidebar:

- ~~".ics" pushed through the card edge (grid track below min-content)~~
  — fixed 2026-08-24, `minmax(0,1fr)` + shorter label, both detail
  pages.
- ~~Button rhythm (three widths in four buttons)~~ — fixed 2026-08-24:
  full-width primary, two equal secondary halves, full-width Share.
- ~~"PRICE — Not stated" filler row~~ — fixed 2026-08-24: unknown
  price renders no row; When/Where keep "Not stated" because their
  absence is information.

- ~~Cards in a row uneven in height~~ — fixed 2026-08-24: a regression
  from the swipe-away wrapper (the article stopped being the stretched
  grid item); `h-full` restores the chain.
- ~~Sparkle/Timer/TrendUp icons before feed section headings~~ —
  removed 2026-08-24 on Shaan's call; decorative duotone icons before
  headings are themselves a template tell.

## The standing verdict (Shaan, 2026-08-24, end of session)

"The dashboard and all the cards, everything looks utterly AI made and
looks sloppy and cannot grab my attention no matter what, because of
bad design." The mechanical fixes above are necessary but not
sufficient — the next session is the real redesign of the feed and
cards: layout, hierarchy and art direction, driven by his reference
screenshots (Beam is reference #1: personality and deliberate art
direction, not just tidy minimalism). Stat tiles included in that
verdict.

## Standing direction (from memory + 08-23 system)

- References first: Shaan communicates in screenshots, not adjectives.
  Collect his reference apps and worst-screens list before scoping.
- The 08-23 token system (Inter, indigo, pastels, light-only) is
  approved; execution quality is what misses.
- Judge every screen against "would a professional designer ship
  this", not against the token sheet.
- Brand voice is now quirky ("Touch grass, professionally.") — copy
  elsewhere can afford more personality than it has.
