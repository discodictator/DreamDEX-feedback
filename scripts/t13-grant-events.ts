// Which events the operator registry emits when a wallet links a bot, and whether the SDK can decode them.
import { createPublicClient, http, keccak256, toHex } from "viem"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import * as sdk from "@somnia-chain/markets-sdk"
import { log } from "./lib.js"

const pub = createPublicClient({ chain: hidekiTestnet, transport: http() })
const REGISTRY = "0x6b2fbfed328ff5f20c0be7d3c3437613affe8d3a"
const V1 = "0x864aeacea3f88f107e4cf7af3c1ed2cd5b36980bf45a469c6b90f888a6368952"
const V2 = "0x10f879368ceb20c35c69315bc27ed8488f731570cf213d3e1bc2ad9b7749de28"

// 1. Does any ABI the SDK exports contain an event with either topic?
const abis = Object.entries(sdk).filter(([, v]) => Array.isArray(v) && (v as any[]).some(x => x?.type === "event"))
const events = abis.flatMap(([name, abi]) => (abi as any[]).filter(x => x.type === "event").map(e => ({ abi: name, sig: `${e.name}(${e.inputs.map((i: any) => i.type).join(",")})` })))
const topics = new Set(events.map(e => keccak256(toHex(e.sig))))
log("SDK ABIs with events", abis.map(([n]) => n), "events", events.length, "V1 known", topics.has(V1), "V2 known", topics.has(V2))
log("registry in SDK addresses", Object.entries((sdk as any).SOMNIA_HIDEKI_TESTNET_ADDRESSES).filter(([, a]) => String(a).toLowerCase() === REGISTRY))

// 2. The node's getLogs range limit.
const head = await pub.getBlockNumber()
for (const span of [1000n, 1001n]) {
  try { await pub.getLogs({ address: REGISTRY, fromBlock: head - span + 1n, toBlock: head }); log(`getLogs over ${span} blocks: ok`) }
  catch (e: any) { log(`getLogs over ${span} blocks: refused`, (e?.details ?? e?.shortMessage ?? "").slice(0, 160)) }
}

// 3. Latest grant of each kind, scanning back in 1000-block windows (about 100 s each).
const latest: Record<string, bigint | null> = { V1: null, V2: null }
let counts = { V1: 0, V2: 0 }
for (let to = head, k = 0; k < 400 && (latest.V1 === null || latest.V2 === null); k++, to -= 1000n) {
  const logs = await pub.getLogs({ address: REGISTRY, fromBlock: to - 999n, toBlock: to } as any) as any[]
  for (const l of logs) {
    const t = l.topics[0]
    const key = t === V1 ? "V1" : t === V2 ? "V2" : null
    if (!key) continue
    counts[key as "V1" | "V2"]++
    if (latest[key] === null || l.blockNumber > latest[key]!) latest[key] = l.blockNumber
  }
}
const at = async (b: bigint | null) => b === null ? null : new Date(Number((await pub.getBlock({ blockNumber: b })).timestamp) * (String((await pub.getBlock({ blockNumber: b })).timestamp).length > 11 ? 1 : 1000)).toISOString()
log("head", head, "latest V1", latest.V1, await at(latest.V1), "latest V2", latest.V2, await at(latest.V2), "seen", counts)
process.exit(0)
