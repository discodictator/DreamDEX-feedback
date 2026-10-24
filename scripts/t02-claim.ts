import { run, log, tryIt } from "./lib.js"
await run(async (m) => {
  const me = m.walletAddress
  const btc = (await m.client.listPerpMarkets()).find((x: any) => x.baseSymbol === "BTC")
  const proto = (o: any) => { const s = new Set<string>(); let p = o; while (p && p !== Object.prototype) { Object.getOwnPropertyNames(p).forEach(n => s.add(n)); p = Object.getPrototypeOf(p) } return [...s] }
  log("trader perp methods", proto(m.trader).filter(n => /perp/i.test(n)).join(","))
  await tryIt("claimPerpVoucher", () => m.trader.claimPerpVoucher({ marginBank: btc.marginBank }))
  await tryIt("voucher after", () => m.client.getPerpVoucher(btc.marginBank, me))
  await tryIt("eligibility after", () => m.client.getPerpVoucherEligibility(btc.marginBank, me))
  await tryIt("margin after", () => m.client.getMarginAccount(btc.marginBank, me))
  await tryIt("claim again", () => m.trader.claimPerpVoucher({ marginBank: btc.marginBank }))
})
