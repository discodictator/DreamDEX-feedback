// How long the indexer takes to page position changes by offset, at growing offsets, for one busy day.
import { run, log } from "./lib.js"

const LIMIT = 1000, KINDS = ["OPEN", "INCREASE", "REDUCE", "CLOSE", "FLIP"]
await run(async (m) => {
  const to = Math.floor(Date.now() / 1000) - 3600, from = to - Number(process.env.DAYS ?? 30) * 86400
  for (const offset of [0, 10_000, 30_000, 60_000, 100_000]) {
    const t0 = Date.now()
    try {
      const rows = await Promise.race([
        m.client.listPerpPositionChanges({ from, to, kinds: KINDS, order: "asc", limit: LIMIT, offset }),
        new Promise((_, no) => setTimeout(() => no(new Error("no answer in 90 s")), 90_000)),
      ]) as any[]
      log(`offset ${offset}: ${rows.length} rows in ${Date.now() - t0} ms`)
      if (!rows.length) break
    } catch (e: any) { log(`offset ${offset}: failed after ${Date.now() - t0} ms`, (e?.message ?? String(e)).slice(0, 200)) }
  }
}, false, 900_000)
process.exit(0)
