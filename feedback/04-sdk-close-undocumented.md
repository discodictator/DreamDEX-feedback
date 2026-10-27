# A Node script never exits after any chain read unless markets.close() is called, and the Connect docs don't mention close()
Severity: normal
Area: docs

## Steps to reproduce
Run the docs' *Connect* snippet in Node, then call `await markets.client.getPerpSystemConfig(btc.marginBank)` and let the script end.

Script: `scripts/exit2.ts` (modes: none | markets).

## Expected
The process exits, or the docs show `await markets.close()`.

## Actual
The read returns in about 1.3 s, then the process stays alive indefinitely: still alive after 20 s and 40 s in two runs, because the WebSocket stays open. Indexer-only calls such as `listPerpMarkets()` exit normally, which makes it look intermittent. `markets.close()` exists and fixes it, exiting in 2 s, but it is not in the *Connect* or *Perps on Testnet for Developers* examples. CI jobs, cron scripts and one-shot tools hang until killed.

Suggested fix: add `await markets.close()` to the *Connect* and *Perps on Testnet for Developers* snippets, or `unref()` the WebSocket so a finished script can exit on its own.

Re-verified 2026-10-27: after `getPerpSystemConfig` the process was still alive 30 s later.

## Environment
SDK @somnia-chain/markets-sdk 0.32.1, viem 2.57.11, Node 22.23.4, macOS.
Network: Somnia Tokyo testnet (Hideki), chain 50383, RPC https://api.hideki2.infra.testnet.somnia.network.
Bot (operator) key: 0x424587Af5a6102aA8469554a71A97d6d0331BcB5, linked via Link a Bot to account 0x6BabCfF65546BA363791450865936CA1d56e3F37.
Tested 2026-10-24.
