const G_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzeXfwbFMaC8WH3th-aw5_PtMGTlz6UHMC5S5tWs9j1FW-G_Fszldy9QqiY5Zps-mFGQg/exec";

const floor = document.getElementById("floor");
const container = document.getElementById("floorContainer");
const searchBox = document.getElementById("searchBox");
const suggestions = document.getElementById("suggestions");
const zoomInBtn = document.getElementById("zoomIn");
const zoomOutBtn = document.getElementById("zoomOut");
const zoomLevelLabel = document.getElementById("zoomLevel");

const sidePanel = document.getElementById("sidePanel");
const panelContent = document.getElementById("panelContent");

let allData = {};
let chartInstance;
let typeChartInstance;
let zoomLevel = 1;

const halls = [
  { name: "Hall 5", start: 5001, end: 5078 },
  { name: "Hall 6", start: 6001, end: 6189 },
  { name: "Hall 7", start: 7001, end: 7196 },
  { name: "Hall 8", start: 8001, end: 8181 },
  { name: "Hall 9", start: 9001, end: 9191 },
  { name: "Hall 10", start: 1001, end: 1151 },
  { name: "Ambulance", start: "A", end: "J" }
];

/* =========================
   PAGE SWITCH
========================= */
function showPage(id){
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

/* =========================
   LOAD DATA
========================= */
async function loadData() {
  const url = `${G_SCRIPT_URL}?cmd=read&t=${Date.now()}`;

  try {
    const res = await fetch(url, { method: "GET", cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    if (!Array.isArray(raw)) throw new Error("Invalid JSON format");

    processData(raw);

  } catch (err) {
    try {
      const proxy = "https://corsproxy.io/?";
      const res = await fetch(proxy + encodeURIComponent(url));
      if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
      const raw = await res.json();
      processData(raw);
    } catch (err2) {
      document.body.innerHTML = `
        <div style="padding:40px;font-family:Arial">
          <h2>❌ DATA LOAD ERROR</h2>
          <p>${err.message}</p>
        </div>
      `;
    }
  }
}

/* =========================
   PROCESS DATA
========================= */
function processData(raw){
  const map = {};

  raw.forEach(r => {
    if (!r.boothid) return;

    const ids = String(r.boothid).split(",").map(x => x.trim());

    ids.forEach(id => {
      map[id] = {
        boothid: id,
        exhibitor: r.exhibitor || "",
        type: r.type || "",
        status: (r.status || "available").toLowerCase(),
        sqm: r.size || 0
      };
    });
  });

  allData = map;
  renderFloor();
  updateDashboard();
}

/* =========================
   FLOOR HELPERS
========================= */
function getVariants(baseId) {
  return Object.keys(allData)
    .filter(id => id.toLowerCase().startsWith(baseId.toLowerCase() + "-"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function getHallBoothIds(hall) {
  const boothIds = [];

  if (hall.name === "Ambulance") {
    for (let i = 65; i <= 90; i++) {
      boothIds.push(String.fromCharCode(i));
    }
    return boothIds;
  }

  for (let i = hall.start; i <= hall.end; i++) {
    const baseId = String(i);
    const variants = getVariants(baseId);

    if (variants.length) {
      variants.forEach(v => boothIds.push(v));
    } else {
      boothIds.push(baseId);
    }
  }

  return boothIds;
}

/* =========================
   FLOOR RENDER
========================= */
function renderFloor(){
  floor.innerHTML = "";

  halls.forEach(h => {
    const boothIds = getHallBoothIds(h);
    const hallCounts = { sold: 0, booked: 0, available: 0, agent: 0 };

    boothIds.forEach(id => {
      const d = allData[id];
      const status = d?.status || "available";
      if (hallCounts[status] !== undefined) hallCounts[status]++;
    });

    const div = document.createElement("div");
    div.className = "hall";

    const header = document.createElement("div");
    header.className = "hall-header";

    const title = document.createElement("h3");
    title.innerText = h.name;

    const summary = document.createElement("div");
    summary.className = "hall-summary";

    summary.innerHTML = `
      <div class="hall-chip"><span class="dot sold"></span>${hallCounts.sold}</div>
      <div class="hall-chip"><span class="dot booked"></span>${hallCounts.booked}</div>
      <div class="hall-chip"><span class="dot available"></span>${hallCounts.available}</div>
      <div class="hall-chip"><span class="dot agent"></span>${hallCounts.agent}</div>
    `;

    header.appendChild(title);
    header.appendChild(summary);
    div.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "grid";

    boothIds.forEach(id => grid.appendChild(createBooth(id)));

    div.appendChild(grid);
    floor.appendChild(div);
  });
}

function createBooth(id){
  const d = allData[id];

  const b = document.createElement("div");
  b.className = "booth " + (d?.status || "available");
  b.innerText = id;

  b.dataset.id = id.toLowerCase();
  b.dataset.tooltip = `${id} • ${d?.exhibitor || "-"} • ${d?.type || "-"} • ${d?.sqm || 0} sqm`;

  b.onclick = (e)=>{
    e.stopPropagation();
    sidePanel.classList.remove("hidden");
    panelContent.innerHTML = `
      <div class="panel-row"><span class="panel-label">Booth:</span> ${id}</div>
      <div class="panel-row"><span class="panel-label">Exhibitor:</span> ${d?.exhibitor || "-"}</div>
      <div class="panel-row"><span class="panel-label">Type:</span> ${d?.type || "-"}</div>
      <div class="panel-row"><span class="panel-label">Status:</span> ${(d?.status || "available").toUpperCase()}</div>
      <div class="panel-row"><span class="panel-label">Size:</span> ${d?.sqm || 0} sqm</div>
    `;
  };

  return b;
}

/* =========================
   SEARCH
========================= */
searchBox.addEventListener("input", ()=>{
  const val = searchBox.value.toLowerCase();

  if (!val) {
    suggestions.style.display = "none";
    return;
  }

  const result = Object.values(allData).filter(d =>
    d.boothid.toLowerCase().includes(val) ||
    (d.exhibitor || "").toLowerCase().includes(val)
  );

  suggestions.innerHTML = "";
  suggestions.style.display = result.length ? "block" : "none";

  result.slice(0,50).forEach(d => {
    const div = document.createElement("div");
    div.className = "suggestionItem";
    div.innerText = `${d.boothid} - ${d.exhibitor}`;

    div.onclick = () => {
      goToBooth(d.boothid);
      suggestions.style.display = "none";
    };

    suggestions.appendChild(div);
  });
});

/* =========================
   JUMP
========================= */
function goToBooth(id){
  const el = document.querySelector(`[data-id='${id.toLowerCase()}']`);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });

  document.querySelectorAll(".highlight,.pulse")
    .forEach(x => x.classList.remove("highlight","pulse"));

  el.classList.add("highlight","pulse");

  setTimeout(() => el.classList.remove("highlight","pulse"), 5000);

  el.click();
}

/* =========================
   DASHBOARD
========================= */
function updateDashboard(){
  let counts = { sold: 0, booked: 0, available: 0, agent: 0 };

  const allTypes = new Set();
  const hallTypeCounts = {};
  const typeCounts = {};

  const hallStats = halls.map(h => ({
    name: h.name,
    total: 0,
    sold: 0,
    booked: 0,
    available: 0,
    agent: 0
  }));

  Object.values(allData).forEach(d => {
    if (counts[d.status] !== undefined) counts[d.status]++;

    const type = d.type || "Unidentified";
    allTypes.add(type);
    typeCounts[type] = (typeCounts[type] || 0) + 1;

    const hallName = getHallName(d.boothid);
    hallTypeCounts[hallName] ??= {};
    hallTypeCounts[hallName][type] = (hallTypeCounts[hallName][type] || 0) + 1;

    const hall = hallStats.find(h => h.name === hallName);
    if (hall) {
      hall.total++;
      if (hall[d.status] !== undefined) hall[d.status]++;
    }
  });

  document.getElementById("totalCount").innerText = Object.keys(allData).length;
  document.getElementById("soldCount").innerText = counts.sold;
  document.getElementById("bookedCount").innerText = counts.booked;
  document.getElementById("availableCount").innerText = counts.available;
  document.getElementById("agentCount").innerText = counts.agent;

  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(document.getElementById("chart"), {
    type: "pie",
    data: {
      labels: ["Sold", "Booked", "Available", "Agent"],
      datasets: [{
        data: [counts.sold, counts.booked, counts.available, counts.agent],
        backgroundColor: ["#ef4444", "#eab308", "#3b82f6", "#22c55e"]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } }
    }
  });

  if (typeChartInstance) typeChartInstance.destroy();
  typeChartInstance = new Chart(document.getElementById("typeChart"), {
    type: "bar",
    data: {
      labels: Object.keys(typeCounts),
      datasets: [{
        label: "Booth Types",
        data: Object.values(typeCounts),
        backgroundColor: "#6366f1"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { autoSkip: false } },
        y: { beginAtZero: true }
      }
    }
  });

  renderHallReport(hallStats);
  renderTypeReport(hallTypeCounts, Array.from(allTypes).sort());
}

/* =========================
   HELPERS
========================= */
function getHallName(id){
  const trimmed = String(id).trim();
  if (/^[A-Za-z]$/.test(trimmed)) return "Ambulance";
  const num = parseInt(trimmed, 10);
  if (Number.isNaN(num)) return "Unidentified";

  const hall = halls.find(h => typeof h.start === "number" && num >= h.start && num <= h.end);
  return hall ? hall.name : "Unidentified";
}

function renderHallReport(hallStats){
  const rows = hallStats.map(h => `
    <tr>
      <td>${h.name}</td>
      <td>${h.total}</td>
      <td>${h.sold}</td>
      <td>${h.booked}</td>
      <td>${h.available}</td>
      <td>${h.agent}</td>
    </tr>
  `).join("");

  document.getElementById("hallReport").innerHTML = `
    <h3>Hall Report</h3>
    <table>
      <thead>
        <tr>
          <th>Hall</th><th>Total</th><th>Sold</th><th>Booked</th><th>Available</th><th>Agent</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderTypeReport(hallTypeCounts, types){
  const rows = halls.map(h => {
    const hallCounts = hallTypeCounts[h.name] || {};
    const total = types.reduce((sum, type) => sum + (hallCounts[type] || 0), 0);
    return `
      <tr>
        <td>${h.name}</td>
        ${types.map(type => `<td>${hallCounts[type] || 0}</td>`).join("")}
        <td>${total}</td>
      </tr>
    `;
  }).join("");

  const footerTotals = types.map(type =>
    halls.reduce((sum, h) => sum + ((hallTypeCounts[h.name]?.[type]) || 0), 0)
  );

  const totalAll = footerTotals.reduce((sum, v) => sum + v, 0);

  document.getElementById("typeReport").innerHTML = `
    <h3>Type Report</h3>
    <table>
      <thead>
        <tr>
          <th>Hall</th>
          ${types.map(type => `<th>${type}</th>`).join("")}
          <th>Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <th>Total</th>
          ${footerTotals.map(c => `<th>${c}</th>`).join("")}
          <th>${totalAll}</th>
        </tr>
      </tfoot>
    </table>
  `;
}

/* =========================
   ZOOM + DRAG + INIT
========================= */
function updateZoom(value){
  zoomLevel = Math.min(2.5, Math.max(0.4, value));
  floor.style.transform = `scale(${zoomLevel})`;
  zoomLevelLabel.innerText = `${Math.round(zoomLevel * 100)}%`;
}

zoomInBtn?.addEventListener("click", () => updateZoom(zoomLevel + 0.1));
zoomOutBtn?.addEventListener("click", () => updateZoom(zoomLevel - 0.1));

let isDown = false, startX, startY, scrollLeft, scrollTop;

container.addEventListener("mousedown", e => {
  isDown = true;
  startX = e.pageX;
  startY = e.pageY;
  scrollLeft = container.scrollLeft;
  scrollTop = container.scrollTop;
});

container.addEventListener("mouseup", () => isDown = false);
container.addEventListener("mouseleave", () => isDown = false);

container.addEventListener("mousemove", e => {
  if (!isDown) return;
  container.scrollLeft = scrollLeft - (e.pageX - startX);
  container.scrollTop = scrollTop - (e.pageY - startY);
});

document.addEventListener("click", () => {
  sidePanel.classList.add("hidden");
  suggestions.style.display = "none";
});

/* START */
loadData();
