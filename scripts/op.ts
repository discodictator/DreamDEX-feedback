import "./env.js"
import { contractErrorsAbi, decodePlaceOrder } from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import { createPublicClient, createWalletClient, http, parseAbi, decodeErrorResult } from "viem"
import { privateKeyToAccount } from "viem/accounts"
export const OWNER = process.env.OWNER_ADDRESS as `0x${string}`
export const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`)
const transport = http("https://api.hideki2.infra.testnet.somnia.network")
export const pub = createPublicClient({ chain: hidekiTestnet, transport })
export const wal = createWalletClient({ account, chain: hidekiTestnet, transport })
export const ABI = [...parseAbi([
  "function placeOrderFor(address owner, bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k) payable returns (bool success, uint128 orderId)",
  "function cancelOrderFor(address owner, uint128 orderId)",
  "function reduceOrderFor(address owner, uint128 orderId, uint256 newQuantityRemaining)",
  "function isOperatorAuthorized(address owner, address operator, bytes4 selector) view returns (bool)",
  "function getOrderBookParameters() view returns (uint256 tickSize, uint256 minQuantity, uint256 lotSize)",
]), ...contractErrorsAbi] as const
export const farNs = () => BigInt(Math.floor(Date.now() / 1000) + 50 * 365 * 86400) * 1_000_000_000n
export type P = { pool: `0x${string}`, isBid: boolean, price: bigint, quantity: bigint, orderType?: number, expire?: bigint, gas?: bigint, self?: number }
const argsOf = (p: P) => [OWNER, p.isBid, 0n, p.price, p.quantity, p.expire ?? farNs(), p.orderType ?? 0, p.self ?? 0, "0x0000000000000000000000000000000000000000", 0n] as const
export function errName(e: any): string {
  let c = e; while (c) { if (c.data?.errorName) return `${c.data.errorName}(${(c.data.args ?? []).map(String).join(",")})`; if (typeof c.data === "string" && c.data.startsWith("0x")) { try { const d = decodeErrorResult({ abi: contractErrorsAbi as any, data: c.data }); return `${d.errorName}(${(d.args ?? []).map(String).join(",")})` } catch { return "raw " + c.data } } c = c.cause }
  return (e.shortMessage ?? e.message ?? String(e)).slice(0, 200)
}
export async function sim(p: P, fn: "placeOrderFor" = "placeOrderFor") {
  try { const r = await pub.simulateContract({ address: p.pool, abi: ABI, functionName: fn, args: argsOf(p) as any, account, gas: p.gas ?? 10_000_000n }); return { ok: true, result: r.result } }
  catch (e: any) { return { ok: false, error: errName(e) } }
}
export async function send(p: P) {
  const s = await sim(p); if (!s.ok) return { sent: false, ...s }
  const hash = await wal.writeContract({ address: p.pool, abi: ABI, functionName: "placeOrderFor", args: argsOf(p) as any, gas: p.gas ?? 10_000_000n })
  const receipt = await pub.waitForTransactionReceipt({ hash })
  let dec: any = {}; try { dec = decodePlaceOrder(receipt as any, p.pool) } catch (e: any) { dec = { decodeError: e.message } }
  return { sent: true, hash, status: receipt.status, gasUsed: receipt.gasUsed, orderId: dec.orderId, fills: dec.fills?.length }
}
export async function cancel(pool: `0x${string}`, orderId: bigint, dry = false) {
  try { const r = await pub.simulateContract({ address: pool, abi: ABI, functionName: "cancelOrderFor", args: [OWNER, orderId], account, gas: 10_000_000n }); if (dry) return { ok: true }
    const hash = await wal.writeContract(r.request as any); const rc = await pub.waitForTransactionReceipt({ hash }); return { ok: true, hash, status: rc.status, gasUsed: rc.gasUsed } }
  catch (e: any) { return { ok: false, error: errName(e) } }
}
