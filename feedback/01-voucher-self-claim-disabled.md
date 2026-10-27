# claimPerpVoucher always reverts with SelfClaimDisabled() while getPerpVoucherEligibility reports eligible: true
Severity: normal
Area: SDK

## Steps to reproduce
1. Fresh EOA with STT for gas, no perp positions or orders (here 0x4245…BcB5).
2. `markets.client.getPerpVoucherEligibility(btc.marginBank, account)` → `{ eligible: true, grantAmount: 1000e18 }`.
3. `markets.trader.claimPerpVoucher({ marginBank: btc.marginBank })` exactly as in the docs page *Perps on Testnet for Developers → Get test funds*.

Script: `scripts/t02-claim.ts`, `scripts/t03-claimdbg.ts`.

## Expected
Either the claim credits 1,000 paper USDso, or eligibility returns `eligible: false` with a reason, and the SDK surfaces a named error.

## Actual
- Claim reverts: `ContractRevertError: claim reverted: for an unknown reason.`, revert data `0x3e31dcc2`.
- `0x3e31dcc2` = `keccak256("SelfClaimDisabled()")[:4]`. The error is in none of the SDK ABIs, so the SDK cannot name it.
- `debug_traceCall` shows the revert inside the distributor implementation `0x9657f0fd53efc01cd108d93c835bb4b517732b43` (behind proxy `0x2ACD9EFdA721450906bfE1bef3edE269636E42C4`) after ~871 gas, right after reading the packed config slot `0xb7eec95a…a807` = `0x…000100010000000000093a80` (a boolean in it is 0).
- `getPerpVoucherEligibility` cannot see this flag: `voucherDistributorReadAbi.getConfig` only exposes 6 fields (marginBank, collateralToken, grantAmount, expiryDuration, campaignStart, campaignEnd). Its source comment says the checks are in "the same order as VoucherDistributor.claim(), so the first failure here is the revert a claim would produce" — no longer true.
- The implementation now exposes `setGrantOperator(address,bool)`, `isGrantOperator(address)` and `creditAccount(address,uint256)`: credits are granted by an operator (the app's Perps Arena flow credited 0x6Bab…3F37 normally: `getPerpVoucher` → `claimed: true, floor: 1000e18`).
- Docs still say "Any address can claim the 1,000 USDso perps credit once, as long as it holds no perp positions or orders" with the `claimPerpVoucher` snippet.

Impact: every developer following the docs to fund a bot account hits an undecodable revert, and the SDK's own eligibility check tells them they qualify. Test funds are still obtainable through the app's Perps Arena (operator-granted credit), so this blocks the documented path, not testing itself; the self-claim switch looks deliberate. Reproduced twice (logs/t02, logs/repro-1).

Re-verified 2026-10-27 with `eth_call` from two freshly generated addresses (nonce 0, no positions, orders or history): `getPerpVoucherEligibility` → `eligible: true`, claim → revert `0x3e31dcc2`. Same implementation behind the proxy (`0x9657…2b43`); `SelfClaimDisabled` is still missing from `contractErrorsAbi` in 0.32.1.

## Evidence
- Raw call: `eth_call {from: 0x4245…BcB5, to: 0x2ACD…42C4, data: 0x4e71d92d}` → revert `0x3e31dcc2`.
- Trace: `evidence/03-trace-claim.json` (callTracer + structLogs).
- Suggested fix: read the self-claim flag in `getPerpVoucherEligibility` (new reason, e.g. `selfClaimDisabled`), add `SelfClaimDisabled()` to `contractErrorsAbi`, and update the docs to point to the Perps Arena / operator-granted flow.

## Environment
SDK @somnia-chain/markets-sdk 0.32.1, viem 2.57.11, Node 22.23.4, macOS.
Network: Somnia Tokyo testnet (Hideki), chain 50383, RPC https://api.hideki2.infra.testnet.somnia.network.
Bot (operator) key: 0x424587Af5a6102aA8469554a71A97d6d0331BcB5, linked via Link a Bot to account 0x6BabCfF65546BA363791450865936CA1d56e3F37.
Tested 2026-10-24.
