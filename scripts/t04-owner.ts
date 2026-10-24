import { run, log, tryIt } from "./lib.js"
await run(async (m) => {
  const btc = (await m.client.listPerpMarkets()).find((x: any) => x.baseSymbol === "BTC")
  for (const a of ["0x6babcff65546ba363791450865936ca1d56e3f37", "0x035b3c6108f165a979b89bc12f1bc461813b87e4"]) {
    log("=== ", a)
    await tryIt("code size", async () => ((await m.client.publicClient?.getCode?.({ address: a })) ?? "n/a").length)
    await tryIt("margin", () => m.client.getMarginAccount(btc.marginBank, a))
    await tryIt("voucher", () => m.client.getPerpVoucher(btc.marginBank, a))
  }
})
