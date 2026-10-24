import { createPublicClient, http } from "viem"
import * as R from "../node_modules/@somnia-chain/markets-sdk/dist/readsAbi.js"
const abis = Object.values(R).flatMap(v => Array.isArray(v) ? [v] : (v && typeof v === "object" ? Object.values(v).filter(Array.isArray) : []))
const vabi = abis.find(a => a.some(e => e.name === "getConfig") && a.some(e => e.name === "isClaimed"))
for (const e of vabi) if (e.type === "function") console.log("fn", e.name, "->", JSON.stringify((e.outputs ?? []).map(o => o.components ? o.components.map(c => `${c.type} ${c.name}`) : `${o.type} ${o.name}`)))
const c = createPublicClient({ transport: http("https://api.hideki2.infra.testnet.somnia.network") })
const A = "0x2ACD9EFdA721450906bfE1bef3edE269636E42C4"
console.log("getConfig", JSON.stringify(await c.readContract({ address: A, abi: vabi, functionName: "getConfig" }), (k, v) => typeof v === "bigint" ? v.toString() : v))
const st = await c.readContract({ address: A, abi: vabi, functionName: "getAccountState", args: ["0x424587Af5a6102aA8469554a71A97d6d0331BcB5"] }).catch(e => "ERR " + e.shortMessage)
console.log("getAccountState", JSON.stringify(st, (k, v) => typeof v === "bigint" ? v.toString() : v))
const raw = await c.getStorageAt({ address: A, slot: "0xb7eec95aff28cce8bff19b18abdccf660b86b19d20d482db65d20a29a05aa807" })
console.log("slot+7 raw", raw)
