# DuckDB Node.js (Neo) — Live Demo

An interactive web app that showcases the power of [DuckDB](https://duckdb.org)
via the official [`@duckdb/node-api`](https://duckdb.org/docs/current/clients/node_neo/overview)
client.

It runs SQL **directly against the raw CSV and JSON files in `files/`** — no
import step, no schema definition, no separate database server.

## What it demonstrates

- **Zero-config ingestion** — `read_csv_auto` and `read_json_auto` discover
  schema, types, delimiter, and headers automatically.
- **Heterogeneous SQL** — JOIN a CSV against a JSON file in the same query.
- **Analytical SQL** — window functions, `QUALIFY`, `PIVOT`, `SUMMARIZE`,
  regex, list aggregates, and `EXPLAIN ANALYZE`.
- **Globbing** — point at `files/csv/*.csv` and DuckDB unions matching
  files into one virtual table.
- **Speed** — every demo runs in single-digit milliseconds end to end.

The frontend exposes 11 curated demos plus a free-form SQL playground.

## Sample data

| File                                                    | Description                                |
| ------------------------------------------------------- | ------------------------------------------ |
| `files/csv/mmm_mock_upload.csv`                         | Mock contact directory (224 rows)          |
| `files/csv/random.csv`                                  | Ad-server campaign performance (344 rows)  |
| `files/csv/top_nba_offensive_seasons_2005_2024.csv`     | Top NBA offensive seasons 2005–2024         |
| `files/json/uga_running_backs_standardized.json`        | UGA running back stats (nested JSON)       |

## Run it

```bash
npm install
npm start
```

Then open <http://localhost:3000>.

> Requires Node.js 20+. The first install pulls the prebuilt DuckDB
> binary for your platform automatically.

## Optional smoke test

Runs every curated demo SQL against a fresh DuckDB instance and prints
`ok` / `FAIL` per demo:

```bash
node scripts/smoke.js
```

## Project layout

```
.
├── server.js         Express + DuckDB API server
├── demos.js          Curated demo queries (titles, pitches, SQL)
├── public/
│   ├── index.html    Single-page frontend
│   ├── styles.css
│   └── app.js
├── scripts/
│   └── smoke.js      Validates every demo SQL against the local files
└── files/            Sample CSV + JSON data (read directly by DuckDB)
```

## How it works

`server.js` boots a single in-memory `DuckDBInstance` at startup and opens a
fresh connection per HTTP request. User SQL is run via
`connection.streamAndReadUntil(sql, 5000)` — this streams results lazily
and caps any single response at 5,000 rows so a runaway query can't blow
memory. Column types are returned alongside the data so the UI can right-
align numerics and label every column with its DuckDB type.

The demos hit the local files via DuckDB's table functions
(`read_csv_auto`, `read_json_auto`), so there is no ETL step — everything
in `files/` is queryable as soon as the server starts.
