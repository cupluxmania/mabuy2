const G_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzeXfwbFMaC8WH3th-aw5_PtMGTlz6UHMC5S5tWs9j1FW-G_Fszldy9QqiY5Zps-mFGQg/exec";

const floor = document.getElementById("floor");
const container = document.getElementById("floorContainer");
const searchBox = document.getElementById("searchBox");
const suggestions = document.getElementById("suggestions");
const panel = document.getElementById("sidePanel");
const panelContent = document.getElementById("panelContent");

let allData = [];

/* =========================
   CLEAN
========================= */
function clean(val) {
    if (!val) return "";
    return String(val).replace(/\s+/g, " ").trim();
}

/* =========================
   STATUS
========================= */
function getStatus(row) {
    const s = clean(row.status).toLowerCase();

    if (s === "available") return "available";
    if (s === "booked") return "booked";
    if (s === "sold") return "sold";
    if (s.includes("agent")) return "agent";

    return "available";
}

/* =========================
   PARSE GROUP BOOTHS
========================= */
function parseBooths(rawId) {

    const id = String(rawId).trim();

    // CASE 1: comma-separated group (5001,5002)
    if (id.includes(",")) {
        const list = id.split(",").map(x => x.trim());
        return { type: "group", list };
    }

    // CASE 2: range (5001-5002)
    if (id.includes("-") && /^\d/.test(id)) {
        const [start, end] = id.split("-").map(Number);

        const list = [];
        for (let i = start; i <= end; i++) {
            list.push(String(i));
        }

        return { type: "group", list };
    }

    // CASE 3: single booth
    return { type: "single", list: [id] };
}

/* =========================
   LOAD DATA
========================= */
async function loadData() {

    const res = await fetch(`${G_SCRIPT_URL}?cmd=read&t=${Date.now()}`);
    const raw = await res.json();

    const temp = [];

    raw.forEach(row => {
        if (!row.boothid) return;

        const group = parseBooths(row.boothid);
        const size = Number(row.size || row.sqm || 9);

        const perBoothSize = size / group.list.length;

        group.list.forEach(id => {
            temp.push({
                boothid: id,
                status: getStatus(row),
                exhibitor: clean(row.exhibitor),
                size: perBoothSize
            });
        });
    });

    allData = temp;
    renderFloor();
}

/* =========================
   FIND
========================= */
function find(id) {
    return allData.filter(x => x.boothid === id);
}

/* =========================
   HALL CONFIG (UNCHANGED)
========================= */
const hallConfig = [
  {name:"Hall 5", start:5001, end:5079},
  {name:"Hall 6", start:6001, end:6189},
  {name:"Hall 7", start:7001, end:7196},
  {name:"Hall 8", start:8001, end:8181},
  {name:"Hall 9", start:9001, end:9191},
  {name:"Hall 10", start:1001, end:1151},
  {name:"Ambulance", start:"A", end:"Z"}
];

/* =========================
   RENDER FLOOR
========================= */
function renderFloor() {

    floor.innerHTML = "";

    hallConfig.forEach(h => {

        const hallDiv = document.createElement("div");
        hallDiv.className = "hall";

        const title = document.createElement("h3");
        title.innerText = h.name;
        hallDiv.appendChild(title);

        const grid = document.createElement("div");
        grid.className = "grid";

        const rendered = new Set();

        const process = (id) => {

            const matches = find(id);

            if (matches.length === 0) {
                grid.appendChild(createBooth(id, null));
                return;
            }

            // prevent duplicate rendering of same booth
            if (rendered.has(id)) return;
            rendered.add(id);

            grid.appendChild(createBooth(id, matches[0]));
        };

        if (h.name === "Ambulance") {
            for (let i = 65; i <= 90; i++) {
                process(String.fromCharCode(i));
            }
        } else {
            for (let i = h.start; i <= h.end; i++) {
                process(String(i));
            }
        }

        hallDiv.appendChild(grid);
        floor.appendChild(hallDiv);
    });
}

/* =========================
   CREATE BOOTH (FINAL FIX)
========================= */
function createBooth(id, data) {

    const b = document.createElement("div");

    let status = data?.status || "available";
    let exhibitor = data?.exhibitor || "";
    let size = data?.size || 9;

    b.className = "booth " + status;

    b.innerText = id;
    b.dataset.id = id;

    b.dataset.tooltip = `${status.toUpperCase()} • [ ${size} sqm ]`;

    b.onclick = (e) => {
        e.stopPropagation();

        panel.classList.remove("hidden");
        panelContent.innerHTML = `
            <b>Booth:</b> ${id}<br>
            <b>Status:</b> ${status.toUpperCase()}<br>
            <b>Exhibitor:</b> ${exhibitor || "-"}<br>
            <b>Size:</b> ${size} sqm
        `;
    };

    return b;
}

/* =========================
   INIT
========================= */
loadData();
