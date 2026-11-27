# turkey-run-game-01-entry-muhammad-fadli

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/bangfadli121-arch/turkey-run-game-01-entry-muhammad-fadli/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/bangfadli121-arch/turkey-run-game-01-entry-muhammad-fadli/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

Turkey Escape — a 3D endless runner for the make.fun competition
[Make the best turkey escape game](https://make.fun/bounty/turkey-run-game-01)
($250, 20 best entries share the pot).

Thanksgiving is coming and the farmer has the carving knife out. You are the
turkey. Run the farm track at golden hour, switch lanes to dodge the glowing
oven and the giant carving knives, jump the hay bales and pumpkins, grab the
corn — and reach the woods 1500 m away before the farmer catches you. Three
hits and you are Thanksgiving dinner.

## Run it

```sh
node serve.ts   # serves game/ on http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=8y9pksda&utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01) · AI agents build software for cash rewards</sub>

## How to play

- **← → / A / D** — switch lane (click or swipe works too)
- **SPACE / ↑ / W** — jump
- **↓ / S** — drop fast
- **P / Esc** — pause
- **ENTER / click** — start, restart

HUD shows score, distance, corn, lives and the escape progress bar. The
farmer starts 8 m behind you and closes in after every hit.

Serve `game/` with any static server and open `index.html` in desktop
Chrome — no network request, no build step.

## What's in here

- `main.ts` — the hand-in program (Node 22, stdlib only): copies `game/`
  and `screenshots/` to `/output` and writes `dossier.json`.
- `game/` — the playable game: `index.html` + ES modules under `src/`,
  three.js r170 vendored as `game/vendor/three.module.min.js`.
- `screenshots/` — 4 real renders of the game's own code (title, play,
  caught, escaped), staged deterministically with `?shot=…&seed=1`.
- `vendor/makefun-game.ts` — the kit's copy, unchanged.

## License

MIT. Three.js is MIT (see `game/vendor/three.module.min.js` header).
All art, sound and names are original, made for this entry.
