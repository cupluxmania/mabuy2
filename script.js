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
   LOAD DATA
========================= */
async function loadData() {
    const res = await fetch(`${G_SCRIPT_URL}?cmd=read&t=${Date.now()}`);
    const raw = await res.json();

    const temp = [];

    raw.forEach(row => {
        if (!row.boothid) return;

        String(row.boothid).split(",").forEach(id => {

            const rawId = String(id).trim();

            temp.push({
                boothid: rawId,
                status: getStatus(row),
                exhibitor: clean(row.exhibitor),
                size: Number(row.size || row.sqm || 9)
            });
        });
    });

    allData = temp;
    renderFloor();
}

/* =========================
   FIND MATCH
========================= */
function findMatches(id) {
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
   RENDER FLOOR (SAFE)
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

            const matches = findMatches(id);

            // suffix booths → ALWAYS individual
            if (id.includes("-") && /[a-zA-Z]$/.test(id)) {
                grid.appendChild(createBooth(id, matches, 1));
                return;
            }

            // range merge (5003-5004)
            if (id.includes("-") && /^\d/.test(id)) {

                const parts = id.split("-");
                const start = Number(parts[0]);
                const end = Number(parts[1]);

                if (!isNaN(start) && !isNaN(end)) {

                    if (rendered.has(id)) return;
                    rendered.add(id);

                    const span = (end - start) + 1;

                    grid.appendChild(createBooth(id, matches, span));
                    return;
                }
            }

            grid.appendChild(createBooth(id, matches, 1));
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
   CREATE BOOTH (VISUAL MERGE ONLY)
========================= */
function createBooth(id, matches, span = 1) {

    let status = "available";
    let exhibitor = "";
    let size = 9;

    if (matches && matches.length) {

        if (matches.some(x => x.status === "agent")) status = "agent";
        else if (matches.some(x => x.status === "sold")) status = "sold";
        else if (matches.some(x => x.status === "booked")) status = "booked";

        exhibitor = matches.map(x => x.exhibitor).filter(Boolean).join(", ");
        size = matches.reduce((sum, x) => sum + (x.size || 9), 0);
    }

    const b = document.createElement("div");
    b.className = "booth " + status;

    // 🔥 VISUAL MERGE (THIS IS THE KEY FIX)
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
   SEARCH (UNCHANGED LOGIC STYLE)
========================= */
searchBox.addEventListener("input", () => {

    const val = searchBox.value.toLowerCase();

    const result = allData.filter(x =>
        x.boothid.toLowerCase().includes(val) ||
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
   DRAG (UNCHANGED FIXED)
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

/* INIT */
loadData();
