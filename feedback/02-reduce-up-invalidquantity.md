# reduceOrderFor to a larger quantity reverts InvalidQuantity(new, current); the docs say InvalidQuantity means "not a multiple of lotSize"
Severity: normal
Area: docs

## Steps to reproduce
1. Resting ETH-PERP order with quantity `8e15` (lotSize `1e14`).
2. `reduceOrderFor(owner, id, 8.1e15)`. The new quantity is lot-aligned but larger than the current one.

Script: `scripts/t08-lifecycle.ts`.

## Expected
A distinct error, or docs that cover this case.

## Actual
`InvalidQuantity(8100000000000000, 8000000000000000)`. The Errors page lists `InvalidQuantity(uint256 quantity, uint256 constraint)`: "quantity is not a whole multiple of lotSize. Lot-align the quantity." Here the second argument is the current remaining quantity, not lotSize, and following the documented fix cannot help. Reproduced twice.

## Evidence
Simulation logs in `logs/t08.txt` and `logs/repro-1.txt`. Suggestion: document that `constraint` is the current remaining quantity on reduce paths, or add a dedicated error such as `ReduceCannotIncrease`.

Re-verified 2026-10-27 with a second linked bot (0xd777…9a23): a real 8e15 resting bid (tx `0xa9c063a7…30fa`, cancelled in `0xe5a95ffd…719b`), reduce to 8.1e15 → `InvalidQuantity(8100000000000000, 8000000000000000)`. For contrast, an off-lot reduce gives `InvalidQuantity(4000000000000001, 100000000000000)`, where the second argument really is lotSize.

## Environment
SDK @somnia-chain/markets-sdk 0.32.1, viem 2.57.11, Node 22.23.4, macOS.
Network: Somnia Tokyo testnet (Hideki), chain 50383, RPC https://api.hideki2.infra.testnet.somnia.network.
Bot (operator) key: 0x424587Af5a6102aA8469554a71A97d6d0331BcB5, linked via Link a Bot to account 0x6BabCfF65546BA363791450865936CA1d56e3F37.
Tested 2026-10-24.
