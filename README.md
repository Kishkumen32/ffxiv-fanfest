# FFXIV Evercold Fanfest 2026 Watch Hub

A static, frost-themed fan site for tracking the FFXIV Evercold expansion reveals across all three Fan Festivals (NA, EU, JP).

**Live site:** https://kishkumen32.github.io/ffxiv-fanfest/

## Features

- **Evercold Frost Theme** — Glass-morphism UI with ice blue palette matching the expansion aesthetic
- **Trailer Embed** — YouTube trailer with custom frost-styled play button (lazy-loaded)
- **Twitch Stream Integration** — Embeds official FFXIV Twitch stream with region tabs (NA/EU/JP)
- **Tabbed Liveblog** — Filtered news feeds:
  - General News
  - Fanfest NA (April 2026)
  - Fanfest EU (July 2026)
  - Fanfest JP (October 2026)
- **Bingo Card** — 25-square prediction card with localStorage persistence
- **Countdown Timers** — Live countdowns to all three Fanfest events
- **Fully Responsive** — Works from 320px mobile to 1440px desktop

## Project Structure

```
.
├── index.html              # Main page
├── style.css               # Frost theme + glass-morphism styles
├── script.js               # Countdowns, Twitch embed, bingo, liveblog
├── bingo.json              # 25 bingo squares
├── liveblog.json           # News entries with region classification
└── assets/
    └── images/
        ├── evercold-logo.png
        ├── evercold-artwork.png
        ├── patch-schedule-2026.png
        └── yoshi-p-2026-shirt.png
```

## Key Facts (as of April 24, 2026)

| Detail | Information |
|--------|-------------|
| **Expansion** | FFXIV: Evercold |
| **Release** | January 2027 |
| **Saga** | The Godless Realms Saga |
| **Setting** | The Fourth (frozen reflection of Hydaelyn) |
| **NA Fanfest** | April 24-25, 2026 (Anaheim) |
| **EU Fanfest** | July 2026 (Berlin) |
| **JP Fanfest** | October 2026 (Tokyo) |
| **Next Patch** | 7.5 — April 28, 2026 (Beastmaster limited job) |

## Data Sources

News entries are sourced from:
- Official FFXIV channels
- Gaming media (IGN, Siliconera, GamesRadar, etc.)
- Community research (Reddit r/ffxiv, r/ffxivdiscussion)

All entries include sentiment tags and source URLs where applicable.

## Development

This is a static HTML/CSS/JS site with no build step. To run locally:

```bash
# Serve with any static file server
python -m http.server 8000

# Or simply open index.html in a browser
```

### Deployment

Site auto-deploys to GitHub Pages on every push to `main` via GitHub Actions.

## Fan-made Disclaimer

This site is **not affiliated with Square Enix**. All copy, design, and predictions are fan-made.

- "The cold never stops. Neither do we." — Original marketing copy
- Rhitahtyn gunshield tank prediction — Community speculation based on Yoshi-P's shirt
- All bingo squares are community predictions, not official announcements

## License

MIT — Feel free to fork and adapt for other FFXIV events.

## Credits

- Design & code: AI-assisted development
- Data: FFXIV community research
- Images: Square Enix promotional materials (Fair use for fan site)