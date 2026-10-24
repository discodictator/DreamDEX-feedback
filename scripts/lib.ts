import "./env.js"
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
export const j = (x: any) => JSON.stringify(x, (_k, v) => typeof v === "bigint" ? v.toString() : v)
const t0 = Date.now()
export const log = (...a: any[]) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a.map(x => typeof x === "string" ? x : j(x)))
export function connect(withKey = true) {
  return new SomniaMarkets({
    chain: hidekiTestnet,
    indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql",
    addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES,
    ...(withKey ? { privateKey: process.env.PRIVATE_KEY as `0x${string}` } : {}),
  }) as any
}
export async function run(fn: (m: any) => Promise<void>, withKey = true, limitMs = 120000) {
  const wd = setTimeout(() => { console.log("WATCHDOG timeout"); process.exit(3) }, limitMs); wd.unref()
  const m = connect(withKey)
  try { await fn(m) } catch (e: any) { console.log("ERROR", e?.name, e?.shortMessage ?? e?.message, e?.cause?.name ?? "", e?.data ?? "") }
  finally { await m.close?.() }
}
export async function tryIt(label: string, f: () => Promise<any>) {
  try { const r = await f(); log("OK  ", label, r); return r }
  catch (e: any) { log("FAIL", label, e?.name ?? "", (e?.shortMessage ?? e?.message ?? String(e)).slice(0, 400)); return e }
}
