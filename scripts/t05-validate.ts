import { run, log } from "./lib.js"
import { sim, ABI, pub, OWNER, account } from "./op.js"
import { parseUnits } from "viem"
await run(async (m) => {
  const mk = (await m.client.listPerpMarkets()).find((x: any) => x.baseSymbol === "ETH")
  const pool = mk.poolAddress as `0x${string}`
  const auth = await pub.readContract({ address: pool, abi: ABI, functionName: "isOperatorAuthorized", args: [OWNER, account.address, "0x80054449"] })
  const [tick, minQ, lot] = await pub.readContract({ address: pool, abi: ABI, functionName: "getOrderBookParameters" }) as any
  log("ETH pool", pool, "authorized", auth, "tick", tick, "minQ", minQ, "lot", lot, "row tick/min/lot", mk.tickSize, mk.minQuantity, mk.lotSize, "mark", mk.markPrice, "baseDec", mk.baseDecimals)
  const mark = BigInt(mk.markPrice); const farBid = (mark * 70n / 100n) / tick * tick // resting bid 30% below mark
  const q = minQ
  const cases: [string, any][] = [
    ["baseline resting bid", { price: farBid, quantity: q }],
    ["price off tick (+1 wei)", { price: farBid + 1n, quantity: q }],
    ["qty off lot (+1)", { price: farBid, quantity: q + 1n }],
    ["qty below min (min-lot)", { price: farBid, quantity: q - lot }],
    ["qty zero", { price: farBid, quantity: 0n }],
    ["price zero", { price: 0n, quantity: q }],
    ["expiry 0", { price: farBid, quantity: q, expire: 0n }],
    ["expiry past", { price: farBid, quantity: q, expire: BigInt(Date.now() - 60000) * 1_000_000n }],
    ["expiry in ms (wrong unit)", { price: farBid, quantity: q, expire: BigInt(Date.now() + 3600_000) }],
    ["orderType 3 PostOnly resting", { price: farBid, quantity: q, orderType: 3 }],
    ["orderType 1 FOK far", { price: farBid, quantity: q, orderType: 1 }],
    ["orderType 2 IOC far (no fill)", { price: farBid, quantity: q, orderType: 2 }],
    ["orderType 7 invalid", { price: farBid, quantity: q, orderType: 7 }],
    ["qty 0.01 ETH scaled 1e8 wrong", { price: farBid, quantity: parseUnits("0.01", 8) }],
    ["qty huge 1e6 ETH", { price: farBid, quantity: parseUnits("1000000", mk.baseDecimals) }],
    ["gas 1.5M", { price: farBid, quantity: q, gas: 1_500_000n }],
    ["gas 3.2M", { price: farBid, quantity: q, gas: 3_200_000n }],
  ]
  for (const [label, c] of cases) log(label.padEnd(32), await sim({ pool, isBid: true, ...c }))
})
