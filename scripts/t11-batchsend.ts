import { run, log, j } from "./lib.js"
import { pub, wal, ABI, OWNER, account, farNs, errName, cancel } from "./op.js"
import { parseAbi, decodeEventLog } from "viem"
import { contractErrorsAbi } from "@somnia-chain/markets-sdk"
const B = parseAbi(["function placeOrdersFor(address owner, (bool isBid,uint64 userData,uint256 price,uint256 quantity,uint64 expireTimestampNs,uint8 orderType,uint8 selfMatchingOption,address builder,uint96 builderFeeBpsTimes1k)[] reqs) payable returns (bool[] successes, uint128[] orderIds)"])
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
await run(async (m) => {
  const mk = (await m.client.listPerpMarkets()).find((x: any) => x.baseSymbol === "ETH"); const pool = mk.poolAddress
  const [tick, minQ] = await pub.readContract({ address: pool, abi: ABI, functionName: "getOrderBookParameters" }) as any
  const price = (BigInt(mk.markPrice) * 70n / 100n) / tick * tick
  const req = (orderType: number) => ({ isBid: true, userData: 0n, price, quantity: minQ, expireTimestampNs: farNs(), orderType, selfMatchingOption: 0, builder: "0x0000000000000000000000000000000000000000" as const, builderFeeBpsTimes1k: 0n })
  const hash = await wal.writeContract({ address: pool, abi: B, functionName: "placeOrdersFor", args: [OWNER, [req(0), req(2)]], gas: 10_000_000n })
  const rc = await pub.waitForTransactionReceipt({ hash }); log("batch tx", hash, rc.status, "gas", rc.gasUsed, "block", rc.blockNumber, "logs", rc.logs.length)
  for (const l of rc.logs) { try { const d: any = decodeEventLog({ abi: (await import("../node_modules/@somnia-chain/markets-sdk/dist/eventsAbi.js") as any).eventsAbi ?? [], data: l.data, topics: l.topics }); log("  event", d.eventName, j(d.args).slice(0, 250)) } catch { log("  raw log", l.topics[0]) } }
  const ids = await m.client.getOwnOpenOrdersOnchain(pool, OWNER); log("open onchain", ids.map(String))
  for (const w of [0, 3000, 8000]) { await sleep(w); const r = await m.client.listPerpOrderRejections?.({ owner: OWNER } as any).catch((e: any) => "ERR " + (e.shortMessage ?? e.message).slice(0, 300)); log(`listPerpOrderRejections +${w}ms`, typeof r === "string" ? r : j(r).slice(0, 500)); if (Array.isArray(r) && r.length) break }
  for (const id of ids) log("cleanup cancel", id.toString(), await cancel(pool, id))
}, true, 300000)
