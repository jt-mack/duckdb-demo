// Curated demo queries that showcase the power of DuckDB.
// Each demo highlights a specific capability and reads directly
// from the local CSV/JSON files in `files/`.

export const demos = [
  {
    id: "auto-csv",
    title: "1. Zero-config CSV ingestion",
    pitch:
      "Point DuckDB at a CSV and it auto-detects the schema, types, delimiter, and header — no DDL required.",
    feature: "read_csv_auto + DESCRIBE",
    sql: `DESCRIBE
SELECT *
FROM read_csv_auto('files/csv/random.csv');`,
  },
  {
    id: "summarize",
    title: "2. SUMMARIZE: instant profile of any dataset",
    pitch:
      "DuckDB's SUMMARIZE produces min/max/avg/std/null counts/approx unique for every column in one statement.",
    feature: "SUMMARIZE",
    sql: `SUMMARIZE
SELECT *
FROM read_csv_auto('files/csv/top_nba_offensive_seasons_2005_2024.csv');`,
  },
  {
    id: "json-read",
    title: "3. Query JSON files like SQL tables",
    pitch:
      "read_json_auto turns nested JSON into a relational table on the fly — no ETL needed.",
    feature: "read_json_auto",
    sql: `SELECT name, years, rushing_yards, rushing_touchdowns,
       yards_per_attempt
FROM read_json_auto('files/json/uga_running_backs_standardized.json')
ORDER BY rushing_yards DESC;`,
  },
  {
    id: "window-rank",
    title: "4. Window functions: rank top scoring seasons per team",
    pitch:
      "Window functions compute rankings, running totals, and moving averages with no temp tables.",
    feature: "QUALIFY + window functions",
    sql: `SELECT Team,
       Player,
       Season,
       PointsPerGame,
       RANK() OVER (PARTITION BY Team ORDER BY PointsPerGame DESC) AS team_rank
FROM read_csv_auto('files/csv/top_nba_offensive_seasons_2005_2024.csv')
QUALIFY team_rank = 1
ORDER BY PointsPerGame DESC;`,
  },
  {
    id: "ad-aggregation",
    title: "5. Real analytics: ad campaign performance",
    pitch:
      "Aggregate 340+ rows of ad-server data with computed CTR and CPM — all from raw CSV.",
    feature: "GROUP BY + computed metrics",
    sql: `SELECT "Ad Format" AS ad_format,
       SUM(Impressions)                                    AS impressions,
       SUM(Clicks)                                         AS clicks,
       ROUND(100.0 * SUM(Clicks) / NULLIF(SUM(Impressions), 0), 3) AS ctr_pct,
       ROUND(SUM("Advertiser Cost (USD)"), 2)             AS spend_usd,
       ROUND(1000.0 * SUM("Advertiser Cost (USD)")
             / NULLIF(SUM(Impressions), 0), 2)            AS cpm_usd
FROM read_csv_auto('files/csv/random.csv')
GROUP BY ad_format
ORDER BY impressions DESC;`,
  },
  {
    id: "pivot",
    title: "6. PIVOT: reshape data with one keyword",
    pitch:
      "DuckDB's PIVOT statement transposes rows into columns without a giant CASE expression.",
    feature: "PIVOT",
    sql: `PIVOT (
  SELECT "Ad Format"  AS ad_format,
         strftime("Date", '%Y-%m') AS month,
         Impressions
  FROM read_csv_auto('files/csv/random.csv')
)
ON month
USING SUM(Impressions)
GROUP BY ad_format
ORDER BY ad_format;`,
  },
  {
    id: "directory-stats",
    title: "7. Geographic breakdown of contacts",
    pitch:
      "Mix string functions, COUNT_IF and array_agg to profile a contact list in seconds.",
    feature: "COUNT_IF + LIST aggregates",
    sql: `SELECT state,
       COUNT(*) AS contacts,
       COUNT(DISTINCT companyName) AS companies,
       COUNT_IF(jobTitle ILIKE '%manager%') AS managers,
       LIST(DISTINCT city ORDER BY city)[1:5] AS sample_cities
FROM read_csv_auto('files/csv/mmm_mock_upload.csv')
GROUP BY state
ORDER BY contacts DESC, state
LIMIT 10;`,
  },
  {
    id: "cross-file-join",
    title: "8. Join across heterogeneous files (CSV + JSON)",
    pitch:
      "DuckDB can JOIN a CSV and a JSON file in a single SELECT — no loading step required.",
    feature: "Cross-format JOIN",
    sql: `WITH nba AS (
  SELECT Player,
         PointsPerGame,
         AssistsPerGame,
         ReboundsPerGame
  FROM read_csv_auto('files/csv/top_nba_offensive_seasons_2005_2024.csv')
), uga AS (
  SELECT name,
         rushing_yards,
         rushing_touchdowns
  FROM read_json_auto('files/json/uga_running_backs_standardized.json')
)
SELECT 'NBA'  AS sport, Player AS athlete,
       PointsPerGame::DOUBLE AS primary_stat, 'PPG' AS stat_label
FROM nba
UNION ALL
SELECT 'UGA-FB', name,
       rushing_yards::DOUBLE, 'rushing yards'
FROM uga
ORDER BY primary_stat DESC
LIMIT 15;`,
  },
  {
    id: "regex",
    title: "9. Regex + string mining inside SQL",
    pitch:
      "DuckDB has first-class regex, list, and string functions — perfect for messy real-world data.",
    feature: "regexp_extract + string functions",
    sql: `SELECT regexp_extract(email, '@(.+)\\.', 1) AS email_domain,
       COUNT(*)                              AS contacts,
       LIST(firstName || ' ' || lastName ORDER BY lastName)[1:3] AS sample
FROM read_csv_auto('files/csv/mmm_mock_upload.csv')
GROUP BY email_domain
ORDER BY contacts DESC, email_domain
LIMIT 12;`,
  },
  {
    id: "explain",
    title: "10. EXPLAIN ANALYZE: see DuckDB's vectorized plan",
    pitch:
      "DuckDB exposes its query plan and runtime stats so you can see WHY it's fast.",
    feature: "EXPLAIN ANALYZE",
    sql: `EXPLAIN ANALYZE
SELECT Team,
       AVG(PointsPerGame) AS avg_ppg,
       AVG(TrueShootingPct) AS avg_ts
FROM read_csv_auto('files/csv/top_nba_offensive_seasons_2005_2024.csv')
GROUP BY Team
ORDER BY avg_ppg DESC;`,
  },
  {
    id: "glob",
    title: "11. Glob multiple files into one virtual table",
    pitch:
      "Pass a glob pattern and DuckDB unions matching files automatically — schemas can even differ.",
    feature: "Globbing + union_by_name",
    sql: `SELECT filename,
       COUNT(*) AS rows
FROM read_csv_auto('files/csv/*.csv',
                   union_by_name = true,
                   filename = true)
GROUP BY filename
ORDER BY rows DESC;`,
  },
];

export function getDemoById(id) {
  return demos.find((d) => d.id === id);
}
