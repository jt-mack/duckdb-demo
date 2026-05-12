// Quick smoke test that runs every demo SQL against a fresh DuckDB
// instance. Used during development; not required for the demo itself.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DuckDBInstance, version } from "@duckdb/node-api";

import { demos } from "../demos.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(__dirname, ".."));

console.log(`DuckDB ${version()}`);

const instance = await DuckDBInstance.create(":memory:");
const conn = await instance.connect();

let failures = 0;
for (const d of demos) {
  process.stdout.write(`• ${d.id} … `);
  try {
    const reader = await conn.streamAndReadUntil(d.sql, 50);
    console.log(`ok (${reader.currentRowCount} rows read)`);
  } catch (err) {
    failures++;
    console.log(`FAIL: ${err.message ?? err}`);
  }
}

conn.disconnectSync();
process.exit(failures ? 1 : 0);
