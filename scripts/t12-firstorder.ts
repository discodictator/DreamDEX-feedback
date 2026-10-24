import { run, log } from "./lib.js"
import { sim, send, cancel, pub, ABI } from "./op.js"
await run(async (m) => {
  const all = await m.client.listPerpMarkets()
  for (const sym of ["LINK", "AVAX"]) {
    const mk = all.find((x: any) => x.baseSymbol === sym); const pool = mk.poolAddress
    const [tick, minQ] = await pub.readContract({ address: pool, abi: ABI, functionName: "getOrderBookParameters" }) as any
    const price = (BigInt(mk.markPrice) * 70n / 100n) / tick * tick
    for (const g of [1_600_000n, 3_200_000n]) log(sym, "pre-first sim gas", g, (await sim({ pool, isBid: true, price, quantity: minQ, gas: g })).ok)
    const a = await send({ pool, isBid: true, price, quantity: minQ }); log(sym, "1st order gasUsed", a.gasUsed, a.hash)
    const b = await send({ pool, isBid: true, price, quantity: minQ }); log(sym, "2nd order same level gasUsed", b.gasUsed)
    const c = await send({ pool, isBid: true, price: price - tick * 10n, quantity: minQ }); log(sym, "3rd order new level gasUsed", c.gasUsed)
    for (const r of [a, b, c]) if (r.orderId) log(sym, "cancel", (await cancel(pool, BigInt(r.orderId))).gasUsed)
  }
}, true, 400000)
