import { run, log, j } from "./lib.js"
import { send, cancel, pub, ABI, OWNER, account, wal, errName } from "./op.js"
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
await run(async (m) => {
  const mk = (await m.client.listPerpMarkets()).find((x: any) => x.baseSymbol === "ETH"); const pool = mk.poolAddress
  const [tick, minQ, lot] = await pub.readContract({ address: pool, abi: ABI, functionName: "getOrderBookParameters" }) as any
  const price = (BigInt(mk.markPrice) * 70n / 100n) / tick * tick
  const before = await m.client.getMarginAccount(mk.marginBank, OWNER); log("margin before", { unlocked: before.unlockedCollateralBalance, locked: before.lockedCollateral })
  const qty = minQ * 2n
  const r = await send({ pool, isBid: true, price, quantity: qty }); log("place", r)
  if (!r.sent) return
  const id = BigInt(r.orderId)
  log("onchain order", await m.client.getOrderOnchain(pool, id).catch((e: any) => "ERR " + e.message))
  log("own open onchain", (await m.client.getOwnOpenOrdersOnchain(pool, OWNER)).map(String))
  const after = await m.client.getMarginAccount(mk.marginBank, OWNER); log("margin after place", { unlocked: after.unlockedCollateralBalance, locked: after.lockedCollateral })
  for (const wait of [0, 2000, 5000, 10000]) { await sleep(wait); const oo = await m.client.getOpenOrders(OWNER).catch((e: any) => "ERR " + e.message); const hit = Array.isArray(oo) ? oo.filter((o: any) => String(o.orderId ?? o.id).includes(String(id)) || j(o).includes(String(id))) : oo; log(`indexer open orders after +${wait}ms`, Array.isArray(oo) ? `total=${oo.length} match=${hit.length}` : oo, Array.isArray(hit) && hit[0] ? j(hit[0]).slice(0, 400) : "") ; if (Array.isArray(hit) && hit.length) break }
  // reduce cases (simulate)
  const red = async (label: string, q: bigint) => { try { await pub.simulateContract({ address: pool, abi: ABI, functionName: "reduceOrderFor", args: [OWNER, id, q], account, gas: 10_000_000n }); log("reduce sim", label, "OK") } catch (e: any) { log("reduce sim", label, errName(e)) } }
  await red("to same qty", qty); await red("to larger", qty + lot); await red("to 0", 0n); await red("to below min", minQ - lot); await red("off-lot", minQ + 1n); await red("to minQ", minQ)
  log("cancel", await cancel(pool, id))
  log("cancel again (sim)", await cancel(pool, id, true))
  log("cancel random id (sim)", await cancel(pool, 123456789n, true))
  const end = await m.client.getMarginAccount(mk.marginBank, OWNER); log("margin end", { unlocked: end.unlockedCollateralBalance, locked: end.lockedCollateral })
}, true, 300000)
