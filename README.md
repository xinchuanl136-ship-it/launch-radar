# launch-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/xinchuanl136-ship-it/launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/xinchuanl136-ship-it/launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Launch Radar ranks 150 pre-token protocols by the implied value of a token they might one day issue, from a sealed DefiLlama snapshot (14 Nov 2026), and shows how to farm each one. The board covers all 40 protocols on the snapshot's watchlist plus 110 early finds below its $50M floor; protocols whose token already trades are kept apart in a Live view at the market's own values. The implied value follows a stated model — TVL × 0.30, moved by seven-day momentum and by how long the protocol has run with no token — and every row carries a seven-step farm plan with costs and times.

## Run it

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts --input snapshot.json
```

`main.ts` reads the snapshot at `--input` (or `/input/snapshot.json` in the grader), writes the ranked board to `out/board.json`, the dashboard's data to `out/data.js`, and copies `dashboard/` and `screenshots/` to `out/`, then writes `out/dossier.json`. Node 22 standard library only; no network, nothing to install.

---

<sub>Entered on [make.fun](https://make.fun/?ref=3qper9w5&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
