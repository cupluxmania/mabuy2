const G_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzeXfwbFMaC8WH3th-aw5_PtMGTlz6UHMC5S5tWs9j1FW-G_Fszldy9QqiY5Zps-mFGQg/exec";

const floor = document.getElementById("floor");
const container = document.getElementById("floorContainer");
const searchBox = document.getElementById("searchBox");
const suggestions = document.getElementById("suggestions");
const panel = document.getElementById("sidePanel");
const panelContent = document.getElementById("panelContent");
const reportBtn = document.getElementById("reportBtn");

let allData = [];
let zoomLevel = 1;

/* =========================
   CLEAN
========================= */
function cleanText(val) {
    if (!val) return "";
    return String(val).replace(/\s+/g, " ").trim();
}

/* =========================
   NORMALIZE
========================= */
function normalizeId(id) {
    return String(id || "").replace(/\s+/g, "").toLowerCase();
}

/* =========================
   FORMAT DISPLAY
========================= */
function formatBooth(id) {
    return String(id).toUpperCase();
}

/* =========================
   STATUS (STRICT)
========================= */
function getStatus(row) {
    const s = cleanText(row.status).toLowerCase();

    if (s === "available") return "available";
    if (s === "booked") return "booked";
    if (s === "sold") return "sold";
    if (s.includes("agent")) return "agent";

    return "available";
}

/* =========================
   LOAD DATA
========================= */
async function loadData() {
    const res = await fetch(`${G_SCRIPT_URL}?cmd=read&t=${Date.now()}`);
    const raw = await res.json();

    const expanded = [];

    raw.forEach(row => {
        if (!row.boothid) return;

        String(row.boothid).split(",").forEach(id => {
            expanded.push({
                boothid: normalizeId(id),
                label: formatBooth(id.trim()),
                status: getStatus(row),
                exhibitor: cleanText(row.exhibitor)
            });
        });
    });

    allData = expanded;
    renderFloor();
}

/* =========================
   HALL CONFIG
========================= */
const hallConfig = [
  {name:"Hall 5", start:5001, end:5079},
  {name:"Hall 6", start:6001, end:6189},
  {name:"Hall 7", start:7001, end:7196},
  {name:"Hall 8", start:8001, end:8181},
  {name:"Hall 9", start:9001, end:9191}
];

/* =========================
   RENDER FLOOR
========================= */
function renderFloor() {
    floor.innerHTML = "";

    hallConfig.forEach(hall => {

        const hallDiv = document.createElement("div");
        hallDiv.className = "hall";

        const title = document.createElement("h3");
        title.innerText = hall.name;
        hallDiv.appendChild(title);

        const grid = document.createElement("div");
        grid.className = "grid";

        for (let i = hall.start; i <= hall.end; i++) {
            grid.appendChild(createBooth(String(i)));
        }

        hallDiv.appendChild(grid);
        floor.appendChild(hallDiv);
    });
}

/* =========================
   CREATE BOOTH
========================= */
function createBooth(id) {

    const norm = normalizeId(id);
    const matches = allData.filter(x => x.boothid === norm);

    let status = "available";
    let exhibitor = "";

    if (matches.length) {
        if (matches.some(x => x.status === "agent")) status = "agent";
        else if (matches.some(x => x.status === "sold")) status = "sold";
        else if (matches.some(x => x.status === "booked")) status = "booked";

        exhibitor = matches.map(x => x.exhibitor).filter(Boolean).join(", ");
    }

    const b = document.createElement("div");
    b.className = "booth " + status;
    b.innerText = formatBooth(id);
    b.dataset.id = norm;

    b.dataset.tooltip = `${status.toUpperCase()} ${exhibitor ? "• " + exhibitor : ""}`;

    b.onclick = (e) => {
        e.stopPropagation(); // 🔥 IMPORTANT FIX

        panel.classList.remove("hidden");

        panelContent.innerHTML = `
            <b>Booth:</b> ${formatBooth(id)}<br>
            <b>Status:</b> ${status.toUpperCase()}<br>
            <b>Exhibitor:</b> ${exhibitor || "-"}
        `;
    };

    return b;
}

/* =========================
   SEARCH + BLINK
========================= */
searchBox.addEventListener("input", () => {

    const val = searchBox.value.toLowerCase();

    const result = allData.filter(x =>
        x.boothid.includes(val) ||
        (x.exhibitor || "").toLowerCase().includes(val)
    );

    suggestions.innerHTML = "";
    suggestions.style.display = result.length ? "block" : "none";

    result.forEach(x => {

        const div = document.createElement("div");
        div.className = "suggestionItem";
        div.innerText = `${x.label} - ${x.exhibitor}`;

        div.onclick = () => {

            const el = document.querySelector(`[data-id='${x.boothid}']`);
            if (!el) return;

            el.scrollIntoView({ behavior: "smooth", block: "center" });

            el.classList.add("highlight", "blink");

            setTimeout(() => el.classList.remove("blink"), 5000);
            setTimeout(() => el.classList.remove("highlight"), 6000);

            el.click();
            suggestions.style.display = "none";
        };

        suggestions.appendChild(div);
    });
});

/* =========================
   REPORT (WORKING)
========================= */
reportBtn.onclick = (e) => {
    e.stopPropagation(); // 🔥 prevent panel close

    const summary = {
        available: 0,
        sold: 0,
        booked: 0,
        agent: 0
    };

    allData.forEach(x => {
        if (summary[x.status] !== undefined) {
            summary[x.status]++;
        }
    });

    panel.classList.remove("hidden");

    panelContent.innerHTML = `
        <h3>📊 Summary</h3>
        Available: ${summary.available}<br>
        Sold: ${summary.sold}<br>
        Booked: ${summary.booked}<br>
        Agent: ${summary.agent}
    `;
};

/* =========================
   DRAG
========================= */
let isDown = false, startX, startY, scrollLeft, scrollTop;

container.addEventListener("mousedown", (e) => {
    isDown = true;
    startX = e.pageX;
    startY = e.pageY;
    scrollLeft = container.scrollLeft;
    scrollTop = container.scrollTop;
});

document.addEventListener("mouseup", () => isDown = false);

document.addEventListener("mousemove", (e) => {
    if (!isDown) return;

    container.scrollLeft = scrollLeft - (e.pageX - startX);
    container.scrollTop = scrollTop - (e.pageY - startY);
});

/* =========================
   ZOOM
========================= */
document.getElementById("zoomIn").onclick = () => {
    zoomLevel += 0.1;
    floor.style.transform = `scale(${zoomLevel})`;
};

document.getElementById("zoomOut").onclick = () => {
    zoomLevel = Math.max(0.3, zoomLevel - 0.1);
    floor.style.transform = `scale(${zoomLevel})`;
};

/* =========================
   CLOSE PANEL FIX
========================= */
document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && !e.target.closest(".booth") && !e.target.closest("#reportBtn")) {
        panel.classList.add("hidden");
        suggestions.style.display = "none";
    }
});

/* INIT */
loadData();
