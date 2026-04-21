const G_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzeXfwbFMaC8WH3th-aw5_PtMGTlz6UHMC5S5tWs9j1FW-G_Fszldy9QqiY5Zps-mFGQg/exec";

const floor = document.getElementById("floor");
const container = document.getElementById("floorContainer");
const searchBox = document.getElementById("searchBox");
const suggestions = document.getElementById("suggestions");
const panel = document.getElementById("sidePanel");
const panelContent = document.getElementById("panelContent");

let allData = [];

/* =========================
   CLEAN (ONLY TEXT CLEANING, NO TRIM LOGIC ON IDS)
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
   BOOTH PARSER (NO TRIM ON ID)
========================= */
function parseBooth(id) {

    // ❗ DO NOT modify id itself
    const rawId = String(id);

    // CASE 1: SUFFIX (5035-A / 5035-B)
    if (rawId.includes("-") && /[a-zA-Z]$/.test(rawId)) {
        return {
            type: "suffix",
            id: rawId,
            groupId: rawId,
            members: [rawId],
            size: 9
        };
    }

    // CASE 2: RANGE (5003-5004)
    if (rawId.includes("-") && /^\d/.test(rawId)) {

        const parts = rawId.split("-");

        const start = parts[0];
        const end = parts[parts.length - 1];

        if (!isNaN(start) && !isNaN(end)) {

            const members = [];

            for (let i = Number(start); i <= Number(end); i++) {
                members.push(String(i));
            }

            return {
                type: "range",
                id: rawId,
                groupId: rawId,
                members,
                size: members.length * 9
            };
        }
    }

    // CASE 3: SINGLE
    return {
        type: "single",
        id: rawId,
        groupId: rawId,
        members: [rawId],
        size: 9
    };
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

        String(row.boothid).split(",").forEach(id => {

            temp.push({
                ...parseBooth(id),   // ❗ NO TRIM, NO NORMALIZE
                status: getStatus(row),
                exhibitor: clean(row.exhibitor)
            });

        });
    });

    allData = temp;
    renderFloor();
}

/* =========================
   FIND GROUP (EXACT MATCH ONLY)
========================= */
function findGroup(id) {
    return allData.find(x => x.members.includes(id));
}

/* =========================
   RENDER FLOOR
========================= */
function renderFloor() {

    floor.innerHTML = "";

    const rendered = new Set();

    for (let i = 5001; i <= 5079; i++) {

        const id = String(i);

        const group = findGroup(id);

        // ❗ suffix must always render individually
        if (group && group.type === "suffix") {
            floor.appendChild(createBooth(id, group, 1));
            continue;
        }

        // ❗ range group → render once
        if (group && group.type === "range") {

            if (rendered.has(group.groupId)) continue;
            rendered.add(group.groupId);

            const span = group.members.length;

            floor.appendChild(createBooth(group.members[0], group, span));
            continue;
        }

        // single booth
        floor.appendChild(createBooth(id, group, 1));
    }
}

/* =========================
   CREATE BOOTH (VISUAL MERGE)
========================= */
function createBooth(id, group, span = 1) {

    const b = document.createElement("div");

    let status = group?.status || "available";
    let exhibitor = group?.exhibitor || "";
    let size = group?.size || 9;

    b.className = "booth " + status;

    // 🔥 REAL MERGE VISUAL
    b.style.gridColumn = `span ${span}`;

    b.innerText = id; // ❗ RAW ID ONLY
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
