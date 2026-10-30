# The operator registry's grant events have no ABI in the SDK, and two event shapes are in use
Severity: normal
Area: SDK

## Steps to reproduce
1. Link a bot to a wallet in the app (wallet → Link a bot → Perps).
2. Read the logs of the operator registry `0x6b2fbfed328ff5f20c0be7d3c3437613affe8d3a` on Hideki for the blocks around the link.
3. Try to decode them with every event ABI `@somnia-chain/markets-sdk` exports (`marginBankEventsAbi`, `perpPoolEventsAbi`, `orderBookEventsAbi` and the other eight `*EventsAbi`).

Script: `scripts/repro/readonly.ts` (#05), or `scripts/t13-grant-events.ts`.

## Expected
An app that issues a bot key can learn which wallet linked it from the chain: the SDK exports the registry's grant event (name and fields) next to the other event ABIs, so the logs decode.

## Actual
None of the 82 events in the SDK's ABIs matches either topic the registry emits. Over the last ~200k blocks (2026-10-30) it emitted:
- `0x864aeace…8952`: 4 topics + 32 data bytes (83 logs). The topics carry the owner, the operator and the selector; the data is a bool.
- `0x10f87936…de28`: 4 topics + 64 data bytes (1,850 logs). It appeared in late October; its topics carry the pool, the owner and the operator, and the data holds the selector and a bool.

Both are still emitted: the latest of each was minutes apart. Without a published signature, an integration has to find the topics by watching its own links and guess the field order, and when the second shape appeared our wallet detection had to be changed to match it, with no notice. Reproduced twice.

(The registry address is also missing from `SOMNIA_HIDEKI_TESTNET_ADDRESSES`; others have already reported that, so it is not counted here.)

Suggested fix: export the registry's ABI (both grant events, with names) from the SDK, document which of the two the app emits and when, and give notice before an event changes shape.

## Environment
SDK @somnia-chain/markets-sdk 0.32.1, viem 2.57.11, Node 22.23.4, macOS.
Network: Somnia Tokyo testnet (Hideki), chain 50383, RPC https://api.hideki2.infra.testnet.somnia.network.
Tested 2026-10-30.
