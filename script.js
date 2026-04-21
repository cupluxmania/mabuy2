const G_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzeXfwbFMaC8WH3th-aw5_PtMGTlz6UHMC5S5tWs9j1FW-G_Fszldy9QqiY5Zps-mFGQg/exec";

const floor = document.getElementById("floor");
const container = document.getElementById("floorContainer");
const searchBox = document.getElementById("searchBox");
const suggestions = document.getElementById("suggestions");
const panel = document.getElementById("sidePanel");
const panelContent = document.getElementById("panelContent");
const reportBtn = document.getElementById("reportBtn");

let allData = [];

/* =========================
   CLEAN (SAFE ONLY)
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
   SAFE KEY (ONLY FOR MATCHING)
========================= */
function key(id) {
    return String(id).replace(/\s+/g, "");
}

/* =========================
   PARSE BOOTH (FIXED LOGIC)
========================= */
function parseBooth(id) {

    const raw = String(id);

    // CASE 1: SUFFIX (5035-A / 5035-B)
    if (raw.includes("-") && /[a-zA-Z]$/.test(raw)) {
        return {
            type: "suffix",
            id: raw,
            groupId: raw,
            members: [raw],
            size: 9
        };
    }

    // CASE 2: RANGE (5003-5004)
    if (raw.includes("-") && /^\d/.test(raw)) {

        const parts = raw.split("-");

        const start = Number(parts[0]);
        const end = Number(parts[1]);

        if (!isNaN(start) && !isNaN(end)) {

            const members = [];
            for (let i = start; i <= end; i++) {
                members.push(String(i));
            }

            return {
                type: "range",
                id: raw,
                groupId: raw,
                members,
                size: members.length * 9
            };
        }
    }

    // CASE 3: SINGLE
    return {
        type: "single",
        id: raw,
        groupId: raw,
        members: [raw],
        size: 9
    };
}

/* =========================
   LOAD DATA (RESTORED SAFE)
========================= */
async function loadData() {
    const res = await fetch(`${G_SCRIPT_URL}?cmd=read&t=${Date.now()}`);
    const raw = await res.json();

    const temp = [];

    raw.forEach(row => {
        if (!row.boothid) return;

        String(row.boothid).split(",").forEach(id => {

            const parsed = parseBooth(id);

            temp.push({
                ...parsed,
                status: getStatus(row),
                exhibitor: clean(row.exhibitor)
            });

        });
    });

    allData = temp;
    renderFloor();
}

/* =========================
   FIND (SAFE MATCHING)
========================= */
function findGroup(id) {
    return allData.find(x => x.members.includes(id));
}

/* =========================
   HALL CONFIG (RESTORED)
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
   RENDER FLOOR (FIXED + SAFE)
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

            const group = findGroup(id);

            // CASE 1: suffix → always render
            if (group && group.type === "suffix") {
                grid.appendChild(createBooth(id, group, 1));
                return;
            }

            // CASE 2: range → merge once
            if (group && group.type === "range") {

                if (rendered.has(group.groupId)) return;
                rendered.add(group.groupId);

                const span = group.members.length;

                grid.appendChild(createBooth(group.members[0], group, span));
                return;
            }

            // CASE 3: single
            grid.appendChild(createBooth(id, group, 1));
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
   CREATE BOOTH (STABLE)
========================= */
function createBooth(id, group, span = 1) {

    const b = document.createElement("div");

    const status = group?.status || "available";
    const exhibitor = group?.exhibitor || "";
    const size = group?.size || 9;

    b.className = "booth " + status;

    b.style.gridColumn = `span ${span}`;

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
            <b>Size:</b> ${size}
        `;
    };

    return b;
}

/* =========================
   INIT
========================= */
loadData();
