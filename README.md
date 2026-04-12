# A Gentle Rain

A mobile-first web implementation of the solitaire tile-placement puzzle game *A Gentle Rain* by Incredible Dream Studios.

**Play it → [mearkus.com/rain](https://mearkus.com/rain/)**

---

## How to play

Each turn you draw a tile and place it on the growing board. All touching edges must show the **same flower colour**. When four tiles form a **2×2 square**, a blossom blooms at their corner and you claim a matching flower token — if you still have one available.

| Goal | Win condition |
|------|--------------|
| Collect all **8 flower tokens** | Score = 8 + cards remaining in deck |
| Deck runs out before that | Score = tokens collected |

### Controls

| Action | Touch | Mouse |
|--------|-------|-------|
| Place a tile | Tap a highlighted spot | Click a highlighted spot |
| Pan the board | Drag | Click and drag |
| Start over | Tap **New** | Click **New** |
| Rules | Tap **?** | Click **?** |

Tiles with no valid placement on the board are automatically discarded.

---

## Tile set

28 tiles, each with **4 distinct flower edges** (no repeated colour on a single tile), using 8 flower types:

| # | Flower | Colour |
|---|--------|--------|
| 0 | Rose | `#E8A4B8` |
| 1 | Iris | `#9BB5D4` |
| 2 | Lotus | `#7BBEA0` |
| 3 | Cherry | `#F4C48C` |
| 4 | Plum | `#B8A0D4` |
| 5 | Lily | `#A8D4A8` |
| 6 | Orchid | `#D4A87C` |
| 7 | Peony | `#90C4C4` |

The tiles are built from 6 rotation-groups of 4 + 4 bridge tiles so that each flower appears **exactly 14 times** across all tile edges and **3–4 times per side** (top/right/bottom/left), keeping placement options available throughout the game.

---

## Tech

| Concern | Approach |
|---------|---------|
| Rendering | DOM elements — no canvas, no images |
| Tile petals | CSS `clip-path` triangles |
| Layout | `100dvh` flex column, mobile-first |
| Touch | Custom pan-vs-tap state machine (`touchstart/move/end`) |
| Animation | CSS keyframes (tile-drop, blossom-pulse, token-appear) |
| Dependencies | None — single HTML/CSS/JS, no build step |

### Run locally

```bash
# Any static file server works, e.g.:
npx serve .
# or just open index.html directly in a browser
```

---

## Project structure

```
rain/
├── index.html   # Game shell — layout divs, modals
├── style.css    # Mobile-first styles, animations, dark rain palette
└── game.js      # All game logic, rendering, and touch handling
```
