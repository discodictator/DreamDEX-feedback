// Reproduces #05 and #06. Read-only: no key, nothing is sent.
import { createPublicClient, http, keccak256, toHex } from "viem"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import { run } from "../lib.js"

const pub = createPublicClient({ chain: hidekiTestnet, transport: http() })
const results: [string, boolean][] = []
const check = (id: string, title: string, expected: string, actual: string, reproduced: boolean) => {
  results.push([`#${id} ${title}`, reproduced])
  console.log(`\n#${id} ${title}\n  expected: ${expected}\n  actual:   ${actual}\n  → ${reproduced ? "REPRODUCED" : "not reproduced (fixed?)"}`)
}

// #05: the registry's grant events, against every event ABI the SDK exports.
{
  const sdk: any = await import("@somnia-chain/markets-sdk")
  const REGISTRY = "0x6b2fbfed328ff5f20c0be7d3c3437613affe8d3a"
  const known = new Set(Object.values(sdk).filter(Array.isArray).flatMap((abi: any) => abi.filter((x: any) => x?.type === "event").map((e: any) => keccak256(toHex(`${e.name}(${e.inputs.map((i: any) => i.type).join(",")})`)))))
  const head = await pub.getBlockNumber(), shapes = new Map<string, { n: number, topics: number, dataBytes: number, block: bigint }>()
  for (let to = head, k = 0; k < 200; k++, to -= 1000n) {
    for (const l of await pub.getLogs({ address: REGISTRY, fromBlock: to - 999n, toBlock: to } as any) as any[]) {
      const cur = shapes.get(l.topics[0])
      shapes.set(l.topics[0], { n: (cur?.n ?? 0) + 1, topics: l.topics.length, dataBytes: (l.data.length - 2) / 2, block: cur && cur.block > l.blockNumber ? cur.block : l.blockNumber })
    }
  }
  const list = [...shapes].map(([t, x]) => `${t.slice(0, 10)}… ${x.n} logs, ${x.topics} topics + ${x.dataBytes} data bytes, latest block ${x.block}, in SDK: ${known.has(t)}`)
  check("05", "Operator registry grant events in the SDK",
    "the SDK exports the registry's address and an ABI for its grant events",
    `registry in SOMNIA_HIDEKI_TESTNET_ADDRESSES: ${Object.values(sdk.SOMNIA_HIDEKI_TESTNET_ADDRESSES).some((a: any) => String(a).toLowerCase() === REGISTRY)}; last ~200k blocks: ${list.join("; ")}`,
    shapes.size > 0 && [...shapes.keys()].every(t => !known.has(t)))
}

// #06: one page of position changes, deep into a 30-day window.
await run(async (m) => {
  const to = Math.floor(Date.now() / 1000) - 3600, KINDS = ["OPEN", "INCREASE", "REDUCE", "CLOSE", "FLIP"]
  const page = async (days: number, offset: number) => {
    const t0 = Date.now()
    try { const r = await m.client.listPerpPositionChanges({ from: to - days * 86400, to, kinds: KINDS, order: "asc", limit: 1000, offset }); return { ok: true, text: `${r.length} rows in ${((Date.now() - t0) / 1000).toFixed(1)} s` } }
    catch (e: any) { return { ok: false, text: `"${String(e?.message ?? e).slice(0, 90)}" after ${((Date.now() - t0) / 1000).toFixed(1)} s` } }
  }
  const a = await page(30, 0), b = await page(30, 10_000), c = await page(7, 10_000)
  check("06", "listPerpPositionChanges deep in a 30-day window",
    "offset 10,000 returns a page (the documented range is 0 to 2,147,483,647), or a clear limit error",
    `30 days offset 0: ${a.text}; 30 days offset 10,000: ${b.text}; 7 days offset 10,000: ${c.text}`, a.ok && !b.ok)
}, false, 300000)


console.log(`\n${results.filter(r => r[1]).length}/${results.length} reproduced`)
process.exit(0)
