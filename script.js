const G_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzeXfwbFMaC8WH3th-aw5_PtMGTlz6UHMC5S5tWs9j1FW-G_Fszldy9QqiY5Zps-mFGQg/exec";

const floor = document.getElementById("floor");
const container = document.getElementById("floorContainer");
const searchBox = document.getElementById("searchBox");
const suggestions = document.getElementById("suggestions");
const panel = document.getElementById("sidePanel");
const panelContent = document.getElementById("panelContent");

let allData = [];
let zoomLevel = 1;
let chartInstance = null;

/* CLEAN */
function cleanText(val) {
    if (!val) return "";
    return String(val).replace(/\s+/g, " ").trim();
}

/* NORMALIZE */
function normalizeId(id) {
    return String(id || "").replace(/\s+/g, "").toLowerCase();
}

/* DISPLAY FORMAT */
function formatDisplayId(id) {
    return id.replace(/-([a-z])$/, (_, c) => "-" + c.toUpperCase());
}

/* STATUS */
function getStatusFromSheet(row) {
    let s = cleanText(row.status).toLowerCase();

    if (s === "available") return "available";
    if (s === "booked") return "booked";
    if (s === "sold") return "sold";
    if (s.includes("agent")) return "agent";

    return "available";
}

/* LOAD DATA */
async function loadData() {
    const res = await fetch(`${G_SCRIPT_URL}?cmd=read&t=${Date.now()}`);
    const raw = await res.json();

    const expanded = [];

    raw.forEach(row => {
        if (!row.boothid) return;

        const booths = String(row.boothid).split(",");

        booths.forEach(id => {
            expanded.push({
                boothid: normalizeId(id),
                status: getStatusFromSheet(row),
                exhibitor: cleanText(row.exhibitor),
                size: Number(row.size) || 0
            });
        });
    });

    allData = expanded;
    renderFloor();
}

/* HALL DETECT */
function getHall(id) {
    const n = parseInt(id);
    if (n >= 5000 && n < 6000) return "Hall 5";
    if (n >= 6000 && n < 7000) return "Hall 6";
    if (n >= 7000 && n < 8000) return "Hall 7";
    if (n >= 8000 && n < 9000) return "Hall 8";
    if (n >= 9000 && n < 10000) return "Hall 9";
    if (n >= 1000 && n < 2000) return "Hall 10";
    return "Other";
}

/* REPORT DATA */
function generateReport() {
    const report = {};

    allData.forEach(x => {
        const hall = getHall(x.boothid);

        if (!report[hall]) {
            report[hall] = {available:0, sold:0, booked:0, agent:0, size:0};
        }

        report[hall][x.status]++;
        report[hall].size += x.size;
    });

    return report;
}

/* SHOW REPORT + CHART */
function showReport() {

    const data = generateReport();

    let html = `
        <h3>📊 Hall Report</h3>
        <canvas id="chartCanvas" height="200"></canvas>
        <hr>
    `;

    Object.keys(data).forEach(hall => {
        const h = data[hall];

        html += `
        <div style="margin-bottom:12px">
            <b>${hall}</b><br>
            Available: ${h.available} |
            Sold: ${h.sold} |
            Booked: ${h.booked} |
            Agent: ${h.agent}<br>
            <b>Total Size: ${h.size} sqm</b>
        </div>
        `;
    });

    panel.classList.remove("hidden");
    panelContent.innerHTML = html;

    renderChart(data);
}

/* CHART */
function renderChart(data) {

    const ctx = document.getElementById("chartCanvas");

    const labels = Object.keys(data);
    const available = labels.map(h => data[h].available);
    const sold = labels.map(h => data[h].sold);
    const booked = labels.map(h => data[h].booked);
    const agent = labels.map(h => data[h].agent);

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Available', data: available, backgroundColor: '#3b82f6' },
                { label: 'Sold', data: sold, backgroundColor: '#ef4444' },
                { label: 'Booked', data: booked, backgroundColor: '#eab308' },
                { label: 'Agent', data: agent, backgroundColor: '#22c55e' }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' }
            }
        }
    });
}

/* CREATE BOOTH */
function createBooth(id) {

    const norm = normalizeId(id);
    const display = formatDisplayId(id);

    const b = document.createElement("div");
    b.className = "booth available";
    b.innerText = display;
    b.dataset.id = norm;

    const match = allData.find(x => x.boothid === norm);

    if (match) {
        b.className = "booth " + match.status;
        b.dataset.tooltip = `${display} • ${match.status.toUpperCase()} • ${match.exhibitor}`;
    }

    b.onclick = (e) => {
        e.stopPropagation();

        panel.classList.remove("hidden");
        panelContent.innerHTML = `
            <b>Booth:</b> ${display}<br>
            <b>Status:</b> ${match?.status || "available"}<br>
            <b>Size:</b> ${match?.size || 0} sqm<br>
            <b>Exhibitor:</b> ${match?.exhibitor || "-"}
        `;
    };

    return b;
}

/* RENDER */
function renderFloor() {
    floor.innerHTML = "";

    for (let i = 5001; i <= 5078; i++) {
        floor.appendChild(createBooth(String(i)));
    }
}

/* SEARCH */
searchBox.addEventListener("input", () => {
    const val = searchBox.value.toLowerCase();

    const result = allData.filter(x =>
        x.boothid.includes(val) ||
        x.exhibitor.toLowerCase().includes(val)
    );

    suggestions.innerHTML = "";
    suggestions.style.display = result.length ? "block" : "none";

    result.forEach(x => {
        const div = document.createElement("div");
        div.className = "suggestionItem";
        div.innerText = `${formatDisplayId(x.boothid)} - ${x.exhibitor}`;

        div.onclick = () => {
            const el = document.querySelector(`[data-id='${x.boothid}']`);

            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });

                el.classList.add("highlight","blink");

                setTimeout(() => {
                    el.classList.remove("highlight","blink");
                }, 5000);

                el.click();
            }

            suggestions.style.display = "none";
        };

        suggestions.appendChild(div);
    });
});

/* BUTTON */
document.getElementById("reportBtn").onclick = (e) => {
    e.stopPropagation();
    showReport();
};

loadData();
