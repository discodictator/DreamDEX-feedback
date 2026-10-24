import { run, log } from "./lib.js"
import { sim, pub, ABI, OWNER } from "./op.js"
await run(async (m) => {
  const all = await m.client.listPerpMarkets()
  const out: any[] = []
  for (const mk of all) {
    const pool = mk.poolAddress
    const [tick, minQ, lot] = await pub.readContract({ address: pool, abi: ABI, functionName: "getOrderBookParameters" }) as any
    for (const [side, isBid, f] of [["bid70", true, 70n], ["ask130", false, 130n]] as const) {
      const price = (BigInt(mk.markPrice) * f / 100n) / tick * tick
      let mx: any; try { mx = await m.client.getMaxPerpOrderSize({ pool, marginBank: mk.marginBank, account: OWNER, isBid, price }) } catch (e: any) { out.push([mk.baseSymbol, side, "getMax ERR " + (e.shortMessage ?? e.message).slice(0, 120)]); continue }
      if (!mx.placeable || !mx.priceable) { const s = await sim({ pool, isBid, price, quantity: minQ }); out.push([mk.baseSymbol, side, `placeable=${mx.placeable} priceable=${mx.priceable} limitedBy=${mx.limitedBy} max=${mx.maxQuantity}`, "sim(minQ):", s.ok ? "OK" : s.error]); continue }
      const q = BigInt(mx.maxQuantity)
      const a = await sim({ pool, isBid, price, quantity: q }), b = await sim({ pool, isBid, price, quantity: q + lot })
      out.push([mk.baseSymbol, side, `limitedBy=${mx.limitedBy} max=${q}`, "sim(max):", a.ok ? "OK" : a.error, "sim(max+lot):", b.ok ? "OK" : b.error])
    }
  }
  for (const r of out) log(...r)
}, true, 600000)
