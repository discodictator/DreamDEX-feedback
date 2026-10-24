import { run, log, j } from "./lib.js"
await run(async (m) => {
  const btc = (await m.client.listPerpMarkets()).find((x: any) => x.baseSymbol === "BTC")
  try { await m.trader.claimPerpVoucher({ marginBank: btc.marginBank }) } catch (e: any) {
    const seen = new Set(); let c = e, d = 0
    while (c && d < 6 && !seen.has(c)) { seen.add(c)
      log(`cause[${d}]`, c.name, "|", (c.shortMessage ?? c.message ?? "").slice(0,300))
      log(`  keys`, Object.keys(c).join(","))
      for (const k of ["data","signature","raw","reason","details","txHash","hash","receipt","operation","errorName","args","metaMessages"]) if (c[k] !== undefined) log(`  ${k}`, typeof c[k]==="object"? j(c[k]).slice(0,500): String(c[k]).slice(0,300))
      c = c.cause; d++ }
  }
  const b = await m.trader.buildClaimPerpVoucher({ marginBank: btc.marginBank }).catch((e: any) => ({ err: e.message }))
  log("built tx", j(b).slice(0, 800))
})
