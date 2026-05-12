const els = {
  datasets: document.getElementById("datasets"),
  demos: document.getElementById("demos"),
  sql: document.getElementById("sql"),
  status: document.getElementById("status"),
  results: document.getElementById("results"),
  activeDemo: document.getElementById("active-demo"),
  btnRun: document.getElementById("btn-run"),
  btnClear: document.getElementById("btn-clear"),
  badgeDuck: document.getElementById("badge-duck"),
  badgeNode: document.getElementById("badge-node"),
  badgeCap: document.getElementById("badge-cap"),
};

let activeDemoId = null;
let isNumericType = (t) =>
  /int|decimal|double|float|hugeint|numeric|real/i.test(t);

async function loadInfo() {
  const r = await fetch("/api/info").then((r) => r.json());
  els.badgeDuck.textContent = `DuckDB ${r.duckdbVersion}`;
  els.badgeNode.textContent = `Node ${r.nodeVersion}`;
  els.badgeCap.textContent = `Row cap ${r.rowCap.toLocaleString()}`;
}

async function loadDatasets() {
  const data = await fetch("/api/datasets").then((r) => r.json());
  if (data.error) {
    els.datasets.innerHTML = `<div class="status err">Failed to load datasets: ${escapeHtml(
      data.error
    )}</div>`;
    return;
  }
  els.datasets.innerHTML = data
    .map(
      (d) => `
      <div class="dataset">
        <h3>${escapeHtml(d.label)}</h3>
        <div class="file mono">${escapeHtml(d.file)}</div>
        <div class="stat">${d.rowCount.toLocaleString()} rows • ${
          d.schema.length
        } columns</div>
        <details>
          <summary>Auto-detected schema</summary>
          <table class="schema">
            <tbody>
              ${d.schema
                .map(
                  (c) => `
                <tr>
                  <td>${escapeHtml(c.column)}</td>
                  <td>${escapeHtml(c.type)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </details>
      </div>
    `
    )
    .join("");
}

async function loadDemos() {
  const demos = await fetch("/api/demos").then((r) => r.json());
  els.demos.innerHTML = demos
    .map(
      (d) => `
      <div class="demo" data-id="${d.id}">
        <h3>${escapeHtml(d.title)}</h3>
        <p class="pitch">${escapeHtml(d.pitch)}</p>
        <span class="feature">${escapeHtml(d.feature)}</span>
      </div>
    `
    )
    .join("");

  els.demos.querySelectorAll(".demo").forEach((card) => {
    card.addEventListener("click", () => {
      const d = demos.find((x) => x.id === card.dataset.id);
      if (!d) return;
      setActiveDemo(d);
      runQuery();
    });
  });
}

function setActiveDemo(d) {
  activeDemoId = d.id;
  els.sql.value = d.sql;
  els.activeDemo.textContent = `${d.title} — ${d.feature}`;
  els.demos.querySelectorAll(".demo").forEach((el) => {
    el.classList.toggle("active", el.dataset.id === d.id);
  });
}

async function runQuery() {
  const sql = els.sql.value.trim();
  if (!sql) {
    setStatus("Enter some SQL first.", "err");
    return;
  }
  els.btnRun.disabled = true;
  setStatus("Running…");
  els.results.innerHTML = `<div class="muted">Running…</div>`;
  try {
    const res = await fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
    renderResult(data);
    setStatus(
      `${data.rowCount.toLocaleString()} row${
        data.rowCount === 1 ? "" : "s"
      }${data.truncated ? " (truncated)" : ""} • ${data.elapsedMs} ms`,
      "ok"
    );
  } catch (e) {
    els.results.innerHTML = `<div class="muted">No results.</div>`;
    setStatus(String(e.message ?? e), "err");
  } finally {
    els.btnRun.disabled = false;
  }
}

function renderResult({ columnNames, columnTypes, rows }) {
  if (!rows.length) {
    els.results.innerHTML = `<div class="muted">Query ran successfully — 0 rows returned.</div>`;
    return;
  }
  const head = `
    <thead>
      <tr>${columnNames
        .map(
          (n, i) =>
            `<th>${escapeHtml(n)}<span class="type">${escapeHtml(
              columnTypes[i] ?? ""
            )}</span></th>`
        )
        .join("")}</tr>
    </thead>`;
  const body = `
    <tbody>
      ${rows
        .map(
          (row) =>
            `<tr>${row
              .map((v, i) => renderCell(v, columnTypes[i]))
              .join("")}</tr>`
        )
        .join("")}
    </tbody>`;
  els.results.innerHTML = `<table>${head}${body}</table>`;
}

function renderCell(v, type) {
  if (v === null || v === undefined) {
    return `<td class="null">NULL</td>`;
  }
  const numeric = isNumericType(type ?? "");
  let text;
  if (typeof v === "object") {
    text = JSON.stringify(v);
  } else {
    text = String(v);
  }
  return `<td class="${numeric ? "num" : ""}" title="${escapeHtml(
    text
  )}">${escapeHtml(text)}</td>`;
}

function setStatus(msg, kind = "") {
  els.status.className = `status ${kind}`;
  els.status.textContent = msg;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

els.btnRun.addEventListener("click", runQuery);
els.btnClear.addEventListener("click", () => {
  els.sql.value = "";
  els.activeDemo.textContent = "Select a demo above, or write your own SQL.";
  setStatus("");
  els.results.innerHTML = `<div class="muted">Results will appear here.</div>`;
  activeDemoId = null;
  els.demos.querySelectorAll(".demo").forEach((el) =>
    el.classList.remove("active")
  );
});

els.sql.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    runQuery();
  }
});

(async () => {
  await Promise.all([loadInfo(), loadDatasets(), loadDemos()]);
})();
