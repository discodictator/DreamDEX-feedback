setTimeout(()=>{console.log("STILL ALIVE after 20s");process.exit(3)},20000).unref()
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
const m:any = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql", addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES })
const p:any[] = await m.client.listPerpMarkets()
await m.client.getPerpSystemConfig(p[0].marginBank)
const mode = process.argv[2]
console.log("has m.close:", typeof m.close, "has m.client.close:", typeof m.client.close, "has dispose:", typeof m[Symbol.asyncDispose])
if (mode==="client") m.client.close()
if (mode==="markets") await m.close?.()
console.log("done, mode", mode)
