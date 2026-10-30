# listPerpPositionChanges fails with "database query error" past the first pages of a 30-day window
Severity: normal
Area: API

## Steps to reproduce
1. `client.listPerpPositionChanges({ from: now − 30 days, to: now − 1 h, kinds: ["OPEN", "INCREASE", "REDUCE", "CLOSE", "FLIP"], order: "asc", limit: 1000, offset })` for offset 0, then 10,000.
2. The same for a 7-day and a 1-day window.

Script: `scripts/repro/readonly.ts` (#06), or `scripts/t14-indexer-offset.ts` (`DAYS=7` for a shorter window).

## Expected
The SDK documents `offset` as "an integer from 0 to 2,147,483,647", and the method as the way to page the per-update history. A page deep in the window comes back, or the indexer answers with a clear limit error ("offset too large, narrow the window").

## Actual
- 30 days: offset 0 returns 1,000 rows in 3.6–5.7 s. Offset 10,000, 30,000, 60,000, 100,000, 300,000, 1,000,000, 3,000,000 and 6,000,000 all fail after 11–15 s with `indexer PerpPositionChanges failed: database query error`.
- 7 days: offset 10,000–100,000 took 9.5–10.1 s per page in one run, and failed the same way after 11 s in the next.
- 1 day: offsets up to 400,000 return in under 1 s.

So the failure is a query timeout of roughly 10 s, reported as a generic database error. A client paging a month of history (a leaderboard, a PnL report) can't get past the first 10,000 rows, and can't tell a timeout it should work around from a real outage. The documented alternative (walk forward with `order: "asc"` and `from` at the last row's time) works, but it is not what the `offset` description promises. Reproduced in three runs.

Suggested fix: index the `(timestamp, blockNumber, logIndex)` order the query sorts by, or switch the method to cursor paging like `getUserFillsPage`; until then, document the practical window and offset limits and return a distinct timeout error.

## Environment
SDK @somnia-chain/markets-sdk 0.32.1, viem 2.57.11, Node 22.23.4, macOS.
Network: Somnia Tokyo testnet (Hideki), chain 50383, indexer https://hideki-dev.smk.somnia.host/v1/graphql.
Tested 2026-10-30.
