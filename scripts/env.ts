import fs from "fs"
for (const l of fs.readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) { const m = l.match(/^(\w+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2] }
