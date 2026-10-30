// Reproduces every filed issue. Read-only except one resting order (placed far from the book, then cancelled).
// #05 and #06 need no key: scripts/repro/readonly.ts (npm run repro:read).
import { spawnSync } from "node:child_process"
import { run, j } from "../lib.js"
import { send, cancel, pub, ABI, OWNER, account, farNs, errName } from "../op.js"
import { keccak256, toHex, parseAbi } from "viem"

const results: [string, boolean][] = []
const check = (id: string, title: string, expected: string, actual: string, reproduced: boolean) => {
  results.push([`#${id} ${title}`, reproduced])
  console.log(`\n#${id} ${title}\n  expected: ${expected}\n  actual:   ${actual}\n  → ${reproduced ? "REPRODUCED" : "not reproduced (fixed?)"}`)
}

await run(async (m) => {
  const all = await m.client.listPerpMarkets(); const eth = all.find((x: any) => x.baseSymbol === "ETH"); const pool = eth.poolAddress
  const [tick, minQ, lot] = await pub.readContract({ address: pool, abi: ABI, functionName: "getOrderBookParameters" }) as any
  const price = (BigInt(eth.markPrice) * 70n / 100n) / tick * tick

  // #01
  const el = await m.client.getPerpVoucherEligibility(eth.marginBank, account.address)
  let claim = "claim succeeded", data: string | undefined
  try { await m.trader.claimPerpVoucher({ marginBank: eth.marginBank }) } catch (e: any) {
    let c = e; while (c) { if (typeof c.data === "string") data = c.data; c = c.cause }
    claim = `claim reverts ${data}${data === keccak256(toHex("SelfClaimDisabled()")).slice(0, 10) ? " = SelfClaimDisabled()" : ""}, SDK says "${String(e.shortMessage ?? e.message).split("\n")[0]}"`
  }
  check("01", "claimPerpVoucher vs getPerpVoucherEligibility",
    "eligible: true → claim credits 1,000 USDso (or eligible: false with a reason)",
    `eligible: ${el.eligible}; ${claim}`, el.eligible === true && data !== undefined)

  // #02
  const r = await send({ pool, isBid: true, price, quantity: minQ * 2n })
  if (!r.sent) throw new Error(`could not place the test order: ${j(r)}`)
  const id = BigInt(r.orderId)
  const reduce = async (q: bigint) => { try { await pub.simulateContract({ address: pool, abi: ABI, functionName: "reduceOrderFor", args: [OWNER, id, q], account, gas: 10_000_000n }); return "OK" } catch (e: any) { return errName(e) } }
  const up = await reduce(minQ * 2n + lot), offLot = await reduce(minQ + 1n)
  await cancel(pool, id)
  check("02", "reduceOrderFor to a larger quantity",
    `a distinct error, or InvalidQuantity(q, lotSize=${lot}) as documented`,
    `${up} (2nd arg = current quantity ${minQ * 2n}); off-lot reduce for comparison: ${offLot}`, up.startsWith("InvalidQuantity") && !up.endsWith(`,${lot})`))

  // #03
  const auth = async (s: string) => pub.readContract({ address: pool, abi: ABI, functionName: "isOperatorAuthorized", args: [OWNER, account.address, s as `0x${string}`] })
  const [batchAuth, singleAuth] = [await auth("0xb5e6cdfd"), await auth("0x80054449")]
  const B = parseAbi(["function placeOrdersFor(address owner, (bool isBid,uint64 userData,uint256 price,uint256 quantity,uint64 expireTimestampNs,uint8 orderType,uint8 selfMatchingOption,address builder,uint96 builderFeeBpsTimes1k)[] reqs) payable returns (bool[] successes, uint128[] orderIds)"])
  let batch: string
  try { const s = await pub.simulateContract({ address: pool, abi: B, functionName: "placeOrdersFor", args: [OWNER, [{ isBid: true, userData: 0n, price, quantity: minQ, expireTimestampNs: farNs(), orderType: 0, selfMatchingOption: 0, builder: "0x0000000000000000000000000000000000000000", builderFeeBpsTimes1k: 0n }]], account, gas: 10_000_000n }); batch = `succeeds (${j(s.result[0])})` } catch (e: any) { batch = `reverts ${errName(e)}` }
  check("03", "isOperatorAuthorized for batch selectors",
    "isOperatorAuthorized(placeOrdersFor) matches whether the batch call works",
    `isOperatorAuthorized: placeOrdersFor=${batchAuth}, placeOrderFor=${singleAuth}; placeOrdersFor simulation ${batch}`, batchAuth === false && batch.startsWith("succeeds"))

  const left = (await m.client.getOwnOpenOrdersOnchain(pool, OWNER)).map(String).filter((x: string) => x === String(id))
  console.log(`\n(test order ${left.length ? "STILL OPEN: " + id : "cancelled"})`)
}, true, 300000)

// #04 runs in a child process: it is about the process not exiting.
const t0 = Date.now()
const child = spawnSync("npx", ["tsx", new URL("../exit2.ts", import.meta.url).pathname, "none"], { encoding: "utf8", timeout: 30_000 })
const hung = /STILL ALIVE/.test(child.stdout ?? "")
check("04", "Node process after a chain read, without markets.close()",
  "the script exits once its work is done",
  hung ? `still running 20 s after the read (stopped by a watchdog after ${Math.round((Date.now() - t0) / 1000)} s)` : "exited normally", hung)

console.log(`\n${results.filter(r => r[1]).length}/${results.length} reproduced`)
process.exit(0)
