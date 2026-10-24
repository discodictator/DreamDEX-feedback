import { run, log } from "./lib.js"
import { pub, ABI, OWNER, account, farNs, errName } from "./op.js"
import { parseAbi } from "viem"
import { contractErrorsAbi } from "@somnia-chain/markets-sdk"
const B = [...parseAbi([
  "function placeOrdersFor(address owner, (bool isBid,uint64 userData,uint256 price,uint256 quantity,uint64 expireTimestampNs,uint8 orderType,uint8 selfMatchingOption,address builder,uint96 builderFeeBpsTimes1k)[] reqs) payable returns (bool[] successes, uint128[] orderIds)",
  "function cancelOrdersFor(address owner, uint128[] ids)",
  "function reduceOrdersFor(address owner, (uint128 orderId,uint256 newQuantityRemaining)[] reqs)",
]), ...contractErrorsAbi] as const
await run(async (m) => {
  const mk = (await m.client.listPerpMarkets()).find((x: any) => x.baseSymbol === "ETH"); const pool = mk.poolAddress
  for (const [n, s] of [["placeOrdersFor", "0xb5e6cdfd"], ["cancelOrdersFor", "0x5a3165a9"], ["reduceOrdersFor", "0xeddb4f78"], ["placeOrderFor", "0x80054449"]] as const)
    log("authorized", n, await pub.readContract({ address: pool, abi: ABI, functionName: "isOperatorAuthorized", args: [OWNER, account.address, s as `0x${string}`] }))
  const [tick, minQ] = await pub.readContract({ address: pool, abi: ABI, functionName: "getOrderBookParameters" }) as any
  const price = (BigInt(mk.markPrice) * 70n / 100n) / tick * tick
  const req = (orderType: number) => ({ isBid: true, userData: 0n, price, quantity: minQ, expireTimestampNs: farNs(), orderType, selfMatchingOption: 0, builder: "0x0000000000000000000000000000000000000000" as const, builderFeeBpsTimes1k: 0n })
  try { const r = await pub.simulateContract({ address: pool, abi: B, functionName: "placeOrdersFor", args: [OWNER, [req(0), req(2)]], account, gas: 10_000_000n }); log("placeOrdersFor sim OK", JSON.stringify(r.result, (k, v) => typeof v === "bigint" ? v.toString() : v)) } catch (e: any) { log("placeOrdersFor sim", errName(e)) }
  try { await pub.simulateContract({ address: pool, abi: B, functionName: "cancelOrdersFor", args: [OWNER, [1n]], account, gas: 10_000_000n }); log("cancelOrdersFor sim OK") } catch (e: any) { log("cancelOrdersFor sim", errName(e)) }
})
