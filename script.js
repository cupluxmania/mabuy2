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
   GROUP PARSER (FINAL)
========================= */
function parseGroup(id) {

    id = String(id).trim();

    // suffix booths → NEVER MERGE
    if (id.includes("-") && /[a-zA-Z]/.test(id.split("-")[1])) {
        return {
            type: "single",
            groupId: id,
            members: [id],
            size: 9
        };
    }

    // numeric range → MERGE BLOCK
    if (id.includes("-") && /^\d/.test(id)) {

        const parts = id.split("-").map(x => x.trim());

        if (parts.every(p => /^\d+$/.test(p))) {

            const start = Number(parts[0]);
            const end = Number(parts[parts.length - 1]);

            const members = [];
            for (let i = start; i <= end; i++) {
                members.push(String(i));
            }

            return {
                type: "range",
                groupId: id,
                members,
                size: members.length * 9 // 9 sqm per booth
            };
        }
    }

    // single booth
    return {
        type: "single",
        groupId: id,
        members: [id],
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
                ...parseGroup(id),
                status: getStatus(row),
                exhibitor: clean(row.exhibitor)
            });
        });
    });

    allData = temp;
    renderFloor();
}

/* =========================
   FIND GROUP
========================= */
function findGroup(id) {
    return allData.find(g => g.members.includes(id));
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
   RENDER FLOOR (KEY FIX)
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

            if (!group) {
                grid.appendChild(createBooth(id));
                return;
            }

            // 🔥 IMPORTANT: only render once per group
            if (rendered.has(group.groupId)) return;
            rendered.add(group.groupId);

            const span = Math.max(1, group.members.length);

            const booth = createBooth(group.members[0], group, span);
            grid.appendChild(booth);
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
   CREATE BOOTH (MERGED VISUAL)
========================= */
function createBooth(id, group = null, span = 1) {

    if (!group) group = findGroup(id);

    let status = "available";
    let exhibitor = "";
    let size = 9;

    if (group) {

        if (group.status === "agent") status = "agent";
        else if (group.status === "sold") status = "sold";
        else if (group.status === "booked") status = "booked";

        exhibitor = group.exhibitor;

        size = group.size || 9;
    }

    const b = document.createElement("div");
    b.className = "booth " + status;

    // 🔥 REAL MERGED BLOCK
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
   SEARCH
========================= */
searchBox.addEventListener("input", () => {

    const val = searchBox.value.toLowerCase();

    const result = allData.filter(x =>
        x.members.some(m => m.toLowerCase().includes(val)) ||
        (x.exhibitor || "").toLowerCase().includes(val)
    );

    suggestions.innerHTML = "";
    suggestions.style.display = result.length ? "block" : "none";

    result.forEach(x => {

        const div = document.createElement("div");
        div.className = "suggestionItem";
        div.innerText = `${x.groupId} - ${x.exhibitor}`;

        div.onclick = () => {
            const el = document.querySelector(`[data-id='${x.members[0]}']`);
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
