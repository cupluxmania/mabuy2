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
   GROUP DETECTOR (SAFE)
========================= */
function parseGroup(id) {
    id = String(id).trim();

    // CASE 1: joined numeric range 5003-5005
    if (id.includes("-") && /^\d/.test(id)) {
        const parts = id.split("-").map(x => x.trim());

        if (parts.every(p => /^\d+$/.test(p))) {
            const start = Number(parts[0]);
            const end = Number(parts[parts.length - 1]);

            const members = [];
            for (let i = start; i <= end; i++) {
                members.push(String(i));
            }

            return { groupId: id, members };
        }

        // CASE 2: -A / -B style (IMPORTANT RESTORE)
        return {
            groupId: id,
            members: parts
        };
    }

    // normal booth
    return {
        groupId: id,
        members: [id]
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

            const parsed = parseGroup(id);

            parsed.members.forEach(member => {

                temp.push({
                    boothid: String(member).trim(),
                    groupId: parsed.groupId,
                    status: getStatus(row),
                    exhibitor: clean(row.exhibitor),
                    size: Number(row.size || row.sqm || 0)
                });

            });

        });
    });

    allData = temp;
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
  {name:"Hall 9", start:9001, end:9191},
  {name:"Hall 10", start:1001, end:1151},
  {name:"Ambulance", start:"A", end:"Z"}
];

/* =========================
   RENDER
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

        if (h.name === "Ambulance") {
            for (let i = 65; i <= 90; i++) {
                grid.appendChild(createBooth(String.fromCharCode(i)));
            }
        } else {
            for (let i = h.start; i <= h.end; i++) {
                grid.appendChild(createBooth(String(i)));
            }
        }

        hallDiv.appendChild(grid);
        floor.appendChild(hallDiv);
    });
}

/* =========================
   CREATE BOOTH (FIXED)
========================= */
function createBooth(id) {

    const matches = allData.filter(x => x.boothid === id);

    let status = "available";
    let exhibitor = "";
    let size = 0;

    if (matches.length) {

        if (matches.some(x => x.status === "agent")) status = "agent";
        else if (matches.some(x => x.status === "sold")) status = "sold";
        else if (matches.some(x => x.status === "booked")) status = "booked";

        exhibitor = matches.map(x => x.exhibitor).filter(Boolean).join(", ");

        const group = allData.filter(x => x.groupId === matches[0]?.groupId);

        const totalSize = group.reduce((s, x) => s + x.size, 0);

        if (group.length > 1) {
            size = Math.round(totalSize / group.length); // auto split
        } else {
            size = totalSize;
        }
    }

    const b = document.createElement("div");
    b.className = "booth " + status;

    // IMPORTANT: keep original ID (5035-A works again)
    b.innerText = id;
    b.dataset.id = id;

    b.dataset.tooltip = size
        ? `${status.toUpperCase()} • [ ${size} sqm ]`
        : `${status.toUpperCase()} • [ - ]`;

    b.onclick = (e) => {
        e.stopPropagation();

        panel.classList.remove("hidden");
        panelContent.innerHTML = `
            <b>Booth:</b> ${id}<br>
            <b>Status:</b> ${status.toUpperCase()}<br>
            <b>Exhibitor:</b> ${exhibitor || "-"}<br>
            <b>Size:</b> ${size || "-"}
        `;
    };

    return b;
}

/* =========================
   SEARCH (FIXED)
========================= */
searchBox.addEventListener("input", () => {

    const val = searchBox.value.toLowerCase();

    const result = allData.filter(x =>
        String(x.boothid).toLowerCase().includes(val) ||
        (x.exhibitor || "").toLowerCase().includes(val)
    );

    suggestions.innerHTML = "";
    suggestions.style.display = result.length ? "block" : "none";

    result.forEach(x => {

        const div = document.createElement("div");
        div.className = "suggestionItem";
        div.innerText = `${x.boothid} - ${x.exhibitor}`;

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
   INIT
========================= */
loadData();
