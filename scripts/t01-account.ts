import { run, log, tryIt } from "./lib.js"
await run(async (m) => {
  const me = m.walletAddress; log("wallet", me)
  const perps = await m.client.listPerpMarkets(); const btc = perps.find((x: any) => x.baseSymbol === "BTC")
  await tryIt("native balance", () => m.client.getNativeBalance(me))
  await tryIt("voucher campaign", () => m.client.getPerpVoucherCampaign(btc.marginBank))
  await tryIt("voucher eligibility", () => m.client.getPerpVoucherEligibility(btc.marginBank, me))
  await tryIt("voucher", () => m.client.getPerpVoucher(btc.marginBank, me))
  await tryIt("margin account", () => m.client.getMarginAccount(btc.marginBank, me))
})
