# isOperatorAuthorized returns false for the batch selectors, yet batch calls succeed for a linked bot
Severity: normal
Area: contracts

## Steps to reproduce
1. Link a bot in the app (Perps ticked). The registry grants `placeOrderFor` 0x80054449, `cancelOrderFor` 0xe37b444b and `reduceOrderFor` 0x364c2587.
2. `pool.isOperatorAuthorized(owner, bot, 0xb5e6cdfd)` (placeOrdersFor), and the same for 0x5a3165a9 cancelOrdersFor and 0xeddb4f78 reduceOrdersFor.
3. Send `placeOrdersFor(owner, [resting bid, IOC far from book])`.

Script: `scripts/t10-batch.ts`, `scripts/t11-batchsend.ts`.

## Expected
`isOperatorAuthorized` reflects what the pool enforces, or the docs state that batch calls are authorized through the singular selector.

## Actual
All three batch selectors return `false`, but the batch succeeds: tx `0x4afe87e49de4a9c93be4c07e26a628fe091bfe395afc53863f182c4b1bb544d8` placed one order and rejected the IOC. The documented batch semantics were verified correct: `listPerpOrderRejections` returned reason `ImmediateOrCancelNoFill` / 5, requestIndex 1. The official bot kit's `linkStatus()` treats `isOperatorAuthorized` as "the pool's answer is the one it enforces", so a pre-check on a batch selector refuses a path that works. Reproduced twice.

Suggested fix: make `isOperatorAuthorized` answer for the batch selectors the way the pool enforces them (map each batch selector to its singular grant), or document that batch calls are authorized through the singular selector so kits can pre-check correctly.

Re-verified 2026-10-27: the three batch selectors still return `false`, the singular ones `true`, and a `placeOrdersFor` simulation from the bot succeeds (`[true, false]`).

## Environment
SDK @somnia-chain/markets-sdk 0.32.1, viem 2.57.11, Node 22.23.4, macOS.
Network: Somnia Tokyo testnet (Hideki), chain 50383, RPC https://api.hideki2.infra.testnet.somnia.network.
Bot (operator) key: 0x424587Af5a6102aA8469554a71A97d6d0331BcB5, linked via Link a Bot to account 0x6BabCfF65546BA363791450865936CA1d56e3F37.
Tested 2026-10-24.
