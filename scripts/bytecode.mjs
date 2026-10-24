import { createPublicClient, http, keccak256, toHex, toFunctionSelector } from "viem"
const c = createPublicClient({ transport: http("https://api.hideki2.infra.testnet.somnia.network") })
const addr = process.argv[2]
const code = await c.getCode({ address: addr })
console.log("code bytes", (code.length-2)/2)
// collect PUSH4 immediates
const b = Buffer.from(code.slice(2), "hex"); const push4 = new Set()
for (let i=0;i<b.length;i++){ const op=b[i]; if (op===0x63) push4.add("0x"+b.slice(i+1,i+5).toString("hex")); if (op>=0x60&&op<=0x7f) i+=op-0x5f }
console.log("PUSH4 count", push4.size)
const known = new Map()
const add = (abi) => { for (const e of abi) if (e.type==="function"||e.type==="error") { const sig = `${e.name}(${(e.inputs??[]).map(i=>i.type).join(",")})`; known.set(keccak256(toHex(sig)).slice(0,10), e.type+" "+sig) } }
const mods = ["readsAbi","tradeAbi","contractErrorsAbi","systemAbi","machineryAbi","operatorAbi","actionsAbi","moduleAbi"]
for (const mname of mods) { const mod = await import(`./node_modules/@somnia-chain/markets-sdk/dist/${mname}.js`); for (const v of Object.values(mod)) { if (Array.isArray(v)) add(v); else if (v && typeof v==="object") for (const w of Object.values(v)) if (Array.isArray(w)) add(w) } }
for (const s of [...push4].sort()) console.log(s, known.get(s) ?? "?")
