import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { DuckDBInstance, version as duckdbVersion } from "@duckdb/node-api";

import { demos, getDemoById } from "./demos.js";

// Resolve project root and force process CWD there so all relative
// `read_csv_auto('files/...')` paths inside the demo SQL just work.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(__dirname);

const PORT = process.env.PORT || 3000;
const MAX_RESULT_ROWS = 5000;

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// One in-memory DuckDB instance for the whole server. Connections are
// cheap; we open a fresh one per request to avoid cross-talk.
const instance = await DuckDBInstance.create(":memory:");
console.log(`DuckDB ${duckdbVersion()} ready (in-memory)`);

async function withConnection(fn) {
  const conn = await instance.connect();
  try {
    return await fn(conn);
  } finally {
    conn.disconnectSync();
  }
}

// Run arbitrary SQL with a row cap and timing info. Returns a structured
// result that the frontend can render generically.
async function runSql(sql, { rowCap = MAX_RESULT_ROWS } = {}) {
  return withConnection(async (conn) => {
    const t0 = performance.now();
    const reader = await conn.streamAndReadUntil(sql, rowCap);
    const elapsedMs = performance.now() - t0;

    const columnNames = reader.columnNames();
    const columnTypes = reader.columnTypes().map((t) => t.toString());
    const rows = reader.getRowsJson();
    const truncated = !reader.done;

    return {
      columnNames,
      columnTypes,
      rows,
      rowCount: rows.length,
      truncated,
      elapsedMs: Number(elapsedMs.toFixed(2)),
    };
  });
}

// ----- API -----

app.get("/api/info", (_req, res) => {
  res.json({
    duckdbVersion: duckdbVersion(),
    nodeVersion: process.version,
    rowCap: MAX_RESULT_ROWS,
  });
});

// List sample files plus DuckDB's auto-detected schema for each one.
app.get("/api/datasets", async (_req, res) => {
  const sources = [
    {
      id: "contacts",
      label: "Contact directory (CSV)",
      file: "files/csv/mmm_mock_upload.csv",
      reader: `read_csv_auto('files/csv/mmm_mock_upload.csv')`,
    },
    {
      id: "ads",
      label: "Ad campaign performance (CSV)",
      file: "files/csv/random.csv",
      reader: `read_csv_auto('files/csv/random.csv')`,
    },
    {
      id: "nba",
      label: "Top NBA offensive seasons 2005–2024 (CSV)",
      file: "files/csv/top_nba_offensive_seasons_2005_2024.csv",
      reader: `read_csv_auto('files/csv/top_nba_offensive_seasons_2005_2024.csv')`,
    },
    {
      id: "uga-rbs",
      label: "UGA running backs (JSON)",
      file: "files/json/uga_running_backs_standardized.json",
      reader: `read_json_auto('files/json/uga_running_backs_standardized.json')`,
    },
  ];

  try {
    const out = [];
    for (const s of sources) {
      const schema = await runSql(`DESCRIBE FROM ${s.reader}`);
      const count = await runSql(`SELECT COUNT(*) AS n FROM ${s.reader}`);
      out.push({
        ...s,
        rowCount: Number(count.rows[0]?.[0] ?? 0),
        schema: schema.rows.map((r) => ({
          column: r[0],
          type: r[1],
          nullable: r[2],
        })),
      });
    }
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: String(err?.message ?? err) });
  }
});

app.get("/api/demos", (_req, res) => {
  res.json(
    demos.map(({ id, title, pitch, feature, sql }) => ({
      id,
      title,
      pitch,
      feature,
      sql,
    }))
  );
});

app.get("/api/demos/:id", (req, res) => {
  const demo = getDemoById(req.params.id);
  if (!demo) return res.status(404).json({ error: "Unknown demo id" });
  res.json(demo);
});

app.post("/api/query", async (req, res) => {
  const sql = (req.body?.sql ?? "").trim();
  if (!sql) return res.status(400).json({ error: "Missing 'sql' in body" });
  try {
    const result = await runSql(sql);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: String(err?.message ?? err) });
  }
});

app.listen(PORT, () => {
  console.log(`DuckDB demo running at http://localhost:${PORT}`);
});
