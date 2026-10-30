# dreamDEX Perps Builder Bounty: feedback track

Findings from testing the dreamDEX Perps API, SDK (`@somnia-chain/markets-sdk` 0.32.1), contracts and docs on the Somnia Tokyo testnet (Hideki, chain 50383).

Each issue is in its own file in [`feedback/`](feedback). Every item was reproduced at least twice before filing. Issues we also found but another participant had already published are left out.

| # | Issue | Severity | Area |
|---|---|---|---|
| 01 | [claimPerpVoucher always reverts SelfClaimDisabled() while eligibility says eligible](feedback/01-voucher-self-claim-disabled.md) | normal | SDK |
| 02 | [reduceOrderFor upward reverts InvalidQuantity with a misleading documented meaning](feedback/02-reduce-up-invalidquantity.md) | normal | docs |
| 03 | [isOperatorAuthorized false for batch selectors that work](feedback/03-isoperatorauthorized-batch-false.md) | normal | contracts |
| 04 | [Node process hangs after chain reads; close() undocumented](feedback/04-sdk-close-undocumented.md) | normal | docs |
| 05 | [The operator registry's grant events have no ABI in the SDK, and two event shapes are in use](feedback/05-registry-grant-events-not-in-sdk.md) | normal | SDK |
| 06 | [listPerpPositionChanges fails with "database query error" past the first pages of a 30-day window](feedback/06-position-changes-deep-offset-fails.md) | normal | API |

## Verified correct (no issue found)
- All 56 selectors on the Errors page match their signatures (checked with keccak256).
- `getMaxPerpOrderSize`: on all 21 markets, both sides, `maxQuantity` places and `maxQuantity + lotSize` reverts `InsufficientCollateral()`.
- Decimals table on the perps developer page matches every market row.
- Price/qty/expiry validation errors (`InvalidPrice`, `InvalidQuantity`, `QuantityBelowMinimum`, `OrderAlreadyExpired`, `FillOrKillNotFillable`, `ImmediateOrCancelNoFill`) decode with useful arguments.
- Batch semantics: a refused request in `placeOrdersFor` does not revert, and `listPerpOrderRejections` reports it by name (reason 5).
- Margin lock on a resting order equals `initialMarginBps` (5%) of notional and is fully released on cancel; indexer shows new open orders within 1 s.
- The node's `eth_getLogs` takes ranges over 1,000 blocks (1,001 checked), so no range limit to report.
- Gas used per order matches the docs (about 1.5–1.7M on a new price level, about 464k on an existing level).

## Reproduce
```bash
npm install
cp .env.example .env   # testnet bot key linked to OWNER_ADDRESS via Link a bot
npm run repro
npm run repro:read     # #05 and #06: read-only, no key needed
```
Scripts in `scripts/` default to `eth_call` simulation. The ones that send transactions use minimum size, far from the market, and cancel what they place.
